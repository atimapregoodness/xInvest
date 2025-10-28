const passport = require("passport");
const validator = require("validator");
const User = require("../models/User");
const { sendWelcomeEmail } = require("../utils/emailService");

exports.getLogin = (req, res) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return res.redirect("/admin");
  } else if (req.isAuthenticated() && req.user) {
    return res.redirect("/dashboard");
  } else {
    res.render("auth/login", {
      title: "meziumFx - Login",
      formData: { email: "" },
    });
  }
};

exports.postLogin = async (req, res, next) => {
  try {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        req.flash("error_msg", "An error occurred during login.");
        return res.redirect("/auth/login");
      }

      if (!user) {
        req.flash("error_msg", info?.message || "Invalid email or password.");
        return res.redirect("/auth/login");
      }

      // Log the user in
      req.logIn(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          req.flash("error_msg", "Login failed. Please try again.");
          return res.redirect("/auth/login");
        }

        // ✅ Check if the user is an admin
        if (user.isAdmin) {
          return res.redirect("/admin");
        }

        // ✅ Otherwise redirect normal user
        return res.redirect("/dashboard");
      });
    })(req, res, next);
  } catch (err) {
    console.error("Login error:", err.message);
    req.flash(
      "error_msg",
      "Sorry something went wrong. Please try again later."
    );
    res.redirect("/auth/login");
  }
};

exports.getRegister = (req, res) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return res.redirect("/admin");
  } else if (req.isAuthenticated() && req.user) {
    return res.redirect("/dashboard");
  } else {
    res.render("auth/register", {
      title: "meziumFx - Sign Up",
      formData: { fullName: "", email: "", country: "", phone: "" },
    });
  }
};

exports.postRegister = async (req, res) => {
  try {
    const { fullName, email, country, phone, password, confirmPassword } =
      req.body;
    let error = null;

    if (!fullName) error = "Full Name is required.";
    else if (!email) error = "Email is required.";
    else if (!country) error = "Country is required.";
    else if (!phone) error = "Phone number is required.";
    else if (!password) error = "Password is required.";
    else if (!confirmPassword) error = "Confirm Password is required.";

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

    if (!error) {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        error = "Email is already registered. Please log in instead.";
    }

    if (error) {
      return res.render("auth/register", {
        title: "meziumFx - Sign Up",
        formData: { fullName, email, country, phone },
        error_msg: error,
      });
    }

    const newUser = new User({
      fullName,
      email,
      country,
      phone: phone,
      username: email,
    });

    await User.register(newUser, password);

    req.login(newUser, async (err) => {
      if (err) {
        console.error("Auto-login error:", err.message);
        req.flash("success_msg", "Account created! Please log in manually.");
        return res.redirect("/auth/login");
      }

      sendWelcomeEmail?.(newUser.email, newUser.fullName).catch((err) => {
        console.error("Failed to send welcome email:", err.message);
      });

      req.flash(
        "success_msg",
        "Welcome to meziumFx! Your account has been created."
      );
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    req.flash(
      "error_msg",
      "Sorry something went wrong. Please try again later."
    );
    return res.render("auth/register", {
      title: "meziumFx - Sign Up",
      formData: req.body,
      error_msg: "Sorry something went wrong. Please try again later.",
    });
  }
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err.message);
      return res.redirect("/dashboard");
    }
    req.flash("success_msg", "You have been logged out successfully.");
    res.redirect("/auth/login");
  });
};

exports.getForgotPassword = (req, res) => {
  res.render("auth/forgot-password", {
    title: "meziumFx - Forgot Password",
  });
};

exports.postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      req.flash("error_msg", "Please enter your email address.");
      return res.redirect("/auth/forgot-password");
    }

    const user = await User.findOne({ email });
    if (user) {
      console.log(`Password reset email would be sent to: ${email}`);
    }

    req.flash(
      "success_msg",
      "If an account exists, reset instructions have been sent to your email."
    );
    res.redirect("/auth/login");
  } catch (err) {
    console.error("Forgot password error:", err.message);
    req.flash(
      "error_msg",
      "Sorry something went wrong. Please try again later."
    );
    res.redirect("/auth/forgot-password");
  }
};
