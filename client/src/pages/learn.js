import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { Cookies } from "react-cookie";
import { Irish_Grover } from "next/font/google";
import logo from "../../public/logo.png";
import blackLogo from "../../public/Black logo (1).png";
import { Box, Button, Typography, IconButton } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import UserProfileMenu from "../components/common/UserProfileMenu";

const cookies = new Cookies();
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";
 
const irishGrover = Irish_Grover({
  weight: "400",
  subsets: ["latin"],
});
 
export default function Learn() {
  const router = useRouter();
  const { class: cls, chapter } = router.query;
  const [chapterData, setChapterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const videoRef = useRef(null);
 
  useEffect(() => {
    const fetchChapter = async () => {
      // Wait for router to be ready
      if (!router.isReady) {
        return;
      }
 
      if (!chapter) {
        setLoading(false);
        setError("No chapter ID provided");
        return;
      }
 
      try {
        setLoading(true);
        setError(null);
       
        // Handle chapter ID - could be string or array
        let chapterId = chapter;
        if (Array.isArray(chapter)) {
          chapterId = chapter[0];
        }
        chapterId = String(chapterId).trim();
       
        console.log("Fetching chapter with ID:", chapterId);
        console.log("Chapter ID length:", chapterId.length);
        console.log("Chapter ID type:", typeof chapterId);
       
        // Validate format before making request
        if (chapterId.length !== 24) {
          setError(`Invalid chapter ID format. Expected 24 characters, got ${chapterId.length}. ID: ${chapterId}`);
          setLoading(false);
          return;
        }
       
        // Get authentication token and child ID
        const token = cookies.get("token");
        const selectedChild = cookies.get("selectedChild"); // Already an object
        
        const selectedChildId = selectedChild?.id;
        
        // Use relative URL (will be proxied by Next.js rewrites in dev/prod).
        // If you deploy frontend+backend on different domains, set NEXT_PUBLIC_BASE_URL
        // (e.g. https://api.yourdomain.com) to make absolute URLs.
        let apiUrl = `${PUBLIC_BASE_URL}/api/v1/chapters/${chapterId}`;
        console.log("API URL:", apiUrl);
        console.log("Chapter ID being used:", chapterId);
        console.log("Token exists:", !!token);
        console.log("Child ID:", selectedChildId);
       
        let response;
        response = await axios.get(apiUrl, {
          params: {
            childId: selectedChildId
          },
          headers: token ? {
            Authorization: `Bearer ${token}`,
          } : {},
        });
        console.log("API Response:", response.data);
     
        if (response.data && response.data.chapter) {
          setChapterData(response.data.chapter);
          
          // Save chapter ID to cookie for quiz page
          cookies.set("selectedChapterId", chapterId, { path: "/" });
          console.log("📝 Saved chapter ID to cookie:", chapterId);
          
          // Check if chapter is already completed
          setIsVideoCompleted(response.data.chapter.status === "completed");
          // Construct video URL from backend
          if (response.data.chapter.videourl) {
            let videoPath = response.data.chapter.videourl;
            
            // The videourl from DB is already in the format "videos/number-magic.mp4"
            // So we just need to prepend "/uploads/" to it
            // Result: /uploads/videos/number-magic.mp4 (or <NEXT_PUBLIC_BASE_URL>/uploads/... if set)
            
            const fullVideoUrl = `${PUBLIC_BASE_URL}/uploads/${videoPath}`;
            console.log("Video path from DB:", videoPath);
            console.log("Full video URL:", fullVideoUrl);
            setVideoUrl(fullVideoUrl);
          } else {
            setError("No video URL found for this chapter");
          }
        } else {
          setError("Chapter not found in response");
        }
      } catch (err) {
        console.error("Error fetching chapter:", err);
        console.error("Error response:", err.response?.data);
        console.error("Error status:", err.response?.status);
        console.error("Full error:", err);
       
        if (err.response?.status === 404) {
          const availableChapters = err.response?.data?.availableChapters;
          let errorMsg = `Chapter not found in database. ID: ${chapterId}`;
          if (availableChapters && availableChapters.length > 0) {
            errorMsg += `\n\nAvailable chapters:\n${availableChapters.map(ch => `- ${ch.name} (ID: ${ch.id})`).join('\n')}`;
          }
          setError(errorMsg);
        } else {
          const errorMessage = err.response?.data?.message || err.message || "Failed to load chapter";
          const errorDetails = err.response?.data?.received ?
            `Received: "${err.response.data.received}" (length: ${err.response.data.received?.length})` : "";
          setError(`${errorMessage} ${errorDetails}`);
        }
      } finally {
        setLoading(false);
      }
    };
 
    fetchChapter();
  }, [chapter, router.isReady]);

  // Function to mark video progress
  const markVideoProgress = async (status) => {
    try {
      const token = cookies.get("token");
      const selectedChild = cookies.get("selectedChild"); // Already an object
      
      const selectedChildId = selectedChild?.id;
      
      if (!chapter) return;
      
      let chapterId = chapter;
      if (Array.isArray(chapter)) {
        chapterId = chapter[0];
      }
      chapterId = String(chapterId).trim();
      
      if (status === "completed") {
        // Mark as completed
        await axios.post(
          `/api/v1/chapters/${chapterId}/complete`,
          { childId: selectedChildId },
          {
            headers: token ? {
              Authorization: `Bearer ${token}`,
            } : {},
          }
        );
      } else if (status === "in-progress") {
        // Mark as in-progress - create progress entry with completed: false
        try {
          await axios.post(
            `/api/v1/chapters/${chapterId}/progress`,
            { childId: selectedChildId, completed: false },
            {
              headers: token ? {
                Authorization: `Bearer ${token}`,
              } : {},
            }
          );
        } catch (err) {
          console.log("Error marking in-progress:", err.message);
        }
      }
    } catch (error) {
      console.error("Error updating video progress:", error);
    }
  };
 
  if (!cls || !chapter) {
    return (
      <p style={{ color: "white", padding: 20 }}>
        No class or chapter selected
      </p>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", px: { xs: 2, md: 8 }, pt: { xs: 10, md: 10 }, pb: 4 }}>
      {/* Logo and Back Button - Top Left */}
      <Box sx={{ position: "fixed", top: 20, left: 20, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
        <Image src={blackLogo} alt="Study Pilot Logo" height={25} />
        <IconButton onClick={() => router.back()} aria-label="Go back" size="small" sx={{ color: "#000" }}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* User Profile Menu - Top Right */}
      <Box sx={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
        <UserProfileMenu />
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <Typography sx={{ color: "white", fontSize: 18 }}>Loading chapter...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "50vh", p: 2, textAlign: "center" }}>
          <Typography sx={{ color: "error.main", fontSize: 18, mb: 2 }}>{error}</Typography>
          <Typography sx={{ fontSize: 14, color: "#666" }}>Chapter ID used: {chapter}</Typography>
        </Box>
      )}

      {!loading && !error && videoUrl && (
        <Box sx={{ height: { xs: "60vh", md: "calc(95vh - 115px)" }, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#000", borderRadius: 2, overflow: "hidden" }}>
          <video
            ref={videoRef}
            key={videoUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              objectFit: "contain",
              backgroundColor: "#000",
            }}
            onError={(e) => {
              console.error("Video error:", e);
              setError("Failed to load video. Please check the video URL.");
            }}
            onLoadStart={() => {
              console.log("Video loading started:", videoUrl);
            }}
            onCanPlay={() => {
              console.log("Video can play");
            }}
            onTimeUpdate={(e) => {
              // Check if we're in the last 15 seconds of the video
              const video = e.target;
              const currentTime = video.currentTime;
              const duration = video.duration;
              
              if (duration && currentTime) {
                const remainingTime = duration - currentTime;
                // Show Next button in last 15 seconds
                if (remainingTime <= 10 && remainingTime > 0) {
                  setShowNextButton(true);
                } else if (remainingTime <= 0) {
                  // Video ended
                  setShowNextButton(true);
                  setIsVideoCompleted(true);
                }
              }
            }}
            onPlay={async () => {
              // Mark as in-progress when video starts playing
              if (!isVideoStarted && !isVideoCompleted) {
                setIsVideoStarted(true);
                await markVideoProgress("in-progress");
              }
            }}
            onEnded={async () => {
              // Mark as completed when video ends
              if (!isVideoCompleted) {
                setIsVideoCompleted(true);
                setShowNextButton(true);
                await markVideoProgress("completed");
              }
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            <source src={videoUrl} type="video/webm" />
            <source src={videoUrl} type="video/ogg" />
            Your browser does not support the video tag.
          </video>
        </Box>
      )}

      {!loading && !error && !videoUrl && chapterData && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
            color: "white",
            fontSize: "18px",
          }}
        >
          No video available for this chapter
        </div>
      )}
      {showNextButton && (
        <Button
          className={irishGrover.className}
          variant="contained"
          onClick={() => router.push("/dinoquiz")}
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            px: 3,
            py: 1.25,
            borderRadius: 20,
            backgroundColor: "#ffb703",
            color: "#000",
            fontWeight: 700,
            textTransform: "none",
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            "&:hover": { backgroundColor: "#f0ab03" },
          }}
        >
          Next
        </Button>
      )}

    </Box>
  );
}
