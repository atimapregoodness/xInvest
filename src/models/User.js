const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full Name is required"],
      trim: true,
      maxlength: [100, "Full Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true, // ✅ ADDED: Prevent duplicate phones
      trim: true,
      // ✅ FIXED: Accept international format (+1234567890)
      match: [
        /^[\+]?[1-9][\d]{0,15}$/,
        "Phone number must be valid international format (e.g., +12025550123)",
      ],
    },

    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
      maxlength: 50,
    },

    wallet: {
      balance: { type: Number, default: 0 },
      BTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      USDT: { type: Number, default: 0 },
    },

    // ✅ ADDED: Track user activity
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // ✅ FIXED: Remove username from indexes (passport handles it)
  }
);

// ✅ FIXED: Passport configuration
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  usernameLowercase: true, // ✅ ADDED: Force lowercase email
  hashField: "hash", // ✅ ADDED: Explicit field names
  saltField: "salt",

  // ✅ FIXED: Custom error messages
  errorMessages: {
    MissingPasswordError: "Password is required.",
    AttemptTooSoonError: "Too many failed login attempts. Try again later.",
    TooManyAttemptsError:
      "Account locked temporarily due to multiple failed attempts.",
    NoSaltValueStoredError: "Authentication not possible.",
    IncorrectPasswordError: "Incorrect password.",
    IncorrectUsernameError: "Email not found.",
    MissingUsernameError: "Email is required.",
    UserExistsError: "Email already registered.",
  },
});

// ✅ ADDED: Pre-save hook to ensure phone format
userSchema.pre("save", function (next) {
  if (this.phone && !this.phone.startsWith("+")) {
    // Add + if missing (handled in frontend, but backup)
    this.phone = "+" + this.phone;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
