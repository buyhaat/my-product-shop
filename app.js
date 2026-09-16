const { createClient } = supabase;

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let productsData = [];

/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  const productsContainer = document.getElementById("products");

  productsContainer.innerHTML = `
    <div class="loading">পণ্য লোড হচ্ছে...</div>
  `;

  const { data, error } = await sb
    .from("products")
    .select(`
      id,
      name,
      description,
      main_image_url,
      base_price,
      active,
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
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    productsContainer.innerHTML = `
      <div class="empty-products">
        পণ্য লোড করা যায়নি।
      </div>
    `;

    return;
  }

  productsData = data || [];

  renderProducts(productsData);
}

/* =========================
   RENDER PRODUCTS
========================= */

function renderProducts(products) {
  const container = document.getElementById("products");

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-products">
        এখন কোনো পণ্য পাওয়া যায়নি।
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(product => {

    const variants = (product.product_variants || [])
      .filter(v => v.active);

    let variantHTML = "";

    variants.forEach(variant => {

      const sizes = (variant.variant_sizes || [])
        .filter(s => s.active);

      if (!sizes.length) return;

      const sizeHTML = sizes.map(size => {

        const stock = Number(size.stock || 0);
        const price = Number(size.price || product.base_price || 0);

        if (stock <= 0) {
          return `
            <button
              class="size-option out-of-stock"
              disabled
              type="button"
            >
              ${escapeHTML(size.size)}
              <span class="stock-text">Stock শেষ</span>
            </button>
          `;
        }

        return `
          <button
            class="size-option"
            type="button"
            onclick="openOrderModal(
              ${product.id},
              ${variant.id},
              ${size.id}
            )"
          >
            ${escapeHTML(size.size)}
            <span class="stock-text">
              ৳${price} · ${stock} টি
            </span>
          </button>
        `;
      }).join("");

      variantHTML += `
        <div class="variant-item">
          <div class="variant-name">
            ${escapeHTML(variant.name)}
          </div>

          <div class="size-list">
            ${sizeHTML}
          </div>
        </div>
      `;
    });

    const firstImage =
      product.main_image_url ||
      (
        variants.length
          ? variants.find(v => v.image_url)?.image_url
          : ""
      ) ||
      "https://via.placeholder.com/600x400?text=No+Image";

    return `
      <article class="product-card">

        <img
          class="product-image"
          src="${escapeAttribute(firstImage)}"
          alt="${escapeAttribute(product.name)}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/600x400?text=No+Image'"
        >

        <div class="product-content">

          <h3>
            ${escapeHTML(product.name)}
          </h3>

          ${
            product.description
              ? `
                <p class="product-description">
                  ${escapeHTML(product.description)}
                </p>
              `
              : ""
          }

          <div class="variant-list">
            ${variantHTML}
          </div>

        </div>

      </article>
    `;
  }).join("");
}

/* =========================
   OPEN ORDER MODAL
========================= */

function openOrderModal(productId, variantId, sizeId) {

  const product = productsData.find(
    p => Number(p.id) === Number(productId)
  );

  if (!product) return;

  const variant = (product.product_variants || []).find(
    v => Number(v.id) === Number(variantId)
  );

  if (!variant) return;

  const size = (variant.variant_sizes || []).find(
    s => Number(s.id) === Number(sizeId)
  );

  if (!size) return;

  if (Number(size.stock) <= 0) {
    alert("এই size-এর stock শেষ।");
    return;
  }

  document.getElementById("selectedProduct").textContent =
    `${product.name} — ${variant.name} — ${size.size}`;

  document.getElementById("productName").value =
    product.name;

  document.getElementById("variantName").value =
    variant.name;

  document.getElementById("sizeName").value =
    size.size;

  document.getElementById("unitPrice").value =
    Number(size.price || product.base_price || 0);

  document.getElementById("variantSizeId").value =
    size.id;

  document.getElementById("quantity").value = 1;

  document.getElementById("quantity").max =
    Number(size.stock);

  updateOrderTotal();

  const message =
    document.getElementById("orderMessage");

  message.className = "order-message";
  message.textContent = "";

  document.getElementById("orderModal")
    .classList.add("active");
}

/* =========================
   CLOSE MODAL
========================= */

function closeOrderModal() {
  document.getElementById("orderModal")
    .classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {

  loadProducts();

  const closeButton =
    document.getElementById("closeModal");

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeOrderModal
    );
  }

  const modal =
    document.getElementById("orderModal");

  if (modal) {
    modal.addEventListener("click", event => {

      if (event.target === modal) {
        closeOrderModal();
      }

    });
  }

  const quantity =
    document.getElementById("quantity");

  if (quantity) {
    quantity.addEventListener(
      "input",
      updateOrderTotal
    );
  }

  const form =
    document.getElementById("orderForm");

  if (form) {
    form.addEventListener(
      "submit",
      submitOrder
    );
  }
});

/* =========================
   UPDATE TOTAL
========================= */

function updateOrderTotal() {

  const quantity =
    Number(document.getElementById("quantity").value) || 1;

  const unitPrice =
    Number(document.getElementById("unitPrice").value) || 0;

  const total =
    quantity * unitPrice;

  const totalElement =
    document.getElementById("orderTotal");

  if (totalElement) {
    totalElement.textContent =
      `৳${total}`;
  }
}

/* =========================
   SUBMIT ORDER
========================= */

async function submitOrder(event) {

  event.preventDefault();

  const submitButton =
    event.target.querySelector(
      ".submit-order"
    );

  const message =
    document.getElementById("orderMessage");

  const customerName =
    document.getElementById("customerName").value.trim();

  const phone =
    document.getElementById("phone").value.trim();

  const address =
    document.getElementById("address").value.trim();

  const district =
    document.getElementById("district").value.trim();

  const upazila =
    document.getElementById("upazila").value.trim();

  const productName =
    document.getElementById("productName").value;

  const variantName =
    document.getElementById("variantName").value;

  const sizeName =
    document.getElementById("sizeName").value;

  const variantSizeId =
    Number(
      document.getElementById("variantSizeId").value
    );

  const quantity =
    Number(
      document.getElementById("quantity").value
    );

  const unitPrice =
    Number(
      document.getElementById("unitPrice").value
    );

  if (
    !customerName ||
    !phone ||
    !address ||
    !district ||
    !upazila ||
    !variantSizeId ||
    !quantity ||
    !unitPrice
  ) {

    showOrderMessage(
      "সব তথ্য সঠিকভাবে পূরণ করুন।",
      "error"
    );

    return;
  }

  if (quantity < 1) {

    showOrderMessage(
      "Quantity কমপক্ষে 1 হতে হবে।",
      "error"
    );

    return;
  }

  submitButton.disabled = true;
  submitButton.textContent =
    "অর্ডার করা হচ্ছে...";

  showOrderMessage("", "");

  const { data, error } = await sb.rpc(
    "place_order",
    {
      p_customer_name: customerName,
      p_phone: phone,
      p_address: address,
      p_district: district,
      p_upazila: upazila,
      p_product_name: productName,
      p_variant_name: variantName,
      p_size_name: sizeName,
      p_variant_size_id: variantSizeId,
      p_quantity: quantity,
      p_product_price: unitPrice
    }
  );

  if (error) {

    console.error(error);

    showOrderMessage(
      "অর্ডার করা যায়নি। আবার চেষ্টা করুন।",
      "error"
    );

    submitButton.disabled = false;
    submitButton.textContent =
      "অর্ডার করুন";

    return;
  }

  if (!data || data.success !== true) {

    showOrderMessage(
      data?.message ||
      "অর্ডার করা যায়নি।",
      "error"
    );

    submitButton.disabled = false;
    submitButton.textContent =
      "অর্ডার করুন";

    return;
  }

  showOrderMessage(
    `অর্ডার সফল হয়েছে! আপনার Order ID: #${data.order_id}`,
    "success"
  );

  event.target.reset();

  document.getElementById("quantity").value = 1;

  setTimeout(() => {

    closeOrderModal();

    loadProducts();

  }, 1500);

  submitButton.disabled = false;
  submitButton.textContent =
    "অর্ডার করুন";
}

/* =========================
   MESSAGE
========================= */

function showOrderMessage(text, type) {

  const message =
    document.getElementById("orderMessage");

  if (!message) return;

  message.textContent = text;

  message.className =
    "order-message" +
    (type ? ` ${type}` : "");
}

/* =========================
   SECURITY / HTML HELPERS
========================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
