/* =========================================================
   MY SHOP ADMIN PANEL

   Login
   Dashboard
   Add Product
   Edit Product
   Stock Update
   Orders
   Order Filters
   Payment Method Settings
   Store Settings
   About Us
   Contact Information
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


/* LOGIN */

const adminLogin = $("adminLogin");
const adminDashboard = $("adminDashboard");

const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginButton = $("loginButton");
const loginMessage = $("loginMessage");


/* HEADER */

const adminUserEmail = $("adminUserEmail");
const logoutButton = $("logoutButton");


/* PRODUCT FORM */

const productForm = $("productForm");

const productNameAdmin =
    $("productNameAdmin");

const regularPriceAdmin =
    $("regularPriceAdmin");

const basePriceAdmin =
    $("basePriceAdmin");

const descriptionAdmin =
    $("descriptionAdmin");

const mainImageAdmin =
    $("mainImageAdmin");

const mainImagePreview =
    $("mainImagePreview");

const mainImagePreviewImg =
    $("mainImagePreviewImg");


/* VARIANTS */

const variantsContainer =
    $("variantsContainer");

const addVariantButton =
    $("addVariantButton");


/* PRODUCT ACTIONS */

const saveProductButton =
    $("saveProductButton");

const resetProductButton =
    $("resetProductButton");

const productFormAlert =
    $("productFormAlert");


/* PAYMENT */

const adminAllowCodCheckbox =
    $("allowCodAdmin");

const adminAllowAdvanceCheckbox =
    $("allowAdvanceAdmin");

const adminPaymentWarning =
    $("paymentWarningAdmin");


/* PRODUCT / ORDER LIST */

const adminProductsList =
    $("adminProductsList");

const adminOrdersList =
    $("adminOrdersList");


/* STATS */

const statProducts =
    $("statProducts");

const statStock =
    $("statStock");

const statPendingOrders =
    $("statPendingOrders");

const statCompletedOrders =
    $("statCompletedOrders");


/* =========================================================
   STORE SETTINGS DOM
   ========================================================= */

const storeSettingsForm =
    $("storeSettingsForm");

const storeSettingsAlert =
    $("storeSettingsAlert");

const aboutUsAdmin =
    $("aboutUsAdmin");

const contactPhoneAdmin =
    $("contactPhoneAdmin");

const contactWhatsappAdmin =
    $("contactWhatsappAdmin");

const contactEmailAdmin =
    $("contactEmailAdmin");

const contactAddressAdmin =
    $("contactAddressAdmin");

const contactFacebookAdmin =
    $("contactFacebookAdmin");

const contactInstagramAdmin =
    $("contactInstagramAdmin");

const saveStoreSettingsButton =
    $("saveStoreSettingsButton");


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;

let editingProductId = null;

let existingMainImageUrl = "";

let currentProducts = [];

let currentOrders = [];

let currentOrderFilter = "all";


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

    return Number(value || 0)
        .toLocaleString("en-BD");
}


function formatDate(value) {

    if (!value) return "";

    return new Date(value)
        .toLocaleString("en-BD", {

            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"

        });
}


function normalizeOrderStatus(status) {

    return String(status || "")
        .trim()
        .toLowerCase();
}


/* =========================================================
   PRODUCT ALERT
   ========================================================= */

function showAlert(
    message,
    type = "info"
) {

    if (!productFormAlert) return;

    productFormAlert.textContent =
        message;

    productFormAlert.className =
        "form-alert " + type;

    productFormAlert.style.display =
        "block";
}


function clearAlert() {

    if (!productFormAlert) return;

    productFormAlert.textContent =
        "";

    productFormAlert.className =
        "form-alert";

    productFormAlert.style.display =
        "none";
}


/* =========================================================
   STORE SETTINGS ALERT
   ========================================================= */

function showStoreSettingsAlert(
    message,
    type = "info"
) {

    if (!storeSettingsAlert) return;

    storeSettingsAlert.textContent =
        message;

    storeSettingsAlert.className =
        "form-alert " + type;

    storeSettingsAlert.style.display =
        "block";
}


function clearStoreSettingsAlert() {

    if (!storeSettingsAlert) return;

    storeSettingsAlert.textContent =
        "";

    storeSettingsAlert.className =
        "form-alert";

    storeSettingsAlert.style.display =
        "none";
}


/* =========================================================
   PAYMENT SETTINGS
   ========================================================= */

function checkPaymentMethodsAdmin() {

    const codEnabled =
        !!adminAllowCodCheckbox?.checked;

    const advanceEnabled =
        !!adminAllowAdvanceCheckbox?.checked;

    if (!adminPaymentWarning) {
        return;
    }

    adminPaymentWarning.style.display =
        (!codEnabled && !advanceEnabled)
            ? "block"
            : "none";
}


if (adminAllowCodCheckbox) {

    adminAllowCodCheckbox.addEventListener(
        "change",
        checkPaymentMethodsAdmin
    );
}


if (adminAllowAdvanceCheckbox) {

    adminAllowAdvanceCheckbox.addEventListener(
        "change",
        checkPaymentMethodsAdmin
    );
}


/* =========================================================
   LOGIN / DASHBOARD
   ========================================================= */

function showLogin() {

    if (adminLogin) {
        adminLogin.style.display =
            "flex";
    }

    if (adminDashboard) {
        adminDashboard.style.display =
            "none";
    }
}


function showDashboard() {

    if (adminLogin) {
        adminLogin.style.display =
            "none";
    }

    if (adminDashboard) {
        adminDashboard.style.display =
            "block";
    }

    if (
        adminUserEmail &&
        currentUser
    ) {

        adminUserEmail.textContent =
            currentUser.email || "";
    }
}


/* =========================================================
   VERIFY ADMIN
   ========================================================= */

async function verifyAdmin(user) {

    if (!user) {
        return false;
    }

    const {
        data,
        error
    } = await sb
        .from("admin_users")
        .select("user_id")
        .eq(
            "user_id",
            user.id
        )
        .maybeSingle();

    if (error) {

        console.error(
            "Admin verification error:",
            error
        );

        return false;
    }

    return !!data;
}


/* =========================================================
   INITIAL SESSION
   ========================================================= */

async function checkInitialSession() {

    showLogin();

    try {

        const {
            data,
            error
        } = await sb.auth.getSession();

        if (error) {
            throw error;
        }

        const session =
            data?.session;

        if (!session) {

            showLogin();

            return;
        }

        const isAdmin =
            await verifyAdmin(
                session.user
            );

        if (!isAdmin) {

            await sb.auth.signOut();

            if (loginMessage) {

                loginMessage.textContent =
                    "এই account-এর admin access নেই।";
            }

            showLogin();

            return;
        }

        currentUser =
            session.user;

        showDashboard();

        await loadEverything();

    } catch (error) {

        console.error(
            "Initial session error:",
            error
        );

        showLogin();

        if (loginMessage) {

            loginMessage.textContent =
                error.message ||
                "Session load করতে সমস্যা হয়েছে।";
        }
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    if (!loginButton) {
        return;
    }

    loginButton.disabled =
        true;

    loginButton.textContent =
        "Logging in...";

    if (loginMessage) {
        loginMessage.textContent =
            "";
    }

    try {

        const email =
            loginEmail.value.trim();

        const password =
            loginPassword.value;

        const {
            data,
            error
        } = await sb.auth
            .signInWithPassword({

                email,
                password

            });

        if (error) {
            throw error;
        }

        if (!data?.user) {

            throw new Error(
                "Login user পাওয়া যায়নি।"
            );
        }

        const user =
            data.user;

        const isAdmin =
            await verifyAdmin(user);

        if (!isAdmin) {

            await sb.auth.signOut();

            throw new Error(
                "Login হয়েছে, কিন্তু এই account-এর Admin access নেই।"
            );
        }

        currentUser =
            user;

        showDashboard();

        await loadEverything();

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        if (loginMessage) {

            loginMessage.textContent =
                error.message ||
                "Login failed.";
        }

        showLogin();

    } finally {

        loginButton.disabled =
            false;

        loginButton.textContent =
            "Login";
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function handleLogout() {

    try {

        await sb.auth.signOut();

    } catch (error) {

        console.error(error);
    }

    currentUser =
        null;

    editingProductId =
        null;

    resetProductForm();

    showLogin();
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function openSection(sectionName) {

    document.querySelectorAll(
        ".admin-section"
    ).forEach(section => {

        const active =
            section.id === sectionName;

        section.classList.toggle(
            "active",
            active
        );

        section.style.display =
            active
                ? "block"
                : "none";
    });


    document.querySelectorAll(
        ".admin-nav-btn"
    ).forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });


    /* Load settings when opened */

    if (
        sectionName ===
        "settingsSectionAdmin"
    ) {

        loadStoreSettings();
    }
}


/* =========================================================
   MAIN IMAGE PREVIEW
   ========================================================= */

if (mainImageAdmin) {

    mainImageAdmin.addEventListener(
        "change",
        () => {

            const file =
                mainImageAdmin.files?.[0];

            if (!file) {

                if (mainImagePreview) {

                    mainImagePreview.style.display =
                        existingMainImageUrl
                            ? "block"
                            : "none";
                }

                return;
            }

            const url =
                URL.createObjectURL(file);

            if (mainImagePreviewImg) {

                mainImagePreviewImg.src =
                    url;
            }

            if (mainImagePreview) {

                mainImagePreview.style.display =
                    "block";
            }
        }
    );
}


/* =========================================================
   VARIANT UI
   ========================================================= */

function createVariantElement(
    variant = {}
) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "admin-variant";


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
            value="${escapeHTML(
                variant.id || ""
            )}"
        >


        <div class="admin-form-group">

            <label>
                Variant Name
            </label>

            <input
                type="text"
                class="variant-name"
                placeholder="যেমন: Black / Blue / Red"
                value="${escapeHTML(
                    variant.name || ""
                )}"
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
                            src="${escapeHTML(
                                variant.image_url
                            )}"
                            alt=""
                        >
                    `
                    : ""
            }

        </div>


        <input
            type="hidden"
            class="existing-variant-image-url"
            value="${escapeHTML(
                variant.image_url || ""
            )}"
        >


        <div class="sizes-title">
            Sizes / Price / Stock
        </div>


        <div class="variant-sizes"></div>


        <button
            type="button"
            class="add-size-button"
        >
            + Add Size
        </button>
    `;


    const sizesContainer =
        wrapper.querySelector(
            ".variant-sizes"
        );


    const addSizeButton =
        wrapper.querySelector(
            ".add-size-button"
        );


    const removeVariantButton =
        wrapper.querySelector(
            ".remove-variant-button"
        );


    if (
        Array.isArray(
            variant.sizes
        )
    ) {

        variant.sizes.forEach(
            size => {

                addSizeElement(
                    sizesContainer,
                    size
                );
            }
        );
    }


    addSizeButton.addEventListener(
        "click",
        () => {

            addSizeElement(
                sizesContainer
            );
        }
    );


    removeVariantButton.addEventListener(
        "click",
        () => {

            wrapper.remove();
        }
    );


    if (variantsContainer) {

        variantsContainer.appendChild(
            wrapper
        );
    }
}


/* =========================================================
   SIZE UI
   ========================================================= */

function addSizeElement(
    container,
    size = {}
) {

    const row =
        document.createElement("div");

    row.className =
        "admin-size-row";


    row.innerHTML = `

        <input
            type="hidden"
            class="size-id"
            value="${escapeHTML(
                size.id || ""
            )}"
        >


        <input
            type="text"
            class="size-name"
            placeholder="Size"
            value="${escapeHTML(
                size.size || ""
            )}"
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


    row.querySelector(
        ".remove-size-button"
    ).addEventListener(
        "click",
        () => row.remove()
    );


    container.appendChild(row);
}


/* =========================================================
   CLEAR / ADD VARIANT
   ========================================================= */

function clearVariants() {

    if (variantsContainer) {

        variantsContainer.innerHTML =
            "";
    }
}


function addNewVariant() {

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

async function uploadProductImage(
    file
) {

    if (!file) {
        return null;
    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const filename =
        `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;


    const {
        error
    } = await sb.storage
        .from("product-images")
        .upload(
            filename,
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
    } = sb.storage
        .from("product-images")
        .getPublicUrl(
            filename
        );


    return data.publicUrl;
}


async function uploadVariantImage(
    file
) {

    if (!file) {
        return null;
    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const filename =
        `variants/${Date.now()}-${crypto.randomUUID()}.${extension}`;


    const {
        error
    } = await sb.storage
        .from("product-images")
        .upload(
            filename,
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
    } = sb.storage
        .from("product-images")
        .getPublicUrl(
            filename
        );


    return data.publicUrl;
}


/* =========================================================
   COLLECT PRODUCT FORM
   ========================================================= */

function collectProductForm() {

    const name =
        productNameAdmin.value.trim();


    const regularPrice =
        Number(
            regularPriceAdmin?.value || 0
        );


    const basePrice =
        Number(
            basePriceAdmin.value || 0
        );


    const description =
        descriptionAdmin.value.trim();


    if (!name) {

        throw new Error(
            "Product name দিন।"
        );
    }


    if (basePrice < 0) {

        throw new Error(
            "Sale Price সঠিক নয়।"
        );
    }


    if (regularPrice < 0) {

        throw new Error(
            "Regular Price সঠিক নয়।"
        );
    }


    const allowCod =
        !!adminAllowCodCheckbox?.checked;


    const allowAdvance =
        !!adminAllowAdvanceCheckbox?.checked;


    if (
        !allowCod &&
        !allowAdvance
    ) {

        throw new Error(
            "কমপক্ষে একটি payment method ON করুন।"
        );
    }


    const variantElements =
        [
            ...document.querySelectorAll(
                ".admin-variant"
            )
        ];


    if (!variantElements.length) {

        throw new Error(
            "কমপক্ষে একটি variant যোগ করুন।"
        );
    }


    const variants = [];


    variantElements.forEach(
        (
            variantEl,
            index
        ) => {

            const id =
                variantEl.querySelector(
                    ".variant-id"
                )?.value || "";


            const variantName =
                variantEl.querySelector(
                    ".variant-name"
                )?.value.trim();


            const existingImage =
                variantEl.querySelector(
                    ".existing-variant-image-url"
                )?.value || "";


            const imageFile =
                variantEl.querySelector(
                    ".variant-image"
                )?.files?.[0] || null;


            if (!variantName) {

                throw new Error(
                    `Variant ${index + 1}-এর নাম দিন।`
                );
            }


            const sizeElements =
                [
                    ...variantEl.querySelectorAll(
                        ".admin-size-row"
                    )
                ];


            if (!sizeElements.length) {

                throw new Error(
                    `"${variantName}" variant-এর অন্তত একটি size দিন।`
                );
            }


            const sizes = [];


            sizeElements.forEach(
                (
                    sizeEl,
                    sizeIndex
                ) => {

                    const sizeId =
                        sizeEl.querySelector(
                            ".size-id"
                        )?.value || "";


                    const sizeName =
                        sizeEl.querySelector(
                            ".size-name"
                        )?.value.trim();


                    const price =
                        Number(
                            sizeEl.querySelector(
                                ".size-price"
                            )?.value || 0
                        );


                    const stock =
                        Number(
                            sizeEl.querySelector(
                                ".size-stock"
                            )?.value || 0
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

                        id:
                            sizeId || null,

                        size:
                            sizeName,

                        price,

                        stock,

                        active:
                            true
                    });
                }
            );


            variants.push({

                id:
                    id || null,

                name:
                    variantName,

                imageFile,

                image_url:
                    existingImage,

                sizes
            });
        }
    );


    return {

        name,

        regularPrice,

        basePrice,

        description,

        allowCod,

        allowAdvance,

        variants
    };
}


/* =========================================================
   SAVE PRODUCT
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


    saveProductButton.disabled =
        true;


    const isEditing =
        !!editingProductId;


    saveProductButton.textContent =
        isEditing
            ? "Updating..."
            : "Saving...";


    try {

        const product =
            collectProductForm();


        let mainImageUrl =
            existingMainImageUrl ||
            null;


        const mainImageFile =
            mainImageAdmin
                ?.files?.[0];


        if (mainImageFile) {

            mainImageUrl =
                await uploadProductImage(
                    mainImageFile
                );
        }


        /* =====================================================
           EDIT PRODUCT
        ===================================================== */

        if (editingProductId) {

            const {
                error: productError
            } = await sb
                .from("products")
                .update({

                    name:
                        product.name,

                    regular_price:
                        product.regularPrice,

                    description:
                        product.description,

                    base_price:
                        product.basePrice,

                    main_image_url:
                        mainImageUrl,

                    allow_cod:
                        product.allowCod,

                    allow_advance:
                        product.allowAdvance

                })
                .eq(
                    "id",
                    editingProductId
                );


            if (productError) {
                throw productError;
            }


            /* =================================================
               VARIANTS
            ================================================= */

            for (
                const variant
                of product.variants
            ) {

                let variantId =
                    variant.id;


                /* NEW VARIANT */

                if (!variantId) {

                    let variantImageUrl =
                        variant.image_url ||
                        null;


                    if (variant.imageFile) {

                        variantImageUrl =
                            await uploadVariantImage(
                                variant.imageFile
                            );
                    }


                    const {
                        data,
                        error
                    } = await sb
                        .from(
                            "product_variants"
                        )
                        .insert({

                            product_id:
                                editingProductId,

                            name:
                                variant.name,

                            image_url:
                                variantImageUrl,

                            active:
                                true

                        })
                        .select("id")
                        .single();


                    if (error) {
                        throw error;
                    }


                    variantId =
                        data.id;
                }


                /* EXISTING VARIANT */

                else {

                    let variantImageUrl =
                        variant.image_url ||
                        null;


                    if (variant.imageFile) {

                        variantImageUrl =
                            await uploadVariantImage(
                                variant.imageFile
                            );
                    }


                    const {
                        error
                    } = await sb
                        .from(
                            "product_variants"
                        )
                        .update({

                            name:
                                variant.name,

                            image_url:
                                variantImageUrl,

                            active:
                                true

                        })
                        .eq(
                            "id",
                            variantId
                        );


                    if (error) {
                        throw error;
                    }
                }


                /* =================================================
                   SIZES
                ================================================= */

                for (
                    const size
                    of variant.sizes
                ) {

                    if (size.id) {

                        const {
                            error
                        } = await sb
                            .from(
                                "variant_sizes"
                            )
                            .update({

                                size:
                                    size.size,

                                price:
                                    size.price,

                                stock:
                                    size.stock,

                                active:
                                    true

                            })
                            .eq(
                                "id",
                                size.id
                            )
                            .eq(
                                "variant_id",
                                variantId
                            );


                        if (error) {
                            throw error;
                        }

                    } else {

                        const {
                            error
                        } = await sb
                            .from(
                                "variant_sizes"
                            )
                            .insert({

                                variant_id:
                                    variantId,

                                size:
                                    size.size,

                                price:
                                    size.price,

                                stock:
                                    size.stock,

                                active:
                                    true

                            });


                        if (error) {
                            throw error;
                        }
                    }
                }
            }


            showAlert(
                "Product, Stock এবং Payment Settings সফলভাবে update হয়েছে।",
                "success"
            );
        }


        /* =====================================================
           ADD NEW PRODUCT
        ===================================================== */

        else {

            const {
                data: productData,
                error: productError
            } = await sb
                .from("products")
                .insert({

                    name:
                        product.name,

                    regular_price:
                        product.regularPrice,

                    description:
                        product.description,

                    base_price:
                        product.basePrice,

                    main_image_url:
                        mainImageUrl,

                    allow_cod:
                        product.allowCod,

                    allow_advance:
                        product.allowAdvance,

                    active:
                        true

                })
                .select("id")
                .single();


            if (productError) {
                throw productError;
            }


            const productId =
                productData.id;


            /* VARIANTS */

            for (
                const variant
                of product.variants
            ) {

                let variantImageUrl =
                    variant.image_url ||
                    null;


                if (variant.imageFile) {

                    variantImageUrl =
                        await uploadVariantImage(
                            variant.imageFile
                        );
                }


                const {
                    data: variantData,
                    error: variantError
                } = await sb
                    .from(
                        "product_variants"
                    )
                    .insert({

                        product_id:
                            productId,

                        name:
                            variant.name,

                        image_url:
                            variantImageUrl,

                        active:
                            true

                    })
                    .select("id")
                    .single();


                if (variantError) {
                    throw variantError;
                }


                /* SIZES */

                for (
                    const size
                    of variant.sizes
                ) {

                    const {
                        error: sizeError
                    } = await sb
                        .from(
                            "variant_sizes"
                        )
                        .insert({

                            variant_id:
                                variantData.id,

                            size:
                                size.size,

                            price:
                                size.price,

                            stock:
                                size.stock,

                            active:
                                true

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


        /* SUCCESS */

        resetProductForm();


        await loadProducts();

        await loadStats();


        openSection(
            "productsSectionAdmin"
        );

    } catch (error) {

        console.error(
            "Save product error:",
            error
        );


        showAlert(
            error.message ||
            "Product save করতে সমস্যা হয়েছে।",
            "error"
        );

    } finally {

        saveProductButton.disabled =
            false;


        saveProductButton.textContent =
            editingProductId
                ? "Update Product"
                : "Save Product";
    }
}


/* =========================================================
   RESET PRODUCT FORM
   ========================================================= */

function resetProductForm() {

    editingProductId =
        null;


    existingMainImageUrl =
        "";


    if (productForm) {

        productForm.reset();

        productForm.dataset.mode =
            "add";
    }


    if (mainImageAdmin) {

        mainImageAdmin.required =
            true;
    }


    if (mainImagePreview) {

        mainImagePreview.style.display =
            "none";
    }


    if (mainImagePreviewImg) {

        mainImagePreviewImg.src =
            "";
    }


    /* DEFAULT PAYMENT */

    if (adminAllowCodCheckbox) {

        adminAllowCodCheckbox.checked =
            true;
    }


    if (adminAllowAdvanceCheckbox) {

        adminAllowAdvanceCheckbox.checked =
            false;
    }


    checkPaymentMethodsAdmin();


    clearVariants();


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

async function editProduct(
    productId
) {

    try {

        openSection(
            "addProductSection"
        );


        showAlert(
            "Product information loading...",
            "info"
        );


        const {
            data,
            error
        } = await sb
            .from("products")
            .select(`

                id,
                name,
                regular_price,
                description,
                base_price,
                main_image_url,
                allow_cod,
                allow_advance,
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
            .eq(
                "id",
                productId
            )
            .single();


        if (error) {
            throw error;
        }


        editingProductId =
            data.id;


        existingMainImageUrl =
            data.main_image_url ||
            "";


        if (mainImageAdmin) {

            mainImageAdmin.required =
                false;
        }


        productNameAdmin.value =
            data.name || "";


        if (regularPriceAdmin) {

            regularPriceAdmin.value =
                data.regular_price ?? "";
        }


        basePriceAdmin.value =
            data.base_price ?? "";


        descriptionAdmin.value =
            data.description || "";


        /* PAYMENT */

        if (adminAllowCodCheckbox) {

            adminAllowCodCheckbox.checked =
                data.allow_cod !== false;
        }


        if (adminAllowAdvanceCheckbox) {

            adminAllowAdvanceCheckbox.checked =
                data.allow_advance === true;
        }


        checkPaymentMethodsAdmin();


        /* MAIN IMAGE */

        if (
            mainImagePreviewImg &&
            data.main_image_url
        ) {

            mainImagePreviewImg.src =
                data.main_image_url;
        }


        if (mainImagePreview) {

            mainImagePreview.style.display =
                data.main_image_url
                    ? "block"
                    : "none";
        }


        /* VARIANTS */

        clearVariants();


        const variants =
            data.product_variants ||
            [];


        variants.forEach(
            variant => {

                createVariantElement({

                    id:
                        variant.id,

                    name:
                        variant.name,

                    image_url:
                        variant.image_url,

                    sizes:
                        variant.variant_sizes ||
                        []
                });
            }
        );


        if (!variants.length) {

            createVariantElement({

                name: "",

                image_url: "",

                sizes: [
                    {
                        size: "",
                        price:
                            data.base_price ||
                            0,
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

            productForm.dataset.mode =
                "edit";
        }


        clearAlert();


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    } catch (error) {

        console.error(
            "Edit product error:",
            error
        );


        showAlert(
            error.message ||
            "Product load করতে সমস্যা হয়েছে।",
            "error"
        );
    }
}


window.editProduct =
    editProduct;


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

    if (!adminProductsList) {
        return;
    }


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
            regular_price,
            description,
            base_price,
            main_image_url,
            allow_cod,
            allow_advance,
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

        console.error(
            "Load products error:",
            error
        );


        adminProductsList.innerHTML = `

            <div class="admin-empty">
                ${escapeHTML(
                    error.message
                )}
            </div>

        `;

        return;
    }


    currentProducts =
        data || [];


    renderProducts();
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts() {

    if (!adminProductsList) {
        return;
    }


    if (!currentProducts.length) {

        adminProductsList.innerHTML = `

            <div class="admin-empty">
                কোনো Product নেই।
            </div>

        `;

        return;
    }


    adminProductsList.innerHTML =
        currentProducts
            .map(product => {

                let totalStock =
                    0;

                let totalSizes =
                    0;


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
                                            size.stock ||
                                            0
                                        );

                                    totalSizes++;
                                }
                            }
                        );
                    }
                );


                const status =
                    product.active === false
                        ? "Inactive"
                        : "Active";


                const codEnabled =
                    product.allow_cod !== false;


                const advanceEnabled =
                    product.allow_advance === true;


                let paymentText =
                    "No payment method";


                if (
                    codEnabled &&
                    advanceEnabled
                ) {

                    paymentText =
                        "COD + bKash/Nagad";

                } else if (
                    codEnabled
                ) {

                    paymentText =
                        "COD only";

                } else if (
                    advanceEnabled
                ) {

                    paymentText =
                        "bKash/Nagad only";
                }


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
                                ${escapeHTML(
                                    product.name
                                )}
                            </h3>


                            ${
                                product.regular_price
                                    ? `
                                        <div class="admin-product-price">

                                            <span class="admin-regular-price">
                                                ৳${money(
                                                    product.regular_price
                                                )}
                                            </span>

                                            <span class="admin-sale-price">
                                                ৳${money(
                                                    product.base_price
                                                )}
                                            </span>

                                        </div>
                                    `
                                    : `
                                        <div class="admin-product-price">

                                            <span class="admin-sale-price">
                                                ৳${money(
                                                    product.base_price
                                                )}
                                            </span>

                                        </div>
                                    `
                            }


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


                            <div class="admin-product-meta">

                                Payment:
                                <strong>
                                    ${escapeHTML(
                                        paymentText
                                    )}
                                </strong>

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
                                onclick="editProduct('${escapeHTML(
                                    product.id
                                )}')"
                            >
                                ✏️ Edit / Stock
                            </button>

                        </div>

                    </div>

                `;
            })
            .join("");
}


/* =========================================================
   LOAD ORDERS
   ========================================================= */

async function loadOrders() {

    if (!adminOrdersList) {
        return;
    }


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

        console.error(
            "Load orders error:",
            error
        );


        adminOrdersList.innerHTML = `

            <div class="admin-empty">
                ${escapeHTML(
                    error.message
                )}
            </div>

        `;

        return;
    }


    currentOrders =
        data || [];


    renderOrders();
}


/* =========================================================
   PAYMENT LABEL
   ========================================================= */

function getPaymentMethodLabel(
    paymentMethod
) {

    const method =
        String(
            paymentMethod || ""
        )
            .trim()
            .toLowerCase();


    if (method === "cod") {

        return "Cash on Delivery";
    }


    if (method === "bkash") {

        return "bKash Send Money";
    }


    if (method === "nagad") {

        return "Nagad Send Money";
    }


    if (!method) {

        return "Not specified";
    }


    return paymentMethod;
}


/* =========================================================
   RENDER ORDERS
   ========================================================= */

function renderOrders() {

    if (!adminOrdersList) {
        return;
    }


    const filteredOrders =
        currentOrderFilter === "all"

            ? currentOrders

            : currentOrders.filter(
                order =>
                    normalizeOrderStatus(
                        order.status
                    ) ===
                    currentOrderFilter
            );


    if (!filteredOrders.length) {

        let message =
            "কোনো Order নেই।";


        if (
            currentOrderFilter ===
            "pending"
        ) {

            message =
                "কোনো Pending Order নেই।";
        }


        if (
            currentOrderFilter ===
            "completed"
        ) {

            message =
                "কোনো Completed Order নেই।";
        }


        adminOrdersList.innerHTML = `

            <div class="admin-empty">
                ${message}
            </div>

        `;

        return;
    }


    adminOrdersList.innerHTML =
        filteredOrders
            .map(order => {

                const status =
                    normalizeOrderStatus(
                        order.status
                    );


                const completed =
                    status ===
                    "completed";


                const paymentMethod =
                    getPaymentMethodLabel(
                        order.payment_method
                    );


                const paymentAccount =
                    order.payment_account ||
                    "";


                const transactionId =
                    order.transaction_id ||
                    "";


                return `

                    <div class="admin-order-card">

                        <div class="order-main">

                            <div class="order-title">

                                Order #
                                ${escapeHTML(
                                    order.id
                                )}

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

                                ${escapeHTML(
                                    order.variety ||
                                    ""
                                )}

                                ${
                                    order.size
                                        ? " · " +
                                          escapeHTML(
                                              order.size
                                          )
                                        : ""
                                }

                                · Qty:

                                ${escapeHTML(
                                    order.quantity
                                )}

                            </div>


                            <div class="order-address">

                                ${escapeHTML(
                                    order.address ||
                                    ""
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


                            <div class="order-payment">

                                <strong>
                                    Payment:
                                </strong>

                                ${escapeHTML(
                                    paymentMethod
                                )}

                            </div>


                            ${
                                paymentAccount
                                    ? `
                                        <div class="order-payment-account">

                                            <strong>
                                                Account:
                                            </strong>

                                            ${escapeHTML(
                                                paymentAccount
                                            )}

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                transactionId
                                    ? `
                                        <div class="order-transaction-id">

                                            <strong>
                                                TrxID:
                                            </strong>

                                            ${escapeHTML(
                                                transactionId
                                            )}

                                        </div>
                                    `
                                    : ""
                            }


                            <div class="order-total">

                                Total:
                                ৳${money(
                                    order.total_price
                                )}

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
                                            onclick="completeOrder('${escapeHTML(
                                                order.id
                                            )}')"
                                        >
                                            Complete Order
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                `;
            })
            .join("");
}


/* =========================================================
   ORDER FILTERS
   ========================================================= */

function setupOrderFilters() {

    const filterButtons =
        document.querySelectorAll(
            ".order-filter-btn"
        );


    if (!filterButtons.length) {
        return;
    }


    filterButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentOrderFilter =
                        String(
                            button.dataset.orderFilter ||
                            "all"
                        )
                            .trim()
                            .toLowerCase();


                    if (
                        ![
                            "all",
                            "pending",
                            "completed"
                        ].includes(
                            currentOrderFilter
                        )
                    ) {

                        currentOrderFilter =
                            "all";
                    }


                    filterButtons.forEach(
                        btn => {

                            btn.classList.toggle(
                                "active",
                                btn === button
                            );
                        }
                    );


                    renderOrders();
                }
            );
        }
    );
}


/* =========================================================
   COMPLETE ORDER
   ========================================================= */

async function completeOrder(
    orderId
) {

    if (
        !confirm(
            "এই Order-টি Completed হিসেবে mark করবেন?"
        )
    ) {

        return;
    }


    const {
        error
    } = await sb
        .from("orders")
        .update({

            status:
                "completed"

        })
        .eq(
            "id",
            orderId
        );


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


window.completeOrder =
    completeOrder;


/* =========================================================
   STATS
   ========================================================= */

async function loadStats() {

    const {
        data: products,
        error: productError
    } = await sb
        .from("products")
        .select(
            "id, active"
        );


    if (!productError) {

        const activeProducts =
            (products || [])
                .filter(
                    p =>
                        p.active !== false
                );


        if (statProducts) {

            statProducts.textContent =
                activeProducts.length;
        }
    }


    const {
        data: sizes,
        error: sizeError
    } = await sb
        .from("variant_sizes")
        .select(
            "stock, active"
        );


    if (!sizeError) {

        const totalStock =
            (sizes || [])
                .filter(
                    s =>
                        s.active !== false
                )
                .reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        Number(
                            item.stock ||
                            0
                        ),
                    0
                );


        if (statStock) {

            statStock.textContent =
                totalStock;
        }
    }


    const {
        data: orders,
        error: orderError
    } = await sb
        .from("orders")
        .select(
            "status"
        );


    if (!orderError) {

        const pending =
            (orders || [])
                .filter(
                    o =>
                        normalizeOrderStatus(
                            o.status
                        ) ===
                        "pending"
                )
                .length;


        const completed =
            (orders || [])
                .filter(
                    o =>
                        normalizeOrderStatus(
                            o.status
                        ) ===
                        "completed"
                )
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
   STORE SETTINGS
   ========================================================= */

/*
   Expected table:

   store_settings

   id
   about_us
   phone
   whatsapp
   email
   address
   facebook
   instagram
   updated_at

   পরে তোমার SQL দেখে এই structure নিশ্চিত/সংশোধন করব।
*/


async function loadStoreSettings() {

    if (!storeSettingsForm) {
        return;
    }


    try {

        const {
            data,
            error
        } = await sb
            .from("store_settings")
            .select("*")
            .limit(1)
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            return;
        }


        if (aboutUsAdmin) {

            aboutUsAdmin.value =
                data.about_us || "";
        }


        if (contactPhoneAdmin) {

            contactPhoneAdmin.value =
                data.phone || "";
        }


        if (contactWhatsappAdmin) {

            contactWhatsappAdmin.value =
                data.whatsapp || "";
        }


        if (contactEmailAdmin) {

            contactEmailAdmin.value =
                data.email || "";
        }


        if (contactAddressAdmin) {

            contactAddressAdmin.value =
                data.address || "";
        }


        if (contactFacebookAdmin) {

            contactFacebookAdmin.value =
                data.facebook || "";
        }


        if (contactInstagramAdmin) {

            contactInstagramAdmin.value =
                data.instagram || "";
        }

    } catch (error) {

        console.error(
            "Load store settings error:",
            error
        );


        showStoreSettingsAlert(
            error.message ||
            "Store Settings load করতে সমস্যা হয়েছে।",
            "error"
        );
    }
}


/* =========================================================
   SAVE STORE SETTINGS
   ========================================================= */

async function saveStoreSettings(
    event
) {

    event.preventDefault();


    if (!currentUser) {

        showStoreSettingsAlert(
            "প্রথমে Admin login করুন।",
            "error"
        );

        return;
    }


    clearStoreSettingsAlert();


    if (saveStoreSettingsButton) {

        saveStoreSettingsButton.disabled =
            true;

        saveStoreSettingsButton.textContent =
            "Saving...";
    }


    try {

        const settings = {

            about_us:
                aboutUsAdmin?.value.trim() ||
                "",

            phone:
                contactPhoneAdmin?.value.trim() ||
                "",

            whatsapp:
                contactWhatsappAdmin?.value.trim() ||
                "",

            email:
                contactEmailAdmin?.value.trim() ||
                "",

            address:
                contactAddressAdmin?.value.trim() ||
                "",

            facebook:
                contactFacebookAdmin?.value.trim() ||
                "",

            instagram:
                contactInstagramAdmin?.value.trim() ||
                "",

            updated_at:
                new Date().toISOString()
        };


        const {
            data: existing,
            error: findError
        } = await sb
            .from("store_settings")
            .select("id")
            .limit(1)
            .maybeSingle();


        if (findError) {
            throw findError;
        }


        let result;


        /* UPDATE */

        if (existing?.id) {

            result =
                await sb
                    .from("store_settings")
                    .update(settings)
                    .eq(
                        "id",
                        existing.id
                    );

        }


        /* INSERT */

        else {

            result =
                await sb
                    .from("store_settings")
                    .insert(settings);
        }


        if (result.error) {
            throw result.error;
        }


        showStoreSettingsAlert(
            "Store Settings সফলভাবে save হয়েছে।",
            "success"
        );

    } catch (error) {

        console.error(
            "Save store settings error:",
            error
        );


        showStoreSettingsAlert(
            error.message ||
            "Store Settings save করতে সমস্যা হয়েছে।",
            "error"
        );

    } finally {

        if (saveStoreSettingsButton) {

            saveStoreSettingsButton.disabled =
                false;

            saveStoreSettingsButton.textContent =
                "💾 Save Store Settings";
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


if (storeSettingsForm) {

    storeSettingsForm.addEventListener(
        "submit",
        saveStoreSettings
    );
}


/* =========================================================
   ADMIN NAVIGATION
   ========================================================= */

document.querySelectorAll(
    ".admin-nav-btn"
).forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.section;

                if (section) {

                    openSection(
                        section
                    );
                }
            }
        );
    }
);


/* =========================================================
   QUICK ACTION BUTTONS
   ========================================================= */

document.querySelectorAll(
    "[data-open-section]"
).forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const section =
                    button.dataset.openSection;

                if (section) {

                    openSection(
                        section
                    );
                }
            }
        );
    }
);


/* =========================================================
   ORDER FILTER BUTTONS
   ========================================================= */

setupOrderFilters();


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
    (
        event,
        session
    ) => {

        if (
            event ===
            "SIGNED_OUT"
        ) {

            currentUser =
                null;

            showLogin();
        }
    }
);


/* =========================================================
   START
   ========================================================= */

resetProductForm();

checkPaymentMethodsAdmin();

checkInitialSession();
