const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/User");

// Configure Passport
passport.use(
  new LocalStrategy(
    { usernameField: "email" }, // login using email
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Use passport-local-mongoose's built-in authentication
        user.authenticate(password, (err, userAuth, passwordErr) => {
          if (err) return done(err);
          if (passwordErr)
            return done(null, false, { message: passwordErr.message });

          return done(null, userAuth);
        });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize/Deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
