const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscores",
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 8,
    },
    googleId: String,
    profile: {
      firstName: String,
      lastName: String,
      avatar: {
        url: String,
        cloudinaryId: String,
      },
      phone: String,
      country: String,
      dateOfBirth: Date,
      bio: { type: String, maxlength: 500 },
    },
    verification: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      identity: { type: Boolean, default: false },
      twoFactor: {
        enabled: { type: Boolean, default: false },
        secret: String,
      },
    },
    wallet: {
      balance: { type: Number, default: 0 },
      BTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      USDT: { type: Number, default: 0 },
    },
    trading: {
      level: {
        type: String,
        default: "beginner",
        enum: ["beginner", "intermediate", "advanced", "expert"],
      },
      totalTrades: { type: Number, default: 0 },
      successfulTrades: { type: Number, default: 0 },
      profitLoss: { type: Number, default: 0 },
      riskTolerance: {
        type: String,
        default: "medium",
        enum: ["low", "medium", "high"],
      },
    },
    security: {
      lastLogin: Date,
      loginAttempts: { type: Number, default: 0 },
      lockUntil: Date,
      ipWhitelist: [String],
      activityLog: [
        {
          action: String,
          ip: String,
          userAgent: String,
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        priceAlerts: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
      },
      theme: { type: String, default: "dark", enum: ["dark", "light"] },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
    },
    referral: {
      code: { type: String, unique: true },
      referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      earned: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "suspended", "banned"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ "referral.code": 1 });
userSchema.index({ status: 1 });

// Pre-save middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // Generate referral code if not exists
  if (!this.referral.code) {
    this.referral.code = this._id.toString().slice(-8).toUpperCase();
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Instance methods
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.isLocked = function () {
  return !!(this.security.lockUntil && this.security.lockUntil > Date.now());
};

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

userSchema.methods.logActivity = function (action, ip, userAgent) {
  this.security.activityLog.push({
    action,
    ip,
    userAgent,
    timestamp: new Date(),
  });

  // Keep only last 50 activities
  if (this.security.activityLog.length > 50) {
    this.security.activityLog = this.security.activityLog.slice(-50);
  }

  return this.save();
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByReferralCode = function (code) {
  return this.findOne({ "referral.code": code });
};

module.exports = mongoose.model("User", userSchema);
