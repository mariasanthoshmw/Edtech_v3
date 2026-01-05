import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Head from "next/head";
import AuthFrame from "../components/common/AuthFrame";
import { Box, Card, CardContent, Typography, LinearProgress, Chip } from "@mui/material";
import { Poppins } from "next/font/google";
import AssessmentIcon from "@mui/icons-material/Assessment";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cookies = new Cookies();

export default function AcademicReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const token = cookies.get("token");
  const parentEmail = cookies.get("parentEmail");

  useEffect(() => {
    if (!token || !parentEmail) {
      router.push("/parentlogin");
      return;
    }
    fetchAcademicReport();
  }, [token, parentEmail]);

  const fetchAcademicReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/v1/parent/academic-report", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 200) {
        setReports(response.data.reports || []);
      }
    } catch (error) {
      console.error("Error fetching academic report:", error);
      if (error.response && error.response.status === 401) {
        cookies.remove("token");
        router.push("/parentlogin");
      }
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 50) return "#FF9800";
    return "#F44336";
  };

  return (
    <>
      <Head>
        <title>Academic Report</title>
        <meta name="description" content="Academic Report for all students" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame showBack={true}>
        <Box
          sx={{
            width: "100%",
            padding: "20px",
            maxWidth: "1200px",
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
            <AssessmentIcon sx={{ fontSize: 40, color: "#0B91FF" }} />
            <Typography
              className={poppins.className}
              sx={{
                fontSize: { xs: "28px", md: "36px" },
                fontWeight: "700",
                color: "#000000",
              }}
            >
              Academic Report
            </Typography>
          </Box>

          {loading ? (
            <Typography className={poppins.className}>Loading reports...</Typography>
          ) : reports.length === 0 ? (
            <Card
              sx={{
                padding: 4,
                textAlign: "center",
                backgroundColor: "#F5F5F5",
              }}
            >
              <Typography className={poppins.className} sx={{ color: "#666666" }}>
                No student profiles found. Add a profile to see academic reports.
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {reports.map((report) => (
                <Card
                  key={report.childId}
                  sx={{
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <CardContent sx={{ padding: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        marginBottom: 3,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "60px",
                        }}
                      >
                        {report.emoji || "👤"}
                      </Typography>
                      <Box>
                        <Typography
                          className={poppins.className}
                          sx={{
                            fontSize: "24px",
                            fontWeight: "700",
                            color: "#000000",
                          }}
                        >
                          {report.childName}
                        </Typography>
                        <Typography
                          className={poppins.className}
                          sx={{
                            fontSize: "16px",
                            color: "#666666",
                          }}
                        >
                          Class {report.classno}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {report.subjects.map((subject) => (
                        <Box
                          key={subject.subjectId}
                          sx={{
                            padding: 2,
                            backgroundColor: "#F9F9F9",
                            borderRadius: "8px",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 1,
                            }}
                          >
                            <Typography
                              className={poppins.className}
                              sx={{
                                fontSize: "18px",
                                fontWeight: "600",
                                color: "#000000",
                              }}
                            >
                              {subject.subjectName}
                            </Typography>
                            <Chip
                              label={`${subject.completedChapters}/${subject.totalChapters} Chapters`}
                              sx={{
                                backgroundColor: getProgressColor(subject.completionPercentage),
                                color: "white",
                                fontWeight: "600",
                              }}
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={subject.completionPercentage}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: "#E0E0E0",
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: getProgressColor(subject.completionPercentage),
                              },
                            }}
                          />
                          <Typography
                            className={poppins.className}
                            sx={{
                              fontSize: "14px",
                              color: "#666666",
                              marginTop: 1,
                            }}
                          >
                            {subject.completionPercentage}% Complete
                          </Typography>

                          {/* Chapter Details */}
                          <Box
                            sx={{
                              marginTop: 2,
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            {subject.chapters.map((chapter, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  backgroundColor: chapter.completed ? "#E8F5E9" : "#FFF3E0",
                                  borderRadius: "4px",
                                }}
                              >
                                <Typography
                                  className={poppins.className}
                                  sx={{
                                    fontSize: "14px",
                                    color: "#000000",
                                  }}
                                >
                                  {chapter.chapterName}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                  {chapter.completed && (
                                    <Chip
                                      label="✓ Completed"
                                      size="small"
                                      sx={{
                                        backgroundColor: "#4CAF50",
                                        color: "white",
                                      }}
                                    />
                                  )}
                                  {chapter.quizScore !== null && (
                                    <Typography
                                      className={poppins.className}
                                      sx={{
                                        fontSize: "12px",
                                        color: "#666666",
                                      }}
                                    >
                                      Quiz: {chapter.quizScore}/{chapter.totalMarks} ({chapter.percentage || Math.round((chapter.quizScore / chapter.totalMarks) * 100)}%)
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </AuthFrame>
    </>
  );
}

