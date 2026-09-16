const { createClient } = window.supabase;

const sb = createClient(
  SHOP_CONFIG.SUPABASE_URL,
  SHOP_CONFIG.SUPABASE_PUBLISHABLE_KEY
);


/* =========================
   ELEMENTS
========================= */

const loginPanel =
  document.getElementById('loginPanel');

const dashboard =
  document.getElementById('dashboard');

const logoutBtn =
  document.getElementById('logoutBtn');

const productList =
  document.getElementById('productList');

const editor =
  document.getElementById('editor');

const variantsEl =
  document.getElementById('variants');

const ordersList =
  document.getElementById('ordersList');

const productsPage =
  document.getElementById('productsPage');

const ordersPage =
  document.getElementById('ordersPage');

const productsTab =
  document.getElementById('productsTab');

const ordersTab =
  document.getElementById('ordersTab');

const orderBadge =
  document.getElementById('orderBadge');


/* =========================
   HELPERS
========================= */

function money(v) {
  return `৳${Number(v || 0).toLocaleString('en-BD')}`;
}


function esc(s) {
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


/* =========================
   PAGE TABS
========================= */

function showProductsPage() {

  productsPage.classList.remove('hidden');

  ordersPage.classList.add('hidden');

  productsTab.classList.add('active');

  ordersTab.classList.remove('active');

}


function showOrdersPage() {

  productsPage.classList.add('hidden');

  ordersPage.classList.remove('hidden');

  productsTab.classList.remove('active');

  ordersTab.classList.add('active');

  loadOrders();

}


productsTab.onclick =
  showProductsPage;


ordersTab.onclick =
  showOrdersPage;


/* =========================
   AUTH
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


  if (
    session &&
    await isAdmin()
  ) {

    loginPanel.classList.add('hidden');

    dashboard.classList.remove('hidden');

    logoutBtn.classList.remove('hidden');


    await loadProducts();

    await loadOrders();

    showProductsPage();

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
  .addEventListener(
    'submit',
    async e => {

      e.preventDefault();


      const msg =
        document.getElementById(
          'loginMessage'
        );


      const email =
        document
          .getElementById('email')
          .value
          .trim();


      const password =
        document
          .getElementById('password')
          .value;


      msg.textContent =
        'Login হচ্ছে...';


      const { error } =
        await sb.auth.signInWithPassword({
          email,
          password
        });


      if (error) {

        msg.textContent =
          error.message;

        return;
      }


      if (!await isAdmin()) {

        await sb.auth.signOut();

        msg.textContent =
          'এই account admin নয়।';

        return;
      }


      msg.textContent = '';

      await refreshAuth();

    }
  );


/* =========================
   LOGOUT
========================= */

logoutBtn.onclick =
  async () => {

    await sb.auth.signOut();

    await refreshAuth();

  };


/* =========================
   PRODUCTS
========================= */

async function loadProducts() {

  productList.innerHTML = `
    <div class="loading">
      Product লোড হচ্ছে...
    </div>
  `;


  const {
    data: products,
    error
  } = await sb
    .from('products')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    productList.innerHTML = `
      <p class="message">
        ${esc(error.message)}
      </p>
    `;

    return;
  }


  if (!products.length) {

    productList.innerHTML = `
      <div class="empty-state">
        <div>🛍️</div>
        <h3>কোনো Product নেই</h3>
        <p>উপরে থেকে নতুন Product যোগ করুন।</p>
      </div>
    `;

    return;
  }


  productList.innerHTML =
    products
      .map(p => `

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

            <strong>
              ${esc(p.name)}
            </strong>

            <div class="muted">
              ${p.active
                ? '● Active'
                : '○ Hidden'}
            </div>

          </div>


          <button
            class="secondary edit"
            data-id="${p.id}">

            Edit

          </button>


          <button
            class="danger delete"
            data-id="${p.id}">

            Delete

          </button>

        </div>

      `)
      .join('');


  productList
    .querySelectorAll('.edit')
    .forEach(button => {

      button.onclick =
        () =>
          editProduct(
            Number(button.dataset.id)
          );

    });


  productList
    .querySelectorAll('.delete')
    .forEach(button => {

      button.onclick =
        () =>
          deleteProduct(
            Number(button.dataset.id)
          );

    });

}


/* =========================
   NEW PRODUCT
========================= */

document
  .getElementById('newProductBtn')
  .onclick = () => {

    openEditor();

  };


/* =========================
   CANCEL EDIT
========================= */

document
  .getElementById('cancelEdit')
  .onclick = () => {

    editor.classList.add('hidden');

  };


/* =========================
   ADD VARIANT
========================= */

document
  .getElementById('addVariantBtn')
  .onclick = () =>
    addVariant();


/* =========================
   VARIANT
========================= */

function addVariant(data = {}) {

  const tpl =
    document
      .getElementById('variantTemplate')
      .content
      .cloneNode(true);


  const box =
    tpl.querySelector(
      '.variant-box'
    );


  box.querySelector(
    '.v-name'
  ).value =
    data.name || '';


  box.querySelector(
    '.remove-variant'
  ).onclick =
    () => box.remove();


  box.querySelector(
    '.add-size'
  ).onclick =
    () =>
      addSize(box);


  if (data.image_url) {

    box.dataset.existingImage =
      data.image_url;

  }


  variantsEl.appendChild(box);


  (data.sizes || [])
    .forEach(size =>
      addSize(
        box,
        size
      )
    );

}


/* =========================
   ADD SIZE
========================= */

function addSize(
  box,
  data = {}
) {

  const tpl =
    document
      .getElementById('sizeTemplate')
      .content
      .cloneNode(true);


  const row =
    tpl.querySelector(
      '.size-row'
    );


  row.querySelector(
    '.s-name'
  ).value =
    data.size || '';


  row.querySelector(
    '.s-price'
  ).value =
    data.price ?? '';


  row.querySelector(
    '.s-stock'
  ).value =
    data.stock ?? 0;


  row.querySelector(
    '.remove-size'
  ).onclick =
    () => row.remove();


  if (data.id) {

    row.dataset.id =
      data.id;

  }


  box
    .querySelector('.sizes')
    .appendChild(row);

}


/* =========================
   OPEN EDITOR
========================= */

function openEditor(
  product = null,
  loadedVariants = []
) {

  editor.classList.remove(
    'hidden'
  );


  document
    .getElementById(
      'editorTitle'
    )
    .textContent =
      product
        ? 'Edit Product'
        : 'নতুন Product';


  document
    .getElementById(
      'editProductId'
    )
    .value =
      product?.id || '';


  document
    .getElementById(
      'pName'
    )
    .value =
      product?.name || '';


  document
    .getElementById(
      'pDescription'
    )
    .value =
      product?.description || '';


  document
    .getElementById(
      'mainPreview'
    )
    .innerHTML =
      product?.main_image_url
        ? `
          <img
            src="${esc(
              product.main_image_url
            )}"
            alt="">
        `
        : '';


  variantsEl.innerHTML = '';


  loadedVariants.forEach(
    v =>
      addVariant(v)
  );


  if (!loadedVariants.length) {

    addVariant();

  }


  editor.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

}


/* =========================
   EDIT PRODUCT
========================= */

async function editProduct(id) {

  const {
    data: product,
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
    data: variants
  } = await sb
    .from('product_variants')
    .select('*')
    .eq(
      'product_id',
      id
    )
    .order('created_at');


  const variantIds =
    (variants || [])
      .map(v => v.id);


  let sizes = [];


  if (variantIds.length) {

    const result =
      await sb
        .from('variant_sizes')
        .select('*')
        .in(
          'variant_id',
          variantIds
        )
        .order('created_at');


    sizes =
      result.data || [];

  }


  openEditor(
    product,

    (variants || [])
      .map(v => ({
        ...v,

        sizes:
          sizes.filter(
            s =>
              s.variant_id === v.id
          )
      }))
  );

}


/* =========================
   IMAGE UPLOAD
========================= */

async function uploadImage(
  file,
  prefix
) {

  if (!file) return null;


  const ext =
    (
      file.name
        .split('.')
        .pop() ||
      'jpg'
    ).toLowerCase();


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


  if (error) {

    throw error;

  }


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
  .addEventListener(
    'submit',
    async e => {

      e.preventDefault();


      const msg =
        document
          .getElementById(
            'saveMessage'
          );


      msg.textContent =
        'Saving...';


      try {

        const id =
          Number(
            document
              .getElementById(
                'editProductId'
              )
              .value
          ) || null;


        let mainUrl = null;


        const mainFile =
          document
            .getElementById(
              'mainImage'
            )
            .files[0];


        if (mainFile) {

          mainUrl =
            await uploadImage(
              mainFile,
              'main'
            );

        }


        let product;


        /* CREATE / UPDATE */

        if (id) {

          const patch = {

            name:
              document
                .getElementById(
                  'pName'
                )
                .value
                .trim(),

            description:
              document
                .getElementById(
                  'pDescription'
                )
                .value
                .trim()

          };


          if (mainUrl) {

            patch.main_image_url =
              mainUrl;

          }


          const result =
            await sb
              .from('products')
              .update(patch)
              .eq('id', id)
              .select()
              .single();


          if (result.error) {

            throw result.error;

          }


          product =
            result.data;

        } else {

          const result =
            await sb
              .from('products')
              .insert({

                name:
                  document
                    .getElementById(
                      'pName'
                    )
                    .value
                    .trim(),

                description:
                  document
                    .getElementById(
                      'pDescription'
                    )
                    .value
                    .trim(),

                main_image_url:
                  mainUrl

              })
              .select()
              .single();


          if (result.error) {

            throw result.error;

          }


          product =
            result.data;

        }


        /* =====================
           REPLACE OLD VARIANTS
        ===================== */

        if (id) {

          const {
            data: oldVariants
          } = await sb
            .from(
              'product_variants'
            )
            .select('id')
            .eq(
              'product_id',
              id
            );


          const oldIds =
            (oldVariants || [])
              .map(v => v.id);


          if (oldIds.length) {

            await sb
              .from(
                'variant_sizes'
              )
              .delete()
              .in(
                'variant_id',
                oldIds
              );

          }


          await sb
            .from(
              'product_variants'
            )
            .delete()
            .eq(
              'product_id',
              id
            );

        }


        /* =====================
           CREATE VARIANTS
        ===================== */

        for (
          const box of
          variantsEl.querySelectorAll(
            '.variant-box'
          )
        ) {

          const vFile =
            box
              .querySelector(
                '.v-image'
              )
              .files[0];


          const vUrl =
            vFile
              ? await uploadImage(
                  vFile,
                  `variant-${product.id}`
                )
              : null;


          const variantResult =
            await sb
              .from(
                'product_variants'
              )
              .insert({

                product_id:
                  product.id,

                name:
                  box
                    .querySelector(
                      '.v-name'
                    )
                    .value
                    .trim(),

                image_url:
                  vUrl ||
                  box.dataset
                    .existingImage ||
                  product.main_image_url

              })
              .select()
              .single();


          if (
            variantResult.error
          ) {

            throw variantResult.error;

          }


          const rows = [
            ...box.querySelectorAll(
              '.size-row'
            )
          ];


          if (rows.length) {

            const payload =
              rows.map(row => ({

                variant_id:
                  variantResult
                    .data
                    .id,

                size:
                  row
                    .querySelector(
                      '.s-name'
                    )
                    .value
                    .trim(),

                price:
                  Number(
                    row
                      .querySelector(
                        '.s-price'
                      )
                      .value
                  ),

                stock:
                  Number(
                    row
                      .querySelector(
                        '.s-stock'
                      )
                      .value
                  ),

                active:
                  true

              }));


            const sizeResult =
              await sb
                .from(
                  'variant_sizes'
                )
                .insert(
                  payload
                );


            if (
              sizeResult.error
            ) {

              throw sizeResult.error;

            }

          }

        }


        msg.textContent =
          '✓ Product saved successfully.';


        await loadProducts();


        setTimeout(
          () => {
            editor.classList.add(
              'hidden'
            );
          },
          700
        );


      } catch (err) {

        msg.textContent =
          'Error: ' +
          err.message;

      }

    }
  );


/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(id) {

  if (
    !confirm(
      'এই product এবং এর varieties/sizes delete করবেন?'
    )
  ) {

    return;

  }


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


  await loadProducts();

}


/* =========================
   ORDERS
========================= */

async function loadOrders() {

  if (!ordersList) return;


  ordersList.innerHTML = `
    <div class="panel loading">
      অর্ডার লোড হচ্ছে...
    </div>
  `;


  const {
    data: orders,
    error
  } = await sb
    .from('orders')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    ordersList.innerHTML = `
      <div class="panel">
        <p class="message">
          Orders load error:
          ${esc(error.message)}
        </p>
      </div>
    `;

    return;
  }


  /* ORDER BADGE */

  const pendingCount =
    (orders || [])
      .filter(
        o =>
          String(
            o.status || 'pending'
          ).toLowerCase() ===
          'pending'
      )
      .length;


  if (pendingCount > 0) {

    orderBadge.textContent =
      pendingCount;

    orderBadge.classList.remove(
      'hidden'
    );

  } else {

    orderBadge.classList.add(
      'hidden'
    );

  }


  if (
    !orders ||
    orders.length === 0
  ) {

    ordersList.innerHTML = `
      <div class="panel empty-state">

        <div>📦</div>

        <h3>
          এখনো কোনো Order নেই
        </h3>

        <p>
          Customer order করলে এখানে দেখা যাবে।
        </p>

      </div>
    `;

    return;

  }


  ordersList.innerHTML =
    orders
      .map(order => {

        const date =
          order.created_at
            ? new Date(
                order.created_at
              ).toLocaleString(
                'bn-BD',
                {
                  dateStyle:
                    'medium',
                  timeStyle:
                    'short'
                }
              )
            : '—';


        const status =
          String(
            order.status ||
            'pending'
          ).toLowerCase();


        return `

          <div class="order-card">

            <div class="order-head">

              <div>

                <div class="order-number">
                  Order #${esc(
                    order.id
                  )}
                </div>

                <div class="muted">
                  ${esc(date)}
                </div>

              </div>


              <select
                class="order-status
                  ${status}"
                data-id="${esc(
                  order.id
                )}">

                <option
                  value="pending"
                  ${
                    status ===
                    'pending'
                      ? 'selected'
                      : ''
                  }>

                  Pending

                </option>


                <option
                  value="completed"
                  ${
                    status ===
                    'completed'
                      ? 'selected'
                      : ''
                  }>

                  Completed

                </option>

              </select>

            </div>


            <div class="order-info">

              <div class="info-item">
                <span>Customer</span>
                <b>
                  ${esc(
                    order.customer_name
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>Phone</span>
                <b>
                  ${esc(
                    order.phone
                  )}
                </b>
              </div>


              <div class="info-item full">
                <span>Address</span>
                <b>
                  ${esc(
                    order.address
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>District</span>
                <b>
                  ${esc(
                    order.district
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>Upazila</span>
                <b>
                  ${esc(
                    order.upazila
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>Product</span>
                <b>
                  ${esc(
                    order.product_name
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>Variety</span>
                <b>
                  ${esc(
                    order.variety
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>Size</span>
                <b>
                  ${esc(
                    order.size
                  )}
                </b>
              </div>


              <div class="info-item">
                <span>Quantity</span>
                <b>
                  ${esc(
                    order.quantity
                  )}
                </b>
              </div>

            </div>


            <div class="order-bottom">

              <div>
                Product:
                <b>
                  ${money(
                    order.product_price
                  )}
                </b>
              </div>

              <div>
                Delivery:
                <b>
                  ${money(
                    order.delivery_charge
                  )}
                </b>
              </div>

              <div class="grand-total">
                Total:
                ${money(
                  order.total_price
                )}
              </div>

            </div>

          </div>

        `;

      })
      .join('');


  /* STATUS CHANGE */

  ordersList
    .querySelectorAll(
      '.order-status'
    )
    .forEach(select => {

      select.addEventListener(
        'change',
        async () => {

          await updateOrderStatus(
            Number(
              select.dataset.id
            ),
            select.value
          );

        }
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
    .eq(
      'id',
      id
    );


  if (error) {

    alert(
      'Status update হয়নি: ' +
      error.message
    );

    return;

  }


  await loadOrders();

}


/* =========================
   REFRESH ORDERS
========================= */

const refreshOrdersBtn =
  document.getElementById(
    'refreshOrdersBtn'
  );


if (refreshOrdersBtn) {

  refreshOrdersBtn.onclick =
    () => loadOrders();

}


/* =========================
   START
========================= */

refreshAuth();
