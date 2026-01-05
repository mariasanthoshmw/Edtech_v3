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

  // GET SUBSCRIPTION STATUS
  app.get("/api/v1/parent/subscription", requireParent, async (req, res) => {
    try {
      const parent = await User.findById(req.user._id);
      if (!parent || !parent.isParent) {
        return res.status(403).json({ message: "Parent access only" });
      }

      res.status(200).json({
        status: parent.subscriptionStatus || 'trial',
        type: parent.subscriptionType || null,
        startDate: parent.subscriptionStartDate || null,
        endDate: parent.subscriptionEndDate || null
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // CREATE SUBSCRIPTION
  app.post("/api/v1/parent/subscription", requireParent, async (req, res) => {
    try {
      const { type } = req.body;
      const parent = await User.findById(req.user._id);

      if (!parent || !parent.isParent) {
        return res.status(403).json({ message: "Parent access only" });
      }

      if (!['monthly', 'yearly'].includes(type)) {
        return res.status(400).json({ message: "Invalid subscription type" });
      }

      const now = new Date();
      const endDate = new Date();
      
      if (type === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      await User.updateOne(
        { _id: req.user._id },
        {
          $set: {
            subscriptionStatus: 'active',
            subscriptionType: type,
            subscriptionStartDate: now,
            subscriptionEndDate: endDate
          }
        }
      );

      const children = await User.find({ parentId: req.user._id, isParent: { $ne: true } });

      for (const child of children) {
        const subjects = await Subject.find({ classnumber: child.classno });
        
        for (const subject of subjects) {
          let userSubject = await UserSubject.findOne({ userId: child._id, subjectId: subject._id });
          
          if (!userSubject) {
            await UserSubject.create({
              userId: child._id,
              subjectId: subject._id,
              locked: false
            });
          } else {
            userSubject.locked = false;
            await userSubject.save();
          }
        }
      }

      res.status(200).json({
        message: "Subscription activated successfully",
        subscription: {
          status: 'active',
          type,
          startDate: now,
          endDate
        }
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

  // STUDENT LOGIN
  app.post("/api/v1/student/login", async (req, res) => {
    try {
      const { name, password } = req.body;

      if (!name || !password) {
        return res.status(400).json({ message: "Name and password are required" });
      }

      const user = await User.findOne({ name });

      if (!user) {
        return res.status(401).json({ message: "User not found. Please create an account first." });
      }

      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid password. Please try again." });
      }

      const payload = {
        id: user._id,
        name: user.name,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });

      res.status(200).json({ message: "Student Login Success", token });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // LEADERBOARD
  app.get("/api/v1/leaderboard", async (req, res) => {
    try {
      const Leaderboard = mongoose.model("leaderboards");
      const { userId } = req.query;

      const top5 = await Leaderboard.find()
        .sort({ totalPoints: -1 })
        .limit(5)
        .lean();

      let userPosition = null;
      if (userId) {
        const userScore = await Leaderboard.findOne({ childId: userId }).lean();
        if (userScore) {
          const usersAbove = await Leaderboard.countDocuments({
            totalPoints: { $gt: userScore.totalPoints }
          });
          const user = await User.findById(userId).select("name emoji").lean();
          userPosition = {
            rank: usersAbove + 1,
            score: userScore.totalPoints,
            user: user
          };
        }
      }

      const top5WithUsers = await Promise.all(
        top5.map(async (entry, index) => {
          const user = await User.findById(entry.childId).select("name emoji").lean();
          return {
            rank: index + 1,
            name: user?.name || "Unknown",
            emoji: user?.emoji || "👤",
            score: entry.totalPoints
          };
        })
      );

      res.status(200).json({
        top5: top5WithUsers,
        userPosition
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};
