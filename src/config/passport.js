const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/User");

// Configure Passport to use email instead of username
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // tells passport to look for "email" instead of "username"
      passwordField: "password", // explicitly define password field (optional)
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Authenticate using passport-local-mongoose's built-in method
        user.authenticate(password, (err, userAuth, passwordErr) => {
          if (err) return done(err);

          if (!userAuth) {
            return done(null, false, {
              message: passwordErr?.message || "Invalid password",
            });
          }

          return done(null, userAuth);
        });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
