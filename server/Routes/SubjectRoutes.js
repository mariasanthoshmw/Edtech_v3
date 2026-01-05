const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const Subjects = mongoose.model("subjects");
const UserSubject = mongoose.model("usersubjects");
const User = mongoose.model("edtechusers");

module.exports = (app) => {
  // Test endpoint to verify route registration
  app.get("/api/v1/subject/test", (req, res) => {
    console.log("✅ SubjectRoutes test endpoint hit");
    res.json({ message: "SubjectRoutes is registered and working" });
  });

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

  // Get My Subjects (automatically uses logged-in user's class)
  app.get("/api/v1/subject/my-subjects", requireLogin, async (req, res) => {
    const userId = req.user._id;

    try {
      // Get user to find their class
      const User = mongoose.model("edtechusers");
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all subjects for user's class
      const subjects = await Subjects.find({ classnumber: user.classno });
      
      if (!subjects || subjects.length === 0) {
        return res.status(404).json({ 
          message: "No subjects found for your class",
          classno: user.classno 
        });
      }

      // Get all UserSubject entries for this user
      const userSubjects = await UserSubject.find({ userId });
      const userSubjectMap = {};
      userSubjects.forEach(us => {
        userSubjectMap[us.subjectId.toString()] = us;
      });

      // Map subjects with lock status
      const subjectsWithStatus = subjects.map(subject => {
        const userSubject = userSubjectMap[subject._id.toString()];

        // If no UserSubject entry exists, create one automatically
        if (!userSubject) {
          // Create the entry in background (don't wait)
          UserSubject.create({
            userId: userId,
            subjectId: subject._id,
            locked: true
          }).catch(err => console.log("Error creating UserSubject:", err));
        }

        return {
          _id: subject._id,
          name: subject.name,
          classnumber: subject.classnumber,
          price: subject.price,
          locked: userSubject ? userSubject.locked : true,
          purchaseDate: userSubject && !userSubject.locked ? userSubject.purchaseDate : null,
          transactionId: userSubject && !userSubject.locked ? userSubject.transactionId : null
        };
      });

      res.status(200).json({ 
        message: "Subjects retrieved successfully",
        classno: user.classno,
        subjects: subjectsWithStatus,
        totalSubjects: subjectsWithStatus.length
      });
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

  // Get Single Subject with Lock Status
  app.get("/api/v1/subject/:subjectId", requireLogin, async (req, res) => {
    const { subjectId } = req.params;
    const userId = req.user._id;

    try {
      const subject = await Subjects.findById(subjectId);
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Check lock status
      const userSubject = await UserSubject.findOne({ userId, subjectId });

      const subjectWithStatus = {
        ...subject.toObject(),
        locked: userSubject ? userSubject.locked : true,
        purchaseDate: userSubject && !userSubject.locked ? userSubject.purchaseDate : null
      };

      res.status(200).json({ 
        message: "Subject retrieved successfully", 
        subject: subjectWithStatus 
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update Subject
  app.put("/api/v1/subject/update/:subjectId", async (req, res) => {
    const { subjectId } = req.params;
    const { name, price, classnumber } = req.body;

    try {
      const subject = await Subjects.findById(subjectId);
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      if (name) subject.name = name;
      if (price !== undefined) subject.price = price;
      if (classnumber) subject.classnumber = classnumber;

      await subject.save();

      
      res.status(200).json({ 
        message: "Subject updated successfully", 
        subject 
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete Subject
  app.delete("/api/v1/subject/delete/:subjectId", async (req, res) => {
    const { subjectId } = req.params;

    try {
      const subject = await Subjects.findByIdAndDelete(subjectId);
      
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Also delete all UserSubject entries for this subject
      await UserSubject.deleteMany({ subjectId });

      res.status(200).json({ 
        message: "Subject deleted successfully", 
        subject 
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });
};