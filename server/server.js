// server/server.js

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

/* -------------------------
   MIDDLEWARE
-------------------------- */
app.use(
  cors({
    origin: "http://localhost:3000", // Next.js frontend
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------------
   STATIC FILES
-------------------------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------------
   DATABASE CONNECTION
-------------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(" Connected to MongoDB");
  })
  .catch((err) => {
    console.error(" MongoDB connection error:", err);
  });

/* -------------------------
   MODELS (LOAD ONCE)
    casing must match folder name exactly
-------------------------- */
require("./models/User");
require("./models/Subject");
require("./models/Chapter");
require("./models/Progress");
require("./models/QuizScore");
require("./models/QuizQuestions");
require("./models/Leaderboard");
require("./models/UserSubject");
require("./models/Attempt");
require("./models/Question");

/* -------------------------
   ROUTES
-------------------------- */

// Function-based routes (existing)
require("./Routes/authRoutes")(app);
require("./Routes/childRoutes")(app);
require("./Routes/ChaptersRoutes")(app);
require("./Routes/SubjectRoutes")(app);
require("./Routes/paymentRoutes")(app);
require("./Routes/leaderboardRoutes")(app);
require("./Routes/quizQuestionRoutes")(app);
require("./Routes/quizScoreRoutes")(app);

// Router-based quiz routes (IMPORTANT)
const quizRoutes = require("./Routes/quizRoutes");
app.use("/api/quiz", quizRoutes);

/* -------------------------
   HEALTH CHECK (OPTIONAL BUT USEFUL)
-------------------------- */
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "Backend running" });
});

/* -------------------------
   START SERVER
-------------------------- */
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
