const passport = require("passport");
const validator = require("validator");
const User = require("../models/User");
const { sendWelcomeEmail } = require("../utils/emailService");

// --------------------
// GET: Login Page
// --------------------
exports.getLogin = (req, res) => {
  res.render("auth/login", {
    title: "xInvest - Login",
  });
};

// --------------------
// POST: Handle Login
// --------------------
exports.postLogin = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/auth/login");
    }

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        req.flash("error_msg", "Something went wrong during login");
        return res.redirect("/auth/login");
      }

      if (!user) {
        req.flash("error_msg", info?.message || "Invalid credentials");
        return res.redirect("/auth/login");
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session creation error:", loginErr);
          req.flash("error_msg", "Failed to create session");
          return res.redirect("/auth/login");
        }

        // Record login timestamp
        user.lastLogin = new Date();
        user.save().catch(console.error);

        // Remember me
        if (rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
          req.session.cookie.expires = false; // session-only
        }

        console.log(`✅ Login success: ${user.email} (${req.ip})`);
        req.flash("success_msg", "Login successful!");
        return res.redirect("/dashboard");
      });
    })(req, res, next);
  } catch (err) {
    console.error("Login endpoint error:", err);
    req.flash("error_msg", "Internal server error");
    return res.redirect("/auth/login");
  }
};

// --------------------
// GET: Register Page
// --------------------
exports.getRegister = (req, res) => {
  res.render("auth/register", {
    title: "xInvest - Sign Up",
  });
};

// --------------------
// POST: Register New User
// --------------------
exports.postRegister = async (req, res) => {
  try {
    const { fullName, email, country, phone, password, confirmPassword } =
      req.body;

    // Validate all fields
    if (
      !fullName ||
      !email ||
      !country ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      req.flash("error_msg", "All fields are required");
      return res.redirect("/auth/register");
    }

    if (password !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/auth/register");
    }

    if (!validator.isEmail(email)) {
      req.flash("error_msg", "Invalid email address");
      return res.redirect("/auth/register");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error_msg", "User already exists with this email");
      return res.redirect("/auth/register");
    }

    // Create new user
    const newUser = new User({
      fullName,
      email,
      country,
      phone,
      username: email, // required by passport-local-mongoose
    });

    await User.register(newUser, password);

    // Auto-login after registration
    req.login(newUser, (err) => {
      if (err) {
        console.error("Auto-login error:", err);
        req.flash("success_msg", "Account created! Please log in manually.");
        return res.redirect("/auth/login");
      }

      // Optional: send welcome email
      sendWelcomeEmail?.(newUser.email, newUser.fullName).catch(() => {});

      console.log(`✅ Registration success: ${newUser.email}`);
      req.flash("success_msg", "Welcome to xInvest!");
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error("Registration error:", err);
    req.flash("error_msg", "Something went wrong during registration");
    return res.redirect("/auth/register");
  }
};

exports.getLogout = (req, res) => {
  try {
    const email = req.user ? req.user.email : "Unknown";

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        req.flash("error_msg", "Error during logout");
        return res.redirect("/dashboard");
      }

      // Set flash message **before destroying session**
      req.flash("success_msg", "You have been logged out");

      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        console.log(`🚪 Logged out: ${email}`);
        res.redirect("/"); // redirect after flash is set
      });
    });
  } catch (err) {
    console.error("Logout endpoint error:", err);
    res.redirect("/"); // no flash here, session might not exist
  }
};

// --------------------
// GET: Forgot Password
// --------------------
exports.getForgotPassword = (req, res) => {
  res.render("auth/forgot-password", {
    title: "xInvest - Forgot Password",
  });
};

// --------------------
// POST: Forgot Password
// --------------------
exports.postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      req.flash("error_msg", "Please enter your email");
      return res.redirect("/auth/forgot-password");
    }

    const user = await User.findOne({ email });
    if (!user) {
      req.flash(
        "success_msg",
        "If an account exists, reset instructions were sent."
      );
      return res.redirect("/auth/login");
    }

    // TODO: implement OTP or reset token system
    req.flash(
      "success_msg",
      "If an account exists, reset instructions have been sent."
    );
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Forgot password error:", err);
    req.flash("error_msg", "Error processing request");
    return res.redirect("/auth/forgot-password");
  }
};
