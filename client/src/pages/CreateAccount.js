import Image from "next/image";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import AuthFrame from "../components/common/AuthFrame";
import catImage from "../../public/cats.gif";
import { Afacad } from "next/font/google";
import Link from "next/link";
import { Cookies } from "react-cookie";
import { Box } from "@mui/material";

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
    try {
      const response = await axios.post("/api/v1/parent/register-otp", { email });
      
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
      const response = await axios.post("/api/v1/parent/register", {
        email,
        otp,
      });
      
      if (response.status === 200 || response.status === 201) {
        cookies.set("token", response.data.token);
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
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
      {/* Left Image */}
      <div className="image-section">
        <Image
          src={catImage}
          alt="Animated illustration"
          className="gif-image"
          priority
        />
      </div>

      {/* Form */}
      <div className="form-section">
        <h1 className={afacad.className}>Create your Account</h1>

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
            <label className={afacad.className}>Enter OTP</label>
            <input
              type="text"
              placeholder="Enter the OTP sent to your email"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value);
                setMessage("");
              }}
            />
            <button
              className={`primary-btn ${afacad.className}`}
              onClick={verifyOtp}
            >
              Verify OTP
            </button>
          </>
        ) : (
          <>
            <label className={afacad.className}>Email Address</label>
            <input
              type="text"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage("");
                cookies.set("parentEmail", e.target.value, { path: "/", maxAge: 30 * 24 * 60 * 60 });
              }}
            />
            <button
              className={`primary-btn ${afacad.className}`}
              onClick={sendOtp}
            >
              Send OTP
            </button>
          </>
        )}

        <p className="signin-text" style={{ marginTop: "24px" }}>
          Already have an account?{" "}
          <Link href="/" passHref>
            <span
              style={{
                color: "#1E88E5",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Sign In
            </span>
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}