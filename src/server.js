// =========================
// Load Modules & Config
// =========================
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
const ejsMate = require("ejs-mate");
const socketIo = require("socket.io");
const http = require("http");
require("dotenv").config();
require("./config/passport");
require("./services/profitUpdateService");

const User = require("./models/User");
const Investment = require("./models/Trade");

const { ensureWallet } = require("./middleware/wallet");
const { ensureAuthenticated } = require("./middleware/auth");

const app = express();

// =========================
// Constants
// =========================
const isVercel = process.env.VERCEL || false;
let server, io;

// =========================
// MongoDB Connection
// =========================
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

// =========================
// Server / Socket Setup
// =========================
if (!isVercel) {
  server = http.createServer(app);
  io = socketIo(server);
} else {
  server = app;
}

// =========================
// View Engine
// =========================
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// =========================
// Middleware
// =========================
app.set("trust proxy", 1);

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
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://kit.fontawesome.com",
          "https://ka-f.fontawesome.com",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://ka-f.fontawesome.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://ka-f.fontawesome.com",
          "https://res.cloudinary.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        connectSrc: [
          "'self'",
          "https://ka-f.fontawesome.com",
          "https://api.coingecko.com",
          "https://api.binance.com",
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);
// =========================
// Core Middleware
// =========================
app.use(compression());
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// =========================
// CSRF & Cookie Setup
// =========================
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// =========================
// Session & Passport
// =========================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "professional-forex-investment",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 days
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// =========================
// Flash & Passport
// =========================

app.use(passport.initialize());
app.use(passport.session());

// =========================
// CSRF Protection
// =========================
const csrfProtection = csrf({ cookie: true });

// Apply CSRF protection to all non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next(); // Skip API routes

  csrfProtection(req, res, (err) => {
    if (err) return next(err);
    res.locals.csrfToken = req.csrfToken();
    next();
  });
});

app.use(flash());

// =========================
// Global Locals
// =========================
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.isVercel = isVercel;
  next();
});

// =========================
// Rate Limiter
// =========================

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // allow up to 300 requests per minute
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiter conditionally — exclude frequent update route
app.use((req, res, next) => {
  if (req.path === "/dashboard/trade/status") {
    return next(); // skip rate limiting for this path
  }
  limiter(req, res, next);
});

// =========================
// Forex Simulation
// =========================
let lastGoodForexData = generateProfessionalForexData();
let apiStatus = { successes: 0, errors: 0, lastSuccess: null };

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

if (!isVercel) {
  const FETCH_INTERVAL = 3000;
  setInterval(() => {
    lastGoodForexData = updateProfessionalForexData(lastGoodForexData);
    if (io)
      io.emit("forexUpdate", {
        ...lastGoodForexData,
        ts: Date.now(),
        live: false,
        simulated: true,
      });
  }, FETCH_INTERVAL);
}

// =========================
// Cron Job: Investment Updates
// =========================
// =========================
// Cron Job: Investment Updates
// =========================
const cron = require("node-cron");

try {
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏳ Running scheduled investment profit update...");
    try {
      const investments = await Investment.find({ status: "active" });

      for (const inv of investments) {
        const currentProfit = inv.calculateCurrentProfit();
        await inv.updateProfit(currentProfit);
        if (new Date() >= inv.endDate) await inv.complete();
      }

      console.log(
        `✅ Profit update completed successfully for ${investments.length} active investments.`
      );
    } catch (err) {
      console.error("❌ Error during profit update cron job:", err);
    }
  });

  console.log(
    "🕒 Cron job for investment profit updates initialized successfully (runs every 5 minutes)."
  );
} catch (err) {
  console.error("⚠️ Failed to initialize cron job:", err);
}

const Trade = require("./models/Trade");

app.use(async (req, res, next) => {
  // default value so templates always have something
  res.locals.activeTradesCount = 0;

  // if no logged-in user, skip DB work (keeps it fast)
  if (!req.user || !req.user._id) return next();

  try {
    const activeTradesCount = await Trade.countDocuments({
      user: req.user._id,
      status: "active",
    });
    res.locals.activeTradesCount = activeTradesCount || 0;
    return next();
  } catch (err) {
    // log the error and continue — don't break the whole request
    console.error("Failed to load activeTradesCount:", err);
    // optionally attach to res.locals for debugging in views:
    // res.locals._countError = err.message;
    return next(err); // or next() if you don't want the error handler to run
  }
});

// =========================
// Routes
// =========================
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

// =========================
// API Endpoints
// =========================
const axios = require("axios");

app.get("/api/crypto-prices", async (req, res) => {
  try {
    let prices = {};
    try {
      const { data } = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: { ids: "bitcoin,ethereum,tether", vs_currencies: "usd" },
          timeout: 5000,
        }
      );
      prices = {
        BTC: data.bitcoin.usd,
        ETH: data.ethereum.usd,
        USDT: data.tether.usd,
        _source: "coingecko",
      };
    } catch {
      try {
        const [btc, eth] = await Promise.all([
          axios.get(
            "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
          ),
          axios.get(
            "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
          ),
        ]);
        prices = {
          BTC: parseFloat(btc.data.price),
          ETH: parseFloat(eth.data.price),
          USDT: 1,
          _source: "binance",
        };
      } catch {
        prices = {
          BTC: 50000,
          ETH: 3000,
          USDT: 1,
          _source: "fallback",
          _fallback: true,
        };
      }
    }
    res.json(prices);
  } catch {
    res.json({
      BTC: 50000,
      ETH: 3000,
      USDT: 1,
      _source: "error_fallback",
      _fallback: true,
    });
  }
});

app.get("/api/forex", async (req, res) => {
  res.json({
    success: true,
    data: lastGoodForexData,
    live: false,
    simulated: true,
    timestamp: new Date().toISOString(),
    apiStatus,
  });
});

app.get("/api/health", async (req, res) => {
  res.json({
    status: "healthy",
    service: "Professional Forex Investment Platform",
    uptime: process.uptime(),
    environment: isVercel ? "vercel" : "local",
  });
});

app.get("/set-lang/:lang", (req, res) => {
  res.cookie("lang", req.params.lang, { maxAge: 900000 });
  res.redirect("back");
});

// =========================
// Socket.io
// =========================
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
// Error Handling
// =========================

// =========================
// CSRF Error Handler
// =========================
app.use((err, req, res, next) => {
  // Handle invalid CSRF tokens
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).render("error/err", {
      status: 403,
      message: "Invalid CSRF token. Please refresh and try again.",
      error: err, // 👈 this line fixes 'error is not defined'
    });
  }

  // Handle all other errors
  res.status(err.status || 500).render("error/err", {
    status: err.status || 500,
    message: err.message || "Something went wrong",
    error: err, // 👈 always pass this
  });
});

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

app.use((req, res) => {
  res.status(404).render("error/err", {
    title: "404 - Page Not Found",
    status: 404,
    message: "Sorry, the page you're looking for does not exist.",
    error: {},
  });
});

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

// =========================
// Start Server
// ========================================================================================================================================================
if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
  });
}

module.exports = app;
