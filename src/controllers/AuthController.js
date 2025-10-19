const passport = require("passport");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const validator = require("validator");
const User = require("../models/User");
const { sendWelcomeEmail } = require("../utils/emailService");

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later",
    type: "rate_limit_exceeded",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many requests from this IP, please try again in an hour",
    type: "strict_rate_limit",
  },
});

// Get login page
exports.getLogin = (req, res) => {
  res.render("auth/login", {
    title: "xInvest - Login",
    csrfToken: req.csrfToken ? req.csrfToken() : "",
  });
};

// Handle login
exports.postLogin = [
  authLimiter,
  csrfProtection,
  (req, res, next) => {
    try {
      const { email, password, rememberMe } = req.body;

      // Basic validation
      if (!email || !password) {
        req.flash("error_msg", "Email and password are required");
        return res.redirect("/auth/login");
      }

      // Use passport for authentication
      passport.authenticate("local-login", (err, user, info) => {
        if (err) {
          console.error("Login authentication error:", err);
          req.flash("error_msg", "Internal server error during authentication");
          return res.redirect("/auth/login");
        }

        if (!user) {
          req.flash("error_msg", info.message || "Invalid email or password");
          return res.redirect("/auth/login");
        }

        // Log in the user
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Session creation error:", loginErr);
            req.flash(
              "error_msg",
              "Internal server error during session creation"
            );
            return res.redirect("/auth/login");
          }

          // Add login history
          user.security.activityLog.push({
            action: "login",
            ip: req.ip,
            userAgent: req.get("User-Agent"),
            timestamp: new Date(),
          });

          // Limit login history to last 50 activities
          if (user.security.activityLog.length > 50) {
            user.security.activityLog = user.security.activityLog.slice(-50);
          }

          user.save().catch(console.error);

          // Set session duration based on remember me
          if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          } else {
            req.session.cookie.expires = false; // Session cookie
          }

          // Log successful login
          console.log(`Successful login: ${user.email} from IP: ${req.ip}`);

          req.flash("success_msg", "Login successful!");
          res.redirect("/dashboard");
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login endpoint error:", error);
      req.flash("error_msg", "Internal server error");
      res.redirect("/auth/login");
    }
  },
];

// Get register page
exports.getRegister = (req, res) => {
  res.render("auth/register", {
    title: "xInvest - Sign Up",
    csrfToken: req.csrfToken ? req.csrfToken() : "",
  });
};

// Handle registration
exports.postRegister = [
  strictAuthLimiter,
  csrfProtection,
  async (req, res, next) => {
    try {
      const { fullname, email, phone, password, confirmPassword } = req.body;

      // Check for missing fields
      if (!fullname || !email || !phone || !password || !confirmPassword) {
        req.flash("error_msg", "All fields are required");
        return res.redirect("/auth/register");
      }

      // Use passport for registration
      passport.authenticate("local-register", (err, user, info) => {
        if (err) {
          console.error("Registration error:", err);
          req.flash("error_msg", "Internal server error during registration");
          return res.redirect("/auth/register");
        }

        if (!user) {
          req.flash("error_msg", info.message || "Registration failed");
          return res.redirect("/auth/register");
        }

        // Log in the user automatically after registration
        req.login(user, async (loginErr) => {
          if (loginErr) {
            console.error("Auto-login error:", loginErr);
            req.flash(
              "error_msg",
              "Registration successful but automatic login failed"
            );
            return res.redirect("/auth/register");
          }

          try {
            // Send welcome email (optional, in background)
            sendWelcomeEmail(user.email, user.profile.firstName).catch(
              console.error
            );

            // Log registration success
            console.log(
              `Successful registration: ${user.email} from IP: ${req.ip}`
            );

            req.flash(
              "success_msg",
              "Registration successful! Welcome to xInvest."
            );
            res.redirect("/dashboard");
          } catch (error) {
            console.error("Post-registration processing error:", error);
            req.flash("success_msg", "Registration successful!");
            res.redirect("/dashboard");
          }
        });
      })(req, res, next);
    } catch (error) {
      console.error("Registration endpoint error:", error);
      req.flash("error_msg", "Internal server error");
      res.redirect("/auth/register");
    }
  },
];

// Handle logout
exports.getLogout = (req, res) => {
  try {
    const userEmail = req.user ? req.user.email : "Unknown";

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        req.flash("error_msg", "Error during logout");
        return res.redirect("/");
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
        }

        // Clear session cookie
        res.clearCookie("connect.sid");

        console.log(`User logged out: ${userEmail}`);

        req.flash("success_msg", "Logout successful");
        res.redirect("/");
      });
    });
  } catch (error) {
    console.error("Logout endpoint error:", error);
    req.flash("error_msg", "Internal server error during logout");
    res.redirect("/");
  }
};

// Get forgot password page
exports.getForgotPassword = (req, res) => {
  res.render("auth/forgot-password", {
    title: "xInvest - Forgot Password",
    csrfToken: req.csrfToken ? req.csrfToken() : "",
  });
};

// Handle forgot password
exports.postForgotPassword = [
  authLimiter,
  csrfProtection,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        req.flash("error_msg", "Please provide your email address");
        return res.redirect("/auth/forgot-password");
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Don't reveal whether email exists for security
        req.flash(
          "success_msg",
          "If an account with that email exists, a password reset link has been sent."
        );
        return res.redirect("/auth/login");
      }

      // Generate reset token (you'll need to add this to your User model)
      // const resetToken = user.createPasswordResetToken();
      // await user.save();

      // Send reset email (implement this in emailService)
      // await sendPasswordResetEmail(user.email, resetToken);

      req.flash(
        "success_msg",
        "If an account with that email exists, a password reset link has been sent."
      );
      res.redirect("/auth/login");
    } catch (error) {
      console.error("Forgot password error:", error);
      req.flash("error_msg", "Error processing your request");
      res.redirect("/auth/forgot-password");
    }
  },
];

// Additional API endpoints (if needed)
exports.getCsrfToken = [
  csrfProtection,
  (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  },
];

exports.getAuthStatus = (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        profile: req.user.profile,
      },
    });
  } else {
    res.json({
      authenticated: false,
    });
  }
};

// Export rate limiters for use in routes if needed
exports.authLimiter = authLimiter;
exports.strictAuthLimiter = strictAuthLimiter;
exports.csrfProtection = csrfProtection;
