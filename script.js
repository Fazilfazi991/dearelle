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
  return `product.html?id=${encodeURIComponent(product.id)}`;
}

function renderProductCards(container, productList, limit = productList.length) {
  if (!container) return;

  container.innerHTML = productList.slice(0, limit).map((product) => `
    <article class="product-card">
      ${product.badge ? `<span class="badge">${product.badge}</span>` : ""}
      <button class="wishlist" type="button" aria-label="Add ${product.name} to wishlist"><i data-lucide="heart"></i></button>
      <a class="product-card__link" href="${productUrl(product)}" aria-label="View ${product.name}">
        <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
        <h3>${product.name}</h3>
        <p>${formatPrice(product.price)}</p>
        ${ratingMarkup(product)}
      </a>
    </article>
  `).join("");
}

function optionGroup(label, values) {
  return `
    <fieldset class="product-options">
      <legend>${label}</legend>
      <div>
        ${values.map((value, index) => `<button class="${index === 0 ? "is-selected" : ""}" type="button">${value}</button>`).join("")}
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
        <a href="index.html">Home</a>
        <span>/</span>
        <a href="index.html#bestsellers">${product.category}</a>
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
      <button class="button product-add" type="button" data-add-cart>Add to Cart <i data-lucide="shopping-bag"></i></button>
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

    const quantity = document.querySelector("[data-qty]");
    if (event.target.closest("[data-qty-minus]") && quantity) {
      quantity.textContent = Math.max(1, Number(quantity.textContent) - 1);
    }
    if (event.target.closest("[data-qty-plus]") && quantity) {
      quantity.textContent = Number(quantity.textContent) + 1;
    }

    const addCart = event.target.closest("[data-add-cart]");
    if (addCart) {
      const cartCount = document.querySelector("[data-cart-count], .cart span");
      const amount = Number(document.querySelector("[data-qty]")?.textContent || 1);
      if (cartCount) cartCount.textContent = Number(cartCount.textContent || 0) + amount;
      addCart.textContent = "Added to Cart";
      setTimeout(() => {
        addCart.innerHTML = 'Add to Cart <i data-lucide="shopping-bag"></i>';
        createLocalIcons();
      }, 1300);
    }
  });
}

renderProductCards(document.querySelector("[data-products-grid]"), window.products || []);
renderProductPage();

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

if (heroSlides.length) {
  showHeroSlide(0);
  restartHeroTimer();
}

document.querySelector(".newsletter__form")?.addEventListener("submit", (event) => {
  event.preventDefault();
});

bindProductInteractions();
