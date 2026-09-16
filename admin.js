const { createClient } = window.supabase;

const sb = createClient(
  SHOP_CONFIG.SUPABASE_URL,
  SHOP_CONFIG.SUPABASE_PUBLISHABLE_KEY
);

const loginPanel = document.getElementById('loginPanel');
const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logoutBtn');
const productList = document.getElementById('productList');
const editor = document.getElementById('editor');
const variantsEl = document.getElementById('variants');
const ordersList = document.getElementById('ordersList');

function money(v) {
  return `৳${Number(v || 0).toLocaleString('en-BD')}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}


/* =========================
   ADMIN AUTH
========================= */

async function isAdmin() {
  const {
    data: { user }
  } = await sb.auth.getUser();

  if (!user) return false;

  const {
    data,
    error
  } = await sb
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return !error && !!data;
}


async function refreshAuth() {
  const {
    data: { session }
  } = await sb.auth.getSession();

  if (session && await isAdmin()) {

    loginPanel.classList.add('hidden');
    dashboard.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    loadProducts();
    loadOrders();

  } else {

    loginPanel.classList.remove('hidden');
    dashboard.classList.add('hidden');
    logoutBtn.classList.add('hidden');

  }
}


/* =========================
   LOGIN
========================= */

document
  .getElementById('loginForm')
  .addEventListener('submit', async e => {

    e.preventDefault();

    const msg = document.getElementById('loginMessage');

    const {
      error
    } = await sb.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    });

    if (error) {
      msg.textContent = error.message;
      return;
    }

    if (!await isAdmin()) {

      await sb.auth.signOut();

      msg.textContent = 'এই account admin নয়।';

      return;
    }

    msg.textContent = '';

    refreshAuth();

  });


logoutBtn.onclick = () =>
  sb.auth.signOut().then(refreshAuth);


/* =========================
   PRODUCTS
========================= */

async function loadProducts() {

  const {
    data: products,
    error
  } = await sb
    .from('products')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (error) {

    productList.textContent = error.message;

    return;
  }

  productList.innerHTML = products.length
    ? products.map(p => `

      <div class="product-row">

        <img
          class="thumb"
          src="${esc(
            p.main_image_url ||
            'https://placehold.co/100x100?text=Product'
          )}"
          alt=""
        >

        <div class="grow">

          <b>${esc(p.name)}</b>

          <div class="muted">
            ${p.active ? 'Active' : 'Hidden'}
          </div>

        </div>

        <button
          class="secondary edit"
          data-id="${p.id}"
        >
          Edit
        </button>

        <button
          class="danger delete"
          data-id="${p.id}"
        >
          Delete
        </button>

      </div>

    `).join('')
    : 'কোনো product নেই।';


  productList
    .querySelectorAll('.edit')
    .forEach(b =>
      b.onclick = () =>
        editProduct(Number(b.dataset.id))
    );


  productList
    .querySelectorAll('.delete')
    .forEach(b =>
      b.onclick = () =>
        deleteProduct(Number(b.dataset.id))
    );

}


document
  .getElementById('newProductBtn')
  .onclick = () => openEditor();


document
  .getElementById('cancelEdit')
  .onclick = () =>
    editor.classList.add('hidden');


document
  .getElementById('addVariantBtn')
  .onclick = () =>
    addVariant();


/* =========================
   VARIANTS / SIZES
========================= */

function addVariant(data = {}) {

  const tpl =
    document
      .getElementById('variantTemplate')
      .content
      .cloneNode(true);

  const box =
    tpl.querySelector('.variant-box');

  box.querySelector('.v-name').value =
    data.name || '';

  box.querySelector('.remove-variant').onclick =
    () => box.remove();

  box.querySelector('.add-size').onclick =
    () => addSize(box);

  if (data.image_url)
    box.dataset.existingImage = data.image_url;

  variantsEl.appendChild(box);

  (data.sizes || [])
    .forEach(s =>
      addSize(box, s)
    );
}


function addSize(box, data = {}) {

  const tpl =
    document
      .getElementById('sizeTemplate')
      .content
      .cloneNode(true);

  const row =
    tpl.querySelector('.size-row');

  row.querySelector('.s-name').value =
    data.size || '';

  row.querySelector('.s-price').value =
    data.price ?? '';

  row.querySelector('.s-stock').value =
    data.stock ?? 0;

  row.querySelector('.remove-size').onclick =
    () => row.remove();

  if (data.id)
    row.dataset.id = data.id;

  box
    .querySelector('.sizes')
    .appendChild(row);
}


function openEditor(product = null, loadedVariants = []) {

  editor.classList.remove('hidden');

  document.getElementById('editorTitle').textContent =
    product ? 'Edit Product' : 'নতুন Product';

  document.getElementById('editProductId').value =
    product?.id || '';

  document.getElementById('pName').value =
    product?.name || '';

  document.getElementById('pDescription').value =
    product?.description || '';

  document.getElementById('mainPreview').innerHTML =
    product?.main_image_url
      ? `<img class="thumb" src="${esc(product.main_image_url)}">`
      : '';

  variantsEl.innerHTML = '';

  loadedVariants.forEach(v =>
    addVariant(v)
  );

  if (!loadedVariants.length)
    addVariant();

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}


/* =========================
   EDIT PRODUCT
========================= */

async function editProduct(id) {

  const {
    data: p,
    error
  } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {

    alert(error.message);

    return;
  }


  const {
    data: vs
  } = await sb
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('created_at');


  const vids =
    (vs || []).map(v => v.id);

  let sizes = [];


  if (vids.length) {

    const r =
      await sb
        .from('variant_sizes')
        .select('*')
        .in('variant_id', vids)
        .order('created_at');

    sizes = r.data || [];
  }


  openEditor(
    p,
    (vs || []).map(v => ({
      ...v,
      sizes: sizes.filter(
        s => s.variant_id === v.id
      )
    }))
  );
}


/* =========================
   IMAGE UPLOAD
========================= */

async function uploadImage(file, prefix) {

  if (!file)
    return null;

  const ext =
    (file.name.split('.').pop() || 'jpg')
      .toLowerCase();

  const path =
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;


  const {
    error
  } = await sb
    .storage
    .from('product-images')
    .upload(
      path,
      file,
      {
        upsert: false
      }
    );


  if (error)
    throw error;


  return sb
    .storage
    .from('product-images')
    .getPublicUrl(path)
    .data
    .publicUrl;
}


/* =========================
   SAVE PRODUCT
========================= */

document
  .getElementById('productForm')
  .addEventListener('submit', async e => {

    e.preventDefault();

    const msg =
      document.getElementById('saveMessage');

    msg.textContent = 'Saving...';


    try {

      const id =
        Number(
          document
            .getElementById('editProductId')
            .value
        ) || null;


      let mainUrl = null;

      const mainFile =
        document
          .getElementById('mainImage')
          .files[0];


      if (mainFile)
        mainUrl =
          await uploadImage(
            mainFile,
            'main'
          );


      let p;


      if (id) {

        const patch = {
          name:
            document
              .getElementById('pName')
              .value
              .trim(),

          description:
            document
              .getElementById('pDescription')
              .value
              .trim()
        };


        if (mainUrl)
          patch.main_image_url =
            mainUrl;


        const r =
          await sb
            .from('products')
            .update(patch)
            .eq('id', id)
            .select()
            .single();


        if (r.error)
          throw r.error;

        p = r.data;


      } else {

        const r =
          await sb
            .from('products')
            .insert({
              name:
                document
                  .getElementById('pName')
                  .value
                  .trim(),

              description:
                document
                  .getElementById('pDescription')
                  .value
                  .trim(),

              main_image_url:
                mainUrl
            })
            .select()
            .single();


        if (r.error)
          throw r.error;

        p = r.data;
      }


      /* Replace variants/sizes */

      if (id) {

        const {
          data: oldV
        } = await sb
          .from('product_variants')
          .select('id')
          .eq('product_id', id);


        const oldIds =
          (oldV || []).map(v => v.id);


        if (oldIds.length)
          await sb
            .from('variant_sizes')
            .delete()
            .in('variant_id', oldIds);


        await sb
          .from('product_variants')
          .delete()
          .eq('product_id', id);
      }


      for (
        const box of
        variantsEl.querySelectorAll('.variant-box')
      ) {

        const vFile =
          box
            .querySelector('.v-image')
            .files[0];


        const vUrl =
          vFile
            ? await uploadImage(
                vFile,
                `variant-${p.id}`
              )
            : null;


        const vr =
          await sb
            .from('product_variants')
            .insert({
              product_id: p.id,

              name:
                box
                  .querySelector('.v-name')
                  .value
                  .trim(),

              image_url:
                vUrl ||
                box.dataset.existingImage ||
                p.main_image_url
            })
            .select()
            .single();


        if (vr.error)
          throw vr.error;


        const rows =
          [
            ...box.querySelectorAll(
              '.size-row'
            )
          ];


        if (rows.length) {

          const payload =
            rows.map(r => ({
              variant_id:
                vr.data.id,

              size:
                r
                  .querySelector('.s-name')
                  .value
                  .trim(),

              price:
                Number(
                  r
                    .querySelector('.s-price')
                    .value
                ),

              stock:
                Number(
                  r
                    .querySelector('.s-stock')
                    .value
                ),

              active: true
            }));


          const sr =
            await sb
              .from('variant_sizes')
              .insert(payload);


          if (sr.error)
            throw sr.error;
        }
      }


      msg.textContent =
        'Product saved successfully.';

      await loadProducts();

    } catch (err) {

      msg.textContent =
        'Error: ' + err.message;
    }

  });


/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(id) {

  if (
    !confirm(
      'এই product এবং এর varieties/sizes delete করবেন?'
    )
  )
    return;


  const {
    error
  } = await sb
    .from('products')
    .delete()
    .eq('id', id);


  if (error) {

    alert(error.message);

    return;
  }


  loadProducts();
}


/* =========================
   ORDERS
========================= */

async function loadOrders() {

  ordersList.innerHTML =
    'অর্ডার লোড হচ্ছে...';


  const {
    data: orders,
    error
  } = await sb
    .from('orders')
    .select('*')
    .order('created_at', {
      ascending: false
    });


  if (error) {

    ordersList.innerHTML =
      `<p class="message">
        Orders load error: ${esc(error.message)}
      </p>`;

    return;
  }


  if (!orders || !orders.length) {

    ordersList.innerHTML =
      '<p>এখনো কোনো order নেই।</p>';

    return;
  }


  ordersList.innerHTML =
    orders.map(order => {

      const date =
        order.created_at
          ? new Date(
              order.created_at
            ).toLocaleString(
              'bn-BD',
              {
                dateStyle: 'medium',
                timeStyle: 'short'
              }
            )
          : '—';


      const status =
        String(
          order.status || 'pending'
        ).toLowerCase();


      return `

        <div class="order-card">

          <div class="order-head">

            <div>
              <strong>
                Order #${esc(order.id)}
              </strong>

              <div class="muted">
                ${esc(date)}
              </div>
            </div>


            <select
              class="order-status"
              data-id="${esc(order.id)}"
            >

              <option
                value="pending"
                ${status === 'pending' ? 'selected' : ''}
              >
                Pending
              </option>

              <option
                value="completed"
                ${status === 'completed' ? 'selected' : ''}
              >
                Completed
              </option>

            </select>

          </div>


          <div class="order-info">

            <p>
              <b>👤 Customer:</b>
              ${esc(order.customer_name)}
            </p>

            <p>
              <b>📞 Phone:</b>
              ${esc(order.phone)}
            </p>

            <p>
              <b>📍 Address:</b>
              ${esc(order.address)}
            </p>

            <p>
              <b>District:</b>
              ${esc(order.district)}
              &nbsp; | &nbsp;
              <b>Upazila:</b>
              ${esc(order.upazila)}
            </p>


            <hr>


            <p>
              <b>📦 Product:</b>
              ${esc(order.product_name)}
            </p>

            <p>
              <b>🎨 Variety:</b>
              ${esc(order.variety)}
              &nbsp; | &nbsp;
              <b>📏 Size:</b>
              ${esc(order.size)}
            </p>

            <p>
              <b>🔢 Quantity:</b>
              ${esc(order.quantity)}
            </p>


            <hr>


            <p>
              <b>Product Price:</b>
              ${money(order.product_price)}
            </p>

            <p>
              <b>Delivery Charge:</b>
              ${money(order.delivery_charge)}
            </p>

            <p class="order-total">
              <b>Total:</b>
              ${money(order.total_price)}
            </p>

          </div>

        </div>

      `;

    }).join('');


  /* Status change */

  ordersList
    .querySelectorAll('.order-status')
    .forEach(select => {

      select.addEventListener(
        'change',
        () =>
          updateOrderStatus(
            Number(select.dataset.id),
            select.value
          )
      );

    });
}


/* =========================
   UPDATE ORDER STATUS
========================= */

async function updateOrderStatus(
  id,
  status
) {

  const {
    error
  } = await sb
    .from('orders')
    .update({
      status
    })
    .eq('id', id);


  if (error) {

    alert(
      'Status update হয়নি: ' +
      error.message
    );

    return;
  }

}


/* =========================
   REFRESH ORDERS
========================= */

document
  .getElementById('refreshOrdersBtn')
  .onclick = () =>
    loadOrders();


/* =========================
   START
========================= */

refreshAuth();
