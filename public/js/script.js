// General site JavaScript
// Scroll animations

// General site JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Enable Bootstrap tooltips
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Flash message auto-dismiss
  const flashMessages = document.querySelectorAll(".alert");
  flashMessages.forEach((message) => {
    setTimeout(() => {
      message.classList.add("fade");
      setTimeout(() => message.remove(), 150);
    }, 5000);
  });

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

  document.addEventListener("DOMContentLoaded", function () {
    // Enable Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Flash message auto-dismiss
    const flashMessages = document.querySelectorAll(".alert");
    flashMessages.forEach((message) => {
      setTimeout(() => {
        message.classList.add("fade");
        setTimeout(() => message.remove(), 150);
      }, 5000);
    });
  });

  const refreshBtn = document.getElementById("refresh-market");

  async function updateMarket() {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd&include_24hr_change=true"
    );
    const data = await res.json();

    document.querySelector(
      "#market-data tr:nth-child(1) td:nth-child(2)"
    ).textContent = `$${data.bitcoin.usd.toLocaleString()}`;
    document.querySelector(
      "#market-data tr:nth-child(1) td:nth-child(3)"
    ).textContent = `${data.bitcoin.usd_24h_change.toFixed(2)}%`;

    document.querySelector(
      "#market-data tr:nth-child(2) td:nth-child(2)"
    ).textContent = `$${data.tether.usd}`;
  }

  refreshBtn.addEventListener("click", updateMarket);
  updateMarket();

  const socket = io(); // served by socket.io script from server

  socket.on("connect", () => {
    console.log("Connected to market feed");
  });

  socket.on("marketUpdate", (payload) => {
    // crypto
    if (payload.crypto) {
      const btc = payload.crypto.BTC;
      const usdt = payload.crypto.USDT;
      updateEl("#btc-price", formatNumber(btc.price, 2), btc.change24h);
      updateEl("#usdt-price", formatNumber(usdt.price, 2), usdt.change24h);
    }

    // forex heroes
    if (payload.forexPairs) {
      setText("#eurusd-price", payload.forexPairs.EURUSD);
      setText("#gbpusd-price", payload.forexPairs.GBPUSD);
      setText("#usdjpy-price", payload.forexPairs.USDJPY);
    }

    // last updated
    document.getElementById("last-update") &&
      (document.getElementById("last-update").textContent =
        new Date(payload.ts).toLocaleTimeString() +
        (payload.simulated ? " (sim)" : ""));
  });

  function setText(selector, val) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add("price-flash");
    setTimeout(() => el.classList.remove("price-flash"), 900);
    el.textContent =
      typeof val === "number" || !isNaN(val)
        ? Number(val).toLocaleString()
        : val;
  }

  function updateEl(selector, priceText, change24) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = priceText;
    const changeSpan = document.createElement("span");
    changeSpan.textContent = ` ${Number(change24).toFixed(2)}%`;
    changeSpan.className =
      Number(change24) >= 0 ? "price-up ms-2" : "price-down ms-2";
    // append or update small label next to price
    const parent = el.parentElement;
    if (parent) {
      let existing = parent.querySelector(".price-change-small");
      if (!existing) {
        existing = document.createElement("div");
        existing.className = "price-change-small small";
        parent.appendChild(existing);
      }
      existing.innerHTML = "";
      existing.appendChild(changeSpan);
    }
    // flash animation
    el.classList.add("price-flash");
    setTimeout(() => el.classList.remove("price-flash"), 900);
  }

  function formatNumber(n, decimals = 2) {
    if (n === null || n === undefined) return "-";
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
});
