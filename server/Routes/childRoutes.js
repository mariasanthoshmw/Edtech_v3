const mongoose = require("mongoose");
const requireParent = require("../middleware/requireParent");
const User = mongoose.model("edtechusers");
const Subject = mongoose.model("subjects");
const UserSubject = mongoose.model("usersubjects");
const sendEmail = require("../utils/sendEmail");

const otpLength = 6;

module.exports = (app) => {
  // GET PARENT CHILDREN
  app.get("/api/v1/parent/children", requireParent, async (req, res) => {
    try {
      const parentId = req.user._id;
      
      console.log("🔍 Fetching children for parent ID:", parentId);
      console.log("🔍 Parent email:", req.user.email);
      console.log("🔍 Parent isParent:", req.user.isParent);
      
      // Ensure we're only getting children for this specific parent
      // Convert to ObjectId if needed for proper comparison
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
  app.post("/api/v1/parent/child", requireParent, async (req, res) => {
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
        parentId: parentId,
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
  app.put("/api/v1/parent/child/:childId", requireParent, async (req, res) => {
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
  app.post("/api/v1/parent/child/delete-otp", requireParent, async (req, res) => {
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

      console.log("Delete Profile OTP: ", newOTP);

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
  app.delete("/api/v1/parent/child/:childId", requireParent, async (req, res) => {
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

  // ACADEMIC REPORT
  app.get("/api/v1/parent/academic-report", requireParent, async (req, res) => {
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
};

