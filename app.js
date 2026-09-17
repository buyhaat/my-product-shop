/* =========================================================
   MY SHOP — Daraz-style Marketplace App
   Supabase + Products + Variants + Sizes + Cart + Orders
   ========================================================= */

const { createClient } = supabase;

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------------------------------------------------------
// Global State
// ---------------------------------------------------------

let productsData = [];
let cart = JSON.parse(localStorage.getItem("myshop_cart") || "[]");

let selectedProduct = null;
let selectedVariant = null;
let selectedSize = null;

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------

const productsEl = document.getElementById("products");
const flashSaleProductsEl = document.getElementById("flashSaleProducts");
const categoryCardsEl = document.getElementById("categoryCards");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const searchResultInfo = document.getElementById("searchResultInfo");
const noProducts = document.getElementById("noProducts");

const cartButton = document.getElementById("cartButton");
const cartCount = document.getElementById("cartCount");
const mobileCartButton = document.getElementById("mobileCartButton");
const mobileCartCount = document.getElementById("mobileCartCount");

const cartSidebar = document.getElementById("cartSidebar");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");

const orderModal = document.getElementById("orderModal");
const closeModal = document.getElementById("closeModal");
const orderForm = document.getElementById("orderForm");

const productNameInput = document.getElementById("productName");
const variantNameInput = document.getElementById("variantName");
const sizeNameInput = document.getElementById("sizeName");
const unitPriceInput = document.getElementById("unitPrice");
const variantSizeIdInput = document.getElementById("variantSizeId");

const customerNameInput = document.getElementById("customerName");
const phoneInput = document.getElementById("phone");
const districtInput = document.getElementById("district");
const upazilaInput = document.getElementById("upazila");
const addressInput = document.getElementById("address");
const quantityInput = document.getElementById("quantity");

const displayUnitPrice = document.getElementById("displayUnitPrice");
const displayQuantity = document.getElementById("displayQuantity");
const orderTotal = document.getElementById("orderTotal");
const orderMessage = document.getElementById("orderMessage");

const categoryList = document.getElementById("categoryList");
const heroCategoryList = document.getElementById("heroCategoryList");


// ---------------------------------------------------------
// Utility
// ---------------------------------------------------------

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function money(value) {
  const number = Number(value || 0);

  return number.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) + " ৳";
}


function saveCart() {
  localStorage.setItem("myshop_cart", JSON.stringify(cart));
}


function getProductImage(product) {
  return product.main_image_url ||
    "https://placehold.co/500x500?text=No+Image";
}


// ---------------------------------------------------------
// Load Products
// ---------------------------------------------------------

async function loadProducts() {
  productsEl.innerHTML = `
    <div class="loading-message">
      Product loading...
    </div>
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
      created_at,
      product_variants (
        id,
        product_id,
        name,
        image_url,
        active,
        created_at,
        variant_sizes (
          id,
          variant_id,
          size,
          price,
          stock,
          active,
          created_at
        )
      )
    `)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    productsEl.innerHTML = `
      <div class="error-message">
        Product load করতে সমস্যা হয়েছে।
        <br>
        আবার refresh করে চেষ্টা করুন।
      </div>
    `;

    return;
  }

  productsData = data || [];

  prepareProducts();

  renderProducts(productsData);
  renderFlashSale(productsData);
  renderCategories(productsData);
  updateCartUI();
}


// ---------------------------------------------------------
// Prepare Product Data
// ---------------------------------------------------------

function prepareProducts() {
  productsData.forEach(product => {

    product.product_variants =
      (product.product_variants || []).filter(v => v.active !== false);

    product.product_variants.forEach(variant => {
      variant.variant_sizes =
        (variant.variant_sizes || []).filter(s => s.active !== false);
    });

  });
}


// ---------------------------------------------------------
// Get all available sizes
// ---------------------------------------------------------

function getAllSizes(product) {

  const sizes = [];

  (product.product_variants || []).forEach(variant => {

    (variant.variant_sizes || []).forEach(size => {

      sizes.push({
        ...size,
        variantId: variant.id,
        variantName: variant.name,
        variantImage: variant.image_url
      });

    });

  });

  return sizes;
}


// ---------------------------------------------------------
// Product Price
// ---------------------------------------------------------

function getLowestPrice(product) {

  const sizes = getAllSizes(product)
    .filter(s => Number(s.stock) > 0);

  if (sizes.length) {

    return Math.min(
      ...sizes.map(s => Number(s.price || 0))
    );

  }

  if (product.base_price !== null &&
      product.base_price !== undefined) {

    return Number(product.base_price);

  }

  return 0;
}


// ---------------------------------------------------------
// Product Stock
// ---------------------------------------------------------

function getTotalStock(product) {

  const sizes = getAllSizes(product);

  return sizes.reduce(
    (total, item) => total + Number(item.stock || 0),
    0
  );
}


// ---------------------------------------------------------
// Render Products
// ---------------------------------------------------------

function renderProducts(products) {

  if (!products || products.length === 0) {

    productsEl.innerHTML = "";

    if (noProducts) {
      noProducts.style.display = "block";
    }

    return;
  }

  if (noProducts) {
    noProducts.style.display = "none";
  }

  productsEl.innerHTML = products.map(product => {

    const image = getProductImage(product);
    const price = getLowestPrice(product);
    const totalStock = getTotalStock(product);

    const sizes = getAllSizes(product);

    let sizeHTML = "";

    if (sizes.length) {

      sizeHTML = `
        <div class="product-sizes">

          <div class="size-title">
            Size:
          </div>

          <div class="size-buttons">

            ${sizes.map(size => {

              const unavailable = Number(size.stock) <= 0;

              return `
                <button
                  class="size-btn ${unavailable ? "disabled" : ""}"
                  data-size-id="${size.id}"
                  data-product-id="${product.id}"
                  ${unavailable ? "disabled" : ""}
                  onclick="selectProductSize(event, ${product.id}, ${size.id})"
                >
                  ${escapeHTML(size.size)}
                  <small>${money(size.price)}</small>
                </button>
              `;

            }).join("")}

          </div>

        </div>
      `;

    }

    return `
      <article
        class="product-card"
        data-product-id="${product.id}"
      >

        <div class="product-image-wrap">

          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(product.name)}"
            class="product-image"
            loading="lazy"
            onerror="this.src='https://placehold.co/500x500?text=No+Image'"
          >

          ${
            totalStock <= 0
              ? `<span class="stock-badge out">Out of Stock</span>`
              : `<span class="stock-badge">In Stock</span>`
          }

        </div>

        <div class="product-info">

          <h3 class="product-title">
            ${escapeHTML(product.name)}
          </h3>

          <div class="product-price">
            ${money(price)}
          </div>

          <div class="product-meta">

            <span class="product-rating">
              New
            </span>

            <span class="product-stock">
              ${
                totalStock > 0
                  ? `${totalStock} available`
                  : "Out of stock"
              }
            </span>

          </div>

          ${
            product.description
              ? `
                <p class="product-description">
                  ${escapeHTML(
                    product.description.length > 90
                      ? product.description.substring(0, 90) + "..."
                      : product.description
                  )}
                </p>
              `
              : ""
          }

          ${sizeHTML}

          <div class="product-actions">

            <button
              class="btn-cart"
              onclick="addProductToCart(${product.id})"
              ${totalStock <= 0 ? "disabled" : ""}
            >
              🛒 Add to Cart
            </button>

            <button
              class="btn-buy"
              onclick="buyProduct(${product.id})"
              ${totalStock <= 0 ? "disabled" : ""}
            >
              Buy Now
            </button>

          </div>

        </div>

      </article>
    `;

  }).join("");
}


// ---------------------------------------------------------
// Select Size
// ---------------------------------------------------------

function selectProductSize(event, productId, sizeId) {

  event.stopPropagation();

  const product = productsData.find(
    p => Number(p.id) === Number(productId)
  );

  if (!product) return;

  const size = getAllSizes(product).find(
    s => Number(s.id) === Number(sizeId)
  );

  if (!size) return;

  const card = document.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );

  if (!card) return;

  card.querySelectorAll(".size-btn")
    .forEach(btn => btn.classList.remove("selected"));

  const clickedButton = card.querySelector(
    `.size-btn[data-size-id="${sizeId}"]`
  );

  if (clickedButton) {
    clickedButton.classList.add("selected");
  }

  card.dataset.selectedSizeId = size.id;

  card.dataset.selectedVariantId = size.variantId;

  card.dataset.selectedVariantName =
    size.variantName;

  card.dataset.selectedSize =
    size.size;

  card.dataset.selectedPrice =
    size.price;
}


// ---------------------------------------------------------
// Get Selected Size From Card
// ---------------------------------------------------------

function getSelectedSize(productId) {

  const card = document.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );

  if (!card) return null;

  const sizeId = card.dataset.selectedSizeId;

  if (!sizeId) return null;

  const product = productsData.find(
    p => Number(p.id) === Number(productId)
  );

  if (!product) return null;

  return getAllSizes(product).find(
    s => Number(s.id) === Number(sizeId)
  );
}


// ---------------------------------------------------------
// Buy Product
// ---------------------------------------------------------

function buyProduct(productId) {

  const product = productsData.find(
    p => Number(p.id) === Number(productId)
  );

  if (!product) return;

  const sizes = getAllSizes(product);

  if (sizes.length) {

    let selected = getSelectedSize(productId);

    if (!selected) {

      const available = sizes.find(
        s => Number(s.stock) > 0
      );

      if (!available) {
        alert("এই product-এর কোনো stock নেই।");
        return;
      }

      selectProductSize(
        {
          stopPropagation: () => {}
        },
        productId,
        available.id
      );

      selected = available;
    }

    openOrderModal(product, selected);

  } else {

    alert(
      "এই product-এর size information পাওয়া যায়নি।"
    );

  }
}


// ---------------------------------------------------------
// Open Order Modal
// ---------------------------------------------------------

function openOrderModal(product, size) {

  selectedProduct = product;
  selectedSize = size;
  selectedVariant = null;

  if (productNameInput)
    productNameInput.value = product.name;

  if (variantNameInput)
    variantNameInput.value = size.variantName || "";

  if (sizeNameInput)
    sizeNameInput.value = size.size || "";

  if (unitPriceInput)
    unitPriceInput.value = size.price;

  if (variantSizeIdInput)
    variantSizeIdInput.value = size.id;

  if (displayUnitPrice)
    displayUnitPrice.textContent = money(size.price);

  if (quantityInput)
    quantityInput.value = 1;

  updateOrderTotal();

  if (orderMessage)
    orderMessage.textContent = "";

  if (orderModal) {

    orderModal.classList.add("show");

    orderModal.style.display = "flex";

  }

  document.body.classList.add("modal-open");
}


// ---------------------------------------------------------
// Close Order Modal
// ---------------------------------------------------------

function closeOrderModal() {

  if (!orderModal) return;

  orderModal.classList.remove("show");

  orderModal.style.display = "none";

  document.body.classList.remove("modal-open");

}


// ---------------------------------------------------------
// Order Quantity / Total
// ---------------------------------------------------------

function updateOrderTotal() {

  const price = Number(
    unitPriceInput?.value || 0
  );

  let quantity = Number(
    quantityInput?.value || 1
  );

  if (quantity < 1) quantity = 1;

  if (selectedSize &&
      quantity > Number(selectedSize.stock)) {

    quantity = Number(selectedSize.stock);

    if (quantityInput)
      quantityInput.value = quantity;

  }

  const total = price * quantity;

  if (displayQuantity)
    displayQuantity.textContent = quantity;

  if (orderTotal)
    orderTotal.textContent = money(total);

}


// ---------------------------------------------------------
// Add Product To Cart
// ---------------------------------------------------------

function addProductToCart(productId) {

  const product = productsData.find(
    p => Number(p.id) === Number(productId)
  );

  if (!product) return;

  const sizes = getAllSizes(product);

  if (!sizes.length) {

    alert(
      "এই product-এর কোনো available size নেই।"
    );

    return;

  }

  let selected = getSelectedSize(productId);

  if (!selected) {

    selected = sizes.find(
      s => Number(s.stock) > 0
    );

    if (!selected) {
      alert("Stock শেষ।");
      return;
    }

  }

  const existing = cart.find(
    item =>
      Number(item.variantSizeId) ===
      Number(selected.id)
  );

  if (existing) {

    const newQty =
      Number(existing.quantity) + 1;

    if (newQty > Number(selected.stock)) {

      alert(
        `বর্তমানে মাত্র ${selected.stock} টি stock আছে।`
      );

      return;
    }

    existing.quantity = newQty;

  } else {

    cart.push({

      productId: product.id,

      productName: product.name,

      image:
        selected.variantImage ||
        product.main_image_url,

      variantName:
        selected.variantName || "",

      size:
        selected.size || "",

      price:
        Number(selected.price || 0),

      stock:
        Number(selected.stock || 0),

      variantSizeId:
        selected.id,

      quantity: 1

    });

  }

  saveCart();

  updateCartUI();

  openCartSidebar();

}


// ---------------------------------------------------------
// Cart UI
// ---------------------------------------------------------

function updateCartUI() {

  const totalQuantity = cart.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  if (cartCount)
    cartCount.textContent = totalQuantity;

  if (mobileCartCount)
    mobileCartCount.textContent = totalQuantity;

  if (!cartItems) return;

  if (!cart.length) {

    cartItems.innerHTML = `
      <div class="empty-cart">
        🛒
        <p>Your cart is empty</p>
      </div>
    `;

    if (cartTotal)
      cartTotal.textContent = money(0);

    return;
  }

  let total = 0;

  cartItems.innerHTML = cart.map(
    (item, index) => {

      const itemTotal =
        Number(item.price) *
        Number(item.quantity);

      total += itemTotal;

      return `
        <div class="cart-item">

          <img
            src="${escapeHTML(
              item.image ||
              "https://placehold.co/100x100?text=No+Image"
            )}"
            alt="${escapeHTML(item.productName)}"
            onerror="this.src='https://placehold.co/100x100?text=No+Image'"
          >

          <div class="cart-item-info">

            <h4>
              ${escapeHTML(item.productName)}
            </h4>

            <p>
              ${escapeHTML(item.variantName || "")}
              ${item.size ? " • " + escapeHTML(item.size) : ""}
            </p>

            <strong>
              ${money(item.price)}
            </strong>

            <div class="cart-quantity">

              <button
                onclick="changeCartQuantity(${index}, -1)"
              >
                −
              </button>

              <span>
                ${item.quantity}
              </span>

              <button
                onclick="changeCartQuantity(${index}, 1)"
              >
                +
              </button>

              <button
                class="cart-remove"
                onclick="removeFromCart(${index})"
              >
                🗑
              </button>

            </div>

          </div>

        </div>
      `;

    }
  ).join("");

  if (cartTotal)
    cartTotal.textContent = money(total);
}


// ---------------------------------------------------------
// Change Cart Quantity
// ---------------------------------------------------------

function changeCartQuantity(index, change) {

  const item = cart[index];

  if (!item) return;

  const newQuantity =
    Number(item.quantity) + change;

  if (newQuantity <= 0) {

    cart.splice(index, 1);

  } else {

    if (
      item.stock &&
      newQuantity > Number(item.stock)
    ) {

      alert(
        `বর্তমানে ${item.stock} টি stock আছে।`
      );

      return;
    }

    item.quantity = newQuantity;

  }

  saveCart();

  updateCartUI();
}


// ---------------------------------------------------------
// Remove Cart Item
// ---------------------------------------------------------

function removeFromCart(index) {

  if (
    !confirm("এই product cart থেকে remove করবেন?")
  ) {
    return;
  }

  cart.splice(index, 1);

  saveCart();

  updateCartUI();
}


// ---------------------------------------------------------
// Open Cart
// ---------------------------------------------------------

function openCartSidebar() {

  if (cartSidebar)
    cartSidebar.classList.add("open");

  if (cartOverlay)
    cartOverlay.classList.add("show");

}


// ---------------------------------------------------------
// Close Cart
// ---------------------------------------------------------

function closeCartSidebar() {

  if (cartSidebar)
    cartSidebar.classList.remove("open");

  if (cartOverlay)
    cartOverlay.classList.remove("show");

}


// ---------------------------------------------------------
// Cart Checkout
// ---------------------------------------------------------

function checkoutCart() {

  if (!cart.length) {

    alert("Cart খালি।");

    return;
  }

  /*
    Current database orders table stores one product
    per order. তাই Buy Now flow ব্যবহার করাই safest.
  */

  alert(
    "একবারে একটি product order করা হচ্ছে।\n\n" +
    "Cart-এর product-এর উপর +/− দিয়ে quantity ঠিক করে " +
    "তারপর product-এর Buy Now চাপুন।"
  );

}


// ---------------------------------------------------------
// Search
// ---------------------------------------------------------

function performSearch() {

  const keyword =
    (searchInput?.value || "")
      .trim()
      .toLowerCase();

  if (!keyword) {

    renderProducts(productsData);

    if (searchResultInfo) {
      searchResultInfo.textContent = "";
    }

    return;
  }

  const results = productsData.filter(product => {

    const name =
      String(product.name || "")
        .toLowerCase();

    const description =
      String(product.description || "")
        .toLowerCase();

    return (
      name.includes(keyword) ||
      description.includes(keyword)
    );

  });

  renderProducts(results);

  if (searchResultInfo) {

    searchResultInfo.textContent =
      `"${keyword}" এর জন্য ${results.length} টি product পাওয়া গেছে`;

  }

}


// ---------------------------------------------------------
// Categories
// ---------------------------------------------------------

function renderCategories(products) {

  /*
    বর্তমানে database-এ আলাদা categories table নেই।
    তাই unsupported database query না করে
    generic marketplace categories দেখানো হচ্ছে।
  */

  const categories = [
    {
      name: "All Products",
      icon: "🛍️"
    },
    {
      name: "Popular",
      icon: "🔥"
    },
    {
      name: "New Arrivals",
      icon: "✨"
    },
    {
      name: "Available",
      icon: "📦"
    }
  ];

  const html = categories.map(category => `
    <button
      class="category-item"
      onclick="filterCategory('${category.name}')"
    >
      <span>${category.icon}</span>
      ${category.name}
    </button>
  `).join("");

  if (categoryList)
    categoryList.innerHTML = html;

  if (heroCategoryList)
    heroCategoryList.innerHTML = html;

  if (categoryCardsEl) {

    categoryCardsEl.innerHTML =
      categories.map(category => `
        <div
          class="category-card"
          onclick="filterCategory('${category.name}')"
        >
          <div class="category-icon">
            ${category.icon}
          </div>

          <div class="category-name">
            ${category.name}
          </div>
        </div>
      `).join("");

  }

}


// ---------------------------------------------------------
// Category Filter
// ---------------------------------------------------------

function filterCategory(category) {

  if (category === "All Products") {

    renderProducts(productsData);

    return;
  }

  if (category === "Popular") {

    renderProducts(
      productsData.slice(0, 8)
    );

    return;
  }

  if (category === "New Arrivals") {

    renderProducts(
      productsData.slice(0, 8)
    );

    return;
  }

  if (category === "Available") {

    const available =
      productsData.filter(
        product => getTotalStock(product) > 0
      );

    renderProducts(available);

  }

}


// ---------------------------------------------------------
// Flash Sale
// ---------------------------------------------------------

function renderFlashSale(products) {

  if (!flashSaleProductsEl)
    return;

  const items =
    products.slice(0, 5);

  if (!items.length) {

    flashSaleProductsEl.innerHTML =
      `<p>No products available.</p>`;

    return;
  }

  flashSaleProductsEl.innerHTML =
    items.map(product => {

      const price =
        getLowestPrice(product);

      const image =
        getProductImage(product);

      return `
        <div
          class="flash-product"
          onclick="buyProduct(${product.id})"
        >

          <div class="flash-image-wrap">

            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(product.name)}"
              onerror="this.src='https://placehold.co/300x300?text=No+Image'"
            >

          </div>

          <div class="flash-name">
            ${escapeHTML(product.name)}
          </div>

          <div class="flash-price">
            ${money(price)}
          </div>

        </div>
      `;

    }).join("");

}


// ---------------------------------------------------------
// Order Submit
// ---------------------------------------------------------

async function submitOrder(event) {

  event.preventDefault();

  if (!selectedProduct || !selectedSize) {

    alert("Product বা size select করা হয়নি।");

    return;
  }

  const customerName =
    customerNameInput?.value.trim();

  const phone =
    phoneInput?.value.trim();

  const district =
    districtInput?.value.trim();

  const upazila =
    upazilaInput?.value.trim();

  const address =
    addressInput?.value.trim();

  const quantity =
    Number(quantityInput?.value || 1);

  if (!customerName ||
      !phone ||
      !district ||
      !upazila ||
      !address) {

    if (orderMessage) {
      orderMessage.textContent =
        "সব তথ্য পূরণ করুন।";
    }

    return;
  }

  if (quantity < 1) {

    if (orderMessage) {
      orderMessage.textContent =
        "Quantity কমপক্ষে 1 হতে হবে।";
    }

    return;
  }

  if (
    quantity >
    Number(selectedSize.stock)
  ) {

    if (orderMessage) {
      orderMessage.textContent =
        `এই size-এ মাত্র ${selectedSize.stock} টি stock আছে।`;
    }

    return;
  }

  const price =
    Number(selectedSize.price || 0);

  if (orderMessage) {

    orderMessage.textContent =
      "Order processing...";

  }

  const { data, error } = await sb.rpc(
    "place_order",
    {
      p_customer_name: customerName,
      p_phone: phone,
      p_address: address,
      p_district: district,
      p_upazila: upazila,
      p_product_name: selectedProduct.name,
      p_variant_name:
        selectedSize.variantName || "",
      p_size_name:
        selectedSize.size || "",
      p_variant_size_id:
        Number(selectedSize.id),
      p_quantity:
        quantity,
      p_product_price:
        price
    }
  );

  if (error) {

    console.error(error);

    if (orderMessage) {
      orderMessage.textContent =
        "Order দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
    }

    return;
  }

  if (!data || data.success !== true) {

    if (orderMessage) {

      orderMessage.textContent =
        data?.message ||
        "Order দেওয়া যায়নি।";

    }

    return;
  }

  /*
    সফল order
  */

  if (orderMessage) {

    orderMessage.innerHTML = `
      <div class="success-message">
        ✅ Order সফল হয়েছে!
        <br>
        Order ID: <strong>${escapeHTML(data.order_id)}</strong>
      </div>
    `;

  }

  /*
    Cart-এ একই item থাকলে remove করা
  */

  cart = cart.filter(
    item =>
      Number(item.variantSizeId) !==
      Number(selectedSize.id)
  );

  saveCart();

  updateCartUI();

  /*
    নতুন stock database থেকে reload
  */

  await loadProducts();

  /*
    কিছুক্ষণ পরে modal বন্ধ
  */

  setTimeout(() => {

    closeOrderModal();

  }, 1800);

}


// ---------------------------------------------------------
// Event Listeners
// ---------------------------------------------------------

if (searchButton) {

  searchButton.addEventListener(
    "click",
    performSearch
  );

}

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        performSearch();
      }

    }
  );

}


if (cartButton) {

  cartButton.addEventListener(
    "click",
    openCartSidebar
  );

}


if (mobileCartButton) {

  mobileCartButton.addEventListener(
    "click",
    openCartSidebar
  );

}


if (closeCart) {

  closeCart.addEventListener(
    "click",
    closeCartSidebar
  );

}


if (cartOverlay) {

  cartOverlay.addEventListener(
    "click",
    closeCartSidebar
  );

}


if (checkoutButton) {

  checkoutButton.addEventListener(
    "click",
    checkoutCart
  );

}


if (closeModal) {

  closeModal.addEventListener(
    "click",
    closeOrderModal
  );

}


if (orderModal) {

  orderModal.addEventListener(
    "click",
    event => {

      if (event.target === orderModal) {
        closeOrderModal();
      }

    }
  );

}


if (quantityInput) {

  quantityInput.addEventListener(
    "input",
    updateOrderTotal
  );

}


if (orderForm) {

  orderForm.addEventListener(
    "submit",
    submitOrder
  );

}


// ---------------------------------------------------------
// Escape key
// ---------------------------------------------------------

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {

      closeCartSidebar();
      closeOrderModal();

    }

  }
);


// ---------------------------------------------------------
// Make functions available to HTML
// ---------------------------------------------------------

window.selectProductSize =
  selectProductSize;

window.buyProduct =
  buyProduct;

window.addProductToCart =
  addProductToCart;

window.changeCartQuantity =
  changeCartQuantity;

window.removeFromCart =
  removeFromCart;

window.filterCategory =
  filterCategory;


// ---------------------------------------------------------
// Start App
// ---------------------------------------------------------

loadProducts();
updateCartUI();
