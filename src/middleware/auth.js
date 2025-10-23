const jwt = require("jsonwebtoken");
const logger = require("winston");

exports.ensureAuthenticated = (req, res, next) => {
  if (req.user) {
    // Assuming req.user is set by your auth system; if using Passport, use req.isAuthenticated()
    return next();
  } else {
    // Check if it's an AJAX request or expects JSON response
    if (
      req.xhr ||
      req.headers.accept?.includes("application/json") ||
      req.headers["x-requested-with"] === "XMLHttpRequest"
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in again.",
      });
    } else {
      // For regular browser requests, redirect to login
      req.flash("error_msg", "Please log in to view this resource"); // Optional, if using flash messages
      return res.redirect("/auth/login");
    }
  }
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
