exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }

  // Store the intended URL for redirect after login
  req.session.returnTo = req.originalUrl;
  req.flash("error_msg", "Please log in to access this page");
  res.redirect("/auth/login");
};

exports.ensureVerified = (req, res, next) => {
  if (req.isAuthenticated() && req.user.verification.email) {
    return next();
  }

  req.flash("error_msg", "Please verify your email to access this feature");
  res.redirect("/dashboard/profile");
};

exports.forwardAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/dashboard");
};
