// ============================================
// LEADERBOARD SETUP FOR STUDY.PILOT
// ============================================
// This script helps you set up leaderboard data in MongoDB
// Copy and paste commands into MongoDB Compass (mongosh tab) or terminal mongosh

// ============================================
// STEP 1: Find all children IDs
// ============================================
print("\n=== STEP 1: Finding all children ===\n");

db.users.find(
  { isParent: { $ne: true } }, 
  { _id: 1, name: 1, emoji: 1, classno: 1, parentId: 1 }
).forEach(doc => {
  print(`ID: ${doc._id} | Name: ${doc.name} | Emoji: ${doc.emoji} | Class: ${doc.classno}`);
});

// Output example:
// ID: 677acf8e6c23a52b3c8b4567 | Name: Alex | Emoji: 🦁 | Class: 5
// ID: 677acf8e6c23a52b3c8b4568 | Name: Sara | Emoji: 🐼 | Class: 5


// ============================================
// STEP 2: Insert Leaderboard Data
// ============================================
// Replace the childId values below with actual IDs from STEP 1
// IMPORTANT: childId must be a STRING (not ObjectId)

print("\n=== STEP 2: Inserting leaderboard data ===\n");
print("Replace CHILD_ID_X below with actual IDs from STEP 1\n");

/*
db.leaderboards.insertMany([
  // Rank 1 - Highest scorer (830 XP)
  {
    childId: "PASTE_CHILD_ID_1_HERE",  // Replace with actual ID as STRING
    subjects: {
      math: 300,
      english: 250,
      science: 280
    },
    totalPoints: 830,
    level: 4,
    updatedAt: new Date()
  },
  
  // Rank 2 (630 XP)
  {
    childId: "PASTE_CHILD_ID_2_HERE",
    subjects: {
      math: 250,
      english: 180,
      science: 200
    },
    totalPoints: 630,
    level: 3,
    updatedAt: new Date()
  },
  
  // Rank 3 (610 XP)
  {
    childId: "PASTE_CHILD_ID_3_HERE",
    subjects: {
      math: 220,
      english: 200,
      science: 190
    },
    totalPoints: 610,
    level: 3,
    updatedAt: new Date()
  },
  
  // Rank 4 (500 XP)
  {
    childId: "PASTE_CHILD_ID_4_HERE",
    subjects: {
      math: 180,
      english: 150,
      science: 170
    },
    totalPoints: 500,
    level: 2,
    updatedAt: new Date()
  },
  
  // Rank 5 (420 XP)
  {
    childId: "PASTE_CHILD_ID_5_HERE",
    subjects: {
      math: 150,
      english: 130,
      science: 140
    },
    totalPoints: 420,
    level: 2,
    updatedAt: new Date()
  },
  
  // Your child - lower rank for testing "Your Position"
  {
    childId: "YOUR_LOGGED_IN_CHILD_ID",
    subjects: {
      math: 100,
      english: 80,
      science: 90
    },
    totalPoints: 270,
    level: 1,
    updatedAt: new Date()
  }
])
*/

// ============================================
// STEP 3: Verify Leaderboard Data
// ============================================
print("\n=== STEP 3: Verifying leaderboard entries ===\n");

/*
db.leaderboards.aggregate([
  {
    $addFields: {
      childObjectId: { $toObjectId: "$childId" }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "childObjectId",
      foreignField: "_id",
      as: "userInfo"
    }
  },
  {
    $unwind: "$userInfo"
  },
  {
    $project: {
      rank: 1,
      name: "$userInfo.name",
      emoji: "$userInfo.emoji",
      totalPoints: 1,
      level: 1,
      "subjects.math": 1,
      "subjects.english": 1,
      "subjects.science": 1
    }
  },
  {
    $sort: { totalPoints: -1 }
  }
]).forEach((doc, idx) => {
  print(`Rank ${idx + 1}: ${doc.emoji} ${doc.name} - ${doc.totalPoints} XP (Math: ${doc.subjects.math}, English: ${doc.subjects.english}, Science: ${doc.subjects.science})`);
});
*/

// Expected output:
// Rank 1: 🦁 Alex - 830 XP (Math: 300, English: 250, Science: 280)
// Rank 2: 🐼 Sara - 630 XP (Math: 250, English: 180, Science: 200)


// ============================================
// STEP 4: Count Total Leaderboard Entries
// ============================================
print("\n=== STEP 4: Counting entries ===\n");

/*
print(`Total leaderboard entries: ${db.leaderboards.countDocuments()}`);
*/


// ============================================
// EXAMPLE WITH REAL IDs
// ============================================
// Here's what the final command should look like with real IDs:

/*
// Example: If your children IDs are:
// - 677acf8e6c23a52b3c8b4567 (Alex)
// - 677acf8e6c23a52b3c8b4568 (Sara)
// - 677acf8e6c23a52b3c8b4569 (Mike)

db.leaderboards.insertMany([
  {
    childId: "677acf8e6c23a52b3c8b4567",  // Alex - top scorer
    subjects: { math: 300, english: 250, science: 280 },
    totalPoints: 830,
    level: 4,
    updatedAt: new Date()
  },
  {
    childId: "677acf8e6c23a52b3c8b4568",  // Sara
    subjects: { math: 250, english: 180, science: 200 },
    totalPoints: 630,
    level: 3,
    updatedAt: new Date()
  },
  {
    childId: "677acf8e6c23a52b3c8b4569",  // Mike
    subjects: { math: 220, english: 200, science: 190 },
    totalPoints: 610,
    level: 3,
    updatedAt: new Date()
  }
])
*/


// ============================================
// QUICK REFERENCE: Point System
// ============================================
/*
Quiz Points:
- Easy question: 5 points (correct), 0 (wrong)
- Medium question: 10 points (correct), 0 (wrong)
- Hard question: 15 points (correct), 0 (wrong)

Points are automatically added to leaderboard when:
- Student completes a quiz
- Backend endpoint: /api/quiz/answer
- Updates both subject-specific points and totalPoints
*/

