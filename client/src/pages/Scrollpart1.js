import Image from "next/image";
import myImage from "../../public/Group 34.png";
import logo from "../../public/logo.png";
import Link from "next/link";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";

import { Alfa_Slab_One, Poppins, Alegreya } from "next/font/google";
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
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleGetStarted = async () => {
    if (!email) {
      setMessage("Please enter your email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please enter a valid email address");
      return;
    }

    try {
      // Check if user exists
      const response = await axios.post("/api/v1/user/check", { email });
      
      if (response.status === 200 && response.data.exists) {
        // User exists - save email and redirect directly to profiles page
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        router.push("/profiles");
      }
    } catch (error) {
      // User doesn't exist - redirect to CreateAccount
      if (error.response && error.response.status === 404) {
        cookies.set("parentEmail", email, { path: "/", maxAge: 30 * 24 * 60 * 60 });
        router.push("/CreateAccount");
      } else {
        setMessage("An error occurred. Please try again.");
      }
    }
  };

  return (
    <section className="hero">
      {/* Background image */}
      <div className="hero-bg">
        <Image
          src={myImage}
          alt="Kids learning illustration"
          priority
          fill
          sizes="200vw"
          // style={{ objectFit: "" }}
        />
      </div>
      <nav className="navbar">
      <div className="navbar-logo">
        <Image src={logo} alt="Study Pilot Logo" height={45} />
        <span></span>
      </div>

      <Link href="/CreateAccount" passHref>
        <button className="login-btn font-jsMath">SIGN UP</button>
      </Link>
    </nav>

      {/* Content on top */}
      <div className={`hero-content ${poppins.className}`}>

        <h1 className={alfaSlab.className}>
         Boost Your <br /> Child's Future
       </h1>

        <p className={alegreya.className}>
          Unlocking potential. Your partner in 
        </p>
        <p className={alegreya.className}>
          cultivating your child's
          educational journey.
        </p>

        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage("");
            }}
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "2px solid white",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              fontSize: "16px",
              color: "#000",
              width: "100%",
              maxWidth: "400px"
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleGetStarted();
              }
            }}
          />
          {message && (
            <p style={{ color: "#ffeb3b", fontSize: "14px", margin: 0 }}>
              {message}
            </p>
          )}
          <button 
            className="getStarted-btn font-jsMath"
            onClick={handleGetStarted}
            style={{ marginTop: "0.5rem" }}
          >
            GET STARTED
          </button>
          
        </div>
        
      </div>
    </section>
  );
}


