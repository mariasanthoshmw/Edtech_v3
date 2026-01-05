import Image from "next/image";
import dogImage from "../../public/dogs.png";
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

export default function ScrollSection() {
  return (
    <Box component="section" sx={{ backgroundColor: "#FFFFFF", py: { xs: 8, md: 11 }, px: 2 }}>
      <Box
        sx={{
          maxWidth: 1100,
          mx: "auto",
          display: "flex",
          alignItems: "center",
          gap: { xs: 4, md: 7 },
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Image src={dogImage} alt="Dog illustration" width={500} height={500} />
        </Box>
        <Box sx={{ flex: 1, textAlign: "center" }}>
          <Typography className={alfaSlab.className} sx={{ color: "#1a8cff", fontSize: { xs: 26, md: 34 }, lineHeight: 1.25, mb: 2 }}>
            Learning Made Fun for Young Minds
          </Typography>
          <Typography className={alegreya.className} sx={{ color: "#444", fontSize: { xs: 16, md: 20 }, lineHeight: 1.8 }}>
            Our student-friendly tech platform helps children from Classes 1 to 5 learn through interactive lessons, games, and simple activities. Designed to build strong basics in a fun way, it encourages curiosity, creativity, and confidence while making learning enjoyable and stress-free.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
