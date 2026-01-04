import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Head from "next/head";
import AuthFrame from "../components/common/AuthFrame";
import { Box, Card, CardContent, Typography, Chip, Avatar } from "@mui/material";
import { Poppins } from "next/font/google";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cookies = new Cookies();

export default function Leaderboard() {
  const [top5, setTop5] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const selectedChildId = cookies.get("selectedChildId");
  const selectedChildName = cookies.get("selectedChildName");
  const token = cookies.get("token");

  useEffect(() => {
    if (!selectedChildId || !token) {
      router.push("/profiles");
      return;
    }
    fetchLeaderboard();
  }, [selectedChildId, token]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // Get child's class from profile
      const childResponse = await axios.get("/api/v1/parent/children", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const child = childResponse.data.children.find(c => c.id === selectedChildId);
      if (!child) {
        router.push("/profiles");
        return;
      }

      const response = await axios.get("/api/v1/leaderboard", {
        params: {
          userId: selectedChildId,
          classno: child.classno,
        },
      });

      if (response.status === 200) {
        setTop5(response.data.top5 || []);
        setUserPosition(response.data.userPosition);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <>
      <Head>
        <title>Leaderboard</title>
        <meta name="description" content="Leaderboard rankings" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame showBack={true}>
        <Box
          sx={{
            width: "100%",
            padding: "20px",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginBottom: 4,
            }}
          >
            <EmojiEventsIcon sx={{ fontSize: 40, color: "#FFD700" }} />
            <Typography
              className={poppins.className}
              sx={{
                fontSize: { xs: "28px", md: "36px" },
                fontWeight: "700",
                color: "#000000",
              }}
            >
              Leaderboard
            </Typography>
          </Box>

          {loading ? (
            <Typography className={poppins.className}>Loading leaderboard...</Typography>
          ) : (
            <>
              {/* Top 5 */}
              <Card
                sx={{
                  marginBottom: 4,
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "20px",
                      fontWeight: "700",
                      marginBottom: 3,
                      textAlign: "center",
                    }}
                  >
                    Top 5 Learners
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {top5.length === 0 ? (
                      <Typography
                        className={poppins.className}
                        sx={{ textAlign: "center", color: "#666666" }}
                      >
                        No rankings yet. Be the first!
                      </Typography>
                    ) : (
                      top5.map((entry, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            padding: 2,
                            backgroundColor: index < 3 ? "#FFF9E6" : "#F9F9F9",
                            borderRadius: "8px",
                            border: index === 0 ? "2px solid #FFD700" : "1px solid #E0E0E0",
                          }}
                        >
                          <Typography
                            className={poppins.className}
                            sx={{
                              fontSize: "24px",
                              fontWeight: "700",
                              minWidth: "50px",
                              textAlign: "center",
                            }}
                          >
                            {getRankIcon(entry.rank)}
                          </Typography>
                          <Avatar
                            sx={{
                              width: 50,
                              height: 50,
                              fontSize: "30px",
                              backgroundColor: "#E3F2FD",
                            }}
                          >
                            {entry.emoji || "👤"}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              className={poppins.className}
                              sx={{
                                fontSize: "18px",
                                fontWeight: "600",
                                color: "#000000",
                              }}
                            >
                              {entry.name}
                            </Typography>
                          </Box>
                          <Chip
                            icon={<TrendingUpIcon />}
                            label={`${entry.score} XP`}
                            sx={{
                              backgroundColor: "#0B91FF",
                              color: "white",
                              fontWeight: "600",
                            }}
                          />
                        </Box>
                      ))
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* User Position */}
              {userPosition && (
                <Card
                  sx={{
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: "2px solid #0B91FF",
                    backgroundColor: "#E3F2FD",
                  }}
                >
                  <CardContent sx={{ padding: 3 }}>
                    <Typography
                      className={poppins.className}
                      sx={{
                        fontSize: "20px",
                        fontWeight: "700",
                        marginBottom: 2,
                        textAlign: "center",
                      }}
                    >
                      Your Position
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        padding: 2,
                        backgroundColor: "white",
                        borderRadius: "8px",
                      }}
                    >
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "24px",
                          fontWeight: "700",
                          minWidth: "50px",
                          textAlign: "center",
                        }}
                      >
                        #{userPosition.rank}
                      </Typography>
                      <Avatar
                        sx={{
                          width: 50,
                          height: 50,
                          fontSize: "30px",
                          backgroundColor: "#E3F2FD",
                        }}
                      >
                        {userPosition.user?.emoji || "👤"}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          className={poppins.className}
                          sx={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#000000",
                          }}
                        >
                          {userPosition.user?.name || selectedChildName}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<TrendingUpIcon />}
                        label={`${userPosition.score} XP`}
                        sx={{
                          backgroundColor: "#0B91FF",
                          color: "white",
                          fontWeight: "600",
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Goals */}
              <Card
                sx={{
                  marginTop: 4,
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  backgroundColor: "#F9F9F9",
                }}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: 2,
                    }}
                  >
                    Weekly Goals
                  </Typography>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "14px",
                      color: "#666666",
                      marginBottom: 1,
                    }}
                  >
                    • Complete 5 chapters this week
                  </Typography>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "14px",
                      color: "#666666",
                      marginBottom: 1,
                    }}
                  >
                    • Score 80%+ on 3 quizzes
                  </Typography>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "14px",
                      color: "#666666",
                    }}
                  >
                    • Earn 100 XP points
                  </Typography>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      </AuthFrame>
    </>
  );
}
