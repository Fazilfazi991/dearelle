const closeAnnouncement = document.querySelector("[data-close-announcement]");
const announcement = document.querySelector("#announcement");
const menuToggle = document.querySelector("[data-menu-toggle]");
const wishlistButtons = document.querySelectorAll(".wishlist");
const heroSlides = document.querySelectorAll(".hero-slide");
const heroDots = document.querySelectorAll("[data-hero-dot]");
const heroPrev = document.querySelector("[data-hero-prev]");
const heroNext = document.querySelector("[data-hero-next]");
let heroIndex = 0;
let heroTimer;

async function loadManagedProducts() {
  try {
    const response = await fetch("/api/admin?action=storefront", { credentials: "same-origin" });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.products) && payload.products.length) {
        window.products = payload.products;
        return;
      }
    }
  } catch {
    // Static hosting without the admin API keeps using the bundled catalog.
  }

  try {
    const savedProducts = JSON.parse(localStorage.getItem("dearelleManagedProducts") || "null");
    if (Array.isArray(savedProducts) && savedProducts.length) {
      window.products = savedProducts;
    }
  } catch {
    localStorage.removeItem("dearelleManagedProducts");
  }
}

const iconPaths = {
  "arrow-left": ["M19 12H5", "M12 19l-7-7 7-7"],
  "arrow-right": ["M5 12h14", "M12 5l7 7-7 7"],
  "badge": ["M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7L12 3z"],
  "chevron-down": ["M6 9l6 6 6-6"],
  "chevron-left": ["M15 18l-6-6 6-6"],
  "chevron-right": ["M9 18l6-6-6-6"],
  "circle": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"],
  "circle-dot": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  "ear": ["M17 8a5 5 0 0 0-10 0c0 5 6 4 6 9a2 2 0 0 1-4 0", "M10 8a2 2 0 1 1 4 0c0 2-2 2.5-2 5"],
  "facebook": ["M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v6h3v-6h2.2l.8-3H14v-1.5a.5.5 0 0 1 .5-.5H17V8h-2z"],
  "footprints": ["M7 13c-1.5 1.4-2 3.5-.6 4.9 1.2 1.2 3.2.9 4.2-.5 1.4-2 1-4.9-.7-5.6-1-.4-2-.1-2.9 1.2z", "M16.5 6.2c1.8.7 2.7 3.1 1.8 4.8-.7 1.4-2.6 1.8-3.9.8-1.5-1.1-1.5-3.6-.2-5 .7-.7 1.5-.9 2.3-.6z", "M8 7h.01", "M10 5h.01", "M12 7h.01", "M14 3h.01", "M16.5 2.5h.01"],
  "gem": ["M6 3h12l4 6-10 12L2 9l4-6z", "M2 9h20", "M12 21 8 9l4-6 4 6-4 12z"],
  "gift": ["M20 12v8H4v-8", "M2 7h20v5H2z", "M12 22V7", "M12 7H7.5A2.5 2.5 0 1 1 12 5v2z", "M12 7h4.5A2.5 2.5 0 1 0 12 5v2z"],
  "heart": ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"],
  "instagram": ["M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z", "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M17.5 6.5h.01"],
  "mail": ["M4 4h16v16H4z", "m4 6 8 7 8-7"],
  "menu": ["M4 6h16", "M4 12h16", "M4 18h16"],
  "music-2": ["M9 18V5l12-2v13", "M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3z", "M21 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z"],
  "search": ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "m21 21-4.3-4.3"],
  "shield-check": ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "m9 12 2 2 4-5"],
  "shopping-bag": ["M6 8h12l-1 13H7L6 8z", "M9 8a3 3 0 0 1 6 0"],
  "sparkles": ["M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z", "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z", "M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z"],
  "star": ["M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5-4.7-4.6 6.5-.9L12 3z"],
  "truck": ["M3 6h11v10H3z", "M14 10h4l3 3v3h-7z", "M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  "user-round": ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"],
  "x": ["M18 6 6 18", "M6 6l12 12"]
};

function createLocalIcons() {
  document.querySelectorAll("i[data-lucide]").forEach((icon) => {
    const name = icon.dataset.lucide;
    const paths = iconPaths[name] || iconPaths.circle;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    paths.forEach((d) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.append(path);
    });

    icon.replaceWith(svg);
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function ratingMarkup(product) {
  const stars = "&#9733;".repeat(product.rating || 5);
  return `<div class="rating"><span class="stars" aria-hidden="true">${stars}</span> <span>(${product.reviews})</span></div>`;
}

function productUrl(product) {
  return `product?id=${encodeURIComponent(product.id)}`;
}

function compareAtPrice(product) {
  if (product.compareAtPrice || product.originalPrice) return Number(product.compareAtPrice || product.originalPrice);
  if (slugify(product.badge) === "bestseller") return Math.ceil((Number(product.price) || 0) / 0.8 / 50) * 50 - 1;
  return 0;
}

function priceMarkup(product, showCompare = false) {
  const original = compareAtPrice(product);
  if ((showCompare || original) && original > product.price) {
    return `<p class="product-price-row"><span class="sale-price">${formatPrice(product.price)}</span><s>${formatPrice(original)}</s></p>`;
  }
  return `<p>${formatPrice(product.price)}</p>`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("dearelleCart")) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("dearelleCart", JSON.stringify(cart));
  updateCartCount();
}

function cartItemKey(productId, options) {
  return `${productId}|${Object.keys(options).sort().map((key) => `${key}:${options[key]}`).join("|")}`;
}

function getProductById(id) {
  return (window.products || []).find((product) => product.id === id);
}

function getCartLines() {
  return getCart().map((item) => {
    const product = getProductById(item.productId);
    return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
  }).filter(Boolean);
}

function cartTotals() {
  const lines = getCartLines();
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shipping = subtotal === 0 || subtotal >= 5999 ? 0 : 149;
  const discount = subtotal >= 5999 ? Math.round(subtotal * 0.2) : 0;
  const total = Math.max(0, subtotal + shipping - discount);
  return { lines, subtotal, shipping, discount, total };
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll("[data-cart-count], .cart span").forEach((badge) => {
    badge.textContent = count;
  });
}

function addToCart(productId, quantity = 1, options = {}) {
  const product = getProductById(productId);
  if (!product) return;

  const normalizedOptions = Object.fromEntries(Object.entries(product.options || {}).map(([key, values]) => [
    key,
    options[key] || values?.[0] || ""
  ]));
  const key = cartItemKey(productId, normalizedOptions);
  const cart = getCart();
  const existing = cart.find((item) => item.key === key);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ key, productId, quantity, options: normalizedOptions });
  }

  saveCart(cart);
}

function updateCartItem(key, quantity) {
  const nextQuantity = Math.max(0, quantity);
  const nextCart = getCart().map((item) => item.key === key ? { ...item, quantity: nextQuantity } : item).filter((item) => item.quantity > 0);
  saveCart(nextCart);
  renderCartPage();
  renderCheckoutPage();
}

function orderNumber() {
  return `DL${Date.now().toString().slice(-7)}`;
}

function orderConfirmationMarkup(order) {
  return `
      <div class="order-confirmation">
        <i data-lucide="circle-dot"></i>
        <p class="script">Order Placed</p>
        <h2>Thank you, ${order.customer.firstName || "there"}.</h2>
        <p>Your order <strong>${order.id}</strong> has been placed. A confirmation has been prepared for ${order.customer.email || "your email"}.</p>
        <div class="order-confirmation__meta">
          <span>Total Paid</span><strong>${formatPrice(order.total)}</strong>
          <span>Delivery</span><strong>${[order.customer.city, order.customer.state].filter(Boolean).join(", ") || "Address shared at checkout"}</strong>
          <span>Payment</span><strong>${order.payment}</strong>
        </div>
        <a class="button" href="/#bestsellers">Continue Shopping</a>
      </div>
  `;
}

async function startStripeCheckout(customer, submitButton) {
  const totals = cartTotals();
  if (!totals.lines.length) return;
  const session = window.DearelleAuth?.getSession?.();
  if (session?.user) {
    customer.userId = session.user.id;
    customer.email = customer.email || session.user.email || "";
    customer.firstName = customer.firstName || session.user.user_metadata?.firstName || "";
    customer.lastName = customer.lastName || session.user.user_metadata?.lastName || "";
    customer.phone = customer.phone || session.user.user_metadata?.phone || "";
  }

  submitButton.disabled = true;
  submitButton.textContent = "Opening Secure Checkout...";

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer, cart: getCart() })
    });
    const payload = await response.json();

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || "Unable to start Stripe checkout");
    }

    localStorage.setItem("dearellePendingStripeOrder", JSON.stringify(payload.order));
    window.location.href = payload.url;
  } catch (error) {
    const errorBox = document.querySelector("[data-checkout-error]");
    if (errorBox) errorBox.textContent = error.message || "Unable to start Stripe checkout.";
    submitButton.disabled = false;
    submitButton.textContent = "Pay Securely with Stripe";
  }
}

function renderProductCards(container, productList, limit = productList.length) {
  if (!container) return;
  const showCompare = container.dataset.sale === "true";

  container.innerHTML = productList.slice(0, limit).map((product) => `
    <article class="product-card">
      ${product.badge ? `<span class="badge">${product.badge}</span>` : ""}
      <button class="wishlist" type="button" aria-label="Add ${product.name} to wishlist"><i data-lucide="heart"></i></button>
      <a class="product-card__link" href="${productUrl(product)}" aria-label="View ${product.name}">
        <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        ${priceMarkup(product, showCompare)}
        ${ratingMarkup(product)}
      </a>
      <button class="product-card__add" type="button" data-card-add="${product.id}">Add to Cart</button>
    </article>
  `).join("");
}

function renderCategoryPage() {
  const container = document.querySelector("[data-category-page]");
  if (!container) return;

  const heading = document.querySelector("[data-category-heading]");
  const params = new URLSearchParams(window.location.search);
  const category = slugify(params.get("category") || "all");
  const collection = slugify(params.get("collection") || "");
  const allProducts = window.products || [];
  const categoryLabels = {
    all: ["Shop Jewelry", "All Pieces"],
    "new-in": ["New In", "Fresh Arrivals"],
    necklaces: ["Necklaces", "Delicate Layers"],
    rings: ["Rings", "Everyday Sparkle"],
    earrings: ["Earrings", "Coming Soon"],
    bracelets: ["Bracelets", "Wrist Essentials"],
    anklets: ["Anklets", "Coming Soon"],
    charms: ["Charms", "Coming Soon"],
    gifts: ["Gifts", "Gift-Ready"],
    "gift-sets": ["Gift Sets", "Gift-Ready"],
    "best-sellers": ["Best Sellers", "Customer Favorites"],
    sale: ["Sale", "Blush Days"]
  };
  const collectionLabels = {
    "modern-muse": ["Everyday Delights", "Modern Muse"],
    "signature-collection": ["Love & Forever", "Signature Collection"],
    "golden-hour": ["New Season Picks", "Golden Hour"],
    "kerala-edit": ["Kerala Edit", "Handpicked For You"]
  };

  let title = categoryLabels[category]?.[0] || "Shop Jewelry";
  let kicker = categoryLabels[category]?.[1] || "Dearelle Edit";
  let products = allProducts;

  if (collection) {
    title = collectionLabels[collection]?.[0] || "Collection";
    kicker = collectionLabels[collection]?.[1] || "Dearelle Edit";
    products = allProducts.filter((product) => slugify(product.collection) === collection);
  } else if (category === "new-in") {
    products = allProducts.filter((product) => slugify(product.badge) === "new");
  } else if (category === "best-sellers") {
    products = allProducts.filter((product) => slugify(product.badge) === "bestseller");
  } else if (category === "sale") {
    products = allProducts.filter((product) => compareAtPrice(product) > product.price || ["offer", "bestseller"].includes(slugify(product.badge)));
  } else if (category === "gifts" || category === "gift-sets") {
    products = allProducts;
  } else if (category !== "all") {
    products = allProducts.filter((product) => slugify(product.category) === category);
  }

  document.title = `${title} | Dearelle`;
  if (heading) {
    heading.innerHTML = `<p class="script">${kicker}</p><h1>${title}</h1>`;
  }

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state category-empty">
        <i data-lucide="sparkles"></i>
        <h2>${title} are coming soon.</h2>
        <p>Explore our current favorites while we finish this edit.</p>
        <a class="button" href="category?category=best-sellers">Shop Best Sellers</a>
      </div>
    `;
    createLocalIcons();
    return;
  }

  container.innerHTML = `<div class="product-grid category-product-grid" data-category-products ${category === "sale" ? 'data-sale="true"' : ""}></div>`;
  renderProductCards(container.querySelector("[data-category-products]"), products);
  createLocalIcons();
}

function optionGroup(label, values) {
  const key = label.toLowerCase();
  return `
    <fieldset class="product-options" data-option-group="${key}">
      <legend>${label}</legend>
      <div>
        ${values.map((value, index) => `<button class="${index === 0 ? "is-selected" : ""}" type="button" data-option-value="${value}">${value}</button>`).join("")}
      </div>
    </fieldset>
  `;
}

function renderProductPage() {
  const detail = document.querySelector("[data-product-detail]");
  const allProducts = window.products || [];
  if (!detail || !allProducts.length) return;

  const params = new URLSearchParams(window.location.search);
  const product = allProducts.find((item) => item.id === params.get("id")) || allProducts[0];
  document.title = `${product.name} | Dearelle`;

  detail.innerHTML = `
    <div class="product-gallery">
      <button class="gallery-expand" type="button" aria-label="View larger image"><i data-lucide="arrow-right"></i></button>
      <img class="product-gallery__main" src="${product.images[0]}" alt="${product.name}" data-main-image>
      <div class="product-gallery__thumbs" aria-label="${product.name} image gallery">
        ${product.images.map((image, index) => `
          <button class="${index === 0 ? "is-active" : ""}" type="button" data-gallery-image="${image}" aria-label="Show image ${index + 1}">
            <img src="${image}" alt="" loading="lazy">
          </button>
        `).join("")}
      </div>
    </div>

    <div class="product-summary">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <a href="category?category=${slugify(product.category)}">${product.category}</a>
        <span>/</span>
        <span>${product.name}</span>
      </nav>
      <p class="script product-kicker">${product.collection}</p>
      <h1>${product.name}</h1>
      <div class="product-rating">${ratingMarkup(product)}</div>
      <p class="product-price">${formatPrice(product.price)}</p>
      <p class="installments">or 4 interest-free payments of ${formatPrice(product.price / 4)} with <strong>shop Pay</strong></p>
      <p class="product-description">${product.shortDescription}</p>
      ${Object.entries(product.options).map(([label, values]) => optionGroup(label.replace(/^\w/, (letter) => letter.toUpperCase()), values)).join("")}
      <div class="quantity-control" aria-label="Quantity">
        <button type="button" data-qty-minus aria-label="Decrease quantity">-</button>
        <span data-qty>1</span>
        <button type="button" data-qty-plus aria-label="Increase quantity">+</button>
      </div>
      <button class="button product-add" type="button" data-add-cart="${product.id}">Add to Cart <i data-lucide="shopping-bag"></i></button>
      <button class="product-wishlist" type="button"><i data-lucide="heart"></i> Add to Wishlist</button>
      <div class="product-perks" aria-label="Shopping benefits">
        <span><i data-lucide="truck"></i><strong>Free Shipping</strong><small>On orders ₹5,999+</small></span>
        <span><i data-lucide="gift"></i><strong>Gift-Ready</strong><small>Beautifully wrapped</small></span>
        <span><i data-lucide="shield-check"></i><strong>Warranty</strong><small>Quality you can trust</small></span>
      </div>
    </div>
  `;

  const copyMap = {
    "[data-product-details]": product.details,
    "[data-product-care]": product.care,
    "[data-product-shipping]": product.shipping,
    "[data-product-gift]": product.gift
  };

  Object.entries(copyMap).forEach(([selector, text]) => {
    const target = document.querySelector(selector);
    if (target) target.textContent = text;
  });

  const related = allProducts.filter((item) => item.id !== product.id && item.collection === product.collection);
  const sameCategory = allProducts.filter((item) => item.id !== product.id && item.category === product.category);
  const suggested = allProducts.filter((item) => item.id !== product.id && !sameCategory.includes(item));

  renderProductCards(document.querySelector("[data-related-products]"), related.length ? related : sameCategory, 4);
  renderProductCards(document.querySelector("[data-suggested-products]"), [...sameCategory, ...suggested], 4);
}

function summaryMarkup(totals, checkoutHref = "checkout") {
  return `
    <aside class="order-summary">
      <h2>Order Summary</h2>
      <div><span>Subtotal</span><strong>${formatPrice(totals.subtotal)}</strong></div>
      <div><span>Shipping</span><strong>${totals.shipping ? formatPrice(totals.shipping) : "Free"}</strong></div>
      <div><span>Blush Days Discount</span><strong>${totals.discount ? `-${formatPrice(totals.discount)}` : "Add ₹5,999+ to unlock"}</strong></div>
      <div class="order-summary__total"><span>Total</span><strong>${formatPrice(totals.total)}</strong></div>
      ${checkoutHref ? `<a class="button" href="${checkoutHref}">Continue to Checkout</a>` : ""}
      <p>Secure Stripe checkout. Cards and supported payment methods are handled by Stripe.</p>
    </aside>
  `;
}

function renderCartPage() {
  const container = document.querySelector("[data-cart-page]");
  if (!container) return;

  const totals = cartTotals();
  if (!totals.lines.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="shopping-bag"></i>
        <h2>Your cart is waiting for something beautiful.</h2>
        <p>Explore our bestsellers and add your favorite pieces.</p>
        <a class="button" href="/#bestsellers">Shop Bestsellers</a>
      </div>
    `;
    createLocalIcons();
    return;
  }

  container.innerHTML = `
    <div class="cart-items">
      ${totals.lines.map((line) => `
        <article class="cart-item">
          <a href="${productUrl(line.product)}"><img src="${line.product.images[0]}" alt="${line.product.name}"></a>
          <div>
            <a class="cart-item__title" href="${productUrl(line.product)}">${line.product.name}</a>
            <p>${line.options.metal}${line.options.length ? ` / ${line.options.length}` : ""}</p>
            <strong>${formatPrice(line.product.price)}</strong>
            <div class="quantity-control cart-quantity" aria-label="Quantity for ${line.product.name}">
              <button type="button" data-cart-minus="${line.key}" aria-label="Decrease quantity">-</button>
              <span>${line.quantity}</span>
              <button type="button" data-cart-plus="${line.key}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button class="cart-remove" type="button" data-cart-remove="${line.key}">Remove</button>
        </article>
      `).join("")}
    </div>
    ${summaryMarkup(totals)}
  `;
}

function renderCheckoutPage() {
  const container = document.querySelector("[data-checkout-page]");
  if (!container) return;

  const latestOrder = localStorage.getItem("dearelleLatestOrder");
  const params = new URLSearchParams(window.location.search);
  const stripeStatus = params.get("stripe");
  const totals = cartTotals();

  if (stripeStatus === "success") {
    const pendingOrder = JSON.parse(localStorage.getItem("dearellePendingStripeOrder") || "null");
    if (pendingOrder) {
      const orders = JSON.parse(localStorage.getItem("dearelleOrders") || "[]");
      orders.push(pendingOrder);
      localStorage.setItem("dearelleOrders", JSON.stringify(orders));
      localStorage.setItem("dearelleLatestOrder", JSON.stringify(pendingOrder));
      localStorage.removeItem("dearellePendingStripeOrder");
      saveCart([]);
      container.innerHTML = orderConfirmationMarkup(pendingOrder);
      createLocalIcons();
      return;
    }
  }

  if (!totals.lines.length && !latestOrder) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="shopping-bag"></i>
        <h2>Your cart is empty.</h2>
        <p>Add a piece before starting checkout.</p>
        <a class="button" href="/#bestsellers">Shop Now</a>
      </div>
    `;
    createLocalIcons();
    return;
  }

  if (!totals.lines.length && latestOrder) {
    const order = JSON.parse(latestOrder);
    container.innerHTML = orderConfirmationMarkup(order);
    createLocalIcons();
    return;
  }

  container.innerHTML = `
    <div class="checkout-layout">
      <form class="checkout-form" data-checkout-form>
        <section>
          <h2>Contact</h2>
          <label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></label>
          <label>Phone<input name="phone" type="tel" autocomplete="tel" required placeholder="+91 98765 43210"></label>
        </section>
        <section>
          <h2>Shipping Address</h2>
          <div class="form-grid">
            <label>First name<input name="firstName" required autocomplete="given-name"></label>
            <label>Last name<input name="lastName" required autocomplete="family-name"></label>
          </div>
          <label>Address<input name="address" required autocomplete="street-address"></label>
          <div class="form-grid">
            <label>City<input name="city" required autocomplete="address-level2"></label>
            <label>State<input name="state" required autocomplete="address-level1"></label>
            <label>PIN code<input name="pin" required pattern="[0-9]{6}" maxlength="6" autocomplete="postal-code" placeholder="682001"></label>
          </div>
        </section>
        <section>
          <h2>Payment</h2>
          <label class="radio-row"><input type="radio" name="payment" value="Stripe" checked> Secure card payment with Stripe</label>
        </section>
        ${stripeStatus === "cancelled" ? `<p class="checkout-error">Stripe checkout was cancelled. You can try again below.</p>` : ""}
        <p class="checkout-error" data-checkout-error aria-live="polite"></p>
        <button class="button checkout-submit" type="submit">Pay Securely with Stripe</button>
      </form>
      <div>
        <div class="checkout-items">
          ${totals.lines.map((line) => `
            <article>
              <img src="${line.product.images[0]}" alt="${line.product.name}">
              <div><strong>${line.product.name}</strong><span>Qty ${line.quantity}</span></div>
              <p>${formatPrice(line.lineTotal)}</p>
            </article>
          `).join("")}
        </div>
        ${summaryMarkup(totals, "")}
      </div>
    </div>
  `;

  const session = window.DearelleAuth?.getSession?.();
  if (session?.user) {
    const user = session.user;
    const meta = user.user_metadata || {};
    const form = container.querySelector("[data-checkout-form]");
    if (form) {
      form.elements.email.value = user.email || "";
      form.elements.phone.value = meta.phone || "";
      form.elements.firstName.value = meta.firstName || "";
      form.elements.lastName.value = meta.lastName || "";
    }
  }
}

function bindProductInteractions() {
  document.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-gallery-image]");
    if (thumb) {
      const mainImage = document.querySelector("[data-main-image]");
      document.querySelectorAll("[data-gallery-image]").forEach((button) => button.classList.remove("is-active"));
      thumb.classList.add("is-active");
      if (mainImage) mainImage.src = thumb.dataset.galleryImage;
    }

    const option = event.target.closest(".product-options button");
    if (option) {
      option.parentElement.querySelectorAll("button").forEach((button) => button.classList.remove("is-selected"));
      option.classList.add("is-selected");
    }

    const wishlist = event.target.closest(".wishlist, .product-wishlist");
    if (wishlist) {
      event.preventDefault();
      wishlist.classList.toggle("is-active");
    }

    const cardAdd = event.target.closest("[data-card-add]");
    if (cardAdd) {
      addToCart(cardAdd.dataset.cardAdd, 1);
      cardAdd.textContent = "Added";
      setTimeout(() => {
        cardAdd.textContent = "Add to Cart";
      }, 1100);
    }

    const quantity = document.querySelector("[data-qty]");
    if (event.target.closest("[data-qty-minus]") && quantity) {
      quantity.textContent = Math.max(1, Number(quantity.textContent) - 1);
    }
    if (event.target.closest("[data-qty-plus]") && quantity) {
      quantity.textContent = Number(quantity.textContent) + 1;
    }

    const addCart = event.target.closest("[data-add-cart]");
    if (addCart) {
      const productId = addCart.dataset.addCart;
      const amount = Number(document.querySelector("[data-qty]")?.textContent || 1);
      const selectedOptions = {};
      document.querySelectorAll("[data-option-group]").forEach((group) => {
        selectedOptions[group.dataset.optionGroup] = group.querySelector(".is-selected")?.dataset.optionValue || "";
      });
      addToCart(productId, amount, selectedOptions);
      addCart.textContent = "Added to Cart";
      setTimeout(() => {
        addCart.innerHTML = 'Add to Cart <i data-lucide="shopping-bag"></i>';
        createLocalIcons();
      }, 1300);
    }

    const cartMinus = event.target.closest("[data-cart-minus]");
    if (cartMinus) {
      const item = getCart().find((line) => line.key === cartMinus.dataset.cartMinus);
      if (item) updateCartItem(item.key, item.quantity - 1);
    }

    const cartPlus = event.target.closest("[data-cart-plus]");
    if (cartPlus) {
      const item = getCart().find((line) => line.key === cartPlus.dataset.cartPlus);
      if (item) updateCartItem(item.key, item.quantity + 1);
    }

    const cartRemove = event.target.closest("[data-cart-remove]");
    if (cartRemove) {
      updateCartItem(cartRemove.dataset.cartRemove, 0);
    }
  });

  document.addEventListener("submit", (event) => {
    const checkoutForm = event.target.closest("[data-checkout-form]");
    if (!checkoutForm) return;

    event.preventDefault();
    const totals = cartTotals();
    if (!totals.lines.length) return;

    const data = Object.fromEntries(new FormData(checkoutForm).entries());
    startStripeCheckout(data, checkoutForm.querySelector(".checkout-submit"));
  });
}

function buildSearchModal() {
  if (document.querySelector("[data-search-modal]")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <section class="search-modal" data-search-modal hidden>
      <div class="search-modal__panel" role="dialog" aria-modal="true" aria-label="Search products">
        <button class="icon-button search-modal__close" type="button" data-search-close aria-label="Close search"><i data-lucide="x"></i></button>
        <h2>Search Dearelle</h2>
        <form data-search-form>
          <input name="query" type="search" placeholder="Search necklaces, bracelets, gifts..." autocomplete="off" required>
          <button class="button" type="submit">Search</button>
        </form>
        <div class="search-modal__results" data-search-results></div>
      </div>
    </section>
  `);
  createLocalIcons();
}

function renderSearchResults(query) {
  const results = (window.products || []).filter((product) => {
    const haystack = [product.name, product.category, product.collection, product.shortDescription].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }).slice(0, 6);
  const container = document.querySelector("[data-search-results]");
  if (!container) return;
  if (!results.length) {
    container.innerHTML = `<p class="search-empty">No products found. Try necklace, bracelet, gift, or charm.</p>`;
    return;
  }
  container.innerHTML = results.map((product) => `
    <a href="${productUrl(product)}">
      <img src="${product.images[0]}" alt="">
      <span><strong>${product.name}</strong><small>${product.category} · ${formatPrice(product.price)}</small></span>
    </a>
  `).join("");
}

function openSearch() {
  buildSearchModal();
  const modal = document.querySelector("[data-search-modal]");
  modal.hidden = false;
  modal.querySelector("input")?.focus();
}

function closeSearch() {
  const modal = document.querySelector("[data-search-modal]");
  if (modal) modal.hidden = true;
}

function bindSearch() {
  document.addEventListener("click", (event) => {
    if (event.target.closest('[aria-label="Search"]')) openSearch();
    if (event.target.closest("[data-search-close]")) closeSearch();
    if (event.target.matches("[data-search-modal]")) closeSearch();
  });
  document.addEventListener("input", (event) => {
    const input = event.target.closest('[data-search-form] input[name="query"]');
    if (input) renderSearchResults(input.value.trim());
  });
  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-search-form]");
    if (!form) return;
    event.preventDefault();
    const query = new FormData(form).get("query")?.trim() || "";
    renderSearchResults(query);
  });
}

function showHeroSlide(index) {
  if (!heroSlides.length) return;

  heroIndex = (index + heroSlides.length) % heroSlides.length;

  heroSlides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === heroIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  heroDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === heroIndex);
  });
}

function restartHeroTimer() {
  window.clearInterval(heroTimer);
  heroTimer = window.setInterval(() => showHeroSlide(heroIndex + 1), 5500);
}

heroPrev?.addEventListener("click", () => {
  showHeroSlide(heroIndex - 1);
  restartHeroTimer();
});

heroNext?.addEventListener("click", () => {
  showHeroSlide(heroIndex + 1);
  restartHeroTimer();
});

heroDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    showHeroSlide(Number(dot.dataset.heroDot));
    restartHeroTimer();
  });
});

async function initStorefront() {
  await loadManagedProducts();
  renderProductCards(document.querySelector("[data-products-grid]"), window.products || []);
  renderCategoryPage();
  renderProductPage();
  renderCartPage();
  renderCheckoutPage();
  updateCartCount();

  if (window.lucide) {
    window.lucide.createIcons();
  }

  createLocalIcons();

  closeAnnouncement?.addEventListener("click", () => {
    announcement?.remove();
  });

  menuToggle?.addEventListener("click", () => {
    document.body.classList.toggle("menu-open");
    const isOpen = document.body.classList.contains("menu-open");
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  wishlistButtons.forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("is-active");
    });
  });

  if (heroSlides.length) {
    showHeroSlide(0);
    restartHeroTimer();
  }

  document.querySelector(".newsletter__form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.querySelector("input")?.value?.trim();
    const message = form.querySelector("[data-newsletter-message]") || form.querySelector("small") || form.appendChild(document.createElement("small"));
    message.dataset.newsletterMessage = "";
    message.textContent = email ? "Thank you for your subscription. You are now in the sparkle list." : "Please enter your email to subscribe.";
    if (email) form.reset();
  });

  bindSearch();
  bindProductInteractions();
}

initStorefront();
