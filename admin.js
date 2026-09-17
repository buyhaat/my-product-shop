/* =========================================================
   MY SHOP ADMIN PANEL
   Login + Dashboard + Add Product + Edit Product
   + Stock Update + Orders
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   DOM
   ========================================================= */

const $ = (id) => document.getElementById(id);

const adminLogin = $("adminLogin");
const adminDashboard = $("adminDashboard");

const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginAlert = $("loginAlert");

const logoutBtn = $("logoutBtn");

const productForm = $("productForm");
const productFormTitle = $("productFormTitle");
const productFormAlert = $("productFormAlert");
const saveProductBtn = $("saveProductBtn");

const productNameAdmin = $("productNameAdmin");
const regularPriceAdmin = $("regularPriceAdmin");
const basePriceAdmin = $("basePriceAdmin");
const descriptionAdmin = $("descriptionAdmin");
const mainImageAdmin = $("mainImageAdmin");
const mainImagePreview = $("mainImagePreview");

const allowCodAdmin = $("allowCodAdmin");
const allowAdvanceAdmin = $("allowAdvanceAdmin");

const variantsContainer = $("variantsContainer");
const addVariantBtn = $("addVariantBtn");

const productsList = $("productsList");
const ordersList = $("ordersList");

const orderStatusFilter = $("orderStatusFilter");

const totalProductsAdmin = $("totalProductsAdmin");
const totalOrdersAdmin = $("totalOrdersAdmin");
const pendingOrdersAdmin = $("pendingOrdersAdmin");
const totalSalesAdmin = $("totalSalesAdmin");


/* =========================================================
   STATE
   ========================================================= */

let editingProductId = null;
let currentUser = null;


/* =========================================================
   PAYMENT SETTINGS
   ========================================================= */

function checkPaymentMethodsAdmin() {

    if (!allowCodAdmin || !allowAdvanceAdmin) {
        return;
    }

    if (!allowCodAdmin.checked && !allowAdvanceAdmin.checked) {
        allowCodAdmin.checked = true;
    }
}


/* =========================================================
   ALERT
   ========================================================= */

function showAlert(message, type = "info") {

    if (!productFormAlert) {
        return;
    }

    productFormAlert.textContent = message;

    productFormAlert.className = "form-alert " + type;

    productFormAlert.style.display = "block";
}


function hideAlert() {

    if (!productFormAlert) {
        return;
    }

    productFormAlert.textContent = "";
    productFormAlert.style.display = "none";
}


/* =========================================================
   LOGIN ALERT
   ========================================================= */

function showLoginAlert(message, type = "error") {

    if (!loginAlert) {
        return;
    }

    loginAlert.textContent = message;
    loginAlert.className = "form-alert " + type;
    loginAlert.style.display = "block";
}


function hideLoginAlert() {

    if (!loginAlert) {
        return;
    }

    loginAlert.textContent = "";
    loginAlert.style.display = "none";
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginAdmin(event) {

    event.preventDefault();

    hideLoginAlert();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {

        showLoginAlert(
            "Please enter email and password.",
            "error"
        );

        return;
    }

    try {

        const { data, error } = await sb.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        currentUser = data.user;

        await verifyAdminUser();

    } catch (error) {

        console.error("Login error:", error);

        showLoginAlert(
            error.message || "Login failed.",
            "error"
        );
    }
}


/* =========================================================
   VERIFY ADMIN USER
   ========================================================= */

async function verifyAdminUser() {

    if (!currentUser) {
        return;
    }

    try {

        const { data, error } = await sb
            .from("admin_users")
            .select("user_id")
            .eq("user_id", currentUser.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {

            await sb.auth.signOut();

            showLoginAlert(
                "You are not authorized to access the admin panel.",
                "error"
            );

            return;
        }

        showDashboard();

    } catch (error) {

        console.error("Admin verification error:", error);

        showLoginAlert(
            "Could not verify admin account.",
            "error"
        );
    }
}


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

function showDashboard() {

    if (adminLogin) {
        adminLogin.style.display = "none";
    }

    if (adminDashboard) {
        adminDashboard.style.display = "block";
    }

    loadProducts();
    loadOrders();
    loadStats();

    resetProductForm();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutAdmin() {

    try {

        await sb.auth.signOut();

        currentUser = null;

        if (adminDashboard) {
            adminDashboard.style.display = "none";
        }

        if (adminLogin) {
            adminLogin.style.display = "block";
        }

    } catch (error) {

        console.error("Logout error:", error);
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showAdminSection(section) {

    document
        .querySelectorAll(".admin-section")
        .forEach((element) => {
            element.style.display = "none";
        });

    const target = $(section);

    if (target) {
        target.style.display = "block";
    }

    if (section === "productsSection") {
        loadProducts();
    }

    if (section === "ordersSection") {
        loadOrders();
    }

    if (section === "dashboardSection") {
        loadStats();
    }
}


/* =========================================================
   MAIN IMAGE PREVIEW
   ========================================================= */

function previewMainImage() {

    if (!mainImageAdmin || !mainImagePreview) {
        return;
    }

    const file = mainImageAdmin.files[0];

    if (!file) {

        mainImagePreview.src = "";
        mainImagePreview.style.display = "none";

        return;
    }

    const url = URL.createObjectURL(file);

    mainImagePreview.src = url;
    mainImagePreview.style.display = "block";
}


/* =========================================================
   CREATE VARIANT
   ========================================================= */

function createVariantElement(variant = {}) {

    if (!variantsContainer) {
        return;
    }

    const wrapper = document.createElement("div");

    wrapper.className = "variant-item";

    wrapper.innerHTML = `
        <div class="variant-header">

            <input
                type="text"
                class="variant-name"
                placeholder="Variant name"
                value="${escapeHtmlAttribute(variant.name || "")}"
            >

            <button
                type="button"
                class="remove-variant-btn"
            >
                Remove
            </button>

        </div>

        <div class="variant-image-box">

            <input
                type="file"
                class="variant-image"
                accept="image/*"
            >

            ${
                variant.image_url
                    ? `
                        <img
                            class="variant-image-preview"
                            src="${escapeHtmlAttribute(variant.image_url)}"
                            style="display:block;"
                        >
                    `
                    : `
                        <img
                            class="variant-image-preview"
                            style="display:none;"
                        >
                    `
            }

        </div>

        <div class="variant-sizes">

            <div class="sizes-list"></div>

            <button
                type="button"
                class="add-size-btn"
            >
                + Add Size
            </button>

        </div>
    `;

    variantsContainer.appendChild(wrapper);

    const removeBtn =
        wrapper.querySelector(".remove-variant-btn");

    removeBtn.addEventListener("click", () => {
        wrapper.remove();
    });

    const imageInput =
        wrapper.querySelector(".variant-image");

    const imagePreview =
        wrapper.querySelector(".variant-image-preview");

    imageInput.addEventListener("change", () => {

        const file = imageInput.files[0];

        if (!file) {
            imagePreview.style.display = "none";
            return;
        }

        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";
    });

    const addSizeButton =
        wrapper.querySelector(".add-size-btn");

    addSizeButton.addEventListener("click", () => {
        createSizeElement(
            wrapper.querySelector(".sizes-list")
        );
    });

    if (variant.sizes && Array.isArray(variant.sizes)) {

        variant.sizes.forEach((size) => {

            createSizeElement(
                wrapper.querySelector(".sizes-list"),
                size
            );

        });

    } else {

        createSizeElement(
            wrapper.querySelector(".sizes-list")
        );
    }
}


/* =========================================================
   CREATE SIZE
   ========================================================= */

function createSizeElement(container, size = {}) {

    if (!container) {
        return;
    }

    const wrapper = document.createElement("div");

    wrapper.className = "size-item";

    wrapper.innerHTML = `
        <input
            type="text"
            class="size-name"
            placeholder="Size"
            value="${escapeHtmlAttribute(size.size || "")}"
        >

        <input
            type="number"
            class="size-price"
            placeholder="Price"
            min="0"
            step="0.01"
            value="${size.price ?? ""}"
        >

        <input
            type="number"
            class="size-stock"
            placeholder="Stock"
            min="0"
            step="1"
            value="${size.stock ?? 0}"
        >

        <button
            type="button"
            class="remove-size-btn"
        >
            Remove
        </button>
    `;

    container.appendChild(wrapper);

    wrapper
        .querySelector(".remove-size-btn")
        .addEventListener("click", () => {
            wrapper.remove();
        });
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtmlAttribute(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* =========================================================
   UPLOAD IMAGE
   ========================================================= */

async function uploadImage(file, folder = "products") {

    if (!file) {
        return null;
    }

    const extension =
        file.name.split(".").pop().toLowerCase();

    const fileName =
        `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await sb
        .storage
        .from("product-images")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data } = sb
        .storage
        .from("product-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
}


/* =========================================================
   COLLECT PRODUCT FORM
   ========================================================= */

function collectProductForm() {

    const name =
        productNameAdmin.value.trim();

    const regularPriceValue =
        regularPriceAdmin
            ? regularPriceAdmin.value.trim()
            : "";

    const salePriceValue =
        basePriceAdmin.value.trim();

    const description =
        descriptionAdmin.value.trim();

    const regularPrice =
        regularPriceValue === ""
            ? null
            : Number(regularPriceValue);

    const salePrice =
        Number(salePriceValue);

    if (!name) {
        throw new Error("Product name is required.");
    }

    if (
        regularPrice !== null &&
        (
            Number.isNaN(regularPrice) ||
            regularPrice < 0
        )
    ) {
        throw new Error("Please enter a valid regular price.");
    }

    if (
        Number.isNaN(salePrice) ||
        salePrice < 0
    ) {
        throw new Error("Please enter a valid sale price.");
    }

    if (
        regularPrice !== null &&
        regularPrice > 0 &&
        salePrice > regularPrice
    ) {
        throw new Error(
            "Sale price cannot be higher than regular price."
        );
    }

    const variants = [];

    document
        .querySelectorAll(".variant-item")
        .forEach((variantElement) => {

            const variantName =
                variantElement
                    .querySelector(".variant-name")
                    .value
                    .trim();

            const variantImage =
                variantElement
                    .querySelector(".variant-image")
                    .files[0] || null;

            const existingImage =
                variantElement
                    .querySelector(".variant-image-preview")
                    ?.getAttribute("src") || null;

            const sizes = [];

            variantElement
                .querySelectorAll(".size-item")
                .forEach((sizeElement) => {

                    const sizeName =
                        sizeElement
                            .querySelector(".size-name")
                            .value
                            .trim();

                    const priceValue =
                        sizeElement
                            .querySelector(".size-price")
                            .value
                            .trim();

                    const stockValue =
                        sizeElement
                            .querySelector(".size-stock")
                            .value
                            .trim();

                    if (!sizeName) {
                        return;
                    }

                    const price =
                        priceValue === ""
                            ? salePrice
                            : Number(priceValue);

                    const stock =
                        stockValue === ""
                            ? 0
                            : Number(stockValue);

                    sizes.push({
                        size: sizeName,
                        price,
                        stock
                    });
                });

            if (variantName) {

                variants.push({
                    name: variantName,
                    imageFile: variantImage,
                    image_url: existingImage,
                    sizes
                });
            }
        });

    return {
        name,
        regularPrice,
        salePrice,
        description,
        mainImageFile:
            mainImageAdmin.files[0] || null,
        variants,
        allowCod:
            allowCodAdmin
                ? allowCodAdmin.checked
                : true,
        allowAdvance:
            allowAdvanceAdmin
                ? allowAdvanceAdmin.checked
                : false
    };
}


/* =========================================================
   SAVE PRODUCT
   ========================================================= */

async function saveProduct(event) {

    event.preventDefault();

    hideAlert();

    try {

        const product =
            collectProductForm();

        if (
            !editingProductId &&
            !product.mainImageFile
        ) {
            throw new Error(
                "Please select a main product image."
            );
        }

        saveProductBtn.disabled = true;
        saveProductBtn.textContent = "Saving...";

        let mainImageUrl = null;

        /*
         * EDIT PRODUCT
         * Keep old image if no new image selected.
         */

        if (editingProductId) {

            const { data: existingProduct, error } =
                await sb
                    .from("products")
                    .select("main_image_url")
                    .eq("id", editingProductId)
                    .single();

            if (error) {
                throw error;
            }

            mainImageUrl =
                existingProduct.main_image_url;

            if (product.mainImageFile) {

                mainImageUrl =
                    await uploadImage(
                        product.mainImageFile,
                        "products"
                    );
            }

        } else {

            mainImageUrl =
                await uploadImage(
                    product.mainImageFile,
                    "products"
                );
        }


        /* =====================================================
           PRODUCT DATA
           ===================================================== */

        const productData = {

            name: product.name,

            regular_price:
                product.regularPrice,

            base_price:
                product.salePrice,

            description:
                product.description,

            main_image_url:
                mainImageUrl,

            allow_cod:
                product.allowCod,

            allow_advance:
                product.allowAdvance,

            active: true
        };


        /* =====================================================
           ADD PRODUCT
           ===================================================== */

        if (!editingProductId) {

            const {
                data: insertedProduct,
                error
            } = await sb
                .from("products")
                .insert(productData)
                .select()
                .single();

            if (error) {
                throw error;
            }

            const productId =
                insertedProduct.id;

            await saveVariants(
                productId,
                product.variants
            );

            showAlert(
                "Product added successfully.",
                "success"
            );

        }

        /* =====================================================
           EDIT PRODUCT
           ===================================================== */

        else {

            const {
                error
  
