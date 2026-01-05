// src/pages/subject.js



import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Cookies } from 'react-cookie';
import axios from 'axios';

import AuthFrame from "../components/common/AuthFrame";
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';

import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LanguageIcon from '@mui/icons-material/Language';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalculateIcon from '@mui/icons-material/Calculate';
import ScienceIcon from '@mui/icons-material/Science';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BrushIcon from '@mui/icons-material/Brush';
import UserProfileMenu from '../components/common/UserProfileMenu';

/* ---------- Images (public) ---------- */
const DEFAULT_IMG = '/Confused_Cute_Dog.gif';
const MATH_IMG = '/dog-math.gif';
const SCIENCE_IMG = '/Science_gif.gif';
const ENGLISH_IMG = '/dog-english.gif';
const ARTS_IMG = '/art_craft.gif';
const AVATAR_IMG = '/avatar.png';




/* ---------- Subject Card ---------- */
function SubjectCard({
  title,
  subtitle,
  icon,
  bg,
  accent,
  onClick,
  onHover,
  onLeave,
  locked = false,
}) {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      sx={{
        bgcolor: bg,
        borderRadius: 4,
        border: '1px solid rgba(0,0,0,0.06)',
        height: 140,
        p: 1.25,
        cursor: 'pointer', // Always clickable
        position: 'relative',
        opacity: 1, // Always fully visible
        '&:hover': { boxShadow: 4 },
      }}
    >
      <IconButton
        size="small"
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          bgcolor: '#fff',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <ChevronRightIcon fontSize="small" sx={{ color: "#333" }} />
      </IconButton>

      {/* Lock icon removed - subjects are always accessible, only first chapter is locked */}
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: accent,
            width: 44,
            height: 44,
            color: "#fff",
            "& svg": { color: "#fff" }, // prevent default MUI blue icons
          }}
        >
          {icon}
        </Avatar>
        <Box>
          <Typography fontWeight={700}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const cookies = new Cookies();

// Subject configuration mapping
const getSubjectConfig = (subjectName) => {
  const name = subjectName.toLowerCase();
  
  if (name.includes('math') || name.includes('mathematics')) {
    return {
      subtitle: 'Number puzzles & fun',
      slug: 'math',
      bg: '#E9ECFF',
      accent: '#7788F8',
      icon: <CalculateIcon />,
      image: MATH_IMG,
    };
  } else if (name.includes('science')) {
    return {
      subtitle: "Discover nature's secrets",
      slug: 'science',
      bg: '#E7FAF0',
      accent: '#54C08A',
      icon: <ScienceIcon />,
      image: SCIENCE_IMG,
    };
  } else if (name.includes('english') || name.includes('language')) {
    return {
      subtitle: 'Stories & reading',
      slug: 'english',
      bg: '#FBE6EF',
      accent: '#F06AAE',
      icon: <MenuBookIcon />,
      image: ENGLISH_IMG,
    };
  } else if (name.includes('arts') || name.includes('creativity') || name.includes('arts')) {
    return {
      subtitle: 'Draw & paint',
      slug: 'arts',
      bg: '#FFF4DD',
      accent: '#FFB74D',
      icon: <BrushIcon />,
      image: ARTS_IMG,
    };
  } else {
    // Default configuration for unknown subjects
    return {
      subtitle: 'Explore & learn',
      slug: name.replace(/\s+/g, '-').toLowerCase(),
      bg: '#F5F5F5',
      accent: '#9E9E9E',
      icon: <MenuBookIcon />,
      image: DEFAULT_IMG,
    };
  }
};

/* ---------- Page ---------- */
export default function SubjectPage() {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(DEFAULT_IMG);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      const token = cookies.get("token");
      const selectedChild = cookies.get("selectedChild"); // Already an object
      
      if (!token || !selectedChild) {
        router.push("/profiles");
        return;
      }

      const { id: selectedChildId, classno: selectedChildClass } = selectedChild;

      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching subjects for class:", selectedChildClass, "childId:", selectedChildId);
        console.log("Full URL:", `/api/v1/subject/by-class/${selectedChildClass}?childId=${selectedChildId}`);
        
        const response = await axios.get(`/api/v1/subject/by-class/${selectedChildClass}`, {
          params: { childId: selectedChildId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log("Subjects response:", response.data);

        if (response.status === 200 && response.data.subjects) {
          const backendSubjects = response.data.subjects;
          
          console.log("Backend subjects received:", backendSubjects.map(s => ({ name: s.name, locked: s.locked })));
          
          // Map backend subjects to frontend format
          const mappedSubjects = backendSubjects.map((subject) => {
            const config = getSubjectConfig(subject.name);
            const mapped = {
              _id: subject._id,
              title: subject.name,
              subtitle: config.subtitle,
              slug: config.slug,
              bg: config.bg,
              accent: config.accent,
              icon: config.icon,
              image: config.image,
              locked: false, // Always show subjects as unlocked - only first chapter is locked
            };
            console.log("Mapped subject:", mapped.title, "locked:", mapped.locked);
            return mapped;
          });
          
          console.log("Final subjects array:", mappedSubjects.map(s => ({ title: s.title, locked: s.locked })));
          setSubjects(mappedSubjects);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        if (error.response) {
          if (error.response.status === 401) {
            cookies.remove("token");
            router.push("/profiles");
            return;
          } else if (error.response.status === 404) {
            setError("Subjects endpoint not found. Please check server configuration.");
          } else {
            setError(error.response.data?.message || "Failed to load subjects. Please try again.");
          }
        } else {
          setError("Network error. Please check if the server is running.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [router]);

  return (
    <AuthFrame showBack={true}>
      {/* <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#1EA0FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      > */}
        <Container
          maxWidth="lg"
          sx={{ bgcolor: "#fff", borderRadius: 0, boxShadow: 0, p: 0 }}
        >
          {/* Header */}
          <Box sx={{ position: "relative", mb: 2 }}>
            {/* Back button is provided by AuthFrame header */}

            <Stack
              direction="row"
              spacing={1}
              sx={{ position: "absolute", right: 48, top: 0 }}
            >
              <Tooltip title="Leaderboard">
                <IconButton
                  size="medium"
                  aria-label="Open leaderboard"
                  onClick={() => router.push("/leaderboard")}
                >
                  <EmojiEventsIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
              {/* <Tooltip title="Language">
                <IconButton size="small">
                  <LanguageIcon fontSize="small" />
                </IconButton>
              </Tooltip> */}
            </Stack>

            <Box sx={{ position: "absolute", right: 0, top: 0 }}>
              <UserProfileMenu />
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography color="text.secondary" variant="h4" fontWeight={800}>
            Explore your Subjects!
          </Typography>
          <Typography color="text.primary" mb={2}>
            Pick a world to start your adventure.
          </Typography>

          {/* Main Content */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "7fr 5fr",
              gap: 2,
              alignItems: "stretch",
            }}
          >
            {/* LEFT: Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              {loading ? (
                <Typography>Loading subjects...</Typography>
              ) : error ? (
                <Typography color="error">{error}</Typography>
              ) : subjects.length === 0 ? (
                <Typography>No subjects available for your class.</Typography>
              ) : (
                subjects.map((s) => (
                  <SubjectCard
                    key={s._id || s.slug}
                    {...s}
                    onHover={() => setActiveImage(s.image)}
                    onLeave={() => setActiveImage(DEFAULT_IMG)}
                    onClick={() => {
                      // Subjects are always clickable - only first chapter is accessible
                      // Store subject info in cookies and route to chapters
                      const selectedChild = cookies.get("selectedChild"); // Already an object

                      if (!selectedChild) {
                        console.error(
                          "Child not found. Redirecting to profiles."
                        );
                        router.push("/profiles");
                        return;
                      }

                      // Store subject data as object (react-cookie will serialize it)
                      cookies.set("selectedSubject", {
                        id: s._id,
                        name: s.title,
                        slug: s.slug
                      }, {
                        path: "/",
                        maxAge: 30 * 24 * 60 * 60,
                      });

                      console.log("Redirecting to chapters with:", {
                        subject: s.title,
                        childClass: selectedChild.classno,
                        childId: selectedChild.id,
                      });

                      router.push("/chapters");
                    }}
                  />
                ))
              )}
            </Box>

            {/* RIGHT: Image (height locked to cards) */}
            <Box
              sx={{
                position: "relative",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Card
                elevation={0}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#Ffff",
                  borderRadius: 5,
                }}
              >
                <Box
                  sx={{
                    width: 300,
                    height: 300,
                    borderRadius: "10px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "transparent",
                  }}
                >
                  <CardMedia
                    component="img"
                    image={activeImage}
                    alt="Subject helper"
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: "10px",
                    }}
                  />
                </Box>
              </Card>
            </Box>
          </Box>
        </Container>
      {/* </Box> */}
    </AuthFrame>
  );
}
