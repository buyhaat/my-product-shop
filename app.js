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
  $("searchButton")?.addEventListener(
    "click",
    performSearch
  );

  $("searchInput")?.addEventListener(
    "input",
    performSearch
  );


  // All products
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
      regular_price,
      active,
      allow_cod,
      allow_advance,
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

    console.error(
      "Product loading error:",
      error
    );

    showNoProducts(
      "পণ্য লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
    );

    return;
  }


  allProducts =
    (data || []).map(product => {

      const variants =
        (product.product_variants || [])
          .filter(
            variant =>
              variant.active !== false
          )
          .map(variant => {

            return {
              ...variant,

              variant_sizes:
                (variant.variant_sizes || [])
                  .filter(
                    size =>
                      size.active !== false
                  )
                  .map(size => ({
                    ...size,
                    price:
                      Number(size.price || 0),
                    stock:
                      Number(size.stock || 0)
                  }))
            };

          });


      return {

        ...product,

        base_price:
          Number(product.base_price || 0),

        regular_price:
          Number(product.regular_price || 0),

        allow_cod:
          product.allow_cod !== false,

        allow_advance:
          product.allow_advance === true,

        product_variants:
          variants

      };

    });


  filteredProducts =
    [...allProducts];


  renderProducts();

}


// ===============================
// LOADING
// ===============================

function showLoading() {

  const container =
    $("products");

  if (!container) return;

  container.innerHTML = `
    <div style="
      grid-column:1/-1;
      text-align:center;
      padding:60px 20px;
      color:#777;
    ">
      <div style="
        font-size:32px;
        margin-bottom:8px;
      ">
        ⏳
      </div>

      <div>
        পণ্য লোড হচ্ছে...
      </div>
    </div>
  `;

  if ($("noProducts")) {

    $("noProducts").style.display =
      "none";

  }

}


// ===============================
// RENDER PRODUCTS
// ===============================

function renderProducts() {

  const container =
    $("products");

  if (!container) return;


  if (!filteredProducts.length) {

    container.innerHTML = "";

    showNoProducts(
      "কোনো পণ্য পাওয়া যায়নি।"
    );

    return;

  }


  if ($("noProducts")) {

    $("noProducts").style.display =
      "none";

  }


  container.innerHTML =
    filteredProducts
      .map(product =>
        createProductCard(product)
      )
      .join("");

}


// ===============================
// PRODUCT CARD
// ===============================

function createProductCard(product) {

  const variants =
    product.product_variants || [];


  let totalStock = 0;


  variants.forEach(variant => {

    (variant.variant_sizes || [])
      .forEach(size => {

        totalStock +=
          Number(size.stock || 0);

      });

  });


  const firstAvailable =
    getFirstAvailableSize(product);


  const displayPrice =
    firstAvailable
      ? firstAvailable.price
      : Number(product.base_price || 0);


  const regularPrice =
    Number(product.regular_price || 0);


  const image =
    product.main_image_url || "";


  const safeName =
    escapeHTML(
      product.name ||
      "Unnamed Product"
    );


  // ===============================
  // IMAGE
  // ===============================

  const imageHTML =
    image
      ? `
        <img
          src="${escapeAttribute(image)}"
          class="product-image"
          alt="${escapeAttribute(
            product.name || "Product"
          )}"
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


  // ===============================
  // PRICE
  // ===============================

  let priceHTML = `
    <div class="product-price">
      ৳${formatMoney(displayPrice)}
    </div>
  `;


  if (
    regularPrice > 0 &&
    displayPrice < regularPrice
  ) {

    priceHTML = `
      <div
        style="
          margin-top:8px;
          display:flex;
          align-items:center;
          gap:7px;
          flex-wrap:wrap;
        "
      >

        <span
          class="product-price"
          style="margin-top:0;"
        >
          ৳${formatMoney(displayPrice)}
        </span>

        <span
          style="
            color:#999;
            font-size:13px;
            text-decoration:line-through;
          "
        >
          ৳${formatMoney(regularPrice)}
        </span>

      </div>
    `;

  }


  // ===============================
  // STOCK
  // ===============================

  const stockText =
    totalStock > 0
      ? `স্টক: ${totalStock}`
      : "স্টক নেই";


  // ===============================
  // CARD
  // ===============================

  return `
    <article
      class="product-card"
      data-product-id="${escapeAttribute(product.id)}"
      onclick="openProductDetails('${escapeAttribute(product.id)}')"
      style="cursor:pointer;"
    >

      <div class="product-image-wrap">
        ${imageHTML}
      </div>


      <div class="product-info">

        <div class="product-name">
          ${safeName}
        </div>


        ${priceHTML}


        <div class="product-stock">
          ${stockText}
        </div>


        <button
          type="button"
          class="buy-now-card-btn"
          ${!firstAvailable ? "disabled" : ""}
          onclick="
            event.stopPropagation();
            openProductDetails('${escapeAttribute(product.id)}');
          "
        >
          ${
            firstAvailable
              ? "Buy Now"
              : "স্টক নেই"
          }
        </button>

      </div>

    </article>
  `;

}


// ===============================
// GET FIRST AVAILABLE SIZE
// ===============================

function getFirstAvailableSize(product) {

  for (
    const variant
    of product.product_variants || []
  ) {

    for (
      const size
      of variant.variant_sizes || []
    ) {

      if (
        Number(size.stock) > 0
      ) {

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
// OPEN PRODUCT DETAILS
// ===============================

function openProductDetails(productId) {

  if (!productId) return;


  window.location.href =
    `product.html?id=${encodeURIComponent(productId)}`;

}


// ===============================
// SEARCH
// ===============================

function performSearch() {

  const input =
    $("searchInput");

  if (!input) return;


  const query =
    input.value
      .trim()
      .toLowerCase();


  if (!query) {

    filteredProducts =
      [...allProducts];


    if ($("searchResultInfo")) {

      $("searchResultInfo")
        .textContent = "";

    }


    renderProducts();

    return;

  }


  filteredProducts =
    allProducts.filter(product => {

      const name =
        (
          product.name || ""
        ).toLowerCase();


      const description =
        (
          product.description || ""
        ).toLowerCase();


      return (
        name.includes(query) ||
        description.includes(query)
      );

    });


  if ($("searchResultInfo")) {

    $("searchResultInfo")
      .textContent =
      `${filteredProducts.length} টি পণ্য পাওয়া গেছে`;

  }


  renderProducts();

}


// ===============================
// NO PRODUCTS
// ===============================

function showNoProducts(message) {

  const box =
    $("noProducts");

  if (!box) return;


  box.style.display =
    "block";


  const text =
    box.querySelector("p");


  if (text) {

    text.textContent =
      message;

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
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// ===============================
// GLOBAL
// ===============================

window.openProductDetails =
  openProductDetails;
