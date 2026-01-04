const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const Chapters = mongoose.model("chapters");
const UserSubject = mongoose.model("usersubjects");

module.exports = (app) => {
  // Add New Chapter (Public - No login required for setup)
  app.post("/api/v1/chapters/add", async (req, res) => {
    const { subjectId, name, description, videourl } = req.body;

    try {
      const chapters = await Chapters.findOne({ name, subjectId });
      if (chapters) {
        return res.status(400).json({ message: "Chapter already exists for this subject" });
      }
      chapterFields = { subjectId, name, description, videourl };

      const response = await Chapters.create(chapterFields);

      res.status(201).json({ message: "Chapter added successfully", response });
    } catch (error) {
      console.error("Error adding chapter:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get All Chapters
  app.get("/api/v1/chapters/all/get", async (req, res) => {
    try {
      const chapters = await Chapters.find();

      if (!chapters) {
        return res.status(400).json({ message: "There are no chapters." });
      }

      res.status(200).json({ message: "Chapters: ", chapters });
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Chapters by Subject (checks if subject is unlocked) with progress
  app.get("/api/v1/chapters/by-subject/:subjectId", requireLogin, async (req, res) => {
    const { subjectId } = req.params;
    const { childId } = req.query; // Get childId from query params
    const parentId = req.user._id;
    const User = mongoose.model("edtechusers");

    try {
      const Progress = mongoose.model("progress");
      
      // Use childId if provided, otherwise use parent's ID (for backward compatibility)
      let actualUserId = parentId;
      if (childId) {
        // Verify child belongs to parent
        const child = await User.findOne({ _id: childId, parentId });
        if (!child) {
          return res.status(403).json({ message: "Child not found or access denied" });
        }
        actualUserId = childId;
      }
      
      // Get child user to check subscription
      const childUser = childId ? await User.findById(childId) : null;
      const childParentId = childUser?.parentId || parentId;
      
      // Check parent subscription
      let isSubscribed = false;
      if (childParentId) {
        const parent = await User.findById(childParentId);
        isSubscribed = parent?.subscriptionStatus === 'active';
      }

      // Check if subject is unlocked for the child (or parent if no childId)
      const userSubject = await UserSubject.findOne({ userId: actualUserId, subjectId });

      // First chapter is always free, rest require subscription or purchase
      const chapters = await Chapters.find({ subjectId }).sort({ _id: 1 }); // Sort by creation order

      if (!chapters || chapters.length === 0) {
        return res.status(404).json({ message: "No chapters found for this subject" });
      }

      // Get progress for all chapters
      const progressEntries = await Progress.find({ userId: actualUserId, subjectId });
      const progressMap = {};
      progressEntries.forEach(p => {
        progressMap[p.chapterId.toString()] = p;
      });

      // Map chapters with status
      const chaptersWithStatus = chapters.map((chapter, index) => {
        const isFirstChapter = index === 0;
        const progress = progressMap[chapter._id.toString()];
        const isCompleted = progress?.completed || false;
        
        // Determine if chapter is accessible
        let status = "locked";
        if (isFirstChapter) {
          status = isCompleted ? "completed" : "in-progress";
        } else if (userSubject && !userSubject.locked) {
          status = isCompleted ? "completed" : "in-progress";
        } else if (isSubscribed) {
          status = isCompleted ? "completed" : "in-progress";
        }

        return {
          _id: chapter._id,
          name: chapter.name,
          description: chapter.description,
          videourl: chapter.videourl,
          subjectId: chapter.subjectId,
          status,
          isFirstChapter,
          progress: isCompleted ? 100 : (status === "in-progress" ? 0 : 0)
        };
      });

      res.status(200).json({ 
        message: "Chapters retrieved successfully", 
        chapters: chaptersWithStatus,
        locked: !userSubject || userSubject.locked,
        isSubscribed
      });
    } catch (error) {
      console.error("Error in chapters route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Single Chapter (checks if subject is unlocked) with progress
  app.get("/api/v1/chapters/:chapterId", requireLogin, async (req, res) => {
    const { chapterId } = req.params;
    const { childId } = req.query;
    const parentId = req.user._id;
    const User = mongoose.model("edtechusers");

    try {
      const Progress = mongoose.model("progress");
      
      // Use childId if provided
      let actualUserId = parentId;
      if (childId) {
        const child = await User.findOne({ _id: childId, parentId });
        if (!child) {
          return res.status(403).json({ message: "Child not found or access denied" });
        }
        actualUserId = childId;
      }
      
      const chapter = await Chapters.findById(chapterId);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Check if it's the first chapter (always free)
      const allChapters = await Chapters.find({ subjectId: chapter.subjectId }).sort({ _id: 1 });
      const isFirstChapter = allChapters[0]?._id.toString() === chapterId;

      // Get user to check subscription
      const user = await User.findById(actualUserId);
      const userParentId = user?.parentId || parentId;
      let isSubscribed = false;
      if (userParentId) {
        const parent = await User.findById(userParentId);
        isSubscribed = parent?.subscriptionStatus === 'active';
      }

      // Check if the subject this chapter belongs to is unlocked
      const userSubject = await UserSubject.findOne({ 
        userId: actualUserId, 
        subjectId: chapter.subjectId 
      });

      // First chapter is always accessible
      if (!isFirstChapter && (!userSubject || userSubject.locked) && !isSubscribed) {
        return res.status(403).json({ 
          message: "Subject is locked. Please purchase to access this chapter.",
          locked: true
        });
      }

      // Get progress
      const progress = await Progress.findOne({ userId: actualUserId, chapterId });

      res.status(200).json({ 
        message: "Chapter retrieved successfully", 
        chapter: {
          ...chapter.toObject(),
          isFirstChapter,
          status: progress?.completed ? "completed" : "in-progress"
        },
        locked: false
      });
    } catch (error) {
      console.error("Error in chapters route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark video progress (in-progress or completed)
  app.post("/api/v1/chapters/:chapterId/progress", requireLogin, async (req, res) => {
    const { chapterId } = req.params;
    const { childId, completed } = req.body;
    const parentId = req.user._id;
    const User = mongoose.model("edtechusers");

    try {
      const Progress = mongoose.model("progress");
      const chapter = await Chapters.findById(chapterId);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      let actualUserId = parentId;
      if (childId) {
        const child = await User.findOne({ _id: childId, parentId });
        if (!child) {
          return res.status(403).json({ message: "Child not found or access denied" });
        }
        actualUserId = childId;
      }

      let progress = await Progress.findOne({ userId: actualUserId, chapterId });
      if (!progress) {
        progress = await Progress.create({
          userId: actualUserId,
          subjectId: chapter.subjectId,
          chapterId,
          completed: completed === true || completed === "true"
        });
      } else {
        progress.completed = completed === true || completed === "true";
        await progress.save();
      }

      res.status(200).json({ 
        message: `Chapter marked as ${progress.completed ? "completed" : "in-progress"}`,
        progress
      });
    } catch (error) {
      console.error("Error in chapters route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Mark video as completed
  app.post("/api/v1/chapters/:chapterId/complete", requireLogin, async (req, res) => {
    const { chapterId } = req.params;
    const { childId } = req.body; // Get childId from body
    const parentId = req.user._id;
    const User = mongoose.model("edtechusers");

    try {
      const Progress = mongoose.model("progress");
      const chapter = await Chapters.findById(chapterId);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

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

      // Create or update progress
      let progress = await Progress.findOne({ userId: actualUserId, chapterId });
      if (!progress) {
        progress = await Progress.create({
          userId: actualUserId,
          subjectId: chapter.subjectId,
          chapterId,
          completed: true
        });
      } else {
        progress.completed = true;
        await progress.save();
      }

      res.status(200).json({ 
        message: "Chapter marked as completed",
        progress
      });
    } catch (error) {
      console.error("Error in chapters route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update Chapter
  app.put("/api/v1/chapters/update/:chapterId", async (req, res) => {
    const { chapterId } = req.params;
    const { name, description, videourl } = req.body;

    try {
      const chapter = await Chapters.findById(chapterId);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      if (name) chapter.name = name;
      if (description) chapter.description = description;
      if (videourl) chapter.videourl = videourl;

      await chapter.save();

      res.status(200).json({ 
        message: "Chapter updated successfully", 
        chapter 
      });
    } catch (error) {
      console.error("Error in chapters route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete Chapter
  app.delete("/api/v1/chapters/delete/:chapterId", async (req, res) => {
    const { chapterId } = req.params;

    try {
      const chapter = await Chapters.findByIdAndDelete(chapterId);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      res.status(200).json({ 
        message: "Chapter deleted successfully", 
        chapter 
      });
    } catch (error) {
      console.error("Error in chapters route:", error);
      res.status(500).json({ message: error.message });
    }
  });
};