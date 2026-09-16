const { createClient } = window.supabase;
const sb = createClient(
  SHOP_CONFIG.SUPABASE_URL,
  SHOP_CONFIG.SUPABASE_PUBLISHABLE_KEY
);

const productsEl = document.getElementById('products');
const modal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');

let catalog = [];

function money(v) {
  return `৳${Number(v).toLocaleString('en-BD')}`;
}

/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  const { data: products, error } = await sb
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    productsEl.innerHTML =
      `<div class="panel">Product load error: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const ids = products.map(p => p.id);

  let variants = [];
  let sizes = [];

  if (ids.length) {
    const vr = await sb
      .from('product_variants')
      .select('*')
      .in('product_id', ids)
      .eq('active', true)
      .order('created_at');

    if (vr.error) {
      productsEl.innerHTML =
        `<div class="panel">Variant load error: ${escapeHtml(vr.error.message)}</div>`;
      return;
    }

    variants = vr.data || [];

    const variantIds = variants.map(v => v.id);

    if (variantIds.length) {
      const sr = await sb
        .from('variant_sizes')
        .select('*')
        .in('variant_id', variantIds)
        .eq('active', true)
        .order('created_at');

      if (sr.error) {
        productsEl.innerHTML =
          `<div class="panel">Size load error: ${escapeHtml(sr.error.message)}</div>`;
        return;
      }

      sizes = sr.data || [];
    }
  }

  catalog = products.map(p => ({
    ...p,

    variants: variants
      .filter(v => v.product_id === p.id)
      .map(v => ({
        ...v,
        sizes: sizes.filter(s => s.variant_id === v.id)
      }))
  }));

  renderProducts();
}

/* =========================
   RENDER PRODUCTS
========================= */

function renderProducts() {
  if (!catalog.length) {
    productsEl.innerHTML =
      '<div class="panel">এখনো কোনো product যোগ করা হয়নি।</div>';
    return;
  }

  productsEl.innerHTML = catalog.map(p => {

    const variants = p.variants.length
      ? p.variants
      : [{
          id: null,
          name: 'Default',
          image_url: p.main_image_url,
          sizes: []
        }];

    return `
      <article class="card">

        <img
          src="${escapeAttr(
            p.main_image_url ||
            'https://placehold.co/600x600?text=Product'
          )}"
          alt=""
        >

        <h3>${escapeHtml(p.name)}</h3>

        <p>${escapeHtml(p.description || '')}</p>

        <select
          class="select variant-select"
          data-p="${p.id}"
        >
          ${variants.map(v => `
            <option value="${v.id}">
              ${escapeHtml(v.name)}
            </option>
          `).join('')}
        </select>

        <select
          class="select size-select"
          data-p="${p.id}"
        ></select>

        <div
          class="price"
          id="price-${p.id}"
        ></div>

        <button
          class="primary order-btn"
          data-p="${p.id}"
        >
          Order Now
        </button>

      </article>
    `;
  }).join('');

  catalog.forEach(p => updateVariantUI(p.id));

  productsEl
    .querySelectorAll('.variant-select')
    .forEach(el => {
      el.addEventListener('change', () => {
        updateVariantUI(Number(el.dataset.p));
      });
    });

  productsEl
    .querySelectorAll('.size-select')
    .forEach(el => {
      el.addEventListener('change', () => {
        updatePrice(Number(el.dataset.p));
      });
    });

  productsEl
    .querySelectorAll('.order-btn')
    .forEach(el => {
      el.addEventListener('click', () => {
        openOrder(Number(el.dataset.p));
      });
    });
}

/* =========================
   SELECTED VARIANT
========================= */

function selectedVariant(p) {
  const variantEl =
    document.querySelector(
      `.variant-select[data-p="${p.id}"]`
    );

  if (!variantEl) return null;

  const vId = variantEl.value;

  return (
    p.variants.find(
      v => String(v.id) === String(vId)
    ) || p.variants[0]
  );
}

/* =========================
   UPDATE VARIANT UI
========================= */

function updateVariantUI(pid) {
  const p = catalog.find(x => x.id === pid);

  if (!p) return;

  const v = selectedVariant(p);

  const sizeEl =
    document.querySelector(
      `.size-select[data-p="${pid}"]`
    );

  if (!sizeEl) return;

  const sizes = v?.sizes || [];

  if (!sizes.length) {
    sizeEl.innerHTML =
      `<option value="">No size available</option>`;

    updatePrice(pid);
    updateOrderButton(pid, false);

    return;
  }

  sizeEl.innerHTML = sizes.map(s => {

    const stock = Number(s.stock || 0);

    return `
      <option
        value="${s.id}"
        ${stock <= 0 ? 'disabled' : ''}
      >
        ${escapeHtml(s.size)}
        — ${money(s.price)}
        ${stock > 0 ? `(${stock} left)` : '(Out of Stock)'}
      </option>
    `;

  }).join('');

  /* প্রথম available size select করা */
  const firstAvailable =
    sizes.find(s => Number(s.stock) > 0);

  if (firstAvailable) {
    sizeEl.value = firstAvailable.id;
  }

  updatePrice(pid);
}

/* =========================
   UPDATE PRICE
========================= */

function updatePrice(pid) {
  const p = catalog.find(x => x.id === pid);

  if (!p) return;

  const v = selectedVariant(p);

  const sizeEl =
    document.querySelector(
      `.size-select[data-p="${pid}"]`
    );

  const sid = sizeEl?.value;

  const s =
    (v?.sizes || []).find(
      x => String(x.id) === String(sid)
    );

  const priceEl =
    document.getElementById(`price-${pid}`);

  if (!priceEl) return;

  if (!s) {
    priceEl.textContent = 'দাম সেট করা হয়নি';
    updateOrderButton(pid, false);
    return;
  }

  const stock = Number(s.stock || 0);

  priceEl.textContent =
    stock > 0
      ? money(s.price)
      : 'Out of Stock';

  updateOrderButton(pid, stock > 0);
}

/* =========================
   ORDER BUTTON
========================= */

function updateOrderButton(pid, available) {
  const btn =
    document.querySelector(
      `.order-btn[data-p="${pid}"]`
    );

  if (!btn) return;

  if (available) {
    btn.disabled = false;
    btn.textContent = 'Order Now';
  } else {
    btn.disabled = true;
    btn.textContent = 'Out of Stock';
  }
}

/* =========================
   OPEN ORDER MODAL
========================= */

function openOrder(pid) {
  const p = catalog.find(x => x.id === pid);

  if (!p) return;

  const v = selectedVariant(p);

  const sizeEl =
    document.querySelector(
      `.size-select[data-p="${p.id}"]`
    );

  const sid = sizeEl?.value;

  const s =
    (v?.sizes || []).find(
      x => String(x.id) === String(sid)
    );

  if (!s) {
    alert('এই product-এর কোনো available size নেই।');
    return;
  }

  const stock = Number(s.stock || 0);

  if (stock <= 0) {
    alert('এই size-এর stock শেষ হয়ে গেছে।');
    return;
  }

  document.getElementById('productName').value =
    p.name;

  document.getElementById('variantName').value =
    v.name;

  document.getElementById('sizeName').value =
    s.size;

  document.getElementById('unitPrice').value =
    s.price;

  document.getElementById('selectedProduct').textContent =
    `${p.name} — ${v.name} — ${s.size} — ${money(s.price)} — Stock: ${stock}`;

  const quantityEl =
    document.getElementById('quantity');

  quantityEl.value = 1;
  quantityEl.max = stock;

  updateOrderTotal();

  modal.classList.remove('hidden');
}

/* =========================
   ORDER TOTAL
========================= */

function updateOrderTotal() {
  const quantityEl =
    document.getElementById('quantity');

  const q =
    Math.max(1, Number(quantityEl.value || 1));

  const price =
    Number(
      document.getElementById('unitPrice').value || 0
    );

  document.getElementById('orderTotal').textContent =
    `Product Total: ${money(q * price)}`;
}

document
  .getElementById('quantity')
  .addEventListener('input', updateOrderTotal);

/* =========================
   CLOSE MODAL
========================= */

document.getElementById('closeModal').onclick = () => {
  modal.classList.add('hidden');
};

/* =========================
   PLACE ORDER
   STOCK WILL DECREASE
========================= */

orderForm.addEventListener('submit', async e => {

  e.preventDefault();

  const quantityEl =
    document.getElementById('quantity');

  const q =
    Number(quantityEl.value);

  const price =
    Number(
      document.getElementById('unitPrice').value
    );

  const productName =
    document.getElementById('productName').value;

  const variantName =
    document.getElementById('variantName').value;

  const sizeName =
    document.getElementById('sizeName').value;

  /* Selected product বের করা */
  const p =
    catalog.find(
      x => x.name === productName
    );

  if (!p) {
    alert('Product পাওয়া যায়নি।');
    return;
  }

  const v =
    p.variants.find(
      x => x.name === variantName
    );

  if (!v) {
    alert('Variant পাওয়া যায়নি।');
    return;
  }

  const s =
    (v.sizes || []).find(
      x => x.size === sizeName
    );

  if (!s) {
    alert('Size পাওয়া যায়নি।');
    return;
  }

  const variantSizeId = s.id;

  if (!variantSizeId) {
    alert(
      'এই product-এর stock system এখনো সেট করা হয়নি।'
    );
    return;
  }

  if (q < 1) {
    alert('Quantity কমপক্ষে 1 হতে হবে।');
    return;
  }

  if (q > Number(s.stock)) {
    alert(
      `এই size-এ মাত্র ${s.stock} টি stock আছে।`
    );
    return;
  }

  const msg =
    document.getElementById('orderMessage');

  msg.textContent = 'অর্ডার processing হচ্ছে...';

  /* =========================
     SUPABASE RPC
  ========================= */

  const { data, error } = await sb.rpc(
    'place_order',
    {
      p_customer_name:
        document
          .getElementById('customerName')
          .value
          .trim(),

      p_phone:
        document
          .getElementById('phone')
          .value
          .trim(),

      p_address:
        document
          .getElementById('address')
          .value
          .trim(),

      p_district:
        document
          .getElementById('district')
          .value
          .trim(),

      p_upazila:
        document
          .getElementById('upazila')
          .value
          .trim(),

      p_product_name:
        productName,

      p_variant_name:
        variantName,

      p_size_name:
        sizeName,

      p_variant_size_id:
        variantSizeId,

      p_quantity:
        q,

      p_product_price:
        price
    }
  );

  /* RPC error */
  if (error) {
    msg.textContent =
      'অর্ডার হয়নি: ' + error.message;

    return;
  }

  /* Function success কিনা */
  if (!data || data.success !== true) {

    msg.textContent =
      'অর্ডার হয়নি: ' +
      (data?.message || 'Unknown error');

    return;
  }

  /* =========================
     SUCCESS
  ========================= */

  msg.textContent =
    `অর্ডার সফল হয়েছে। বাকি stock: ${data.remaining_stock}`;

  alert(
    `অর্ডার সফল হয়েছে!\n\nবাকি stock: ${data.remaining_stock}`
  );

  orderForm.reset();

  document.getElementById('quantity').value = 1;

  /*
    Modal বন্ধ
  */
  modal.classList.add('hidden');

  /*
    Product list আবার load করা হবে,
    যাতে নতুন stock সঙ্গে সঙ্গে দেখা যায়।
  */
  await loadProducts();

});

/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );
}

function escapeAttr(s) {
  return escapeHtml(s);
}

/* =========================
   START
========================= */

loadProducts();
