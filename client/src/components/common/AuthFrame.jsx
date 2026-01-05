import Image from "next/image";
import blackLogo from "../../../public/Black logo (1).png";
import { useRouter } from "next/router";
import { Box, IconButton, Paper } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

export default function AuthFrame({ children, showBack = true, customHeader, reducedPadding = false }) {
  const router = useRouter();
  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, md: 3 },
        backgroundColor: "#0B91FF",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1100,
          borderRadius: 3,
          p: reducedPadding ? 2.5 : 4,
          display: "flex",
          flexDirection: "column",
          maxHeight: { xs: "calc(100vh - 32px)", md: "calc(100vh - 64px)" },
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {customHeader ? (
            customHeader
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Image src={blackLogo} alt="Study Pilot Logo" height={25} />
              </Box>

              {showBack && (
                <IconButton
                  onClick={() => router.back()}
                  aria-label="Go back"
                  size="small"
                  sx={{ color: "#333", p: 0.5 }}
                >
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}
        </Box>

        {/* Page-specific content */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            pt: 2,
          }}
        >
          {children}
        </Box>
      </Paper>
    </Box>
  );
}
