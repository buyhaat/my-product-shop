const { createClient } = window.supabase;

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================
// DOM HELPER
// ===============================

const $ = (id) => document.getElementById(id);


// ===============================
// GLOBAL STATE
// ===============================

let product = null;
let selectedVariant = null;
let selectedSize = null;
let quantity = 1;
let selectedPaymentMethod = null;


// ===============================
// INITIALIZE
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
  await loadProduct();
});


// ===============================
// LOAD PRODUCT
// ===============================

async function loadProduct() {

  const productId = getProductId();

  if (!productId) {
    showError("এই Product URL-এ কোনো Product ID পাওয়া যায়নি।");
    return;
  }

  showLoading(true);

  try {

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
      .eq("id", productId)
      .eq("active", true)
      .maybeSingle();

    if (error) {

      console.error(
        "Product loading error:",
        error
      );

      showError(
        "পণ্যের তথ্য লোড করতে সমস্যা হয়েছে।\n\n" +
        error.message
      );

      return;
    }

    if (!data) {

      showError(
        "এই পণ্যটি পাওয়া যায়নি অথবা বর্তমানে Active নেই।"
      );

      return;
    }

    product = normalizeProduct(data);

    initializeProduct();

    showLoading(false);

  } catch (error) {

    console.error(
      "Unexpected product error:",
      error
    );

    showError(
      "পেজ লোড করার সময় একটি সমস্যা হয়েছে।"
    );
  }
}


// ===============================
// GET PRODUCT ID
// ===============================

function getProductId() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return params.get("id");
}


// ===============================
// NORMALIZE PRODUCT
// ===============================

function normalizeProduct(data) {

  const variants =
    (data.product_variants || [])
      .filter(
        variant =>
          variant.active !== false
      )
      .map(variant => {

        const sizes =
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
            }));

        return {
          ...variant,
          variant_sizes: sizes
        };
      });

  return {

    ...data,

    base_price:
      Number(data.base_price || 0),

    regular_price:
      Number(data.regular_price || 0),

    allow_cod:
      data.allow_cod !== false,

    allow_advance:
      data.allow_advance === true,

    product_variants:
      variants
  };
}


// ===============================
// INITIALIZE PRODUCT
// ===============================

function initializeProduct() {

  $("productPage").style.display =
    "block";

  document.title =
    `${product.name || "Product"} - My Shop`;

  $("productName").textContent =
    product.name || "Unnamed Product";

  $("productDescription").textContent =
    product.description ||
    "এই পণ্যের কোনো বিবরণ দেওয়া হয়নি।";

  renderGallery();

  setupVariants();

  setupPaymentMethods();

  updateProductState();
}


// ===============================
// GALLERY
// ===============================

function renderGallery() {

  const mainImage =
    $("mainProductImage");

  const noImage =
    $("noImage");

  const thumbnails =
    $("thumbnailList");

  const images = [];

  if (product.main_image_url) {

    images.push(
      product.main_image_url
    );
  }

  (product.product_variants || [])
    .forEach(variant => {

      if (
        variant.image_url &&
        !images.includes(
          variant.image_url
        )
      ) {

        images.push(
          variant.image_url
        );
      }
    });

  thumbnails.innerHTML = "";

  if (!images.length) {

    mainImage.style.display =
      "none";

    noImage.style.display =
      "block";

    return;
  }

  noImage.style.display =
    "none";

  mainImage.style.display =
    "block";

  setMainImage(images[0]);

  images.forEach((image, index) => {

    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      "thumbnail";

    if (index === 0) {

      button.classList.add(
        "active"
      );
    }

    const img =
      document.createElement("img");

    img.src =
      image;

    img.alt =
      product.name || "Product";

    img.loading =
      "lazy";

    button.appendChild(
      img
    );

    button.addEventListener(
      "click",
      () => {

        setMainImage(image);

        document
          .querySelectorAll(".thumbnail")
          .forEach(item =>
            item.classList.remove(
              "active"
            )
          );

        button.classList.add(
          "active"
        );
      }
    );

    thumbnails.appendChild(
      button
    );
  });
}


// ===============================
// SET MAIN IMAGE
// ===============================

function setMainImage(url) {

  const image =
    $("mainProductImage");

  const noImage =
    $("noImage");

  image.src =
    url;

  image.style.display =
    "block";

  noImage.style.display =
    "none";

  image.onerror = () => {

    image.style.display =
      "none";

    noImage.style.display =
      "block";
  };
}


// ===============================
// VARIANTS
// ===============================

function setupVariants() {

  const variants =
    product.product_variants || [];

  const section =
    $("variantSection");

  const list =
    $("variantList");

  list.innerHTML = "";

  if (!variants.length) {

    section.style.display =
      "none";

    selectedVariant =
      null;

    renderSizes();

    return;
  }

  section.style.display =
    "block";

  selectedVariant =
    getFirstVariantWithStock();

  variants.forEach(variant => {

    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      "option-button";

    button.textContent =
      variant.name || "Variant";

    const stock =
      getVariantStock(variant);

    if (stock <= 0) {

      button.classList.add(
        "disabled"
      );

      button.disabled =
        true;
    }

    if (
      selectedVariant &&
      String(selectedVariant.id) ===
      String(variant.id)
    ) {

      button.classList.add(
        "selected"
      );
    }

    button.addEventListener(
      "click",
      () => {

        if (stock <= 0) return;

        selectedVariant =
          variant;

        selectedSize =
          null;

        quantity = 1;

        document
          .querySelectorAll(
            "#variantList .option-button"
          )
          .forEach(item =>
            item.classList.remove(
              "selected"
            )
          );

        button.classList.add(
          "selected"
        );

        renderSizes();

        updateProductState();

        if (variant.image_url) {

          setMainImage(
            variant.image_url
          );
        }
      }
    );

    list.appendChild(
      button
    );
  });

  renderSizes();
}


// ===============================
// GET FIRST VARIANT WITH STOCK
// ===============================

function getFirstVariantWithStock() {

  for (
    const variant
    of product.product_variants || []
  ) {

    if (
      getVariantStock(variant) > 0
    ) {

      return variant;
    }
  }

  return null;
}


// ===============================
// VARIANT STOCK
// ===============================

function getVariantStock(variant) {

  return (
    variant.variant_sizes || []
  ).reduce(
    (total, size) =>
      total +
      Number(size.stock || 0),
    0
  );
}


// ===============================
// SIZES
// ===============================

function renderSizes() {

  const section =
    $("sizeSection");

  const list =
    $("sizeList");

  list.innerHTML = "";

  if (!selectedVariant) {

    section.style.display =
      "none";

    selectedSize =
      null;

    return;
  }

  const sizes =
    selectedVariant.variant_sizes || [];

  if (!sizes.length) {

    section.style.display =
      "none";

    selectedSize =
      null;

    return;
  }

  section.style.display =
    "block";

  const firstAvailable =
    sizes.find(
      size =>
        Number(size.stock) > 0
    );

  selectedSize =
    firstAvailable || null;

  sizes.forEach(size => {

    const button =
      document.createElement("button");

    button.type =
      "button";

    button.className =
      "option-button";

    button.textContent =
      size.size || "Size";

    if (
      Number(size.stock) <= 0
    ) {

      button.classList.add(
        "disabled"
      );

      button.disabled =
        true;
    }

    if (
      selectedSize &&
      String(selectedSize.id) ===
      String(size.id)
    ) {

      button.classList.add(
        "selected"
      );
    }

    button.addEventListener(
      "click",
      () => {

        if (
          Number(size.stock) <= 0
        ) return;

        selectedSize =
          size;

        quantity = 1;

        document
          .querySelectorAll(
            "#sizeList .option-button"
          )
          .forEach(item =>
            item.classList.remove(
              "selected"
            )
          );

        button.classList.add(
          "selected"
        );

        updateProductState();
      }
    );

    list.appendChild(
      button
    );
  });
}


// ===============================
// GET SELECTED PRICE
// ===============================

function getSelectedPrice() {

  if (selectedSize) {

    return Number(
      selectedSize.price || 0
    );
  }

  if (selectedVariant) {

    const availableSize =
      (
        selectedVariant.variant_sizes ||
        []
      ).find(
        size =>
          Number(size.stock) > 0
      );

    if (availableSize) {

      return Number(
        availableSize.price || 0
      );
    }
  }

  return Number(
    product.base_price || 0
  );
}


// ===============================
// GET SELECTED STOCK
// ===============================

function getSelectedStock() {

  if (selectedSize) {

    return Number(
      selectedSize.stock || 0
    );
  }

  if (selectedVariant) {

    return getVariantStock(
      selectedVariant
    );
  }

  let stock = 0;

  (
    product.product_variants || []
  ).forEach(variant => {

    stock +=
      getVariantStock(
        variant
      );
  });

  return stock;
}


// ===============================
// UPDATE PRODUCT STATE
// ===============================

function updateProductState() {

  const price =
    getSelectedPrice();

  const stock =
    getSelectedStock();

  const total =
    price * quantity;

  $("salePrice").textContent =
    `৳${formatMoney(price)}`;

  $("totalPrice").textContent =
    `৳${formatMoney(total)}`;

  $("quantityValue").textContent =
    quantity;

  updateRegularPrice(
    price
  );

  const stockStatus =
    $("stockStatus");

  if (stock > 0) {

    stockStatus.textContent =
      `স্টক: ${stock}`;

    stockStatus.classList.remove(
      "out"
    );

  } else {

    stockStatus.textContent =
      "স্টক নেই";

    stockStatus.classList.add(
      "out"
    );
  }

  const orderButton =
    $("orderButton");

  orderButton.disabled =
    stock <= 0;

  if (stock <= 0) {

    orderButton.textContent =
      "স্টক নেই";

  } else {

    orderButton.textContent =
      "Order Now";
  }
}


// ===============================
// REGULAR PRICE
// ===============================

function updateRegularPrice(
  currentPrice
) {

  const regular =
    Number(
      product.regular_price || 0
    );

  const regularElement =
    $("regularPrice");

  const badge =
    $("discountBadge");

  if (
    regular > 0 &&
    currentPrice < regular
  ) {

    regularElement.style.display =
      "inline";

    regularElement.textContent =
      `৳${formatMoney(regular)}`;

    const discount =
      Math.round(
        (
          (regular - currentPrice) /
          regular
        ) * 100
      );

    badge.style.display =
      "inline-block";

    badge.textContent =
      `${discount}% OFF`;

  } else {

    regularElement.style.display =
      "none";

    badge.style.display =
      "none";
  }
}


// ===============================
// QUANTITY
// ===============================

function increaseQuantity() {

  const stock =
    getSelectedStock();

  if (stock <= 0) return;

  if (
    quantity < stock
  ) {

    quantity++;

    updateProductState();
  }
}


function decreaseQuantity() {

  if (
    quantity > 1
  ) {

    quantity--;

    updateProductState();
  }
}


// ===============================
// PAYMENT METHODS
// ===============================

function setupPaymentMethods() {

  const container =
    $("paymentMethods");

  container.innerHTML = "";

  const methods = [];

  if (product.allow_cod) {

    methods.push({
      value: "cod",
      label: "Cash on Delivery"
    });
  }

  if (product.allow_advance) {

    methods.push({
      value: "advance",
      label: "Advance Payment"
    });
  }

  if (!methods.length) {

    container.innerHTML =
      "<div style='color:#777;'>কোনো পেমেন্ট পদ্ধতি সেট করা হয়নি।</div>";

    selectedPaymentMethod =
      null;

    return;
  }

  selectedPaymentMethod =
    methods[0].value;

  methods.forEach(
    (method, index) => {

      const label =
        document.createElement(
          "label"
        );

      label.className =
        "payment-option";

      if (index === 0) {

        label.classList.add(
          "selected"
        );
      }

      const input =
        document.createElement(
          "input"
        );

      input.type =
        "radio";

      input.name =
        "paymentMethod";

      input.value =
        method.value;

      input.checked =
        index === 0;

      input.addEventListener(
        "change",
        () => {

          selectedPaymentMethod =
            method.value;

          document
            .querySelectorAll(
              ".payment-option"
            )
            .forEach(item =>
              item.classList.remove(
                "selected"
              )
            );

          label.classList.add(
            "selected"
          );

          updatePaymentFields();
        }
      );

      label.appendChild(
        input
      );

      const text =
        document.createElement(
          "span"
        );

      text.textContent =
        method.label;

      label.appendChild(
        text
      );

      container.appendChild(
        label
      );
    }
  );

  updatePaymentFields();
}


// ===============================
// PAYMENT FIELDS
// ===============================

function updatePaymentFields() {

  const info =
    $("paymentInfo");

  if (
    selectedPaymentMethod ===
    "advance"
  ) {

    info.style.display =
      "block";

  } else {

    info.style.display =
      "none";
  }
}


// ===============================
// SHOW ORDER FORM
// ===============================

function showOrderForm() {

  if (!product) return;

  if (
    getSelectedStock() <= 0
  ) {

    showFormAlert(
      "এই পণ্যটি বর্তমানে স্টকে নেই।",
      "error"
    );

    return;
  }

  const orderSection =
    $("orderSection");

  orderSection.style.display =
    "block";

  orderSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// ===============================
// SUBMIT ORDER
// ===============================

async function submitOrder() {

  clearFormAlert();

  if (!product) {

    showFormAlert(
      "পণ্যের তথ্য পাওয়া যায়নি।",
      "error"
    );

    return;
  }

  const name =
    $("customerName").value.trim();

  const phone =
    $("customerPhone").value.trim();

  const address =
    $("customerAddress").value.trim();

  const district =
    $("customerDistrict").value.trim();

  const upazila =
    $("customerUpazila").value.trim();

  const paymentAccount =
    $("paymentAccount").value.trim();

  const transactionId =
    $("transactionId").value.trim();


  if (!name) {

    showFormAlert(
      "আপনার নাম দিন।",
      "error"
    );

    $("customerName").focus();

    return;
  }


  if (!phone) {

    showFormAlert(
      "আপনার মোবাইল নম্বর দিন।",
      "error"
    );

    $("customerPhone").focus();

    return;
  }


  if (!isValidBangladeshPhone(phone)) {

    showFormAlert(
      "সঠিক মোবাইল নম্বর দিন।",
      "error"
    );

    $("customerPhone").focus();

    return;
  }


  if (!address) {

    showFormAlert(
      "আপনার ঠিকানা দিন।",
      "error"
    );

    $("customerAddress").focus();

    return;
  }


  if (!district) {

    showFormAlert(
      "আপনার জেলা দিন।",
      "error"
    );

    $("customerDistrict").focus();

    return;
  }


  if (!upazila) {

    showFormAlert(
      "আপনার উপজেলা দিন।",
      "error"
    );

    $("customerUpazila").focus();

    return;
  }


  if (!selectedPaymentMethod) {

    showFormAlert(
      "একটি পেমেন্ট পদ্ধতি নির্বাচন করুন।",
      "error"
    );

    return;
  }


  if (
    selectedPaymentMethod ===
    "advance"
  ) {

    if (!paymentAccount) {

      showFormAlert(
        "পেমেন্ট অ্যাকাউন্ট নম্বর দিন।",
        "error"
      );

      $("paymentAccount").focus();

      return;
    }


    if (!transactionId) {

      showFormAlert(
        "Transaction ID দিন।",
        "error"
      );

      $("transactionId").focus();

      return;
    }
  }


  const currentStock =
    getSelectedStock();

  if (
    currentStock < quantity
  ) {

    showFormAlert(
      `দুঃখিত, বর্তমানে মাত্র ${currentStock} টি স্টকে আছে।`,
      "error"
    );

    updateProductState();

    return;
  }


  const price =
    getSelectedPrice();

  const variantName =
    selectedVariant
      ? (
          selectedVariant.name ||
          ""
        )
      : "";

  const sizeName =
    selectedSize
      ? (
          selectedSize.size ||
          ""
        )
      : "";

  const variantSizeId =
    selectedSize
      ? selectedSize.id
      : null;


  const button =
    $("submitOrderButton");

  const originalText =
    button.textContent;

  button.disabled =
    true;

  button.textContent =
    "অর্ডার দেওয়া হচ্ছে...";


  try {

    const { data, error } =
      await sb.rpc(
        "place_order",
        {
          p_customer_name:
            name,

          p_phone:
            phone,

          p_address:
            address,

          p_district:
            district,

          p_upazila:
            upazila,

          p_product_name:
            product.name || "",

          p_variant_name:
            variantName,

          p_size_name:
            sizeName,

          p_variant_size_id:
            variantSizeId,

          p_quantity:
            quantity,

          p_product_price:
            price,

          p_payment_method:
            selectedPaymentMethod,

          p_payment_account:
            selectedPaymentMethod ===
            "advance"
              ? paymentAccount
              : null,

          p_transaction_id:
            selectedPaymentMethod ===
            "advance"
              ? transactionId
              : null
        }
      );


    if (error) {

      console.error(
        "Order submission error:",
        error
      );

      button.disabled =
        false;

      button.textContent =
        originalText;

      showFormAlert(
        getOrderErrorMessage(error),
        "error"
      );

      return;
    }


    button.textContent =
      "অর্ডার সফল হয়েছে ✓";


    showFormAlert(
      "আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। ধন্যবাদ!",
      "success"
    );


    $("customerName").value =
      "";

    $("customerPhone").value =
      "";

    $("customerAddress").value =
      "";

    $("customerDistrict").value =
      "";

    $("customerUpazila").value =
      "";

    $("paymentAccount").value =
      "";

    $("transactionId").value =
      "";

    quantity = 1;

    updateProductState();

  } catch (error) {

    console.error(
      "Unexpected order error:",
      error
    );

    button.disabled =
      false;

    button.textContent =
      originalText;

    showFormAlert(
      "অর্ডার দেওয়ার সময় একটি সমস্যা হয়েছে।",
      "error"
    );
  }
}


// ===============================
// ORDER ERROR
// ===============================

function getOrderErrorMessage(error) {

  const message =
    String(
      error?.message ||
      ""
    ).toLowerCase();

  if (
    message.includes("stock")
  ) {

    return "স্টক সংক্রান্ত সমস্যার কারণে অর্ডারটি দেওয়া যায়নি।";
  }

  if (
    message.includes("function") ||
    message.includes("place_order")
  ) {

    return "Order system-এর সাথে সংযোগ করা যাচ্ছে না। Supabase-এর place_order function পরীক্ষা করুন।";
  }

  return (
    error?.message ||
    "অর্ডার দেওয়ার সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।"
  );
}


// ===============================
// PHONE VALIDATION
// ===============================

function isValidBangladeshPhone(
  phone
) {

  const normalized =
    phone.replace(
      /[\s-]/g,
      ""
    );

  return /^(?:\+8801|8801|01)\d{9}$/
    .test(normalized);
}


// ===============================
// SHARE
// ===============================

async function shareProduct() {

  const url =
    window.location.href;

  const title =
    product?.name ||
    "My Shop Product";


  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title: title,
        text:
          `${title} - My Shop`,
        url: url
      });

      return;

    } catch (error) {

      if (
        error?.name ===
        "AbortError"
      ) {

        return;
      }
    }
  }

  await copyProductLink();
}


// ===============================
// COPY LINK
// ===============================

async function copyProductLink() {

  const url =
    window.location.href;

  try {

    await navigator.clipboard.writeText(
      url
    );

    showFormAlert(
      "Product link কপি হয়েছে।",
      "success"
    );

  } catch (error) {

    fallbackCopy(url);
  }
}


// ===============================
// FALLBACK COPY
// ===============================

function fallbackCopy(
  text
) {

  const textarea =
    document.createElement(
      "textarea"
    );

  textarea.value =
    text;

  textarea.style.position =
    "fixed";

  textarea.style.opacity =
    "0";

  document.body.appendChild(
    textarea
  );

  textarea.select();

  try {

    document.execCommand(
      "copy"
    );

    showFormAlert(
      "Product link কপি হয়েছে।",
      "success"
    );

  } catch (error) {

    showFormAlert(
      `এই লিংকটি কপি করুন: ${text}`,
      "error"
    );
  }

  textarea.remove();
}


// ===============================
// ALERT
// ===============================

function showFormAlert(
  message,
  type
) {

  const alert =
    $("formAlert");

  if (!alert) return;

  alert.textContent =
    message;

  alert.className =
    `form-alert ${type}`;
}


function clearFormAlert() {

  const alert =
    $("formAlert");

  if (!alert) return;

  alert.textContent =
    "";

  alert.className =
    "form-alert";
}


// ===============================
// LOADING / ERROR
// ===============================

function showLoading(
  isLoading
) {

  const loading =
    $("loading");

  const page =
    $("productPage");

  const error =
    $("errorBox");

  if (!loading || !page || !error) {
    return;
  }

  if (isLoading) {

    loading.style.display =
      "flex";

    page.style.display =
      "none";

    error.style.display =
      "none";

  } else {

    loading.style.display =
      "none";
  }
}


function showError(
  message
) {

  const loading =
    $("loading");

  const page =
    $("productPage");

  const errorBox =
    $("errorBox");

  const errorMessage =
    $("errorMessage");

  if (loading) {
    loading.style.display =
      "none";
  }

  if (page) {
    page.style.display =
      "none";
  }

  if (errorBox) {
    errorBox.style.display =
      "block";
  }

  if (errorMessage) {
    errorMessage.textContent =
      message;
  }
}


// ===============================
// NAVIGATION
// ===============================

function goHome() {

  window.location.href =
    "index.html";
}


function goBack() {

  if (
    window.history.length > 1
  ) {

    window.history.back();

  } else {

    goHome();
  }
}


// ===============================
// MONEY
// ===============================

function formatMoney(
  value
) {

  return Number(
    value || 0
  ).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 2
    }
  );
}


// ===============================
// GLOBAL FUNCTIONS
// ===============================

window.goHome =
  goHome;

window.goBack =
  goBack;

window.increaseQuantity =
  increaseQuantity;

window.decreaseQuantity =
  decreaseQuantity;

window.showOrderForm =
  showOrderForm;

window.submitOrder =
  submitOrder;

window.shareProduct =
  shareProduct;

window.copyProductLink =
  copyProductLink;
