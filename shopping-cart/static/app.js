// simple frontend to work with provided backend endpoints

let token = null;      // store token after login
let products = [];     // cached products
let cart = { items: [], total: 0 };

async function api(url, opts = {}) {
  const headers = opts.headers || {};
  headers['Accept'] = 'application/json';

  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  try { return JSON.parse(text || '{}'); } catch { return text; }
}

// ------------------- PRODUCTS -------------------

async function loadProducts() {
  try {
    const data = await api('/products');

    // backend returns: [{ID, Name, Price}]
    products = data.map(p => ({
      id: p.ID,
      name: p.Name,
      price: p.Price
    }));

    renderProducts();
  } catch (e) {
    console.error('loadProducts', e);
    document.getElementById('products').innerText = 'Failed to load products';
  }
}

function renderProducts() {
  const cont = document.getElementById('products');
  cont.innerHTML = '';

  products.forEach(p => {
    const card = document.createElement('div');
    card.style = 'border:1px solid #ddd;padding:14px;border-radius:6px;width:220px;';

    card.innerHTML = `
      <h3>${p.name}</h3>
      <p>₹ ${p.price}</p>
      <button onclick="addToCart(${p.id})">Add to cart</button>
    `;

    cont.appendChild(card);
  });
}

// ------------------- CART -------------------

async function addToCart(product_id, quantity = 1) {
  try {
    await api('/cart/add', {
      method: 'POST',
      body: { product_id, quantity }
    });
    showCart();
  } catch (e) {
    alert('Add to cart failed');
  }
}

async function showCart() {
  try {
    const data = await api('/cart');

    // backend returns:
    // { items:[{Product:{ID,Name,Price},Quantity}], total:int }
    cart = {
      items: data.items || [],
      total: data.total || 0
    };

    renderCart();
    document.getElementById('cart-modal').style.display = 'block';
    updateCartCount();
  } catch (e) {
    alert('Cart fetch failed');
  }
}

function renderCart() {
  const itemsDiv = document.getElementById('cart-items');
  itemsDiv.innerHTML = '';

  cart.items.forEach((it, index) => {
    const p = it.Product;

    const row = document.createElement('div');
    row.style = 'display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee;';

    row.innerHTML = `
      <div>${p.Name} x ${it.Quantity}</div>
      <div>
        ₹ ${p.Price}
        <button onclick="removeFromCart(${index + 1})">Remove</button>
      </div>
    `;

    itemsDiv.appendChild(row);
  });

  document.getElementById('cart-total').innerText = `Total: ₹ ${cart.total}`;
}

async function removeFromCart(id) {
  try {
    await api(`/cart/remove/${id}`, { method: 'DELETE' });
    showCart();
  } catch (e) {
    alert('Remove failed');
  }
}

// ✅ CHECKOUT FUNCTION
async function checkout() {
  // agar cart khali hai to backend ko hit hi mat karo
  if (!cart.items || cart.items.length === 0) {
    alert('Cart khali hai, checkout kya karega?');
    return;
  }

  try {
    // backend: POST /orders
    const res = await api('/orders', { method: 'POST' });

    // backend ka response: { order: { ID, Items, Total } }
    const order = res.order || res || {};
    const orderId = order.ID ?? order.id ?? '';
    const total = order.Total ?? order.total ?? cart.total ?? 0;

    alert(`Order ${orderId ? '#' + orderId + ' ' : ''}placed. Total ₹ ${total}`);

    // frontend cart reset
    cart = { items: [], total: 0 };
    renderCart();
    document.getElementById('cart-modal').style.display = 'none';
    updateCartCount();
  } catch (e) {
    console.error('checkout', e);
    alert('Checkout failed');
  }
}

// ------------------- ORDERS (NEW) -------------------

async function loadOrders() {
  try {
    const data = await api('/orders'); // backend: []Order

    const list = Array.isArray(data) ? data : [];
    const cont = document.getElementById('orders-list');
    cont.innerHTML = '';

    if (!list.length) {
      cont.innerHTML = '<p>No orders found.</p>';
      document.getElementById('orders').style.display = 'block';
      return;
    }

    list.forEach(order => {
      // Order: { ID, Items:[{Product, Quantity}], Total }
      const itemsText = (order.Items || []).map(it =>
        `${it.Product.Name} x ${it.Quantity}`
      ).join(', ');

      const row = document.createElement('div');
      row.style = 'padding:6px;border-bottom:1px solid #ccc;';
      row.innerText = `Order #${order.ID} → [ ${itemsText} ] — Total ₹ ${order.Total}`;
      cont.appendChild(row);
    });

    document.getElementById('orders').style.display = 'block';
  } catch (e) {
    console.error('loadOrders', e);
    alert('Failed to load orders');
  }
}

function updateCartCount() {
  const count = cart.items.reduce((sum, it) => sum + it.Quantity, 0);
  document.getElementById('cart-count').innerText = count;
}

// ------------------- AUTH -------------------

async function signup(username, password) {
  try {
    await api('/users', {
      method: 'POST',
      body: { username, password }
    });
    document.getElementById('auth-msg').innerText = 'Signup success — now login';
  } catch {
    document.getElementById('auth-msg').innerText = 'Signup failed';
  }
}

async function login(username, password) {
  try {
    const res = await api('/users/login', {
      method: 'POST',
      body: { username, password }
    });

    token = res.token;

    document.getElementById('auth-msg').innerText = 'Logged in';
    document.getElementById('logout-btn').style.display = 'inline-block';
    document.getElementById('view-orders-btn').style.display = 'inline-block';

    loadProducts();
    updateCartCount();
  } catch {
    document.getElementById('auth-msg').innerText = 'Login failed';
  }
}

// ------------------- HANDLERS -------------------

function attachHandlers() {
  document.getElementById('signup-btn').onclick = () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (!u || !p) return alert("Enter username & password");
    signup(u, p);
  };

  document.getElementById('login-btn').onclick = () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (!u || !p) return alert("Enter username & password");
    login(u, p);
  };

  document.getElementById('view-cart-btn').onclick = showCart;

  document.getElementById('close-cart').onclick = () => {
    document.getElementById('cart-modal').style.display = 'none';
  };

  // checkout button ka handler
  document.getElementById('checkout-btn').onclick = checkout;

  // orders button + close orders
  document.getElementById('view-orders-btn').onclick = loadOrders;

  document.getElementById('close-orders').onclick = () => {
    document.getElementById('orders').style.display = 'none';
  };

  document.getElementById('logout-btn').onclick = () => {
    token = null;
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('view-orders-btn').style.display = 'none';
    document.getElementById('auth-msg').innerText = 'Logged out';
  };
}

window.onload = async () => {
  attachHandlers();
  await loadProducts();
};

