/* =========================================================
   MY SHOP — ADMIN PANEL
   Supabase Auth + Admin Check + Products + Orders
   ========================================================= */

const { createClient } = supabase;

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// =========================================================
// GLOBAL STATE
// =========================================================

let currentUser = null;
let adminProducts = [];
let adminOrders = [];

let currentOrderFilter = "all";

let variantCounter = 0;


// =========================================================
// DOM — LOGIN
// =========================================================

const adminLogin =
  document.getElementById("adminLogin");

const adminDashboard =
  document.getElementById("adminDashboard");

const loginForm =
  document.getElementById("loginForm");

const loginEmail =
  document.getElementById("loginEmail");

const loginPassword =
  document.getElementById("loginPassword");

const loginButton =
  document.getElementById("loginButton");

const loginMessage =
  document.getElementById("loginMessage");

const adminUserEmail =
  document.getElementById("adminUserEmail");

const logoutButton =
  document.getElementById("logoutButton");


// =========================================================
// DOM — PRODUCT FORM
// =========================================================

const productForm =
  document.getElementById("productForm");

const productNameAdmin =
  document.getElementById("productNameAdmin");

const basePriceAdmin =
  document.getElementById("basePriceAdmin");

const descriptionAdmin =
  document.getElementById("descriptionAdmin");

const mainImageAdmin =
  document.getElementById("mainImageAdmin");

const mainImagePreview =
  document.getElementById("mainImagePreview");

const mainImagePreviewImg =
  document.getElementById("mainImagePreviewImg");

const variantsContainer =
  document.getElementById("variantsContainer");

const addVariantButton =
  document.getElementById("addVariantButton");

const saveProductButton =
  document.getElementById("saveProductButton");

const resetProductButton =
  document.getElementById("resetProductButton");

const productFormAlert =
  document.getElementById("productFormAlert");


// =========================================================
// DOM — ADMIN PRODUCTS
// =========================================================

const adminProductsList =
  document.getElementById("adminProductsList");


// =========================================================
// DOM — ORDERS
// =========================================================

const adminOrdersList =
  document.getElementById("adminOrdersList");


// =========================================================
// DOM — STATS
// =========================================================

const statProducts =
  document.getElementById("statProducts");

const statStock =
  document.getElementById("statStock");

const statPendingOrders =
  document.getElementById("statPendingOrders");

const statCompletedOrders =
  document.getElementById("statCompletedOrders");


// =========================================================
// UTILITY
// =========================================================

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function money(value) {

  const number =
    Number(value || 0);

  return number.toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  ) + " ৳";
}


function showAlert(
  message,
  type = "success"
) {

  if (!productFormAlert) return;

  productFormAlert.textContent =
    message;

  productFormAlert.className =
    "admin-alert " + type;

  productFormAlert.style.display =
    "block";

}


function hideAlert() {

  if (!productFormAlert) return;

  productFormAlert.style.display =
    "none";

}


function formatDate(date) {

  if (!date) return "";

  try {

    return new Date(date)
      .toLocaleString(
        "en-BD",
        {
          dateStyle: "medium",
          timeStyle: "short"
        }
      );

  } catch {

    return date;

  }

}


// =========================================================
// AUTH — CHECK CURRENT SESSION
// =========================================================

async function checkSession() {

  const {
    data,
    error
  } = await sb.auth.getSession();

  if (error) {

    console.error(error);

    showLogin();

    return;

  }

  const session =
    data?.session;

  if (!session) {

    showLogin();

    return;

  }

  currentUser =
    session.user;

  await verifyAdmin();

}


// =========================================================
// SHOW LOGIN
// =========================================================

function showLogin() {

  if (adminLogin)
    adminLogin.style.display =
      "flex";

  if (adminDashboard)
    adminDashboard.style.display =
      "none";

}


// =========================================================
// SHOW DASHBOARD
// =========================================================

function showDashboard() {

  if (adminLogin)
    adminLogin.style.display =
      "none";

  if (adminDashboard)
    adminDashboard.style.display =
      "block";

  if (adminUserEmail) {

    adminUserEmail.textContent =
      currentUser?.email || "";

  }

}


// =========================================================
// VERIFY ADMIN
// =========================================================

async function verifyAdmin() {

  if (!currentUser) {

    showLogin();

    return;

  }

  const {
    data,
    error
  } = await sb
    .from("admin_users")
    .select("user_id")
    .eq(
      "user_id",
      currentUser.id
    )
    .maybeSingle();

  if (error) {

    console.error(
      "Admin verification error:",
      error
    );

    await sb.auth.signOut();

    showLogin();

    if (loginMessage) {

      loginMessage.textContent =
        "Admin verification করতে সমস্যা হয়েছে।";

    }

    return;

  }

  if (!data) {

    await sb.auth.signOut();

    currentUser = null;

    showLogin();

    if (loginMessage) {

      loginMessage.textContent =
        "এই account-এর Admin access নেই।";

    }

    return;

  }

  showDashboard();

  await refreshAdminData();

}


// =========================================================
// LOGIN
// =========================================================

async function handleLogin(event) {

  event.preventDefault();

  const email =
    loginEmail.value.trim();

  const password =
    loginPassword.value;

  if (!email || !password) {

    loginMessage.textContent =
      "Email এবং password দিন।";

    return;

  }

  loginButton.disabled =
    true;

  loginButton.textContent =
    "Logging in...";

  loginMessage.textContent =
    "";

  const {
    data,
    error
  } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {

    console.error(error);

    loginMessage.textContent =
      error.message ||
      "Login failed.";

    loginButton.disabled =
      false;

    loginButton.textContent =
      "Login";

    return;

  }

  currentUser =
    data.user;

  await verifyAdmin();

  loginButton.disabled =
    false;

  loginButton.textContent =
    "Login";

}


// =========================================================
// LOGOUT
// =========================================================

async function handleLogout() {

  await sb.auth.signOut();

  currentUser = null;

  showLogin();

  if (loginForm)
    loginForm.reset();

}


// =========================================================
// NAVIGATION
// =========================================================

function openAdminSection(sectionId) {

  document
    .querySelectorAll(".admin-section")
    .forEach(section => {

      section.classList.remove(
        "active"
      );

    });

  document
    .querySelectorAll(".admin-nav-btn")
    .forEach(button => {

      button.classList.remove(
        "active"
      );

    });

  const section =
    document.getElementById(sectionId);

  if (section) {

    section.classList.add("active");

  }

  const navButton =
    document.querySelector(
      `.admin-nav-btn[data-section="${sectionId}"]`
    );

  if (navButton) {

    navButton.classList.add(
      "active"
    );

  }

  if (
    sectionId ===
    "productsSectionAdmin"
  ) {

    loadAdminProducts();

  }

  if (
    sectionId ===
    "ordersSectionAdmin"
  ) {

    loadAdminOrders();

  }

}


document
  .querySelectorAll(".admin-nav-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openAdminSection(
          button.dataset.section
        );

      }
    );

  });


document
  .querySelectorAll(
    "[data-open-section]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openAdminSection(
          button.dataset.openSection
        );

      }
    );

  });


// =========================================================
// IMAGE PREVIEW
// =========================================================

if (mainImageAdmin) {

  mainImageAdmin.addEventListener(
    "change",
    () => {

      const file =
        mainImageAdmin.files?.[0];

      if (!file) {

        mainImagePreview.style.display =
          "none";

        return;

      }

      const url =
        URL.createObjectURL(file);

      mainImagePreviewImg.src =
        url;

      mainImagePreview.style.display =
        "block";

    }
  );

}


// =========================================================
// ADD VARIANT
// =========================================================

function addVariant() {

  variantCounter++;

  const variantId =
    variantCounter;

  const box =
    document.createElement("div");

  box.className =
    "variant-box";

  box.dataset.variantId =
    variantId;

  box.innerHTML = `

    <div class="variant-top">

      <div class="variant-title">
        Variant ${variantId}
      </div>

      <button
        type="button"
        class="admin-btn admin-btn-danger remove-variant-btn"
      >
        Remove Variant
      </button>

    </div>


    <div class="variant-fields">

      <div class="admin-field">

        <label>
          Variant Name *
        </label>

        <input
          type="text"
          class="variant-name"
          placeholder="যেমন: Black"
          required
        >

      </div>


      <div class="admin-field">

        <label>
          Variant Image
        </label>

        <input
          type="file"
          class="variant-image"
          accept="image/*"
        >

      </div>

    </div>


    <div class="size-list">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:10px;
        "
      >

        <strong>
          Sizes / Price / Stock
        </strong>

        <button
          type="button"
          class="admin-btn admin-btn-secondary add-size-btn"
        >
          + Add Size
        </button>

      </div>

      <div class="sizes-container"></div>

    </div>

  `;

  variantsContainer.appendChild(
    box
  );

  const addSizeBtn =
    box.querySelector(
      ".add-size-btn"
    );

  addSizeBtn.addEventListener(
    "click",
    () => {

      addSizeRow(box);

    }
  );


  const removeVariantBtn =
    box.querySelector(
      ".remove-variant-btn"
    );

  removeVariantBtn.addEventListener(
    "click",
    () => {

      box.remove();

      renumberVariants();

    }
  );


  // Automatically create first size
  addSizeRow(box);

}


// =========================================================
// RENUMBER VARIANTS
// =========================================================

function renumberVariants() {

  const boxes =
    variantsContainer.querySelectorAll(
      ".variant-box"
    );

  boxes.forEach(
    (box, index) => {

      const title =
        box.querySelector(
          ".variant-title"
        );

      if (title) {

        title.textContent =
          `Variant ${index + 1}`;

      }

    }
  );

}


// =========================================================
// ADD SIZE ROW
// =========================================================

function addSizeRow(variantBox) {

  const container =
    variantBox.querySelector(
      ".sizes-container"
    );

  const row =
    document.createElement("div");

  row.className =
    "size-row";

  row.innerHTML = `

    <input
      type="text"
      class="size-name"
      placeholder="Size (যেমন: M)"
      required
    >

    <input
      type="number"
      class="size-price"
      placeholder="Price"
      min="0"
      step="0.01"
      required
    >

    <input
      type="number"
      class="size-stock"
      placeholder="Stock"
      min="0"
      step="1"
      required
    >

    <button
      type="button"
      class="admin-btn admin-btn-danger remove-size-btn"
    >
      Remove
    </button>

  `;

  container.appendChild(
    row
  );


  row
    .querySelector(
      ".remove-size-btn"
    )
    .addEventListener(
      "click",
      () => {

        row.remove();

      }
    );

}


// =========================================================
// IMAGE UPLOAD
// =========================================================

async function uploadImage(
  file,
  folder
) {

  if (!file) return null;

  const originalName =
    file.name || "image";

  const extension =
    originalName
      .split(".")
      .pop()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const safeExtension =
    extension || "jpg";

  const randomPart =
    Math.random()
      .toString(36)
      .substring(2, 9);

  const path =
    `${folder}/${Date.now()}-${randomPart}.${safeExtension}`;


  const {
    error
  } = await sb
    .storage
    .from("product-images")
    .upload(
      path,
      file,
      {
        cacheControl: "3600",
        upsert: false
      }
    );


  if (error) {

    throw error;

  }


  const {
    data
  } = sb
    .storage
    .from("product-images")
    .getPublicUrl(path);


  return data.publicUrl;

}


// =========================================================
// COLLECT VARIANT DATA
// =========================================================

function collectVariantData() {

  const boxes =
    variantsContainer.querySelectorAll(
      ".variant-box"
    );

  const variants = [];

  boxes.forEach(box => {

    const name =
      box.querySelector(
        ".variant-name"
      )?.value.trim();

    const imageInput =
      box.querySelector(
        ".variant-image"
      );

    const sizes =
      [];

    box
      .querySelectorAll(
        ".size-row"
      )
      .forEach(row => {

        const size =
          row.querySelector(
            ".size-name"
          )?.value.trim();

        const price =
          Number(
            row.querySelector(
              ".size-price"
            )?.value
          );

        const stock =
          Number(
            row.querySelector(
              ".size-stock"
            )?.value
          );


        if (size) {

          sizes.push({

            size,
            price,
            stock,

          });

        }

      });


    variants.push({

      name,

      imageFile:
        imageInput?.files?.[0] ||
        null,

      sizes

    });

  });


  return variants;

}


// =========================================================
// VALIDATE PRODUCT FORM
// =========================================================

function validateProductForm() {

  const name =
    productNameAdmin.value.trim();

  const image =
    mainImageAdmin.files?.[0];

  if (!name) {

    return "Product name দিন।";

  }

  if (!image) {

    return "Main product image নির্বাচন করুন।";

  }


  const variants =
    collectVariantData();


  if (!variants.length) {

    return "কমপক্ষে একটি Variant যোগ করুন।";

  }


  for (
    let i = 0;
    i < variants.length;
    i++
  ) {

    const variant =
      variants[i];


    if (!variant.name) {

      return `Variant ${i + 1}-এর নাম দিন।`;

    }


    if (!variant.sizes.length) {

      return `Variant ${i + 1}-এ কমপক্ষে একটি Size যোগ করুন।`;

    }


    for (
      let j = 0;
      j < variant.sizes.length;
      j++
    ) {

      const size =
        variant.sizes[j];


      if (
        !Number.isFinite(
          size.price
        ) ||
        size.price < 0
      ) {

        return `Variant ${i + 1}-এর price ঠিক করুন।`;

      }


      if (
        !Number.isInteger(
          size.stock
        ) ||
        size.stock < 0
      ) {

        return `Variant ${i + 1}-এর stock ঠিক করুন।`;

      }

    }

  }


  return null;

}


// =========================================================
// SAVE PRODUCT
// =========================================================

async function handleSaveProduct(
  event
) {

  event.preventDefault();

  hideAlert();


  const validation =
    validateProductForm();

  if (validation) {

    showAlert(
      validation,
      "error"
    );

    return;

  }


  saveProductButton.disabled =
    true;

  saveProductButton.textContent =
    "Saving...";


  try {

    const name =
      productNameAdmin.value.trim();

    const description =
      descriptionAdmin.value.trim();

    const basePriceValue =
      basePriceAdmin.value.trim();

    const basePrice =
      basePriceValue === ""
        ? null
        : Number(basePriceValue);


    // -----------------------------------------------------
    // 1. Upload main image
    // -----------------------------------------------------

    showAlert(
      "Main image upload হচ্ছে...",
      "success"
    );


    const mainImageUrl =
      await uploadImage(
        mainImageAdmin.files[0],
        "products"
      );


    // -----------------------------------------------------
    // 2. Insert product
    // -----------------------------------------------------

    showAlert(
      "Product database-এ save হচ্ছে...",
      "success"
    );


    const {
      data: product,
      error: productError
    } = await sb
      .from("products")
      .insert({
        name,
        description:
          description || null,
        main_image_url:
          mainImageUrl,
        base_price:
          basePrice,
        active: true
      })
      .select()
      .single();


    if (productError) {

      throw productError;

    }


    // -----------------------------------------------------
    // 3. Variants
    // -----------------------------------------------------

    const variants =
      collectVariantData();


    for (
      let i = 0;
      i < variants.length;
      i++
    ) {

      const variant =
        variants[i];


      showAlert(
        `Variant ${i + 1} save হচ্ছে...`,
        "success"
      );


      let variantImageUrl =
        null;


      if (variant.imageFile) {

        variantImageUrl =
          await uploadImage(
            variant.imageFile,
            `products/${product.id}/variants`
          );

      }


      const {
        data: insertedVariant,
        error: variantError
      } = await sb
        .from("product_variants")
        .insert({

          product_id:
            product.id,

          name:
            variant.name,

          image_url:
            variantImageUrl,

          active:
            true

        })
        .select()
        .single();


      if (variantError) {

        throw variantError;

      }


      // ---------------------------------------------------
      // 4. Sizes
      // ---------------------------------------------------

      const sizeRows =
        variant.sizes.map(
          size => ({

            variant_id:
              insertedVariant.id,

            size:
              size.size,

            price:
              size.price,

            stock:
              size.stock,

            active:
              true

          })
        );


      const {
        error: sizeError
      } = await sb
        .from("variant_sizes")
        .insert(
          sizeRows
        );


      if (sizeError) {

        throw sizeError;

      }

    }


    // -----------------------------------------------------
    // SUCCESS
    // -----------------------------------------------------

    showAlert(
      "✅ Product সফলভাবে add হয়েছে!",
      "success"
    );


    productForm.reset();


    variantsContainer.innerHTML =
      "";

    variantCounter =
      0;


    mainImagePreview.style.display =
      "none";


    await refreshAdminData();


    setTimeout(
      () => {

        openAdminSection(
          "productsSectionAdmin"
        );

      },
      800
    );


  } catch (error) {

    console.error(
      "Save product error:",
      error
    );


    showAlert(
      "Product save করতে সমস্যা হয়েছে: " +
      (error.message || "Unknown error"),
      "error"
    );


  } finally {

    saveProductButton.disabled =
      false;

    saveProductButton.textContent =
      "💾 Save Product";

  }

}


// =========================================================
// RESET PRODUCT FORM
// =========================================================

function resetProductForm() {

  if (
    !confirm(
      "Form-এর সব তথ্য মুছে ফেলবেন?"
    )
  ) {

    return;

  }


  productForm.reset();

  variantsContainer.innerHTML =
    "";

  variantCounter =
    0;

  mainImagePreview.style.display =
    "none";

  hideAlert();

}


// =========================================================
// LOAD ADMIN PRODUCTS
// =========================================================

async function loadAdminProducts() {

  if (!adminProductsList)
    return;


  adminProductsList.innerHTML = `
    <div class="admin-loading">
      Loading products...
    </div>
  `;


  const {
    data,
    error
  } = await sb
    .from("products")
    .select(`
      id,
      name,
      description,
      main_image_url,
      base_price,
      active,
      created_at,
      product_variants (
        id,
        name,
        image_url,
        active,
        variant_sizes (
          id,
          size,
          price,
          stock,
          active
        )
      )
    `)
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(error);

    adminProductsList.innerHTML = `
      <div class="admin-empty">
        Product load করতে সমস্যা হয়েছে।
      </div>
    `;

    return;

  }


  adminProducts =
    data || [];


  renderAdminProducts();

  updateStats();

}


// =========================================================
// RENDER ADMIN PRODUCTS
// =========================================================

function renderAdminProducts() {

  if (!adminProducts.length) {

    adminProductsList.innerHTML = `
      <div class="admin-empty">
        এখনো কোনো product নেই।
      </div>
    `;

    return;

  }


  adminProductsList.innerHTML =
    adminProducts.map(
      product => {

        let totalStock = 0;
        let totalSizes = 0;


        (
          product.product_variants ||
          []
        ).forEach(
          variant => {

            (
              variant.variant_sizes ||
              []
            ).forEach(
              size => {

                if (
                  size.active !== false
                ) {

                  totalStock +=
                    Number(
                      size.stock || 0
                    );

                  totalSizes++;

                }

              }
            );

          }
        );


        const status =
          product.active !== false
            ? "Active"
            : "Inactive";


        return `
          <div
            class="admin-product-row"
          >

            <img
              class="admin-product-image"
              src="${
                escapeHTML(
                  product.main_image_url ||
                  "https://placehold.co/100x100?text=No+Image"
                )
              }"
              alt="${escapeHTML(product.name)}"
              onerror="
                this.src='https://placehold.co/100x100?text=No+Image'
              "
            >


            <div class="admin-product-info">

              <div class="admin-product-name">
                ${escapeHTML(product.name)}
              </div>

              <div class="admin-product-meta">

                Status:
                <strong>
                  ${status}
                </strong>

                <br>

                Total Stock:
                <strong>
                  ${totalStock}
                </strong>

                <br>

                Sizes:
                <strong>
                  ${totalSizes}
                </strong>

                <br>

                Base Price:
                <strong>
                  ${
                    product.base_price !== null &&
                    product.base_price !== undefined
                      ? money(product.base_price)
                      : "—"
                  }
                </strong>

              </div>

            </div>


            <div class="admin-product-actions">

              ${
                product.active !== false
                  ? `
                    <button
                      class="admin-btn admin-btn-danger"
                      onclick="
                        deactivateProduct(${product.id})
                      "
                    >
                      Deactivate
                    </button>
                  `
                  : `
                    <button
                      class="admin-btn admin-btn-success"
                      onclick="
                        activateProduct(${product.id})
                      "
                    >
                      Activate
                    </button>
                  `
              }

            </div>

          </div>
        `;

      }
    ).join("");

}


// =========================================================
// DEACTIVATE PRODUCT
// =========================================================

async function deactivateProduct(
  productId
) {

  if (
    !confirm(
      "এই product deactivate করবেন?"
    )
  ) {

    return;

  }


  const {
    error
  } = await sb
    .from("products")
    .update({
      active: false
    })
    .eq(
      "id",
      productId
    );


  if (error) {

    console.error(error);

    alert(
      "Product deactivate করা যায়নি: " +
      error.message
    );

    return;

  }


  await refreshAdminData();

}


// =========================================================
// ACTIVATE PRODUCT
// =========================================================

async function activateProduct(
  productId
) {

  const {
    error
  } = await sb
    .from("products")
    .update({
      active: true
    })
    .eq(
      "id",
      productId
    );


  if (error) {

    console.error(error);

    alert(
      "Product activate করা যায়নি: " +
      error.message
    );

    return;

  }


  await refreshAdminData();

}


// =========================================================
// LOAD ORDERS
// =========================================================

async function loadAdminOrders() {

  if (!adminOrdersList)
    return;


  adminOrdersList.innerHTML = `
    <div class="admin-loading">
      Loading orders...
    </div>
  `;


  const {
    data,
    error
  } = await sb
    .from("orders")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(error);

    adminOrdersList.innerHTML = `
      <div class="admin-empty">
        Orders load করতে সমস্যা হয়েছে।
        <br>
        ${escapeHTML(error.message)}
      </div>
    `;

    return;

  }


  adminOrders =
    data || [];


  renderOrders();

  updateStats();

}


// =========================================================
// RENDER ORDERS
// =========================================================

function renderOrders() {

  let orders =
    adminOrders;


  if (
    currentOrderFilter !==
    "all"
  ) {

    orders =
      orders.filter(
        order =>
          order.status ===
          currentOrderFilter
      );

  }


  if (!orders.length) {

    adminOrdersList.innerHTML = `
      <div class="admin-empty">
        এই filter-এ কোনো order নেই।
      </div>
    `;

    return;

  }


  adminOrdersList.innerHTML =
    orders.map(
      order => {

        const isPending =
          order.status ===
          "pending";


        return `
          <div
            class="order-card"
          >

            <div
              class="order-card-top"
            >

              <div>

                <div class="order-id">
                  Order #${escapeHTML(order.id)}
                </div>

                <div class="order-date">
                  ${escapeHTML(
                    formatDate(
                      order.created_at
                    )
                  )}
                </div>

              </div>


              <span
                class="
                  order-status
                  ${isPending
                    ? "pending"
                    : "completed"}
                "
              >
                ${
                  isPending
                    ? "⏳ Pending"
                    : "✅ Completed"
                }
              </span>

            </div>


            <div
              class="order-grid"
            >

              <div
                class="order-field"
              >
                <strong>
                  Customer:
                </strong>
                ${escapeHTML(
                  order.customer_name
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  Phone:
                </strong>
                ${escapeHTML(
                  order.phone
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  Product:
                </strong>
                ${escapeHTML(
                  order.product_name
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  Variant:
                </strong>
                ${escapeHTML(
                  order.variety || "—"
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  Size:
                </strong>
                ${escapeHTML(
                  order.size || "—"
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  Quantity:
                </strong>
                ${escapeHTML(
                  order.quantity
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  District:
                </strong>
                ${escapeHTML(
                  order.district || "—"
                )}
              </div>


              <div
                class="order-field"
              >
                <strong>
                  Upazila:
                </strong>
                ${escapeHTML(
                  order.upazila || "—"
                )}
              </div>


              <div
                class="order-field"
                style="grid-column:1/-1;"
              >
                <strong>
                  Address:
                </strong>
                ${escapeHTML(
                  order.address || "—"
                )}
              </div>

            </div>


            <div
              class="order-bottom"
            >

              <div
                class="order-total"
              >
                Total:
                ${money(order.total_price)}
              </div>


              ${
                isPending
                  ? `
                    <button
                      class="
                        admin-btn
                        admin-btn-success
                      "
                      onclick="
                        completeOrder(${order.id})
                      "
                    >
                      ✅ Complete Order
                    </button>
                  `
                  : `
                    <span
                      style="
                        color:#16843a;
                        font-weight:700;
                      "
                    >
                      Order completed
                    </span>
                  `
              }

            </div>

          </div>
        `;

      }
    ).join("");

}


// =========================================================
// COMPLETE ORDER
// =========================================================

async function completeOrder(
  orderId
) {

  if (
    !confirm(
      "এই order-টি completed করবেন?"
    )
  ) {

    return;

  }


  const {
    error
  } = await sb
    .from("orders")
    .update({
      status: "completed"
    })
    .eq(
      "id",
      orderId
    );


  if (error) {

    console.error(error);

    alert(
      "Order complete করা যায়নি: " +
      error.message
    );

    return;

  }


  await loadAdminOrders();

}


// =========================================================
// ORDER FILTER
// =========================================================

document
  .querySelectorAll(
    ".order-filter-btn"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".order-filter-btn"
          )
          .forEach(btn => {

            btn.classList.remove(
              "active"
            );

          });


        button.classList.add(
          "active"
        );


        currentOrderFilter =
          button.dataset.orderFilter ||
          "all";


        renderOrders();

      }
    );

  });


// =========================================================
// UPDATE STATS
// =========================================================

function updateStats() {

  if (statProducts) {

    statProducts.textContent =
      adminProducts.length;

  }


  let totalStock = 0;


  adminProducts.forEach(
    product => {

      (
        product.product_variants ||
        []
      ).forEach(
        variant => {

          (
            variant.variant_sizes ||
            []
          ).forEach(
            size => {

              if (
                size.active !== false
              ) {

                totalStock +=
                  Number(
                    size.stock || 0
                  );

              }

            }
          );

        }
      );

    }
  );


  if (statStock) {

    statStock.textContent =
      totalStock;

  }


  const pending =
    adminOrders.filter(
      order =>
        order.status ===
        "pending"
    ).length;


  const completed =
    adminOrders.filter(
      order =>
        order.status ===
        "completed"
    ).length;


  if (statPendingOrders) {

    statPendingOrders.textContent =
      pending;

  }


  if (statCompletedOrders) {

    statCompletedOrders.textContent =
      completed;

  }

}


// =========================================================
// REFRESH ALL ADMIN DATA
// =========================================================

async function refreshAdminData() {

  await Promise.all([
    loadAdminProducts(),
    loadAdminOrders()
  ]);

}


// =========================================================
// AUTH STATE LISTENER
// =========================================================

sb.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (
      event ===
      "SIGNED_OUT"
    ) {

      currentUser = null;

      showLogin();

      return;

    }


    if (
      session?.user
    ) {

      currentUser =
        session.user;

    }

  }
);


// =========================================================
// EVENT LISTENERS
// =========================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    handleLogin
  );

}


if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    handleLogout
  );

}


if (addVariantButton) {

  addVariantButton.addEventListener(
    "click",
    addVariant
  );

}


if (productForm) {

  productForm.addEventListener(
    "submit",
    handleSaveProduct
  );

}


if (resetProductButton) {

  resetProductButton.addEventListener(
    "click",
    resetProductForm
  );

}


// =========================================================
// INITIALIZE
// =========================================================

checkSession();
