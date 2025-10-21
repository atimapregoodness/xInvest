// src/middleware/ensureWallet.js
const Wallet = require("../models/Wallet");

exports.ensureWallet = async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // if user already has wallet populated by isLoggedIn => fine
    if (req.user.wallet) {
      // if wallet is an ObjectId only, populate it
      if (typeof req.user.wallet === "object" && req.user.wallet._id) {
        req.wallet = req.user.wallet;
        return next();
      }
      // else fetch it
      const wallet = await Wallet.findOne({ userId: req.user._id });
      if (wallet) {
        req.user.wallet = wallet;
        req.wallet = wallet;
        return next();
      }
    }

    // create wallet if not found
    const newWallet = await Wallet.create({ userId: req.user._id });
    // link to user document and save user (optional)
    req.user.wallet = newWallet;
    req.wallet = newWallet;
    // if you want to persist link in User: uncomment next line
    // await req.user.save();

    next();
  } catch (err) {
    console.error("ensureWallet error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to initialize wallet" });
  }
};
