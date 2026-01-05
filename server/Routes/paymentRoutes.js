const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const Razorpay = require("razorpay");
 
 
const UserSubject = mongoose.model("usersubjects");
const Subject = mongoose.model("subjects");
 
module.exports = (app) => {
 
  app.post("/api/create-order",  async (req, res) => {
    const { amount } = req.body;
 
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount is required and must be > 0" });
    }
 
    try {
      // Initialize Razorpay instance
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
 
      // Create an order
      const options = {
        amount: amount * 100, // Amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };
 
      const order = await razorpay.orders.create(options);
 
      res.status(200).json(order); // send order details to frontend
    } catch (error) {
      console.error("Razorpay Order Creation Error:", error);
      res.status(500).json({ message: error.message });
    }
  });
 
 
  // Simple Purchase/Unlock Subject - Just provide subjectId
  app.post("/api/v1/payment/purchase-subject", requireLogin, async (req, res) => {
    const { subjectId } = req.body;
    const userId = req.user._id;
 
    try {
      // Validate subjectId
      if (!subjectId) {
        return res.status(400).json({ message: "Subject ID is required" });
      }
 
      // Check if subject exists
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        return res.status(404).json({
          message: "Subject not found",
          subjectId: subjectId
        });
      }
 
      // Find or create UserSubject entry
      let userSubject = await UserSubject.findOne({ userId, subjectId });
     
      if (!userSubject) {
        // Create if doesn't exist
        userSubject = await UserSubject.create({
          userId,
          subjectId,
          locked: true
        });
      }
 
      // Check if already purchased
      if (!userSubject.locked) {
        return res.status(400).json({
          message: "Subject already purchased",
          subject: subject.name,
          purchaseDate: userSubject.purchaseDate
        });
      }
 
      // Unlock the subject
      userSubject.locked = false;
      userSubject.purchaseDate = new Date();
      userSubject.transactionId = `TXN_${Date.now()}`;
      userSubject.amount = subject.price;
      await userSubject.save();
 
      res.status(200).json({
        success: true,
        message: "Subject purchased and unlocked successfully!",
        subject: {
          id: subject._id,
          name: subject.name,
          price: subject.price,
          locked: false,
          purchaseDate: userSubject.purchaseDate,
          transactionId: userSubject.transactionId
        }
      });
    } catch (error) {
      console.log("Purchase Error:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
 
  // Get User's Purchased (Unlocked) Subjects
  app.get("/api/v1/payment/my-purchases", requireLogin, async (req, res) => {
    try {
      const unlockedSubjects = await UserSubject.find({
        userId: req.user._id,
        locked: false,
      }).populate("subjectId");
 
      res.status(200).json({
        message: "Purchased subjects retrieved successfully",
        purchases: unlockedSubjects,
        totalPurchases: unlockedSubjects.length,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });
 
  // Check if a specific subject is unlocked for the user
  app.get("/api/v1/payment/check-unlock/:subjectId", requireLogin, async (req, res) => {
    const { subjectId } = req.params;
    const userId = req.user._id;
 
    try {
      const userSubject = await UserSubject.findOne({ userId, subjectId });
 
      if (userSubject && !userSubject.locked) {
        return res.status(200).json({
          locked: false,
          message: "Subject is unlocked",
          purchaseDate: userSubject.purchaseDate,
        });
      } else {
        return res.status(200).json({
          locked: true,
          message: "Subject is locked. Please purchase to unlock.",
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });
 
  // Get All Purchases (Admin)
  app.get("/api/v1/payment/all-purchases", async (req, res) => {
    try {
      const purchases = await UserSubject.find({ locked: false })
        .populate("userId", "name email")
        .populate("subjectId", "name classnumber price")
        .sort({ purchaseDate: -1 });
 
      res.status(200).json({
        message: "All purchases retrieved successfully",
        purchases,
        totalPurchases: purchases.length,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });
};
 