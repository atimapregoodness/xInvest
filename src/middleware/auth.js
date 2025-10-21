exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }

  req.flash("error_msg", "You must be logged in to access this page.");
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
