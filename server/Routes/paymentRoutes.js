const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const requireParent = require("../middleware/requireParent");
const Razorpay = require("razorpay");

const User = mongoose.model("edtechusers");
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

  // ========================================
  // SUBSCRIPTION ROUTES
  // ========================================

  // GET SUBSCRIPTION STATUS
  app.get("/api/v1/parent/subscription", requireParent, async (req, res) => {
    try {
      const parent = await User.findById(req.user._id);
      if (!parent || !parent.isParent) {
        return res.status(403).json({ message: "Parent access only" });
      }

      res.status(200).json({
        status: parent.subscriptionStatus || 'trial',
        type: parent.subscriptionType || null,
        startDate: parent.subscriptionStartDate || null,
        endDate: parent.subscriptionEndDate || null
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // ACTIVATE SUBSCRIPTION (AFTER PAYMENT)
  app.post("/api/v1/parent/subscription", requireParent, async (req, res) => {
    try {
      const { type, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
      
      console.log("📥 Subscription request received:");
      console.log("   Type:", type);
      console.log("   Payment ID:", razorpayPaymentId);
      console.log("   Order ID:", razorpayOrderId);
      console.log("   Parent ID:", req.user._id);
      
      const parent = await User.findById(req.user._id);

      if (!parent || !parent.isParent) {
        console.log("❌ Access denied: Not a parent");
        return res.status(403).json({ message: "Parent access only" });
      }

      if (!['monthly', 'yearly'].includes(type)) {
        console.log("❌ Invalid subscription type:", type);
        return res.status(400).json({ message: "Invalid subscription type" });
      }

      const now = new Date();
      const endDate = new Date();
      
      if (type === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Update parent's subscription status
      console.log("📝 Updating parent subscription status...");
      await User.updateOne(
        { _id: req.user._id },
        {
          $set: {
            subscriptionStatus: 'active',
            subscriptionType: type,
            subscriptionStartDate: now,
            subscriptionEndDate: endDate
          }
        }
      );

      console.log(`🎉 Subscription activated for parent: ${parent.email}`);
      console.log(`📅 Type: ${type}, Valid until: ${endDate.toISOString()}`);

      // Unlock all subjects for all children
      const children = await User.find({ parentId: req.user._id, isParent: { $ne: true } });
      console.log(`👶 Found ${children.length} children to unlock subjects for`);

      let totalSubjectsUnlocked = 0;

      for (const child of children) {
        const subjects = await Subject.find({ classnumber: child.classno });
        console.log(`📚 Processing ${subjects.length} subjects for ${child.name} (Class ${child.classno})`);
        
        for (const subject of subjects) {
          try {
            let userSubject = await UserSubject.findOne({ userId: child._id, subjectId: subject._id });
            
            if (!userSubject) {
              await UserSubject.create({
                userId: child._id,
                subjectId: subject._id,
                locked: false,
                purchaseDate: now,
                transactionId: razorpayPaymentId || `SUB_${Date.now()}`,
                orderId: razorpayOrderId || null
              });
              totalSubjectsUnlocked++;
            } else {
              userSubject.locked = false;
              userSubject.purchaseDate = now;
              userSubject.transactionId = razorpayPaymentId || `SUB_${Date.now()}`;
              userSubject.orderId = razorpayOrderId || null;
              await userSubject.save();
              totalSubjectsUnlocked++;
            }
          } catch (subjectError) {
            console.error(`❌ Error unlocking subject ${subject.name}:`, subjectError.message);
          }
        }
      }

      console.log(`✅ Successfully unlocked ${totalSubjectsUnlocked} subjects for ${children.length} children`);

      res.status(200).json({
        message: "Subscription activated successfully",
        subscription: {
          status: 'active',
          type,
          startDate: now,
          endDate
        },
        childrenUnlocked: children.length,
        subjectsUnlocked: totalSubjectsUnlocked
      });
    } catch (error) {
      console.error("❌ Subscription activation error:", error);
      console.error("❌ Stack trace:", error.stack);
      res.status(500).json({ 
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
};
 