const mongoose = require("mongoose");
const User = mongoose.model("edtechusers");
const Subject = mongoose.model("subjects");
const UserSubject = mongoose.model("usersubjects");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const requireLogin = require("../middleware/requireLogin");

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
        const newUser = await User.create({
          email,
          otp: newOTP,
          role: "parent"
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
            role: "parent"
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
  app.get("/api/v1/parent/subscription", requireLogin, async (req, res) => {
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
  app.post("/api/v1/parent/subscription", requireLogin, async (req, res) => {
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

  // GET PARENT CHILDREN
  app.get("/api/v1/parent/children", requireLogin, async (req, res) => {
    try {
      const parentId = req.user._id;
      
      console.log("🔍 Fetching children for parent ID:", parentId);
      console.log("🔍 Parent email:", req.user.email);
      console.log("🔍 Parent isParent:", req.user.isParent);
      
      // Ensure we're only getting children for this specific parent
      // Convert to ObjectId if needed for proper comparison
      const mongoose = require("mongoose");
      const parentObjectId = mongoose.Types.ObjectId.isValid(parentId) 
        ? new mongoose.Types.ObjectId(parentId) 
        : parentId;
      
      const children = await User.find({ 
        parentId: parentObjectId, 
        isParent: { $ne: true } 
      });

      console.log("✅ Found children:", children.length, "for parent:", parentId);
      if (children.length > 0) {
        console.log("✅ First child parentId:", children[0].parentId);
      }
      
      res.status(200).json({ 
        children: children.map(child => ({
          id: child._id,
          name: child.name,
          email: child.email,
          classno: child.classno,
          emoji: child.emoji || "🐱"
        }))
      });
    } catch (error) {
      console.error("❌ Error fetching children:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // CREATE CHILD PROFILE
  app.post("/api/v1/parent/child", requireLogin, async (req, res) => {
    try {
      const { name, classno, emoji } = req.body;
      const parentId = req.user._id;

      console.log("👶 Creating child for parent:", parentId);
      console.log("👶 Parent email:", req.user.email);
      console.log("👶 Child details:", { name, classno, emoji });

      if (!name || !classno) {
        return res.status(400).json({ message: "Name and class are required" });
      }

      const child = await User.create({
        name,
        classno,
        emoji: emoji || "🐱",
        parentId: parentId, // Explicitly set parentId
        isParent: false
      });

      console.log("✅ Child created with parentId:", child.parentId);

      const subjects = await Subject.find({ classnumber: classno });

      const userSubjects = subjects.map(subject => ({
        userId: child._id,
        subjectId: subject._id,
        locked: true
      }));

      if (userSubjects.length > 0) {
        await UserSubject.insertMany(userSubjects);
      }

      res.status(201).json({ 
        message: "Child profile created successfully",
        child: {
          id: child._id,
          name: child.name,
          classno: child.classno,
          emoji: child.emoji
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // UPDATE CHILD PROFILE
  app.put("/api/v1/parent/child/:childId", requireLogin, async (req, res) => {
    try {
      const { childId } = req.params;
      const { name, classno, emoji } = req.body;
      const parentId = req.user._id;

      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (classno) updateData.classno = classno;
      if (emoji) updateData.emoji = emoji;

      await User.updateOne({ _id: childId }, { $set: updateData });

      const updatedChild = await User.findById(childId);

      res.status(200).json({
        message: "Child profile updated successfully",
        child: {
          id: updatedChild._id,
          name: updatedChild.name,
          classno: updatedChild.classno,
          emoji: updatedChild.emoji
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE CHILD PROFILE - SEND OTP
  app.post("/api/v1/parent/child/delete-otp", requireLogin, async (req, res) => {
    try {
      const { childId } = req.body;
      const parentId = req.user._id;

      if (!childId) {
        return res.status(400).json({ message: "Child ID is required" });
      }

      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      const parent = await User.findById(parentId);
      if (!parent || !parent.email) {
        return res.status(400).json({ message: "Parent email not found" });
      }

      const digits = "0123456789";
      let newOTP = "";
      for (let i = 0; i < otpLength; i++) {
        newOTP += digits[Math.floor(Math.random() * digits.length)];
      }

      await User.updateOne({ _id: parentId }, { $set: { otp: newOTP } });

      await sendEmail({
        to: parent.email,
        subject: "Delete Profile OTP",
        text: `Your OTP to delete the profile is ${newOTP}.`,
      });

      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // DELETE CHILD PROFILE - VERIFY OTP AND DELETE
  app.delete("/api/v1/parent/child/:childId", requireLogin, async (req, res) => {
    try {
      const { childId } = req.params;
      const { otp } = req.body;
      const parentId = req.user._id;

      if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
      }

      const parent = await User.findById(parentId);
      if (!parent || parent.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      await User.findByIdAndDelete(childId);
      await UserSubject.deleteMany({ userId: childId });
      await User.updateOne({ _id: parentId }, { $set: { otp: null } });

      res.status(200).json({ message: "Child profile deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // CHECK SESSION
  app.get("/api/v1/parent/check-session", requireLogin, async (req, res) => {
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

  // PARENT REGISTRATION OTP
  app.post("/api/v1/parent/register-otp", async (req, res) => {
    try {
      const { email } = req.body;

      const digits = "0123456789";
      let newOTP = "";
      for (let i = 0; i < otpLength; i++) {
        newOTP += digits[Math.floor(Math.random() * digits.length)];
      }

      const user = await User.findOne({ email });

      if (user) {
        await User.updateOne({ email }, { $set: { otp: newOTP } });
      } else {
        await User.create({
          email,
          otp: newOTP,
          isParent: false
        });
      }
        
      await sendEmail({
        to: email,
        subject: "Parent Registration OTP",
        text: `Your OTP to create your parent account is ${newOTP}.`,
      });

      res.status(200).json({ message: "OTP Sent Successfully" });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });

  // PARENT REGISTRATION
  app.post("/api/v1/parent/register", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const user = await User.findOne({ email });

      if (user && user.otp === otp) {
        if (!user.isParent) {
          await User.updateOne({ email }, { $set: { isParent: true } });
        }

        const payload = {
          id: user._id,
          email: user.email,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(200).json({ 
          message: "Parent account created successfully", 
          token,
          user: {
            id: user._id,
            email: user.email,
            isParent: true
          }
        });
      } else if (!user) {
        const newParent = await User.create({
          email,
          isParent: true,
          otp: null
        });

        const payload = {
          id: newParent._id,
          email: newParent.email,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(201).json({ 
          message: "Parent account created successfully", 
          token,
          user: {
            id: newParent._id,
            email: newParent.email,
            isParent: true
          }
        });
      } else {
        res.status(400).json({ message: "Invalid OTP. Please try again." });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ACADEMIC REPORT
  app.get("/api/v1/parent/academic-report", requireLogin, async (req, res) => {
    try {
      const parentId = req.user._id;
      const { childId } = req.query;
      const Progress = mongoose.model("progress");
      const QuizScore = mongoose.model("quizscores");
      const Chapter = mongoose.model("chapters");
      const Subject = mongoose.model("subjects");
      const Attempt = mongoose.model("attempts");

      let children;
      if (childId) {
        const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
        children = child ? [child] : [];
      } else {
        children = await User.find({ parentId, isParent: { $ne: true } });
      }

      const reports = await Promise.all(
        children.map(async (child) => {
          const subjects = await Subject.find({ classnumber: child.classno });

          let totalQuizzes = 0;
          let totalCompletedCourses = 0;
          let totalScoreSum = 0;
          let totalMarksSum = 0;
          let totalAttempts = 0;

          const subjectReports = await Promise.all(
            subjects.map(async (subject) => {
              const chapters = await Chapter.find({ subjectId: subject._id });

              let subjectQuizCount = 0;
              let subjectCompletedCourses = 0;
              let subjectScoreSum = 0;
              let subjectTotalMarksSum = 0;

              const chapterProgress = await Promise.all(
                chapters.map(async (chapter) => {
                  const progress = await Progress.findOne({
                    userId: child._id,
                    chapterId: chapter._id,
                    completed: true
                  });

                  const quizScore = await QuizScore.findOne({
                    childId: child._id,
                    chapterId: chapter._id
                  }).sort({ createdAt: -1 }).lean();

                  if (progress) {
                    subjectCompletedCourses++;
                  }

                  if (quizScore) {
                    subjectQuizCount++;
                    subjectScoreSum += quizScore.score || 0;
                    subjectTotalMarksSum += quizScore.totalMarks || 0;
                  }

                  return {
                    chapterId: chapter._id,
                    chapterName: chapter.name,
                    completed: !!progress,
                    quizScore: quizScore ? quizScore.score : null,
                    totalMarks: quizScore ? quizScore.totalMarks : null,
                    percentage: quizScore ? quizScore.percentage : null
                  };
                })
              );

              totalQuizzes += subjectQuizCount;
              totalCompletedCourses += subjectCompletedCourses;
              totalScoreSum += subjectScoreSum;
              totalMarksSum += subjectTotalMarksSum;

              const completedChapters = chapterProgress.filter(cp => cp.completed).length;
              const totalChapters = chapters.length;
              const completionPercentage = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

              const avgScore = subjectTotalMarksSum > 0 
                ? Math.round((subjectScoreSum / subjectTotalMarksSum) * 100) 
                : 0;

              return {
                subjectId: subject._id,
                subjectName: subject.name,
                totalChapters,
                completedChapters,
                completionPercentage: Math.round(completionPercentage),
                quizCount: subjectQuizCount,
                avgScore,
                totalScore: subjectScoreSum,
                totalMarks: subjectTotalMarksSum,
                chapters: chapterProgress
              };
            })
          );

          const attempts = await Attempt.find({ childId: child._id });
          totalAttempts = attempts.length;

          const overallAvgScore = totalMarksSum > 0 
            ? Math.round((totalScoreSum / totalMarksSum) * 100) 
            : 0;

          return {
            childId: child._id,
            childName: child.name,
            classno: child.classno,
            emoji: child.emoji,
            summary: {
              totalQuizzes,
              completedCourses: totalCompletedCourses,
              avgScore: overallAvgScore,
              totalAttempts
            },
            subjects: subjectReports
          };
        })
      );

      res.status(200).json({ reports });
    } catch (error) {
      res.status(500).json({ message: error.message });
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
