const express = require("express");
const mongoose = require("mongoose");
// Import the model to ensure it's registered
require("../models/QuizQuestions");
// Use the same model name as other routes for consistency
const Question = mongoose.model("quizquestions");

const Attempt = mongoose.model("attempts");
const Leaderboard = mongoose.model("leaderboards");
const { calculatePoints } = require("../utils/points");
const { callAdaptiveEngine } = require("../utils/adaptiveClient");

const router = express.Router();

/* -------------------------
   START QUIZ
-------------------------- */
router.get("/start", async (req, res) => {
  try {
    const { childId, subject, chapterId } = req.query;

    if (!childId || !subject) {
      return res.status(400).json({ message: "Missing childId or subject" });
    }

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const lastAttempt = await Attempt.findOne({ 
      childId, 
      subject,
      createdAt: { $gte: thirtySecondsAgo } // Only last 30 seconds
    }).sort({ createdAt: -1 });
    
    const attemptedIdStrings = new Set();
    if (lastAttempt && lastAttempt.questionId) {
      const idString = lastAttempt.questionId.toString();
      attemptedIdStrings.add(idString);
    }

    const findQuestionExcludingAttempted = async (query) => {
      const allQuestions = await Question.find(query);
      const availableQuestions = allQuestions.filter(q => {
        const qIdString = q._id.toString();
        return !attemptedIdStrings.has(qIdString);
      });
      
      if (availableQuestions.length === 0) {
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      return availableQuestions[randomIndex];
    };

    let question = null;

    if (chapterId) {
      let query = { isActive: true };
      
      if (mongoose.Types.ObjectId.isValid(chapterId)) {
        query.chapterId = new mongoose.Types.ObjectId(chapterId);
        question = await findQuestionExcludingAttempted(query);
      }
      
      if (!question) {
        query.chapterId = chapterId;
        question = await findQuestionExcludingAttempted(query);
      }
    }

    if (!question) {
      question = await findQuestionExcludingAttempted({
        subject,
        difficulty: "easy",
        isActive: true,
      });
    }

    if (!question) {
      question = await findQuestionExcludingAttempted({
        subject,
        isActive: true,
      });
    }

    if (!question) {
      question = await findQuestionExcludingAttempted({
        isActive: true,
      });
    }

    if (!question) {
      const totalCount = await Question.countDocuments({});
      
      if (totalCount === 0) {
        try {
          const dummyData = {
            subject: subject || "math",
            topic: "General",
            question: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            correctAnswer: "4",
            difficulty: "easy",
            isActive: true
          };
          
          if (chapterId && mongoose.Types.ObjectId.isValid(chapterId)) {
            dummyData.chapterId = new mongoose.Types.ObjectId(chapterId);
          }
          
          const dummyQuestion = await Question.create(dummyData);
          question = dummyQuestion;
        } catch (createErr) {
          return res.json({ completed: true });
        }
      } else {
        return res.json({ completed: true });
      }
    }
    res.json({ completed: false, question });
  } catch (err) {
    console.error("QUIZ START ERROR:", err);
    res.status(500).json({ message: "Failed to start quiz" });
  }
});

/* -------------------------
   SUBMIT ANSWER
-------------------------- */
router.post("/answer", async (req, res) => {
  try {
    const { childId, questionId, isCorrect } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Save attempt - ensure questionId is ObjectId
    const questionIdObj = mongoose.Types.ObjectId.isValid(questionId)
      ? new mongoose.Types.ObjectId(questionId)
      : questionId;
    
    await Attempt.create({
      childId,
      questionId: questionIdObj,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      isCorrect,
    });

    // Points
    const points = calculatePoints(question.difficulty, isCorrect);

    // Leaderboard
    await Leaderboard.findOneAndUpdate(
      { childId },
      {
        $inc: {
          [`subjects.${question.subject}`]: points,
          totalPoints: points,
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    // Recent attempts (for adaptive engine - last 5)
    const recentAttempts = await Attempt.find({ childId, subject: question.subject })
      .sort({ createdAt: -1 })
      .limit(5);

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentAttemptsForExclusion = await Attempt.find({ 
      childId, 
      subject: question.subject,
      createdAt: { $gte: twoMinutesAgo } // Only last 2 minutes
    }).sort({ createdAt: -1 });
    
    const attemptedIdStrings = new Set();
    
    for (const attempt of recentAttemptsForExclusion) {
      if (attempt.questionId) {
        let idString;
        if (attempt.questionId instanceof mongoose.Types.ObjectId) {
          idString = attempt.questionId.toString();
        } else if (typeof attempt.questionId === 'string' && mongoose.Types.ObjectId.isValid(attempt.questionId)) {
          idString = new mongoose.Types.ObjectId(attempt.questionId).toString();
        } else if (attempt.questionId && attempt.questionId.toString) {
          idString = attempt.questionId.toString();
        } else {
          continue;
        }
        attemptedIdStrings.add(idString);
      }
    }
    
    // Also exclude the current question (the one just answered)
    const currentQuestionId = mongoose.Types.ObjectId.isValid(questionId) 
      ? new mongoose.Types.ObjectId(questionId)
      : questionId;
    
    const currentIdString = currentQuestionId.toString();
    attemptedIdStrings.add(currentIdString);

    // Adaptive decision
    const adaptive = await callAdaptiveEngine({
      child_id: childId,
      subject: question.subject,
      attempts: recentAttempts.map((a) => ({
        topic: a.topic,
        difficulty: a.difficulty,
        is_correct: a.isCorrect,
      })),
    });

    const findQuestionWithFilter = async (query, attemptedIdStrings) => {
      const allQuestions = await Question.find(query);
      const availableQuestions = allQuestions.filter(q => {
        const qIdString = q._id.toString();
        return !attemptedIdStrings.has(qIdString);
      });
      
      if (availableQuestions.length === 0) {
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      return availableQuestions[randomIndex];
    };

    let nextQuestion = null;

    if (question.chapterId) {
      const chapterIdObj = mongoose.Types.ObjectId.isValid(question.chapterId)
        ? new mongoose.Types.ObjectId(question.chapterId)
        : question.chapterId;
      
      const query1 = {
        chapterId: chapterIdObj,
        difficulty: adaptive.next_difficulty,
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query1, attemptedIdStrings);
    }

    if (!nextQuestion && question.chapterId) {
      const chapterIdObj = mongoose.Types.ObjectId.isValid(question.chapterId)
        ? new mongoose.Types.ObjectId(question.chapterId)
        : question.chapterId;
      
      const query2 = {
        chapterId: chapterIdObj,
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query2, attemptedIdStrings);
    }

    if (!nextQuestion) {
      const query3 = {
        subject: question.subject,
        difficulty: adaptive.next_difficulty,
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query3, attemptedIdStrings);
    }

    if (!nextQuestion) {
      const query4 = {
        subject: question.subject,
        difficulty: "easy",
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query4, attemptedIdStrings);
    }

    if (!nextQuestion) {
      const query5 = {
        subject: question.subject,
        difficulty: "medium",
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query5, attemptedIdStrings);
    }

    if (!nextQuestion) {
      const query6 = {
        subject: question.subject,
        difficulty: "hard",
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query6, attemptedIdStrings);
    }

    if (!nextQuestion) {
      const query7 = {
        subject: question.subject,
        isActive: true,
      };
      nextQuestion = await findQuestionWithFilter(query7, attemptedIdStrings);
    }

    if (!nextQuestion) {
      return res.json({ completed: true });
    }

    const foundQuestionId = nextQuestion._id.toString();
    if (attemptedIdStrings.has(foundQuestionId)) {
      return res.json({ completed: true });
    }

    res.json({
      completed: false,
      question: nextQuestion,
      adaptive,
    });
  } catch (err) {
    console.error("QUIZ ANSWER ERROR:", err);
    res.status(500).json({ message: "Quiz evaluation failed" });
  }
});

module.exports = router;
