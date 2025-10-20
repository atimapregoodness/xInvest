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
    formData: { email: "" },
  });
};

// --------------------
// POST: Handle Login (Passport Middleware)
// --------------------
exports.postLogin = (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/auth/login",
    failureFlash: true,
  })(req, res, next);
};

// --------------------
// GET: Register Page
// --------------------
exports.getRegister = (req, res) => {
  res.render("auth/register", {
    title: "xInvest - Sign Up",
    formData: { fullName: "", email: "", country: "", phone: "" },
  });
};

// --------------------
// POST: Register New User
// --------------------
exports.postRegister = async (req, res) => {
  try {
    const { fullName, email, country, phone, password, confirmPassword } =
      req.body;
    let error = null;

    // REQUIRED FIELDS
    if (!fullName) error = "Full Name is required.";
    else if (!email) error = "Email is required.";
    else if (!country) error = "Country is required.";
    else if (!phone) error = "Phone number is required.";
    else if (!password) error = "Password is required.";
    else if (!confirmPassword) error = "Confirm Password is required.";

    // VALIDATION
    if (!error && !validator.isEmail(email))
      error = "Please enter a valid email address.";
    if (
      !error &&
      !validator.isStrongPassword(password, {
        minLength: 8,
        minNumbers: 1,
        minLowercase: 1,
        minUppercase: 0,
        minSymbols: 0,
      })
    )
      error =
        "Password must be at least 8 characters and include letters and numbers.";
    if (!error && password !== confirmPassword)
      error = "Passwords do not match.";
    if (!error && !validator.isMobilePhone(phone, "any"))
      error = "Please enter a valid phone number.";

    // CHECK EXISTING USER
    if (!error) {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        error =
          "Email is already registered. Please login or use another email.";
    }

    // SHOW FIRST ERROR
    if (error) {
      return res.render("auth/register", {
        title: "xInvest - Sign Up",
        formData: { fullName, email, country, phone },
        error_msg: error,
      });
    }

    // CREATE NEW USER
    const newUser = new User({
      fullName,
      email,
      country,
      phone: phone, // Use phone from form
    });

    await User.register(newUser, password);

    // AUTO-LOGIN
    req.login(newUser, (err) => {
      if (err) {
        console.error("Auto-login error:", err);
        req.flash("success_msg", "Account created! Please log in manually.");
        return res.redirect("/auth/login");
      }

      sendWelcomeEmail?.(newUser.email, newUser.fullName).catch(() => {});

      req.flash(
        "success_msg",
        "Welcome to xInvest! Your account has been created."
      );
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error("Registration error:", err);
    req.flash(
      "error_msg",
      "An unexpected error occurred. Please try again later."
    );
    return res.redirect("/auth/register");
  }
};

// --------------------
// GET: Logout
// --------------------
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect("/dashboard");
    }
    req.flash("success_msg", "You have been logged out successfully.");
    res.redirect("/auth/login");
  });
};

// --------------------
// GET: Forgot Password
// --------------------
exports.getForgotPassword = (req, res) => {
  res.render("auth/forgot-password", { title: "xInvest - Forgot Password" });
};

// --------------------
// POST: Forgot Password
// --------------------
exports.postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      req.flash("error_msg", "Please enter your email address.");
      return res.redirect("/auth/forgot-password");
    }

    const user = await User.findOne({ email });
    if (user) {
      // TODO: Send reset email
      console.log(`Reset email sent to: ${email}`);
    }

    req.flash(
      "success_msg",
      "If an account exists, reset instructions have been sent to your email."
    );
    return res.redirect("/auth/login");
  } catch (err) {
    console.error("Forgot password error:", err);
    req.flash("error_msg", "Error processing request. Please try again later.");
    return res.redirect("/auth/forgot-password");
  }
};
