import Image from "next/image";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import AuthFrame from "../components/common/AuthFrame";
import catImage from "../../public/cats.gif";
import { Afacad } from "next/font/google";
import Link from "next/link";
import { Cookies } from "react-cookie";
import { Box, Button, TextField, Typography } from "@mui/material";

const afacad = Afacad({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const cookies = new Cookies();

export default function CreateAccount() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const router = useRouter();

  // Load saved email from cookies on component mount
  useEffect(() => {
    const savedEmail = cookies.get("parentEmail");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const sendOtp = async () => {
    // Clear previous messages
    setMessage("");
    setMessageType("");

    // Validate email
    if (!email) {
      setMessage("Please enter your email address.");
      setMessageType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address.");
      setMessageType("error");
      return;
    }

    try {
      // First check if account already exists
      const checkResponse = await axios.post("/api/v1/user/check", { email });
      
      if (checkResponse.status === 200 && checkResponse.data.exists) {
        // Account already exists
        setMessage("Account already exists. Please login instead.");
        setMessageType("error");
        return;
      }
    } catch (error) {
      // If check fails with 404, account doesn't exist - proceed
      if (error.response && error.response.status !== 404) {
        setMessage("An error occurred. Please try again.");
        setMessageType("error");
        return;
      }
    }

    // Account doesn't exist, proceed with OTP for new account creation
    // Use parent/login route which auto-creates user if doesn't exist
    try {
      const response = await axios.post("/api/v1/parent/login", { email });
      
      if (response.status === 200) {
        setShowOtp(true);
        setMessage("OTP sent successfully! Please check your email.");
        setMessageType("success");
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
      }
    } catch (error) {
      setMessage("Failed to send OTP. Please try again.");
      setMessageType("error");
    }
  };

  const verifyOtp = async () => {
    // Clear previous messages
    setMessage("");
    setMessageType("");

    // Validate OTP input
    if (!otp) {
      setMessage("Please enter the OTP.");
      setMessageType("error");
      return;
    }

    try {
      // Use verify/parent route which works for both login and registration
      const response = await axios.post("/api/v1/verify/parent", {
        email,
        otp,
      });
      
      if (response.status === 200 || response.status === 201) {
        cookies.set("token", response.data.token);
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        if (response.data.user) {
          cookies.set("user", response.data.user, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        }
        setMessage("Account created successfully! Redirecting...");
        setMessageType("success");
        
        // Redirect to profile selection page
        setTimeout(() => {
          router.push("/profiles");
        }, 1500);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const errorMessage = errorData?.message || "";

        if (status === 400) {
          setMessage("Invalid OTP. Please check and try again.");
          setMessageType("error");
        } else {
          setMessage(errorMessage || "Account creation failed. Please try again.");
          setMessageType("error");
        }
      } else {
        setMessage("An unexpected error occurred. Please try again.");
        setMessageType("error");
      }
    }
  };

  return (
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
        {/* Left Image */}
        <Box
          sx={{
            flex: 1,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image src={catImage} alt="Animated illustration" priority style={{ width: "280px", height: "auto" }} />
        </Box>

        {/* Form */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Typography
            className={afacad.className}
            sx={{ fontSize: 26, fontWeight: 700, mb: 2, textAlign: "center" }}
          >
            Create your Account
          </Typography>

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

        {/* Conditional rendering based on showOtp */}
        {showOtp ? (
          <>
            <TextField
              label="Enter OTP"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setMessage("");
              }}
              fullWidth
            />
            <Button
              onClick={verifyOtp}
              variant="contained"
              className={afacad.className}
              sx={{
                mt: 2,
                backgroundColor: "#000000",
                color: "#FFFFFF",
                height: 52,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                "&:hover": { backgroundColor: "#333333" },
              }}
            >
              Verify OTP
            </Button>
          </>
        ) : (
          <>
            <TextField
              label="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage("");
                cookies.set("parentEmail", e.target.value, { path: "/", maxAge: 30 * 24 * 60 * 60 });
              }}
              fullWidth
            />
            <Button
              onClick={sendOtp}
              variant="contained"
              className={afacad.className}
              sx={{
                mt: 2,
                backgroundColor: "#000000",
                color: "#FFFFFF",
                height: 52,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                "&:hover": { backgroundColor: "#333333" },
              }}
            >
              Send OTP
            </Button>
          </>
        )}

          <Typography sx={{ mt: 3, textAlign: "center", fontSize: 14, color: "#666" }}>
            Already have an account?{" "}
            <Link href="/" passHref>
              <Box component="span" sx={{ color: "#1E88E5", cursor: "pointer", fontWeight: 700 }}>
                Sign In
              </Box>
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthFrame>
  );
}