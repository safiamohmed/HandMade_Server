const User = require("../model/user.model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/email.utils");
const passport = require("../config/passport.config");

const tempUsers = {};

// ================= JWT =================
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );

// ================= SIGNUP =================
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, shopName, bio } = req.body;
    if (!fullName || !email || !password)
      return res
        .status(400)
        .json({ message: "fullName, email, and password are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

    tempUsers[email] = {
      name: fullName,
      email,
      password,
      role: role || "customer",
      phone,
      shopName,
      bio,
      otp: hashedOTP,
      otpExpires: Date.now() + 10 * 60 * 1000,
    };

    await sendEmail({
      email,
      subject: "Verify your account",
      template: "otp",
      data: { name: fullName, otp },
    });
    res
      .status(201)
      .json({ message: "OTP sent to email. Please verify to complete signup" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ================= VERIFY OTP (signup only) =================
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "email and otp are required" });

    const tempUser = tempUsers[email];
    if (!tempUser)
      return res.status(400).json({ message: "No signup request found" });

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    if (tempUser.otp !== hashedOTP || tempUser.otpExpires < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.create({
      name: tempUser.name,
      email: tempUser.email,
      password: tempUser.password,
      role: tempUser.role || "customer",
      isVerified: true,
    });

    delete tempUsers[email];
    const token = signToken(user);

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "email and password are required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res
        .status(401)
        .json({ message: "Account not verified or not exist" });

    const correct = await user.correctPassword(password);
    if (!correct)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ================= GOOGLE AUTH =================
// Step 1: redirect لـ Google consent screen
exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
});

// Step 2: Google callback — بيرجع بـ user بعد الـ login
exports.googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
      );
    }

    const token = signToken(user);

    // بنبعت الـ token + user data في الـ URL للـ frontend
    // الـ frontend بياخدهم ويحفظهم في localStorage
    const params = new URLSearchParams({
      token,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params}`);
  })(req, res, next);
};

// ================= FORGET PASSWORD =================
exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email: user.email,
      subject: "Reset Password",
      template: "otp",
      data: { name: user.name, otp },
    });
    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res
        .status(400)
        .json({ message: "email, otp, and newPassword are required" });

    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    const user = await User.findOne({
      email,
      otp: hashedOTP,
      otpExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ================= RESEND OTP =================
exports.resendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose)
      return res
        .status(400)
        .json({ message: "email and purpose are required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
    let name;

    if (purpose === "signup") {
      if (!tempUsers[email])
        return res.status(400).json({ message: "No signup session found" });
      tempUsers[email].otp = hashedOTP;
      tempUsers[email].otpExpires = Date.now() + 10 * 60 * 1000;
      name = tempUsers[email].name;
    } else if (purpose === "reset") {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });
      user.otp = hashedOTP;
      user.otpExpires = Date.now() + 10 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      name = user.name;
    } else {
      return res
        .status(400)
        .json({ message: "purpose must be 'signup' or 'reset'" });
    }

    await sendEmail({
      email,
      subject: "Resend OTP",
      template: "otp",
      data: { name, otp },
    });
    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};
