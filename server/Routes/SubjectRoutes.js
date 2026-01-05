const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const Subjects = mongoose.model("subjects");
const UserSubject = mongoose.model("usersubjects");
const User = mongoose.model("edtechusers");

module.exports = (app) => {
  // Add New Subject (Public - No login required for setup)
  app.post("/api/v1/subject/add", async (req, res) => {
    const { classnumber, name, price } = req.body;

    try {
      const subject = await Subjects.findOne({ name, classnumber });
      if (subject) {
        return res.status(400).json({ message: "Subject already exists for this class" });
      }

      subjectFields = { 
        classnumber, 
        name, 
        price: price || 0
      };

      const response = await Subjects.create(subjectFields);

      // Get all users in this class
      const users = await User.find({ classno: classnumber });

      // Create locked UserSubject entries for all users in this class
      const userSubjects = users.map(user => ({
        userId: user._id,
        subjectId: response._id,
        locked: true // Locked by default
      }));

      if (userSubjects.length > 0) {
        await UserSubject.insertMany(userSubjects);
      }

      res.status(201).json({ 
        message: "Subject added successfully", 
        response,
        usersInitialized: userSubjects.length
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get All Subjects (Public)
  app.get("/api/v1/subject/all/get", async (req, res) => {
    try {
      const subjects = await Subjects.find();

      if (!subjects) {
        return res.status(400).json({ message: "There are no subjects." });
      }

      res.status(200).json({ message: "Subjects: ", subjects });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Subjects by Class with User's Lock Status
  app.get("/api/v1/subject/by-class/:classno", requireLogin, async (req, res) => {
    console.log("✅ Route hit: /api/v1/subject/by-class/:classno");
    console.log("Request params:", req.params);
    console.log("Request query:", req.query);
    
    const { classno } = req.params;
    const { childId } = req.query;
    const parentId = req.user._id;

    console.log("Class number:", classno, "Child ID:", childId, "Parent ID:", parentId);

    try {
      // Use childId if provided, otherwise use parent's ID
      let actualUserId = parentId;
      if (childId) {
        // Verify child belongs to parent
        const child = await User.findOne({ _id: childId, parentId });
        if (!child) {
          return res.status(403).json({ message: "Child not found or access denied" });
        }
        actualUserId = childId;
      }

      const subjects = await Subjects.find({ classnumber: parseInt(classno) });
      
      if (!subjects || subjects.length === 0) {
        return res.status(404).json({ message: "No subjects found for this class" });
      }

      // Get all UserSubject entries for the child (or parent if no childId)
      const userSubjects = await UserSubject.find({ userId: actualUserId });
      const userSubjectMap = {};
      userSubjects.forEach(us => {
        userSubjectMap[us.subjectId.toString()] = us;
      });

      // Map subjects with lock status
      // Subjects appear unlocked (clickable) but only first chapter is accessible
      // Subject is fully unlocked only if purchased
      const subjectsWithStatus = subjects.map(subject => {
        const userSubject = userSubjectMap[subject._id.toString()];

        // If no UserSubject entry exists, create one automatically
        if (!userSubject) {
          // Create the entry in background (don't wait)
          UserSubject.create({
            userId: actualUserId,
            subjectId: subject._id,
            locked: true
          }).catch(err => console.log("Error creating UserSubject:", err));
        }

        // Subjects appear unlocked (so users can click and see chapters)
        // But only first chapter is accessible unless subject is purchased
        // locked: false means subject is purchased and all chapters accessible
        // locked: true means subject not purchased, but first chapter still accessible
        const isLocked = userSubject ? userSubject.locked : true;

        return {
          ...subject.toObject(),
          locked: false, // Always show as unlocked so users can click and see chapters
          purchaseDate: userSubject && !userSubject.locked ? userSubject.purchaseDate : null,
          isPurchased: !isLocked // Track if actually purchased for chapter access control
        };
      });

      console.log("✅ Returning subjects with status:", subjectsWithStatus.map(s => ({ name: s.name, locked: s.locked })));
      
      res.status(200).json({ 
        message: "Subjects retrieved successfully", 
        subjects: subjectsWithStatus 
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

};