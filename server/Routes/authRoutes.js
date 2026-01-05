const mongoose = require("mongoose");
const User = mongoose.model("edtechusers");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const requireLogin = require("../middleware/requireLogin");
const requireParent = require("../middleware/requireParent");

const otpLength = 6;

module.exports = (app) => {
  // PARENT LOGIN - Generate & Send OTP (auto-creates user if doesn't exist)
    app.post("/api/v1/parent/login", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const digits = "0123456789";
      let newOTP = "";
      for (let i = 0; i < otpLength; i++) {
        newOTP += digits[Math.floor(Math.random() * digits.length)];
      }

      let user = await User.findOne({ email });

      if (user) {
        await User.updateOne({ email }, { $set: { otp: newOTP } });
        await sendEmail({
          to: email,
          subject: "Parent Login OTP",
          text: `Your OTP to login as a parent is ${newOTP}.`,
        });
        res.status(200).json({ 
          message: "OTP Sent Successfully",
          isNewUser: false 
        });
      } else {
        // Auto-create user for new registration
        const newUser = await User.create({
          email,
          otp: newOTP,
          role: "parent",
          isParent: false // Will be set to true after OTP verification
        });
        
        await sendEmail({
          to: email,
          subject: "Welcome to Study.Pilot - Your OTP",
          text: `Welcome to Study.Pilot! Your OTP to complete registration is ${newOTP}.`,
        });
        
        res.status(200).json({ 
          message: "Account created! OTP Sent Successfully",
          isNewUser: true 
        });
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // VERIFY PARENT - Verify OTP and return token
    app.post("/api/v1/verify/parent", async (req, res) => {
    try {
      const { email, otp } = req.body;

      const user = await User.findOne({ email });

      if (user && user.otp === otp) {
        // Set isParent to true if not already set (for new registrations)
        if (!user.isParent) {
          await User.updateOne({ email }, { $set: { isParent: true } });
          user.isParent = true;
        }

        const payload = {
          id: user._id,
          email: user.email,
          role: user.role || "parent",
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(200).json({ 
          message: "Parent Login Success", 
          token,
          user: {
            id: user._id,
            email: user.email,
            role: "parent",
            isParent: true
          }
        });
      } else if (!user) {
        res.status(400).json({ message: "User not found" });
      } else {
        res.status(400).json({ message: "Invalid OTP" });
      }
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // CHECK USER EXISTS
  app.post("/api/v1/user/check", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await User.findOne({ email });

      if (user) {
        return res.status(200).json({ message: "User exists", exists: true });
      } else {
        return res.status(404).json({ message: "User not found", exists: false });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET CURRENT USER INFO
  app.get("/api/v1/me", requireLogin, async (req, res) => {
    try {
      res.status(200).json({
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role || (req.user.isParent ? "parent" : "student"),
        isParent: req.user.isParent
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // CHECK SESSION
  app.get("/api/v1/parent/check-session", requireParent, async (req, res) => {
    try {
      const parent = await User.findById(req.user._id);
      if (!parent) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const lastActivity = parent.lastActivityTime || parent.createdAt || now;
      const timeDiff = (now - lastActivity) / 1000 / 60 / 60 / 24;

      await User.updateOne({ _id: req.user._id }, { $set: { lastActivityTime: now } });

      const requiresOtp = timeDiff > 7;

      res.status(200).json({
        requiresOtp,
        lastActivity: lastActivity,
        timeDiffDays: timeDiff
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};
