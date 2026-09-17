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
   DOM HELPER
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
   ALERTS
   ========================================================= */

function showAlert(message, type = "info") {

    if (!productFormAlert) return;

    productFormAlert.textContent = message;
    productFormAlert.className = "form-alert " + type;
    productFormAlert.style.display = "block";
}


function hideAlert() {

    if (!productFormAlert) return;

    productFormAlert.textContent = "";
    productFormAlert.style.display = "none";
}


function showLoginAlert(message, type = "error") {

    if (!loginAlert) return;

    loginAlert.textContent = message;
    loginAlert.className = "form-alert " + type;
    loginAlert.style.display = "block";
}


function hideLoginAlert() {

    if (!loginAlert) return;

    loginAlert.textContent = "";
    loginAlert.style.display = "none";
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeHtmlAttribute(value) {

    return escapeHtml(value);
}


/* =========================================================
   PAYMENT METHODS
   ========================================================= */

function checkPaymentMethodsAdmin() {

    if (!allowCodAdmin || !allowAdvanceAdmin) return;

    if (!allowCodAdmin.checked && !allowAdvanceAdmin.checked) {
        allowCodAdmin.checked = true;
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginAdmin(event) {

    event.preventDefault();

    hideLoginAlert();

    const email = loginEmail?.value.trim();
    const password = loginPassword?.value;

    if (!email || !password) {

        showLoginAlert(
            "Please enter email and password.",
            "error"
        );

        return;
    }

    try {

        if (!window.supabase) {
            throw new Error("Supabase library is not loaded.");
        }

        const { data, error } =
            await sb.auth.signInWithPassword({
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
            error?.message || "Login failed.",
            "error"
        );
    }
}


/* =========================================================
   VERIFY ADMIN USER
   ========================================================= */

async function verifyAdminUser() {

    if (!currentUser) return false;

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

            currentUser = null;

            showLoginAlert(
                "You are not authorized to access the admin panel.",
                "error"
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

        showLoginAlert(
            "Could not verify admin account: " +
            (error?.message || "Unknown error"),
            "error"
        );

        return false;
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
        editingProductId = null;

        if (adminDashboard) {
            adminDashboard.style.display = "none";
        }

        if (adminLogin) {
            adminLogin.style.display = "block";
        }

        hideLoginAlert();

    } catch (error) {

        console.error("Logout error:", error);
    }
}


/* =========================================================
   ADMIN SECTIONS
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
   IMAGE PREVIEW
   ========================================================= */

function previewMainImage() {

    if (!mainImageAdmin || !mainImagePreview) return;

    const file = mainImageAdmin.files?.[0];

    if (!file) {

        mainImagePreview.innerHTML = "";
        return;
    }

    if (!file.type.startsWith("image/")) {

        mainImagePreview.innerHTML =
            "<p>Please select an image file.</p>";

        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        mainImagePreview.innerHTML = `
            <img
                src="${event.target.result}"
                alt="Preview"
                style="
                    max-width:180px;
                    max-height:180px;
                    object-fit:cover;
                    border-radius:10px;
                "
            >
        `;
    };

    reader.readAsDataURL(file);
}


/* =========================================================
   VARIANT ELEMENT
   ========================================================= */

function createVariantElement(variant = {}) {

    const wrapper = document.createElement("div");

    wrapper.className = "variant-item";

    const variantName =
        variant.name ||
        variant.variant_name ||
        "";

    const variantPrice =
        variant.price ??
        variant.sale_price ??
        "";

    const variantStock =
        variant.stock ??
        0;

    wrapper.innerHTML = `
        <div class="variant-header">
            <strong>Variant</strong>

            <button
                type="button"
                class="remove-variant-btn"
            >
                Remove
            </button>
        </div>

        <div class="variant-fields">

            <input
                type="text"
                class="variant-name"
                placeholder="Variant name"
                value="${escapeHtmlAttribute(variantName)}"
            >

            <input
                type="number"
                class="variant-price"
                placeholder="Price"
                min="0"
                step="0.01"
                value="${escapeHtmlAttribute(variantPrice)}"
            >

            <input
                type="number"
                class="variant-stock"
                placeholder="Stock"
                min="0"
                step="1"
                value="${escapeHtmlAttribute(variantStock)}"
            >

        </div>

        <div class="variant-sizes"></div>

        <button
            type="button"
            class="add-size-btn"
        >
            + Add Size
        </button>
    `;

    const removeBtn =
        wrapper.querySelector(".remove-variant-btn");

    removeBtn?.addEventListener("click", () => {
        wrapper.remove();
    });


    const addSizeBtn =
        wrapper.querySelector(".add-size-btn");

    const sizesContainer =
        wrapper.querySelector(".variant-sizes");


    addSizeBtn?.addEventListener("click", () => {

        createSizeElement(
            sizesContainer
        );
    });


    if (Array.isArray(variant.variant_sizes)) {

        variant.variant_sizes.forEach((size) => {

            createSizeElement(
                sizesContainer,
                size
            );
        });
    }


    return wrapper;
}


/* =========================================================
   SIZE ELEMENT
   ========================================================= */

function createSizeElement(container, size = {}) {

    if (!container) return;

    const wrapper = document.createElement("div");

    wrapper.className = "size-item";

    const sizeName =
        size.size ||
        size.name ||
        "";

    const sizeStock =
        size.stock ??
        0;

    wrapper.innerHTML = `
        <input
            type="text"
            class="size-name"
            placeholder="Size"
            value="${escapeHtmlAttribute(sizeName)}"
        >

        <input
            type="number"
            class="size-stock"
            placeholder="Stock"
            min="0"
            step="1"
            value="${escapeHtmlAttribute(sizeStock)}"
        >

        <button
            type="button"
            class="remove-size-btn"
        >
            Remove
        </button>
    `;

    const removeBtn =
        wrapper.querySelector(".remove-size-btn");

    removeBtn?.addEventListener("click", () => {
        wrapper.remove();
    });

    container.appendChild(wrapper);

    return wrapper;
}


/* =========================================================
   UPLOAD IMAGE
   ========================================================= */

async function uploadImage(file, folder = "products") {

    if (!file) {
        throw new Error("Image file is required.");
    }

    const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension =
        extension.replace(/[^a-z0-9]/g, "") || "jpg";

    const fileName =
        `${crypto.randomUUID()}.${safeExtension}`;

    const filePath =
        `${folder}/${fileName}`;


    const { error: uploadError } =
        await sb.storage
            .from("product-images")
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                }
            );


    if (uploadError) {

        console.error(
            "Image upload error:",
            uploadError
        );

        throw new Error(
            "Image upload failed: " +
            uploadError.message
        );
    }


    const { data } =
        sb.storage
            .from("product-images")
            .getPublicUrl(filePath);


    if (!data?.publicUrl) {

        throw new Error(
            "Could not create image URL."
        );
    }


    return data.publicUrl;
}


/* =========================================================
   COLLECT PRODUCT FORM
   ========================================================= */

function collectProductForm() {

    const name =
        productNameAdmin?.value.trim() || "";

    const regularPrice =
        Number(regularPriceAdmin?.value || 0);

    const salePrice =
        Number(basePriceAdmin?.value || 0);

    const description =
        descriptionAdmin?.value.trim() || "";


    if (!name) {
        throw new Error("Please enter product name.");
    }


    if (
        !Number.isFinite(regularPrice) ||
        regularPrice < 0
    ) {
        throw new Error(
            "Please enter a valid regular price."
        );
    }


    if (
        !Number.isFinite(salePrice) ||
        salePrice < 0
    ) {
        throw new Error(
            "Please enter a valid sale price."
        );
    }


    if (salePrice > regularPrice && regularPrice > 0) {

        throw new Error(
            "Sale price cannot be higher than regular price."
        );
    }


    checkPaymentMethodsAdmin();


    const variants = [];


    if (variantsContainer) {

        variantsContainer
            .querySelectorAll(".variant-item")
            .forEach((variantElement) => {

                const variantName =
                    variantElement
                        .querySelector(".variant-name")
                        ?.value.trim() || "";


                const variantPrice =
                    Number(
                        variantElement
                            .querySelector(".variant-price")
                            ?.value || 0
                    );


                const variantStock =
                    Number(
                        variantElement
                            .querySelector(".variant-stock")
                            ?.value || 0
                    );


                const sizes = [];


                variantElement
                    .querySelectorAll(".size-item")
                    .forEach((sizeElement) => {

                        const sizeName =
                            sizeElement
                                .querySelector(".size-name")
                                ?.value.trim() || "";


                        const sizeStock =
                            Number(
                                sizeElement
                                    .querySelector(".size-stock")
                                    ?.value || 0
                            );


                        if (sizeName) {

                            sizes.push({
                                size: sizeName,
                                stock:
                                    Number.isFinite(sizeStock)
                                        ? Math.max(0, sizeStock)
                                        : 0
                            });
                        }
                    });


                if (variantName) {

                    variants.push({
                        name: variantName,
                        price:
                            Number.isFinite(variantPrice)
                                ? Math.max(0, variantPrice)
                                : 0,
                        stock:
                            Number.isFinite(variantStock)
                                ? Math.max(0, variantStock)
                                : 0,
                        sizes
                    });
                }
            });
    }


    return {

        name,

        regularPrice,

        salePrice,

        description,

        mainImageFile:
            mainImageAdmin?.files?.[0] || null,

        allowCod:
            allowCodAdmin?.checked ?? true,

        allowAdvance:
            allowAdvanceAdmin?.checked ?? false,

        variants
    };
}


/* =========================================================
   SAVE VARIANTS
   ========================================================= */

async function saveVariants(productId, variants) {

    if (!productId) return;

    if (!Array.isArray(variants)) return;


    for (const variant of variants) {

        const { data: insertedVariant, error } =
            await sb
                .from("product_variants")
                .insert({
                    product_id: productId,
                    name: variant.name,
                    price: variant.price,
                    stock: variant.stock,
                    active: true
                })
                .select()
                .single();


        if (error) {

            console.error(
                "Variant insert error:",
                error
            );

            throw error;
        }


        if (
            insertedVariant &&
            Array.isArray(variant.sizes) &&
            variant.sizes.length
        ) {

            const sizeRows =
                variant.sizes.map((size) => ({
                    variant_id: insertedVariant.id,
                    size: size.size,
                    stock: size.stock,
                    active: true
                }));


            const { error: sizeError } =
                await sb
                    .from("variant_sizes")
                    .insert(sizeRows);


            if (sizeError) {

                console.error(
                    "Size insert error:",
                    sizeError
                );

                throw sizeError;
            }
        }
    }
}


/* =========================================================
   DEACTIVATE OLD VARIANTS
   ========================================================= */

async function deactivateOldVariants(productId) {

    if (!productId) return;

    const { data: oldVariants, error } =
        await sb
            .from("product_variants")
            .select("id")
            .eq("product_id", productId);


    if (error) {
        throw error;
    }


    if (!oldVariants || !oldVariants.length) {
        return;
    }


    const variantIds =
        oldVariants.map((variant) => variant.id);


    const { error: sizeError } =
        await sb
            .from("variant_sizes")
            .update({
                active: false
            })
            .in("variant_id", variantIds);


    if (sizeError) {
        throw sizeError;
    }


    const { error: variantError } =
        await sb
            .from("product_variants")
            .update({
                active: false
            })
            .eq("product_id", productId);


    if (variantError) {
        throw variantError;
    }
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


        if (saveProductBtn) {

            saveProductBtn.disabled = true;
            saveProductBtn.textContent = "Saving...";
        }


        let mainImageUrl = null;


        /* =================================================
           EDIT EXISTING PRODUCT
           ================================================= */

        if (editingProductId) {

            const {
                data: existingProduct,
                error
            } = await sb
                .from("products")
                .select("main_image_url")
                .eq("id", editingProductId)
                .single();


            if (error) {
                throw error;
            }


            mainImageUrl =
                existingProduct?.main_image_url || null;


            if (product.mainImageFile) {

                mainImageUrl =
                    await uploadImage(
                        product.mainImageFile,
                        "products"
                    );
            }
        }


        /* =================================================
           ADD NEW PRODUCT
           ================================================= */

        else {

            mainImageUrl =
                await uploadImage(
                    product.mainImageFile,
                    "products"
                );
        }


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


        /* =================================================
           INSERT
           ================================================= */

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


        /* =================================================
           UPDATE
           ================================================= */

        else {

            const {
                error
            } = await sb
                .from("products")
                .update(productData)
                .eq("id", editingProductId);


            if (error) {
                throw error;
            }


            /*
             * Old variants are deactivated first.
             * New variants are then inserted.
             */

            await deactivateOldVariants(
                editingProductId
            );


            await saveVariants(
                editingProductId,
                product.variants
            );


            showAlert(
                "Product updated successfully.",
                "success"
            );
        }


        await loadProducts();
        await loadStats();


        setTimeout(() => {

            resetProductForm();

        }, 700);


    } catch (error) {

        console.error(
            "Save product error:",
            error
        );


        showAlert(
            error?.message ||
            "Could not save product.",
            "error"
        );


    } finally {

        if (saveProductBtn) {

            saveProductBtn.disabled = false;

            saveProductBtn.textContent =
                editingProductId
                    ? "Update Product"
                    : "Save Product";
        }
    }
}


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

async function editProduct(productId) {

    try {

        hideAlert();


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
            .eq("id", productId)
            .single();


        if (error) {
            throw error;
        }


        if (!product) {
            throw new Error("Product not found.");
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


        if (mainImagePreview) {

            mainImagePreview.innerHTML =
                product.main_image_url
                    ? `
                        <img
                            src="${escapeHtmlAttribute(
                                product.main_image_url
                            )}"
                            alt="Current product image"
                            style="
                                max-width:180px;
                                max-height:180px;
                                object-fit:cover;
                                border-radius:10px;
                            "
                        >
                    `
                    : "";
        }


        if (mainImageAdmin) {

            mainImageAdmin.value = "";
        }


        if (variantsContainer) {

            variantsContainer.innerHTML = "";


            const variants =
                Array.isArray(product.product_variants)
                    ? product.product_variants.filter(
                        (variant) =>
                            variant.active !== false
                    )
                    : [];


            variants.forEach((variant) => {

                const element =
                    createVariantElement(variant);

                variantsContainer.appendChild(
                    element
                );
            });
        }


        if (saveProductBtn) {

            saveProductBtn.textContent =
                "Update Product";
        }


        showAdminSection(
            "productFormSection"
        );


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
            error?.message ||
            "Could not load product.",
            "error"
        );
    }
}


/* =========================================================
   DELETE / DISABLE PRODUCT
   ========================================================= */

async function deactivateProduct(productId) {

    if (!productId) return;


    const confirmed =
        window.confirm(
            "Are you sure you want to deactivate this product?"
        );


    if (!confirmed) return;


    try {

        const { error } =
            await sb
                .from("products")
                .update({
                    active: false
                })
                .eq("id", productId);


        if (error) {
            throw error;
        }


        await loadProducts();
        await loadStats();


    } catch (error) {

        console.error(
            "Deactivate product error:",
            error
        );


        alert(
            error?.message ||
            "Could not deactivate product."
        );
    }
}


/* =========================================================
   ACTIVATE PRODUCT
   ========================================================= */

async function activateProduct(productId) {

    if (!productId) return;


    try {

        const { error } =
            await sb
                .from("products")
                .update({
                    active: true
                })
                .eq("id", productId);


        if (error) {
            throw error;
        }


        await loadProducts();
        await loadStats();


    } catch (error) {

        console.error(
            "Activate product error:",
            error
        );


        alert(
            error?.message ||
            "Could not activate product."
        );
    }
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

    if (!productsList) return;


    productsList.innerHTML =
        "<p>Loading products...</p>";


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
            .order("created_at", {
                ascending: false
            });


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


        productsList.innerHTML = `
            <div class="form-alert error">
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

function renderProducts(products) {

    if (!productsList) return;


    if (!products.length) {

        productsList.innerHTML =
            "<p>No products found.</p>";

        return;
    }


    productsList.innerHTML =
        products.map((product) => {

            const id =
                JSON.stringify(product.id);


            const name =
                escapeHtml(product.name);


            const image =
                escapeHtmlAttribute(
                    product.main_image_url || ""
                );


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


            let priceHTML = "";


            if (
                regular > 0 &&
                sale > 0 &&
                sale < regular
            ) {

                priceHTML = `
                    <div>
                        <del>
                            ৳${formatNumber(regular)}
                        </del>

                        <strong>
                            ৳${formatNumber(sale)}
                        </strong>
                    </div>
                `;

            } else {

                priceHTML = `
                    <strong>
                        ৳${formatNumber(
                            sale || regular
                        )}
                    </strong>
                `;
            }


            return `
                <div class="admin-product-card">

                    <div class="admin-product-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${image}"
                                        alt="${name}"
                                    >
                                `
                                : `
                                    <div>
                                        No Image
                                    </div>
                                `
                        }

                    </div>


                    <div class="admin-product-info">

                        <h3>
                            ${name}
                        </h3>

                        <div class="admin-product-price">
                            ${priceHTML}
                        </div>

                        <p>
                            Stock:
                            <strong>
                                ${stock}
                            </strong>
                        </p>

                        <p>
                            Status:
                            <strong>
                                ${
                                    active
                                        ? "Active"
                                        : "Inactive"
                                }
                            </strong>
                        </p>


                        <div class="admin-product-actions">

                            <button
                                type="button"
                                onclick='editProduct(${id})'
                            >
                                Edit
                            </button>

                            ${
                                active
                                    ? `
                                        <button
                                            type="button"
                                            onclick='deactivateProduct(${id})'
                                        >
                                            Disable
                                        </button>
                                    `
                                    : `
                                        <button
                                            type="button"
                                            onclick='activateProduct(${id})'
                                        >
                                            Activate
                                        </button>
                                    `
                            }

                        </div>

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   CALCULATE PRODUCT STOCK
   ========================================================= */

function calculateProductStock(product) {

    const variants =
        Array.isArray(product.product_variants)
            ? product.product_variants.filter(
                (variant) =>
                    variant.active !== false
            )
            : [];


    if (!variants.length) {

        if (
            product.stock !== null &&
            product.stock !== undefined
        ) {
            return Number(product.stock) || 0;
        }

        return 0;
    }


    return variants.reduce(
        (total, variant) => {

            const sizes =
                Array.isArray(
                    variant.variant_sizes
                )
                    ? variant.variant_sizes.filter(
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
                            (Number(size.stock) || 0),
                        0
                    );
            }


            return total +
                (Number(variant.stock) || 0);

        },
        0
    );
}


/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function formatNumber(value) {

    const number =
        Number(value);

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
   LOAD ORDERS
   ========================================================= */

async function loadOrders() {

    if (!ordersList) return;


    ordersList.innerHTML =
        "<p>Loading orders...</p>";


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


        const status =
            orderStatusFilter?.value;


        if (
            status &&
            status !== "all"
        ) {

            query =
                query.eq(
                    "status",
                    status
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


        ordersList.innerHTML = `
            <div class="form-alert error">
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

function renderOrders(orders) {

    if (!ordersList) return;


    if (!orders.length) {

        ordersList.innerHTML =
            "<p>No orders found.</p>";

        return;
    }


    ordersList.innerHTML =
        orders.map((order) => {

            const id =
                JSON.stringify(order.id);


            const orderNumber =
                order.order_number ||
                order.id;


            const status =
                order.status ||
                "pending";


            const total =
                Number(
                    order.total_amount ??
                    order.total ??
                    0
                );


            const customerName =
                order.customer_name ||
                order.name ||
                "";


            const phone =
                order.customer_phone ||
                order.phone ||
                "";


            const address =
                order.customer_address ||
                order.address ||
                "";


            const paymentMethod =
                order.payment_method ||
                "";


            const createdAt =
                formatDate(
                    order.created_at
                );


            return `
                <div class="admin-order-card">

                    <div class="order-header">

                        <strong>
                            Order #${escapeHtml(
                                orderNumber
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                status
                            )}
                        </span>

                    </div>


                    <div class="order-body">

                        <p>
                            <strong>
                                Customer:
                            </strong>
                            ${escapeHtml(
                                customerName
                            )}
                        </p>

                        <p>
                            <strong>
                                Phone:
                            </strong>
                            ${escapeHtml(
                                phone
                            )}
                        </p>

                        <p>
                            <strong>
                                Address:
                            </strong>
                            ${escapeHtml(
                                address
                            )}
                        </p>

                        <p>
                            <strong>
                                Payment:
                            </strong>
                            ${escapeHtml(
                                paymentMethod
                            )}
                        </p>

                        <p>
                            <strong>
                                Total:
                            </strong>
                            ৳${formatNumber(
                                total
                            )}
                        </p>

                        <p>
                            <strong>
                                Date:
                            </strong>
                            ${escapeHtml(
                                createdAt
                            )}
                        </p>


                        <div class="order-actions">

                            ${
                                status !== "completed"
                                    ? `
                                        <button
                                            type="button"
                                            onclick='updateOrderStatus(${id}, "completed")'
                                        >
                                            Complete
                                        </button>
                                    `
                                    : ""
                            }


                            ${
                                status !== "cancelled"
                                    ? `
                                        <button
                                            type="button"
                                            onclick='updateOrderStatus(${id}, "cancelled")'
                                        >
                                            Cancel
                                        </button>
                                    `
                                    : ""
                            }


                            ${
                                status !== "pending"
                                    ? `
                                        <button
                                            type="button"
                                            onclick='updateOrderStatus(${id}, "pending")'
                                        >
                                            Pending
                                        </button>
                                    `
                                    : ""
                            }

                        </div>

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   UPDATE ORDER STATUS
   ========================================================= */

async function updateOrderStatus(
    orderId,
    newStatus
) {

    if (!orderId) return;


    try {

        const { error } =
            await sb
                .from("orders")
                .update({
                    status: newStatus
                })
                .eq("id", orderId);


        if (error) {
            throw error;
        }


        await loadOrders();
        await loadStats();


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
   LOAD STATS
   ========================================================= */

async function loadStats() {

    try {

        /* PRODUCTS */

        const {
            data: products,
            error: productsError
        } = await sb
            .from("products")
            .select(
                "id, active"
            );


        if (productsError) {
            throw productsError;
        }


        const activeProducts =
            (products || []).filter(
                (product) =>
                    product.active !== false
            ).length;


        if (totalProductsAdmin) {

            totalProductsAdmin.textContent =
                activeProducts;
        }


        /* ORDERS */

        const {
            data: orders,
            error: ordersError
        } = await sb
            .from("orders")
            .select(
                "id, status, total_amount, total"
            );


        if (ordersError) {
            throw ordersError;
        }


        const allOrders =
            orders || [];


        if (totalOrdersAdmin) {

            totalOrdersAdmin.textContent =
                allOrders.length;
        }


        const pendingOrders =
            allOrders.filter(
                (order) =>
                    !order.status ||
                    order.status === "pending"
            ).length;


        if (pendingOrdersAdmin) {

            pendingOrdersAdmin.textContent =
                pendingOrders;
        }


        const totalSales =
            allOrders
                .filter(
                    (order) =>
                        order.status === "completed"
                )
                .reduce(
                    (
                        total,
                        order
                    ) => {

                        const amount =
                            Number(
                                order.total_amount ??
                                order.total ??
                                0
                            );

                        return total +
                            (
                                Number.isFinite(amount)
                                    ? amount
                                    : 0
                            );
                    },
                    0
                );


        if (totalSalesAdmin) {

            totalSalesAdmin.textContent =
                "৳" +
                formatNumber(
                    totalSales
                );
        }


    } catch (error) {

        console.error(
            "Load stats error:",
            error
        );
    }
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


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


    if (saveProductBtn) {

        saveProductBtn.textContent =
            "Save Product";

        saveProductBtn.disabled = false;
    }


    if (mainImagePreview) {

        mainImagePreview.innerHTML = "";
    }


    if (variantsContainer) {

        variantsContainer.innerHTML = "";
    }


    if (allowCodAdmin) {

        allowCodAdmin.checked = true;
    }


    if (allowAdvanceAdmin) {

        allowAdvanceAdmin.checked = false;
    }


    hideAlert();
}


/* =========================================================
   ADD VARIANT
   ========================================================= */

function addVariant() {

    if (!variantsContainer) return;


    const variant =
        createVariantElement();


    variantsContainer.appendChild(
        variant
    );
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeAdmin() {

    try {

        if (!window.supabase) {

            console.error(
                "Supabase library not found."
            );

            return;
        }


        /* LOGIN FORM */

        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                loginAdmin
            );
        }


        /* LOGOUT */

        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                logoutAdmin
            );
        }


        /* PRODUCT FORM */

        if (productForm) {

            productForm.addEventListener(
                "submit",
                saveProduct
            );
        }


        /* IMAGE PREVIEW */

        if (mainImageAdmin) {

            mainImageAdmin.addEventListener(
                "change",
                previewMainImage
            );
        }


        /* ADD VARIANT */

        if (addVariantBtn) {

            addVariantBtn.addEventListener(
                "click",
                addVariant
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


        /* ORDER FILTER */

        if (orderStatusFilter) {

            orderStatusFilter.addEventListener(
                "change",
                loadOrders
            );
        }


        /* =================================================
           CHECK EXISTING SESSION
           ================================================= */

        const {
            data: sessionData,
            error: sessionError
        } = await sb.auth.getSession();


        if (sessionError) {

            console.error(
                "Session error:",
                sessionError
            );

            return;
        }


        const session =
            sessionData?.session;


        if (session?.user) {

            currentUser =
                session.user;

            await verifyAdminUser();

        } else {

            if (adminDashboard) {

                adminDashboard.style.display =
                    "none";
            }

            if (adminLogin) {

                adminLogin.style.display =
                    "block";
            }
        }


        /* =================================================
           AUTH STATE LISTENER
           ================================================= */

        sb.auth.onAuthStateChange(
            async (
                event,
                session
            ) => {

                console.log(
                    "Auth event:",
                    event
                );


                if (
                    session?.user &&
                    (
                        event === "SIGNED_IN" ||
                        event === "INITIAL_SESSION"
                    )
                ) {

                    currentUser =
                        session.user;

                }


                if (
                    event === "SIGNED_OUT"
                ) {

                    currentUser = null;

                    if (adminDashboard) {

                        adminDashboard.style.display =
                            "none";
                    }

                    if (adminLogin) {

                        adminLogin.style.display =
                            "block";
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

window.showAdminSection =
    showAdminSection;

window.previewMainImage =
    previewMainImage;

window.createVariantElement =
    createVariantElement;

window.createSizeElement =
    createSizeElement;

window.saveProduct =
    saveProduct;

window.editProduct =
    editProduct;

window.deactivateProduct =
    deactivateProduct;

window.activateProduct =
    activateProduct;

window.updateOrderStatus =
    updateOrderStatus;

window.resetProductForm =
    resetProductForm;

window.addVariant =
    addVariant;


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAdmin
    );

} else {

    initializeAdmin();
}
