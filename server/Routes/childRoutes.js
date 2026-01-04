const mongoose = require("mongoose");
const requireLogin = require("../middleware/requireLogin");
const Child = mongoose.model("children");
const UserSubject = mongoose.model("usersubjects");
const Subjects = mongoose.model("subjects");

module.exports = (app) => {

  app.post("/api/v1/child/add", requireLogin, async (req, res) => {
    const { name, classno, avatar } = req.body;
    const parentId = req.user.id; 

    try {
      // Validate required fields
      if (!name || !classno) {
        return res.status(400).json({ 
          message: "Name and class number are required"
        });
      }

     
      const existingChild = await Child.findOne({ name, parentId });
      if (existingChild) {
        return res.status(400).json({ 
          message: "A child with this name already exists for your account"
        });
      }

      // Create the child
      const childFields = { 
        name, 
        classno,
        parentId
      };

      // Add avatar if provided
      if (avatar) {
        childFields.avatar = avatar;
      }

      const child = await Child.create(childFields);

      // Get all subjects for this class
      const subjects = await Subjects.find({ classnumber: classno });
      // console.log(`Found ${subjects.length} subjects for class ${classno}`);

      
      if (subjects.length > 0) {
        const userSubjects = subjects.map(subject => ({
          userId: child._id, 
          subjectId: subject._id,
          locked: true 
        }));

        const insertedUserSubjects = await UserSubject.insertMany(userSubjects);
        // console.log(`Created ${insertedUserSubjects.length} locked UserSubject entries for child ${child.name}`);

        res.status(201).json({ 
          message: "Child added successfully", 
          child: {
            _id: child._id,
            name: child.name,
            classno: child.classno,
            parentId: child.parentId
          },
          subjectsInitialized: insertedUserSubjects.length
        });
      } else {
        res.status(201).json({ 
          message: "Child added successfully (no subjects available for this class yet)", 
          child: {
            _id: child._id,
            name: child.name,
            classno: child.classno,
            parentId: child.parentId
          },
          subjectsInitialized: 0
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get All Children for logged-in parent
  app.get("/api/v1/child/my-children", requireLogin, async (req, res) => {
    const parentId = req.user.id;

    try {
      const children = await Child.find({ parentId, isActive: true });

      if (!children || children.length === 0) {
        return res.status(200).json({ 
          message: "No children found",
          children: []
        });
      }

      // Get subject counts for each child
      const childrenWithDetails = await Promise.all(
        children.map(async (child) => {
          const totalSubjects = await UserSubject.countDocuments({ userId: child._id });
          const unlockedSubjects = await UserSubject.countDocuments({ 
            userId: child._id, 
            locked: false 
          });

          return {
            _id: child._id,
            name: child.name,
            classno: child.classno,
            avatar: child.avatar,
            totalSubjects,
            unlockedSubjects,
            lockedSubjects: totalSubjects - unlockedSubjects
          };
        })
      );

      res.status(200).json({ 
        message: "Children retrieved successfully",
        children: childrenWithDetails
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });
};

