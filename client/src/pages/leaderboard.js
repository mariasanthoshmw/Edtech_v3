import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Head from "next/head";
import AuthFrame from "../components/common/AuthFrame";
import UserProfileMenu from "../components/common/UserProfileMenu";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Stack,
  Skeleton,
  Divider,
  LinearProgress,
  Button,
} from "@mui/material";
import { Poppins } from "next/font/google";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
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

  // Get combined child cookie (already an object)
  const selectedChild = cookies.get("selectedChild");

  const selectedChildId = selectedChild?.id;
  const selectedChildName = selectedChild?.name;
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
        validateStatus: (status) => status === 200 || status === 401 || status === 403,
      });

      if (childResponse.status === 401 || childResponse.status === 403) {
        cookies.remove("token", { path: "/" });
        router.push("/");
        return;
      }
      
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
      cookies.remove("token", { path: "/" });
      router.push("/");
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

  const getMedalStyles = (rank) => {
    if (rank === 1) return { bg: "linear-gradient(135deg, #FFE082 0%, #FFD54F 100%)", border: "#FFD700" };
    if (rank === 2) return { bg: "linear-gradient(135deg, #ECEFF1 0%, #CFD8DC 100%)", border: "#B0BEC5" };
    if (rank === 3) return { bg: "linear-gradient(135deg, #FFCCBC 0%, #FFAB91 100%)", border: "#FF8A65" };
    return { bg: "#F5F5F5", border: "#E0E0E0" };
  };

  const PodiumCard = ({ entry }) => {
    if (!entry) return null;
    const styles = getMedalStyles(entry.rank);

    return (
      <Card
        sx={{
          borderRadius: 3,
          border: `2px solid ${styles.border}`,
          background: styles.bg,
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: 26, fontWeight: 900 }}>{getRankIcon(entry.rank)}</Typography>
            <Chip
              icon={<TrendingUpIcon />}
              label={`${entry.score} XP`}
              sx={{
                backgroundColor: "rgba(0,0,0,0.75)",
                color: "white",
                fontWeight: 800,
                "& .MuiChip-icon": { color: "white" },
              }}
            />
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                fontSize: 32,
                backgroundColor: "rgba(255,255,255,0.7)",
                border: `2px solid ${styles.border}`,
              }}
            >
              {entry.emoji || "👤"}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                className={poppins.className}
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#111",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.name}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(0,0,0,0.65)", fontWeight: 700 }}>
                Top Performer
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
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
            padding: { xs: "10px", md: "20px" },
            maxWidth: "800px",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* User Profile Menu - Top Right */}
          <Box sx={{ position: "absolute", right: 20, top: 0 }}>
            <UserProfileMenu />
          </Box>

          <Card
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              background: "linear-gradient(135deg, #0B91FF 0%, #6EC6FF 100%)",
              color: "white",
              mb: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <EmojiEventsIcon sx={{ fontSize: 40, color: "#FFD700" }} />
                <Box>
                  <Typography
                    className={poppins.className}
                    sx={{ fontSize: { xs: 26, md: 34 }, fontWeight: 900, lineHeight: 1.1 }}
                  >
                    Leaderboard
                  </Typography>
                  <Typography sx={{ opacity: 0.9, fontWeight: 600, fontSize: 13 }}>
                    Celebrate progress and climb the ranks!
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {loading ? (
            <Box>
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3, mb: 2 }} />
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3, mb: 2 }} />
              <Skeleton variant="rounded" height={110} sx={{ borderRadius: 3, mb: 2 }} />
              <Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} />
            </Box>
          ) : (
            <>
              {/* Podium (Top 3) */}
              <Card
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography className={poppins.className} sx={{ fontSize: 18, fontWeight: 900 }}>
                      Top Champions
                    </Typography>
                    <Chip
                      label="This Week"
                      size="small"
                      sx={{ backgroundColor: "#E3F2FD", fontWeight: 800, color: "#0B91FF" }}
                    />
                  </Stack>

                  {top5.length === 0 ? (
                    <Typography className={poppins.className} sx={{ textAlign: "center", color: "#666666", py: 3 }}>
                      No rankings yet. Be the first!
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                        gap: 2,
                      }}
                    >
                      <PodiumCard entry={top5.find((e) => e.rank === 1) || top5[0]} />
                      <PodiumCard entry={top5.find((e) => e.rank === 2) || top5[1]} />
                      <PodiumCard entry={top5.find((e) => e.rank === 3) || top5[2]} />
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Top 5 List */}
              <Card
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography className={poppins.className} sx={{ fontSize: 18, fontWeight: 900, mb: 2 }}>
                    Top 5 Learners
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1.25}>
                    {top5.length === 0 ? (
                      <Typography className={poppins.className} sx={{ textAlign: "center", color: "#666666" }}>
                        No rankings yet. Be the first!
                      </Typography>
                    ) : (
                      top5.map((entry) => {
                        return (
                          <Box
                            key={`${entry.rank}-${entry.name}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              p: 1.5,
                              borderRadius: 2,
                              border: "1px solid #E0E0E0",
                              backgroundColor: "#FAFAFA",
                            }}
                          >
                            <Box
                              sx={{
                                width: 42,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                fontSize: 20,
                                fontWeight: 900,
                              }}
                            >
                              {getRankIcon(entry.rank)}
                            </Box>
                            <Avatar sx={{ width: 44, height: 44, fontSize: 26, backgroundColor: "#E3F2FD" }}>
                              {entry.emoji || "👤"}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                className={poppins.className}
                                sx={{ fontSize: 16, fontWeight: 800, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                              >
                                {entry.name}
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(100, Math.max(0, (entry.score / Math.max(1, top5?.[0]?.score || entry.score)) * 100))}
                                  sx={{
                                    height: 6,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(11,145,255,0.15)",
                                    "& .MuiLinearProgress-bar": { borderRadius: 999, backgroundColor: "#0B91FF" },
                                  }}
                                />
                              </Box>
                            </Box>
                            <Chip
                              icon={<TrendingUpIcon />}
                              label={`${entry.score} XP`}
                              sx={{
                                backgroundColor: "#0B91FF",
                                color: "white",
                                fontWeight: 800,
                                "& .MuiChip-icon": { color: "white" },
                              }}
                            />
                          </Box>
                        );
                      })
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* User Position */}
              {userPosition && (
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                    border: "2px solid #0B91FF",
                    background: "linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                      <Typography className={poppins.className} sx={{ fontSize: 18, fontWeight: 900 }}>
                        Your Position
                      </Typography>
                      <Chip
                        label={`Rank #${userPosition.rank}`}
                        sx={{ backgroundColor: "#0B91FF", color: "white", fontWeight: 900 }}
                      />
                    </Stack>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        backgroundColor: "white",
                        borderRadius: 2,
                        border: "1px solid #E3F2FD",
                      }}
                    >
                      <Avatar sx={{ width: 56, height: 56, fontSize: 32, backgroundColor: "#E3F2FD" }}>
                        {userPosition.user?.emoji || "👤"}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography className={poppins.className} sx={{ fontSize: 16, fontWeight: 900, color: "#111" }}>
                          {userPosition.user?.name || selectedChildName}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#666", fontWeight: 700 }}>
                          Keep going — you’re getting better every day!
                        </Typography>
                      </Box>
                      <Chip
                        icon={<TrendingUpIcon />}
                        label={`${userPosition.score} XP`}
                        sx={{
                          backgroundColor: "#0B91FF",
                          color: "white",
                          fontWeight: 900,
                          "& .MuiChip-icon": { color: "white" },
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
                  borderRadius: 3,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "18px",
                      fontWeight: 900,
                      marginBottom: 2,
                    }}
                  >
                    Weekly Goals
                  </Typography>

                  <Stack spacing={1}>
                    {[
                      "Complete 5 chapters this week",
                      "Score 80%+ on 3 quizzes",
                      "Earn 100 XP points",
                    ].map((goal) => (
                      <Box key={goal} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#0B91FF" }} />
                        <Typography className={poppins.className} sx={{ fontSize: 14, color: "#555", fontWeight: 700 }}>
                          {goal}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                <Button
                  onClick={() => router.push("/chapters")}
                  variant="contained"
                  startIcon={<ArrowBackIosNewIcon />}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    backgroundColor: "#FE8F11",
                    color: "white",
                    borderRadius: 3,
                    px: 3,
                    py: 1.25,
                    fontWeight: 900,
                    textTransform: "none",
                    boxShadow: "0 8px 18px rgba(254, 143, 17, 0.25)",
                    "&:hover": { backgroundColor: "#E57F0F" },
                  }}
                >
                  Back to Chapters
                </Button>
              </Box>
            </>
          )}
        </Box>
      </AuthFrame>
    </>
  );
}
