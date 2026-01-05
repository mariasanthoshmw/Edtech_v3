const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("edtechusers");

const requireLogin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  
  // Check if authorization header exists
  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "You have to log in to continue" });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.slice(7) // Remove "Bearer " prefix
    : authHeader; // Use as is if no prefix

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      console.log("JWT Verification Error:", err.message);
      return res
        .status(401)
        .json({ message: "You have to log in to continue" });
    }

    try {
      // Get full user object from database
      const user = await User.findById(payload.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      req.user = user;
      req.user._id = user._id;
      
      console.log("🔐 User authenticated - ID:", user._id, "Email:", user.email);
      
      next();
    } catch (error) {
      console.log("Error fetching user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
};

module.exports = requireLogin;