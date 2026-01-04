const mongoose = require("mongoose");

const AttemptSchema = new mongoose.Schema({
  childId: String,
  questionId: mongoose.Schema.Types.ObjectId,
  subject: String,
  topic: String,
  difficulty: String,
  isCorrect: Boolean,
  createdAt: { type: Date, default: Date.now },
});

if (!mongoose.models.attempts) {
  mongoose.model("attempts", AttemptSchema);
}
module.exports = mongoose.model("attempts");
