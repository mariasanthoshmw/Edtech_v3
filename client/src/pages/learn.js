import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { Cookies } from "react-cookie";
import { Irish_Grover } from "next/font/google";
import styles from "../styles/Learn.module.css";
import logo from "../../public/logo.png";
import blackLogo from "../../public/Black logo (1).png";

const cookies = new Cookies();
 
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
       
        // Get authentication token
        const token = cookies.get("token");
        const selectedChildId = cookies.get("selectedChildId");
        
        // Use relative URL (will be proxied by Next.js)
        // If that fails, we'll try absolute URL as fallback
        let apiUrl = `/api/v1/chapters/${chapterId}`;
        console.log("API URL:", apiUrl);
        console.log("Chapter ID being used:", chapterId);
        console.log("Token exists:", !!token);
        console.log("Child ID:", selectedChildId);
       
        let response;
        try {
          response = await axios.get(apiUrl, {
            params: {
              childId: selectedChildId
            },
            headers: token ? {
              Authorization: `Bearer ${token}`,
            } : {},
          });
        } catch (networkError) {
          // If relative URL fails, try absolute URL
          if (networkError.code === 'ERR_NETWORK' || networkError.message.includes('Network Error')) {
            console.log("Relative URL failed, trying absolute URL...");
            apiUrl = `http://localhost:5001/api/v1/chapters/${chapterId}`;
            response = await axios.get(apiUrl, {
              params: {
                childId: selectedChildId
              },
              headers: token ? {
                Authorization: `Bearer ${token}`,
              } : {},
            });
          } else {
            throw networkError;
          }
        }
        console.log("API Response:", response.data);
     
        if (response.data && response.data.chapter) {
          setChapterData(response.data.chapter);
          // Check if chapter is already completed
          setIsVideoCompleted(response.data.chapter.status === "completed");
          // Construct video URL from backend
          if (response.data.chapter.videourl) {
            const baseUrl = "http://localhost:5001";
            let videoPath = response.data.chapter.videourl;
            
            // The videourl from DB is already in the format "videos/number-magic.mp4"
            // So we just need to prepend "/uploads/" to it
            // Result: http://localhost:5001/uploads/videos/number-magic.mp4
            
            const fullVideoUrl = `${baseUrl}/uploads/${videoPath}`;
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
      const selectedChildId = cookies.get("selectedChildId");
      
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
    <div className={styles.learnPage}>
      {/* Logo and Back Button - Top Left */}
      <div
        style={{
          position: "fixed",
          top: 20,
          left: 20,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <div style={{ marginBottom: "4px" }}>
          <Image src={blackLogo} alt="Study Pilot Logo" height={25} />
        </div>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            fontSize: "30px",
            cursor: "pointer",
            color: "#000",
            padding: "8px",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "none";
          }}
        >
          ←
        </button>
      </div>

      {loading && (
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
          Loading chapter...
        </div>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
            color: "red",
            fontSize: "18px",
            padding: 20,
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 20 }}>{error}</div>
          <div style={{ fontSize: "14px", color: "#666", marginTop: 10 }}>
            Chapter ID used: {chapter}
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: 10 }}>
            To verify chapters exist, check: GET http://localhost:5001/api/v1/chapters/all/get
          </div>
        </div>
      )}

      {!loading && !error && videoUrl && (
        <div className={styles.videoContainer}>
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
        </div>
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
        <button 
          className={`${styles.nextBtn} ${irishGrover.className}`}
          onClick={() => router.push('/dinoquiz')}
        >
          Next
        </button>
      )}

    </div>
  );
}
