const mongoose = require("mongoose");
const User = mongoose.model("edtechusers");
const Subject = mongoose.model("subjects");
const UserSubject = mongoose.model("usersubjects");
const jwt = require("jsonwebtoken"); // npm i jsonwebtoken
const sendEmail = require("../utils/sendEmail");

const requireLogin = require("../middleware/requireLogin");

const otpLength = 6;

module.exports = (app) => {

    // Add New User
  app.post("/api/v1/user/add", async (req, res) => {
    const { name, email, password, classno} = req.body;

    try {
      const user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ message: "User already exists" });
      }

      userFields = { name, email, password, classno };

      const response = await User.create(userFields);

      // Get all subjects for this user's class
      const subjects = await Subject.find({ classnumber: classno });

      // Create locked UserSubject entries for all subjects in their class
      const userSubjects = subjects.map(subject => ({
        userId: response._id,
        subjectId: subject._id,
        locked: true // All subjects locked initially
      }));

      if (userSubjects.length > 0) {
        await UserSubject.insertMany(userSubjects);
      }

      res.status(201).json({ 
        message: "User added successfully", 
        response,
        subjectsInitialized: userSubjects.length
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Student Registration
  app.post("/api/v1/student/register", async (req, res) => {
    const { name, email, password, classno } = req.body;

    try {
      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ message: "User already exists. Please use a different email or sign in." });
      }

      // Create user fields (classno is optional)
      const userFields = { name, email, password };
      if (classno) {
        userFields.classno = classno;
      }

      const newUser = await User.create(userFields);

      res.status(201).json({ 
        message: "Account created successfully", 
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email
        }
      });
    } catch (error) {
      console.log("Registration error:", error);
      
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ message: messages.join(', ') });
      }
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({ message: "User already exists. Please use a different email or sign in." });
      }
      
      res.status(500).json({ message: error.message || "Server error. Please try again later." });
    }
  });
  // PARENT LOGIN - Generate & Send OTP
    app.post("/api/v1/parent/login", async (req, res) => {
    try {
      const { email } = req.body;

      //   Generate the OTP
      const digits = "0123456789";
      let newOTP = "";
      for (let i = 0; i < otpLength; i++) {
        newOTP += digits[Math.floor(Math.random() * digits.length)];
      }
      console.log("newOTP: ", newOTP);

      //   Check if user already exists
      const user = await User.findOne({ email });

      //   If user does exist
      if (user) {
        await User.updateOne({ email }, {$set:{ otp: newOTP }});
        await sendEmail({
          to: email,
          subject: "Parent Login OTP",
          text: `Your OTP to login as a parent is ${newOTP}.`,
        });
        res.status(200).json({ message: "OTP Sent Successfully" });
      } 
      else {
        // const response = await User.updateOne({ email }, {$set:{ otp: newOTP }});
        res.status(400).json({ message: "ERROR USER NOT FOUND" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: error.message });
    }
  });

  // PARENT REGISTRATION - Generate & Send OTP (for new users)
  app.post("/api/v1/parent/register-otp", async (req, res) => {
    try {
      const { email } = req.body;

      // Generate the OTP
      const digits = "0123456789";
      let newOTP = "";
      for (let i = 0; i < otpLength; i++) {
        newOTP += digits[Math.floor(Math.random() * digits.length)];
      }
      console.log("Registration OTP: ", newOTP);

      // Check if user already exists
      const user = await User.findOne({ email });

      if (user) {
        // User exists, update OTP
        await User.updateOne({ email }, { $set: { otp: newOTP } });
      } else {
        // User doesn't exist, create temporary user with OTP
        await User.create({
          email,
          otp: newOTP,
          isParent: false // Will be updated after OTP verification
        });
      }
        
        await sendEmail({
          to: email,
        subject: "Parent Registration OTP",
        text: `Your OTP to create your parent account is ${newOTP}.`,
      });

      res.status(200).json({ message: "OTP Sent Successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: error.message });
    }
  });

  // Verify parent
  app.post("/api/v1/verify/parent", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.otp === otp) {
        const payload = {
          id: user._id,
          email: user.email,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(200).json({ message: "Parent Login Success", token });
      } else {
        res.status(400).json({ message: "Invalid OTP. Please try again." });
      }
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: error.message });
    }
  });
  // Student LOGIN
  app.post("/api/v1/student/login", async (req, res) => {
    try {
      const { name, password } = req.body;

      if (!name || !password) {
        return res.status(400).json({ message: "Name and password are required" });
      }

      // First check if user exists by name
      const user = await User.findOne({ name });

      if (!user) {
        return res.status(401).json({ message: "User not found. Please create an account first." });
      }

      // Then check if password matches
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
      console.log(error);
      res.status(500).send({ message: error.message });
    }
  });
  
  // Initialize subjects for existing user (for users created before this feature)
  app.post("/api/v1/user/initialize-subjects", requireLogin, async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all subjects for user's class
      const subjects = await Subject.find({ classnumber: user.classno });

      // Get existing UserSubject entries for this user
      const existingUserSubjects = await UserSubject.find({ userId });
      const existingSubjectIds = existingUserSubjects.map(us => us.subjectId.toString());

      // Create UserSubject entries for subjects that don't exist yet
      const newUserSubjects = subjects
        .filter(subject => !existingSubjectIds.includes(subject._id.toString()))
        .map(subject => ({
          userId: userId,
          subjectId: subject._id,
          locked: true
        }));

      if (newUserSubjects.length > 0) {
        await UserSubject.insertMany(newUserSubjects);
      }

      res.status(200).json({ 
        message: "Subjects initialized successfully",
        newSubjectsAdded: newUserSubjects.length,
        totalSubjects: subjects.length
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Check if user exists by email
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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Parent registration - Create parent account after OTP verification
  app.post("/api/v1/parent/register", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      // Verify OTP first (reuse the same logic as parent login)
      const user = await User.findOne({ email });

      if (user && user.otp === otp) {
        // Update user to mark as parent if not already
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
        // User doesn't exist, create new parent account
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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get children profiles for a parent
  app.get("/api/v1/parent/children", requireLogin, async (req, res) => {
    try {
      const parentId = req.user._id;
      const children = await User.find({ parentId, isParent: { $ne: true } });

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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create child profile
  app.post("/api/v1/parent/child", requireLogin, async (req, res) => {
    try {
      const { name, classno, emoji } = req.body;
      const parentId = req.user._id;

      if (!name || !classno) {
        return res.status(400).json({ message: "Name and class are required" });
      }

      // Create child user
      const child = await User.create({
        name,
        classno,
        emoji: emoji || "🐱",
        parentId,
        isParent: false
      });

      // Get all subjects for this child's class
      const subjects = await Subject.find({ classnumber: classno });

      // Create locked UserSubject entries for all subjects in their class
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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete child profile - Send OTP
  app.post("/api/v1/parent/child/delete-otp", requireLogin, async (req, res) => {
    try {
      const { childId } = req.body;
      const parentId = req.user._id;

      if (!childId) {
        return res.status(400).json({ message: "Child ID is required" });
      }

      // Verify the child belongs to this parent
      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      // Get parent email
      const parent = await User.findById(parentId);
      if (!parent || !parent.email) {
        return res.status(400).json({ message: "Parent email not found" });
      }

      // Generate OTP
      const digits = "0123456789";
      let newOTP = "";
      for (let i = 0; i < otpLength; i++) {
        newOTP += digits[Math.floor(Math.random() * digits.length)];
      }

      // Store OTP in parent's record
      await User.updateOne({ _id: parentId }, { $set: { otp: newOTP } });

      // Send OTP via email
      await sendEmail({
        to: parent.email,
        subject: "Delete Profile OTP",
        text: `Your OTP to delete the profile is ${newOTP}.`,
      });

      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete child profile - Verify OTP and delete
  app.delete("/api/v1/parent/child/:childId", requireLogin, async (req, res) => {
    try {
      const { childId } = req.params;
      const { otp } = req.body;
      const parentId = req.user._id;

      if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
      }

      // Verify OTP
      const parent = await User.findById(parentId);
      if (!parent || parent.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      // Verify the child belongs to this parent
      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      // Delete child user
      await User.findByIdAndDelete(childId);

      // Delete all related UserSubject entries
      await UserSubject.deleteMany({ userId: childId });

      // Clear OTP after successful deletion
      await User.updateOne({ _id: parentId }, { $set: { otp: null } });

      res.status(200).json({ message: "Child profile deleted successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update child profile (Edit)
  app.put("/api/v1/parent/child/:childId", requireLogin, async (req, res) => {
    try {
      const { childId } = req.params;
      const { name, classno, emoji } = req.body;
      const parentId = req.user._id;

      // Verify the child belongs to this parent
      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      // Update child
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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Check session - returns true if user needs OTP (7 days timeout)
  app.get("/api/v1/parent/check-session", requireLogin, async (req, res) => {
    try {
      const parent = await User.findById(req.user._id);
      if (!parent) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const lastActivity = parent.lastActivityTime || parent.createdAt || now;
      const timeDiff = (now - lastActivity) / 1000 / 60 / 60 / 24; // days

      // Update last activity time
      await User.updateOne({ _id: req.user._id }, { $set: { lastActivityTime: now } });

      // If more than 7 days, require OTP
      const requiresOtp = timeDiff > 7;

      res.status(200).json({
        requiresOtp,
        lastActivity: lastActivity,
        timeDiffDays: timeDiff
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get academic report for all children
  app.get("/api/v1/parent/academic-report", requireLogin, async (req, res) => {
    try {
      const parentId = req.user._id;
      const Progress = mongoose.model("progress");
      const QuizScore = mongoose.model("quizScores");
      const Chapter = mongoose.model("chapters");
      const Subject = mongoose.model("subjects");

      // Get all children
      const children = await User.find({ parentId, isParent: { $ne: true } });

      const reports = await Promise.all(
        children.map(async (child) => {
          // Get all subjects for this child's class
          const subjects = await Subject.find({ classnumber: child.classno });

          const subjectReports = await Promise.all(
            subjects.map(async (subject) => {
              // Get all chapters for this subject
              const chapters = await Chapter.find({ subjectId: subject._id });

              // Get progress for each chapter
              const chapterProgress = await Promise.all(
                chapters.map(async (chapter) => {
                  const progress = await Progress.findOne({
                    userId: child._id,
                    chapterId: chapter._id,
                    completed: true
                  });

                  const quizScore = await QuizScore.findOne({
                    userId: child._id,
                    chapterId: chapter._id
                  });

                  return {
                    chapterId: chapter._id,
                    chapterName: chapter.name,
                    completed: !!progress,
                    quizScore: quizScore ? quizScore.score : null,
                    totalMarks: quizScore ? quizScore.totalMarks : null
                  };
                })
              );

              const completedChapters = chapterProgress.filter(cp => cp.completed).length;
              const totalChapters = chapters.length;
              const completionPercentage = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

              return {
                subjectId: subject._id,
                subjectName: subject.name,
                totalChapters,
                completedChapters,
                completionPercentage: Math.round(completionPercentage),
                chapters: chapterProgress
              };
            })
          );

          return {
            childId: child._id,
            childName: child.name,
            classno: child.classno,
            emoji: child.emoji,
            subjects: subjectReports
          };
        })
      );

      res.status(200).json({ reports });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get subscription status
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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create subscription
  app.post("/api/v1/parent/subscription", requireLogin, async (req, res) => {
    try {
      const { type } = req.body; // 'monthly' or 'yearly'
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

      // Update parent subscription
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

      // Unlock all subjects for all children
      const children = await User.find({ parentId: req.user._id, isParent: { $ne: true } });
      const Subject = mongoose.model("subjects");
      const UserSubject = mongoose.model("usersubjects");

      for (const child of children) {
        const subjects = await Subject.find({ classnumber: child.classno });
        
        for (const subject of subjects) {
          let userSubject = await UserSubject.findOne({ userId: child._id, subjectId: subject._id });
          
          if (!userSubject) {
            userSubject = await UserSubject.create({
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
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get leaderboard (top 5 + user position)
  app.get("/api/v1/leaderboard", async (req, res) => {
    try {
      const Leaderboard = mongoose.model("leaderboards");
      const { userId, classno } = req.query;

      // Get top 5 by totalScore
      const top5 = await Leaderboard.find({ classnumber: classno })
        .sort({ totalScore: -1 })
        .limit(5)
        .populate("userId", "name emoji");

      // Get user's position if userId provided
      let userPosition = null;
      if (userId) {
        const userScore = await Leaderboard.findOne({ userId, classnumber: classno });
        if (userScore) {
          const usersAbove = await Leaderboard.countDocuments({
            classnumber: classno,
            totalScore: { $gt: userScore.totalScore }
          });
          userPosition = {
            rank: usersAbove + 1,
            score: userScore.totalScore,
            user: await User.findById(userId).select("name emoji")
          };
        }
      }

      res.status(200).json({
        top5: top5.map((entry, index) => ({
          rank: index + 1,
          name: entry.userId?.name || "Unknown",
          emoji: entry.userId?.emoji || "👤",
          score: entry.totalScore
        })),
        userPosition
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

};