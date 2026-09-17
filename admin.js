/* =========================================================
   MY SHOP ADMIN PANEL
   Login + Dashboard + Add Product + Edit Product
   + Variants + Sizes + Stock + Orders + Settings
   + Realtime New Order Detection
   ========================================================= */

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);


const money = (value) => {

    const n = Number(value || 0);

    return `৳${n.toLocaleString("en-BD")}`;
};


const escapeHTML = (value) => {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};


/* =========================================================
   DOM
   ========================================================= */

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
const productFormTitle = $("productFormTitle");
const productFormAlert = $("productFormAlert");

const saveProductButton = $("saveProductButton");
const resetProductButton = $("resetProductButton");

const productNameAdmin = $("productNameAdmin");
const regularPriceAdmin = $("regularPriceAdmin");
const basePriceAdmin = $("basePriceAdmin");
const descriptionAdmin = $("descriptionAdmin");

const mainImageAdmin = $("mainImageAdmin");
const mainImagePreview = $("mainImagePreview");
const mainImagePreviewImg = $("mainImagePreviewImg");

const allowCodAdmin = $("allowCodAdmin");
const allowAdvanceAdmin = $("allowAdvanceAdmin");
const paymentWarningAdmin = $("paymentWarningAdmin");

const variantsContainer = $("variantsContainer");
const addVariantButton = $("addVariantButton");

const dashboardSection = $("dashboardSection");
const addProductSection = $("addProductSection");
const productsSectionAdmin = $("productsSectionAdmin");
const ordersSectionAdmin = $("ordersSectionAdmin");
const settingsSectionAdmin = $("settingsSectionAdmin");

const statProducts = $("statProducts");
const statStock = $("statStock");
const statPendingOrders = $("statPendingOrders");
const statCompletedOrders = $("statCompletedOrders");

const adminProductsList = $("adminProductsList");
const adminOrdersList = $("adminOrdersList");

const storeSettingsAlert = $("storeSettingsAlert");
const storeSettingsForm = $("storeSettingsForm");

const aboutUsAdmin = $("aboutUsAdmin");
const contactPhoneAdmin = $("contactPhoneAdmin");
const contactWhatsappAdmin = $("contactWhatsappAdmin");
const contactEmailAdmin = $("contactEmailAdmin");
const contactAddressAdmin = $("contactAddressAdmin");
const contactFacebookAdmin = $("contactFacebookAdmin");
const contactInstagramAdmin = $("contactInstagramAdmin");

const saveStoreSettingsButton = $("saveStoreSettingsButton");


/* =========================================================
   STATE
   ========================================================= */

let editingProductId = null;

let allOrders = [];

let currentOrderFilter = "all";

let ordersRealtimeChannel = null;

let ordersRefreshTimer = null;

let adminIsLoggedIn = false;


/* =========================================================
   ALERTS
   ========================================================= */

function showLoginMessage(
    message,
    type = "error"
) {

    if (!loginMessage) return;

    loginMessage.textContent =
        message;

    loginMessage.className =
        "login-message";

    loginMessage.style.color =
        type === "success"
            ? "#16a34a"
            : "#dc2626";
}


function showProductAlert(
    message,
    type = "info"
) {

    if (!productFormAlert) return;

    productFormAlert.textContent =
        message;

    productFormAlert.className =
        `form-alert ${type}`;
}


function clearProductAlert() {

    if (!productFormAlert) return;

    productFormAlert.textContent =
        "";

    productFormAlert.className =
        "form-alert";
}


function showSettingsAlert(
    message,
    type = "info"
) {

    if (!storeSettingsAlert) return;

    storeSettingsAlert.textContent =
        message;

    storeSettingsAlert.className =
        `form-alert ${type}`;
}


/* =========================================================
   AUTH
   ========================================================= */

async function isAdmin(user) {

    if (!user) return false;

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
            "Admin check error:",
            error
        );

        return false;
    }

    return !!data;
}


async function loginAdmin(event) {

    event.preventDefault();

    const email =
        loginEmail.value.trim();

    const password =
        loginPassword.value;

    if (!email || !password) {

        showLoginMessage(
            "Email এবং password দিন।"
        );

        return;
    }

    loginButton.disabled =
        true;

    loginButton.textContent =
        "Logging in...";

    showLoginMessage(
        "Login হচ্ছে...",
        "success"
    );

    try {

        const {
            data,
            error
        } = await sb.auth.signInWithPassword({

            email,

            password

        });

        if (error) {
            throw error;
        }

        if (!data.user) {

            throw new Error(
                "User পাওয়া যায়নি।"
            );
        }

        const admin =
            await isAdmin(
                data.user
            );

        if (!admin) {

            await sb.auth.signOut();

            throw new Error(
                "এই account-এর Admin access নেই।"
            );
        }

        showLoginMessage(
            "Login successful!",
            "success"
        );

        await showDashboard(
            data.user
        );

    } catch (error) {

        console.error(error);

        showLoginMessage(
            error.message ||
            "Login করতে সমস্যা হয়েছে।"
        );

    } finally {

        loginButton.disabled =
            false;

        loginButton.textContent =
            "Login";
    }
}


async function checkExistingSession() {

    try {

        const {
            data: {
                session
            }
        } = await sb.auth.getSession();

        if (!session?.user) {

            showLoginScreen();

            return;
        }

        const admin =
            await isAdmin(
                session.user
            );

        if (!admin) {

            await sb.auth.signOut();

            showLoginScreen();

            return;
        }

        await showDashboard(
            session.user
        );

    } catch (error) {

        console.error(
            "Session error:",
            error
        );

        showLoginScreen();
    }
}


function showLoginScreen() {

    adminIsLoggedIn =
        false;

    stopOrderRealtime();

    if (adminLogin) {

        adminLogin.style.display =
            "";
    }

    if (adminDashboard) {

        adminDashboard.style.display =
            "none";
    }
}


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

async function showDashboard(user) {

    adminIsLoggedIn =
        true;

    if (adminLogin) {

        adminLogin.style.display =
            "none";
    }

    if (adminDashboard) {

        adminDashboard.style.display =
            "block";
    }

    if (adminUserEmail) {

        adminUserEmail.textContent =
            user.email || "";
    }

    resetProductForm();


    await Promise.allSettled([

        loadStats(),

        loadProducts(),

        loadOrders(),

        loadStoreSettings()

    ]);


    /*
       Login সফল হওয়ার পরেই
       নতুন order-এর Realtime listener চালু হবে।
    */

    startOrderRealtime();

    /*
       Realtime কোনো কারণে কাজ না করলে
       10 সেকেন্ড পরপর orders refresh হবে।
    */

    startOrderPolling();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutAdmin() {

    stopOrderRealtime();

    stopOrderPolling();

    const {
        error
    } = await sb.auth.signOut();

    if (error) {

        console.error(error);

        alert(
            "Logout করতে সমস্যা হয়েছে।"
        );

        return;
    }

    showLoginScreen();

    if (loginEmail)
        loginEmail.value = "";

    if (loginPassword)
        loginPassword.value = "";

    showLoginMessage("");
}


/* =========================================================
   NAVIGATION
   ========================================================= */

async function openSection(
    sectionId
) {

    document
        .querySelectorAll(
            ".admin-section"
        )
        .forEach(section => {

            section.classList.remove(
                "active"
            );

        });


    const target =
        $(sectionId);


    if (target) {

        target.classList.add(
            "active"
        );
    }


    document
        .querySelectorAll(
            ".admin-nav-btn"
        )
        .forEach(button => {

            button.classList.remove(
                "active"
            );

            if (
                button.dataset.section ===
                sectionId
            ) {

                button.classList.add(
                    "active"
                );
            }

        });


    if (
        sectionId ===
        "dashboardSection"
    ) {

        await Promise.allSettled([

            loadStats(),

            loadOrders()

        ]);
    }


    if (
        sectionId ===
        "productsSectionAdmin"
    ) {

        await loadProducts();
    }


    if (
        sectionId ===
        "ordersSectionAdmin"
    ) {

        await loadOrders();
    }


    if (
        sectionId ===
        "settingsSectionAdmin"
    ) {

        await loadStoreSettings();
    }
}


/* =========================================================
   PRODUCT FORM RESET
   ========================================================= */

function resetProductForm() {

    editingProductId =
        null;

    if (productForm) {

        productForm.reset();
    }

    if (productFormTitle) {

        productFormTitle.textContent =
            "Add Product";
    }

    if (saveProductButton) {

        saveProductButton.textContent =
            "Save Product";
    }

    if (variantsContainer) {

        variantsContainer.innerHTML =
            "";
    }

    if (mainImagePreview) {

        mainImagePreview.style.display =
            "none";
    }

    if (mainImagePreviewImg) {

        mainImagePreviewImg.src =
            "";
    }

    if (allowCodAdmin) {

        allowCodAdmin.checked =
            true;
    }

    if (allowAdvanceAdmin) {

        allowAdvanceAdmin.checked =
            false;
    }

    clearProductAlert();

    checkPaymentMethodsAdmin();
}


function checkPaymentMethodsAdmin() {

    if (
        !allowCodAdmin ||
        !allowAdvanceAdmin
    ) {
        return;
    }

    const cod =
        allowCodAdmin.checked;

    const advance =
        allowAdvanceAdmin.checked;

    if (paymentWarningAdmin) {

        paymentWarningAdmin.style.display =
            (!cod && !advance)
                ? "block"
                : "none";

        if (!cod && !advance) {

            paymentWarningAdmin.textContent =
                "কমপক্ষে একটি payment method নির্বাচন করুন।";
        }
    }
}


/* =========================================================
   MAIN IMAGE PREVIEW
   ========================================================= */

function previewMainImage() {

    const file =
        mainImageAdmin
            ?.files
            ?.[0];

    if (!file) return;

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


/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

async function uploadImage(
    file,
    folder = "products"
) {

    if (!file)
        return null;

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase() ||
        "jpg";

    const fileName =
        `${folder}/${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 10)}.${extension}`;


    const {
        error
    } = await sb.storage
        .from("product-images")
        .upload(
            fileName,
            file,
            {
                cacheControl:
                    "3600",
                upsert:
                    false
            }
        );


    if (error) {

        throw error;
    }


    const {
        data: publicData
    } = sb.storage
        .from("product-images")
        .getPublicUrl(
            fileName
        );


    return publicData.publicUrl;
}


/* =========================================================
   VARIANTS
   ========================================================= */

function addVariant(
    variantData = null
) {

    if (!variantsContainer)
        return;


    const variant =
        document.createElement(
            "div"
        );


    variant.className =
        "admin-variant";


    variant.innerHTML = `

        <div class="variant-header">

            <strong>Variant</strong>

            <button
                type="button"
                class="remove-variant-button"
            >
                Remove
            </button>

        </div>


        <div class="form-group">

            <label>Variant Name</label>

            <input
                type="text"
                class="variant-name"
                placeholder="যেমন: Black"
                value="${escapeHTML(
                    variantData?.name || ""
                )}"
            >

        </div>


        <div class="form-group">

            <label>Variant Image</label>

            <input
                type="file"
                class="variant-image"
                accept="image/*"
            >

        </div>


        ${
            variantData?.image_url
                ? `
                    <div class="variant-existing-image">

                        <img
                            src="${escapeHTML(
                                variantData.image_url
                            )}"
                            alt="Variant"
                        >

                    </div>
                `
                : ""
        }


        <div class="variant-sizes">

            <div class="sizes-title">
                <strong>Sizes / Stock</strong>
            </div>

        </div>


        <button
            type="button"
            class="add-size-button"
        >
            + Add Size
        </button>

    `;


    variantsContainer.appendChild(
        variant
    );


    const sizesContainer =
        variant.querySelector(
            ".variant-sizes"
        );


    if (
        variantData?.variant_sizes?.length
    ) {

        variantData.variant_sizes
            .filter(
                size =>
                    size.active !== false
            )
            .forEach(
                size => {

                    addSizeRow(
                        sizesContainer,
                        size
                    );

                }
            );

    } else {

        addSizeRow(
            sizesContainer
        );
    }
}


function addSizeRow(
    container,
    sizeData = null
) {

    if (!container)
        return;


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "admin-size-row";


    row.innerHTML = `

        <input
            type="text"
            class="size-name"
            placeholder="Size"
            value="${escapeHTML(
                sizeData?.size_name || ""
            )}"
        >

        <input
            type="number"
            class="size-stock"
            placeholder="Stock"
            min="0"
            value="${sizeData?.stock ?? 0}"
        >

        <input
            type="number"
            class="size-price"
            placeholder="Price"
            min="0"
            step="0.01"
            value="${sizeData?.price ?? ""}"
        >

        <button
            type="button"
            class="remove-size-button"
        >
            ×
        </button>

    `;


    container.appendChild(
        row
    );
}


/* =========================================================
   COLLECT VARIANTS
   ========================================================= */

function collectVariants() {

    if (!variantsContainer)
        return [];


    const variantElements =
        variantsContainer
            .querySelectorAll(
                ".admin-variant"
            );


    const variants = [];


    variantElements.forEach(
        variantElement => {

            const name =
                variantElement
                    .querySelector(
                        ".variant-name"
                    )
                    ?.value
                    .trim() ||
                "";


            const imageFile =
                variantElement
                    .querySelector(
                        ".variant-image"
                    )
                    ?.files
                    ?.[0] ||
                null;


            const existingImage =
                variantElement
                    .querySelector(
                        ".variant-existing-image img"
                    )
                    ?.getAttribute(
                        "src"
                    ) ||
                null;


            const sizes = [];


            variantElement
                .querySelectorAll(
                    ".admin-size-row"
                )
                .forEach(
                    row => {

                        const sizeName =
                            row.querySelector(
                                ".size-name"
                            )
                            ?.value
                            .trim() ||
                            "";


                        const stock =
                            Number(
                                row.querySelector(
                                    ".size-stock"
                                )
                                ?.value ||
                                0
                            );


                        const priceValue =
                            row.querySelector(
                                ".size-price"
                            )
                            ?.value;


                        const price =
                            priceValue === "" ||
                            priceValue == null
                                ? null
                                : Number(
                                    priceValue
                                );


                        if (sizeName) {

                            sizes.push({

                                size_name:
                                    sizeName,

                                stock,

                                price

                            });
                        }

                    }
                );


            if (
                name ||
                imageFile ||
                existingImage ||
                sizes.length
            ) {

                variants.push({

                    name,

                    imageFile,

                    image_url:
                        existingImage,

                    sizes

                });
            }

        }
    );


    return variants;
}


/* =========================================================
   SAVE PRODUCT
   ========================================================= */

async function saveProduct(
    event
) {

    event.preventDefault();

    clearProductAlert();


    const name =
        productNameAdmin
            ?.value
            .trim() ||
        "";


    const regularPrice =
        Number(
            regularPriceAdmin
                ?.value ||
            0
        );


    const salePrice =
        Number(
            basePriceAdmin
                ?.value ||
            0
        );


    const description =
        descriptionAdmin
            ?.value
            .trim() ||
        "";


    const allowCod =
        !!allowCodAdmin?.checked;


    const allowAdvance =
        !!allowAdvanceAdmin?.checked;


    if (!name) {

        showProductAlert(
            "Product name দিন।",
            "error"
        );

        return;
    }


    if (salePrice <= 0) {

        showProductAlert(
            "Sale price সঠিকভাবে দিন।",
            "error"
        );

        return;
    }


    if (
        regularPrice > 0 &&
        salePrice > regularPrice
    ) {

        showProductAlert(
            "Sale price regular price-এর চেয়ে বেশি হতে পারবে না।",
            "error"
        );

        return;
    }


    if (
        !allowCod &&
        !allowAdvance
    ) {

        showProductAlert(
            "কমপক্ষে একটি payment method নির্বাচন করুন।",
            "error"
        );

        return;
    }


    const wasEditing =
        !!editingProductId;


    saveProductButton.disabled =
        true;

    saveProductButton.textContent =
        "Saving...";


    try {

        let mainImageUrl =
            null;


        const mainImageFile =
            mainImageAdmin
                ?.files
                ?.[0] ||
            null;


        if (mainImageFile) {

            showProductAlert(
                "Main image upload হচ্ছে...",
                "info"
            );

            mainImageUrl =
                await uploadImage(
                    mainImageFile,
                    "products"
                );

        } else if (editingProductId) {

            const {
                data,
                error
            } = await sb
                .from("products")
                .select(
                    "main_image_url"
                )
                .eq(
                    "id",
                    editingProductId
                )
                .single();


            if (error)
                throw error;


            mainImageUrl =
                data?.main_image_url ||
                null;
        }


        const productData = {

            name,

            regular_price:
                regularPrice > 0
                    ? regularPrice
                    : null,

            base_price:
                salePrice,

            description,

            main_image_url:
                mainImageUrl,

            allow_cod:
                allowCod,

            allow_advance:
                allowAdvance,

            active:
                true
        };


        let productId;


        if (editingProductId) {

            const {
                error
            } = await sb
                .from("products")
                .update(
                    productData
                )
                .eq(
                    "id",
                    editingProductId
                );


            if (error)
                throw error;


            productId =
                editingProductId;


            await deactivateOldVariants(
                productId
            );

        } else {

            const {
                data,
                error
            } = await sb
                .from("products")
                .insert(
                    productData
                )
                .select("id")
                .single();


            if (error)
                throw error;


            productId =
                data.id;
        }


        const variants =
            collectVariants();


        await saveVariants(
            productId,
            variants
        );


        showProductAlert(
            wasEditing
                ? "Product successfully updated!"
                : "Product successfully added!",
            "success"
        );


        resetProductForm();


        await Promise.allSettled([

            loadProducts(),

            loadStats()

        ]);


        await openSection(
            "productsSectionAdmin"
        );


    } catch (error) {

        console.error(
            "Save product error:",
            error
        );


        showProductAlert(
            error.message ||
            "Product save করতে সমস্যা হয়েছে।",
            "error"
        );

    } finally {

        saveProductButton.disabled =
            false;

        saveProductButton.textContent =
            wasEditing
                ? "Update Product"
                : "Save Product";
    }
}


/* =========================================================
   DEACTIVATE OLD VARIANTS
   ========================================================= */

async function deactivateOldVariants(
    productId
) {

    const {
        data: oldVariants,
        error
    } = await sb
        .from("product_variants")
        .select("id")
        .eq(
            "product_id",
            productId
        );


    if (error)
        throw error;


    if (!oldVariants?.length)
        return;


    for (
        const variant of oldVariants
    ) {

        const {
            error: sizeError
        } = await sb
            .from("variant_sizes")
            .update({
                active:
                    false
            })
            .eq(
                "variant_id",
                variant.id
            );


        if (sizeError)
            throw sizeError;
    }


    const {
        error: variantError
    } = await sb
        .from("product_variants")
        .update({
            active:
                false
        })
        .eq(
            "product_id",
            productId
        );


    if (variantError)
        throw variantError;
}


/* =========================================================
   SAVE VARIANTS
   ========================================================= */

async function saveVariants(
    productId,
    variants
) {

    for (
        const variant of variants
    ) {

        let imageUrl =
            variant.image_url ||
            null;


        if (variant.imageFile) {

            imageUrl =
                await uploadImage(
                    variant.imageFile,
                    "variants"
                );
        }


        const variantData = {

            product_id:
                productId,

            name:
                variant.name ||
                null,

            image_url:
                imageUrl,

            active:
                true
        };


        const {
            data: savedVariant,
            error: variantError
        } = await sb
            .from("product_variants")
            .insert(
                variantData
            )
            .select("id")
            .single();


        if (variantError)
            throw variantError;


        if (!variant.sizes?.length)
            continue;


        const sizeRows =
            variant.sizes.map(
                size => ({

                    variant_id:
                        savedVariant.id,

                    size_name:
                        size.size_name,

                    stock:
                        Number(
                            size.stock ||
                            0
                        ),

                    price:
                        size.price == null
                            ? null
                            : Number(
                                size.price
                            ),

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


        if (sizeError)
            throw sizeError;
    }
}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

async function editProduct(
    productId
) {

    try {

        await openSection(
            "addProductSection"
        );


        showProductAlert(
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
                base_price,
                description,
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
                        size_name,
                        stock,
                        price,
                        active

                    )

                )

            `)
            .eq(
                "id",
                productId
            )
            .single();


        if (error)
            throw error;


        editingProductId =
            data.id;


        if (productFormTitle) {

            productFormTitle.textContent =
                "Edit Product";
        }


        if (saveProductButton) {

            saveProductButton.textContent =
                "Update Product";
        }


        productNameAdmin.value =
            data.name || "";


        regularPriceAdmin.value =
            data.regular_price ?? "";


        basePriceAdmin.value =
            data.base_price ?? "";


        descriptionAdmin.value =
            data.description || "";


        allowCodAdmin.checked =
            data.allow_cod !== false;


        allowAdvanceAdmin.checked =
            data.allow_advance === true;


        if (data.main_image_url) {

            mainImagePreviewImg.src =
                data.main_image_url;

            mainImagePreview.style.display =
                "block";
        }


        variantsContainer.innerHTML =
            "";


        const activeVariants =
            (
                data.product_variants ||
                []
            )
            .filter(
                v =>
                    v.active !== false
            );


        activeVariants.forEach(
            variant => {

                addVariant({

                    ...variant,

                    variant_sizes:
                        (
                            variant.variant_sizes ||
                            []
                        )
                        .filter(
                            size =>
                                size.active !== false
                        )

                });

            }
        );


        checkPaymentMethodsAdmin();


        showProductAlert(
            "Product edit করার জন্য প্রস্তুত।",
            "info"
        );


    } catch (error) {

        console.error(
            "Edit product error:",
            error
        );


        showProductAlert(
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

    if (!adminProductsList)
        return;


    adminProductsList.innerHTML =
        `<div class="admin-loading">
            Products loading...
        </div>`;


    try {

        const {
            data,
            error
        } = await sb
            .from("products")
            .select(`

                id,
                name,
                regular_price,
                base_price,
                description,
                main_image_url,
                active,

                product_variants (

                    id,
                    name,
                    active,

                    variant_sizes (
                        stock,
                        active
                    )

                )

            `)
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


        if (error)
            throw error;


        if (!data?.length) {

            adminProductsList.innerHTML =
                `<div class="empty-admin">
                    No products found.
                </div>`;

            return;
        }


        adminProductsList.innerHTML =
            data.map(
                product => {

                    const variants =
                        (
                            product.product_variants ||
                            []
                        )
                        .filter(
                            v =>
                                v.active !== false
                        );


                    let stock = 0;


                    variants.forEach(
                        variant => {

                            (
                                variant.variant_sizes ||
                                []
                            )
                            .filter(
                                size =>
                                    size.active !== false
                            )
                            .forEach(
                                size => {

                                    stock +=
                                        Number(
                                            size.stock ||
                                            0
                                        );

                                }
                            );

                        }
                    );


                    const image =
                        product.main_image_url

                            ? `
                                <div class="admin-product-image">

                                    <img
                                        src="${escapeHTML(
                                            product.main_image_url
                                        )}"
                                        alt="${escapeHTML(
                                            product.name
                                        )}"
                                    >

                                </div>
                            `

                            : `
                                <div class="admin-product-image">

                                    <div class="no-image">
                                        No Image
                                    </div>

                                </div>
                            `;


                    const status =
                        product.active !== false
                            ? "Active"
                            : "Inactive";


                    return `

                        <div class="admin-product-card">

                            ${image}

                            <div class="admin-product-info">

                                <h3>
                                    ${escapeHTML(
                                        product.name
                                    )}
                                </h3>

                                <div class="admin-product-price">

                                    ${
                                        product.regular_price
                                            ? `
                                                <span class="admin-regular-price">
                                                    ${money(
                                                        product.regular_price
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }

                                    <span class="admin-sale-price">
                                        ${money(
                                            product.base_price
                                        )}
                                    </span>

                                </div>

                                <div class="admin-product-meta">
                                    Stock:
                                    <strong>
                                        ${stock}
                                    </strong>
                                </div>

                                <span
                                    class="admin-product-status ${
                                        product.active !== false
                                            ? "active"
                                            : "inactive"
                                    }"
                                >
                                    ${status}
                                </span>

                            </div>

                            <div class="admin-product-actions">

                                <button
                                    type="button"
                                    class="admin-edit-button edit-product-button"
                                    data-edit-id="${escapeHTML(
                                        product.id
                                    )}"
                                >
                                    Edit
                                </button>

                            </div>

                        </div>

                    `;

                }
            ).join("");


    } catch (error) {

        console.error(
            "Load products error:",
            error
        );


        adminProductsList.innerHTML =
            `<div class="admin-error">
                ${escapeHTML(
                    error.message ||
                    "Products load করতে সমস্যা হয়েছে।"
                )}
            </div>`;
    }
}


/* =========================================================
   NORMALIZE ORDER STATUS
   ========================================================= */

function normalizeOrderStatus(
    status
) {

    const value =
        String(
            status ||
            "pending"
        )
        .trim()
        .toLowerCase();


    if (
        value === "pending" ||
        value === "new"
    ) {

        return "new";
    }


    if (
        value === "shipped" ||
        value === "sent" ||
        value === "dispatched"
    ) {

        return "shipped";
    }


    if (
        value === "received" ||
        value === "delivered"
    ) {

        return "received";
    }


    if (
        value === "rejected" ||
        value === "declined"
    ) {

        return "rejected";
    }


    if (
        value === "completed" ||
        value === "complete"
    ) {

        return "completed";
    }


    return value ||
        "new";
}


/* =========================================================
   ORDER STATUS LABEL
   ========================================================= */

function getOrderStatusLabel(
    status
) {

    const labels = {

        new:
            "New",

        shipped:
            "Shipped",

        received:
            "Received",

        rejected:
            "Rejected",

        completed:
            "Completed"

    };


    return (
        labels[status] ||
        status
    );
}


/* =========================================================
   LOAD STATS
   ========================================================= */

async function loadStats() {

    if (statProducts)
        statProducts.textContent =
            "…";

    if (statStock)
        statStock.textContent =
            "…";

    if (statPendingOrders)
        statPendingOrders.textContent =
            "…";

    if (statCompletedOrders)
        statCompletedOrders.textContent =
            "…";


    try {

        const [
            productsResult,
            sizesResult,
            ordersResult
        ] = await Promise.all([

            sb
                .from("products")
                .select(
                    "id, active"
                ),

            sb
                .from("variant_sizes")
                .select(
                    "stock, active"
                ),

            sb
                .from("orders")
                .select(
                    "id, status"
                )

        ]);


        if (productsResult.error)
            throw productsResult.error;


        if (sizesResult.error)
            throw sizesResult.error;


        if (ordersResult.error)
            throw ordersResult.error;


        const products =
            productsResult.data ||
            [];


        const sizes =
            sizesResult.data ||
            [];


        const orders =
            ordersResult.data ||
            [];


        const totalProducts =
            products.filter(
                p =>
                    p.active !== false
            ).length;


        const totalStock =
            sizes
                .filter(
                    s =>
                        s.active !== false
                )
                .reduce(
                    (
                        sum,
                        s
                    ) =>
                        sum +
                        Number(
                            s.stock ||
                            0
                        ),
                    0
                );


        const newOrders =
            orders.filter(
                order =>
                    normalizeOrderStatus(
                        order.status
                    ) === "new"
            ).length;


        const completedOrders =
            orders.filter(
                order =>
                    normalizeOrderStatus(
                        order.status
                    ) === "completed"
            ).length;


        if (statProducts) {

            statProducts.textContent =
                String(
                    totalProducts
                );
        }


        if (statStock) {

            statStock.textContent =
                String(
                    totalStock
                );
        }


        if (statPendingOrders) {

            statPendingOrders.textContent =
                String(
                    newOrders
                );
        }


        if (statCompletedOrders) {

            statCompletedOrders.textContent =
                String(
                    completedOrders
                );
        }


    } catch (error) {

        console.error(
            "Stats error:",
            error
        );


        if (statProducts)
            statProducts.textContent =
                "0";

        if (statStock)
            statStock.textContent =
                "0";

        if (statPendingOrders)
            statPendingOrders.textContent =
                "0";

        if (statCompletedOrders)
            statCompletedOrders.textContent =
                "0";
    }
}


/* =========================================================
   LOAD ORDERS
   ========================================================= */

async function loadOrders() {

    if (!adminOrdersList)
        return;


    adminOrdersList.innerHTML =
        `<div class="admin-loading">
            Orders loading...
        </div>`;


    try {

        const {
            data,
            error
        } = await sb
            .from("orders")
            .select("*")
            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


        if (error)
            throw error;


        allOrders =
            data || [];


        filterOrders(
            currentOrderFilter,
            false
        );


    } catch (error) {

        console.error(
            "Load orders error:",
            error
        );


        adminOrdersList.innerHTML =
            `<div class="admin-error">
                ${escapeHTML(
                    error.message ||
                    "Orders load করতে সমস্যা হয়েছে।"
                )}
            </div>`;
    }
}


/* =========================================================
   REALTIME ORDER LISTENER
   ========================================================= */

function startOrderRealtime() {

    if (!adminIsLoggedIn)
        return;


    /*
       আগে পুরোনো channel থাকলে remove করা।
    */

    stopOrderRealtime();


    console.log(
        "Starting Supabase order realtime..."
    );


    ordersRealtimeChannel =
        sb
            .channel(
                "admin-orders-realtime"
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "orders"
                },
                async payload => {

                    console.log(
                        "NEW ORDER RECEIVED:",
                        payload
                    );


                    /*
                       নতুন order database-এ আসার
                       সাথে সাথে সম্পূর্ণ order list
                       আবার load হবে।
                    */

                    await loadOrders();

                    await loadStats();


                    /*
                       Browser notification permission থাকলে
                       notification দেখানোর চেষ্টা।
                    */

                    showNewOrderNotification(
                        payload?.new
                    );

                }
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "UPDATE",

                    schema:
                        "public",

                    table:
                        "orders"
                },
                async payload => {

                    console.log(
                        "ORDER UPDATED:",
                        payload
                    );


                    await loadOrders();

                    await loadStats();

                }
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "DELETE",

                    schema:
                        "public",

                    table:
                        "orders"
                },
                async payload => {

                    console.log(
                        "ORDER DELETED:",
                        payload
                    );


                    await loadOrders();

                    await loadStats();

                }
            )
            .subscribe(
                status => {

                    console.log(
                        "Order realtime status:",
                        status
                    );

                }
            );
}


function stopOrderRealtime() {

    if (
        ordersRealtimeChannel
    ) {

        try {

            sb.removeChannel(
                ordersRealtimeChannel
            );

        } catch (error) {

            console.error(
                "Remove realtime channel error:",
                error
            );
        }

        ordersRealtimeChannel =
            null;
    }
}


/* =========================================================
   FALLBACK ORDER POLLING
   ========================================================= */

function startOrderPolling() {

    stopOrderPolling();


    /*
       প্রতি 10 সেকেন্ডে database থেকে
       latest orders check করবে।

       Realtime কাজ করলেও এটা fallback হিসেবে থাকবে।
    */

    ordersRefreshTimer =
        setInterval(
            async () => {

                if (
                    !adminIsLoggedIn
                ) {
                    return;
                }


                try {

                    await loadOrders();

                    await loadStats();

                } catch (error) {

                    console.error(
                        "Automatic order refresh error:",
                        error
                    );
                }

            },
            10000
        );
}


function stopOrderPolling() {

    if (
        ordersRefreshTimer
    ) {

        clearInterval(
            ordersRefreshTimer
        );

        ordersRefreshTimer =
            null;
    }
}


/* =========================================================
   NEW ORDER NOTIFICATION
   ========================================================= */

function showNewOrderNotification(
    order
) {

    console.log(
        "New order notification:",
        order
    );


    /*
       Browser notification permission থাকলে
       notification দেখাবে।
    */

    if (
        "Notification" in window &&
        Notification.permission ===
            "granted"
    ) {

        const customer =
            order?.customer_name ||
            order?.name ||
            "New customer";


        const product =
            order?.product_name ||
            order?.product ||
            "New product";


        try {

            new Notification(
                "🛍️ New Order!",
                {
                    body:
                        `${customer} ordered ${product}`,
                    tag:
                        "my-shop-new-order"
                }
            );

        } catch (error) {

            console.error(
                "Notification error:",
                error
            );
        }
    }
}


/* =========================================================
   REQUEST NOTIFICATION PERMISSION
   ========================================================= */

async function requestNotificationPermission() {

    if (
        !("Notification" in window)
    ) {
        return;
    }


    if (
        Notification.permission ===
        "default"
    ) {

        try {

            await Notification.requestPermission();

        } catch (error) {

            console.error(
                "Notification permission error:",
                error
            );
        }
    }
}


/* =========================================================
   RENDER ORDERS
   ========================================================= */

function renderOrders(
    orders
) {

    if (!adminOrdersList)
        return;


    if (!orders?.length) {

        const message =
            currentOrderFilter ===
            "all"

                ? "No orders found."

                : "এই filter-এ কোনো order নেই।";


        adminOrdersList.innerHTML =
            `<div class="order-empty">
                ${escapeHTML(
                    message
                )}
            </div>`;


        return;
    }


    adminOrdersList.innerHTML =
        orders.map(
            order => {

                const status =
                    normalizeOrderStatus(
                        order.status
                    );


                const statusLabel =
                    getOrderStatusLabel(
                        status
                    );


                const date =
                    order.created_at
                        ? new Date(
                            order.created_at
                        ).toLocaleString(
                            "en-BD"
                        )
                        : "";


                const customerName =
                    order.customer_name ||
                    order.name ||
                    "Unknown";


                const phone =
                    order.phone ||
                    order.customer_phone ||
                    "";


                const address =
                    order.address ||
                    "";


                const productName =
                    order.product_name ||
                    order.product ||
                    "";


                const variantName =
                    order.variant_name ||
                    "";


                const sizeName =
                    order.size_name ||
                    "";


                const quantity =
                    order.quantity ||
                    1;


                const amount =
                    order.total_amount ??
                    order.total ??
                    order.amount ??
                    0;


                const paymentMethod =
                    order.payment_method ||
                    "";


                const transactionId =
                    order.transaction_id ||
                    "";


                return `

                    <div
                        class="admin-order-card"
                    >

                        <div class="order-main">

                            <div class="order-title">

                                Order #
                                ${escapeHTML(
                                    order.id
                                )}

                            </div>


                            <div class="order-customer">

                                Customer:
                                ${escapeHTML(
                                    customerName
                                )}

                            </div>


                            ${
                                phone
                                    ? `
                                        <div class="order-phone">
                                            <strong>Phone:</strong>
                                            ${escapeHTML(
                                                phone
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                address
                                    ? `
                                        <div class="order-address">
                                            <strong>Address:</strong>
                                            ${escapeHTML(
                                                address
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                productName
                                    ? `
                                        <div class="order-product">
                                            <strong>Product:</strong>
                                            ${escapeHTML(
                                                productName
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                variantName
                                    ? `
                                        <div class="order-variant">
                                            <strong>Variant:</strong>
                                            ${escapeHTML(
                                                variantName
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                sizeName
                                    ? `
                                        <div class="order-variant">
                                            <strong>Size:</strong>
                                            ${escapeHTML(
                                                sizeName
                                            )}
                                        </div>
                                    `
                                    : ""
                            }


                            <div
                                style="
                                    margin-top:5px;
                                "
                            >

                                <strong>
                                    Quantity:
                                </strong>

                                ${escapeHTML(
                                    quantity
                                )}

                            </div>


                            <div class="order-total">

                                ${money(
                                    amount
                                )}

                            </div>


                            ${
                                paymentMethod ||
                                transactionId
                                    ? `
                                        <div class="order-payment">

                                            ${
                                                paymentMethod
                                                    ? `
                                                        <div>
                                                            <strong>
                                                                Payment:
                                                            </strong>

                                                            ${escapeHTML(
                                                                paymentMethod
                                                            )}
                                                        </div>
                                                    `
                                                    : ""
                                            }


                                            ${
                                                transactionId
                                                    ? `
                                                        <div>
                                                            <strong>
                                                                Transaction ID:
                                                            </strong>

                                                            ${escapeHTML(
                                                                transactionId
                                                            )}
                                                        </div>
                                                    `
                                                    : ""
                                            }

                                        </div>
                                    `
                                    : ""
                            }


                            ${
                                date
                                    ? `
                                        <div class="order-date">
                                            ${escapeHTML(
                                                date
                                            )}
                                        </div>
                                    `
                                    : ""
                            }

                        </div>


                        <div class="order-actions">

                            <span
                                class="
                                    order-status
                                    ${escapeHTML(
                                        status
                                    )}
                                "
                            >
                                ${escapeHTML(
                                    statusLabel
                                )}
                            </span>


                            ${
                                status === "new"
                                    ? `
                                        <button
                                            type="button"
                                            class="order-status-button"
                                            data-order-id="${escapeHTML(
                                                order.id
                                            )}"
                                            data-new-status="shipped"
                                        >
                                            📦 Mark Shipped
                                        </button>
                                    `
                                    : ""
                            }


                            ${
                                status === "shipped"
                                    ? `
                                        <button
                                            type="button"
                                            class="order-status-button"
                                            data-order-id="${escapeHTML(
                                                order.id
                                            )}"
                                            data-new-status="received"
                                        >
                                            ✅ Mark Received
                                        </button>
                                    `
                                    : ""
                            }


                            ${
                                status === "received"
                                    ? `

                                        <button
                                            type="button"
                                            class="order-status-button"
                                            data-order-id="${escapeHTML(
                                                order.id
                                            )}"
                                            data-new-status="completed"
                                        >
                                            🏁 Mark Completed
                                        </button>


                                        <button
                                            type="button"
                                            class="order-status-button"
                                            data-order-id="${escapeHTML(
                                                order.id
                                            )}"
                                            data-new-status="rejected"
                                        >
                                            ❌ Mark Rejected
                                        </button>

                                    `
                                    : ""
                            }


                            ${
                                status === "completed"
                                    ? `
                                        <button
                                            type="button"
                                            class="delete-order-button"
                                            data-order-id="${escapeHTML(
                                                order.id
                                            )}"
                                        >
                                            🗑️ Delete Order
                                        </button>
                                    `
                                    : ""
                            }


                            ${
                                status === "rejected"
                                    ? `
                                        <div
                                            style="
                                                color:#c00000;
                                                font-size:12px;
                                                font-weight:700;
                                            "
                                        >
                                            Order Rejected
                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                `;

            }
        ).join("");
}


/* =========================================================
   UPDATE ORDER STATUS
   ========================================================= */

async function updateOrderStatus(
    orderId,
    newStatus
) {

    if (
        !orderId ||
        !newStatus
    ) {
        return;
    }


    const labels = {

        shipped:
            "Shipped",

        received:
            "Received",

        rejected:
            "Rejected",

        completed:
            "Completed"

    };


    const label =
        labels[newStatus] ||
        newStatus;


    const confirmed =
        confirm(
            `এই order-টি "${label}" হিসেবে update করবেন?`
        );


    if (!confirmed)
        return;


    try {

        const {
            error
        } = await sb
            .from("orders")
            .update({
                status:
                    newStatus
            })
            .eq(
                "id",
                orderId
            );


        if (error)
            throw error;


        await Promise.allSettled([

            loadOrders(),

            loadStats()

        ]);


    } catch (error) {

        console.error(
            "Order status update error:",
            error
        );


        alert(
            error.message ||
            "Order status update করতে সমস্যা হয়েছে।"
        );
    }
}


/* =========================================================
   DELETE COMPLETED ORDER
   ========================================================= */

async function deleteCompletedOrder(
    orderId
) {

    if (!orderId)
        return;


    const order =
        allOrders.find(
            item =>
                String(item.id) ===
                String(orderId)
        );


    if (!order) {

        alert(
            "Order পাওয়া যায়নি।"
        );

        return;
    }


    const status =
        normalizeOrderStatus(
            order.status
        );


    if (
        status !==
        "completed"
    ) {

        alert(
            "শুধু Completed order delete করা যাবে।"
        );

        return;
    }


    const confirmed =
        confirm(
            "এই Completed order স্থায়ীভাবে delete করবেন?"
        );


    if (!confirmed)
        return;


    try {

        const {
            error
        } = await sb
            .from("orders")
            .delete()
            .eq(
                "id",
                orderId
            );


        if (error)
            throw error;


        await Promise.allSettled([

            loadOrders(),

            loadStats()

        ]);


    } catch (error) {

        console.error(
            "Delete order error:",
            error
        );


        alert(
            error.message ||
            "Order delete করতে সমস্যা হয়েছে।"
        );
    }
}


/* =========================================================
   ORDER FILTER
   ========================================================= */

function filterOrders(
    filter,
    updateButtons = true
) {

    currentOrderFilter =
        String(
            filter ||
            "all"
        )
        .trim()
        .toLowerCase();


    if (updateButtons) {

        document
            .querySelectorAll(
                "[data-order-filter]"
            )
            .forEach(
                button => {

                    const buttonFilter =
                        String(
                            button.dataset.orderFilter ||
                            "all"
                        )
                        .toLowerCase();


                    button.classList.toggle(
                        "active",
                        buttonFilter ===
                        currentOrderFilter
                    );

                }
            );
    }


    if (
        currentOrderFilter ===
        "all"
    ) {

        renderOrders(
            allOrders
        );

        return;
    }


    const filtered =
        allOrders.filter(
            order => {

                const status =
                    normalizeOrderStatus(
                        order.status
                    );


                return (
                    status ===
                    currentOrderFilter
                );

            }
        );


    renderOrders(
        filtered
    );
}


/* =========================================================
   STORE SETTINGS
   ========================================================= */

async function loadStoreSettings() {

    try {

        const {
            data,
            error
        } = await sb
            .from("store_settings")
            .select("*")
            .eq(
                "id",
                1
            )
            .maybeSingle();


        if (error)
            throw error;


        if (!data)
            return;


        if (aboutUsAdmin)
            aboutUsAdmin.value =
                data.about_us ||
                "";


        if (contactPhoneAdmin)
            contactPhoneAdmin.value =
                data.contact_phone ||
                "";


        if (contactWhatsappAdmin)
            contactWhatsappAdmin.value =
                data.contact_whatsapp ||
                "";


        if (contactEmailAdmin)
            contactEmailAdmin.value =
                data.contact_email ||
                "";


        if (contactAddressAdmin)
            contactAddressAdmin.value =
                data.contact_address ||
                "";


        if (contactFacebookAdmin)
            contactFacebookAdmin.value =
                data.contact_facebook ||
                "";


        if (contactInstagramAdmin)
            contactInstagramAdmin.value =
                data.contact_instagram ||
                "";


    } catch (error) {

        console.error(
            "Settings load error:",
            error
        );


        showSettingsAlert(
            error.message ||
            "Settings load করতে সমস্যা হয়েছে।",
            "error"
        );
    }
}


async function saveStoreSettings(
    event
) {

    event.preventDefault();


    if (saveStoreSettingsButton) {

        saveStoreSettingsButton.disabled =
            true;

        saveStoreSettingsButton.textContent =
            "Saving...";
    }


    try {

        const settings = {

            id:
                1,

            about_us:
                aboutUsAdmin
                    ?.value
                    .trim() ||
                "",

            contact_phone:
                contactPhoneAdmin
                    ?.value
                    .trim() ||
                "",

            contact_whatsapp:
                contactWhatsappAdmin
                    ?.value
                    .trim() ||
                "",

            contact_email:
                contactEmailAdmin
                    ?.value
                    .trim() ||
                "",

            contact_address:
                contactAddressAdmin
                    ?.value
                    .trim() ||
                "",

            contact_facebook:
                contactFacebookAdmin
                    ?.value
                    .trim() ||
                "",

            contact_instagram:
                contactInstagramAdmin
                    ?.value
                    .trim() ||
                ""

        };


        const {
            error
        } = await sb
            .from("store_settings")
            .upsert(
                settings,
                {
                    onConflict:
                        "id"
                }
            );


        if (error)
            throw error;


        showSettingsAlert(
            "Settings successfully saved!",
            "success"
        );


    } catch (error) {

        console.error(
            "Settings save error:",
            error
        );


        showSettingsAlert(
            error.message ||
            "Settings save করতে সমস্যা হয়েছে।",
            "error"
        );


    } finally {

        if (saveStoreSettingsButton) {

            saveStoreSettingsButton.disabled =
                false;

            saveStoreSettingsButton.textContent =
                "Save Store Settings";
        }
    }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /* LOGIN */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            loginAdmin
        );
    }


    /* LOGOUT */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logoutAdmin
        );
    }


    /* NAVIGATION */

    document
        .querySelectorAll(
            ".admin-nav-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const section =
                            button.dataset.section;


                        if (section) {

                            await openSection(
                                section
                            );
                        }

                    }
                );

            }
        );


    /* QUICK ACTIONS */

    document
        .querySelectorAll(
            ".quick-action-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        const section =
                            button.dataset.openSection;


                        if (section) {

                            await openSection(
                                section
                            );
                        }

                    }
                );

            }
        );


    /* PRODUCT SAVE */

    if (productForm) {

        productForm.addEventListener(
            "submit",
            saveProduct
        );
    }


    /* PRODUCT RESET */

    if (resetProductButton) {

        resetProductButton.addEventListener(
            "click",
            resetProductForm
        );
    }


    /* ADD VARIANT */

    if (addVariantButton) {

        addVariantButton.addEventListener(
            "click",
            () =>
                addVariant()
        );
    }


    /* MAIN IMAGE */

    if (mainImageAdmin) {

        mainImageAdmin.addEventListener(
            "change",
            previewMainImage
        );
    }


    /* PAYMENT */

    if (allowCodAdmin) {

        allowCodAdmin.addEventListener(
            "change",
            checkPaymentMethodsAdmin
        );
    }


    if (allowAdvanceAdmin) {

        allowAdvanceAdmin.addEventListener(
            "change",
            checkPaymentMethodsAdmin
        );
    }


    /* PRODUCT LIST */

    if (adminProductsList) {

        adminProductsList.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".edit-product-button"
                    );


                if (!button)
                    return;


                const productId =
                    button.dataset.editId;


                if (productId) {

                    editProduct(
                        productId
                    );
                }

            }
        );
    }


    /* VARIANTS / SIZES */

    if (variantsContainer) {

        variantsContainer.addEventListener(
            "click",
            event => {

                const removeVariantButton =
                    event.target.closest(
                        ".remove-variant-button"
                    );


                if (
                    removeVariantButton
                ) {

                    const variant =
                        removeVariantButton.closest(
                            ".admin-variant"
                        );


                    if (variant) {

                        variant.remove();
                    }


                    return;
                }


                const addSizeButton =
                    event.target.closest(
                        ".add-size-button"
                    );


                if (addSizeButton) {

                    const variant =
                        addSizeButton.closest(
                            ".admin-variant"
                        );


                    const sizesContainer =
                        variant?.querySelector(
                            ".variant-sizes"
                        );


                    if (sizesContainer) {

                        addSizeRow(
                            sizesContainer
                        );
                    }


                    return;
                }


                const removeSizeButton =
                    event.target.closest(
                        ".remove-size-button"
                    );


                if (
                    removeSizeButton
                ) {

                    const row =
                        removeSizeButton.closest(
                            ".admin-size-row"
                        );


                    if (row) {

                        row.remove();
                    }
                }

            }
        );
    }


    /* =====================================================
       ORDERS
       ===================================================== */

    if (adminOrdersList) {

        adminOrdersList.addEventListener(
            "click",
            event => {

                const statusButton =
                    event.target.closest(
                        ".order-status-button"
                    );


                if (statusButton) {

                    const orderId =
                        statusButton.dataset.orderId;


                    const newStatus =
                        statusButton.dataset.newStatus;


                    if (
                        orderId &&
                        newStatus
                    ) {

                        updateOrderStatus(
                            orderId,
                            newStatus
                        );
                    }


                    return;
                }


                const deleteButton =
                    event.target.closest(
                        ".delete-order-button"
                    );


                if (deleteButton) {

                    const orderId =
                        deleteButton.dataset.orderId;


                    if (orderId) {

                        deleteCompletedOrder(
                            orderId
                        );
                    }

                }

            }
        );
    }


    /* =====================================================
       ORDER FILTER BUTTONS
       ===================================================== */

    document
        .querySelectorAll(
            "[data-order-filter]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const filter =
                            button.dataset.orderFilter ||
                            "all";


                        filterOrders(
                            filter,
                            true
                        );

                    }
                );

            }
        );


    /* SETTINGS */

    if (storeSettingsForm) {

        storeSettingsForm.addEventListener(
            "submit",
            saveStoreSettings
        );
    }

}


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
    async (
        event,
        session
    ) => {

        if (
            event ===
            "SIGNED_OUT"
        ) {

            adminIsLoggedIn =
                false;

            stopOrderRealtime();

            stopOrderPolling();

            showLoginScreen();

            return;
        }


        if (
            event ===
            "SIGNED_IN" &&
            session?.user
        ) {

            /*
               এখানে সরাসরি dashboard চালানো হচ্ছে না,
               কারণ loginAdmin/checkExistingSession
               already dashboard চালায়।
            */

            console.log(
                "Admin signed in."
            );
        }

    }
);


/* =========================================================
   INIT
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEventListeners();

        checkPaymentMethodsAdmin();

        /*
           Browser notification permission চাইবে।
        */

        await requestNotificationPermission();

        await checkExistingSession();

    }
);
