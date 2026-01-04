const mongoose = require("mongoose");
const { Schema } = mongoose;

const childSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'edtechusers',
    // required: true
  },
  classno: {
    type: Number,
    required: true
  },
  avatar: {
    type: String, 
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


childSchema.index({ parentId: 1 });
childSchema.index({ classno: 1 });

mongoose.model("children", childSchema);

