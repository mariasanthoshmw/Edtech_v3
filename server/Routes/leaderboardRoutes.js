const mongoose = require("mongoose");

module.exports = (app) => {
  const Leaderboard = mongoose.model("leaderboards");
  const User = mongoose.model("edtechusers");

  // GET LEADERBOARD - Top 5 and User Position
  app.get("/api/v1/leaderboard", async (req, res) => {
    try {
      const { userId } = req.query;

      // Get top 5 students
      const top5 = await Leaderboard.find()
        .sort({ totalPoints: -1 })
        .limit(5)
        .lean();

      // Get user's position if userId provided
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

      // Populate user details for top 5
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
      console.error("Leaderboard error:", error);
      res.status(500).json({ message: error.message });
    }
  });
};

