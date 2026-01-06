import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Cookies } from "react-cookie";
import Image from "next/image";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const cookies = new Cookies();
// Monthly subscription price (INR)
const BASE_PRICE_INR = 599;
 
const plans = [
  {
    title: "Free",
    price: "₹0",
    period: "Forever",
    description: "Play, learn & explore 🧩",
    color: "#EAF7FF",
    highlight: false,
    features: ["Starter lessons", "Fun quizzes", "Friendly help"],
    cta: "Start Playing",
  },
  {
    title: "Student Pro",
    description: "Unlock all learning adventures 🚀",
    color: "#FFF6D6",
    highlight: true,
    features: [
      "All Free features",
      "All subjects unlocked",
      "Games & scores",
      "Achievement badges 🏅",
    ],
    cta: "Start Free Trial",
  },
];
 
export default function PricingPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState("Free");
  const [selectedPlan, setSelectedPlan] = useState("Student Pro");
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [parentEmail, setParentEmail] = useState("");

  const token = cookies.get("token");

  // Keep pricing simple and clearly in INR.
  const monthlyPrice = BASE_PRICE_INR;
  const yearlyPrice = BASE_PRICE_INR * 12;

  useEffect(() => {
    // Check if user is logged in
    if (!token) {
      router.push("/");
      return;
    }

    // Get subscription type from cookie (set from subscription page)
    const subscriptionType = cookies.get("subscriptionType");
    if (subscriptionType) {
      setBilling(subscriptionType);
    }

    // Fetch parent email
    fetchParentEmail();
  }, [token]);

  const fetchParentEmail = async () => {
    try {
      const response = await axios.get("/api/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setParentEmail(response.data.email || "parent@example.com");
    } catch (error) {
      console.error("Failed to fetch parent email:", error);
      setParentEmail("parent@example.com");
    }
  };
 
  /* ---------------- Razorpay Loader ---------------- */
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
 
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };
 
  /* ---------------- Handle Plan Selection ---------------- */
  const handlePlanSelect = async (plan) => {
    if (plan !== "Student Pro") {
      setCurrentPlan("Free");
      return;
    }

    if (loading) return; // Prevent double clicks

    const amount = billing === "yearly" ? yearlyPrice : monthlyPrice;

    const razorpayLoaded = await loadRazorpay();
    if (!razorpayLoaded) {
      alert("Razorpay SDK failed to load. Please refresh and try again.");
      return;
    }

    try {
      setLoading(true);

      // Get token before creating order
      const authToken = cookies.get("token");
      if (!authToken) {
        alert("Authentication required. Please login again.");
        router.push("/");
        return;
      }

      // 1️⃣ Create order on backend
      const orderRes = await axios.post("/api/create-order", { amount });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "YOUR_RAZORPAY_KEY_ID",
        amount: orderRes.data.amount,
        currency: "INR",
        name: "Study.Pilot",
        description: `${billing === "yearly" ? "Yearly" : "Monthly"} Subscription`,
        order_id: orderRes.data.id,

        handler: async function (response) {
          console.log("✅ Payment success:", response);
          console.log("📤 Activating subscription with billing type:", billing);
          
          try {
            // 2️⃣ Activate subscription on backend (unlocks all subjects for all children)
            const subscriptionRes = await axios.post(
              "/api/v1/parent/subscription",
              { 
                type: billing,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              },
              {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                },
              }
            );

            console.log("✅ Subscription activation response:", subscriptionRes.data);

            if (subscriptionRes.status === 200) {
              setCurrentPlan("Student Pro");
              
              // Clear subscription type cookie
              cookies.remove("subscriptionType", { path: "/" });
              
              alert("🎉 Payment successful! All subjects unlocked for all your children!");
              
              // Redirect to profiles page
              setTimeout(() => {
                router.push("/profiles");
              }, 1500);
            }
          } catch (error) {
            console.error("❌ Subscription activation failed:", error);
            console.error("❌ Error response:", error.response?.data);
            console.error("❌ Error status:", error.response?.status);
            alert(`Payment received but activation failed: ${error.response?.data?.message || error.message}. Please contact support.`);
          } finally {
            setLoading(false);
          }
        },

        prefill: {
          name: "Parent",
          email: parentEmail,
        },

        theme: {
          color: "#0B91FF",
        },

        modal: {
          ondismiss: function() {
            setLoading(false);
            console.log("Payment cancelled by user");
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("❌ Payment initiation failed:", error);
      alert("Failed to initiate payment. Please try again.");
      setLoading(false);
    }
  };
 
  return (
    <Box sx={{ bgcolor: "#F6FAFF", minHeight: "100vh" }}>
      {/* ---------- Header ---------- */}
      <Box
        sx={{
          bgcolor: "#0B5ED7",
          py: 2,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={1}>
            <Image src="/logo.png" alt="Kids Logo" width={140} height={40} />
          </Box>
        </Container>
      </Box>
 
      {/* ---------- Content ---------- */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Stack spacing={2} textAlign="center" mb={6}>
          <Typography variant="h3" fontWeight={900} color="#0B5ED7">
            Fun Pricing for Happy Learning
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Learn • Play • Grow 🌈
          </Typography>
        </Stack>
 
        {/* Billing Toggle */}
        <Stack direction="row" justifyContent="center" spacing={2} mb={6}>
          <Button
            variant={billing === "monthly" ? "contained" : "outlined"}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={billing === "yearly" ? "contained" : "outlined"}
            onClick={() => setBilling("yearly")}
          >
            Yearly 🎉 (20% OFF)
          </Button>
        </Stack>
 
        {/* Pricing Cards */}
        <Grid container spacing={5} justifyContent="center">
          {plans.map((plan) => (
            <Grid
              item
              xs={12}
              md={4}
              key={plan.title}
              sx={{ cursor: "pointer" }}
              onClick={() => setSelectedPlan(plan.title)}
            >
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 6,
                  backgroundColor: plan.color,
                  border: plan.highlight
                    ? "3px solid #FF9800"
                    : "1px solid rgba(0,0,0,0.1)",
                  transform:
                    selectedPlan === plan.title ? "scale(1.08)" : "scale(1)",
                  transition: "transform .3s",
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={2} alignItems="center">
                    {plan.highlight && (
                      <Chip
                        label="Most Loved ⭐"
                        sx={{
                          bgcolor: "#FF9800",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      />
                    )}
 
                    <Typography variant="h5" fontWeight={800}>
                      {plan.title}
                    </Typography>
 
                    <Typography textAlign="center" color="text.secondary">
                      {plan.description}
                    </Typography>
 
                    <Typography variant="h3" fontWeight={900}>
                      {plan.title === "Student Pro"
                        ? billing === "yearly"
                          ? `₹${yearlyPrice}`
                          : `₹${monthlyPrice}`
                        : plan.price}
                    </Typography>
 
                    <Typography color="text.secondary">
                      {plan.title === "Student Pro"
                        ? billing === "yearly"
                          ? "per year"
                          : "per month"
                        : plan.period}
                    </Typography>
 
                    <Divider sx={{ width: "100%" }} />
 
                    <Stack spacing={1} width="100%">
                      {plan.features.map((feature) => (
                        <Stack
                          key={feature}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <CheckCircleIcon sx={{ color: "#0B5ED7" }} />
                          <Typography variant="body2">
                            {feature}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </CardContent>
 
                <CardActions sx={{ p: 4, pt: 0 }}>
                  <Button
                    fullWidth
                    size="large"
                    disabled={currentPlan === plan.title || loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(plan.title);
                    }}
                    sx={{
                      borderRadius: 999,
                      fontWeight: 900,
                      fontSize: "1rem",
                      bgcolor: "#FF9800",
                      color: "#fff",
                      border: "2px solid #FF9800",
                      boxShadow: "0 6px 0 #F57C00",
                      "&:hover": { bgcolor: "#FFC107" },
                      "&.Mui-disabled": {
                        bgcolor: "#FFE0B2",
                        color: "#BF360C",
                        boxShadow: "none",
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} sx={{ color: "#fff" }} />
                    ) : currentPlan === plan.title ? (
                      "Current Plan ✅"
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
 
        <Box mt={10} textAlign="center">
          <Typography variant="h5" fontWeight={800}>
            Learning is more fun with friends 🎉
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
 
 