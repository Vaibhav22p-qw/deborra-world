const products = JSON.parse(document.querySelector('#preview-products').textContent);
const variants = new Map(products.flatMap((product) => product.variants.map((variant) => [
  variant.id, { ...variant, name: product.name, image: product.image }
])));
const key = 'deborra-store-preview-v1';
const wholeRupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fractionalRupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const paymentMethods = ['UPI', 'Card', 'Net banking', 'Wallet'];
const views = [...document.querySelectorAll('[data-view]')];
const nav = [...document.querySelectorAll('[data-preview-nav]')];
const itemList = document.querySelector('#bag-items');
const discountForm = document.querySelector('#discount-form');
const discountStatus = document.querySelector('#discount-status');
const checkout = document.querySelector('#checkout-form');
const notice = document.querySelector('#preview-status');
const productForms = [...document.querySelectorAll('.preview-product-form')];

function readPreview() {
  try {
    return JSON.parse(sessionStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

const saved = readPreview();
const bag = new Map();

for (const entry of Array.isArray(saved.bag) ? saved.bag : []) {
  if (!Array.isArray(entry)) continue;
  const [id, quantity] = entry;
  const variant = variants.get(id);
  if (variant && Number.isInteger(quantity) && quantity >= 1 && quantity <= variant.stock) {
    bag.set(id, quantity);
  }
}

let discount = saved.discount === true && bag.size > 0;
let receipt = saved.receipt;
if (!receipt || typeof receipt.id !== 'string' || !/^DW-DEMO-[A-F0-9]{8}$/.test(receipt.id)
  || !paymentMethods.includes(receipt.payment) || !Number.isSafeInteger(receipt.total)
  || receipt.total <= 0 || !Number.isInteger(receipt.quantity) || receipt.quantity <= 0) {
  receipt = null;
}

function savePreview() {
  try {
    sessionStorage.setItem(key, JSON.stringify({ bag: [...bag], discount, receipt }));
  } catch {
    // The preview still works in memory when session storage is unavailable.
  }
}

function money(paise) {
  return (paise % 100 === 0 ? wholeRupees : fractionalRupees).format(paise / 100);
}

function calculate() {
  let subtotal = 0;
  let quantity = 0;
  const items = [];

  for (const [id, count] of bag) {
    const variant = variants.get(id);
    const lineTotal = variant.price * count * 100;
    subtotal += lineTotal;
    quantity += count;
    items.push({ ...variant, quantity: count, lineTotal });
  }

  const savings = discount ? Math.round(subtotal / 10) : 0;
  const delivery = subtotal > 0 && subtotal < 99900 ? 6000 : 0;
  return { items, quantity, subtotal, savings, delivery, total: subtotal - savings + delivery };
}

function totalsMarkup({ subtotal, savings, delivery, total }) {
  return `<dl class="preview-totals">
    <div><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
    ${savings ? `<div><dt>Sample discount</dt><dd>−${money(savings)}</dd></div>` : ''}
    <div><dt>Sample delivery</dt><dd>${delivery ? money(delivery) : 'Free'}</dd></div>
    <div class="preview-totals__total"><dt>Total</dt><dd>${money(total)}</dd></div>
  </dl>`;
}

function renderProduct(form) {
  const variant = variants.get(form.elements.variant.value);
  const inBag = bag.get(variant.id) || 0;
  const atLimit = inBag >= variant.stock;
  const add = form.querySelector('button');

  form.querySelector('[data-price]').textContent = money(variant.price * 100);
  form.querySelector('[data-stock]').textContent = variant.stock === 0 ? 'Sold out' : 'In stock';
  add.disabled = atLimit;
  add.textContent = variant.stock === 0 ? 'Sold out' : atLimit ? 'Bag limit reached' : 'Add to bag';
}

function renderBag(summary) {
  document.querySelector('#empty-bag').hidden = summary.quantity > 0;
  document.querySelector('#filled-bag').hidden = summary.quantity === 0;
  itemList.innerHTML = summary.items.map((item) => `<li class="bag-item">
    <img src="../assets/${item.image}" alt="" width="88" height="88">
    <div class="bag-item__copy"><h2>${item.name}</h2><p>${item.label}</p>
      <button class="bag-item__remove" type="button" data-remove="${item.id}" aria-label="Remove ${item.name}, ${item.label}">Remove</button>
    </div>
    <div class="bag-item__controls"><strong>${money(item.lineTotal)}</strong>
      <label>Qty <select data-quantity="${item.id}" aria-label="Quantity for ${item.name}, ${item.label}">
        ${Array.from({ length: item.stock }, (_, index) => {
          const quantity = index + 1;
          return `<option value="${quantity}"${quantity === item.quantity ? ' selected' : ''}>${quantity}</option>`;
        }).join('')}
      </select></label>
    </div>
  </li>`).join('');
  document.querySelector('#bag-totals').innerHTML = totalsMarkup(summary);
}

function renderCheckout(summary) {
  document.querySelector('#checkout-items').innerHTML = summary.items.map((item) =>
    `<li><span>${item.name} <small>${item.label} · Qty ${item.quantity}</small></span><strong>${money(item.lineTotal)}</strong></li>`).join('');
  document.querySelector('#checkout-totals').innerHTML = totalsMarkup(summary);
}

function renderConfirmation() {
  if (!receipt) return;
  document.querySelector('#confirmation-summary').innerHTML = `<h2>Sample receipt</h2>
    <dl class="preview-totals">
      <div><dt>Reference</dt><dd>${receipt.id}</dd></div>
      <div><dt>Items</dt><dd>${receipt.quantity}</dd></div>
      <div><dt>Sample payment method</dt><dd>${receipt.payment}</dd></div>
      <div class="preview-totals__total"><dt>Sample total</dt><dd>${money(receipt.total)}</dd></div>
    </dl>`;
}

function renderCart() {
  const summary = calculate();
  document.querySelector('#bag-count').textContent = summary.quantity;
  productForms.forEach(renderProduct);
  renderBag(summary);
  renderCheckout(summary);
}

let noticeTimer;
function announce(message) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  noticeTimer = setTimeout(() => { notice.textContent = ''; }, 4500);
}

function showView(focusHeading) {
  const requested = location.hash.slice(1);
  if (requested === 'main') return;
  let target = views.some((view) => view.dataset.view === requested) ? requested : 'collection';
  if (target === 'checkout' && !bag.size) target = 'bag';
  if (target === 'confirmation' && !receipt) target = 'collection';
  if (requested && target !== requested) history.replaceState(null, '', '#' + target);

  if (target === 'confirmation') renderConfirmation();
  for (const view of views) view.hidden = view.dataset.view !== target;
  for (const link of nav) {
    if (link.dataset.previewNav === target) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  }
  if (focusHeading) {
    clearTimeout(noticeTimer);
    notice.textContent = '';
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector(`[data-view="${target}"] h1`).focus({ preventScroll: true });
  }
}

for (const form of productForms) {
  form.addEventListener('change', () => renderProduct(form));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const variant = variants.get(form.elements.variant.value);
    const current = bag.get(variant.id) || 0;
    if (current >= variant.stock) return;

    bag.set(variant.id, current + 1);
    savePreview();
    renderCart();
    if (current + 1 >= variant.stock) form.elements.variant.focus();
    announce(`${variant.name} added to your bag.`);
  });
}

itemList.addEventListener('change', (event) => {
  const id = event.target.dataset.quantity;
  const variant = variants.get(id);
  const quantity = Number(event.target.value);
  if (!variant || !bag.has(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > variant.stock) return;

  bag.set(id, quantity);
  savePreview();
  renderCart();
  itemList.querySelector(`[data-quantity="${id}"]`).focus();
});

itemList.addEventListener('click', (event) => {
  const id = event.target.dataset.remove;
  if (!bag.delete(id)) return;

  if (!bag.size) {
    discount = false;
    discountForm.reset();
    discountStatus.textContent = '';
  }
  savePreview();
  renderCart();
  const focus = itemList.querySelector('[data-remove]') || document.querySelector('#empty-bag a');
  focus.focus();
  announce(`${variants.get(id).name} removed from your bag.`);
});

discountForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const entered = discountForm.elements.discount.value.trim().toUpperCase();
  discount = entered === 'DEBORRA10';
  discountStatus.textContent = discount ? 'Sample discount applied.' : 'Enter DEBORRA10 to try the sample discount.';
  savePreview();
  renderCart();
});

checkout.addEventListener('submit', (event) => {
  event.preventDefault();
  const payment = new FormData(checkout).get('payment');
  if (!bag.size || !paymentMethods.includes(payment)) return;

  const { quantity, total } = calculate();
  receipt = { id: 'DW-DEMO-' + crypto.randomUUID().slice(0, 8).toUpperCase(), payment, quantity, total };
  bag.clear();
  discount = false;
  discountForm.reset();
  discountStatus.textContent = '';
  checkout.reset();
  savePreview();
  renderCart();
  location.hash = 'confirmation';
});

window.addEventListener('hashchange', () => showView(true));
if (discount) {
  discountForm.elements.discount.value = 'DEBORRA10';
  discountStatus.textContent = 'Sample discount applied.';
}
renderCart();
showView(false);
