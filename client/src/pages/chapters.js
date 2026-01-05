import Image from "next/image";
import Head from "next/head";
import { Box, Chip, Button, Typography } from "@mui/material";
import blackLogo from "../../public/Black logo (1).png";
import { useRouter } from "next/router";
import { Poppins } from "next/font/google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import AuthFrame from "../components/common/AuthFrame";
import UserProfileMenu from "../components/common/UserProfileMenu";
import { useState, useEffect } from "react";
import axios from "axios";
import { Cookies } from "react-cookie";
import CardMembershipIcon from "@mui/icons-material/CardMembership";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cookies = new Cookies();

export default function Chapters() {
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [chaptersProgress, setChaptersProgress] = useState({});
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = cookies.get("token");
  const parentEmail = cookies.get("parentEmail");
  const selectedChildId = cookies.get("selectedChildId");
  const selectedChildClass = cookies.get("selectedChildClass");
  const selectedSubjectName = cookies.get("selectedSubjectName");
  const selectedSubjectId = cookies.get("selectedSubjectId");

  useEffect(() => {
    if (token && parentEmail) {
      fetchSubscriptionStatus();
      fetchChapters();
    }
  }, [token, parentEmail, selectedChildId, selectedSubjectId]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get("/api/v1/parent/subscription", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        setSubscriptionStatus(response.data.status || "trial");
      }
    } catch (error) {
      // Default to trial if subscription check fails
      setSubscriptionStatus("trial");
    }
  };

  const fetchChapters = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedSubjectId || !selectedChildId) {
        setError("Subject or Child information missing");
        setLoading(false);
        return;
      }

      // Fetch chapters with progress for this subject
      const chaptersResponse = await axios.get(
        `/api/v1/chapters/by-subject/${selectedSubjectId}`,
        {
          params: {
            childId: selectedChildId,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (chaptersResponse.status === 200) {
        const dbChapters = chaptersResponse.data.chapters || [];
        
        // Map backend chapters to frontend format
        const mappedChapters = dbChapters.map((chapter, index) => {
          const isFirstChapter = index === 0;
          const status = chapter.status || "locked";
          
          // Generate colors based on index
          const colors = [
            { icon: "#4A90E2", box: "#E3F2FD" },
            { icon: "#9B59B6", box: "#F3E5F5" },
            { icon: "#F39C12", box: "#FFF3E0" },
            { icon: "#E91E63", box: "#FCE4EC" },
            { icon: "#1ABC9C", box: "#E0F2F1" },
            { icon: "#F1C40F", box: "#FFFDE7" },
          ];
          const colorIndex = index % colors.length;
          const chapterColors = colors[colorIndex];

          return {
            id: chapter._id,
            _id: chapter._id,
            name: chapter.name,
            description: chapter.description || "Learn and explore this chapter.",
            status: status,
            progress: chapter.progress || (status === "completed" ? 100 : status === "in-progress" ? 0 : 0),
            iconColor: chapterColors.icon,
            boxColor: chapterColors.box,
            iconContent: (index + 1).toString(),
            actionText: status === "completed" ? "Review Chapter →" : 
                       status === "in-progress" ? "Continue →" : 
                       isFirstChapter ? "Start Chapter →" : "Complete previous",
            actionColor: status === "locked" && !isFirstChapter ? "#CCCCCC" : chapterColors.icon,
            isFirstChapter: isFirstChapter,
          };
        });
        
        setChapters(mappedChapters);
        
        // Also create progress map for backward compatibility
        const progressMap = {};
        dbChapters.forEach((ch) => {
          progressMap[ch.name.toLowerCase().trim()] = ch.status;
        });
        setChaptersProgress(progressMap);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
      setError("Failed to load chapters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Chapters are now fetched from backend - see fetchChapters()

  const getStatusBadge = (status, isFirstChapter) => {
    if (status === "completed") {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "#27AE60",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          <CheckCircleIcon sx={{ fontSize: "16px" }} />
          Completed
        </Box>
      );
    } else if (status === "in-progress") {
      return (
        <Box
          sx={{
            backgroundColor: "#9B59B6",
            color: "#FFFFFF",
            padding: "3px 10px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "500",
          }}
        >
          In Progress
        </Box>
      );
    } else if (isFirstChapter) {
      // First chapter is always free
      return (
        <Chip
          label="FREE"
          sx={{
            backgroundColor: "#4CAF50",
            color: "white",
            fontSize: "11px",
            fontWeight: "600",
            height: "24px",
          }}
        />
      );
    } else {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "#999999",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          <LockIcon sx={{ fontSize: "16px" }} />
          Locked
        </Box>
      );
    }
  };

  const getProgressBarColor = (status, progress) => {
    if (status === "completed") return "#27AE60";
    if (status === "in-progress") return "#F39C12";
    return "#E0E0E0";
  };

  const getIcon = (chapter) => {
    // All icons are circles with the same shape
    return (
      <Box
        sx={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          backgroundColor: chapter.iconColor,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: "600",
          flexShrink: 0,
        }}
      >
        {chapter.iconContent}
      </Box>
    );
  };

  return (
    <>
      <Head>
        <title>Chapters - Study.Pilot</title>
        <meta name="description" content="Choose a chapter to start your mathematical journey" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame
        showBack={true}
        customHeader={
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            {/* Left: Logo and Back Button */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <div className="navbar-logo">
                <Image src={blackLogo} alt="Study Pilot Logo" height={25} />
              </div>
              <button
                className="back-btn"
                onClick={() => router.back()}
              >
                ←
              </button>
            </Box>

            {/* Center: Title */}
            <Box
              sx={{
                textAlign: "center",
                flex: 1,
                marginX: 3,
              }}
            >
              <h1
                className={poppins.className}
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  margin: 0,
                  marginBottom: "6px",
                  color: "#000000",
                }}
              >
                Start Your Adventure!
              </h1>
              <p
                className={poppins.className}
                style={{
                  fontSize: "14px",
                  color: "#666666",
                  margin: 0,
                }}
              >
                Choose a chapter to select your mathematical journey.
              </p>
            </Box>

            {/* Right: User Profile Menu */}
            <UserProfileMenu />
          </Box>
        }
      >
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column", paddingTop: "20px" }}>
          {/* Chapter Grid */}
          {loading ? (
            <Typography>Loading chapters...</Typography>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : chapters.length === 0 ? (
            <Typography>No chapters available for this subject.</Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: "16px",
                paddingBottom: "20px",
              }}
            >
              {chapters.map((chapter) => (
              <Box
                key={chapter.id}
                sx={{
                  border: "1px solid #E0E0E0",
                  borderRadius: "14px",
                  padding: "16px",
                  backgroundColor: chapter.boxColor,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 6px 12px rgba(0,0,0,0.1)",
                  },
                  cursor: chapter.status === "locked" && !chapter.isFirstChapter ? "not-allowed" : "pointer",
                  opacity: chapter.status === "locked" && !chapter.isFirstChapter ? 0.7 : 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "fit-content",
                }}
                onClick={async () => {
                  if (chapter.status === "locked" && !chapter.isFirstChapter) {
                    if (subscriptionStatus !== "active") {
                      router.push("/subscription");
                    }
                    return;
                  }

                  try {
                    let dbChapter = null;

                    // Try to get all chapters first
                    try {
                      const allChaptersResponse = await axios.get("/api/v1/chapters/all/get");
                      if (allChaptersResponse.status === 200) {
                        const allChapters = allChaptersResponse.data.chapters || 
                                          allChaptersResponse.data || 
                                          [];
                        const searchName = (chapter.name || "").toLowerCase().trim();
                        dbChapter = allChapters.find(
                          ch => ch && ch.name && String(ch.name).toLowerCase().trim() === searchName
                        );
                        
                        if (dbChapter && dbChapter._id) {
                          router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass || 1}`);
                          return;
                        }
                      }
                    } catch (publicError) {
                      // Continue to fallback
                    }

                    // Fallback: Try with subject-based lookup
                    if (!dbChapter && selectedSubjectName && selectedChildClass && token) {
                      const subjectsResponse = await axios.get("/api/v1/subject/all/get");
                      if (subjectsResponse.status === 200) {
                        const allSubjects = subjectsResponse.data.subjects || [];
                        const subject = allSubjects.find(
                          s => s.name.toLowerCase().trim() === selectedSubjectName.toLowerCase().trim() && 
                               s.classnumber === parseInt(selectedChildClass)
                        );

                        if (subject) {
                          try {
                            const chaptersResponse = await axios.get(`/api/v1/chapters/by-subject/${subject._id}`, {
                              params: { childId: selectedChildId },
                              headers: { Authorization: `Bearer ${token}` },
                            });

                            if (chaptersResponse.status === 200) {
                              const dbChapters = chaptersResponse.data.chapters || [];
                              dbChapter = dbChapters.find(
                                ch => ch.name.toLowerCase().trim() === chapter.name.toLowerCase().trim()
                              );

                              if (dbChapter && dbChapter._id) {
                                router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass}`);
                                return;
                              }
                            }
                          } catch (chaptersError) {
                            // Try fallback to all chapters
                            try {
                              const allChaptersResponse = await axios.get("/api/v1/chapters/all/get");
                              if (allChaptersResponse.status === 200) {
                                const allChapters = allChaptersResponse.data.chapters || [];
                                dbChapter = allChapters.find(
                                  ch => ch.name.toLowerCase().trim() === chapter.name.toLowerCase().trim() &&
                                       ch.subjectId && ch.subjectId.toString() === subject._id.toString()
                                );
                                if (dbChapter && dbChapter._id) {
                                  router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass}`);
                                  return;
                                }
                              }
                            } catch (fallbackError) {
                              // Continue to error message
                            }
                          }
                        }
                      }
                    }

                    // Final fallback: Try public endpoint again
                    if (!dbChapter) {
                      try {
                        const allChaptersResponse = await axios.get("/api/v1/chapters/all/get");
                        if (allChaptersResponse.status === 200) {
                          const allChapters = allChaptersResponse.data.chapters || [];
                          const searchName = (chapter.name || "").toLowerCase().trim();
                          dbChapter = allChapters.find(
                            ch => ch && ch.name && String(ch.name).toLowerCase().trim() === searchName
                          );
                          if (dbChapter && dbChapter._id) {
                            router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass || 1}`);
                            return;
                          }
                        }
                      } catch (fallbackError) {
                        // Continue to error message
                      }
                    }

                    if (!dbChapter) {
                      alert(`Chapter "${chapter.name}" not found. Please try again.`);
                    }
                  } catch (error) {
                    console.error("Error fetching chapter:", error);
                    alert("Error loading chapter. Please try again.");
                  }
                }}
              >
                {/* Icon and Status */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  {getIcon(chapter)}
                  {getStatusBadge(chapter.status, chapter.isFirstChapter)}
                </Box>

                {/* Title with Status */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h3
                    className={poppins.className}
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      margin: 0,
                      color: "#000000",
                      lineHeight: "1.3",
                      flex: 1,
                    }}
                  >
                    {chapter.name}
                  </h3>
                  {chaptersProgress[chapter.name.toLowerCase().trim()] && (
                    <Box
                      sx={{
                        marginLeft: "8px",
                        padding: "2px 8px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "600",
                        backgroundColor: chaptersProgress[chapter.name.toLowerCase().trim()] === "completed" 
                          ? "#E8F5E9" 
                          : chaptersProgress[chapter.name.toLowerCase().trim()] === "in-progress"
                          ? "#FFF3E0"
                          : "transparent",
                        color: chaptersProgress[chapter.name.toLowerCase().trim()] === "completed"
                          ? "#27AE60"
                          : chaptersProgress[chapter.name.toLowerCase().trim()] === "in-progress"
                          ? "#F39C12"
                          : "#999",
                      }}
                    >
                      {chaptersProgress[chapter.name.toLowerCase().trim()] === "completed" 
                        ? "Completed" 
                        : chaptersProgress[chapter.name.toLowerCase().trim()] === "in-progress"
                        ? "In Progress"
                        : ""}
                    </Box>
                  )}
                </Box>

                {/* Description */}
                <p
                  className={poppins.className}
                  style={{
                    fontSize: "13px",
                    color: "#666666",
                    margin: 0,
                    marginBottom: "12px",
                    lineHeight: "1.4",
                    minHeight: "36px",
                  }}
                >
                  {chapter.description}
                </p>

                {/* Progress Bar */}
                <Box
                  sx={{
                    width: "100%",
                    height: "7px",
                    backgroundColor: "#E0E0E0",
                    borderRadius: "4px",
                    marginBottom: "12px",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${chapter.progress}%`,
                      height: "100%",
                      backgroundColor: getProgressBarColor(
                        chapter.status,
                        chapter.progress
                      ),
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </Box>

                {/* Action Button */}
                {chapter.status === "locked" && !chapter.isFirstChapter && subscriptionStatus !== "active" ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/subscription");
                    }}
                    variant="contained"
                    startIcon={<CardMembershipIcon />}
                    fullWidth
                    sx={{
                      backgroundColor: "#0B91FF",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: "600",
                      padding: "8px",
                      "&:hover": {
                        backgroundColor: "#0A7FD9",
                      },
                    }}
                  >
                    Subscribe to Unlock
                  </Button>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: chapter.actionColor,
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: chapter.status === "locked" && !chapter.isFirstChapter ? "not-allowed" : "pointer",
                    }}
                  >
                    {chapter.status === "locked" && !chapter.isFirstChapter && (
                      <LockIcon sx={{ fontSize: "16px" }} />
                    )}
                    <span>{chapter.actionText}</span>
                  </Box>
                )}
              </Box>
            ))}
            </Box>
          )}
        </Box>
      </AuthFrame>
    </>
  );
}
