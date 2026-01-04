import Image from "next/image";
import Head from "next/head";
import { Box, Avatar, Chip, Button, Typography } from "@mui/material";
import blackLogo from "../../public/Black logo (1).png";
import { useRouter } from "next/router";
import { Poppins } from "next/font/google";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";
import AuthFrame from "../components/common/AuthFrame";
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
  const token = cookies.get("token");
  const parentEmail = cookies.get("parentEmail");
  const selectedChildId = cookies.get("selectedChildId");
  const selectedChildClass = cookies.get("selectedChildClass");
  const selectedSubjectName = cookies.get("selectedSubjectName");

  useEffect(() => {
    if (token && parentEmail) {
      fetchSubscriptionStatus();
      fetchChaptersProgress();
    }
  }, [token, parentEmail, selectedChildId]);

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
      console.error("Error fetching subscription:", error);
    }
  };

  const fetchChaptersProgress = async () => {
    try {
      if (!selectedSubjectName || !selectedChildClass) return;

      // Get subject by name and class
      const subjectsResponse = await axios.get("/api/v1/subject/all/get");
      
      if (subjectsResponse.status === 200) {
        const allSubjects = subjectsResponse.data.subjects || [];
        const subject = allSubjects.find(
          (s) => s.name.toLowerCase().trim() === selectedSubjectName.toLowerCase().trim() && 
               s.classnumber === parseInt(selectedChildClass)
        );

        if (subject && subject._id) {
          // Fetch chapters with progress for this subject
          const chaptersResponse = await axios.get(
            `/api/v1/chapters/by-subject/${subject._id}`,
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
            
            // Create a map of chapter name to status
            const progressMap = {};
            dbChapters.forEach((ch) => {
              progressMap[ch.name.toLowerCase().trim()] = ch.status;
            });
            
            setChaptersProgress(progressMap);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching chapters progress:", error);
    }
  };

  const chapters = [
    {
      id: 1,
      name: "Number magic",
      description: "Master the basics of counting and number patterns.",
      status: "completed",
      progress: 100,
      iconColor: "#4A90E2",
      boxColor: "#E3F2FD",
      iconContent: "1",
      actionText: "Review Chapter →",
      actionColor: "#4A90E2",
    },
    {
      id: 2,
      name: "Addition and Subtraction",
      description: "Learn to combine numbers and take them away.",
      status: "in-progress",
      progress: 65,
      iconColor: "#9B59B6",
      boxColor: "#F3E5F5",
      iconContent: "+/-",
      actionText: "Continue →",
      actionColor: "#9B59B6",
    },
    {
      id: 3,
      name: "Shapes and Geometry",
      description: "Discover triangles squares and circles around you.",
      status: "locked",
      progress: 0,
      iconColor: "#F39C12",
      boxColor: "#FFF3E0",
      iconContent: "△",
      actionText: "Complete previous",
      actionColor: "#CCCCCC",
    },
    {
      id: 4,
      name: "Time and Clocks",
      description: "Learn how to read the clock and manage time.",
      status: "locked",
      progress: 0,
      iconColor: "#E91E63",
      boxColor: "#FCE4EC",
      iconContent: "🕐",
      actionText: "Complete previous",
      actionColor: "#CCCCCC",
    },
    {
      id: 5,
      name: "Patterns and Sequences",
      description: "Find and continue fun patterns using colors, shapes, and numbers.",
      status: "locked",
      progress: 0,
      iconColor: "#1ABC9C",
      boxColor: "#E0F2F1",
      iconContent: "🔄",
      actionText: "Complete previous",
      actionColor: "#CCCCCC",
    },
    {
      id: 6,
      name: "Money",
      description: "Learn to count money and understand the money around you.",
      status: "locked",
      progress: 0,
      iconColor: "#F1C40F",
      boxColor: "#FFFDE7",
      iconContent: "💰",
      actionText: "Complete previous",
      actionColor: "#CCCCCC",
    },
  ];

  const getStatusBadge = (status, chapterId) => {
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
    } else if (chapterId === 1) {
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
            color: "#999999",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
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

            {/* Right: Avatar */}
            <Avatar
              sx={{
                width: 44,
                height: 44,
                backgroundColor: "#F39C12",
                fontSize: "18px",
              }}
            >
              U
            </Avatar>
          </Box>
        }
      >
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column", paddingTop: "20px" }}>
          {/* Chapter Grid */}
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
                  cursor: chapter.status === "locked" && chapter.id !== 1 ? "not-allowed" : "pointer",
                  opacity: chapter.status === "locked" && chapter.id !== 1 ? 0.7 : 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "fit-content",
                }}
                onClick={async () => {
                  if (chapter.status === "locked" && chapter.id !== 1) {
                    if (subscriptionStatus !== "active") {
                      router.push("/subscription");
                    }
                    return;
                  }

                  // Navigate to learn page with chapter from database
                  try {
                    console.log("Chapter clicked:", chapter.name);
                    console.log("Selected subject:", selectedSubjectName);
                    console.log("Selected class:", selectedChildClass);
                    console.log("Token exists:", !!token);

                    // First, try to get all chapters (public endpoint, no auth needed)
                    try {
                      console.log("Fetching all chapters from public endpoint...");
                      const allChaptersResponse = await axios.get("/api/v1/chapters/all/get");
                      console.log("Response status:", allChaptersResponse.status);
                      console.log("Full response:", JSON.stringify(allChaptersResponse.data, null, 2));
                      
                      if (allChaptersResponse.status === 200) {
                        // Handle different response structures
                        const allChapters = allChaptersResponse.data.chapters || 
                                          allChaptersResponse.data || 
                                          [];
                        console.log("Total chapters found:", allChapters.length);
                        console.log("All chapters from DB:", allChapters.map(ch => ({ 
                          _id: ch._id, 
                          name: ch.name, 
                          subjectId: ch.subjectId 
                        })));
                        
                        if (allChapters.length === 0) {
                          console.error("No chapters returned from API");
                        }
                        
                        // Find chapter by name (exact match, case-insensitive)
                        const searchName = (chapter.name || "").toLowerCase().trim();
                        console.log("Searching for chapter name:", searchName);
                        
                        const dbChapter = allChapters.find(
                          ch => {
                            if (!ch || !ch.name) return false;
                            const dbName = String(ch.name).toLowerCase().trim();
                            const matches = dbName === searchName;
                            if (matches || dbName.includes(searchName) || searchName.includes(dbName)) {
                              console.log("Name comparison:", {
                                dbName,
                                searchName,
                                exactMatch: dbName === searchName,
                                dbNameIncludes: dbName.includes(searchName),
                                searchNameIncludes: searchName.includes(dbName)
                              });
                            }
                            return dbName === searchName;
                          }
                        );
                        
                        console.log("Matching result:", dbChapter ? {
                          _id: dbChapter._id,
                          name: dbChapter.name,
                          subjectId: dbChapter.subjectId
                        } : "NOT FOUND");
                        
                        if (dbChapter && dbChapter._id) {
                          const chapterId = String(dbChapter._id);
                          console.log("✅ Found chapter via public endpoint!");
                          console.log("Chapter ID:", chapterId);
                          console.log("Chapter name:", dbChapter.name);
                          console.log("Redirecting to /learn?chapter=" + chapterId);
                          router.push(`/learn?chapter=${chapterId}&class=${selectedChildClass || 1}`);
                          return;
                        } else {
                          console.error("❌ Chapter not found. Looking for:", chapter.name);
                          console.error("Available chapter names:", allChapters.map(ch => ch?.name || "NO NAME"));
                          console.error("Available chapter IDs:", allChapters.map(ch => ch?._id || "NO ID"));
                        }
                      } else {
                        console.error("Unexpected response status:", allChaptersResponse.status);
                        console.error("Response:", allChaptersResponse.data);
                      }
                    } catch (publicError) {
                      console.error("Error with public endpoint:", publicError);
                      console.error("Error details:", publicError.response?.data || publicError.message);
                    }

                    // Fallback: Try with subject-based lookup if we have the data
                    if (selectedSubjectName && selectedChildClass && token) {
                      // Get subject from database
                      const subjectsResponse = await axios.get("/api/v1/subject/all/get");
                      console.log("Subjects response:", subjectsResponse.status);
                      
                      if (subjectsResponse.status === 200) {
                        const allSubjects = subjectsResponse.data.subjects || [];
                        console.log("All subjects:", allSubjects.map(s => ({ name: s.name, class: s.classnumber })));
                        
                        const subject = allSubjects.find(
                          s => s.name.toLowerCase().trim() === selectedSubjectName.toLowerCase().trim() && 
                               s.classnumber === parseInt(selectedChildClass)
                        );

                        console.log("Found subject:", subject?._id);

                        if (subject) {
                          // Get chapters for this subject
                          try {
                            const chaptersResponse = await axios.get(`/api/v1/chapters/by-subject/${subject._id}`, {
                              params: {
                                childId: selectedChildId
                              },
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            });

                            console.log("Chapters response:", chaptersResponse.status);
                            
                            if (chaptersResponse.status === 200) {
                              const dbChapters = chaptersResponse.data.chapters || [];
                              console.log("Database chapters:", dbChapters.map(ch => ch.name));
                              
                              // Find chapter by name (matching our hardcoded chapter name)
                              const dbChapter = dbChapters.find(
                                ch => ch.name.toLowerCase().trim() === chapter.name.toLowerCase().trim()
                              );

                              console.log("Found chapter in DB:", dbChapter?._id);

                              if (dbChapter && dbChapter._id) {
                                // Route to learn page with chapter ID
                                console.log("Redirecting to learn page with chapter:", dbChapter._id);
                                router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass}`);
                                return;
                              } else {
                                console.error("Chapter not found in database. Looking for:", chapter.name);
                                console.error("Available chapters:", dbChapters.map(ch => ch.name));
                              }
                            } else {
                              console.error("Failed to fetch chapters:", chaptersResponse.status);
                            }
                          } catch (chaptersError) {
                            console.error("Error fetching chapters by subject:", chaptersError.response?.data || chaptersError.message);
                            // Fallback: Try to get all chapters and find by name
                            try {
                              const allChaptersResponse = await axios.get("/api/v1/chapters/all/get");
                              if (allChaptersResponse.status === 200) {
                                const allChapters = allChaptersResponse.data.chapters || [];
                                const dbChapter = allChapters.find(
                                  ch => ch.name.toLowerCase().trim() === chapter.name.toLowerCase().trim() &&
                                       ch.subjectId.toString() === subject._id.toString()
                                );
                                if (dbChapter && dbChapter._id) {
                                  console.log("Found chapter via fallback:", dbChapter._id);
                                  router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass}`);
                                  return;
                                }
                              }
                            } catch (fallbackError) {
                              console.error("Fallback also failed:", fallbackError);
                            }
                          }
                        } else {
                          console.error("Subject not found:", selectedSubjectName, "Class:", selectedChildClass);
                        }
                      }
                    } else {
                      console.error("Missing required data:", {
                        selectedSubjectName: !!selectedSubjectName,
                        selectedChildClass: !!selectedChildClass,
                        token: !!token
                      });
                      
                      // Fallback: Try to find chapter using public endpoint
                      try {
                        console.log("Trying fallback: Get all chapters");
                        const allChaptersResponse = await axios.get("/api/v1/chapters/all/get");
                        if (allChaptersResponse.status === 200) {
                          const allChapters = allChaptersResponse.data.chapters || [];
                          console.log("All chapters from DB:", allChapters.map(ch => ({ name: ch.name, subjectId: ch.subjectId })));
                          
                          // Find chapter by name only (since we don't have subject info)
                          const dbChapter = allChapters.find(
                            ch => ch.name.toLowerCase().trim() === chapter.name.toLowerCase().trim()
                          );
                          
                          if (dbChapter && dbChapter._id) {
                            console.log("Found chapter via public endpoint:", dbChapter._id);
                            router.push(`/learn?chapter=${dbChapter._id}&class=${selectedChildClass || 1}`);
                            return;
                          }
                        }
                      } catch (fallbackError) {
                        console.error("Fallback also failed:", fallbackError);
                      }
                    }
                    
                    // Final fallback: If no database chapter found, show error
                    console.error("❌ All attempts failed. Chapter not found in database.");
                    console.error("Chapter name we're looking for:", chapter.name);
                    alert(`Chapter "${chapter.name}" not found in database. Please check:\n1. Chapter name matches exactly: "${chapter.name}"\n2. Chapter is added to the database\n3. Check browser console for details.`);
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
                  {getStatusBadge(chapter.status, chapter.id)}
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
                {chapter.status === "locked" && chapter.id !== 1 && subscriptionStatus !== "active" ? (
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
                      cursor: chapter.status === "locked" && chapter.id !== 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    {chapter.status === "locked" && chapter.id !== 1 && (
                      <LockIcon sx={{ fontSize: "16px" }} />
                    )}
                    <span>{chapter.actionText}</span>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </AuthFrame>
    </>
  );
}
