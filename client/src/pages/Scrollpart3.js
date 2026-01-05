import Image from "next/image";
import animalsImage from "../../public/GroupAnimals.png";
import cloudsImage from "../../public/Clouds.png";
import { Alfa_Slab_One, Alegreya } from "next/font/google";
import { Box, Typography } from "@mui/material";

const alfaSlab = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
});

const alegreya = Alegreya({
  weight: ["400", "500"],
  subsets: ["latin"],
});

export default function ScrollThree() {
  return (
    <Box component="section" sx={{ backgroundColor: "#F3C057", position: "relative", overflow: "hidden", py: { xs: 10, md: 14 }, px: 2 }}>
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: { xs: 4, md: 7 },
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* LEFT: Text */}
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography
            sx={{
              fontFamily: alfaSlab.style.fontFamily,
              fontWeight: 400,
              color: "#000",
              fontSize: { xs: 28, md: 36 },
              mb: 3,
            }}
          >
            free. fun. effective !
          </Typography>
          <Typography
            sx={{
              fontFamily: alegreya.style.fontFamily,
              color: "#000",
              fontSize: { xs: 16, md: 20 },
              lineHeight: 1.8,
            }}
          >
            With a safe, colorful, and engaging experience, we turn screen time into smart time, helping young learners enjoy learning while building strong foundations.
          </Typography>
        </Box>

        {/* RIGHT: Image */}
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Image src={animalsImage} alt="Group of friendly animals" width={500} height={500} priority />
        </Box>
      </Box>

      {/* Clouds decoration */}
      <Box sx={{ position: "absolute", bottom: -10, left: 0, width: "100%", height: 250, zIndex: 2 }}>
        <Image src={cloudsImage} alt="Cloud decoration" fill priority style={{ objectFit: "cover" }} />
      </Box>
    </Box>
  );
}
