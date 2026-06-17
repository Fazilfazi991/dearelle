const defaultProducts = Array.isArray(window.products) ? window.products : [];
let products = [];
let settings = {};
let orders = [];
let activeSearch = "";

const productForm = document.querySelector("[data-product-form]");
const settingsForm = document.querySelector("[data-settings-form]");
const productsTable = document.querySelector("[data-products-table]");
const imageGrid = document.querySelector("[data-image-grid]");
const ordersTable = document.querySelector("[data-orders-table]");
const stats = document.querySelector("[data-admin-stats]");
const adminMain = document.querySelector(".admin-main");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

async function adminApi(action, options = {}) {
  const response = await fetch(`/api/admin?action=${encodeURIComponent(action)}`, {
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Admin request failed");
  return payload;
}

function showNotice(message, type = "info") {
  const notice = document.querySelector("[data-admin-notice]");
  if (!notice) return;
  notice.textContent = message;
  notice.dataset.type = type;
}

function showLogin(message = "") {
  document.body.classList.add("admin-login-open");
  let login = document.querySelector("[data-admin-login]");
  if (!login) {
    login = document.createElement("section");
    login.className = "admin-login";
    login.dataset.adminLogin = "";
    login.innerHTML = `
      <form class="admin-login__box" data-admin-login-form>
        <img src="assets/dearelle-logo.png" alt="Dearelle">
        <h2>Admin Login</h2>
        <p data-admin-login-error>${message}</p>
        <label>Username<input name="username" autocomplete="username" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="button" type="submit">Sign In</button>
      </form>
    `;
    document.body.append(login);
  } else {
    login.querySelector("[data-admin-login-error]").textContent = message;
  }
}

function hideLogin() {
  document.body.classList.remove("admin-login-open");
  document.querySelector("[data-admin-login]")?.remove();
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitOptions(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productFromForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const fallbackId = slugify(data.name);

  return {
    id: data.id || fallbackId,
    name: data.name.trim(),
    category: data.category.trim(),
    collection: data.collection.trim(),
    price: Number(data.price) || 0,
    stock: Number(data.stock) || 0,
    status: data.status || "Active",
    badge: data.badge.trim(),
    rating: Number(data.rating) || 5,
    reviews: Number(data.reviews) || 0,
    shortDescription: data.shortDescription.trim(),
    details: data.details.trim(),
    care: data.care.trim(),
    shipping: data.shipping.trim(),
    gift: data.gift.trim(),
    options: {
      metal: splitOptions(data.metal),
      length: splitOptions(data.length)
    },
    images: splitLines(data.images)
  };
}

function fillProductForm(product) {
  const fields = productForm.elements;
  fields.id.value = product.id || "";
  fields.name.value = product.name || "";
  fields.category.value = product.category || "";
  fields.collection.value = product.collection || "";
  fields.price.value = product.price || "";
  fields.stock.value = product.stock ?? "";
  fields.status.value = product.status || "Active";
  fields.badge.value = product.badge || "";
  fields.rating.value = product.rating || "";
  fields.reviews.value = product.reviews || "";
  fields.shortDescription.value = product.shortDescription || "";
  fields.details.value = product.details || "";
  fields.care.value = product.care || "";
  fields.shipping.value = product.shipping || "";
  fields.gift.value = product.gift || "";
  fields.images.value = (product.images || []).join("\n");
  fields.metal.value = (product.options?.metal || []).join(", ");
  fields.length.value = (product.options?.length || []).join(", ");
  fields.name.focus();
}

function clearProductForm() {
  productForm.reset();
  const fields = productForm.elements;
  fields.id.value = "";
  fields.status.value = "Active";
  fields.rating.value = "5";
  fields.reviews.value = "0";
  fields.stock.value = "0";
}

function productMatches(product) {
  const haystack = [product.name, product.category, product.collection, product.badge, product.status].join(" ").toLowerCase();
  return haystack.includes(activeSearch.toLowerCase());
}

function renderStats() {
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const active = products.filter((product) => product.status !== "Archived").length;
  const images = new Set(products.flatMap((product) => product.images || [])).size;

  stats.innerHTML = `
    <article><span>Total Products</span><strong>${products.length}</strong></article>
    <article><span>Active Listings</span><strong>${active}</strong></article>
    <article><span>Images</span><strong>${images}</strong></article>
    <article><span>Orders</span><strong>${orders.length}</strong></article>
    <article><span>Revenue</span><strong>${money(revenue)}</strong></article>
  `;
}

function renderProducts() {
  const visibleProducts = products.filter(productMatches);

  if (!visibleProducts.length) {
    productsTable.innerHTML = `<div class="admin-empty">No products found.</div>`;
    return;
  }

  productsTable.innerHTML = `
    <div class="admin-table">
      <div class="admin-table__row admin-table__head">
        <span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span>
      </div>
      ${visibleProducts.map((product) => `
        <div class="admin-table__row">
          <span class="admin-product-cell"><img src="${product.images?.[0] || "assets/dearelle-logo.png"}" alt=""><strong>${product.name}</strong></span>
          <span>${product.category}</span>
          <span>${money(product.price)}</span>
          <span>${product.stock ?? 0}</span>
          <span>${product.status || "Active"}</span>
          <span class="admin-row-actions">
            <button type="button" data-edit-product="${product.id}">Edit</button>
            <button type="button" data-duplicate-product="${product.id}">Copy</button>
            <button type="button" data-delete-product="${product.id}">Delete</button>
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderImages() {
  const images = products.flatMap((product) => (product.images || []).map((image) => ({ image, product })));

  if (!images.length) {
    imageGrid.innerHTML = `<div class="admin-empty">Add product image paths to build the media library.</div>`;
    return;
  }

  imageGrid.innerHTML = images.map(({ image, product }) => `
    <article>
      <img src="${image}" alt="${product.name}">
      <div><strong>${product.name}</strong><span>${image}</span></div>
    </article>
  `).join("");
}

function renderOrders() {
  if (!orders.length) {
    ordersTable.innerHTML = `<div class="admin-empty">No orders have been synced to the admin store yet.</div>`;
    return;
  }

  ordersTable.innerHTML = `
    <div class="admin-table admin-table--orders">
      <div class="admin-table__row admin-table__head">
        <span>Order</span><span>Customer</span><span>Items</span><span>Total</span><span>Payment</span>
      </div>
      ${orders.map((order) => `
        <div class="admin-table__row">
          <span><strong>${order.id}</strong><small>${new Date(order.createdAt).toLocaleString()}</small></span>
          <span>${order.customer?.firstName || ""} ${order.customer?.lastName || ""}<small>${order.customer?.email || ""}</small></span>
          <span>${(order.items || []).length}</span>
          <span>${money(order.total)}</span>
          <span>${order.payment || "Stripe"}<small>${order.paymentStatus || "Pending"}</small></span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSettings() {
  const fields = settingsForm.elements;
  fields.storeName.value = settings.storeName || "Dearelle";
  fields.supportEmail.value = settings.supportEmail || "hello@dearelle.com";
  fields.freeShipping.value = settings.freeShipping || 5999;
  fields.discountPercent.value = settings.discountPercent || 20;
}

function renderAdmin() {
  renderStats();
  renderProducts();
  renderImages();
  renderOrders();
  renderSettings();
}

async function saveProducts(message = "Products saved.") {
  const store = await adminApi("save-products", { method: "POST", body: { products } });
  products = store.products || products;
  renderAdmin();
  showNotice(message, "success");
}

async function loadAdmin() {
  try {
    const store = await adminApi("bootstrap");
    products = store.products?.length ? store.products : structuredClone(defaultProducts);
    settings = store.settings || {};
    orders = store.orders || [];
    hideLogin();
    renderAdmin();
    showNotice("Dashboard connected to server storage.", "success");
  } catch (error) {
    products = structuredClone(defaultProducts);
    showLogin(error.message);
  }
}

adminMain?.insertAdjacentHTML("afterbegin", `<p class="admin-notice" data-admin-notice aria-live="polite"></p>`);

productForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const product = productFromForm(productForm);
  if (!product.images.length) product.images = ["assets/dearelle-logo.png"];

  const existingIndex = products.findIndex((item) => item.id === product.id);
  if (existingIndex >= 0) {
    products[existingIndex] = product;
  } else {
    products.unshift(product);
  }

  try {
    await saveProducts("Product saved to server storage.");
    clearProductForm();
  } catch (error) {
    showNotice(error.message, "error");
  }
});

document.querySelector("[data-reset-form]")?.addEventListener("click", clearProductForm);
document.querySelector("[data-new-product]")?.addEventListener("click", clearProductForm);

document.querySelector("[data-product-search]")?.addEventListener("input", (event) => {
  activeSearch = event.target.value;
  renderProducts();
});

document.querySelector("[data-image-upload]")?.addEventListener("change", async (event) => {
  const files = [...(event.target.files || [])];
  if (!files.length) return;

  const dataUrls = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));

  const currentImages = splitLines(productForm.elements.images.value);
  productForm.elements.images.value = [...currentImages, ...dataUrls].join("\n");
  event.target.value = "";
});

productsTable?.addEventListener("click", async (event) => {
  const editId = event.target.closest("[data-edit-product]")?.dataset.editProduct;
  const deleteId = event.target.closest("[data-delete-product]")?.dataset.deleteProduct;
  const duplicateId = event.target.closest("[data-duplicate-product]")?.dataset.duplicateProduct;

  if (editId) {
    const product = products.find((item) => item.id === editId);
    if (product) fillProductForm(product);
  }

  if (duplicateId) {
    const product = products.find((item) => item.id === duplicateId);
    if (product) {
      const copy = structuredClone(product);
      copy.id = `${product.id}-copy-${Date.now().toString().slice(-4)}`;
      copy.name = `${product.name} Copy`;
      products.unshift(copy);
      try {
        await saveProducts("Product copied.");
      } catch (error) {
        showNotice(error.message, "error");
      }
    }
  }

  if (deleteId) {
    products = products.filter((item) => item.id !== deleteId);
    try {
      await saveProducts("Product deleted.");
    } catch (error) {
      showNotice(error.message, "error");
    }
  }
});

document.querySelector("[data-admin-export]")?.addEventListener("click", () => {
  const payload = { products, settings, orders, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "dearelle-catalog.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("[data-admin-import]")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    if (Array.isArray(payload.products)) {
      products = payload.products;
      await saveProducts("Imported products saved.");
    }
    if (payload.settings) {
      settings = payload.settings;
      const store = await adminApi("save-settings", { method: "POST", body: { settings } });
      settings = store.settings || settings;
      renderAdmin();
    }
  } catch (error) {
    showNotice(error.message, "error");
  }
  event.target.value = "";
});

document.querySelector("[data-clear-orders]")?.addEventListener("click", async () => {
  try {
    const store = await adminApi("clear-orders", { method: "POST" });
    orders = store.orders || [];
    renderAdmin();
    showNotice("Orders cleared.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  }
});

settingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  settings = Object.fromEntries(new FormData(settingsForm).entries());
  try {
    const store = await adminApi("save-settings", { method: "POST", body: { settings } });
    settings = store.settings || settings;
    renderAdmin();
    showNotice("Settings saved.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  }
});

document.addEventListener("submit", async (event) => {
  const loginForm = event.target.closest("[data-admin-login-form]");
  if (!loginForm) return;

  event.preventDefault();
  const errorNode = loginForm.querySelector("[data-admin-login-error]");
  try {
    await adminApi("login", {
      method: "POST",
      body: Object.fromEntries(new FormData(loginForm).entries())
    });
    await loadAdmin();
  } catch (error) {
    errorNode.textContent = error.message;
  }
});

loadAdmin();
