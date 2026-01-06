import { useState, useEffect } from "react";
import {
  Box,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { Cookies } from "react-cookie";
import { useRouter } from "next/router";
import axios from "axios";

const cookies = new Cookies();

export default function UserProfileMenu() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [userEmail, setUserEmail] = useState("User");
  const open = Boolean(anchorEl);

  // Fetch user info from /api/v1/me
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = cookies.get("token");
      if (!token) return;

      try {
        const response = await axios.get("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 200) {
          setUserEmail(response.data.email || "User");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);
  
  // Get initials for avatar
  const getInitials = (email) => {
    if (!email || email === "User") return "U";
    // Extract first letter from email (before @)
    const firstLetter = email.split("@")[0].charAt(0).toUpperCase();
    return firstLetter;
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Remove token cookie
    cookies.remove("token", { path: "/" });
    
    // Redirect to login/home page
    router.push("/");
    handleClose();
  };

  return (
    <Box>
      <IconButton
        onClick={handleClick}
        sx={{
          padding: 0,
          "&:hover": {
            transform: "scale(1.05)",
            transition: "transform 0.2s",
          },
        }}
      >
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: "#ff6b6b",
            color: "#fff",
            cursor: "pointer",
            border: "3px solid white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            fontSize: "1.2rem",
            fontWeight: 600,
          }}
        >
          {getInitials(userEmail)}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.15))",
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#333" }}>
            {userEmail && userEmail !== "User" ? userEmail : "User"}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem
          onClick={handleLogout}
          sx={{
            py: 1.5,
            px: 2,
            gap: 1.5,
            "&:hover": {
              backgroundColor: "#fff5f5",
            },
          }}
        >
          <LogoutIcon sx={{ fontSize: 20, color: "#ff6b6b" }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Logout
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
