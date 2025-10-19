const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
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

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-()\s]*$/, "Invalid phone number"],
    },

    country: {
      type: String,
      trim: true,
    },

    wallet: {
      balance: { type: Number, default: 0 },
      BTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      USDT: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// passport-local-mongoose plugin
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // login with email
  errorMessages: {
    MissingPasswordError: "No password was given.",
    IncorrectPasswordError: "Incorrect password or email.",
    IncorrectUsernameError: "Incorrect password or email.",
    MissingUsernameError: "No email was given.",
    UserExistsError: "A user with that email already exists.",
  },
});

module.exports = mongoose.model("User", userSchema);
