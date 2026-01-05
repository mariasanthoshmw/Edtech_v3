// Script to update chapters with video URLs
// Run this with: node updateChapterVideos.js

const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Load the Chapter model
require("./models/Chapter");
const Chapter = mongoose.model("chapters");

// Main function to update chapters
async function updateChapters() {
  try {
    console.log("\n📋 Fetching all chapters...\n");
    const chapters = await Chapter.find({});
    
    if (chapters.length === 0) {
      console.log("❌ No chapters found in database");
      process.exit(0);
    }

    console.log(`Found ${chapters.length} chapter(s):\n`);
    
    // Display all chapters with their current video URLs
    chapters.forEach((chapter, index) => {
      console.log(`${index + 1}. ${chapter.name}`);
      console.log(`   ID: ${chapter._id}`);
      console.log(`   Current videourl: ${chapter.videourl || "NOT SET"}`);
      console.log(`   Subject ID: ${chapter.subjectId}`);
      console.log("");
    });

    console.log("=====================================");
    console.log("Available video files in server/uploads/videos/:");
    console.log("=====================================");
    console.log("1. videos/number-magic.mp4");
    console.log("2. videos/PlantStructuresclass1.mp4");
    console.log("3. videos/PronounsClass1.mp4");
    console.log("4. videos/TypesofPlantsClass1.mp4");
    console.log("5. videos/7092235-hd_1920_1080_30fps.mp4");
    console.log("6. videos/best-learning-numbers-shapes-counting-1-10-preschool-toddler-learning-toy-video-1440-publer.io.mp4");
    console.log("");

    console.log("=====================================");
    console.log("To update a chapter with video URL:");
    console.log("=====================================");
    console.log("Use this command in MongoDB or your app:");
    console.log("");
    console.log("Example:");
    console.log('await Chapter.updateOne(');
    console.log('  { _id: "CHAPTER_ID_HERE" },');
    console.log('  { $set: { videourl: "videos/number-magic.mp4" } }');
    console.log(');');
    console.log("");

    // Example: Update specific chapters (uncomment and modify as needed)
    /*
    console.log("\n📝 Updating chapters with video URLs...\n");
    
    // Example: Update "Number magic" chapter
    const result1 = await Chapter.updateOne(
      { name: "Number magic" },
      { $set: { videourl: "videos/number-magic.mp4" } }
    );
    console.log(`✅ Updated "Number magic": ${result1.modifiedCount} modified`);

    // Example: Update "Plant Structures" chapter
    const result2 = await Chapter.updateOne(
      { name: { $regex: /plant.*structure/i } },
      { $set: { videourl: "videos/PlantStructuresclass1.mp4" } }
    );
    console.log(`✅ Updated "Plant Structures": ${result2.modifiedCount} modified`);

    // Example: Update "Pronouns" chapter
    const result3 = await Chapter.updateOne(
      { name: { $regex: /pronoun/i } },
      { $set: { videourl: "videos/PronounsClass1.mp4" } }
    );
    console.log(`✅ Updated "Pronouns": ${result3.modifiedCount} modified`);

    // Example: Update "Types of Plants" chapter
    const result4 = await Chapter.updateOne(
      { name: { $regex: /types.*plant/i } },
      { $set: { videourl: "videos/TypesofPlantsClass1.mp4" } }
    );
    console.log(`✅ Updated "Types of Plants": ${result4.modifiedCount} modified`);
    */

    console.log("\n✅ Script completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
updateChapters();

