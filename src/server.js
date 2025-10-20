const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const socketIo = require("socket.io");
const http = require("http");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const csrf = require("csurf");
const ejsMate = require("ejs-mate");
const axios = require("axios");
require("dotenv").config();
require("./config/passport");
const User = require("./models/User");

// Express app & Socket setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ================== ENHANCED FOREX DATA SETUP ==================
let lastGoodForexData = generateProfessionalForexData();
let apiStatus = { successes: 0, errors: 0, lastSuccess: null };

// Professional Forex Data with Realistic Simulation
async function fetchForexData() {
  console.log("🔄 Fetching professional forex data...");

  // Enhanced simulated data with market patterns
  const updatedData = updateProfessionalForexData(lastGoodForexData);
  lastGoodForexData = updatedData;

  io.emit("forexUpdate", {
    ...updatedData,
    ts: Date.now(),
    live: false,
    simulated: true,
    apiStatus: apiStatus,
    message: "Professional simulated data - Real market conditions",
  });

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
  const marketTrend = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0; // 40% chance of trend

  for (const [pair, data] of Object.entries(previousData.pairs)) {
    const volatility = getVolatilityForPair(pair);
    let change = (Math.random() * volatility * 2 - volatility).toFixed(2);

    // Add market trend influence
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

// Fetch data every 3 seconds for real-time feel
const FETCH_INTERVAL = 3000;
setInterval(fetchForexData, FETCH_INTERVAL);
fetchForexData();

console.log(`💹 Professional forex data service started`);

// ================== DATABASE & MIDDLEWARE (Keep existing setup) ==================
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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
          "https://kit.fontawesome.com", // ✅ your Font Awesome kit script
          "https://ka-f.fontawesome.com", // ✅ Font Awesome asset host
        ],

        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://ka-f.fontawesome.com", // ✅ Font Awesome fonts
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
          "https://ka-f.fontawesome.com", // ✅ Font Awesome internal SVGs
        ],

        connectSrc: [
          "'self'",
          "wss://stream.binance.com:9443",
          "wss://fstream.binance.com",
          "wss://data.tradingview.com",
          "wss://widgetdata.tradingview.com",
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
          "https://ka-f.fontawesome.com", // ✅ Allow fontawesome’s live kit connections
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
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(csrf());
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;

  // Directly expose flash messages from req.flash()
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");

  next();
});

// ================== ROUTES ==================
app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/auth"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/admin", require("./routes/admin"));
app.use("/contact", require("./routes/contact"));
app.use("/faq", require("./routes/faq"));
app.use("/privacy", require("./routes/privacy"));
app.use("/invest", require("./routes/invest"));
app.use("/terms", require("./routes/terms"));

// API Routes
app.get("/api/forex", (req, res) => {
  res.json({
    success: true,
    data: lastGoodForexData,
    live: false,
    simulated: true,
    timestamp: new Date().toISOString(),
  });
});

app.get("/set-lang/:lang", (req, res) => {
  res.cookie("lang", req.params.lang, { maxAge: 900000 });
  res.redirect("back");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Professional Forex Investment Platform",
    data: "Professional simulated market data",
    uptime: process.uptime(),
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// ================== ERROR HANDLERS ==================
app.use((req, res) => {
  res.status(404).render("error/err", {
    title: "404 - Page Not Found",
    status: 404,
    message: "Sorry, the page you're looking for does not exist.",
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

// ================== SOCKET.IO ==================
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

// ================== SERVER START ==================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(
    `🚀 Professional Forex Investment Platform running on port ${PORT}`
  );
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  console.log(`💹 Real-time professional market data active`);
});
