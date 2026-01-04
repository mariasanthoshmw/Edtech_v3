// server/utils/points.js

function calculatePoints(difficulty, isCorrect) {
  if (!isCorrect) return 0;

  switch (difficulty) {
    case "easy":
      return 10;
    case "medium":
      return 20;
    case "hard":
      return 30;
    default:
      return 10;
  }
}

module.exports = { calculatePoints };
