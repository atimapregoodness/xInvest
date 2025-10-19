// Scroll animations
document.addEventListener("DOMContentLoaded", function () {
  const fadeElements = document.querySelectorAll(".fade-in");

  const appearOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px",
  };

  const appearOnScroll = new IntersectionObserver(function (
    entries,
    appearOnScroll
  ) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      appearOnScroll.unobserve(entry.target);
    });
  },
  appearOptions);

  fadeElements.forEach((element) => {
    appearOnScroll.observe(element);
  });
});

// Socket.io for real-time price updates
const socket = io();

socket.on("priceUpdate", (prices) => {
  updatePriceDisplay(prices);
});

function updatePriceDisplay(prices) {
  for (const [symbol, data] of Object.entries(prices)) {
    const priceElement = document.getElementById(
      `${symbol.toLowerCase()}-price`
    );
    const changeElement = document.querySelector(
      `.coin-price:has(#${symbol.toLowerCase()}-price) .price-change`
    );

    if (priceElement) {
      priceElement.textContent = data.price;
    }

    if (changeElement) {
      changeElement.textContent = `${data.change > 0 ? "+" : ""}${
        data.change
      }%`;
      changeElement.className = `price-change ${
        data.change >= 0 ? "positive" : "negative"
      }`;
    }
  }
}
