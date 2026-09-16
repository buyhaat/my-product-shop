const { createClient } = supabase;

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let currentFilter = "all";
let allOrders = [];

/* =========================
   PAGE START
========================= */

document.addEventListener("DOMContentLoaded", async () => {

  setupEvents();

  const {
    data: {
      session
    }
  } = await sb.auth.getSession();

  if (session) {
    await checkAdmin(session.user);
  } else {
    showLogin();
  }

  sb.auth.onAuthStateChange(async (event, session) => {

    if (session) {
      await checkAdmin(session.user);
    } else {
      showLogin();
    }

  });

});


/* =========================
   EVENTS
========================= */

function setupEvents() {

  const loginForm =
    document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      login
    );
  }


  const logoutButton =
    document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logout
    );
  }


  document
    .querySelectorAll(".admin-tab")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const tab =
            button.dataset.tab;

          switchTab(
            tab,
            button
          );

        }
      );

    });


  document
    .querySelectorAll(".filter-btn[data-filter]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          currentFilter =
            button.dataset.filter;

          document
            .querySelectorAll(
              ".filter-btn[data-filter]"
            )
            .forEach(btn => {
              btn.classList.remove("active");
            });

          button.classList.add("active");

          renderOrders();

        }
      );

    });


  const refreshOrders =
    document.getElementById("refreshOrders");

  if (refreshOrders) {
    refreshOrders.addEventListener(
      "click",
      loadOrders
    );
  }

}


/* =========================
   LOGIN
========================= */

async function login(event) {

  event.preventDefault();

  const email =
    document.getElementById("loginEmail")
      .value
      .trim();

  const password =
    document.getElementById("loginPassword")
      .value;

  const button =
    document.getElementById("loginButton");

  button.disabled = true;
  button.textContent =
    "Login হচ্ছে...";

  showLoginMessage(
    "",
    ""
  );


  const {
    data,
    error
  } = await sb.auth.signInWithPassword({
    email,
    password
  });


  if (error) {

    showLoginMessage(
      error.message,
      "error"
    );

    button.disabled = false;
    button.textContent =
      "Login";

    return;
  }


  if (data.user) {
    await checkAdmin(data.user);
  }


  button.disabled = false;
  button.textContent =
    "Login";
}


/* =========================
   ADMIN CHECK
========================= */

async function checkAdmin(user) {

  const {
    data,
    error
  } = await sb
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();


  if (error) {

    console.error(error);

    showLoginMessage(
      "Admin verification failed.",
      "error"
    );

    await sb.auth.signOut();

    return;
  }


  if (!data) {

    showLoginMessage(
      "এই account-এর Admin access নেই।",
      "error"
    );

    await sb.auth.signOut();

    return;
  }


  document.getElementById(
    "adminEmail"
  ).textContent =
    user.email || "Admin";


  showDashboard();

  await Promise.all([
    loadOrders(),
    loadAdminProducts()
  ]);
}


/* =========================
   SHOW LOGIN
========================= */

function showLogin() {

  const loginPage =
    document.getElementById("loginPage");

  const dashboard =
    document.getElementById("dashboard");

  if (loginPage) {
    loginPage.style.display = "flex";
  }

  if (dashboard) {
    dashboard.classList.remove("active");
  }
}


/* =========================
   SHOW DASHBOARD
========================= */

function showDashboard() {

  const loginPage =
    document.getElementById("loginPage");

  const dashboard =
    document.getElementById("dashboard");

  if (loginPage) {
    loginPage.style.display = "none";
  }

  if (dashboard) {
    dashboard.classList.add("active");
  }
}


/* =========================
   LOGIN MESSAGE
========================= */

function showLoginMessage(
  text,
  type
) {

  const message =
    document.getElementById(
      "loginMessage"
    );

  if (!message) return;

  message.textContent =
    text || "";

  message.className =
    "login-message" +
    (type ? ` ${type}` : "");
}


/* =========================
   LOGOUT
========================= */

async function logout() {

  const {
    error
  } = await sb.auth.signOut();

  if (error) {
    console.error(error);
  }

  showLogin();
}


/* =========================
   TABS
========================= */

function switchTab(
  sectionId,
  button
) {

  document
    .querySelectorAll(".admin-tab")
    .forEach(tab => {
      tab.classList.remove("active");
    });

  button.classList.add("active");


  document
    .querySelectorAll(".admin-section")
    .forEach(section => {
      section.classList.remove("active");
    });


  const section =
    document.getElementById(sectionId);

  if (section) {
    section.classList.add("active");
  }

}


/* =========================
   LOAD ORDERS
========================= */

async function loadOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );

  if (list) {
    list.innerHTML = `
      <div class="admin-empty">
        Orders লোড হচ্ছে...
      </div>
    `;
  }


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

    console.error(error);

    if (list) {
      list.innerHTML = `
        <div class="admin-empty">
          Orders লোড করা যায়নি।
        </div>
      `;
    }

    return;
  }


  allOrders = data || [];

  updatePendingCount();

  renderOrders();
}


/* =========================
   PENDING COUNT
========================= */

function updatePendingCount() {

  const count =
    allOrders.filter(
      order =>
        String(order.status).toLowerCase()
        === "pending"
    ).length;


  const badge =
    document.getElementById(
      "pendingCount"
    );

  if (badge) {
    badge.textContent = count;
  }
}


/* =========================
   RENDER ORDERS
========================= */

function renderOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );

  if (!list) return;


  let orders = allOrders;


  if (currentFilter !== "all") {

    orders =
      allOrders.filter(
        order =>
          String(order.status)
            .toLowerCase()
          === currentFilter
      );

  }


  if (!orders.length) {

    list.innerHTML = `
      <div class="admin-empty">
        ${
          currentFilter === "pending"
            ? "কোনো Pending order নেই।"
            : currentFilter === "completed"
            ? "কোনো Completed order নেই।"
            : "কোনো order নেই।"
        }
      </div>
    `;

    return;
  }


  list.innerHTML =
    orders.map(
      order => renderOrderCard(order)
    ).join("");
}


/* =========================
   ORDER CARD
========================= */

function renderOrderCard(order) {

  const status =
    String(order.status || "pending")
      .toLowerCase();


  const date =
    order.created_at
      ? new Date(
          order.created_at
        ).toLocaleString(
          "bn-BD",
          {
            dateStyle: "medium",
            timeStyle: "short"
          }
        )
      : "-";


  const completeButton =
    status === "pending"
      ? `
        <button
          class="complete-btn"
          onclick="completeOrder(${order.id})"
        >
          Complete Order
        </button>
      `
      : "";


  return `
    <div class="order-card">

      <div class="order-top">

        <div class="order-id">
          Order #${escapeHTML(order.id)}
        </div>

        <div class="order-status ${status}">
          ${
            status === "completed"
              ? "Completed"
              : "Pending"
          }
        </div>

      </div>


      <div class="order-details">

        <div>
          <strong>Customer:</strong>
          ${escapeHTML(order.customer_name)}
        </div>

        <div>
          <strong>Phone:</strong>
          ${escapeHTML(order.phone)}
        </div>

        <div>
          <strong>Product:</strong>
          ${escapeHTML(order.product_name)}
        </div>

        <div>
          <strong>Variant:</strong>
          ${escapeHTML(order.variety)}
        </div>

        <div>
          <strong>Size:</strong>
          ${escapeHTML(order.size)}
        </div>

        <div>
          <strong>Quantity:</strong>
          ${escapeHTML(order.quantity)}
        </div>

        <div>
          <strong>Price:</strong>
          ৳${escapeHTML(order.product_price)}
        </div>

        <div>
          <strong>Total:</strong>
          ৳${escapeHTML(order.total_price)}
        </div>

        <div>
          <strong>District:</strong>
          ${escapeHTML(order.district)}
        </div>

        <div>
          <strong>Upazila:</strong>
          ${escapeHTML(order.upazila)}
        </div>

        <div>
          <strong>Address:</strong>
          ${escapeHTML(order.address)}
        </div>

        <div>
          <strong>Date:</strong>
          ${escapeHTML(date)}
        </div>

      </div>

      ${completeButton}

    </div>
  `;
}


/* =========================
   COMPLETE ORDER
========================= */

async function completeOrder(orderId) {

  if (!confirm(
    "এই order-টি Completed করতে চান?"
  )) {
    return;
  }


  const buttons =
    document.querySelectorAll(
      `.complete-btn[onclick="completeOrder(${orderId})"]`
    );


  buttons.forEach(button => {
    button.disabled = true;
    button.textContent =
      "Updating...";
  });


  const {
    error
  } = await sb
    .from("orders")
    .update({
      status: "completed"
    })
    .eq("id", orderId);


  if (error) {

    console.error(error);

    alert(
      "Order update করা যায়নি।"
    );

    buttons.forEach(button => {
      button.disabled = false;
      button.textContent =
        "Complete Order";
    });

    return;
  }


  await loadOrders();
}


/* =========================
   LOAD ADMIN PRODUCTS
========================= */

async function loadAdminProducts() {

  const container =
    document.getElementById(
      "adminProductsList"
    );

  if (!container) return;


  container.innerHTML = `
    <div class="admin-empty">
      Products লোড হচ্ছে...
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
      active,
      product_variants (
        id,
        name,
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

    console.error(error);

    container.innerHTML = `
      <div class="admin-empty">
        Products লোড করা যায়নি।
      </div>
    `;

    return;
  }


  if (!data || !data.length) {

    container.innerHTML = `
      <div class="admin-empty">
        কোনো Product নেই।
      </div>
    `;

    return;
  }


  container.innerHTML =
    data.map(
      product => renderAdminProduct(product)
    ).join("");
}


/* =========================
   PRODUCT ADMIN CARD
========================= */

function renderAdminProduct(product) {

  let totalStock = 0;

  let sizeCount = 0;


  (product.product_variants || [])
    .forEach(variant => {

      (variant.variant_sizes || [])
        .forEach(size => {

          if (size.active) {

            totalStock +=
              Number(size.stock || 0);

            sizeCount++;

          }

        });

    });


  const stockText =
    totalStock > 0
      ? `${totalStock} টি stock`
      : "Stock শেষ";


  return `
    <div class="admin-product">

      <div class="admin-product-info">

        <h3>
          ${escapeHTML(product.name)}
        </h3>

        <p>
          ${product.active
            ? "Active"
            : "Inactive"
          }
          · ${sizeCount} size
        </p>

      </div>

      <div class="stock-summary">

        <strong>
          ${stockText}
        </strong>

      </div>

    </div>
  `;
}


/* =========================
   ESCAPE HTML
========================= */

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
