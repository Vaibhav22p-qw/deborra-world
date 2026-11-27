import { httpsUrl } from './site-config.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function button(label, style, onClick) {
  const element = node('button', style, label);
  element.type = 'button';
  if (onClick) element.addEventListener('click', onClick);
  return element;
}

function price(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: value.currencyCode }).format(Number(value.amount));
}

async function request(command) {
  const response = await fetch('/api/cart', {
    ...(command ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) } : {}),
    signal: AbortSignal.timeout(22000)
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'The bag is temporarily unavailable.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function makeCart() {
  const dialog = node('dialog', 'server-cart');
  dialog.setAttribute('aria-labelledby', 'server-cart-heading');
  const head = node('header', 'server-cart__header');
  const heading = node('h2', '', 'Your bag.');
  heading.id = 'server-cart-heading';
  const close = button('Close', 'text-link server-cart__close', () => dialog.close());
  close.autofocus = true;
  head.append(heading, close);
  const status = node('p', 'server-cart__status');
  status.setAttribute('role', 'status');
  const content = node('fieldset', 'server-cart__content');
  const legend = node('legend', 'visually-hidden', 'Bag details');
  const body = node('div');
  content.append(legend, body);
  dialog.append(head, status, content);
  document.body.append(dialog);

  let readyToShow = false;
  let busy = false;
  let pendingAdd;

  function render(cart) {
    body.replaceChildren();
    if (!cart.lines.length) {
      body.append(node('p', '', 'Your bag is empty.'), button('Continue shopping', 'button button--primary', () => dialog.close()));
      return;
    }
    const lines = node('ul', 'server-cart__lines');
    for (const line of cart.lines) {
      const item = node('li', 'server-cart__line');
      const imageUrl = httpsUrl(line.image?.url);
      if (imageUrl) {
        const image = node('img');
        Object.assign(image, { src: imageUrl.href, alt: '', width: 64, height: 64 });
        item.append(image);
      }
      const description = node('div', 'server-cart__description');
      description.append(node('h3', '', line.title));
      if (line.variant && line.variant !== 'Default Title') description.append(node('p', '', line.variant));
      description.append(button('Remove', 'text-link server-cart__remove', () => update({ action: 'remove', key: line.key })));
      const controls = node('form', 'server-cart__line-controls');
      const amount = node('strong', '', price(line.total));
      const quantity = node('input', 'store-select');
      Object.assign(quantity, { type: 'number', min: '1', max: '999', step: '1', required: true, value: String(line.quantity) });
      quantity.setAttribute('aria-label', 'Quantity for ' + line.title);
      const save = node('button', 'text-link server-cart__remove', 'Update');
      save.type = 'submit';
      controls.addEventListener('submit', (event) => {
        event.preventDefault();
        update({ action: 'update', key: line.key, quantity: Number(quantity.value) });
      });
      controls.append(amount, quantity, save);
      item.append(description, controls);
      lines.append(item);
    }

    const discount = node('form', 'server-cart__discount');
    const label = node('label', '', 'Discount code');
    label.htmlFor = 'server-cart-code';
    const code = node('input', 'store-select');
    Object.assign(code, { id: label.htmlFor, maxLength: 64, value: cart.discounts[0]?.code || '' });
    const apply = node('button', 'button button--primary', 'Apply');
    apply.type = 'submit';
    discount.append(label, code, apply);
    discount.addEventListener('submit', (event) => {
      event.preventDefault();
      update({ action: 'discount', code: code.value });
    });
    const total = node('p', 'server-cart__total');
    total.append(node('span', '', 'Estimated total'), node('strong', '', price(cart.total)));
    const checkout = button('Continue to secure checkout', 'button button--gold', () => update({ action: 'checkout' }));
    body.append(lines, discount, total, node('p', 'image-note', 'Delivery, applicable discounts and the final total are confirmed at checkout.'), checkout);
  }

  async function update(command) {
    if (busy) return;
    busy = true;
    content.disabled = true;
    status.textContent = command?.action === 'checkout' ? 'Opening secure checkout…' : 'Updating your bag…';
    try {
      const result = await request(command);
      if (command?.action === 'checkout') {
        const url = httpsUrl(result.url);
        if (!url) throw new Error('Checkout is temporarily unavailable.');
        location.assign(url.href);
      } else {
        render(result);
        const discount = result.discounts[0];
        status.textContent = result.notice || (discount ? (discount.applicable ? 'Discount applied.' : 'This discount does not apply to the current bag.') : '');
        if (command) close.focus();
      }
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = false;
      content.disabled = false;
    }
  }

  return {
    async addLine({ variantId, quantity }) {
      if (busy) throw new Error('The bag is updating.');
      busy = true;
      if (pendingAdd?.variantId !== variantId || pendingAdd.quantity !== quantity) {
        pendingAdd = { action: 'add', variantId, quantity, operationId: crypto.randomUUID() };
      }
      try {
        const data = await request(pendingAdd);
        pendingAdd = undefined;
        render(data);
        status.textContent = data.notice;
        readyToShow = true;
      } catch (error) {
        if (error.status && error.status < 500) pendingAdd = undefined;
        throw error;
      } finally {
        busy = false;
      }
    },
    async showModal() {
      if (!dialog.open) dialog.showModal();
      if (!readyToShow) await update();
      readyToShow = false;
    }
  };
}
