import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Head from "next/head";
import { Box, Typography, LinearProgress, Button } from "@mui/material";
import { Poppins } from "next/font/google";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AuthFrame from "../components/common/AuthFrame";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cookies = new Cookies();

export default function ScoreboardPage() {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [feedback, setFeedback] = useState({ message: "", color: "" });

  useEffect(() => {
    const checkCookies = () => {
      const quizData = cookies.get("quizData"); // Already an object
      
      if (!quizData) {
        router.replace("/chapters");
        return;
      }

      const s = parseInt(quizData.score, 10);
      const tQ = parseInt(quizData.totalQuestions, 10);
      const p = tQ > 0 ? Math.round((s / tQ) * 100) : 0;

      setScore(s);
      setTotalQuestions(tQ);
      setPercentage(p);

      if (p >= 80) {
        setFeedback({ message: "Outstanding! Keep up the great work!", color: "#4CAF50" });
      } else if (p >= 60) {
        setFeedback({ message: "Great job! You're doing well!", color: "#FF8C00" });
      } else {
        setFeedback({ message: "Keep practicing! You'll get there!", color: "#F44336" });
      }

      setTimeout(() => {
        cookies.remove("quizData", { path: "/" });
      }, 1000);
    };

    checkCookies();
    const timeout = setTimeout(checkCookies, 200);
    
    return () => clearTimeout(timeout);
  }, [router]);

  const handleGoToLeaderboard = () => {
    router.push("/leaderboard");
  };

  if (totalQuestions === 0) {
    return (
      <>
        <Head>
          <title>Quiz Score - Study.Pilot</title>
        </Head>
        <AuthFrame showBack={true}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
            }}
          >
            <Typography variant="h6" sx={{ color: "#666666" }}>
              Loading score…
            </Typography>
          </Box>
        </AuthFrame>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Quiz Score - Study.Pilot</title>
        <meta name="description" content="Quiz Results" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame showBack={true}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            width: "100%",
            padding: "40px 20px",
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 80, color: "#FFD700", mb: 2 }} />
          
          <Typography
            className={poppins.className}
            sx={{
              fontSize: "36px",
              fontWeight: 700,
              color: "#1EA0FF",
              mb: 1,
              textAlign: "center",
            }}
          >
            Quiz Completed!
          </Typography>
          <Typography
            className={poppins.className}
            sx={{
              fontSize: "28px",
              fontWeight: 600,
              color: "#000000",
              mb: 3,
              textAlign: "center",
            }}
          >
            Your Score: {score} / {totalQuestions}
          </Typography>

          <Box sx={{ width: "100%", maxWidth: 400, mb: 3 }}>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 15,
                borderRadius: 5,
                bgcolor: "#E0E0E0",
                "& .MuiLinearProgress-bar": {
                  bgcolor: feedback.color,
                  borderRadius: 5,
                },
              }}
            />
            <Typography
              className={poppins.className}
              sx={{
                mt: 1,
                color: feedback.color,
                fontWeight: 600,
                fontSize: "16px",
                textAlign: "center",
              }}
            >
              {percentage}% - {feedback.message}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleGoToLeaderboard}
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
              mt: 2,
            }}
          >
            Go to Leaderboard 🏆
          </Button>
        </Box>
      </AuthFrame>
    </>
  );
}

