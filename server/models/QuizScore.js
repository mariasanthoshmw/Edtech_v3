const mongoose = require("mongoose");
const { Schema } = mongoose;


const quizScoreSchema = new mongoose.Schema({
  childId: mongoose.Schema.Types.ObjectId,
  chapterId: mongoose.Schema.Types.ObjectId,
  score: Number,
  totalMarks: Number,
  percentage: Number
}, {
  timestamps: true
});

if (!mongoose.models.quizscores) {
  mongoose.model("quizscores", quizScoreSchema);
}