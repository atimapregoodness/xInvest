// ===================== MAIN SCRIPT =====================
document.addEventListener("DOMContentLoaded", () => {
  /* ===================== SCROLL ANIMATIONS ===================== */

  // Fade-in animation
  const fadeElements = document.querySelectorAll(".fade-in");
  const slideElements = document.querySelectorAll(
    ".show-from-bottom, .show-from-left, .show-from-right"
  );

  const observerOptions = {
    threshold: 0.2,
    rootMargin: "0px 0px -100px 0px",
  };

  const onScrollAppear = (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target); // Only trigger once
    });
  };

  const appearOnScroll = new IntersectionObserver(
    onScrollAppear,
    observerOptions
  );

  fadeElements.forEach((el) => appearOnScroll.observe(el));
  slideElements.forEach((el) => appearOnScroll.observe(el));

  /* ===================== SOCKET.IO REAL-TIME PRICE UPDATES ===================== */

  const socket = io();

  socket.on("priceUpdate", (prices) => updatePriceDisplay(prices));

  function updatePriceDisplay(prices) {
    Object.entries(prices).forEach(([symbol, data]) => {
      const priceEl = document.getElementById(`${symbol.toLowerCase()}-price`);
      const changeEl = document.querySelector(
        `.coin-price:has(#${symbol.toLowerCase()}-price) .price-change`
      );

      if (priceEl) priceEl.textContent = data.price;

      if (changeEl) {
        changeEl.textContent = `${data.change > 0 ? "+" : ""}${data.change}%`;
        changeEl.className = `price-change ${
          data.change >= 0 ? "positive" : "negative"
        }`;
      }
    });
  }
});
