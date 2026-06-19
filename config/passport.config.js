const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/user.model");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        // لو اليوزر موجود → رجعه
        let user = await User.findOne({ email });

        if (!user) {
          // لو مش موجود → اعمله account جديد
          user = await User.create({
            name,
            email,
            // password مطلوب في الـ schema — بنحط random string لأن Google users مش بيستخدموا password
            password: Math.random().toString(36).slice(-16) + "Aa1!",
            role: "customer",
            isVerified: true, // email اتتحقق منه من Google
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// مش بنستخدم sessions — بنستخدم JWT
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
