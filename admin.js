/* =========================
   ORDERS
========================= */

let allOrders = [];
let currentOrderFilter = 'all';


async function loadOrders() {

  const ordersEl = document.getElementById('orders');

  if (!ordersEl) return;

  ordersEl.innerHTML =
    '<div class="panel">Orders loading...</div>';

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {

    ordersEl.innerHTML =
      `<div class="panel">
        Order load error: ${escapeHtml(error.message)}
      </div>`;

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

  const countEl =
    document.getElementById('pendingCount');

  if (!countEl) return;

  const pending =
    allOrders.filter(
      order => order.status === 'pending'
    ).length;

  countEl.textContent = pending;
}


/* =========================
   FILTER ORDERS
========================= */

function renderOrders() {

  const ordersEl =
    document.getElementById('orders');

  if (!ordersEl) return;

  let orders = allOrders;

  if (currentOrderFilter === 'pending') {

    orders =
      allOrders.filter(
        order => order.status === 'pending'
      );

  }

  if (currentOrderFilter === 'completed') {

    orders =
      allOrders.filter(
        order => order.status === 'completed'
      );

  }


  if (!orders.length) {

    let message = 'কোনো order নেই।';

    if (currentOrderFilter === 'pending') {
      message = 'কোনো Pending order নেই।';
    }

    if (currentOrderFilter === 'completed') {
      message = 'কোনো Completed order নেই।';
    }

    ordersEl.innerHTML =
      `<div class="panel">${message}</div>`;

    return;
  }


  ordersEl.innerHTML =
    orders.map(order => {

      const status =
        order.status === 'completed'
          ? 'completed'
          : 'pending';


      const date =
        order.created_at
          ? new Date(order.created_at)
              .toLocaleString('en-BD')
          : '';


      return `

        <div class="order-card">

          <div class="order-header">

            <div>
              <h3>
                Order #${order.id}
              </h3>

              <small>
                ${escapeHtml(date)}
              </small>
            </div>

            <span class="order-status ${status}">
              ${status === 'pending'
                ? 'Pending'
                : 'Completed'}
            </span>

          </div>


          <div class="order-info">

            <p>
              <strong>Customer:</strong>
              ${escapeHtml(order.customer_name || '')}
            </p>

            <p>
              <strong>Phone:</strong>
              ${escapeHtml(order.phone || '')}
            </p>

            <p>
              <strong>Address:</strong>
              ${escapeHtml(order.address || '')}
            </p>

            <p>
              <strong>District:</strong>
              ${escapeHtml(order.district || '')}
            </p>

            <p>
              <strong>Upazila:</strong>
              ${escapeHtml(order.upazila || '')}
            </p>

          </div>


          <div class="order-product">

            <p>
              <strong>Product:</strong>
              ${escapeHtml(order.product_name || '')}
            </p>

            <p>
              <strong>Variant:</strong>
              ${escapeHtml(order.variety || '')}
            </p>

            <p>
              <strong>Size:</strong>
              ${escapeHtml(order.size || '')}
            </p>

            <p>
              <strong>Quantity:</strong>
              ${order.quantity}
            </p>

            <p>
              <strong>Unit Price:</strong>
              ৳${Number(
                order.product_price || 0
              ).toLocaleString('en-BD')}
            </p>

            <p>
              <strong>Total:</strong>
              ৳${Number(
                order.total_price || 0
              ).toLocaleString('en-BD')}
            </p>

          </div>


          <div class="order-actions">

            <label>
              Status
            </label>

            <select
              class="order-status-select"
              data-order-id="${order.id}"
            >

              <option
                value="pending"
                ${status === 'pending'
                  ? 'selected'
                  : ''}
              >
                Pending
              </option>

              <option
                value="completed"
                ${status === 'completed'
                  ? 'selected'
                  : ''}
              >
                Completed
              </option>

            </select>

          </div>

        </div>

      `;

    }).join('');


  /*
    Status change listener
  */

  ordersEl
    .querySelectorAll('.order-status-select')
    .forEach(select => {

      select.addEventListener(
        'change',
        async () => {

          const orderId =
            Number(select.dataset.orderId);

          const newStatus =
            select.value;

          await updateOrderStatus(
            orderId,
            newStatus
          );

        }
      );

    });

}


/* =========================
   UPDATE ORDER STATUS
========================= */

async function updateOrderStatus(
  orderId,
  status
) {

  const { error } = await sb
    .from('orders')
    .update({
      status: status
    })
    .eq('id', orderId);


  if (error) {

    alert(
      'Status update হয়নি: ' +
      error.message
    );

    return;
  }


  /*
    Local data update
  */

  const order =
    allOrders.find(
      o => Number(o.id) === Number(orderId)
    );

  if (order) {
    order.status = status;
  }


  updatePendingCount();

  renderOrders();

}


/* =========================
   FILTER BUTTONS
========================= */

document
  .querySelectorAll('.order-filter')
  .forEach(button => {

    button.addEventListener(
      'click',
      () => {

        currentOrderFilter =
          button.dataset.status;


        document
          .querySelectorAll('.order-filter')
          .forEach(btn => {
            btn.classList.remove('active');
          });


        button.classList.add('active');

        renderOrders();

      }
    );

  });


/* =========================
   REFRESH
========================= */

const refreshOrders =
  document.getElementById('refreshOrders');

if (refreshOrders) {

  refreshOrders.addEventListener(
    'click',
    loadOrders
  );

}
