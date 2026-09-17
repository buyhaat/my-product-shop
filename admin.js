/* =========================================================
   MY SHOP ADMIN PANEL
   Complete version matched with current admin.html

   Login
   Dashboard
   Add Product
   Edit Product
   Variants
   Sizes
   Image Upload
   Products
   Orders
   Store Settings
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   HELPER
   ========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   DOM
   ========================================================= */

const adminLogin = $("adminLogin");
const adminDashboard = $("adminDashboard");

const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginMessage = $("loginMessage");
const loginButton = $("loginButton");

const logoutButton = $("logoutButton");
const adminUserEmail = $("adminUserEmail");


/* Product */

const productForm = $("productForm");
const productFormTitle = $("productFormTitle");
const productFormAlert = $("productFormAlert");

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

const saveProductButton = $("saveProductButton");
const resetProductButton = $("resetProductButton");


/* Products */

const adminProductsList = $("adminProductsList");


/* Orders */

const adminOrdersList = $("adminOrdersList");


/* Stats */

const statProducts = $("statProducts");
const statStock = $("statStock");
const statPendingOrders = $("statPendingOrders");
const statCompletedOrders = $("statCompletedOrders");


/* Settings */

const storeSettingsForm = $("storeSettingsForm");
const storeSettingsAlert = $("storeSettingsAlert");

const aboutUsAdmin = $("aboutUsAdmin");
const contactPhoneAdmin = $("contactPhoneAdmin");
const contactWhatsappAdmin = $("contactWhatsappAdmin");
const contactEmailAdmin = $("contactEmailAdmin");
const contactAddressAdmin = $("contactAddressAdmin");
const contactFacebookAdmin = $("contactFacebookAdmin");
const contactInstagramAdmin = $("contactInstagramAdmin");

const saveStoreSettingsButton =
    $("saveStoreSettingsButton");


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let editingProductId = null;


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

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


/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function formatNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString(
        "en-BD",
        {
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(
        "en-BD",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


/* =========================================================
   PRODUCT ALERT
   ========================================================= */

function showProductAlert(
    message,
    type = "info"
) {

    if (!productFormAlert) {
        return;
    }

    productFormAlert.textContent = message;

    productFormAlert.className =
        "form-alert " + type;

    productFormAlert.style.display =
        "block";
}


function hideProductAlert() {

    if (!productFormAlert) {
        return;
    }

    productFormAlert.textContent = "";

    productFormAlert.className =
        "form-alert";

    productFormAlert.style.display =
        "none";
}


/* =========================================================
   LOGIN MESSAGE
   ========================================================= */

function showLoginMessage(
    message,
    type = "error"
) {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.style.display =
        "block";

    loginMessage.style.color =
        type === "success"
            ? "#16843a"
            : "#d00000";
}


function hideLoginMessage() {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = "";

    loginMessage.style.display =
        "none";
}


/* =========================================================
   SETTINGS ALERT
   ========================================================= */

function showSettingsAlert(
    message,
    type = "info"
) {

    if (!storeSettingsAlert) {
        return;
    }

    storeSettingsAlert.textContent =
        message;

    storeSettingsAlert.className =
        "form-alert " + type;

    storeSettingsAlert.style.display =
        "block";
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginAdmin(event) {

    event.preventDefault();

    hideLoginMessage();

    const email =
        loginEmail?.value.trim();

    const password =
        loginPassword?.value || "";


    if (!email || !password) {

        showLoginMessage(
            "Please enter email and password."
        );

        return;
    }


    try {

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent =
                "Logging in...";
        }


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


        currentUser =
            data?.user || null;


        if (!currentUser) {

            throw new Error(
                "Login succeeded but user information was not found."
            );
        }


        await verifyAdminUser();


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        showLoginMessage(
            error?.message ||
            "Login failed."
        );


    } finally {

        if (loginButton) {

            loginButton.disabled = false;

            loginButton.textContent =
                "Login";
        }
    }
}


/* =========================================================
   VERIFY ADMIN
   ========================================================= */

async function verifyAdminUser() {

    if (!currentUser) {
        return false;
    }


    try {

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
            throw error;
        }


        if (!data) {

            await sb.auth.signOut();

            currentUser = null;

            showLoginMessage(
                "You are not authorized to access the admin panel."
            );

            return false;
        }


        showDashboard();

        return true;


    } catch (error) {

        console.error(
            "Admin verification error:",
            error
        );


        showLoginMessage(
            "Could not verify admin account: " +
            (
                error?.message ||
                "Unknown error"
            )
        );

        return false;
    }
}


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

function showDashboard() {

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
            currentUser?.email || "";
    }


    showSection(
        "dashboardSection"
    );


    loadDashboardStats();

    loadProducts();

    loadOrders();

    loadStoreSettings();

    resetProductForm();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutAdmin() {

    try {

        await sb.auth.signOut();

        currentUser = null;
        editingProductId = null;


        if (adminDashboard) {

            adminDashboard.style.display =
                "none";
        }


        if (adminLogin) {

            adminLogin.style.display =
                "flex";
        }


        hideLoginMessage();


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }
}


/* =========================================================
   SHOW SECTION
   ========================================================= */

function showSection(sectionId) {

    document
        .querySelectorAll(".admin-section")
        .forEach(
            (section) => {

                section.classList.remove(
                    "active"
                );

                section.style.display =
                    "none";
            }
        );


    const target =
        $(sectionId);


    if (target) {

        target.classList.add(
            "active"
        );

        target.style.display =
            "block";
    }


    document
        .querySelectorAll(".admin-nav-btn")
        .forEach(
            (button) => {

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
            }
        );


    if (
        sectionId ===
        "dashboardSection"
    ) {

        loadDashboardStats();
    }


    if (
        sectionId ===
        "productsSectionAdmin"
    ) {

        loadProducts();
    }


    if (
        sectionId ===
        "ordersSectionAdmin"
    ) {

        loadOrders();
    }


    if (
        sectionId ===
        "settingsSectionAdmin"
    ) {

        loadStoreSettings();
    }
}


/* =========================================================
   RESET PRODUCT FORM
   ========================================================= */

function resetProductForm() {

    editingProductId = null;


    if (productForm) {
        productForm.reset();
    }


    if (productFormTitle) {

        productFormTitle.textContent =
            "Add Product";
    }


    if (saveProductButton) {

        saveProductButton.textContent =
            "💾 Save Product";

        saveProductButton.disabled =
            false;
    }


    if (mainImagePreview) {

        mainImagePreview.style.display =
            "none";
    }


    if (mainImagePreviewImg) {

        mainImagePreviewImg.src =
            "";
    }


    if (mainImageAdmin) {

        mainImageAdmin.value =
            "";
    }


    if (variantsContainer) {

        variantsContainer.innerHTML =
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


    hideProductAlert();

    checkPaymentMethods();
}


/* =========================================================
   IMAGE PREVIEW
   ========================================================= */

function previewMainImage() {

    if (
        !mainImageAdmin ||
        !mainImagePreview ||
        !mainImagePreviewImg
    ) {
        return;
    }


    const file =
        mainImageAdmin.files?.[0];


    if (!file) {

        mainImagePreview.style.display =
            "none";

        mainImagePreviewImg.src =
            "";

        return;
    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        showProductAlert(
            "Please select an image file.",
            "error"
        );

        mainImageAdmin.value =
            "";

        return;
    }


    const reader =
        new FileReader();


    reader.onload =
        function (event) {

            mainImagePreviewImg.src =
                event.target.result;

            mainImagePreview.style.display =
                "block";
        };


    reader.readAsDataURL(file);
}


/* =========================================================
   PAYMENT METHODS
   ========================================================= */

function checkPaymentMethods() {

    if (
        !allowCodAdmin ||
        !allowAdvanceAdmin
    ) {
        return;
    }


    const noneSelected =
        !allowCodAdmin.checked &&
        !allowAdvanceAdmin.checked;


    if (noneSelected) {

        if (paymentWarningAdmin) {

            paymentWarningAdmin.style.display =
                "block";
        }

        return;
    }


    if (paymentWarningAdmin) {

        paymentWarningAdmin.style.display =
            "none";
    }
}


/* =========================================================
   ADD VARIANT
   ========================================================= */

function addVariant() {

    if (!variantsContainer) {
        return;
    }


    const variant =
        createVariantElement();


    variantsContainer.appendChild(
        variant
    );
}


/* =========================================================
   CREATE VARIANT
   ========================================================= */

function createVariantElement(
    variant = {}
) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "admin-variant";


    const name =
        variant.name ||
        variant.variant_name ||
        "";


    const price =
        variant.price ??
        "";


    const stock =
        variant.stock ??
        0;


    wrapper.innerHTML = `

        <div class="variant-header">

            <div style="flex:1;">

                <label>
                    Variant Name
                </label>

                <input
                    type="text"
                    class="variant-name admin-field-input"
                    placeholder="যেমন: Black / Red / XL"
                    value="${escapeHtml(name)}"
                    style="
                        width:100%;
                        padding:10px;
                        border:1px solid #ddd;
                        border-radius:7px;
                    "
                >

            </div>


            <button
                type="button"
                class="remove-variant-button"
            >
                Remove Variant
            </button>

        </div>


        <div
            style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
            "
        >

            <div>

                <label>
                    Variant Price
                </label>

                <input
                    type="number"
                    class="variant-price"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value="${escapeHtml(price)}"
                    style="
                        width:100%;
                        padding:10px;
                        border:1px solid #ddd;
                        border-radius:7px;
                    "
                >

            </div>


            <div>

                <label>
                    Variant Stock
                </label>

                <input
                    type="number"
                    class="variant-stock"
                    min="0"
                    step="1"
                    placeholder="Stock"
                    value="${escapeHtml(stock)}"
                    style="
                        width:100%;
                        padding:10px;
                        border:1px solid #ddd;
                        border-radius:7px;
                    "
                >

            </div>

        </div>


        <div class="sizes-title">
            Sizes
        </div>


        <div class="variant-sizes"></div>


        <button
            type="button"
            class="add-size-button"
        >
            + Add Size
        </button>

    `;


    const removeButton =
        wrapper.querySelector(
            ".remove-variant-button"
        );


    removeButton?.addEventListener(
        "click",
        () => {

            wrapper.remove();
        }
    );


    const sizesContainer =
        wrapper.querySelector(
            ".variant-sizes"
        );


    const addSizeButton =
        wrapper.querySelector(
            ".add-size-button"
        );


    addSizeButton?.addEventListener(
        "click",
        () => {

            createSizeElement(
                sizesContainer
            );
        }
    );


    const existingSizes =
        Array.isArray(
            variant.variant_sizes
        )
            ? variant.variant_sizes
            : [];


    existingSizes
        .filter(
            (size) =>
                size.active !== false
        )
        .forEach(
            (size) => {

                createSizeElement(
                    sizesContainer,
                    size
                );
            }
        );


    return wrapper;
}


/* =========================================================
   CREATE SIZE
   ========================================================= */

function createSizeElement(
    container,
    size = {}
) {

    if (!container) {
        return;
    }


    const wrapper =
        document.createElement("div");


    wrapper.className =
        "admin-size-row";


    const sizeName =
        size.size ||
        size.name ||
        "";


    const sizePrice =
        size.price ??
        "";


    const sizeStock =
        size.stock ??
        0;


    wrapper.innerHTML = `

        <input
            type="text"
            class="size-name"
            placeholder="Size"
            value="${escapeHtml(sizeName)}"
        >


        <input
            type="number"
            class="size-price"
            placeholder="Price"
            min="0"
            step="0.01"
            value="${escapeHtml(sizePrice)}"
        >


        <input
            type="number"
            class="size-stock"
            placeholder="Stock"
            min="0"
            step="1"
            value="${escapeHtml(sizeStock)}"
        >


        <button
            type="button"
            class="remove-size-button"
            title="Remove size"
        >
            ×
        </button>

    `;


    const removeButton =
        wrapper.querySelector(
            ".remove-size-button"
        );


    removeButton?.addEventListener(
        "click",
        () => {

            wrapper.remove();
        }
    );


    container.appendChild(
        wrapper
    );


    return wrapper;
}


/* =========================================================
   COLLECT VARIANTS
   ========================================================= */

function collectVariants() {

    const variants = [];


    if (!variantsContainer) {
        return variants;
    }


    variantsContainer
        .querySelectorAll(
            ".admin-variant"
        )
        .forEach(
            (variantElement) => {

                const name =
                    variantElement
                        .querySelector(
                            ".variant-name"
                        )
                        ?.value
                        .trim() || "";


                const price =
                    Number(
                        variantElement
                            .querySelector(
                                ".variant-price"
                            )
                            ?.value || 0
                    );


                const stock =
                    Number(
                        variantElement
                            .querySelector(
                                ".variant-stock"
                            )
                            ?.value || 0
                    );


                if (!name) {
                    return;
                }


                const sizes = [];


                variantElement
                    .querySelectorAll(
                        ".admin-size-row"
                    )
                    .forEach(
                        (sizeElement) => {

                            const size =
                                sizeElement
                                    .querySelector(
                                        ".size-name"
                                    )
                                    ?.value
                                    .trim() || "";


                            const sizePrice =
                                Number(
                                    sizeElement
                                        .querySelector(
                                            ".size-price"
                                        )
                                        ?.value || 0
                                );


                            const sizeStock =
                                Number(
                                    sizeElement
                                        .querySelector(
                                            ".size-stock"
                                        )
                                        ?.value || 0
                                );


                            if (size) {

                                sizes.push({

                                    size,

                                    price:
                                        Number.isFinite(
                                            sizePrice
                                        )
                                            ? Math.max(
                                                0,
                                                sizePrice
                                            )
                                            : 0,

                                    stock:
                                        Number.isFinite(
                                            sizeStock
                                        )
                                            ? Math.max(
                                                0,
                                                sizeStock
                                            )
                                            : 0
                                });
                            }
                        }
                    );


                variants.push({

                    name,

                    price:
                        Number.isFinite(
                            price
                        )
                            ? Math.max(
                                0,
                                price
                            )
                            : 0,

                    stock:
                        Number.isFinite(
                            stock
                        )
                            ? Math.max(
                                0,
                                stock
                            )
                            : 0,

                    sizes
                });
            }
        );


    return variants;
}


/* =========================================================
   COLLECT PRODUCT FORM
   ========================================================= */

function collectProductForm() {

    const name =
        productNameAdmin?.value
            .trim() || "";


    const regularPrice =
        Number(
            regularPriceAdmin?.value || 0
        );


    const salePrice =
        Number(
            basePriceAdmin?.value || 0
        );


    const description =
        descriptionAdmin?.value
            .trim() || "";


    if (!name) {

        throw new Error(
            "Please enter product name."
        );
    }


    if (
        !Number.isFinite(
            regularPrice
        ) ||
        regularPrice < 0
    ) {

        throw new Error(
            "Please enter a valid regular price."
        );
    }


    if (
        !Number.isFinite(
            salePrice
        ) ||
        salePrice < 0
    ) {

        throw new Error(
            "Please enter a valid sale price."
        );
    }


    if (
        regularPrice > 0 &&
        salePrice > regularPrice
    ) {

        throw new Error(
            "Sale price cannot be higher than regular price."
        );
    }


    checkPaymentMethods();


    if (
        !allowCodAdmin?.checked &&
        !allowAdvanceAdmin?.checked
    ) {

        throw new Error(
            "Please select at least one payment method."
        );
    }


    return {

        name,

        regularPrice,

        salePrice,

        description,

        mainImageFile:
            mainImageAdmin
                ?.files?.[0] || null,

        allowCod:
            allowCodAdmin
                ?.checked ?? true,

        allowAdvance:
            allowAdvanceAdmin
                ?.checked ?? false,

        variants:
            collectVariants()
    };
}


/* =========================================================
   UPLOAD IMAGE
   ========================================================= */

async function uploadImage(
    file,
    folder = "products"
) {

    if (!file) {

        throw new Error(
            "Image file is required."
        );
    }


    const extension =
        (
            file.name
                .split(".")
                .pop() || "jpg"
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );


    const fileName =
        crypto.randomUUID() +
        "." +
        (
            extension ||
            "jpg"
        );


    const filePath =
        folder +
        "/" +
        fileName;


    const {
        error
    } = await sb.storage
        .from("product-images")
        .upload(
            filePath,
            file,
            {
                cacheControl: "3600",
                upsert: false,
                contentType:
                    file.type
            }
        );


    if (error) {

        console.error(
            "Storage upload error:",
            error
        );

        throw new Error(
            "Image upload failed: " +
            error.message
        );
    }


    const {
        data
    } = sb.storage
        .from("product-images")
        .getPublicUrl(
            filePath
        );


    if (
        !data ||
        !data.publicUrl
    ) {

        throw new Error(
            "Could not create public image URL."
        );
    }


    return data.publicUrl;
}


/* =========================================================
   SAVE VARIANTS
   ========================================================= */

async function saveVariants(
    productId,
    variants
) {

    if (
        !productId ||
        !Array.isArray(variants)
    ) {
        return;
    }


    for (
        const variant
        of variants
    ) {

        const {
            data: insertedVariant,
            error
        } = await sb
            .from(
                "product_variants"
            )
            .insert({

                product_id:
                    productId,

                name:
                    variant.name,

                price:
                    variant.price,

                stock:
                    variant.stock,

                active:
                    true
            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        if (
            insertedVariant &&
            variant.sizes?.length
        ) {

            const rows =
                variant.sizes.map(
                    (size) => ({

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
                .from(
                    "variant_sizes"
                )
                .insert(rows);


            if (sizeError) {
                throw sizeError;
            }
        }
    }
}


/* =========================================================
   DEACTIVATE OLD VARIANTS
   ========================================================= */

async function deactivateOldVariants(
    productId
) {

    const {
        data: variants,
        error
    } = await sb
        .from(
            "product_variants"
        )
        .select("id")
        .eq(
            "product_id",
            productId
        );


    if (error) {
        throw error;
    }


    if (
        !variants ||
        !variants.length
    ) {
        return;
    }


    const ids =
        variants.map(
            (variant) =>
                variant.id
        );


    const {
        error: sizeError
    } = await sb
        .from(
            "variant_sizes"
        )
        .update({
            active: false
        })
        .in(
            "variant_id",
            ids
        );


    if (sizeError) {
        throw sizeError;
    }


    const {
        error: variantError
    } = await sb
        .from(
            "product_variants"
        )
        .update({
            active: false
        })
        .eq(
            "product_id",
            productId
        );


    if (variantError) {
        throw variantError;
    }
}


/* =========================================================
   SAVE PRODUCT
   ========================================================= */

async function saveProduct(event) {

    event.preventDefault();

    hideProductAlert();


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


        if (saveProductButton) {

            saveProductButton.disabled =
                true;

            saveProductButton.textContent =
                "Saving...";
        }


        let mainImageUrl =
            null;


        /* =================================================
           EDIT
           ================================================= */

        if (editingProductId) {

            const {
                data: existingProduct,
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


            if (error) {
                throw error;
            }


            mainImageUrl =
                existingProduct
                    ?.main_image_url ||
                null;


            if (
                product.mainImageFile
            ) {

                mainImageUrl =
                    await uploadImage(
                        product.mainImageFile
                    );
            }
        }


        /* =================================================
           NEW PRODUCT
           ================================================= */

        else {

            mainImageUrl =
                await uploadImage(
                    product.mainImageFile
                );
        }


        const productData = {

            name:
                product.name,

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

            active:
                true
        };


        /* =================================================
           INSERT
           ================================================= */

        if (!editingProductId) {

            const {
                data:
                    insertedProduct,
                error
            } = await sb
                .from("products")
                .insert(
                    productData
                )
                .select()
                .single();


            if (error) {
                throw error;
            }


            await saveVariants(
                insertedProduct.id,
                product.variants
            );


            showProductAlert(
                "Product added successfully.",
                "success"
            );
        }


        /* =================================================
           UPDATE
           ================================================= */

        else {

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


            if (error) {
                throw error;
            }


            await deactivateOldVariants(
                editingProductId
            );


            await saveVariants(
                editingProductId,
                product.variants
            );


            showProductAlert(
                "Product updated successfully.",
                "success"
            );
        }


        await loadProducts();

        await loadDashboardStats();


        setTimeout(
            () => {

                resetProductForm();

                showSection(
                    "productsSectionAdmin"
                );

            },
            700
        );


    } catch (error) {

        console.error(
            "Save product error:",
            error
        );


        showProductAlert(
            error?.message ||
            "Could not save product.",
            "error"
        );


    } finally {

        if (saveProductButton) {

            saveProductButton.disabled =
                false;

            saveProductButton.textContent =
                editingProductId
                    ? "Update Product"
                    : "💾 Save Product";
        }
    }
}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

async function editProduct(
    productId
) {

    try {

        showSection(
            "addProductSection"
        );


        showProductAlert(
            "Loading product...",
            "info"
        );


        const {
            data: product,
            error
        } = await sb
            .from("products")
            .select(`
                *,
                product_variants (
                    *,
                    variant_sizes (*)
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


        if (!product) {

            throw new Error(
                "Product not found."
            );
        }


        editingProductId =
            product.id;


        if (productFormTitle) {

            productFormTitle.textContent =
                "Edit Product";
        }


        if (productNameAdmin) {

            productNameAdmin.value =
                product.name || "";
        }


        if (regularPriceAdmin) {

            regularPriceAdmin.value =
                product.regular_price ??
                product.base_price ??
                "";
        }


        if (basePriceAdmin) {

            basePriceAdmin.value =
                product.base_price ??
                "";
        }


        if (descriptionAdmin) {

            descriptionAdmin.value =
                product.description ||
                "";
        }


        if (allowCodAdmin) {

            allowCodAdmin.checked =
                product.allow_cod !== false;
        }


        if (allowAdvanceAdmin) {

            allowAdvanceAdmin.checked =
                product.allow_advance === true;
        }


        if (mainImagePreviewImg) {

            mainImagePreviewImg.src =
                product.main_image_url ||
                "";
        }


        if (
            mainImagePreview &&
            product.main_image_url
        ) {

            mainImagePreview.style.display =
                "block";
        }


        if (mainImageAdmin) {

            mainImageAdmin.value =
                "";
        }


        if (variantsContainer) {

            variantsContainer.innerHTML =
                "";


            const variants =
                Array.isArray(
                    product.product_variants
                )
                    ? product.product_variants
                        .filter(
                            (variant) =>
                                variant.active !== false
                        )
                    : [];


            variants.forEach(
                (variant) => {

                    variantsContainer
                        .appendChild(
                            createVariantElement(
                                variant
                            )
                        );
                }
            );
        }


        if (saveProductButton) {

            saveProductButton.textContent =
                "Update Product";
        }


        checkPaymentMethods();

        hideProductAlert();


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        console.error(
            "Edit product error:",
            error
        );


        showProductAlert(
            error?.message ||
            "Could not load product.",
            "error"
        );
    }
}


/* =========================================================
   ACTIVATE / DEACTIVATE
   ========================================================= */

async function setProductActive(
    productId,
    active
) {

    try {

        const {
            error
        } = await sb
            .from("products")
            .update({
                active
            })
            .eq(
                "id",
                productId
            );


        if (error) {
            throw error;
        }


        await loadProducts();

        await loadDashboardStats();


    } catch (error) {

        console.error(
            "Product status error:",
            error
        );


        alert(
            error?.message ||
            "Could not update product status."
        );
    }
}


async function deactivateProduct(
    productId
) {

    const confirmed =
        confirm(
            "Are you sure you want to disable this product?"
        );


    if (!confirmed) {
        return;
    }


    await setProductActive(
        productId,
        false
    );
}


async function activateProduct(
    productId
) {

    await setProductActive(
        productId,
        true
    );
}


/* =========================================================
   CALCULATE STOCK
   ========================================================= */

function calculateProductStock(
    product
) {

    const variants =
        Array.isArray(
            product.product_variants
        )
            ? product.product_variants
                .filter(
                    (variant) =>
                        variant.active !== false
                )
            : [];


    if (!variants.length) {

        return Number(
            product.stock || 0
        );
    }


    return variants.reduce(
        (
            total,
            variant
        ) => {

            const sizes =
                Array.isArray(
                    variant.variant_sizes
                )
                    ? variant.variant_sizes
                        .filter(
                            (size) =>
                                size.active !== false
                        )
                    : [];


            if (sizes.length) {

                return total +
                    sizes.reduce(
                        (
                            sizeTotal,
                            size
                        ) =>
                            sizeTotal +
                            Number(
                                size.stock || 0
                            ),
                        0
                    );
            }


            return total +
                Number(
                    variant.stock || 0
                );

        },
        0
    );
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

    if (!adminProductsList) {
        return;
    }


    adminProductsList.innerHTML =
        `
            <div class="admin-loading">
                Loading products...
            </div>
        `;


    try {

        const {
            data,
            error
        } = await sb
            .from("products")
            .select(`
                *,
                product_variants (
                    *,
                    variant_sizes (*)
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {
            throw error;
        }


        renderProducts(
            data || []
        );


    } catch (error) {

        console.error(
            "Load products error:",
            error
        );


        adminProductsList.innerHTML =
            `
                <div class="admin-error">
                    ${escapeHtml(
                        error?.message ||
                        "Could not load products."
                    )}
                </div>
            `;
    }
}


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

function renderProducts(
    products
) {

    if (!adminProductsList) {
        return;
    }


    if (!products.length) {

        adminProductsList.innerHTML =
            `
                <div class="empty-admin">
                    No products found.
                </div>
            `;

        return;
    }


    adminProductsList.innerHTML =
        products
            .map(
                (product) => {

                    const id =
                        JSON.stringify(
                            product.id
                        );


                    const image =
                        product.main_image_url ||
                        "";


                    const regular =
                        Number(
                            product.regular_price ??
                            product.base_price ??
                            0
                        );


                    const sale =
                        Number(
                            product.base_price ??
                            0
                        );


                    const stock =
                        calculateProductStock(
                            product
                        );


                    const active =
                        product.active !== false;


                    let priceHTML;


                    if (
                        regular > 0 &&
                        sale > 0 &&
                        sale < regular
                    ) {

                        priceHTML =
                            `
                                <span class="admin-regular-price">
                                    ৳${formatNumber(
                                        regular
                                    )}
                                </span>

                                <span class="admin-sale-price">
                                    ৳${formatNumber(
                                        sale
                                    )}
                                </span>
                            `;

                    } else {

                        priceHTML =
                            `
                                <span class="admin-sale-price">
                                    ৳${formatNumber(
                                        sale || regular
                                    )}
                                </span>
                            `;
                    }


                    return `

                        <div class="admin-product-card">

                            <div class="admin-product-image">

                                ${
                                    image
                                        ? `
                                            <img
                                                src="${escapeHtml(image)}"
                                                alt="${escapeHtml(product.name)}"
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
                                    ${escapeHtml(
                                        product.name
                                    )}
                                </h3>


                                <div class="admin-product-price">
                                    ${priceHTML}
                                </div>


                                <div class="admin-product-meta">

                                    Stock:
                                    <strong>
                                        ${formatNumber(stock)}
                                    </strong>

                                </div>


                                <span
                                    class="
                                        admin-product-status
                                        ${
                                            active
                                                ? "active"
                                                : "inactive"
                                        }
                                    "
                                >
                                    ${
                                        active
                                            ? "Active"
                                            : "Inactive"
                                    }
                                </span>

                            </div>


                            <div
                                style="
                                    display:flex;
                                    flex-direction:column;
                                    gap:7px;
                                "
                            >

                                <button
                                    type="button"
                                    class="admin-edit-button"
                                    onclick='editProduct(${id})'
                                >
                                    Edit
                                </button>


                                ${
                                    active
                                        ? `
                                            <button
                                                type="button"
                                                class="admin-edit-button"
                                                onclick='deactivateProduct(${id})'
                                            >
                                                Disable
                                            </button>
                                        `
                                        : `
                                            <button
                                                type="button"
                                                class="admin-edit-button"
                                                onclick='activateProduct(${id})'
                                            >
                                                Activate
                                            </button>
                                        `
                                }

                            </div>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   LOAD ORDERS
   ========================================================= */

async function loadOrders(
    statusFilter = "all"
) {

    if (!adminOrdersList) {
        return;
    }


    adminOrdersList.innerHTML =
        `
            <div class="admin-loading">
                Loading orders...
            </div>
        `;


    try {

        let query =
            sb
                .from("orders")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (
            statusFilter &&
            statusFilter !== "all"
        ) {

            query =
                query.eq(
                    "status",
                    statusFilter
                );
        }


        const {
            data,
            error
        } = await query;


        if (error) {
            throw error;
        }


        renderOrders(
            data || []
        );


    } catch (error) {

        console.error(
            "Load orders error:",
            error
        );


        adminOrdersList.innerHTML =
            `
                <div class="admin-error">
                    ${escapeHtml(
                        error?.message ||
                        "Could not load orders."
                    )}
                </div>
            `;
    }
}


/* =========================================================
   RENDER ORDERS
   ========================================================= */

function renderOrders(
    orders
) {

    if (!adminOrdersList) {
        return;
    }


    if (!orders.length) {

        adminOrdersList.innerHTML =
            `
                <div class="empty-admin">
                    No orders found.
                </div>
            `;

        return;
    }


    adminOrdersList.innerHTML =
        orders
            .map(
                (order) => {

                    const id =
                        JSON.stringify(
                            order.id
                        );


                    const status =
                        order.status ||
                        "pending";


                    const orderNumber =
                        order.order_number ||
                        order.id;


                    const customerName =
                        order.customer_name ||
                        order.name ||
                        "Unknown";


                    const phone =
                        order.customer_phone ||
                        order.phone ||
                        "";


                    const address =
                        order.customer_address ||
                        order.address ||
                        "";


                    const productName =
                        order.product_name ||
                        order.product ||
                        "";


                    const variant =
                        order.variant_name ||
                        order.variant ||
                        "";


                    const quantity =
                        Number(
                            order.quantity ||
                            1
                        );


                    const payment =
                        order.payment_method ||
                        "";


                    const trxId =
                        order.transaction_id ||
                        order.trx_id ||
                        "";


                    const total =
                        Number(
                            order.total_amount ??
                            order.total ??
                            0
                        );


                    return `

                        <div class="admin-order-card">

                            <div class="order-main">

                                <div class="order-title">
                                    Order #${escapeHtml(
                                        orderNumber
                                    )}
                                </div>


                                <div class="order-customer">
                                    ${escapeHtml(
                                        customerName
                                    )}
                                </div>


                                <div class="order-phone">
                                    📞 ${escapeHtml(
                                        phone
                                    )}
                                </div>


                                ${
                                    productName
                                        ? `
                                            <div class="order-product">
                                                📦 ${escapeHtml(
                                                    productName
                                                )}
                                            </div>
                                        `
                                        : ""
                                }


                                ${
                                    variant
                                        ? `
                                            <div class="order-variant">
                                                Variant:
                                                ${escapeHtml(
                                                    variant
                                                )}
                                            </div>
                                        `
                                        : ""
                                }


                                <div class="order-variant">
                                    Quantity:
                                    ${quantity}
                                </div>


                                <div class="order-address">
                                    📍 ${escapeHtml(
                                        address
                                    )}
                                </div>


                                <div class="order-payment">

                                    <strong>
                                        Payment:
                                    </strong>

                                    ${escapeHtml(
                                        payment ||
                                        "Not specified"
                                    )}

                                    ${
                                        trxId
                                            ? `
                                                <br>
                                                <strong>
                                                    TrxID:
                                                </strong>
                                                ${escapeHtml(
                                                    trxId
                                                )}
                                            `
                                            : ""
                                    }

                                </div>


                                <div class="order-total">
                                    ৳${formatNumber(
                                        total
                                    )}
                                </div>


                                <div class="order-date">
                                    ${escapeHtml(
                                        formatDate(
                                            order.created_at
                                        )
                                    )}
                                </div>

                            </div>


                            <div class="order-actions">

                                <span
                                    class="
                                        order-status
                                        ${escapeHtml(status)}
                                    "
                                >
                                    ${escapeHtml(
                                        status
                                    )}
                                </span>


                                ${
                                    status !== "completed"
                                        ? `
                                            <button
                                                type="button"
                                                class="complete-order-button"
                                                onclick='updateOrderStatus(${id}, "completed")'
                                            >
                                                ✓ Complete
                                            </button>
                                        `
                                        : ""
                                }


                                ${
                                    status !== "pending"
                                        ? `
                                            <button
                                                type="button"
                                                class="admin-btn admin-btn-secondary"
                                                onclick='updateOrderStatus(${id}, "pending")'
                                            >
                                                Pending
                                            </button>
                                        `
                                        : ""
                                }


                                ${
                                    status !== "cancelled"
                                        ? `
                                            <button
                                                type="button"
                                                class="admin-btn"
                                                style="
                                                    background:#ffe5e5;
                                                    color:#c00000;
                                                "
                                                onclick='updateOrderStatus(${id}, "cancelled")'
                                            >
                                                Cancel
                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   UPDATE ORDER STATUS
   ========================================================= */

async function updateOrderStatus(
    orderId,
    status
) {

    try {

        const {
            error
        } = await sb
            .from("orders")
            .update({
                status
            })
            .eq(
                "id",
                orderId
            );


        if (error) {
            throw error;
        }


        await loadOrders(
            getCurrentOrderFilter()
        );


        await loadDashboardStats();


    } catch (error) {

        console.error(
            "Update order status error:",
            error
        );


        alert(
            error?.message ||
            "Could not update order status."
        );
    }
}


/* =========================================================
   ORDER FILTER
   ========================================================= */

let currentOrderFilter =
    "all";


function getCurrentOrderFilter() {

    return currentOrderFilter;
}


function setupOrderFilters() {

    document
        .querySelectorAll(
            "[data-order-filter]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                "[data-order-filter]"
                            )
                            .forEach(
                                (btn) => {

                                    btn.classList.remove(
                                        "active"
                                    );
                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        currentOrderFilter =
                            button.dataset.orderFilter ||
                            "all";


                        loadOrders(
                            currentOrderFilter
                        );
                    }
                );
            }
        );
}


/* =========================================================
   DASHBOARD STATS
   ========================================================= */

async function loadDashboardStats() {

    try {

        /* PRODUCTS */

        const {
            data: products,
            error: productError
        } = await sb
            .from("products")
            .select(`
                id,
                active,
                stock,
                product_variants (
                    stock,
                    active,
                    variant_sizes (
                        stock,
                        active
                    )
                )
            `);


        if (productError) {
            throw productError;
        }


        const activeProducts =
            (products || [])
                .filter(
                    (product) =>
                        product.active !== false
                );


        let totalStock = 0;


        activeProducts.forEach(
            (product) => {

                totalStock +=
                    calculateProductStock(
                        product
                    );
            }
        );


        if (statProducts) {

            statProducts.textContent =
                activeProducts.length;
        }


        if (statStock) {

            statStock.textContent =
                totalStock;
        }


        /* ORDERS */

        const {
            data: orders,
            error: orderError
        } = await sb
            .from("orders")
            .select(
                "id, status"
            );


        if (orderError) {
            throw orderError;
        }


        const allOrders =
            orders || [];


        const pending =
            allOrders.filter(
                (order) =>
                    !order.status ||
                    order.status ===
                        "pending"
            ).length;


        const completed =
            allOrders.filter(
                (order) =>
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


    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );
    }
}


/* =========================================================
   STORE SETTINGS
   ========================================================= */

async function loadStoreSettings() {

    /*
     * This expects a table named:
     *
     * store_settings
     *
     * with one row for the shop.
     *
     * If the table doesn't exist yet, the rest of
     * the Admin Panel will still work.
     */


    try {

        const {
            data,
            error
        } = await sb
            .from(
                "store_settings"
            )
            .select("*")
            .limit(1)
            .maybeSingle();


        if (error) {

            console.warn(
                "Store settings table:",
                error.message
            );

            return;
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

        console.warn(
            "Load settings error:",
            error
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


    if (saveStoreSettingsButton) {

        saveStoreSettingsButton.disabled =
            true;

        saveStoreSettingsButton.textContent =
            "Saving...";
    }


    try {

        const settings = {

            about_us:
                aboutUsAdmin?.value
                    .trim() || "",

            phone:
                contactPhoneAdmin?.value
                    .trim() || "",

            whatsapp:
                contactWhatsappAdmin?.value
                    .trim() || "",

            email:
                contactEmailAdmin?.value
                    .trim() || "",

            address:
                contactAddressAdmin?.value
                    .trim() || "",

            facebook:
                contactFacebookAdmin?.value
                    .trim() || "",

            instagram:
                contactInstagramAdmin?.value
                    .trim() || ""
        };


        /*
         * Check whether a settings row exists.
         */

        const {
            data: existing,
            error: findError
        } = await sb
            .from(
                "store_settings"
            )
            .select("id")
            .limit(1)
            .maybeSingle();


        if (findError) {
            throw findError;
        }


        if (existing?.id) {

            const {
                error
            } = await sb
                .from(
                    "store_settings"
                )
                .update(settings)
                .eq(
                    "id",
                    existing.id
                );


            if (error) {
                throw error;
            }

        } else {

            const {
                error
            } = await sb
                .from(
                    "store_settings"
                )
                .insert(settings);


            if (error) {
                throw error;
            }
        }


        showSettingsAlert(
            "Store settings saved successfully.",
            "success"
        );


    } catch (error) {

        console.error(
            "Save settings error:",
            error
        );


        showSettingsAlert(
            error?.message ||
            "Could not save store settings.",
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
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            ".admin-nav-btn"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const section =
                            button.dataset.section;


                        if (section) {

                            showSection(
                                section
                            );
                        }
                    }
                );
            }
        );


    document
        .querySelectorAll(
            "[data-open-section]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const section =
                            button.dataset.openSection;


                        if (section) {

                            showSection(
                                section
                            );
                        }
                    }
                );
            }
        );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeAdmin() {

    try {

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

        setupNavigation();


        /* ORDERS */

        setupOrderFilters();


        /* PRODUCT FORM */

        if (productForm) {

            productForm.addEventListener(
                "submit",
                saveProduct
            );
        }


        /* RESET */

        if (resetProductButton) {

            resetProductButton.addEventListener(
                "click",
                resetProductForm
            );
        }


        /* IMAGE */

        if (mainImageAdmin) {

            mainImageAdmin.addEventListener(
                "change",
                previewMainImage
            );
        }


        /* VARIANT */

        if (addVariantButton) {

            addVariantButton.addEventListener(
                "click",
                addVariant
            );
        }


        /* PAYMENT */

        if (allowCodAdmin) {

            allowCodAdmin.addEventListener(
                "change",
                checkPaymentMethods
            );
        }


        if (allowAdvanceAdmin) {

            allowAdvanceAdmin.addEventListener(
                "change",
                checkPaymentMethods
            );
        }


        /* SETTINGS */

        if (storeSettingsForm) {

            storeSettingsForm.addEventListener(
                "submit",
                saveStoreSettings
            );
        }


        /* =================================================
           CHECK SESSION
           ================================================= */

        const {
            data,
            error
        } = await sb.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            return;
        }


        const session =
            data?.session;


        if (session?.user) {

            currentUser =
                session.user;


            await verifyAdminUser();

        } else {

            if (adminLogin) {

                adminLogin.style.display =
                    "flex";
            }


            if (adminDashboard) {

                adminDashboard.style.display =
                    "none";
            }
        }


        /* =================================================
           AUTH STATE
           ================================================= */

        sb.auth.onAuthStateChange(
            (
                event,
                session
            ) => {

                console.log(
                    "Auth event:",
                    event
                );


                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    currentUser =
                        null;


                    if (adminDashboard) {

                        adminDashboard.style.display =
                            "none";
                    }


                    if (adminLogin) {

                        adminLogin.style.display =
                            "flex";
                    }
                }
            }
        );


    } catch (error) {

        console.error(
            "Admin initialization error:",
            error
        );
    }
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.loginAdmin =
    loginAdmin;

window.logoutAdmin =
    logoutAdmin;

window.showSection =
    showSection;

window.addVariant =
    addVariant;

window.editProduct =
    editProduct;

window.activateProduct =
    activateProduct;

window.deactivateProduct =
    deactivateProduct;

window.updateOrderStatus =
    updateOrderStatus;

window.resetProductForm =
    resetProductForm;


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAdmin
    );

} else {

    initializeAdmin();
}
