// middleware/globalSettings.js
const Global = require("../models/Global");

const globalSettings = async (req, res, next) => {
  try {
    // Get or create global settings
    let globalSettings = await Global.findOne();

    if (!globalSettings) {
      // Create default global settings if none exist
      globalSettings = await Global.create({
        wallets: {
          ETH: "",
          BTC: "",
          USDT: "",
        },
        company: {
          phone: "",
          email: "",
          address: "",
          website: "",
        },
      });
    }

    // Add to res.locals for all views
    res.locals.global = globalSettings;

    // Also add individual wallet addresses for easy access
    res.locals.walletETH = globalSettings.wallets.ETH;
    res.locals.walletBTC = globalSettings.wallets.BTC;
    res.locals.walletUSDT = globalSettings.wallets.USDT;
    res.locals.companyPhone = globalSettings.company.phone;
    res.locals.companyEmail = globalSettings.company.email;
    res.locals.companyAddress = globalSettings.company.address;
    res.locals.companyWebsite = globalSettings.company.website;

    next();
  } catch (error) {
    console.error("Error loading global settings:", error);

    // Provide fallback values in case of error
    res.locals.global = {
      wallets: { ETH: "", BTC: "", USDT: "" },
      company: { phone: "", email: "", address: "", website: "" },
    };

    next();
  }
};

module.exports = globalSettings;
