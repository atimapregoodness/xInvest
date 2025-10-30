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

exports.ensureAdmin = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    req.flash("error_msg", "Admin access required.");
    return res.redirect("/auth/login");
  }
  next();
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

exports.isVerified = (req, res, next) => {
  try {
    // Check if user exists in request (assuming you have auth middleware that attaches user)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user is verified
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Account verification required to perform this action",
        error: "UNVERIFIED_ACCOUNT",
      });
    }

    // User is verified, proceed to next middleware/controller
    next();
  } catch (error) {
    console.error("Verification middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in verification check",
    });
  }
};
