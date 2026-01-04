import { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Paper, LinearProgress, Button } from "@mui/material";
import { Cookies } from "react-cookie";
import { useRouter } from "next/router";
import RefreshIcon from "@mui/icons-material/Refresh";

const cookies = new Cookies();
const API_BASE = "http://localhost:5001";
const ELEPHANT_IMG = "/elephant.png";

export default function QuizPage() {
  const router = useRouter();

  const [question, setQuestion] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [currentQ, setCurrentQ] = useState(1);
  const [totalQuestions] = useState(8);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  const [childId, setChildId] = useState(null);
  const [subject, setSubject] = useState(null);
  const [chapterId, setChapterId] = useState(null);

  /*  ROUTE GUARD */
  useEffect(() => {
    const token = cookies.get("token");
    const cId = cookies.get("selectedChildId");
    const sub = cookies.get("selectedSubjectSlug");
    const chId = cookies.get("selectedChapterId");

    if (!token) {
      router.replace("/parentlogin");
      return;
    }

    if (!cId || !sub || !chId) {
      router.replace("/chapters");
      return;
    }

    setChildId(cId);
    setSubject(sub);
    setChapterId(chId);
  }, []);

  /* LOAD QUESTION */
  useEffect(() => {
    if (!childId || !subject || !chapterId) return;
    loadQuestion();
  }, [childId, subject, chapterId]);

  /* DEBUG: Log state changes */
  useEffect(() => {
    console.log("🔍 Quiz State - currentQ:", currentQ, "isQuizComplete:", isQuizComplete, "score:", score);
    if (isQuizComplete && currentQ >= totalQuestions) {
      console.log("✅ Quiz Complete! View Score button should appear");
    }
  }, [currentQ, isQuizComplete, score]);

  const loadQuestion = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/quiz/start`, {
        params: { childId, subject, chapterId },
      });

      // IGNORE backend's completed flag completely - we control the 8-question limit
      // Only check if we've actually completed 8 questions on the frontend
      if (currentQ >= totalQuestions) {
        setIsQuizComplete(true);
        return;
      }

      if (!res.data.question) {
        // If no question and we haven't reached 8, show error but don't redirect
        if (currentQ < totalQuestions) {
          console.warn("No question returned but quiz not complete.");
          alert("No question available. Please try again.");
          return;
        } else {
          setIsQuizComplete(true);
          return;
        }
      }

      setQuestion(res.data.question);
    } catch (error) {
      console.error("Quiz.js - Error loading question:", error);
      // Don't redirect on error - just show alert
      alert("Failed to load question. Please try again.");
    }
  };

  const submitAnswer = async (option) => {
    if (isQuizComplete) return; // Prevent answering after quiz is complete

    try {
      const isCorrect = option === question.correctAnswer;

      // Update score if correct
      if (isCorrect) {
        setScore((prev) => prev + 1);
      }

      const res = await axios.post(`${API_BASE}/api/quiz/answer`, {
        childId,
        questionId: question._id,
        isCorrect,
      });

      // Calculate next question number
      const nextQ = currentQ + 1;
      
      console.log("📊 Quiz - Current Q:", currentQ, "Next Q:", nextQ, "Total:", totalQuestions);
      
      // Check if we've completed all 8 questions FIRST (before checking backend response)
      // After answering question 8, nextQ will be 9, so we mark as complete
      if (nextQ > totalQuestions) {
        console.log("✅ Quiz - Completed all 8 questions! Setting isQuizComplete to true");
        setCurrentQ(totalQuestions); // Keep at 8, don't go to 9
        setIsQuizComplete(true);
        // Clear the question so View Score button shows immediately
        setQuestion(null);
        return; // Don't load next question, quiz is complete
      }

      // Update current question number (we haven't reached 8 yet)
      setCurrentQ(nextQ);

      // IGNORE backend's completed flag - we control the 8-question limit
      // Always try to load the next question if available
      if (res.data.question) {
        setQuestion(res.data.question);
      } else {
        // If no question returned, try to load a new one
        // Don't mark as complete yet - we need 8 questions
        await loadQuestion();
      }
    } catch (error) {
      console.error("Quiz.js - Error submitting answer:", error);
      alert("Failed to submit answer. Please try again.");
    }
  };

  const handleRestart = () => {
    setCurrentQ(1);
    setScore(0);
    setIsQuizComplete(false);
    loadQuestion();
  };

  const handleViewScore = () => {
    // Save score to cookies for scoreboard page
    console.log("💾 Saving score to cookies - score:", score, "total:", totalQuestions);
    cookies.set("quizScore", score.toString(), { path: "/", maxAge: 30 * 24 * 60 * 60 });
    cookies.set("quizTotalQuestions", totalQuestions.toString(), { path: "/", maxAge: 30 * 24 * 60 * 60 });
    
    // Verify cookies were set
    const savedScore = cookies.get("quizScore");
    const savedTotal = cookies.get("quizTotalQuestions");
    console.log("✅ Cookies saved - quizScore:", savedScore, "quizTotalQuestions:", savedTotal);
    
    // Use setTimeout to ensure cookies are saved before navigation
    setTimeout(() => {
      router.push("/scoreboard");
    }, 100);
  };

  // Show loading only if quiz is not complete and question is null
  if (!question && !isQuizComplete) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#1EA0FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h6" sx={{ color: "white" }}>
          Loading quiz…
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#1EA0FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      {/* White Card Container */}
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 900,
          borderRadius: 4,
          bgcolor: "#FFFFFF",
          p: 4,
          position: "relative",
        }}
      >
        {/* Study.Pilot Branding - Top Left */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 3,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: "24px",
              color: "#FF8C00",
            }}
          >
            ✈️
          </Box>
          <Typography
            sx={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#000000",
            }}
          >
            Study.Pilot
          </Typography>
        </Box>

        {/* Progress Indicator */}
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: "16px",
              fontWeight: 500,
              color: "#000000",
              mb: 1,
            }}
          >
            Question {currentQ} of {totalQuestions}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(currentQ / totalQuestions) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "#E0E0E0",
              "& .MuiLinearProgress-bar": {
                bgcolor: "#FF8C00",
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Question Text - Hide when quiz is complete */}
        {!isQuizComplete && question && (
          <>
            <Typography
              sx={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#1EA0FF",
                mb: 4,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              {question.question}
            </Typography>

            {/* Answer Options Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                mb: 4,
              }}
            >
              {question.options.map((option, index) => (
            <Box
              key={option}
              sx={{ position: "relative" }}
              onMouseEnter={() => !isQuizComplete && setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => !isQuizComplete && submitAnswer(option)}
            >
              {/* Elephant on Hover */}
              {hoveredIndex === index && (
                <Box
                  component="img"
                  src={ELEPHANT_IMG}
                  alt="Elephant"
                  sx={{
                    position: "absolute",
                    top: -60,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 70,
                    zIndex: 10,
                  }}
                />
              )}

              {/* Answer Button */}
              <Paper
                elevation={0}
                sx={{
                  height: 70,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 600,
                  cursor: isQuizComplete ? "not-allowed" : "pointer",
                  bgcolor: "#EFEFEF",
                  color: "#000000",
                  transition: "all 0.2s",
                  opacity: isQuizComplete ? 0.6 : 1,
                  "&:hover": {
                    bgcolor: isQuizComplete ? "#EFEFEF" : "#E0E0E0",
                    transform: isQuizComplete ? "none" : "scale(1.02)",
                  },
                }}
              >
                {option}
              </Paper>
            </Box>
          ))}
            </Box>
          </>
        )}

        {/* Completion Message - Show when quiz is complete */}
        {isQuizComplete && (
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              sx={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#1EA0FF",
                mb: 2,
              }}
            >
              🎉 Quiz Completed!
            </Typography>
            <Typography
              sx={{
                fontSize: "20px",
                fontWeight: 600,
                color: "#000000",
                mb: 1,
              }}
            >
              You answered {score} out of {totalQuestions} questions correctly!
            </Typography>
          </Box>
        )}

        {/* View Score Button - Only appears after exactly 8 questions are answered */}
        {isQuizComplete && currentQ === totalQuestions && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              onClick={handleViewScore}
              sx={{
                bgcolor: "#FF8C00",
                color: "#FFFFFF",
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: "16px",
                fontWeight: 600,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#FF7A00",
                },
              }}
            >
              View Score
            </Button>
          </Box>
        )}

        {/* Restart Button - Only show if quiz is not complete */}
        {!isQuizComplete && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRestart}
              sx={{
                bgcolor: "#FF8C00",
                color: "#FFFFFF",
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: "16px",
                fontWeight: 600,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#FF7A00",
                },
              }}
            >
              Restart
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
