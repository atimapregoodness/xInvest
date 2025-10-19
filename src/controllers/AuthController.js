const passport = require("passport");
const User = require("../models/User");
const crypto = require("crypto");

exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect("/dashboard");
  }
  res.render("auth/login", {
    title: "Login to Your Account",
    csrfToken: req.csrfToken(),
  });
};

exports.postLogin = (req, res, next) => {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password cannot be blank").notEmpty();

  const errors = req.validationErrors();
  if (errors) {
    req.flash("error_msg", errors[0].msg);
    return res.redirect("/auth/login");
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Auth error:", err);
      return next(err);
    }

    if (!user) {
      req.flash("error_msg", info.message || "Invalid email or password");
      return res.redirect("/auth/login");
    }

    if (user.status !== "active") {
      req.flash(
        "error_msg",
        "Your account has been suspended. Please contact support."
      );
      return res.redirect("/auth/login");
    }

    req.logIn(user, async (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      // Log login activity
      await user.logActivity("login", req.ip, req.get("User-Agent"));

      req.flash("success_msg", `Welcome back, ${user.username}!`);

      // Redirect to intended page or dashboard
      const redirectTo = req.session.returnTo || "/dashboard";
      delete req.session.returnTo;
      res.redirect(redirectTo);
    });
  })(req, res, next);
};

exports.getRegister = (req, res) => {
  if (req.user) {
    return res.redirect("/dashboard");
  }
  res.render("auth/register", {
    title: "Create New Account",
    csrfToken: req.csrfToken(),
  });
};

exports.postRegister = async (req, res) => {
  try {
    req.assert("email", "Email is not valid").isEmail();
    req
      .assert("password", "Password must be at least 8 characters long")
      .len(8);
    req
      .assert("confirmPassword", "Passwords do not match")
      .equals(req.body.password);
    req
      .assert(
        "username",
        "Username must be 3-30 characters and contain only letters, numbers, and underscores"
      )
      .matches(/^[a-zA-Z0-9_]{3,30}$/);

    const errors = req.validationErrors();
    if (errors) {
      errors.forEach((error) => req.flash("error_msg", error.msg));
      return res.redirect("/auth/register");
    }

    const { username, email, password, referralCode } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      req.flash("error_msg", "User with this email or username already exists");
      return res.redirect("/auth/register");
    }

    // Handle referral
    let referredBy = null;
    if (referralCode) {
      referredBy = await User.findOne({ "referral.code": referralCode });
      if (!referredBy) {
        req.flash("error_msg", "Invalid referral code");
        return res.redirect("/auth/register");
      }
    }

    // Create user
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password,
      verification: {
        email: false, // Will require email verification
      },
    });

    if (referredBy) {
      newUser.referral.referredBy = referredBy._id;
      // Add referral bonus logic here
    }

    await newUser.save();

    // Log registration activity
    await newUser.logActivity("registration", req.ip, req.get("User-Agent"));

    req.flash(
      "success_msg",
      "Account created successfully! Please check your email to verify your account."
    );
    res.redirect("/auth/login");
  } catch (error) {
    console.error("Registration error:", error);
    req.flash("error_msg", "Error creating account. Please try again.");
    res.redirect("/auth/register");
  }
};

exports.getLogout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    req.flash("success_msg", "You have been logged out successfully.");
    res.redirect("/");
  });
};

// Google OAuth
exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      console.error("Google auth error:", err);
      return next(err);
    }

    if (!user) {
      req.flash("error_msg", "Google authentication failed");
      return res.redirect("/auth/login");
    }

    req.logIn(user, async (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      await user.logActivity("google_login", req.ip, req.get("User-Agent"));
      req.flash("success_msg", `Welcome back, ${user.username}!`);
      res.redirect("/dashboard");
    });
  })(req, res, next);
};

// Password reset functionality
exports.getForgotPassword = (req, res) => {
  res.render("auth/forgot-password", {
    title: "Reset Your Password",
    csrfToken: req.csrfToken(),
  });
};

exports.postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      req.flash(
        "success_msg",
        "If an account with that email exists, a reset link has been sent."
      );
      return res.redirect("/auth/forgot-password");
    }

    // Generate reset token (simplified - in production, use proper token generation and email)
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // In production: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);

    req.flash(
      "success_msg",
      "Password reset instructions have been sent to your email."
    );
    res.redirect("/auth/login");
  } catch (error) {
    console.error("Forgot password error:", error);
    req.flash("error_msg", "Error processing request");
    res.redirect("/auth/forgot-password");
  }
};
