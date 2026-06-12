const closeAnnouncement = document.querySelector("[data-close-announcement]");
const announcement = document.querySelector("#announcement");
const menuToggle = document.querySelector("[data-menu-toggle]");
const wishlistButtons = document.querySelectorAll(".wishlist");

const iconPaths = {
  "arrow-left": ["M19 12H5", "M12 19l-7-7 7-7"],
  "arrow-right": ["M5 12h14", "M12 5l7 7-7 7"],
  "badge": ["M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7L12 3z"],
  "chevron-down": ["M6 9l6 6 6-6"],
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

document.querySelector(".newsletter__form")?.addEventListener("submit", (event) => {
  event.preventDefault();
});
