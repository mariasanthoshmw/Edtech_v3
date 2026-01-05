const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const QuizScore = mongoose.model("quizscores");
const QuizQuestion = mongoose.model("quizquestions");
const User = mongoose.model("edtechusers");
const Chapter = mongoose.model("chapters");

module.exports = (app) => {
  // Save Quiz Score (Simple - just score and total)
  app.post("/api/v1/quiz/save-score", requireLogin, async (req, res) => {
    const { childId, chapterId, score, totalMarks } = req.body;
    const parentId = req.user._id;

    console.log("📊 SAVE QUIZ SCORE - Request received:", {
      childId,
      chapterId,
      score,
      totalMarks,
      parentId
    });

    try {
      if (!childId || !chapterId || score === undefined || totalMarks === undefined) {
        console.log("❌ SAVE QUIZ SCORE - Missing required fields");
        return res.status(400).json({ 
          message: "Child ID, Chapter ID, score, and totalMarks are required" 
        });
      }

      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        console.log("❌ SAVE QUIZ SCORE - Child not found");
        return res.status(404).json({ 
          message: "Child not found or you don't have permission" 
        });
      }

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        console.log("❌ SAVE QUIZ SCORE - Chapter not found");
        return res.status(404).json({ message: "Chapter not found" });
      }

      const percentage = Math.round((score / totalMarks) * 100);

      console.log("✅ SAVE QUIZ SCORE - Creating score document in MongoDB...");
      const quizScore = await QuizScore.create({
        childId,
        chapterId,
        score,
        totalMarks,
        percentage
      });

      console.log("✅ SAVE QUIZ SCORE - Score saved to MongoDB:", {
        quizScoreId: quizScore._id,
        childId: quizScore.childId,
        chapterId: quizScore.chapterId,
        score: quizScore.score,
        totalMarks: quizScore.totalMarks,
        percentage: quizScore.percentage
      });

      res.status(201).json({ 
        message: "Quiz score saved successfully!",
        result: {
          score,
          totalMarks,
          percentage,
          quizScoreId: quizScore._id
        }
      });
    } catch (error) {
      console.error("❌ SAVE QUIZ SCORE - Error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Submit Quiz (Child completes quiz)
  app.post("/api/v1/quiz/submit", requireLogin, async (req, res) => {
    const { childId, chapterId, answers } = req.body;
    const parentId = req.user._id;

    try {
      // Validate required fields
      if (!childId || !chapterId || !answers) {
        return res.status(400).json({ 
          message: "Child ID, Chapter ID, and answers are required" 
        });
      }

      // Verify child belongs to parent
      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ 
          message: "Child not found or you don't have permission" 
        });
      }

      // Get chapter info
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Get all questions for this chapter
      const questions = await QuizQuestion.find({ chapterId });
      
      if (questions.length === 0) {
        return res.status(404).json({ 
          message: "No questions found for this chapter" 
        });
      }

      // Calculate score
      let score = 0;
      let totalMarks = 0;

      questions.forEach(question => {
        totalMarks += question.marks;
        const userAnswer = answers[question._id.toString()];
        
        if (userAnswer === question.correctAnswer) {
          score += question.marks;
        }
      });

      const percentage = Math.round((score / totalMarks) * 100);

      // Save quiz score
      const quizScore = await QuizScore.create({
        childId,
        chapterId,
        score,
        totalMarks,
        percentage
      });

      res.status(201).json({ 
        message: "Quiz submitted successfully!",
        result: {
          score,
          totalMarks,
          percentage,
          quizScoreId: quizScore._id
        }
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Quiz Scores for a Child
  app.get("/api/v1/quiz/scores/child/:childId", requireLogin, async (req, res) => {
    const { childId } = req.params;
    const parentId = req.user._id;

    try {
      // Verify child belongs to parent
      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ 
          message: "Child not found or you don't have permission" 
        });
      }

      // Get all quiz scores for this child
      const scores = await QuizScore.find({ childId })
        .populate('chapterId', 'name')
        .sort({ completedAt: -1 });

      res.status(200).json({ 
        message: "Quiz scores retrieved successfully",
        child: {
          _id: child._id,
          name: child.name,
          classno: child.classno
        },
        scores,
        totalQuizzes: scores.length
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Quiz Scores for a Specific Chapter
  app.get("/api/v1/quiz/scores/child/:childId/chapter/:chapterId", requireLogin, async (req, res) => {
    const { childId, chapterId } = req.params;
    const parentId = req.user._id;

    try {
      // Verify child belongs to parent
      const child = await User.findOne({ _id: childId, parentId, isParent: { $ne: true } });
      if (!child) {
        return res.status(404).json({ 
          message: "Child not found or you don't have permission" 
        });
      }

      // Get quiz scores for this chapter
      const scores = await QuizScore.find({ childId, chapterId })
        .sort({ completedAt: -1 });

      if (scores.length === 0) {
        return res.status(404).json({ 
          message: "No quiz attempts found for this chapter" 
        });
      }

      res.status(200).json({ 
        message: "Quiz scores retrieved successfully",
        child: {
          _id: child._id,
          name: child.name
        },
        scores,
        totalAttempts: scores.length
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get Quiz Score by ID (Detailed view)
  app.get("/api/v1/quiz/score/:scoreId", requireLogin, async (req, res) => {
    const { scoreId } = req.params;
    const parentId = req.user._id;

    try {
      const quizScore = await QuizScore.findById(scoreId)
        .populate('childId', 'name classno')
        .populate('chapterId', 'name');

      if (!quizScore) {
        return res.status(404).json({ message: "Quiz score not found" });
      }

      // Verify child belongs to parent
      const child = await User.findOne({ 
        _id: quizScore.childId._id, 
        parentId,
        isParent: { $ne: true }
      });
      
      if (!child) {
        return res.status(403).json({ 
          message: "You don't have permission to view this score" 
        });
      }

      res.status(200).json({ 
        message: "Quiz score retrieved successfully",
        quizScore
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete Quiz Score (Admin/Testing)
  app.delete("/api/v1/quiz/score/:scoreId", requireLogin, async (req, res) => {
    const { scoreId } = req.params;
    const parentId = req.user._id;

    try {
      const quizScore = await QuizScore.findById(scoreId);

      if (!quizScore) {
        return res.status(404).json({ message: "Quiz score not found" });
      }

      // Verify child belongs to parent
      const child = await User.findOne({ 
        _id: quizScore.childId, 
        parentId,
        isParent: { $ne: true }
      });
      
      if (!child) {
        return res.status(403).json({ 
          message: "You don't have permission to delete this score" 
        });
      }

      await QuizScore.findByIdAndDelete(scoreId);

      res.status(200).json({ 
        message: "Quiz score deleted successfully"
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

