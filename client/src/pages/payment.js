import React, { useState } from "react";
import axios from "axios";
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
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
 
const BASE_PRICE_INR = 749;
 
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
  const [currentPlan, setCurrentPlan] = useState("Free");
  const [selectedPlan, setSelectedPlan] = useState("Free");
  const [billing, setBilling] = useState("monthly");
 
  const discountedMonthly = Math.round(BASE_PRICE_INR * 0.8);
  const yearlyPrice = Math.round(discountedMonthly * 12 * 0.8);
 
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
 
    const amount = billing === "yearly" ? yearlyPrice : discountedMonthly;
 
    const razorpayLoaded = await loadRazorpay();
    if (!razorpayLoaded) {
      alert("Razorpay SDK failed to load");
      return;
    }
 
    try {
      // 1️⃣ Create order on backend
      const orderRes = await axios.post("/api/create-order", { amount });
 
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: "INR",
        name: "EdTech Learning",
        description: "Student Pro Subscription",
        order_id: orderRes.data.id,
 
        handler: function (response) {
          console.log("Payment success:", response);
          setCurrentPlan("Student Pro");
 
          if (typeof window !== "undefined") {
            localStorage.setItem("plan", "Student Pro");
          }
 
          alert("Payment successful 🎉 Welcome to Student Pro!");
        },
 
        prefill: {
          name: "Student",
          email: "student@example.com",
        },
 
        theme: {
          color: "#0B5ED7",
        },
      };
 
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment failed", error);
      alert("Payment failed. Please try again.");
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
                          : `₹${discountedMonthly}`
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
                    disabled={currentPlan === plan.title}
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
                    {currentPlan === plan.title
                      ? "Current Plan ✅"
                      : plan.cta}
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
 
 