const mongoose = require("mongoose");
const crypto = require("crypto");
const passportLocalMongoose = require("passport-local-mongoose");
const Wallet = require("../models/Wallet");

const userSchema = new mongoose.Schema(
  {
    // ===================== AUTHENTICATION =====================
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    // password is handled automatically by passport-local-mongoose

    // ===================== PERSONAL INFORMATION =====================
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]{10,}$/, "Please enter a valid phone number"],
    },

    // ===================== ACCOUNT STATUS =====================
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isRestricted: { type: Boolean, default: false },
    restrictionReason: { type: String, default: null },

    // ===================== WALLET =====================
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    // Purchased investment plans
    plans: [
      {
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvestmentPlan",
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    activeInvestments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Investment",
      },
    ],
    investmentHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Investment",
      },
    ],

    // ===================== SECURITY =====================
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    // ===================== PROFILE =====================
    profileImage: { type: String, default: null },
    dateOfBirth: Date,
    preferredLanguage: { type: String, default: "en" },
    timezone: { type: String, default: "UTC" },

    // ===================== TRADING PREFERENCES =====================
    tradingExperience: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      default: "beginner",
    },
    riskTolerance: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // ===================== TIMESTAMPS =====================
    lastLogin: Date,
    passwordChangedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// ================== VIRTUALS ==================
userSchema.virtual("accountStatus").get(function () {
  if (this.isRestricted) return "restricted";
  if (!this.isVerified) return "unverified";
  return "active";
});

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

//
// ================== WALLET CREATION ==================
userSchema.post("save", async function (doc, next) {
  try {
    if (!doc.wallet) {
      const wallet = await Wallet.create({ userId: doc._id });
      doc.wallet = wallet._id;
      await doc.save();
    }
    next();
  } catch (error) {
    console.error("Wallet creation error:", error);
    next(error);
  }
});

//
// ================== CUSTOM METHODS ==================
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  this.verificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

userSchema.methods.incrementLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

//
// ================== WALLET HELPERS ==================
userSchema.statics.checkWalletBalance = async function (
  userId,
  amount,
  currency = "USD"
) {
  const user = await this.findById(userId).populate("wallet");
  if (!user) throw new Error("User not found");
  if (user.isRestricted) throw new Error("Account is restricted");
  if (!user.wallet) throw new Error("Wallet not found");

  if (user.wallet[currency] < amount)
    throw new Error(`Insufficient ${currency} balance`);
  return user;
};

userSchema.statics.updateWalletBalance = async function (
  userId,
  amount,
  currency,
  type
) {
  const user = await this.findById(userId).populate("wallet");
  if (!user || !user.wallet) throw new Error("User or wallet not found");

  const wallet = user.wallet;
  if (type === "credit") wallet[currency] += amount;
  else wallet[currency] -= amount;

  await wallet.save();
  return wallet;
};

//
// ================== PASSPORT LOCAL MONGOOSE ==================
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // login with email instead of username
  errorMessages: {
    UserExistsError: "A user with that email already exists.",
  },
});

//
// ================== EXPORT MODEL ==================
module.exports = mongoose.model("User", userSchema);
