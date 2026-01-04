const mongoose = require("mongoose");
const { Schema } = mongoose;
const paymentSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'edtechusers',
    required: true
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'children',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'subjects',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['success', 'pending', 'failed'],
    default: 'success'
  }
}, {
  timestamps: true
});


paymentSchema.index({ parentId: 1 });
paymentSchema.index({ childId: 1 });
paymentSchema.index({ transactionId: 1 });

mongoose.model("payments", paymentSchema);

