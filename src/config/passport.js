const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await User.findOne({
          $or: [{ email: email.toLowerCase() }, { username: email }],
        });

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Check if account is locked
        if (user.security.isLocked()) {
          return done(null, false, {
            message: "Account temporarily locked. Try again later.",
          });
        }

        // Verify password
        const isMatch = await user.correctPassword(password, user.password);
        if (!isMatch) {
          // Increment login attempts
          user.security.loginAttempts += 1;
          if (user.security.loginAttempts >= 5) {
            user.security.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
          }
          await user.save();
          return done(null, false, { message: "Invalid email or password" });
        }

        // Reset login attempts on successful login
        user.security.loginAttempts = 0;
        user.security.lockUntil = undefined;
        user.security.lastLogin = new Date();
        await user.save();

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if email exists but without Google auth
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          username:
            profile.displayName.replace(/\s+/g, "").toLowerCase() +
            Math.floor(Math.random() * 1000),
          profile: {
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            avatar: profile.photos[0].value,
          },
          verification: {
            email: true,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
