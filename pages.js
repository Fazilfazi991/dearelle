const infoPages = {
  "about-us": {
    title: "About Us",
    kicker: "Our Story",
    body: ["Dearelle is made for everyday little luxury: soft, wearable jewelry that feels special without waiting for a special occasion.", "Each piece is chosen for comfort, glow, and gifting charm, so it can move with you from ordinary mornings to meaningful celebrations."]
  },
  "our-craft": {
    title: "Our Craft",
    kicker: "Made With Care",
    body: ["We focus on delicate finishes, thoughtful proportions, and pieces that layer beautifully.", "Every design is checked for daily wearability, secure closures, and gift-ready presentation."]
  },
  sustainability: {
    title: "Sustainability",
    kicker: "Better Choices",
    body: ["We choose responsible packaging where possible and keep our collections intentional rather than wasteful.", "Our goal is jewelry that is loved longer, cared for better, and gifted with less excess."]
  },
  "care-guide": {
    title: "Care Guide",
    kicker: "Keep the Shine",
    body: ["Keep jewelry away from perfume, lotions, water, and harsh cleaners.", "After wearing, wipe gently with a soft dry cloth and store each piece separately in its pouch or box."]
  },
  faqs: {
    title: "FAQs",
    kicker: "Helpful Answers",
    body: ["Orders usually ship with tracking after processing. Product pages show care and gift details for each piece.", "For help with sizing, returns, gifts, or checkout, contact us and we will guide you."]
  },
  "contact-us": {
    title: "Contact Us",
    kicker: "Need Help?",
    body: ["Email: hello@dearelle.com", "Phone: +91 80864 34964", "Support hours: Monday to Friday, 9 AM - 6 PM IST"]
  },
  "shipping-delivery": {
    title: "Shipping & Delivery",
    kicker: "Wrapped With Care",
    body: ["We prepare every order carefully and share tracking once it ships.", "Complimentary shipping is available on orders above ₹5,999."]
  },
  "returns-exchanges": {
    title: "Returns & Exchanges",
    kicker: "Easy Support",
    body: ["If your order is not quite right, contact us within 30 days of delivery.", "Items should be unused, unworn, and returned with original packaging."]
  },
  "size-guide": {
    title: "Size Guide",
    kicker: "Find Your Fit",
    body: ["Necklace lengths are listed on each product page. For bracelets, choose the size that sits comfortably without pulling.", "If you are between sizes, contact us and we will help you choose."]
  },
  "track-your-order": {
    title: "Track Your Order",
    kicker: "Order Updates",
    body: ["Once your order ships, tracking details will be sent to your email.", "You can also contact us with your order number for a quick update."]
  },
  "gift-cards": {
    title: "Gift Cards",
    kicker: "Coming Soon",
    body: ["Digital gift cards are being prepared for Dearelle gifting.", "Until then, explore our gift-ready pieces and soft packaging options."]
  },
  "privacy-policy": {
    title: "Privacy Policy",
    kicker: "Your Privacy",
    body: ["We collect only the details needed to process orders, customer accounts, support, and store communication.", "Payment information is handled by secure payment providers and is not stored in this website."]
  },
  "terms-and-conditions": {
    title: "Terms & Conditions",
    kicker: "Store Terms",
    body: ["By using Dearelle, you agree to use the website lawfully and provide accurate checkout information.", "Prices, offers, and availability may change, but confirmed orders will be handled with care."]
  },
  accessibility: {
    title: "Accessibility",
    kicker: "Open to Everyone",
    body: ["We aim to keep Dearelle easy to browse, read, and use across devices.", "If you find any issue that makes shopping difficult, contact us so we can improve it."]
  }
};

function renderInfoPage() {
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, "") || "about-us";
  const page = infoPages[slug] || infoPages["about-us"];
  const heading = document.querySelector("[data-info-heading]");
  const content = document.querySelector("[data-info-content]");
  document.title = `${page.title} | Dearelle`;
  if (heading) heading.innerHTML = `<p class="script">${page.kicker}</p><h1>${page.title}</h1>`;
  if (content) {
    content.innerHTML = page.body.map((paragraph) => `<p>${paragraph}</p>`).join("") + `<a class="button" href="category">Continue Shopping</a>`;
  }
}

renderInfoPage();
