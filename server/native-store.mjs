import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { brand, discountCodes, products } from '../scripts/content.mjs';
import { HttpError } from './security.mjs';

const validEmail = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,63}$/i;
const validIndianPhone = /^[6-9]\d{9}$/;
const validPin = /^[1-9]\d{5}$/;
const validOrderId = /^DEB-\d{4}-[A-F0-9]{6}$/;
const hasControlChar = /[\x00-\x1F\x7F]/;
const reservationTtlMs = 20 * 60 * 1000;

export function createNativeStore(config, db, fetcher = fetch) {
  const variantCatalog = new Map();
  for (const product of products) {
    for (const variant of product.variants) {
      variantCatalog.set(variant.id, { ...variant, product });
    }
  }

  const seedStock = db.prepare('INSERT OR IGNORE INTO product_inventory (sku, stock, updated_at) VALUES (?, ?, ?)');
  const getStock = db.prepare('SELECT stock FROM product_inventory WHERE sku = ?');
  const deductStock = db.prepare('UPDATE product_inventory SET stock = stock - ?, updated_at = ? WHERE sku = ? AND stock >= ?');
  const restoreStock = db.prepare('UPDATE product_inventory SET stock = stock + ?, updated_at = ? WHERE sku = ?');
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_id, created_at, status, payment_method, payment_status,
      razorpay_order_id, razorpay_payment_id, customer_name, email, phone,
      address_json, items_json, discount_code, subtotal_paise, discount_paise,
      shipping_paise, total_paise
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const findOrder = db.prepare('SELECT * FROM orders WHERE order_id = ?');
  const findExpiredPending = db.prepare(`
    SELECT order_id, items_json FROM orders WHERE status = 'Pending Payment' AND created_at < ?
  `);
  const markOrderExpired = db.prepare(`
    UPDATE orders SET status = 'Cancelled (Expired)', payment_status = 'Payment Timed Out'
    WHERE order_id = ? AND status = 'Pending Payment'
  `);
  const markOrderCancelled = db.prepare(`
    UPDATE orders SET status = 'Cancelled', payment_status = 'Cancelled by Customer'
    WHERE order_id = ? AND razorpay_order_id = ? AND status = 'Pending Payment'
  `);
  const markOrderPaid = db.prepare(`
    UPDATE orders
    SET status = 'Confirmed', payment_status = ?, razorpay_payment_id = ?
    WHERE order_id = ? AND razorpay_order_id = ? AND status = 'Pending Payment'
  `);
  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (ticket_id, created_at, name, email, phone, topic, order_id, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const upsertWaitlist = db.prepare(`
    INSERT INTO waitlist (email, product_slug, created_at) VALUES (?, ?, ?)
    ON CONFLICT(email, product_slug) DO UPDATE SET created_at = excluded.created_at
  `);

  let seeded = false;
  let lastSweep = 0;

  async function ensureReady() {
    const now = Date.now();
    if (!seeded) {
      for (const variant of variantCatalog.values()) {
        await seedStock.run(variant.id, variant.stock, now);
      }
      seeded = true;
    }
    if (now - lastSweep > 60000) {
      lastSweep = now;
      const expired = await findExpiredPending.all(now - reservationTtlMs);
      for (const row of expired) {
        const res = await markOrderExpired.run(row.order_id);
        if (res.changes === 1) {
          for (const item of JSON.parse(row.items_json)) {
            await restoreStock.run(item.quantity, now, item.sku);
          }
        }
      }
    }
  }

  function serializeOrder(row) {
    return {
      orderId: row.order_id,
      createdAt: new Date(row.created_at).toISOString(),
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      customerName: row.customer_name,
      email: row.email,
      phone: row.phone,
      address: JSON.parse(row.address_json),
      items: JSON.parse(row.items_json),
      discountCode: row.discount_code || '',
      subtotal: Math.round(row.subtotal_paise / 100),
      discountAmount: Math.round(row.discount_paise / 100),
      shipping: Math.round(row.shipping_paise / 100),
      total: Math.round(row.total_paise / 100)
    };
  }

  async function getCatalog() {
    await ensureReady();
    const liveProducts = await Promise.all(
      products.map(async (product) => ({
        slug: product.slug,
        name: product.name,
        category: product.category,
        group: product.group,
        format: product.format,
        status: product.status,
        stage: product.stage,
        image: product.image,
        alt: product.alt,
        variants: await Promise.all(
          product.variants.map(async (variant) => {
            const row = await getStock.get(variant.id);
            return { ...variant, stock: row ? Number(row.stock) : variant.stock };
          })
        )
      }))
    );
    return { brand, discountCodes, products: liveProducts };
  }

  async function createOrder(input) {
    await ensureReady();
    const customerName = typeof input.customerName === 'string' ? input.customerName.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const rawPhone = typeof input.phone === 'string' ? input.phone.replace(/\D/g, '') : '';
    const phone = rawPhone.length > 10 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone;
    const addr = input.address || {};
    const addressLine1 = typeof addr.addressLine1 === 'string' ? addr.addressLine1.trim() : '';
    const addressLine2 = typeof addr.addressLine2 === 'string' ? addr.addressLine2.trim() : '';
    const city = typeof addr.city === 'string' ? addr.city.trim() : '';
    const state = typeof addr.state === 'string' ? addr.state.trim() : '';
    const pincode = typeof addr.pincode === 'string' ? addr.pincode.trim() : '';

    if (input.paymentMethod !== 'cod' && input.paymentMethod !== 'razorpay') {
      throw new HttpError(400, 'Select a valid payment method (Razorpay or COD).');
    }
    const paymentMethod = input.paymentMethod;

    if (
      customerName.length < 2 ||
      customerName.length > 120 ||
      hasControlChar.test(customerName) ||
      !validEmail.test(email) ||
      !validIndianPhone.test(phone)
    ) {
      throw new HttpError(400, 'Enter a valid name, email address and 10-digit Indian mobile number.');
    }
    if (
      addressLine1.length < 5 ||
      addressLine1.length > 180 ||
      hasControlChar.test(addressLine1) ||
      hasControlChar.test(addressLine2) ||
      city.length < 2 ||
      city.length > 80 ||
      hasControlChar.test(city) ||
      state.length < 2 ||
      state.length > 80 ||
      hasControlChar.test(state) ||
      !validPin.test(pincode)
    ) {
      throw new HttpError(400, 'Enter a valid Indian delivery address, state and 6-digit PIN code.');
    }
    if (!Array.isArray(input.items) || !input.items.length || input.items.length > 25) {
      throw new HttpError(400, 'Add at least one item before checking out.');
    }

    const mergedItems = new Map();
    for (const entry of input.items) {
      const sku = typeof entry?.sku === 'string' ? entry.sku.trim() : '';
      const qty = Number(entry?.quantity);
      const variant = variantCatalog.get(sku);
      if (!variant || variant.product.status !== 'in-stock' || !Number.isInteger(qty) || qty < 1 || qty > 50) {
        throw new HttpError(400, 'One or more products in your bag are unavailable.');
      }
      mergedItems.set(sku, (mergedItems.get(sku) || 0) + qty);
    }

    let subtotal = 0;
    const lineSnapshots = [];
    for (const [sku, quantity] of mergedItems) {
      const variant = variantCatalog.get(sku);
      const lineTotal = variant.price * quantity;
      subtotal += lineTotal;
      lineSnapshots.push({
        sku,
        slug: variant.product.slug,
        name: variant.product.name,
        variantLabel: variant.label,
        quantity,
        unitPrice: variant.price,
        lineTotal
      });
    }

    const codeInput = typeof input.discountCode === 'string' ? input.discountCode.trim().toUpperCase() : '';
    const rule = discountCodes.find((item) => item.code === codeInput);
    let discountAmount = 0;
    let appliedCode = '';
    let freeShippingFromCode = false;

    if (rule && subtotal >= rule.minSubtotal) {
      appliedCode = rule.code;
      if (rule.type === 'percent') discountAmount = Math.round((subtotal * rule.value) / 100);
      else if (rule.type === 'shipping') freeShippingFromCode = true;
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const shipping = afterDiscount >= brand.freeShippingThreshold || freeShippingFromCode ? 0 : brand.standardShippingFee;
    const total = afterDiscount + shipping;

    const subtotalPaise = subtotal * 100;
    const discountPaise = discountAmount * 100;
    const shippingPaise = shipping * 100;
    const totalPaise = total * 100;

    const orderId = `DEB-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const timestamp = Date.now();
    let razorpayOrderId = null;

    if (paymentMethod === 'razorpay' && config.razorpay.enabled) {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      const rzpRes = await fetcher('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPaise,
          currency: 'INR',
          receipt: orderId,
          notes: { customerName, phone }
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(10000)
      });
      if (!rzpRes.ok) {
        throw new HttpError(502, 'Razorpay payment service could not be reached. Please try again or use COD.');
      }
      const rzpData = await rzpRes.json();
      if (!rzpData?.id) throw new HttpError(502, 'Invalid response from Razorpay payment service.');
      razorpayOrderId = rzpData.id;
    }

    const paymentLabel =
      paymentMethod === 'cod'
        ? 'Cash on Delivery (COD)'
        : config.razorpay.enabled
          ? 'Razorpay (Online)'
          : 'Razorpay Preview';
    const paymentStatus =
      paymentMethod === 'cod'
        ? 'Pay on Delivery'
        : config.razorpay.enabled
          ? 'Pending Payment'
          : 'Preview Recorded';
    const orderStatus = paymentMethod === 'razorpay' && config.razorpay.enabled ? 'Pending Payment' : 'Confirmed';

    const deducted = [];
    try {
      for (const [sku, qty] of mergedItems) {
        const res = await deductStock.run(qty, timestamp, sku, qty);
        if (res.changes !== 1) {
          throw new HttpError(409, 'Requested quantity exceeds current stock for one or more items.');
        }
        deducted.push([sku, qty]);
      }
      await insertOrder.run(
        orderId,
        timestamp,
        orderStatus,
        paymentLabel,
        paymentStatus,
        razorpayOrderId,
        null,
        customerName,
        email,
        phone,
        JSON.stringify({ addressLine1, addressLine2, city, state, pincode }),
        JSON.stringify(lineSnapshots),
        appliedCode,
        subtotalPaise,
        discountPaise,
        shippingPaise,
        totalPaise
      );
    } catch (error) {
      for (const [sku, qty] of deducted) {
        await restoreStock.run(qty, Date.now(), sku).catch(() => {});
      }
      throw error;
    }

    const saved = await findOrder.get(orderId);
    return {
      order: serializeOrder(saved),
      razorpayOrderId,
      amountPaise: totalPaise
    };
  }

  async function verifyRazorpayPayment(input) {
    if (!config.razorpay.enabled) {
      throw new HttpError(400, 'Razorpay merchant keys are not configured on this server.');
    }
    const orderId = typeof input.orderId === 'string' ? input.orderId.trim() : '';
    const razorpayOrderId = typeof input.razorpayOrderId === 'string' ? input.razorpayOrderId.trim() : '';
    const razorpayPaymentId = typeof input.razorpayPaymentId === 'string' ? input.razorpayPaymentId.trim() : '';
    const razorpaySignature = typeof input.razorpaySignature === 'string' ? input.razorpaySignature.trim() : '';

    if (
      !validOrderId.test(orderId) ||
      !/^order_[A-Za-z0-9]{6,40}$/.test(razorpayOrderId) ||
      !/^[A-Za-z0-9_]{6,48}$/.test(razorpayPaymentId) ||
      !/^[a-f0-9]{64}$/i.test(razorpaySignature)
    ) {
      throw new HttpError(400, 'Invalid payment verification payload.');
    }

    const expected = createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const sigBuf = Buffer.from(razorpaySignature.toLowerCase(), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new HttpError(400, 'Payment signature could not be verified.');
    }

    const updated = await markOrderPaid.run(`Paid (${razorpayPaymentId})`, razorpayPaymentId, orderId, razorpayOrderId);
    if (updated.changes !== 1) {
      throw new HttpError(404, 'Matching pending order not found for this payment.');
    }

    return { order: serializeOrder(await findOrder.get(orderId)) };
  }

  async function cancelRazorpayOrder(input) {
    const orderId = typeof input.orderId === 'string' ? input.orderId.trim() : '';
    const razorpayOrderId = typeof input.razorpayOrderId === 'string' ? input.razorpayOrderId.trim() : '';
    if (!validOrderId.test(orderId) || !razorpayOrderId) {
      throw new HttpError(400, 'Invalid cancellation request.');
    }
    const existing = await findOrder.get(orderId);
    if (!existing || existing.razorpay_order_id !== razorpayOrderId) {
      throw new HttpError(404, 'Pending order not found.');
    }
    const res = await markOrderCancelled.run(orderId, razorpayOrderId);
    if (res.changes === 1) {
      const now = Date.now();
      for (const item of JSON.parse(existing.items_json)) {
        await restoreStock.run(item.quantity, now, item.sku);
      }
    }
    return { cancelled: res.changes === 1 };
  }

  async function trackOrder(orderIdInput, contactInput) {
    const orderId = typeof orderIdInput === 'string' ? orderIdInput.trim().toUpperCase() : '';
    const contact = typeof contactInput === 'string' ? contactInput.trim().toLowerCase() : '';
    if (!validOrderId.test(orderId) || !contact) {
      throw new HttpError(400, 'Enter a valid Order ID and phone or email.');
    }

    const row = await findOrder.get(orderId);
    if (!row) throw new HttpError(404, 'Order not found.');

    const digits = contact.replace(/\D/g, '').slice(-10);
    const matchesEmail = row.email.toLowerCase() === contact;
    const matchesPhone = Boolean(validIndianPhone.test(digits) && digits === row.phone);
    if (!matchesEmail && !matchesPhone) {
      throw new HttpError(404, 'Order not found for those contact details.');
    }
    return { order: serializeOrder(row) };
  }

  async function createSupportTicket(input) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const phone = typeof input.phone === 'string' ? input.phone.trim().slice(0, 20) : '';
    const topic = typeof input.topic === 'string' ? input.topic.trim().slice(0, 80) : 'General Enquiry';
    const orderId = typeof input.orderId === 'string' ? input.orderId.trim().slice(0, 40) : '';
    const message = typeof input.message === 'string' ? input.message.trim() : '';

    if (
      name.length < 2 ||
      name.length > 120 ||
      hasControlChar.test(name) ||
      !validEmail.test(email) ||
      message.length < 5 ||
      message.length > 2000
    ) {
      throw new HttpError(400, 'Please enter your name, valid email and a message.');
    }

    const ticketId = `SUP-${randomBytes(3).toString('hex').toUpperCase()}`;
    await insertTicket.run(ticketId, Date.now(), name, email, phone, topic, orderId, message);
    return { ticketId };
  }

  async function joinWaitlist(input) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const productSlug = typeof input.productSlug === 'string' ? input.productSlug.trim() : '';
    if (!validEmail.test(email) || !products.some((p) => p.slug === productSlug)) {
      throw new HttpError(400, 'Enter a valid email address and product.');
    }
    await upsertWaitlist.run(email, productSlug, Date.now());
    return { accepted: true };
  }

  return {
    getCatalog,
    createOrder,
    verifyRazorpayPayment,
    cancelRazorpayOrder,
    trackOrder,
    createSupportTicket,
    joinWaitlist
  };
}
