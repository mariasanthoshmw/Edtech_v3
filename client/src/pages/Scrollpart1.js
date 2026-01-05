import Image from "next/image";
import myImage from "../../public/Group 34.png";
import logo from "../../public/logo.png";
import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";

import { Alfa_Slab_One, Poppins, Alegreya } from "next/font/google";
import { Box, Button, TextField, Typography } from "@mui/material";

const alfaSlab = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
});

const poppins = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
const alegreya = Alegreya({
  weight: ["400", "500"],
  subsets: ["latin"],
});

const cookies = new Cookies();

export default function Home() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const router = useRouter();

  const handleGetStarted = async () => {
    if (!email) {
      setMessage("Please enter your email address");
      setMessageType("error");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address");
      setMessageType("error");
      return;
    }

    try {
      // Check if user exists
      const response = await axios.post("/api/v1/user/check", { email });
      
      if (response.status === 200 && response.data.exists) {
        // User exists - send OTP for login
        try {
          const otpResponse = await axios.post("/api/v1/parent/login", { email });
          if (otpResponse.status === 200) {
            setShowOtp(true);
            setMessage("OTP sent to your email. Please check and enter it.");
            setMessageType("success");
            cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
          }
        } catch (otpError) {
          setMessage("Failed to send OTP. Please try again.");
          setMessageType("error");
        }
      }
    } catch (error) {
      // User doesn't exist - redirect to CreateAccount
      if (error.response && error.response.status === 404) {
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        router.push("/CreateAccount");
      } else {
        setMessage("An error occurred. Please try again.");
        setMessageType("error");
      }
    }
  };

  const verifyOtp = async () => {
    if (!otp) {
      setMessage("Please enter the OTP.");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.post("/api/v1/verify/parent", {
        email,
        otp,
      });
      
      if (response.status === 200) {
        cookies.set("token", response.data.token);
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        cookies.set("user", response.data.user, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        setMessage("Login successful! Redirecting...");
        setMessageType("success");
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
          router.push("/profiles");
        }, 1500);
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          setMessage("Invalid OTP. Please check and try again.");
        } else if (status === 404) {
          setMessage("User not found. Please check your email.");
        } else {
          setMessage("OTP verification failed. Please try again.");
        }
      } else {
        setMessage("Unable to connect to server. Please check your connection.");
      }
      setMessageType("error");
    }
  };

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "90vh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        color: "#fff",
      }}
    >
      {/* Background image */}
      <Box sx={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Image src={myImage} alt="Kids learning illustration" priority fill sizes="200vw" style={{ objectFit: "contain" }} />
      </Box>

      {/* Navbar */}
      <Box
        component="nav"
        sx={{
          position: "absolute",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          width: { xs: "calc(100% - 32px)", md: "calc(100% - 120px)" },
          height: 64,
          backgroundColor: "#0475FD",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3.5,
          zIndex: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Image src={logo} alt="Study Pilot Logo" height={45} />
        </Box>
        <Link href="/CreateAccount" passHref>
          <Button
            variant="contained"
            sx={{
              backgroundColor: "#ffbf47",
              color: "#fff",
              borderRadius: 20,
              px: 3,
              py: 1,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: "#f1b440" },
            }}
          >
            SIGN UP
          </Button>
        </Link>
      </Box>

      {/* Content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 520,
          ml: { xs: 3, md: 12 },
          mt: { xs: 10, md: 12 },
        }}
        className={poppins.className}
      >
        <Typography
          sx={{
            fontFamily: alfaSlab.style.fontFamily,
            fontSize: { xs: 34, md: 44 },
            lineHeight: 1.1,
            fontWeight: 400, // Alfa Slab One only ships 400; avoid unintended fallback
          }}
        >
          Boost Your <br /> Child&apos;s Future
        </Typography>

        <Typography sx={{ fontFamily: alegreya.style.fontFamily, fontSize: { xs: 18, md: 22 }, mt: 2 }}>
          Unlocking potential. Your partner in
        </Typography>
        <Typography sx={{ fontFamily: alegreya.style.fontFamily, fontSize: { xs: 18, md: 22 } }}>
          cultivating your child&apos;s educational journey.
        </Typography>

        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 400 }}>
          {!showOtp ? (
            <>
              <TextField
                label="Enter Your Email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setMessage("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGetStarted();
                }}
                fullWidth
                sx={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  borderRadius: 2,
                }}
              />
              {message && (
                <Typography sx={{ color: messageType === "error" ? "#ffeb3b" : "#4caf50", fontSize: 14 }}>
                  {message}
                </Typography>
              )}
              <Button
                onClick={handleGetStarted}
                variant="contained"
                sx={{
                  backgroundColor: "#ffbf47",
                  color: "#fff",
                  borderRadius: 20,
                  py: 1.5,
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#f1b440" },
                }}
              >
                GET STARTED
              </Button>
            </>
          ) : (
            <>
              <TextField
                label="OTP"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setMessage("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyOtp();
                }}
                fullWidth
                sx={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  borderRadius: 2,
                }}
              />
              {message && (
                <Typography sx={{ color: messageType === "error" ? "#ffeb3b" : "#4caf50", fontSize: 14 }}>
                  {message}
                </Typography>
              )}
              <Button
                onClick={verifyOtp}
                variant="contained"
                sx={{
                  backgroundColor: "#ffbf47",
                  color: "#fff",
                  borderRadius: 20,
                  py: 1.5,
                  fontWeight: 800,
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#f1b440" },
                }}
              >
                VERIFY OTP
              </Button>
              <Button
                onClick={() => {
                  setShowOtp(false);
                  setOtp("");
                  setMessage("");
                }}
                variant="text"
                sx={{ color: "#fff", textTransform: "none", alignSelf: "flex-start" }}
              >
                Change Email
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}


