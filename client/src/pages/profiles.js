import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Head from "next/head";
import AuthFrame from "../components/common/AuthFrame";
import UserProfileMenu from "../components/common/UserProfileMenu";
import { Box, Modal, TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Chip, Button, Typography } from "@mui/material";
import { Poppins } from "next/font/google";
import EditIcon from "@mui/icons-material/Edit";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DeleteIcon from "@mui/icons-material/Delete";
import CardMembershipIcon from "@mui/icons-material/CardMembership";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cookies = new Cookies();

// Cute animal emojis/icons for profiles (10 emojis as requested)
const animalIcons = ["🐱", "🐶", "🐰", "🐻", "🐼", "🦊", "🐯", "🦁", "🐸", "🐨"];

export default function Profiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deleteProfileId, setDeleteProfileId] = useState(null);
  const [deleteOtp, setDeleteOtp] = useState("");
  const [showDeleteOtp, setShowDeleteOtp] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileClass, setNewProfileClass] = useState("");
  const [newProfileEmoji, setNewProfileEmoji] = useState("🐱");
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileClass, setEditProfileClass] = useState("");
  const [editProfileEmoji, setEditProfileEmoji] = useState("🐱");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [sessionOtp, setSessionOtp] = useState("");
  const [showSessionOtp, setShowSessionOtp] = useState(false);
  const router = useRouter();

  //saving current avatar for the next pages in cookies 
  const AvatarHandling = (profile) => {
    // Store child data as object (react-cookie will serialize it)
    cookies.set("selectedChild", {
      id: profile.id,
      name: profile.name,
      classno: profile.classno,
      emoji: profile.emoji
    }, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    }); 

    router.push("/Subject");
  };

  // Get token from cookies
  const token = cookies.get("token");
  const [parentEmail, setParentEmail] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    
    // Fetch parent email from /api/v1/me
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get("/api/v1/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 200) {
          setParentEmail(response.data.email);
        }
      } catch (error) {
        cookies.remove("token", { path: "/" });
        router.push("/");
      }
    };
    
    fetchUserInfo();
    checkSession();
  }, [token]);

  const checkSession = async () => {
    try {
      const response = await axios.get("/api/v1/parent/check-session", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Prevent AxiosError overlay on expected auth failures; handle via status checks.
        validateStatus: (status) => status === 200 || status === 401 || status === 403,
      });

      if (response.status === 401 || response.status === 403) {
        cookies.remove("token", { path: "/" });
        router.push("/");
        return;
      }

      if (response.status === 200) {
        if (response.data.requiresOtp) {
          setRequiresOtp(true);
          setShowSessionOtp(true);
          // Send OTP for session verification - need to fetch email first
          if (parentEmail) {
            await axios.post("/api/v1/parent/login", { email: parentEmail });
            setMessage("Session expired. OTP sent to your email.");
            setMessageType("error");
          }
        } else {
          fetchProfiles();
          fetchSubscriptionStatus();
        }
      }
    } catch (error) {
      cookies.remove("token", { path: "/" });
      router.push("/");
    }
  };

  const verifySessionOtp = async () => {
    try {
      const response = await axios.post("/api/v1/verify/parent", {
        email: parentEmail,
        otp: sessionOtp,
      });
      if (response.status === 200) {
        cookies.set("token", response.data.token);
        setRequiresOtp(false);
        setShowSessionOtp(false);
        setSessionOtp("");
        setMessage("");
        fetchProfiles();
        fetchSubscriptionStatus();
      }
    } catch (error) {
      setMessage("Invalid OTP. Please try again.");
      setMessageType("error");
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/v1/parent/children", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 200 || status === 401 || status === 403,
      });

      if (response.status === 401 || response.status === 403) {
        cookies.remove("token", { path: "/" });
        router.push("/");
        return;
      }

      if (response.status === 200) {
        setProfiles(response.data.children || []);
      }
    } catch (error) {
      cookies.remove("token", { path: "/" });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get("/api/v1/parent/subscription", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 200 || status === 401 || status === 403,
      });

      if (response.status === 401 || response.status === 403) {
        cookies.remove("token", { path: "/" });
        router.push("/");
        return;
      }

      if (response.status === 200) {
        setSubscriptionStatus(response.data.status || "trial");
      }
    } catch (error) {
      cookies.remove("token", { path: "/" });
      router.push("/");
    }
  };

  const handleAddProfile = async () => {
    if (!newProfileName || !newProfileClass) {
      setMessage("Please enter name and select class.");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.post(
        "/api/v1/parent/child",
        {
          name: newProfileName,
          classno: newProfileClass,
          emoji: newProfileEmoji,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 201) {
        setMessage("Profile created successfully!");
        setMessageType("success");
        setOpenAddModal(false);
        setNewProfileName("");
        setNewProfileClass("");
        setNewProfileEmoji("🐱");
        fetchProfiles();
      }
    } catch (error) {
      setMessage("Failed to create profile. Please try again.");
      setMessageType("error");
    }
  };

  const handleEditClick = (profile, e) => {
    e.stopPropagation();
    setEditingProfile(profile);
    setEditProfileName(profile.name);
    setEditProfileClass(profile.classno);
    setEditProfileEmoji(profile.emoji || "🐱");
    setOpenEditModal(true);
    setMessage("");
  };

  const handleUpdateProfile = async () => {
    if (!editProfileName || !editProfileClass) {
      setMessage("Please enter name and select class.");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.put(
        `/api/v1/parent/child/${editingProfile.id}`,
        {
          name: editProfileName,
          classno: editProfileClass,
          emoji: editProfileEmoji,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        setMessage("Profile updated successfully!");
        setMessageType("success");
        setOpenEditModal(false);
        setEditingProfile(null);
        fetchProfiles();
      }
    } catch (error) {
      setMessage("Failed to update profile. Please try again.");
      setMessageType("error");
    }
  };

  const handleProfileClick = (profile) => {
    // Store child data as object (react-cookie will serialize it)
    cookies.set("selectedChild", {
      id: profile.id,
      name: profile.name,
      classno: profile.classno,
      emoji: profile.emoji
    }, { path: "/", maxAge: 30 * 24 * 60 * 60 });
    router.push("/Subject");
  };

  const handleAcademicReport = (profile, e) => {
    e.stopPropagation();
    // Store child data as object (react-cookie will serialize it)
    cookies.set("selectedChild", {
      id: profile.id,
      name: profile.name,
      classno: profile.classno,
      emoji: profile.emoji
    }, { path: "/", maxAge: 30 * 24 * 60 * 60 });
    router.push("/academic-report");
  };

  const handleDeleteClick = () => {
    setDeleteProfileId(editingProfile.id);
    setOpenEditModal(false);
    setOpenDeleteModal(true);
    setShowDeleteOtp(false);
    setDeleteOtp("");
    setMessage("");
  };

  const handleDeleteOtpRequest = async () => {
    try {
      const response = await axios.post(
        "/api/v1/parent/child/delete-otp",
        { childId: deleteProfileId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        setShowDeleteOtp(true);
        setMessage("OTP sent to your email. Please check and enter it.");
        setMessageType("success");
      }
    } catch (error) {
      setMessage("Failed to send OTP. Please try again.");
      setMessageType("error");
    }
  };

  const handleDeleteProfile = async () => {
    if (!deleteOtp) {
      setMessage("Please enter the OTP.");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.delete(
        `/api/v1/parent/child/${deleteProfileId}`,
        {
          data: { otp: deleteOtp },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        setMessage("Profile deleted successfully!");
        setMessageType("success");
        setOpenDeleteModal(false);
        setDeleteProfileId(null);
        setDeleteOtp("");
        setShowDeleteOtp(false);
        fetchProfiles();
        // If no profiles left, stay on page (user can add new one)
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setMessage("Invalid OTP. Please try again.");
      } else {
        setMessage("Failed to delete profile. Please try again.");
      }
      setMessageType("error");
    }
  };

  const getSubscriptionBadge = () => {
    const statusColors = {
      active: { bg: "#4CAF50", text: "Active" },
      trial: { bg: "#FF9800", text: "Trial" },
      expired: { bg: "#F44336", text: "Expired" },
    };
    const status = statusColors[subscriptionStatus] || statusColors.trial;
    return (
      <Chip
        icon={<CardMembershipIcon />}
        label={status.text}
        sx={{
          backgroundColor: status.bg,
          color: "white",
          fontWeight: "600",
        }}
      />
    );
  };

  // Session OTP Modal
  if (showSessionOtp) {
    return (
      <AuthFrame showBack={true}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "40px 20px",
          }}
        >
          <Typography
            className={poppins.className}
            sx={{
              fontSize: "24px",
              fontWeight: "700",
              marginBottom: 2,
            }}
          >
            Session Verification Required
          </Typography>
          <Typography
            className={poppins.className}
            sx={{
              fontSize: "16px",
              color: "#666666",
              marginBottom: 3,
              textAlign: "center",
            }}
          >
            Please enter the OTP sent to your email to continue.
          </Typography>
          {message && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: "8px",
                backgroundColor: messageType === "success" ? "#E8F5E9" : "#FFEBEE",
                color: messageType === "success" ? "#2E7D32" : "#C62828",
                textAlign: "center",
                fontSize: "14px",
                maxWidth: "400px",
                width: "100%",
              }}
            >
              {message}
            </Box>
          )}
          <TextField
            label="Enter OTP"
            value={sessionOtp}
            onChange={(e) => {
              setSessionOtp(e.target.value);
              setMessage("");
            }}
            fullWidth
            sx={{ maxWidth: "400px", marginBottom: 2 }}
          />
          <Button
            onClick={verifySessionOtp}
            variant="contained"
            sx={{
              backgroundColor: "#000000",
              color: "white",
              padding: "12px 32px",
              "&:hover": { backgroundColor: "#333333" },
            }}
          >
            Verify OTP
          </Button>
        </Box>
      </AuthFrame>
    );
  }

  return (
    <>
      <Head>
        <title>Who's Watching?</title>
        <meta name="description" content="Select a profile" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame showBack={true}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            width: "100%",
            padding: "40px 20px",
          }}
        >
          {/* Header with Subscription Badge */}
          <Box
            sx={{
              textAlign: "center",
              marginBottom: "40px",
              width: "100%",
              maxWidth: "900px",
              position: "relative",
            }}
          >
            {/* User Profile Menu - Top Right */}
            <Box sx={{ position: "absolute", right: 0, top: 0 }}>
              <UserProfileMenu />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
              {getSubscriptionBadge()}
            </Box>
            <h1
              className={poppins.className}
              style={{
                fontSize: "48px",
                fontWeight: "700",
                color: "#000000",
                margin: 0,
                marginBottom: "16px",
              }}
            >
              Who's Watching?
            </h1>
            <p
              className={poppins.className}
              style={{
                fontSize: "18px",
                color: "#666666",
                margin: 0,
              }}
            >
              Select a profile or add a new one
            </p>
            <Typography
              className={poppins.className}
              sx={{
                fontSize: "12px",
                color: "#999999",
                marginTop: 1,
                fontStyle: "italic",
              }}
            >
              Parent Access Only
            </Typography>
            <Button
              onClick={() => router.push("/subscription")}
              variant="outlined"
              startIcon={<CardMembershipIcon />}
              sx={{
                marginTop: 2,
                borderColor: "#0B91FF",
                color: "#0B91FF",
                "&:hover": {
                  borderColor: "#0B91FF",
                  backgroundColor: "#E3F2FD",
                },
              }}
            >
              Manage Subscription
            </Button>
          </Box>

          {/* Message display */}
          {message && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: "8px",
                backgroundColor: messageType === "success" ? "#E8F5E9" : "#FFEBEE",
                color: messageType === "success" ? "#2E7D32" : "#C62828",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: "500",
                maxWidth: "500px",
                width: "100%",
              }}
            >
              {message}
            </Box>
          )}

          {/* Profiles Grid */}
          {loading ? (
            <p className={poppins.className} style={{ color: "#666666" }}>
              Loading profiles...
            </p>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: "30px",
                justifyContent: "center",
                alignItems: "center",
                maxWidth: "900px",
                width: "100%",
                marginBottom: "40px",
              }}
            >
              {/* Existing Profiles */}
              {profiles.map((profile, index) => (
                <Box
                  key={profile.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                    "&:hover": {
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <Box
                    onClick={() => handleProfileClick(profile)}
                    sx={{
                      width: "150px",
                      height: "150px",
                      borderRadius: "8px",
                      backgroundColor: "#E3F2FD",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "80px",
                      marginBottom: "16px",
                      border: "3px solid transparent",
                      "&:hover": {
                        border: "3px solid #0B91FF",
                      },
                    }}
                  >
                    {profile.emoji || animalIcons[index % animalIcons.length]}
                  </Box>

                  {/* Action buttons */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: "0",
                      right: "0",
                      display: "flex",
                      gap: "4px",
                    }}
                  >
                    <IconButton
                      onClick={(e) => handleEditClick(profile, e)}
                      size="small"
                      sx={{
                        backgroundColor: "#2196F3",
                        color: "white",
                        width: "32px",
                        height: "32px",
                        "&:hover": {
                          backgroundColor: "#1976D2",
                        },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={(e) => handleAcademicReport(profile, e)}
                      size="small"
                      sx={{
                        backgroundColor: "#4CAF50",
                        color: "white",
                        width: "32px",
                        height: "32px",
                        "&:hover": {
                          backgroundColor: "#45a049",
                        },
                      }}
                    >
                      <AssessmentIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <p
                    className={poppins.className}
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#000000",
                      margin: 0,
                      textAlign: "center",
                    }}
                  >
                    {profile.name}
                  </p>
                  <p
                    className={poppins.className}
                    style={{
                      fontSize: "14px",
                      color: "#666666",
                      margin: "4px 0 0 0",
                      textAlign: "center",
                    }}
                  >
                    Class {profile.classno}
                  </p>
                </Box>
              ))}

              {/* Add Profile Card */}
              <Box
                onClick={() => setOpenAddModal(true)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "8px",
                    backgroundColor: "#F5F5F5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "60px",
                    marginBottom: "16px",
                    border: "3px dashed #CCCCCC",
                    "&:hover": {
                      border: "3px dashed #0B91FF",
                      backgroundColor: "#E3F2FD",
                    },
                  }}
                >
                  +
                </Box>
                <p
                  className={poppins.className}
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#666666",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  Add Profile
                </p>
              </Box>
            </Box>
          )}
        </Box>

        {/* Add Profile Modal */}
        <Modal
          open={openAddModal}
          onClose={() => {
            setOpenAddModal(false);
            setNewProfileName("");
            setNewProfileClass("");
            setNewProfileEmoji("🐱");
            setMessage("");
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "40px",
              maxWidth: "500px",
              width: "90%",
              outline: "none",
            }}
          >
            <h2
              className={poppins.className}
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "24px",
                color: "#000000",
              }}
            >
              Add New Profile
            </h2>

            {message && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: "8px",
                  backgroundColor: messageType === "success" ? "#E8F5E9" : "#FFEBEE",
                  color: messageType === "success" ? "#2E7D32" : "#C62828",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {message}
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <TextField
                label="Child's Name"
                value={newProfileName}
                onChange={(e) => {
                  setNewProfileName(e.target.value);
                  setMessage("");
                }}
                fullWidth
                className={poppins.className}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
              />

              <FormControl fullWidth>
                <InputLabel className={poppins.className}>Class</InputLabel>
                <Select
                  value={newProfileClass}
                  onChange={(e) => {
                    setNewProfileClass(e.target.value);
                    setMessage("");
                  }}
                  label="Class"
                  className={poppins.className}
                  sx={{
                    borderRadius: "8px",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((classNum) => (
                    <MenuItem key={classNum} value={classNum}>
                      Class {classNum}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <p className={poppins.className} style={{ marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
                  Choose Emoji
                </p>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    justifyContent: "center",
                  }}
                >
                  {animalIcons.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => {
                        setNewProfileEmoji(emoji);
                        setMessage("");
                      }}
                      sx={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "30px",
                        cursor: "pointer",
                        border: newProfileEmoji === emoji ? "3px solid #0B91FF" : "2px solid #E0E0E0",
                        backgroundColor: newProfileEmoji === emoji ? "#E3F2FD" : "#FFFFFF",
                        "&:hover": {
                          border: "3px solid #0B91FF",
                          backgroundColor: "#E3F2FD",
                        },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    setOpenAddModal(false);
                    setNewProfileName("");
                    setNewProfileClass("");
                    setNewProfileEmoji("🐱");
                    setMessage("");
                  }}
                  className={poppins.className}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "2px solid #CCCCCC",
                    backgroundColor: "#FFFFFF",
                    color: "#000000",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProfile}
                  className={poppins.className}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    backgroundColor: "#000000",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Add Profile
                </button>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          open={openEditModal}
          onClose={() => {
            setOpenEditModal(false);
            setEditingProfile(null);
            setEditProfileName("");
            setEditProfileClass("");
            setEditProfileEmoji("🐱");
            setMessage("");
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "40px",
              maxWidth: "500px",
              width: "90%",
              outline: "none",
            }}
          >
            <h2
              className={poppins.className}
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "24px",
                color: "#000000",
              }}
            >
              Edit Profile
            </h2>

            {message && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: "8px",
                  backgroundColor: messageType === "success" ? "#E8F5E9" : "#FFEBEE",
                  color: messageType === "success" ? "#2E7D32" : "#C62828",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {message}
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <TextField
                label="Child's Name"
                value={editProfileName}
                onChange={(e) => {
                  setEditProfileName(e.target.value);
                  setMessage("");
                }}
                fullWidth
                className={poppins.className}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
              />

              <FormControl fullWidth>
                <InputLabel className={poppins.className}>Class</InputLabel>
                <Select
                  value={editProfileClass}
                  onChange={(e) => {
                    setEditProfileClass(e.target.value);
                    setMessage("");
                  }}
                  label="Class"
                  className={poppins.className}
                  sx={{
                    borderRadius: "8px",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((classNum) => (
                    <MenuItem key={classNum} value={classNum}>
                      Class {classNum}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <p className={poppins.className} style={{ marginBottom: "12px", fontSize: "14px", fontWeight: "500" }}>
                  Choose Emoji
                </p>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    justifyContent: "center",
                  }}
                >
                  {animalIcons.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => {
                        setEditProfileEmoji(emoji);
                        setMessage("");
                      }}
                      sx={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "30px",
                        cursor: "pointer",
                        border: editProfileEmoji === emoji ? "3px solid #0B91FF" : "2px solid #E0E0E0",
                        backgroundColor: editProfileEmoji === emoji ? "#E3F2FD" : "#FFFFFF",
                        "&:hover": {
                          border: "3px solid #0B91FF",
                          backgroundColor: "#E3F2FD",
                        },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  onClick={handleDeleteClick}
                  className={poppins.className}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "2px solid #f44336",
                    backgroundColor: "#FFFFFF",
                    color: "#f44336",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setOpenEditModal(false);
                    setEditingProfile(null);
                    setMessage("");
                  }}
                  className={poppins.className}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: "2px solid #CCCCCC",
                    backgroundColor: "#FFFFFF",
                    color: "#000000",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  className={poppins.className}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    backgroundColor: "#000000",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  Save
                </button>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Delete Profile Modal */}
        <Modal
          open={openDeleteModal}
          onClose={() => {
            setOpenDeleteModal(false);
            setDeleteProfileId(null);
            setDeleteOtp("");
            setShowDeleteOtp(false);
            setMessage("");
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              padding: "40px",
              maxWidth: "500px",
              width: "90%",
              outline: "none",
            }}
          >
            <h2
              className={poppins.className}
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "24px",
                color: "#000000",
              }}
            >
              Delete Profile
            </h2>

            {message && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: "8px",
                  backgroundColor: messageType === "success" ? "#E8F5E9" : "#FFEBEE",
                  color: messageType === "success" ? "#2E7D32" : "#C62828",
                  textAlign: "center",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {message}
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {!showDeleteOtp ? (
                <>
                  <p className={poppins.className} style={{ fontSize: "16px", color: "#666666" }}>
                    Are you sure you want to delete this profile? An OTP will be sent to your email for verification.
                  </p>
                  <Box sx={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => {
                        setOpenDeleteModal(false);
                        setDeleteProfileId(null);
                        setMessage("");
                      }}
                      className={poppins.className}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        borderRadius: "8px",
                        border: "2px solid #CCCCCC",
                        backgroundColor: "#FFFFFF",
                        color: "#000000",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteOtpRequest}
                      className={poppins.className}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        borderRadius: "8px",
                        backgroundColor: "#f44336",
                        color: "#FFFFFF",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        border: "none",
                      }}
                    >
                      Send OTP
                    </button>
                  </Box>
                </>
              ) : (
                <>
                  <TextField
                    label="Enter OTP"
                    value={deleteOtp}
                    onChange={(e) => {
                      setDeleteOtp(e.target.value);
                      setMessage("");
                    }}
                    fullWidth
                    className={poppins.className}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => {
                        setOpenDeleteModal(false);
                        setDeleteProfileId(null);
                        setDeleteOtp("");
                        setShowDeleteOtp(false);
                        setMessage("");
                      }}
                      className={poppins.className}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        borderRadius: "8px",
                        border: "2px solid #CCCCCC",
                        backgroundColor: "#FFFFFF",
                        color: "#000000",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteProfile}
                      className={poppins.className}
                      style={{
                        flex: 1,
                        padding: "12px 24px",
                        borderRadius: "8px",
                        backgroundColor: "#f44336",
                        color: "#FFFFFF",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                        border: "none",
                      }}
                    >
                      Delete Profile
                    </button>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Modal>
      </AuthFrame>
    </>
  );
}
