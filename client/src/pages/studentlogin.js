import { Box, Typography, TextField, Button } from "@mui/material";
import { useState, useEffect } from "react";
import axios from "axios";
import { Cookies } from "react-cookie";
import Head from "next/head";
import AuthFrame from "../components/common/AuthFrame";
import { Afacad } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/router";

const afacad = Afacad({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const cookies = new Cookies();

export default function StudentLogin() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("student");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const router = useRouter();

  // Load saved student name from cookies on component mount
  useEffect(() => {
    const savedStudentName = cookies.get("studentName");
    if (savedStudentName) {
      setName(savedStudentName);
    }
  }, []);

  const handleLogin = async () => {
    // Clear previous messages
    setMessage("");
    setMessageType("");

    // Validate inputs
    if (!name || !password) {
      setMessage("Please enter both name and password.");
      setMessageType("error");
      return;
    }

    try {
      console.log("Sending login request:", { name, password });
      const response = await axios.post("/api/v1/student/login", {
        name,
        password,
      });

      console.log("Response received:", response);
      
      if (response.status === 200) {
        // Check if token exists - this is the main validation
        if (!response.data || !response.data.token) {
          setMessage("You are not a registered user. Please sign up first.");
          setMessageType("error");
          return;
        }

        // Prevent mixed sessions: if a parent previously logged in on this browser,
        // clear parent cookies so student token doesn't accidentally hit parent-only APIs.
        cookies.remove("parentEmail", { path: "/" });
        cookies.remove("user", { path: "/" });
        cookies.remove("selectedChildId", { path: "/" });
        cookies.remove("selectedChildName", { path: "/" });
        cookies.remove("selectedChildClass", { path: "/" });
        cookies.remove("selectedChildEmoji", { path: "/" });
        cookies.remove("selectedSubjectId", { path: "/" });
        cookies.remove("selectedSubjectName", { path: "/" });

        // Store token and student name in cookies
        cookies.set("token", response.data.token);
        cookies.set("studentName", name, { path: "/", maxAge: 30 * 24 * 60 * 60 }); // Save for 30 days
        console.log("Login successful, token stored in cookies.");

        // Verify the token was stored successfully
        const storedToken = cookies.get("token");
        if (!storedToken) {
          setMessage("Failed to save login session. Please try again.");
          setMessageType("error");
          return;
        }

        // Success - user is logged in (token exists and is stored)
        setMessage("Login successful");
        setMessageType("success");
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
          router.push("/chapters");
        }, 1500);
      }
    } catch (error) {
      // Handle axios errors gracefully
      if (error.response) {
        // Server responded with an error status
        const status = error.response.status;
        const errorData = error.response.data;
        const errorMessage = errorData?.message || errorData?.error || error.message || "";
        
        if (status === 500) {
          setMessage("Server error. Please try again later.");
          setMessageType("error");
        } else if (status === 401) {
          // Check if it's a "user not found" or "invalid password" message
          const lowerMessage = errorMessage.toLowerCase();
          if (lowerMessage.includes("user not found") || 
              lowerMessage.includes("create an account") ||
              lowerMessage.includes("not registered") ||
              lowerMessage.includes("account first")) {
            setMessage("You are not a registered user. Please create an account first.");
          } else if (lowerMessage.includes("invalid password")) {
            setMessage("Invalid password. Please try again.");
          } else {
            // Default message for 401 errors
            setMessage("You are not a registered user. Please create an account first.");
          }
          setMessageType("error");
        } else if (status === 400) {
          setMessage(errorMessage || "Please enter both name and password.");
          setMessageType("error");
        } else if (status === 404) {
          setMessage("You are not a registered user. Please create an account first.");
          setMessageType("error");
        } else if (status === 403) {
          setMessage("You are not a registered user. Please create an account first.");
          setMessageType("error");
        } else {
          // Check if error message indicates user doesn't exist
          const lowerMessage = errorMessage.toLowerCase();
          if (lowerMessage.includes("not found") || 
              lowerMessage.includes("doesn't exist") ||
              lowerMessage.includes("not a user") ||
              lowerMessage.includes("not registered") ||
              lowerMessage.includes("user not found") ||
              lowerMessage.includes("create an account")) {
            setMessage("You are not a registered user. Please create an account first.");
          } else {
            setMessage(errorMessage || "Login failed. Please try again.");
          }
          setMessageType("error");
        }
      } else if (error.request) {
        // Request was made but no response received
        setMessage("Unable to connect to server. Please check your connection.");
        setMessageType("error");
      } else {
        // Something else happened
        setMessage("An unexpected error occurred. Please try again.");
        setMessageType("error");
      }
      
      // Log error for debugging (but don't throw it)
      console.log("Login error handled:", error.response?.status, error.response?.data?.message);
    }
  };

  return (
    <>
      <Head>
        <title>Student Login</title>
        <meta name="description" content="" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: { xs: 3, md: 6 },
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
          }}
        >
          {/* Left section - Form */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Typography
              className={afacad.className}
              sx={{ fontSize: 26, fontWeight: 700, mb: 2, textAlign: "center" }}
            >
              Login to your Account
            </Typography>

            {/* Student/Parent toggle */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                width: "100%",
                mb: 4,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  width: "fit-content",
                  border: "2px solid #000000",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <Button
                  disableRipple
                  sx={{
                    backgroundColor: "#000000", // Black - selected (this is student login page)
                    color: "#FFFFFF",
                    padding: "8px 32px",
                    borderRadius: 0,
                    textTransform: "none",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "default",
                  }}
                >
                  Student
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  disableRipple
                  sx={{
                    backgroundColor: "#FFFFFF", // White - unselected
                    color: "#000000",
                    padding: "8px 32px",
                    borderRadius: 0,
                    textTransform: "none",
                    fontSize: "16px",
                    fontWeight: "500",
                    "&:hover": {
                      backgroundColor: "#F5F5F5",
                    },
                  }}
                >
                  Parent
                </Button>
              </Box>
            </Box>

            {/* Message display */}
            {message && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: "8px",
                  backgroundColor:
                    messageType === "success" ? "#E8F5E9" : "#FFEBEE",
                  color: messageType === "success" ? "#2E7D32" : "#C62828",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {message}
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Student's Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setMessage("");
                  cookies.set("studentName", e.target.value, { path: "/", maxAge: 30 * 24 * 60 * 60 });
                }}
                fullWidth
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setMessage("");
                }}
                fullWidth
              />

              <Button
                onClick={handleLogin}
                variant="contained"
                sx={{
                  backgroundColor: "#000000",
                  color: "#FFFFFF",
                  height: 52,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  "&:hover": { backgroundColor: "#333333" },
                }}
                className={afacad.className}
              >
                Login
              </Button>
            </Box>

            {/* Sign up link - moved inside form-section */}
            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Typography sx={{ fontSize: "14px", color: "#666666" }}>
                Don't have an account?{" "}
                <Link href="/CreateAccount" passHref>
                  <span
                    style={{
                      color: "#1E88E5",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Sign Up
                  </span>
                </Link>
              </Typography>
            </Box>
          </Box>

          {/* Right section - Cat illustration */}
          <Box
            sx={{
              flex: 1,
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src="/cats.gif"
              alt="Cat illustration"
              sx={{
                width: "100%",
                maxWidth: "400px",
                height: "auto",
              }}
            />
          </Box>
        </Box>
      </AuthFrame>
    </>
  );
}