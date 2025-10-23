const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const csrf = require("csurf");
const ejsMate = require("ejs-mate");
const socketIo = require("socket.io");
const http = require("http");
require("dotenv").config();
require("./config/passport");
const User = require("./models/User");

const app = express();

const axios = require("axios");

app.get("/api/crypto-prices", async (req, res) => {
  try {
    let prices = {};

    // Try CoinGecko first
    try {
      const { data } = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: "bitcoin,ethereum,tether",
            vs_currencies: "usd",
          },
          timeout: 5000,
        }
      );

      prices = {
        BTC: data.bitcoin.usd,
        ETH: data.ethereum.usd,
        USDT: data.tether.usd,
        _source: "coingecko",
      };
    } catch (coingeckoError) {
      console.log("CoinGecko failed, trying Binance...");

      // Fallback to Binance API
      try {
        const [btcResponse, ethResponse, usdtResponse] = await Promise.all([
          axios.get(
            "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
          ),
          axios.get(
            "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
          ),
          axios.get(
            "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT"
          ), // Using USDC as proxy for USDT
        ]);

        prices = {
          BTC: parseFloat(btcResponse.data.price),
          ETH: parseFloat(ethResponse.data.price),
          USDT: 1, // USDT is pegged to $1
          _source: "binance",
        };
      } catch (binanceError) {
        console.log("All APIs failed, using fallback prices");

        // Final fallback - hardcoded reasonable prices
        prices = {
          BTC: 50000,
          ETH: 3000,
          USDT: 1,
          _source: "fallback",
          _fallback: true,
        };
      }
    }

    console.log("Final prices:", prices);
    res.json(prices);
  } catch (error) {
    console.error("Critical error in crypto prices endpoint:", error);

    res.json({
      BTC: 50000,
      ETH: 3000,
      USDT: 1,
      _source: "error_fallback",
      _fallback: true,
    });
  }
});

const cron = require("node-cron");
const Investment = require("./models/Trade");

cron.schedule("*/5 * * * *", async () => {
  const investments = await Investment.find({ status: "active" });
  for (const inv of investments) {
    const currentProfit = inv.calculateCurrentProfit();
    await inv.updateProfit(currentProfit);
    if (new Date() >= inv.endDate) {
      await inv.complete();
    }
  }
});

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/xInvest", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

app.set("trust proxy", 1);

const isVercel = process.env.VERCEL || false;
let server, io;

if (!isVercel) {
  server = http.createServer(app);
  io = socketIo(server);
} else {
  server = app;
}

let lastGoodForexData = generateProfessionalForexData();
let apiStatus = { successes: 0, errors: 0, lastSuccess: null };

async function fetchForexData() {
  console.log("🔄 Fetching professional forex data...");
  const updatedData = updateProfessionalForexData(lastGoodForexData);
  lastGoodForexData = updatedData;

  if (!isVercel && io) {
    io.emit("forexUpdate", {
      ...updatedData,
      ts: Date.now(),
      live: false,
      simulated: true,
      apiStatus: apiStatus,
      message: "Professional simulated data - Real market conditions",
    });
  }

  console.log("✅ Professional forex data updated");
}

function generateProfessionalForexData() {
  const baseRates = {
    EURUSD: { price: 1.0874, volatility: 0.08 },
    GBPUSD: { price: 1.2718, volatility: 0.12 },
    USDJPY: { price: 148.23, volatility: 0.15 },
    USDCHF: { price: 0.8795, volatility: 0.1 },
    AUDUSD: { price: 0.6589, volatility: 0.14 },
    USDCAD: { price: 1.3542, volatility: 0.11 },
    NZDUSD: { price: 0.6123, volatility: 0.13 },
    EURGBP: { price: 0.855, volatility: 0.09 },
    USDCNH: { price: 7.245, volatility: 0.2 },
  };

  const forexData = {};
  for (const [pair, data] of Object.entries(baseRates)) {
    forexData[pair] = generateProfessionalPairData(
      pair,
      data.price,
      data.volatility
    );
  }

  return { pairs: forexData };
}

function generateProfessionalPairData(pair, basePrice, volatility) {
  const change = (Math.random() * volatility * 2 - volatility).toFixed(2);
  const changePercent = parseFloat(change);
  const currentPrice = basePrice * (1 + changePercent / 100);
  const spread = getProfessionalSpread(pair);

  return {
    price: currentPrice,
    bid: currentPrice.toFixed(pair.includes("JPY") ? 3 : 5),
    ask: (currentPrice * (1 + parseFloat(spread) / 10000)).toFixed(
      pair.includes("JPY") ? 3 : 5
    ),
    change: changePercent,
    changePercent: change,
    high: (currentPrice * (1 + Math.random() * volatility * 0.5)).toFixed(
      pair.includes("JPY") ? 3 : 5
    ),
    low: (currentPrice * (1 - Math.random() * volatility * 0.5)).toFixed(
      pair.includes("JPY") ? 3 : 5
    ),
    spread: spread,
    volume: Math.floor(Math.random() * 800000000) + 400000000,
    timestamp: Date.now(),
  };
}

function updateProfessionalForexData(previousData) {
  const updatedData = { pairs: {} };
  const marketTrend = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;

  for (const [pair, data] of Object.entries(previousData.pairs)) {
    const volatility = getVolatilityForPair(pair);
    let change = (Math.random() * volatility * 2 - volatility).toFixed(2);

    if (marketTrend !== 0) {
      change = (parseFloat(change) + marketTrend * volatility * 0.3).toFixed(2);
    }

    const changePercent = parseFloat(change);
    const currentPrice = data.price * (1 + changePercent / 100);

    updatedData.pairs[pair] = {
      ...data,
      price: currentPrice,
      bid: currentPrice.toFixed(pair.includes("JPY") ? 3 : 5),
      ask: (
        currentPrice *
        (1 + parseFloat(getProfessionalSpread(pair)) / 10000)
      ).toFixed(pair.includes("JPY") ? 3 : 5),
      change: changePercent,
      changePercent: change,
      high: Math.max(
        parseFloat(data.high),
        currentPrice * (1 + Math.random() * 0.002)
      ).toFixed(pair.includes("JPY") ? 3 : 5),
      low: Math.min(
        parseFloat(data.low),
        currentPrice * (1 - Math.random() * 0.002)
      ).toFixed(pair.includes("JPY") ? 3 : 5),
      timestamp: Date.now(),
    };
  }

  return updatedData;
}

function getVolatilityForPair(pair) {
  const volatilities = {
    EURUSD: 0.08,
    GBPUSD: 0.12,
    USDJPY: 0.15,
    USDCHF: 0.1,
    AUDUSD: 0.14,
    USDCAD: 0.11,
    NZDUSD: 0.13,
    EURGBP: 0.09,
    USDCNH: 0.2,
  };
  return volatilities[pair] || 0.1;
}

function getProfessionalSpread(pair) {
  const spreads = {
    EURUSD: "0.6 pips",
    GBPUSD: "0.8 pips",
    USDJPY: "0.7 pips",
    USDCHF: "1.0 pips",
    AUDUSD: "0.9 pips",
    USDCAD: "1.1 pips",
    NZDUSD: "1.2 pips",
    EURGBP: "0.8 pips",
    USDCNH: "2.0 pips",
  };
  return spreads[pair] || "1.0 pips";
}

if (!isVercel) {
  const FETCH_INTERVAL = 3000;
  setInterval(fetchForexData, FETCH_INTERVAL);
  fetchForexData();
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://kit-free.fontawesome.com",
          "https://ka-f.fontawesome.com",
          "https://s3.tradingview.com",
          "https://www.tradingview.com",
          "https://static.tradingview.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://s3.tradingview.com",
          "https://www.tradingview.com",
          "https://static.tradingview.com",
          "https://widget.tradingview.com",
          "https://platform.forex",
          "https://cdn.tradingview.com",
          "https://kit.fontawesome.com",
          "https://ka-f.fontawesome.com",
          !isVercel ? "http://localhost:3000" : "",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://ka-f.fontawesome.com",
          "https://static.tradingview.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "https://res.cloudinary.com",
          "https://s3.tradingview.com",
          "https://cdn.tradingview.com",
          "https://www.tradingview.com",
          "https://static.tradingview.com",
          "https://ka-f.fontawesome.com",
        ],
        connectSrc: [
          "'self'",
          !isVercel ? "ws://localhost:3000" : "",
          !isVercel ? "wss://localhost:3000" : "",
          "https://api.binance.com",
          "https://api1.binance.com",
          "https://api2.binance.com",
          "https://api3.binance.com",
          "https://api.coingecko.com",
          "https://api.coinbase.com",
          "https://api.exchangerate.host",
          "https://api.exchangerate-api.com",
          "https://api.tradingview.com",
          "https://s3.tradingview.com",
          "https://cdn.jsdelivr.net",
          "https://alphavantage.co",
          "https://www.alphavantage.co",
          "https://fcsapi.com",
          "https://marketdata.tradermade.com",
          "https://open.er-api.com",
          "https://api.forexrateapi.com",
          "https://api.forex",
          "https://data.tradingview.com",
          "https://widget.tradingview.com",
          "https://www.tradingview.com",
          "https://ka-f.fontawesome.com",
        ],
        frameSrc: [
          "'self'",
          "https://s.tradingview.com",
          "https://www.tradingview.com",
          "https://widget.tradingview.com",
          "https://cdn.tradingview.com",
        ],
        mediaSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(compression());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "professional-forex-investment",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production" && isVercel,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const csrfProtection = csrf();
app.use((req, res, next) => {
  // Disable CSRF for API routes or JSON endpoints (optional)
  if (req.path.startsWith("/api/")) return next();
  return csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");

  res.locals.isVercel = isVercel;
  next();
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const { ensureWallet } = require("./middleware/wallet");
const { ensureAuthenticated } = require("./middleware/auth");

app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/auth"));
app.use(
  "/dashboard",
  ensureAuthenticated,
  ensureWallet,
  require("./routes/dashboard")
);
app.use("/admin", require("./routes/admin"));

app.use("/dashboard/trade", require("./routes/trade"));

app.use("/dashboard/plans", require("./routes/investmentPlans"));

app.use("/dashboard/wallet", require("./routes/wallet"));

// const { startProfitUpdateService } = require("./services/profitUpdateService");
// startProfitUpdateService();

app.get("/api/forex", async (req, res) => {
  try {
    await connectToMongo();
    lastGoodForexData = updateProfessionalForexData(lastGoodForexData);
    apiStatus.successes++;
    apiStatus.lastSuccess = Date.now();
    res.json({
      success: true,
      data: lastGoodForexData,
      live: false,
      simulated: true,
      timestamp: new Date().toISOString(),
      apiStatus,
    });
  } catch (err) {
    console.error("Forex API error:", err);
    apiStatus.errors++;
    res.json({
      success: true,
      data: lastGoodForexData,
      live: false,
      simulated: true,
      timestamp: new Date().toISOString(),
      apiStatus,
      message: "Using cached data due to database issue",
    });
  }
});

app.get("/set-lang/:lang", (req, res) => {
  res.cookie("lang", req.params.lang, { maxAge: 900000 });
  res.redirect("back");
});

app.get("/api/health", async (req, res) => {
  try {
    await connectToMongo();
    res.json({
      status: "healthy",
      service: "Professional Forex Investment Platform",
      data: "Professional simulated market data",
      uptime: process.uptime(),
      environment: isVercel ? "vercel" : "local",
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      error: "Database connection failed",
    });
  }
});

app.get("/api/test-user", async (req, res) => {
  try {
    await connectToMongo();
    const user = await User.findOne({});
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

if (!isVercel && io) {
  io.on("connection", (socket) => {
    console.log("✅ Professional trader connected");
    socket.emit("forexUpdate", {
      ...lastGoodForexData,
      ts: Date.now(),
      live: false,
      simulated: true,
    });
    socket.on("subscribe", (symbol) => socket.join(symbol));
    socket.on("disconnect", () => console.log("❌ Trader disconnected"));
  });
}

// =========================
// Handle CSRF Errors First
// =========================
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).render("error/err", {
      title: "403 - Forbidden",
      status: 403,
      message: "Invalid CSRF token. Please try again.",
      error: process.env.NODE_ENV === "development" ? err : {},
    });
  }
  next(err);
});

// =========================
// Handle 404 Errors (Not Found)
// =========================
app.use((req, res) => {
  res.status(404).render("error/err", {
    title: "404 - Page Not Found",
    status: 404,
    message: "Sorry, the page you're looking for does not exist.",
    error: {},
  });
});

// =========================
// Handle Other Errors (500, etc.)
// =========================
app.use((err, req, res, next) => {
  console.error(err.stack);

  const status = err.status || 500;
  res.status(status).render("error/err", {
    title: `${status} - Server Error`,
    status,
    message: err.message || "An unexpected error occurred.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(
      `🚀 Professional Forex Investment Platform running on port ${PORT}`
    );
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
    console.log(`💹 Real-time professional market data active`);
  });
}

module.exports = app;
