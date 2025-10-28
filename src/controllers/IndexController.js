const Investment = require("../models/Trade");
const Transaction = require("../models/Transaction");

exports.getHome = async (req, res) => {
  try {
    // Fetch some stats for the home page
    const totalInvestments = await Investment.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const recentInvestments = await Investment.find()
      .populate("user", "username")
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("home", {
      title: "Home",
      totalInvestments,
      totalTransactions,
      recentInvestments,
    });
  } catch (error) {
    console.error(error);
    res.render("home", {
      title: "Home",
      error: "Unable to fetch data",
    });
  }
};

exports.getAbout = (req, res) => {
  res.render("about", { title: "About Us" });
};

exports.getContact = (req, res) => {
  res.render("contact", { title: "Contact" });
};

exports.getSupport = (req, res) => {
  res.render("support", { title: "Support" });
};

exports.getFAQs = (req, res) => {
  res.render("faqs", { title: "FAQs" });
};

exports.getTerms = (req, res) => {
  res.render("terms", { title: "Terms & Conditions" });
};

exports.getPrivacy = (req, res) => {
  res.render("privacy", { title: "Privacy Policy" });
};
