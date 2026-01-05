import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Head from "next/head";
import AuthFrame from "../components/common/AuthFrame";
import UserProfileMenu from "../components/common/UserProfileMenu";
import { Box, Card, CardContent, Typography, Button, Chip } from "@mui/material";
import { Poppins } from "next/font/google";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cookies = new Cookies();

export default function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const router = useRouter();

  const token = cookies.get("token");

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    fetchSubscription();
  }, [token]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
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
        setSubscription(response.data);
      }
    } catch (error) {
      cookies.remove("token", { path: "/" });
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (type) => {
    try {
      setMessage("");
      // Store subscription type in cookie and redirect to payment page
      cookies.set("subscriptionType", type, { path: "/", maxAge: 30 * 60 }); // 30 minutes
      router.push("/payment");
    } catch (error) {
      setMessage("Failed to proceed to payment. Please try again.");
      setMessageType("error");
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      active: { bg: "#4CAF50", text: "Active" },
      trial: { bg: "#FF9800", text: "Trial" },
      expired: { bg: "#F44336", text: "Expired" },
    };
    const status = statusColors[subscription?.status || "trial"] || statusColors.trial;
    return (
      <Chip
        icon={<CardMembershipIcon />}
        label={status.text}
        sx={{
          backgroundColor: status.bg,
          color: "white",
          fontWeight: "600",
          fontSize: "16px",
          padding: "8px 16px",
        }}
      />
    );
  };

  return (
    <>
      <Head>
        <title>Subscription Management</title>
        <meta name="description" content="Manage your subscription" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthFrame showBack={true}>
        <Box
          sx={{
            width: "100%",
            padding: "20px",
            maxWidth: "800px",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* User Profile Menu - Top Right */}
          <Box sx={{ position: "absolute", right: 20, top: 0 }}>
            <UserProfileMenu />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginBottom: 4,
            }}
          >
            <CardMembershipIcon sx={{ fontSize: 40, color: "#0B91FF" }} />
            <Typography
              className={poppins.className}
              sx={{
                fontSize: { xs: "28px", md: "36px" },
                fontWeight: "700",
                color: "#000000",
              }}
            >
              Subscription Management
            </Typography>
          </Box>

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
              }}
            >
              {message}
            </Box>
          )}

          {loading ? (
            <Typography className={poppins.className}>Loading...</Typography>
          ) : (
            <>
              {/* Current Status */}
              <Card
                sx={{
                  marginBottom: 4,
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: 2,
                    }}
                  >
                    Current Status
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2 }}>
                    {getStatusBadge()}
                  </Box>
                  {subscription?.endDate && (
                    <Typography
                      className={poppins.className}
                      sx={{
                        fontSize: "14px",
                        color: "#666666",
                      }}
                    >
                      Expires: {new Date(subscription.endDate).toLocaleDateString()}
                    </Typography>
                  )}
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "14px",
                      color: "#666666",
                      marginTop: 2,
                      fontStyle: "italic",
                    }}
                  >
                    One subscription unlocks all children's access
                  </Typography>
                </CardContent>
              </Card>

              {/* Subscription Plans */}
              {subscription?.status !== "active" && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 3,
                    marginBottom: 4,
                  }}
                >
                  {/* Monthly Plan */}
                  <Card
                    sx={{
                      flex: 1,
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      border: "2px solid #E0E0E0",
                      "&:hover": {
                        border: "2px solid #0B91FF",
                        boxShadow: "0 4px 12px rgba(11, 145, 255, 0.2)",
                      },
                    }}
                  >
                    <CardContent sx={{ padding: 3, textAlign: "center" }}>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "24px",
                          fontWeight: "700",
                          marginBottom: 1,
                        }}
                      >
                        Monthly
                      </Typography>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "36px",
                          fontWeight: "700",
                          color: "#0B91FF",
                          marginBottom: 2,
                        }}
                      >
                        $9.99
                      </Typography>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "14px",
                          color: "#666666",
                          marginBottom: 3,
                        }}
                      >
                        per month
                      </Typography>
                      <Button
                        onClick={() => handleSubscribe("monthly")}
                        variant="contained"
                        fullWidth
                        sx={{
                          backgroundColor: "#000000",
                          color: "white",
                          padding: "12px",
                          fontSize: "16px",
                          fontWeight: "600",
                          "&:hover": {
                            backgroundColor: "#333333",
                          },
                        }}
                      >
                        Subscribe
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Yearly Plan */}
                  <Card
                    sx={{
                      flex: 1,
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      border: "2px solid #0B91FF",
                      position: "relative",
                      "&:hover": {
                        boxShadow: "0 4px 12px rgba(11, 145, 255, 0.3)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: 20,
                        backgroundColor: "#4CAF50",
                        color: "white",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      BEST VALUE
                    </Box>
                    <CardContent sx={{ padding: 3, textAlign: "center" }}>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "24px",
                          fontWeight: "700",
                          marginBottom: 1,
                        }}
                      >
                        Yearly
                      </Typography>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "36px",
                          fontWeight: "700",
                          color: "#0B91FF",
                          marginBottom: 1,
                        }}
                      >
                        $99.99
                      </Typography>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "14px",
                          color: "#666666",
                          marginBottom: 1,
                        }}
                      >
                        per year
                      </Typography>
                      <Typography
                        className={poppins.className}
                        sx={{
                          fontSize: "12px",
                          color: "#4CAF50",
                          marginBottom: 3,
                          fontWeight: "600",
                        }}
                      >
                        Save $19.89 (17% off)
                      </Typography>
                      <Button
                        onClick={() => handleSubscribe("yearly")}
                        variant="contained"
                        fullWidth
                        sx={{
                          backgroundColor: "#000000",
                          color: "white",
                          padding: "12px",
                          fontSize: "16px",
                          fontWeight: "600",
                          "&:hover": {
                            backgroundColor: "#333333",
                          },
                        }}
                      >
                        Subscribe
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              )}

              {/* Benefits */}
              <Card
                sx={{
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  backgroundColor: "#F9F9F9",
                }}
              >
                <CardContent sx={{ padding: 3 }}>
                  <Typography
                    className={poppins.className}
                    sx={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: 2,
                    }}
                  >
                    Subscription Benefits
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {[
                      "Unlock all chapters for all children",
                      "Access to all subjects and courses",
                      "Instant activation for all profiles",
                      "No per-child charges",
                      "Cancel anytime",
                    ].map((benefit, index) => (
                      <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <CheckCircleIcon sx={{ color: "#4CAF50", fontSize: 20 }} />
                        <Typography
                          className={poppins.className}
                          sx={{
                            fontSize: "14px",
                            color: "#000000",
                          }}
                        >
                          {benefit}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      </AuthFrame>
    </>
  );
}

