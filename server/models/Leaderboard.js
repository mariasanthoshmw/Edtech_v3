const mongoose = require("mongoose");

const LeaderboardSchema = new mongoose.Schema({
  childId: { type: String, unique: true },
  subjects: {
    math: { type: Number, default: 0 },
    english: { type: Number, default: 0 },
    science: { type: Number, default: 0 },
  },
  totalPoints: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  updatedAt: { type: Date, default: Date.now },
});

if (!mongoose.models.leaderboards) {
  mongoose.model("leaderboards", LeaderboardSchema);
}
module.exports = mongoose.model("leaderboards");
