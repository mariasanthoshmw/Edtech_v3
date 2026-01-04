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

    console.log("🔍 QUIZ START - Request params:", { childId, subject, chapterId });

    if (!childId || !subject) {
      return res.status(400).json({ message: "Missing childId or subject" });
    }

    // Only exclude the VERY LAST question (if answered in last 30 seconds)
    // This prevents showing the same question immediately after answering, but allows
    // starting a new quiz with all questions available
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
      console.log("🔍 QUIZ START - Excluding only the last question (answered in last 30 sec):", idString);
    } else {
      console.log("🔍 QUIZ START - No recent attempts, all questions available");
    }

    // Helper function to find question excluding attempted ones
    const findQuestionExcludingAttempted = async (query) => {
      const allQuestions = await Question.find(query);
      console.log(`📊 QUIZ START - Found ${allQuestions.length} questions matching query`);
      
      const availableQuestions = allQuestions.filter(q => {
        const qIdString = q._id.toString();
        const isExcluded = attemptedIdStrings.has(qIdString);
        if (isExcluded) {
          console.log(`🚫 QUIZ START - Excluding attempted question: ${qIdString}`);
        }
        return !isExcluded;
      });
      
      console.log(`✅ QUIZ START - ${availableQuestions.length} questions available after filtering`);
      
      if (availableQuestions.length === 0) {
        console.log("⚠️ QUIZ START - No available questions after filtering, returning null");
        return null;
      }
      
      // Pick random from available
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const selectedQuestion = availableQuestions[randomIndex];
      console.log(`✅ QUIZ START - Selected question: ${selectedQuestion._id.toString()}`);
      return selectedQuestion;
    };

    let question = null;

    // First, try to find question by chapterId if provided
    if (chapterId) {
      console.log("🔍 QUIZ START - Searching by chapterId:", chapterId);
      const mongoose = require("mongoose");
      let query = { isActive: true };
      
      // Try ObjectId first
      if (mongoose.Types.ObjectId.isValid(chapterId)) {
        query.chapterId = new mongoose.Types.ObjectId(chapterId);
        question = await findQuestionExcludingAttempted(query);
        console.log("🔍 QUIZ START - ObjectId search result:", question ? "FOUND" : "NOT FOUND");
      }
      
      // If not found, try string match
      if (!question) {
        query.chapterId = chapterId;
        question = await findQuestionExcludingAttempted(query);
        console.log("🔍 QUIZ START - String search result:", question ? "FOUND" : "NOT FOUND");
      }
    }

    // If no question found with chapterId, fallback to subject-based query
    if (!question) {
      console.log("🔍 QUIZ START - Searching by subject:", subject);
      question = await findQuestionExcludingAttempted({
        subject,
        difficulty: "easy",
        isActive: true,
      });
      console.log("🔍 QUIZ START - Subject search result:", question ? "FOUND" : "NOT FOUND");
    }

    // If still no question, try ANY question with that subject (ignore difficulty)
    if (!question) {
      console.log("🔍 QUIZ START - Searching by subject (any difficulty):", subject);
      question = await findQuestionExcludingAttempted({
        subject,
        isActive: true,
      });
      console.log("🔍 QUIZ START - Subject (any difficulty) search result:", question ? "FOUND" : "NOT FOUND");
    }

    // If still no question, try ANY active question (but still exclude attempted)
    if (!question) {
      console.log("🔍 QUIZ START - Searching for ANY active question");
      question = await findQuestionExcludingAttempted({
        isActive: true,
      });
      console.log("🔍 QUIZ START - Any question search result:", question ? "FOUND" : "NOT FOUND");
    }

    if (!question) {
      console.log("❌ QUIZ START - No question found for:", { chapterId, subject });
      // Debug: Check what questions exist
      const totalCount = await Question.countDocuments({});
      console.log("📊 QUIZ START - Total questions in DB:", totalCount);
      
      if (totalCount === 0) {
        console.log("⚠️ QUIZ START - NO QUESTIONS IN DATABASE! Creating a dummy question...");
        // Create a dummy question so quiz can work
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
          
          // Add chapterId if provided and valid
          if (chapterId && mongoose.Types.ObjectId.isValid(chapterId)) {
            dummyData.chapterId = new mongoose.Types.ObjectId(chapterId);
          }
          
          console.log("📝 QUIZ START - Attempting to create dummy question with data:", JSON.stringify(dummyData, null, 2));
          const dummyQuestion = await Question.create(dummyData);
          question = dummyQuestion;
          console.log("✅ QUIZ START - SUCCESS! Created dummy question with ID:", dummyQuestion._id);
          console.log("✅ QUIZ START - Dummy question subject:", dummyQuestion.subject);
          console.log("✅ QUIZ START - Dummy question chapterId:", dummyQuestion.chapterId);
          console.log("✅ QUIZ START - Dummy question isActive:", dummyQuestion.isActive);
        } catch (createErr) {
          console.error("❌ QUIZ START - FAILED to create dummy question!");
          console.error("❌ QUIZ START - Error message:", createErr.message);
          console.error("❌ QUIZ START - Error stack:", createErr.stack);
          console.error("❌ QUIZ START - Full error object:", createErr);
          return res.json({ completed: true });
        }
      } else {
        // There are questions but none matched - show sample
        const allQuestions = await Question.find({}).limit(5);
        console.log("📊 QUIZ START - Sample questions:", allQuestions.map(q => ({
          _id: q._id,
          subject: q.subject,
          chapterId: q.chapterId,
          isActive: q.isActive,
          difficulty: q.difficulty
        })));
        return res.json({ completed: true });
      }
    }

    console.log("✅ QUIZ START - Returning question:", question._id);
    res.json({ completed: false, question });
  } catch (err) {
    console.error("❌ QUIZ START ERROR:", err);
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
    
    const attemptDoc = await Attempt.create({
      childId,
      questionId: questionIdObj,
      subject: question.subject,
      topic: question.topic,
      difficulty: question.difficulty,
      isCorrect,
    });
    
    console.log("💾 QUIZ ANSWER - Attempt saved - questionId:", questionIdObj.toString());
    console.log("💾 QUIZ ANSWER - Attempt document ID:", attemptDoc._id.toString());
    console.log("💾 QUIZ ANSWER - Attempt document questionId type:", typeof attemptDoc.questionId);
    console.log("💾 QUIZ ANSWER - Attempt document questionId value:", attemptDoc.questionId?.toString());

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

    // Only get attempts from CURRENT quiz session (last 2 minutes)
    // This prevents excluding questions from previous quiz sessions
    // Using 2 minutes allows new quiz sessions to start fresh
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentAttemptsForExclusion = await Attempt.find({ 
      childId, 
      subject: question.subject,
      createdAt: { $gte: twoMinutesAgo } // Only last 2 minutes
    }).sort({ createdAt: -1 });
    
    console.log("📊 QUIZ ANSWER - Current session attempts (last 2 min):", recentAttemptsForExclusion.length);
    console.log("📊 QUIZ ANSWER - Total attempts ever (for reference):", await Attempt.countDocuments({ childId, subject: question.subject }));
    
    // Use a Set to store unique question ID strings, then convert to ObjectIds
    const attemptedIdStrings = new Set();
    
    // Collect attempted question IDs from CURRENT session only
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
          console.warn("⚠️ QUIZ ANSWER - Skipping invalid questionId:", attempt.questionId);
          continue; // Skip invalid IDs
        }
        attemptedIdStrings.add(idString);
        console.log("📝 QUIZ ANSWER - Added attempted ID:", idString);
      } else {
        console.warn("⚠️ QUIZ ANSWER - Attempt has no questionId:", attempt._id);
      }
    }
    
    // Also exclude the current question (the one just answered)
    const currentQuestionId = mongoose.Types.ObjectId.isValid(questionId) 
      ? new mongoose.Types.ObjectId(questionId)
      : questionId;
    
    const currentIdString = currentQuestionId.toString();
    attemptedIdStrings.add(currentIdString); // Add current question to set
    
    // Convert Set to array of ObjectIds for MongoDB query
    const attemptedIds = Array.from(attemptedIdStrings).map(id => new mongoose.Types.ObjectId(id));
    
    console.log("🔍 QUIZ ANSWER - Unique attempted IDs count:", attemptedIds.length);
    console.log("🔍 QUIZ ANSWER - Current question ID:", currentIdString);
    console.log("🔍 QUIZ ANSWER - All attempted IDs:", Array.from(attemptedIdStrings));
    
    // Debug: Check how many questions are available in the chapter
    if (question.chapterId) {
      const chapterIdObj = mongoose.Types.ObjectId.isValid(question.chapterId)
        ? new mongoose.Types.ObjectId(question.chapterId)
        : question.chapterId;
      
      const totalInChapter = await Question.countDocuments({ 
        chapterId: chapterIdObj,
        isActive: true 
      });
      
      const availableInChapter = await Question.countDocuments({ 
        chapterId: chapterIdObj,
        isActive: true,
        _id: { $nin: attemptedIds }
      });
      
      console.log("📊 QUIZ ANSWER - Total questions in chapter:", totalInChapter);
      console.log("📊 QUIZ ANSWER - Available questions (not attempted):", availableInChapter);
      console.log("📊 QUIZ ANSWER - Attempted questions in chapter:", totalInChapter - availableInChapter);
    }

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

    // Helper function to find a question by filtering in JavaScript
    const findQuestionWithFilter = async (query, attemptedIdStrings) => {
      // Fetch ALL questions matching the criteria
      const allQuestions = await Question.find(query);
      console.log(`📊 Found ${allQuestions.length} questions matching criteria`);
      
      // Filter out attempted questions in JavaScript
      const availableQuestions = allQuestions.filter(q => {
        const qIdString = q._id.toString();
        const isAttempted = attemptedIdStrings.has(qIdString);
        if (isAttempted) {
          console.log(`🚫 Filtered out attempted question: ${qIdString}`);
        }
        return !isAttempted;
      });
      
      console.log(`✅ ${availableQuestions.length} questions available after filtering`);
      
      if (availableQuestions.length === 0) {
        return null;
      }
      
      // Pick a random question from available ones
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      return availableQuestions[randomIndex];
    };

    let nextQuestion = null;

    // Try 1: Same chapter + adaptive difficulty
    if (question.chapterId) {
      const chapterIdObj = mongoose.Types.ObjectId.isValid(question.chapterId)
        ? new mongoose.Types.ObjectId(question.chapterId)
        : question.chapterId;
      
      const query1 = {
        chapterId: chapterIdObj,
        difficulty: adaptive.next_difficulty,
        isActive: true,
      };
      
      console.log("🔍 QUIZ ANSWER - Try 1 query - chapterId:", chapterIdObj.toString(), "difficulty:", adaptive.next_difficulty, "excluded:", attemptedIdStrings.size);
      nextQuestion = await findQuestionWithFilter(query1, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 1 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Try 2: Same chapter + any difficulty
    if (!nextQuestion && question.chapterId) {
      const chapterIdObj = mongoose.Types.ObjectId.isValid(question.chapterId)
        ? new mongoose.Types.ObjectId(question.chapterId)
        : question.chapterId;
      
      const query2 = {
        chapterId: chapterIdObj,
        isActive: true,
      };
      
      console.log("🔍 QUIZ ANSWER - Try 2 query (chapter + any difficulty)");
      nextQuestion = await findQuestionWithFilter(query2, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 2 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Try 3: Same subject + adaptive difficulty
    if (!nextQuestion) {
      const query3 = {
        subject: question.subject,
        difficulty: adaptive.next_difficulty,
        isActive: true,
      };
      console.log("🔍 QUIZ ANSWER - Try 3 query (subject + adaptive difficulty)");
      nextQuestion = await findQuestionWithFilter(query3, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 3 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Try 4: Same subject + easy
    if (!nextQuestion) {
      const query4 = {
        subject: question.subject,
        difficulty: "easy",
        isActive: true,
      };
      console.log("🔍 QUIZ ANSWER - Try 4 query (subject + easy)");
      nextQuestion = await findQuestionWithFilter(query4, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 4 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Try 5: Same subject + medium
    if (!nextQuestion) {
      const query5 = {
        subject: question.subject,
        difficulty: "medium",
        isActive: true,
      };
      console.log("🔍 QUIZ ANSWER - Try 5 query (subject + medium)");
      nextQuestion = await findQuestionWithFilter(query5, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 5 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Try 6: Same subject + hard
    if (!nextQuestion) {
      const query6 = {
        subject: question.subject,
        difficulty: "hard",
        isActive: true,
      };
      console.log("🔍 QUIZ ANSWER - Try 6 query (subject + hard)");
      nextQuestion = await findQuestionWithFilter(query6, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 6 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Try 7: Same subject + ANY difficulty (last resort)
    if (!nextQuestion) {
      const query7 = {
        subject: question.subject,
        isActive: true,
      };
      console.log("🔍 QUIZ ANSWER - Try 7 query (subject + any difficulty)");
      nextQuestion = await findQuestionWithFilter(query7, attemptedIdStrings);
      console.log("🔍 QUIZ ANSWER - Try 7 result:", nextQuestion ? `FOUND: ${nextQuestion._id.toString()}` : "NOT FOUND");
    }

    // Only complete if NO questions found after all tries
    if (!nextQuestion) {
      console.log("❌ QUIZ ANSWER - No more questions found after all tries");
      return res.json({ completed: true });
    }

    // Safety check: Make sure the found question is not in attemptedIds (shouldn't happen with our filter, but double-check)
    const foundQuestionId = nextQuestion._id.toString();
    const isAlreadyAttempted = attemptedIdStrings.has(foundQuestionId);
    
    if (isAlreadyAttempted) {
      console.error("❌ ERROR: Found question that was already attempted! ID:", foundQuestionId);
      console.error("❌ This should not happen with JavaScript filtering!");
      return res.json({ completed: true });
    }

    console.log("✅ QUIZ ANSWER - Next question selected:", nextQuestion._id.toString(), "- Question:", nextQuestion.question.substring(0, 50) + "...");

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
