const mongoose = require("mongoose");

const QuizQuestionSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chapters",
    },
    subject: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * 🔑 THIS LINE IS THE MOST IMPORTANT
 * Without this → findOne WILL NOT WORK
 * Register with lowercase plural name to match other routes
 */
// Only register if not already registered (prevents "Cannot overwrite model" error)
if (!mongoose.models.quizquestions) {
  mongoose.model("quizquestions", QuizQuestionSchema);
}
module.exports = mongoose.model("quizquestions");
