/* =========================================================
   MY SHOP ADMIN PANEL
   Product Add + Product Edit + Stock Update + Orders
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
const loginButton = $("loginButton");
const loginMessage = $("loginMessage");

const adminUserEmail = $("adminUserEmail");
const logoutButton = $("logoutButton");

const productForm = $("productForm");
const productNameAdmin = $("productNameAdmin");
const basePriceAdmin = $("basePriceAdmin");
const descriptionAdmin = $("descriptionAdmin");
const mainImageAdmin = $("mainImageAdmin");

const mainImagePreview = $("mainImagePreview");
const mainImagePreviewImg = $("mainImagePreviewImg");

const variantsContainer = $("variantsContainer");
const addVariantButton = $("addVariantButton");

const saveProductButton = $("saveProductButton");
const resetProductButton = $("resetProductButton");
const productFormAlert = $("productFormAlert");

const adminProductsList = $("adminProductsList");
const adminOrdersList = $("adminOrdersList");

const statProducts = $("statProducts");
const statStock = $("statStock");
const statPendingOrders = $("statPendingOrders");
const statCompletedOrders = $("statCompletedOrders");


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let editingProductId = null;
let existingMainImageUrl = "";
let currentProducts = [];
let currentOrders = [];


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function money(value) {
    return Number(value || 0).toLocaleString("en-BD");
}


function formatDate(value) {
    if (!value) return "";

    return new Date(value).toLocaleString("en-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}


function showAlert(message, type = "info") {
    if (!productFormAlert) return;

    productFormAlert.textContent = message;
    productFormAlert.className = "form-alert " + type;
}


function clearAlert() {
    if (!productFormAlert) return;

    productFormAlert.textContent = "";
    productFormAlert.className = "form-alert";
}


/* =========================================================
   LOGIN / LOGOUT
   ========================================================= */

function showLogin() {
    if (adminLogin) adminLogin.style.display = "";
    if (adminDashboard) adminDashboard.style.display = "none";
}


function showDashboard() {
    if (adminLogin) adminLogin.style.display = "none";
    if (adminDashboard) adminDashboard.style.display = "";

    if (adminUserEmail && currentUser) {
        adminUserEmail.textContent = currentUser.email || "";
    }
}


async function verifyAdmin(user) {

    if (!user) return false;

    const { data, error } = await sb
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Admin verification error:", error);
        return false;
    }

    return !!data;
}


async function checkInitialSession() {

    showLogin();

    const { data, error } = await sb.auth.getSession();

    if (error) {
        console.error(error);
        return;
    }

    const session = data.session;

    if (!session) {
        showLogin();
        return;
    }

    const isAdmin = await verifyAdmin(session.user);

    if (!isAdmin) {
        await sb.auth.signOut();

        if (loginMessage) {
            loginMessage.textContent =
                "এই account-এর admin access নেই।";
        }

        showLogin();
        return;
    }

    currentUser = session.user;

    showDashboard();

    await loadEverything();
}


async function handleLogin(event) {

    event.preventDefault();

    if (!loginButton) return;

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    if (loginMessage) {
        loginMessage.textContent = "";
    }

    try {

        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        const { data, error } = await sb.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        const user = data.user;

        const isAdmin = await verifyAdmin(user);

        if (!isAdmin) {

            await sb.auth.signOut();

            throw new Error(
                "Login হয়েছে, কিন্তু এই account-এর Admin access নেই।"
            );
        }

        currentUser = user;

        showDashboard();

        await loadEverything();

    } catch (error) {

        console.error(error);

        if (loginMessage) {
            loginMessage.textContent =
                error.message || "Login failed.";
        }

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
}


async function handleLogout() {

    await sb.auth.signOut();

    currentUser = null;
    editingProductId = null;

    resetProductForm();

    showLogin();
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function openSection(sectionName) {

    document.querySelectorAll(".admin-section").forEach(section => {
        section.style.display =
            section.dataset.section === sectionName
                ? ""
                : "none";
    });

    document.querySelectorAll(".admin-nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });
}


/* =========================================================
   IMAGE PREVIEW
   ========================================================= */

if (mainImageAdmin) {

    mainImageAdmin.addEventListener("change", () => {

        const file = mainImageAdmin.files?.[0];

        if (!file) {
            if (mainImagePreview) {
                mainImagePreview.style.display =
                    existingMainImageUrl ? "" : "none";
            }

            return;
        }

        const url = URL.createObjectURL(file);

        if (mainImagePreviewImg) {
            mainImagePreviewImg.src = url;
        }

        if (mainImagePreview) {
            mainImagePreview.style.display = "";
        }
    });
}


/* =========================================================
   VARIANT UI
   ========================================================= */

function createVariantElement(variant = {}) {

    const wrapper = document.createElement("div");

    wrapper.className = "admin-variant";

    wrapper.innerHTML = `
        <div class="variant-header">

            <div>
                <strong>Variant</strong>
            </div>

            <button
                type="button"
                class="remove-variant-button"
            >
                Remove
            </button>

        </div>

        <input
            type="hidden"
            class="variant-id"
            value="${escapeHTML(variant.id || "")}"
        >

        <div class="admin-form-group">

            <label>
                Variant Name
            </label>

            <input
                type="text"
                class="variant-name"
                placeholder="যেমন: Black / Blue / Red"
                value="${escapeHTML(variant.name || "")}"
                required
            >

        </div>

        <div class="admin-form-group">

            <label>
                Variant Image
            </label>

            <input
                type="file"
                class="variant-image"
                accept="image/*"
            >

        </div>

        <div class="variant-existing-image">
            ${
                variant.image_url
                    ? `
                        <img
                            src="${escapeHTML(variant.image_url)}"
                            alt=""
                        >
                    `
                    : ""
            }
        </div>

        <input
            type="hidden"
            class="existing-variant-image-url"
            value="${escapeHTML(variant.image_url || "")}"
        >

        <div class="sizes-title">
            Sizes / Price / Stock
        </div>

        <div class="variant-sizes">
        </div>

        <button
            type="button"
            class="add-size-button"
        >
            + Add Size
        </button>
    `;

    const sizesContainer =
        wrapper.querySelector(".variant-sizes");

    const addSizeButton =
        wrapper.querySelector(".add-size-button");

    const removeVariantButton =
        wrapper.querySelector(".remove-variant-button");


    if (Array.isArray(variant.sizes)) {

        variant.sizes.forEach(size => {
            addSizeElement(sizesContainer, size);
        });

    }


    addSizeButton.addEventListener("click", () => {
        addSizeElement(sizesContainer);
    });


    removeVariantButton.addEventListener("click", () => {
        wrapper.remove();
    });


    variantsContainer.appendChild(wrapper);
}


function addSizeElement(container, size = {}) {

    const row = document.createElement("div");

    row.className = "admin-size-row";

    row.innerHTML = `
        <input
            type="hidden"
            class="size-id"
            value="${escapeHTML(size.id || "")}"
        >

        <input
            type="text"
            class="size-name"
            placeholder="Size"
            value="${escapeHTML(size.size || "")}"
            required
        >

        <input
            type="number"
            class="size-price"
            placeholder="Price"
            min="0"
            step="0.01"
            value="${size.price ?? ""}"
            required
        >

        <input
            type="number"
            class="size-stock"
            placeholder="Stock"
            min="0"
            step="1"
            value="${size.stock ?? 0}"
            required
        >

        <button
            type="button"
            class="remove-size-button"
            title="Remove size"
        >
            ×
        </button>
    `;

    row.querySelector(".remove-size-button")
        .addEventListener("click", () => {
            row.remove();
        });

    container.appendChild(row);
}


function clearVariants() {

    if (variantsContainer) {
        variantsContainer.innerHTML = "";
    }
}


function addNewVariant() {

    createVariantElement({
        name: "",
        image_url: "",
        sizes: []
    });
}


if (addVariantButton) {
    addVariantButton.addEventListener(
        "click",
        addNewVariant
    );
}


/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

async function uploadProductImage(file) {

    if (!file) return null;

    const extension =
        file.name.split(".").pop().toLowerCase();

    const filename =
        `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await sb.storage
        .from("product-images")
        .upload(filename, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data } = sb.storage
        .from("product-images")
        .getPublicUrl(filename);

    return data.publicUrl;
}


async function uploadVariantImage(file) {

    if (!file) return null;

    const extension =
        file.name.split(".").pop().toLowerCase();

    const filename =
        `variants/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await sb.storage
        .from("product-images")
        .upload(filename, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data } = sb.storage
        .from("product-images")
        .getPublicUrl(filename);

    return data.publicUrl;
}


/* =========================================================
   COLLECT FORM DATA
   ========================================================= */

function collectProductForm() {

    const name =
        productNameAdmin.value.trim();

    const basePrice =
        Number(basePriceAdmin.value || 0);

    const description =
        descriptionAdmin.value.trim();


    if (!name) {
        throw new Error("Product name দিন।");
    }


    const variantElements =
        [...document.querySelectorAll(".admin-variant")];

    if (!variantElements.length) {
        throw new Error(
            "কমপক্ষে একটি variant যোগ করুন।"
        );
    }


    const variants = [];


    variantElements.forEach((variantEl, index) => {

        const id =
            variantEl.querySelector(".variant-id")?.value || "";

        const variantName =
            variantEl.querySelector(".variant-name")
                ?.value.trim();

        const existingImage =
            variantEl.querySelector(
                ".existing-variant-image-url"
            )?.value || "";

        const imageFile =
            variantEl.querySelector(".variant-image")
                ?.files?.[0] || null;


        if (!variantName) {
            throw new Error(
                `Variant ${index + 1}-এর নাম দিন।`
            );
        }


        const sizeElements =
            [...variantEl.querySelectorAll(".admin-size-row")];

        if (!sizeElements.length) {
            throw new Error(
                `"${variantName}" variant-এর অন্তত একটি size দিন।`
            );
        }


        const sizes = [];


        sizeElements.forEach((sizeEl, sizeIndex) => {

            const sizeId =
                sizeEl.querySelector(".size-id")?.value || "";

            const sizeName =
                sizeEl.querySelector(".size-name")
                    ?.value.trim();

            const price =
                Number(
                    sizeEl.querySelector(".size-price")
                        ?.value || 0
                );

            const stock =
                Number(
                    sizeEl.querySelector(".size-stock")
                        ?.value || 0
                );


            if (!sizeName) {
                throw new Error(
                    `"${variantName}" এর Size ${sizeIndex + 1}-এর নাম দিন।`
                );
            }


            if (price < 0) {
                throw new Error(
                    `"${sizeName}" এর price সঠিক নয়।`
                );
            }


            if (stock < 0) {
                throw new Error(
                    `"${sizeName}" এর stock সঠিক নয়।`
                );
            }


            sizes.push({
                id: sizeId || null,
                size: sizeName,
                price,
                stock,
                active: true
            });

        });


        variants.push({
            id: id || null,
            name: variantName,
            imageFile,
            image_url: existingImage,
            sizes
        });

    });


    return {
        name,
        basePrice,
        description,
        variants
    };
}


/* =========================================================
   SAVE PRODUCT
   ADD + EDIT
   ========================================================= */

async function saveProduct(event) {

    event.preventDefault();

    if (!currentUser) {
        showAlert(
            "প্রথমে Admin login করুন।",
            "error"
        );
        return;
    }


    clearAlert();

    saveProductButton.disabled = true;

    saveProductButton.textContent =
        editingProductId
            ? "Updating..."
            : "Saving...";


    try {

        const product =
            collectProductForm();


        /* =========================================
           MAIN IMAGE
        ========================================= */

        let mainImageUrl =
            existingMainImageUrl || null;


        const mainImageFile =
            mainImageAdmin?.files?.[0];


        if (mainImageFile) {

            mainImageUrl =
                await uploadProductImage(
                    mainImageFile
                );
        }


        /* =========================================
           UPDATE EXISTING PRODUCT
        ========================================= */

        if (editingProductId) {

            const { error: productError } =
                await sb
                    .from("products")
                    .update({
                        name: product.name,
                        description: product.description,
                        base_price: product.basePrice,
                        main_image_url: mainImageUrl
                    })
                    .eq("id", editingProductId);


            if (productError) {
                throw productError;
            }


            /* =====================================
               EXISTING / NEW VARIANTS
            ===================================== */

            for (const variant of product.variants) {

                let variantId = variant.id;


                /* NEW VARIANT */

                if (!variantId) {

                    let variantImageUrl =
                        variant.image_url || null;


                    if (variant.imageFile) {

                        variantImageUrl =
                            await uploadVariantImage(
                                variant.imageFile
                            );
                    }


                    const { data, error } =
                        await sb
                            .from("product_variants")
                            .insert({
                                product_id:
                                    editingProductId,
                                name: variant.name,
                                image_url:
                                    variantImageUrl,
                                active: true
                            })
                            .select("id")
                            .single();


                    if (error) {
                        throw error;
                    }


                    variantId = data.id;

                }


                /* UPDATE EXISTING VARIANT */

                else {

                    let variantImageUrl =
                        variant.image_url || null;


                    if (variant.imageFile) {

                        variantImageUrl =
                            await uploadVariantImage(
                                variant.imageFile
                            );
                    }


                    const { error } =
                        await sb
                            .from("product_variants")
                            .update({
                                name: variant.name,
                                image_url:
                                    variantImage_url_safe(
                                        variantImageUrl
                                    ),
                                active: true
                            })
                            .eq("id", variantId);


                    if (error) {
                        throw error;
                    }
                }


                /* =================================
                   SIZES
                ================================= */

                for (const size of variant.sizes) {

                    /* EXISTING SIZE */

                    if (size.id) {

                        const { error } =
                            await sb
                                .from("variant_sizes")
                                .update({
                                    size: size.size,
                                    price: size.price,
                                    stock: size.stock,
                                    active: true
                                })
                                .eq("id", size.id)
                                .eq(
                                    "variant_id",
                                    variantId
                                );


                        if (error) {
                            throw error;
                        }

                    }

                    /* NEW SIZE */

                    else {

                        const { error } =
                            await sb
                                .from("variant_sizes")
                                .insert({
                                    variant_id: variantId,
                                    size: size.size,
                                    price: size.price,
                                    stock: size.stock,
                                    active: true
                                });


                        if (error) {
                            throw error;
                        }
                    }

                }

            }


            showAlert(
                "Product এবং Stock সফলভাবে update হয়েছে।",
                "success"
            );

        }


        /* =========================================
           ADD NEW PRODUCT
        ========================================= */

        else {

            const { data: productData, error: productError } =
                await sb
                    .from("products")
                    .insert({
                        name: product.name,
                        description: product.description,
                        base_price: product.basePrice,
                        main_image_url: mainImageUrl,
                        active: true
                    })
                    .select("id")
                    .single();


            if (productError) {
                throw productError;
            }


            const productId =
                productData.id;


            for (const variant of product.variants) {

                let variantImageUrl =
                    variant.image_url || null;


                if (variant.imageFile) {

                    variantImageUrl =
                        await uploadVariantImage(
                            variant.imageFile
                        );
                }


                const { data: variantData, error: variantError } =
                    await sb
                        .from("product_variants")
                        .insert({
                            product_id: productId,
                            name: variant.name,
                            image_url: variantImageUrl,
                            active: true
                        })
                        .select("id")
                        .single();


                if (variantError) {
                    throw variantError;
                }


                for (const size of variant.sizes) {

                    const { error: sizeError } =
                        await sb
                            .from("variant_sizes")
                            .insert({
                                variant_id:
                                    variantData.id,
                                size: size.size,
                                price: size.price,
                                stock: size.stock,
                                active: true
                            });


                    if (sizeError) {
                        throw sizeError;
                    }
                }
            }


            showAlert(
                "নতুন Product সফলভাবে যোগ হয়েছে।",
                "success"
            );
        }


        resetProductForm();

        await loadProducts();

        await loadStats();


    } catch (error) {

        console.error("Save product error:", error);

        showAlert(
            error.message ||
            "Product save করতে সমস্যা হয়েছে।",
            "error"
        );

    } finally {

        saveProductButton.disabled = false;

        saveProductButton.textContent =
            editingProductId
                ? "Update Product"
                : "Save Product";
    }
}


/* =========================================================
   IMAGE URL SAFE HELPER
   ========================================================= */

function variantImage_url_safe(value) {
    return value || null;
}


/* =========================================================
   RESET PRODUCT FORM
   ========================================================= */

function resetProductForm() {

    editingProductId = null;
    existingMainImageUrl = "";


    if (productForm) {
        productForm.reset();
    }


    if (mainImagePreview) {
        mainImagePreview.style.display = "none";
    }


    if (mainImagePreviewImg) {
        mainImagePreviewImg.src = "";
    }


    clearVariants();


    /*
       নতুন Product-এর জন্য একটি Variant
       এবং একটি Size দিয়ে শুরু হবে।
    */

    createVariantElement({
        name: "",
        image_url: "",
        sizes: [
            {
                size: "",
                price: 0,
                stock: 0
            }
        ]
    });


    if (saveProductButton) {
        saveProductButton.textContent =
            "Save Product";
    }


    if (productForm) {
        productForm.dataset.mode = "add";
    }


    clearAlert();
}


if (resetProductButton) {
    resetProductButton.addEventListener(
        "click",
        resetProductForm
    );
}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

async function editProduct(productId) {

    try {

        showAlert(
            "Product information loading...",
            "info"
        );


        const { data, error } =
            await sb
                .from("products")
                .select(`
                    id,
                    name,
                    description,
                    base_price,
                    main_image_url,
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
                .eq("id", productId)
                .single();


        if (error) {
            throw error;
        }


        editingProductId = data.id;

        existingMainImageUrl =
            data.main_image_url || "";


        productNameAdmin.value =
            data.name || "";

        basePriceAdmin.value =
            data.base_price ?? "";

        descriptionAdmin.value =
            data.description || "";


        if (mainImagePreviewImg) {

            mainImagePreviewImg.src =
                data.main_image_url || "";

        }


        if (mainImagePreview) {

            mainImagePreview.style.display =
                data.main_image_url
                    ? ""
                    : "none";
        }


        clearVariants();


        const variants =
            data.product_variants || [];


        variants.forEach(variant => {

            createVariantElement({
                id: variant.id,
                name: variant.name,
                image_url: variant.image_url,
                sizes: variant.variant_sizes || []
            });

        });


        if (!variants.length) {

            createVariantElement({
                name: "",
                sizes: [
                    {
                        size: "",
                        price: data.base_price || 0,
                        stock: 0
                    }
                ]
            });
        }


        if (saveProductButton) {

            saveProductButton.textContent =
                "Update Product";
        }


        if (productForm) {
            productForm.dataset.mode = "edit";
        }


        openSection("add-product");


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        clearAlert();


    } catch (error) {

        console.error(error);

        showAlert(
            error.message ||
            "Product load করতে সমস্যা হয়েছে।",
            "error"
        );
    }
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

    const { data, error } =
        await sb
            .from("products")
            .select(`
                id,
                name,
                description,
                base_price,
                main_image_url,
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
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(error);

        if (adminProductsList) {
            adminProductsList.innerHTML =
                `<div class="admin-error">
                    ${escapeHTML(error.message)}
                </div>`;
        }

        return;
    }


    currentProducts = data || [];

    renderProducts();
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts() {

    if (!adminProductsList) return;


    if (!currentProducts.length) {

        adminProductsList.innerHTML = `
            <div class="empty-admin">
                কোনো Product নেই।
            </div>
        `;

        return;
    }


    adminProductsList.innerHTML =
        currentProducts.map(product => {

            let totalStock = 0;
            let totalSizes = 0;


            (product.product_variants || [])
                .forEach(variant => {

                    (variant.variant_sizes || [])
                        .forEach(size => {

                            if (size.active !== false) {
                                totalStock +=
                                    Number(size.stock || 0);

                                totalSizes++;
                            }

                        });

                });


            const status =
                product.active === false
                    ? "Inactive"
                    : "Active";


            return `
                <div class="admin-product-card">

                    <div class="admin-product-image">

                        ${
                            product.main_image_url
                                ? `
                                    <img
                                        src="${escapeHTML(
                                            product.main_image_url
                                        )}"
                                        alt="${escapeHTML(
                                            product.name
                                        )}"
                                    >
                                `
                                : `
                                    <div class="no-image">
                                        No Image
                                    </div>
                                `
                        }

                    </div>


                    <div class="admin-product-info">

                        <h3>
                            ${escapeHTML(product.name)}
                        </h3>

                        <div class="admin-product-meta">
                            Base Price:
                            ৳${money(product.base_price)}
                        </div>

                        <div class="admin-product-meta">
                            Total Stock:
                            <strong>
                                ${totalStock}
                            </strong>
                        </div>

                        <div class="admin-product-meta">
                            Sizes:
                            ${totalSizes}
                        </div>

                        <div class="admin-product-status ${
                            product.active === false
                                ? "inactive"
                                : "active"
                        }">
                            ${status}
                        </div>

                    </div>


                    <div class="admin-product-actions">

                        <button
                            type="button"
                            class="admin-edit-button"
                            onclick="editProduct(${product.id})"
                        >
                            ✏️ Edit / Stock
                        </button>

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   ORDERS
   ========================================================= */

async function loadOrders() {

    const { data, error } =
        await sb
            .from("orders")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(error);

        if (adminOrdersList) {
            adminOrdersList.innerHTML =
                `<div class="admin-error">
                    ${escapeHTML(error.message)}
                </div>`;
        }

        return;
    }


    currentOrders = data || [];

    renderOrders();
}


function renderOrders() {

    if (!adminOrdersList) return;


    if (!currentOrders.length) {

        adminOrdersList.innerHTML = `
            <div class="empty-admin">
                কোনো Order নেই।
            </div>
        `;

        return;
    }


    adminOrdersList.innerHTML =
        currentOrders.map(order => {

            const completed =
                order.status === "completed";


            return `
                <div class="admin-order-card">

                    <div class="order-main">

                        <div class="order-title">
                            Order #${escapeHTML(order.id)}
                        </div>

                        <div class="order-customer">
                            ${escapeHTML(
                                order.customer_name
                            )}
                        </div>

                        <div class="order-phone">
                            ${escapeHTML(
                                order.phone
                            )}
                        </div>

                        <div class="order-product">
                            ${escapeHTML(
                                order.product_name
                            )}
                        </div>

                        <div class="order-variant">
                            ${
                                escapeHTML(
                                    order.variety || ""
                                )
                            }

                            ${
                                order.size
                                    ? " · " +
                                      escapeHTML(order.size)
                                    : ""
                            }

                            · Qty:
                            ${escapeHTML(order.quantity)}
                        </div>

                        <div class="order-address">
                            ${escapeHTML(
                                order.address || ""
                            )}

                            ${
                                order.upazila
                                    ? ", " +
                                      escapeHTML(
                                          order.upazila
                                      )
                                    : ""
                            }

                            ${
                                order.district
                                    ? ", " +
                                      escapeHTML(
                                          order.district
                                      )
                                    : ""
                            }
                        </div>

                        <div class="order-total">
                            Total:
                            ৳${money(order.total_price)}
                        </div>

                        <div class="order-date">
                            ${formatDate(
                                order.created_at
                            )}
                        </div>

                    </div>


                    <div class="order-actions">

                        <span class="order-status ${
                            completed
                                ? "completed"
                                : "pending"
                        }">
                            ${
                                completed
                                    ? "Completed"
                                    : "Pending"
                            }
                        </span>


                        ${
                            !completed
                                ? `
                                    <button
                                        type="button"
                                        class="complete-order-button"
                                        onclick="completeOrder(${order.id})"
                                    >
                                        Complete Order
                                    </button>
                                `
                                : ""
                        }

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   COMPLETE ORDER
   ========================================================= */

async function completeOrder(orderId) {

    if (!confirm(
        "এই Order-টি Completed হিসেবে mark করবেন?"
    )) {
        return;
    }


    const { error } =
        await sb
            .from("orders")
            .update({
                status: "completed"
            })
            .eq("id", orderId);


    if (error) {

        alert(
            "Order update failed: " +
            error.message
        );

        return;
    }


    await loadOrders();

    await loadStats();
}


/* =========================================================
   STATS
   ========================================================= */

async function loadStats() {

    const { data: products, error: productError } =
        await sb
            .from("products")
            .select("id, active");


    if (!productError) {

        const activeProducts =
            (products || [])
                .filter(p => p.active !== false);


        if (statProducts) {
            statProducts.textContent =
                activeProducts.length;
        }
    }


    const { data: sizes, error: sizeError } =
        await sb
            .from("variant_sizes")
            .select("stock, active");


    if (!sizeError) {

        const totalStock =
            (sizes || [])
                .filter(s => s.active !== false)
                .reduce(
                    (sum, item) =>
                        sum + Number(item.stock || 0),
                    0
                );


        if (statStock) {
            statStock.textContent =
                totalStock;
        }
    }


    const { data: orders, error: orderError } =
        await sb
            .from("orders")
            .select("status");


    if (!orderError) {

        const pending =
            (orders || [])
                .filter(o => o.status === "pending")
                .length;


        const completed =
            (orders || [])
                .filter(o => o.status === "completed")
                .length;


        if (statPendingOrders) {
            statPendingOrders.textContent =
                pending;
        }


        if (statCompletedOrders) {
            statCompletedOrders.textContent =
                completed;
        }
    }
}


/* =========================================================
   LOAD EVERYTHING
   ========================================================= */

async function loadEverything() {

    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadStats()
    ]);
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

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


if (productForm) {
    productForm.addEventListener(
        "submit",
        saveProduct
    );
}


/* ADMIN NAV */

document.querySelectorAll(
    ".admin-nav-btn"
).forEach(button => {

    button.addEventListener("click", () => {

        const section =
            button.dataset.section;

        if (section) {
            openSection(section);
        }

    });

});


/* OTHER OPEN SECTION BUTTONS */

document.querySelectorAll(
    "[data-open-section]"
).forEach(button => {

    button.addEventListener("click", () => {

        openSection(
            button.dataset.openSection
        );

    });

});


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
    (event, session) => {

        if (event === "SIGNED_OUT") {

            currentUser = null;

            showLogin();
        }

    }
);


/* =========================================================
   START
   ========================================================= */

checkInitialSession();
