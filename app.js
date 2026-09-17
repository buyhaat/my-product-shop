const { createClient } = window.supabase;

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================
// GLOBAL STATE
// ===============================

let allProducts = [];
let filteredProducts = [];

let selectedProduct = null;
let selectedVariant = null;
let selectedSize = null;


// ===============================
// DOM HELPERS
// ===============================

const $ = (id) => document.getElementById(id);


// ===============================
// INITIALIZE
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

  setupEvents();

  await loadProducts();

});


// ===============================
// EVENTS
// ===============================

function setupEvents() {

  // Search
  $("searchButton")?.addEventListener("click", performSearch);

  $("searchInput")?.addEventListener("input", performSearch);

  // Product button
  $("categoryMenuButton")?.addEventListener("click", () => {

    $("categoryMenuButton").classList.add("active");

    $("productsSection")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  });

  // Hero button
  $("shopNowButton")?.addEventListener("click", () => {

    $("productsSection")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  });

  // Close modal
  $("closeModal")?.addEventListener("click", closeOrderModal);

  // Click outside modal
  $("orderModal")?.addEventListener("click", (event) => {

    if (event.target === $("orderModal")) {
      closeOrderModal();
    }

  });

  // Quantity
  $("quantityMinus")?.addEventListener("click", () => {

    const input = $("quantity");

    let value = Number(input.value) || 1;

    if (value > 1) {
      value--;
    }

    input.value = value;

    updateOrderTotal();

  });

  $("quantityPlus")?.addEventListener("click", () => {

    const input = $("quantity");

    let value = Number(input.value) || 1;

    const maxStock = selectedSize
      ? Number(selectedSize.stock)
      : 1;

    if (value < maxStock) {
      value++;
    }

    input.value = value;

    updateOrderTotal();

  });

  $("quantity")?.addEventListener("input", () => {

    let value = Number($("quantity").value) || 1;

    const maxStock = selectedSize
      ? Number(selectedSize.stock)
      : 1;

    if (value < 1) value = 1;

    if (value > maxStock) {
      value = maxStock;
    }

    $("quantity").value = value;

    updateOrderTotal();

  });

  // Order
  $("orderForm")?.addEventListener("submit", submitOrder);

}


// ===============================
// LOAD PRODUCTS
// ===============================

async function loadProducts() {

  showLoading();

  const { data, error } = await sb
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
        created_at,
        variant_sizes (
          id,
          size,
          price,
          stock,
          active,
          created_at
        )
      )
    `)
    .eq("active", true)
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error("Product loading error:", error);

    showNoProducts(
      "পণ্য লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
    );

    return;
  }

  allProducts = (data || []).map(product => {

    const variants = (product.product_variants || [])
      .filter(v => v.active !== false)
      .map(variant => {

        return {
          ...variant,

          variant_sizes: (variant.variant_sizes || [])
            .filter(size => size.active !== false)
            .map(size => ({
              ...size,
              price: Number(size.price || 0),
              stock: Number(size.stock || 0)
            }))

        };

      });

    return {
      ...product,
      product_variants: variants
    };

  });

  filteredProducts = [...allProducts];

  renderProducts();

}


// ===============================
// LOADING UI
// ===============================

function showLoading() {

  const container = $("products");

  if (!container) return;

  container.innerHTML = `
    <div style="
      grid-column:1/-1;
      text-align:center;
      padding:60px 20px;
      color:#777;
    ">
      <div style="font-size:32px;margin-bottom:8px;">⏳</div>
      <div>পণ্য লোড হচ্ছে...</div>
    </div>
  `;

  $("noProducts").style.display = "none";

}


// ===============================
// RENDER PRODUCTS
// ===============================

function renderProducts() {

  const container = $("products");

  if (!container) return;

  if (!filteredProducts.length) {

    container.innerHTML = "";

    showNoProducts(
      "কোনো পণ্য পাওয়া যায়নি।"
    );

    return;
  }

  $("noProducts").style.display = "none";

  container.innerHTML = filteredProducts
    .map(product => createProductCard(product))
    .join("");

}


// ===============================
// PRODUCT CARD
// ===============================

function createProductCard(product) {

  const variants = product.product_variants || [];

  let totalStock = 0;

  variants.forEach(variant => {

    (variant.variant_sizes || []).forEach(size => {

      totalStock += Number(size.stock || 0);

    });

  });

  const firstAvailable = getFirstAvailableSize(product);

  let displayPrice = firstAvailable
    ? firstAvailable.price
    : Number(product.base_price || 0);

  const image = product.main_image_url || "";

  const safeName = escapeHTML(product.name || "Unnamed Product");

  const imageHTML = image
    ? `
      <img
        src="${escapeAttribute(image)}"
        class="product-image"
        alt="${escapeAttribute(product.name || "Product")}"
        loading="lazy"
        onerror="this.style.display='none'"
      >
    `
    : `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:42px;
        color:#aaa;
      ">
        📦
      </div>
    `;

  const stockText = totalStock > 0
    ? `স্টক: ${totalStock}`
    : "স্টক নেই";

  const disabled = !firstAvailable || totalStock <= 0;

  return `
    <article
      class="product-card"
      data-product-id="${product.id}"
    >

      <div class="product-image-wrap">
        ${imageHTML}
      </div>

      <div class="product-info">

        <div class="product-name">
          ${safeName}
        </div>

        <div
          class="product-price"
          id="card-price-${product.id}"
        >
          ৳${formatMoney(displayPrice)}
        </div>

        <div
          class="product-stock"
          id="card-stock-${product.id}"
        >
          ${stockText}
        </div>

        <button
          type="button"
          class="buy-now-card-btn"
          ${disabled ? "disabled" : ""}
          onclick="openProductOrder(${product.id})"
        >
          ${disabled ? "স্টক নেই" : "Buy Now"}
        </button>

      </div>

    </article>
  `;

}


// ===============================
// GET FIRST AVAILABLE SIZE
// ===============================

function getFirstAvailableSize(product) {

  for (const variant of product.product_variants || []) {

    for (const size of variant.variant_sizes || []) {

      if (Number(size.stock) > 0) {

        return {
          ...size,
          variant
        };

      }

    }

  }

  return null;

}


// ===============================
// OPEN PRODUCT ORDER
// ===============================

function openProductOrder(productId) {

  const product = allProducts.find(
    p => Number(p.id) === Number(productId)
  );

  if (!product) return;

  selectedProduct = product;

  const available = getFirstAvailableSize(product);

  if (!available) {

    alert("এই পণ্যটি বর্তমানে স্টকে নেই।");

    return;
  }

  selectedVariant = available.variant;
  selectedSize = available;

  $("productName").value = product.name || "";

  $("variantName").value =
    selectedVariant.name || "";

  $("sizeName").value =
    selectedSize.size || "";

  $("unitPrice").value =
    selectedSize.price;

  $("variantSizeId").value =
    selectedSize.id;

  $("displayProductName").textContent =
    product.name || "-";

  $("displayVariantName").textContent =
    selectedVariant.name || "-";

  $("displaySizeName").textContent =
    selectedSize.size || "-";

  $("displayUnitPrice").textContent =
    "৳" + formatMoney(selectedSize.price);

  $("quantity").value = 1;

  renderVariantOptions();

  renderSizeOptions();

  updateOrderTotal();

  $("orderMessage").style.display = "none";
  $("orderMessage").textContent = "";

  $("orderModal").classList.add("active");

  $("orderModal").setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow = "hidden";

}


// ===============================
// VARIANT OPTIONS
// ===============================

function renderVariantOptions() {

  const area = $("variantArea");

  if (!area) return;

  const variants =
    selectedProduct?.product_variants || [];

  if (variants.length <= 1) {

    area.innerHTML = "";

    return;
  }

  area.innerHTML = `
    <label class="form-label">
      ভ্যারিয়েন্ট নির্বাচন করুন
    </label>

    <div class="option-list">

      ${variants.map(variant => {

        const active =
          Number(variant.id) === Number(selectedVariant?.id);

        return `
          <button
            type="button"
            class="option-btn ${active ? "active" : ""}"
            onclick="selectVariant(${variant.id})"
          >
            ${escapeHTML(variant.name || "Option")}
          </button>
        `;

      }).join("")}

    </div>
  `;

}


// ===============================
// SELECT VARIANT
// ===============================

function selectVariant(variantId) {

  if (!selectedProduct) return;

  const variant =
    selectedProduct.product_variants.find(
      v => Number(v.id) === Number(variantId)
    );

  if (!variant) return;

  selectedVariant = variant;

  const sizes =
    variant.variant_sizes || [];

  const availableSize =
    sizes.find(size => Number(size.stock) > 0);

  if (!availableSize) {

    selectedSize = null;

    $("displayVariantName").textContent =
      variant.name || "-";

    $("displaySizeName").textContent =
      "স্টক নেই";

    $("displayUnitPrice").textContent =
      "৳0";

    $("unitPrice").value = 0;

    $("variantSizeId").value = "";

    $("sizeName").value = "";

    renderVariantOptions();

    renderSizeOptions();

    updateOrderTotal();

    return;
  }

  selectedSize = availableSize;

  $("variantName").value =
    variant.name || "";

  $("sizeName").value =
    availableSize.size || "";

  $("unitPrice").value =
    availableSize.price;

  $("variantSizeId").value =
    availableSize.id;

  $("displayVariantName").textContent =
    variant.name || "-";

  $("displaySizeName").textContent =
    availableSize.size || "-";

  $("displayUnitPrice").textContent =
    "৳" + formatMoney(availableSize.price);

  $("quantity").value = 1;

  renderVariantOptions();

  renderSizeOptions();

  updateOrderTotal();

}


// ===============================
// SIZE OPTIONS
// ===============================

function renderSizeOptions() {

  const area = $("sizeArea");

  if (!area) return;

  if (!selectedVariant) {

    area.innerHTML = "";

    return;
  }

  const sizes =
    selectedVariant.variant_sizes || [];

  if (!sizes.length) {

    area.innerHTML = `
      <div style="
        color:#c62828;
        font-size:13px;
        margin-bottom:12px;
      ">
        এই ভ্যারিয়েন্টে কোনো size available নেই।
      </div>
    `;

    return;
  }

  area.innerHTML = `
    <label class="form-label">
      সাইজ নির্বাচন করুন
    </label>

    <div class="option-list">

      ${sizes.map(size => {

        const stock = Number(size.stock || 0);

        const active =
          selectedSize &&
          Number(selectedSize.id) === Number(size.id);

        return `
          <button
            type="button"
            class="option-btn ${active ? "active" : ""}"
            ${stock <= 0 ? "disabled" : ""}
            onclick="selectSize(${size.id})"
            style="${stock <= 0 ? "opacity:.45;cursor:not-allowed;" : ""}"
          >
            ${escapeHTML(size.size || "Size")}
            ${stock <= 0 ? " (শেষ)" : ""}
          </button>
        `;

      }).join("")}

    </div>
  `;

}


// ===============================
// SELECT SIZE
// ===============================

function selectSize(sizeId) {

  if (!selectedVariant) return;

  const size =
    selectedVariant.variant_sizes.find(
      s => Number(s.id) === Number(sizeId)
    );

  if (!size || Number(size.stock) <= 0) return;

  selectedSize = size;

  $("sizeName").value =
    size.size || "";

  $("unitPrice").value =
    size.price;

  $("variantSizeId").value =
    size.id;

  $("displaySizeName").textContent =
    size.size || "-";

  $("displayUnitPrice").textContent =
    "৳" + formatMoney(size.price);

  $("quantity").value = 1;

  renderSizeOptions();

  updateOrderTotal();

}


// ===============================
// ORDER TOTAL
// ===============================

function updateOrderTotal() {

  if (!selectedSize) {

    $("orderTotal").textContent = "৳0";

    return;
  }

  const price =
    Number(selectedSize.price || 0);

  const quantity =
    Math.max(
      1,
      Number($("quantity")?.value || 1)
    );

  const total = price * quantity;

  $("orderTotal").textContent =
    "৳" + formatMoney(total);

  if ($("displayQuantity")) {
    $("displayQuantity").textContent =
      quantity;
  }

}


// ===============================
// CLOSE MODAL
// ===============================

function closeOrderModal() {

  $("orderModal").classList.remove("active");

  $("orderModal").setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";

}


// ===============================
// SUBMIT ORDER
// ===============================

async function submitOrder(event) {

  event.preventDefault();

  if (!selectedProduct || !selectedVariant || !selectedSize) {

    showOrderMessage(
      "পণ্য, ভ্যারিয়েন্ট এবং size নির্বাচন করুন।",
      false
    );

    return;
  }

  const quantity =
    Number($("quantity").value || 0);

  const stock =
    Number(selectedSize.stock || 0);

  if (quantity < 1) {

    showOrderMessage(
      "কমপক্ষে ১টি পণ্য নির্বাচন করুন।",
      false
    );

    return;
  }

  if (quantity > stock) {

    showOrderMessage(
      `পর্যাপ্ত stock নেই। বর্তমানে ${stock} টি আছে।`,
      false
    );

    return;
  }

  const customerName =
    $("customerName").value.trim();

  const phone =
    $("phone").value.trim();

  const district =
    $("district").value.trim();

  const upazila =
    $("upazila").value.trim();

  const address =
    $("address").value.trim();

  if (
    !customerName ||
    !phone ||
    !district ||
    !upazila ||
    !address
  ) {

    showOrderMessage(
      "সব তথ্য পূরণ করুন।",
      false
    );

    return;
  }

  const submitButton =
    document.querySelector(".place-order-btn");

  const originalText =
    submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent =
    "অর্ডার করা হচ্ছে...";

  try {

    const { data, error } =
      await sb.rpc("place_order", {

        p_customer_name: customerName,

        p_phone: phone,

        p_address: address,

        p_district: district,

        p_upazila: upazila,

        p_product_name:
          selectedProduct.name,

        p_variant_name:
          selectedVariant.name || "",

        p_size_name:
          selectedSize.size || "",

        p_variant_size_id:
          Number(selectedSize.id),

        p_quantity:
          quantity,

        p_product_price:
          Number(selectedSize.price)

      });

    if (error) {

      console.error(
        "Order RPC error:",
        error
      );

      showOrderMessage(
        "অর্ডার করা যায়নি: " +
        error.message,
        false
      );

      return;
    }

    const result =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!result?.success) {

      showOrderMessage(
        result?.message ||
        "অর্ডার করা যায়নি।",
        false
      );

      return;
    }

    // Successful order
    showOrderMessage(
      `অর্ডার সফল হয়েছে! আপনার Order ID: #${result.order_id}`,
      true
    );

    // Refresh products after stock reduction
    await loadProducts();

    setTimeout(() => {

      closeOrderModal();

      resetOrderForm();

    }, 1800);

  } catch (error) {

    console.error(error);

    showOrderMessage(
      "অর্ডার করার সময় একটি সমস্যা হয়েছে।",
      false
    );

  } finally {

    submitButton.disabled = false;

    submitButton.textContent =
      originalText;

  }

}


// ===============================
// ORDER MESSAGE
// ===============================

function showOrderMessage(message, success) {

  const box =
    $("orderMessage");

  box.style.display = "block";

  box.textContent = message;

  box.style.background =
    success ? "#e8f5e9" : "#ffebee";

  box.style.color =
    success ? "#2e7d32" : "#c62828";

}


// ===============================
// RESET ORDER FORM
// ===============================

function resetOrderForm() {

  $("orderForm")?.reset();

  $("quantity").value = 1;

  selectedProduct = null;
  selectedVariant = null;
  selectedSize = null;

  $("variantArea").innerHTML = "";
  $("sizeArea").innerHTML = "";

  $("displayProductName").textContent = "-";
  $("displayVariantName").textContent = "-";
  $("displaySizeName").textContent = "-";
  $("displayUnitPrice").textContent = "৳0";
  $("orderTotal").textContent = "৳0";

}


// ===============================
// SEARCH
// ===============================

function performSearch() {

  const query =
    $("searchInput").value
      .trim()
      .toLowerCase();

  if (!query) {

    filteredProducts =
      [...allProducts];

    $("searchResultInfo").textContent = "";

    renderProducts();

    return;
  }

  filteredProducts =
    allProducts.filter(product => {

      const name =
        (product.name || "").toLowerCase();

      const description =
        (product.description || "").toLowerCase();

      return (
        name.includes(query) ||
        description.includes(query)
      );

    });

  $("searchResultInfo").textContent =
    `${filteredProducts.length} টি পণ্য পাওয়া গেছে`;

  renderProducts();

}


// ===============================
// NO PRODUCTS
// ===============================

function showNoProducts(message) {

  const box =
    $("noProducts");

  if (!box) return;

  box.style.display = "block";

  const text =
    box.querySelector("p");

  if (text) {
    text.textContent = message;
  }

}


// ===============================
// FORMAT MONEY
// ===============================

function formatMoney(value) {

  const number =
    Number(value || 0);

  return number.toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 2
    }
  );

}


// ===============================
// HTML SECURITY
// ===============================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

  return String(value ?? "")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ===============================
// GLOBAL FUNCTIONS
// ===============================

window.openProductOrder =
  openProductOrder;

window.selectVariant =
  selectVariant;

window.selectSize =
  selectSize;

window.closeOrderModal =
  closeOrderModal;
