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
  const [scoreSaved, setScoreSaved] = useState(false);

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
      router.replace("/");
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


  const saveQuizScore = async (finalScore = null) => {
    if (scoreSaved) {
      console.log("⚠️ QUIZ - Score already saved, skipping...");
      return;
    }

    try {
      const token = cookies.get("token");
      if (!token || !childId || !chapterId) {
        console.log("❌ QUIZ - Cannot save score: missing token, childId, or chapterId");
        return;
      }

      const scoreToSave = finalScore !== null ? finalScore : score;
      const percentage = Math.round((scoreToSave / totalQuestions) * 100);

      console.log("📤 QUIZ - Saving score to database:", {
        childId,
        chapterId,
        score: scoreToSave,
        totalMarks: totalQuestions,
        percentage
      });

      const response = await axios.post(
        `${API_BASE}/api/v1/quiz/save-score`,
        {
          childId,
          chapterId,
          score: scoreToSave,
          totalMarks: totalQuestions,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("✅ QUIZ - Score saved successfully:", response.data);
      setScoreSaved(true);
    } catch (error) {
      console.error("❌ QUIZ - Error saving quiz score:", error);
      if (error.response) {
        console.error("❌ QUIZ - Error response:", error.response.data);
      }
    }
  };

  const loadQuestion = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/quiz/start`, {
        params: { childId, subject, chapterId },
      });

      if (currentQ >= totalQuestions) {
        setIsQuizComplete(true);
        await saveQuizScore();
        return;
      }

      if (!res.data.question) {
        if (currentQ < totalQuestions) {
          alert("No question available. Please try again.");
          return;
        } else {
          setIsQuizComplete(true);
          await saveQuizScore();
          return;
        }
      }

      setQuestion(res.data.question);
    } catch (error) {
      console.error("Error loading question:", error);
      alert("Failed to load question. Please try again.");
    }
  };

  const submitAnswer = async (option) => {
    if (isQuizComplete) return; // Prevent answering after quiz is complete

    try {
      const isCorrect = option === question.correctAnswer;

      // Calculate updated score
      const updatedScore = isCorrect ? score + 1 : score;

      // Update score if correct
      if (isCorrect) {
        setScore((prev) => prev + 1);
      }

      const res = await axios.post(`${API_BASE}/api/quiz/answer`, {
        childId,
        questionId: question._id,
        isCorrect,
      });

      const nextQ = currentQ + 1;
      
      if (nextQ > totalQuestions) {
        setCurrentQ(totalQuestions);
        setIsQuizComplete(true);
        setQuestion(null);
        
        // Save score to database when quiz completes - use updated score
        await saveQuizScore(updatedScore);
        return;
      }

      setCurrentQ(nextQ);

      if (res.data.question) {
        setQuestion(res.data.question);
      } else {
        await loadQuestion();
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      alert("Failed to submit answer. Please try again.");
    }
  };

  const handleRestart = () => {
    setCurrentQ(1);
    setScore(0);
    setIsQuizComplete(false);
    setScoreSaved(false);
    loadQuestion();
  };

  const handleViewScore = () => {
    cookies.set("quizScore", score.toString(), { path: "/", maxAge: 30 * 24 * 60 * 60 });
    cookies.set("quizTotalQuestions", totalQuestions.toString(), { path: "/", maxAge: 30 * 24 * 60 * 60 });
    setTimeout(() => {
      router.push("/scoreboard");
    }, 100);
  };

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
