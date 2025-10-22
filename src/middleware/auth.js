const jwt = require("jsonwebtoken");
const logger = require("winston");

exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();

  if (req.xhr || req.headers.accept.includes("json")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  req.flash("error_msg", "Please log in to continue");
  return res.redirect("/auth/login");
};

exports.ensureVerified = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.verification?.email) {
    return next();
  }

  req.flash("error_msg", "Please verify your email to continue.");
  return res.redirect("/dashboard/profile");
};

exports.forwardAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return next();
  }

  // Already logged in users go to dashboard
  return res.redirect("/dashboard");
};
