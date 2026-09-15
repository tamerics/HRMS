const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
  category: { type: String, enum: ["Travel", "Meal", "Medical", "Office", "Other"], required: true },
  expenseDate: { type: String, required: true },
  amount: { type: Number, min: 0.01, required: true },
  description: { type: String, maxlength: 2000, default: "" },
  attachmentName: { type: String, maxlength: 255, default: "" },
  attachmentData: { type: String, maxlength: 2500000, default: "" },
  status: { type: String, enum: ["Pending", "Approved", "Declined"], default: "Pending" },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  decidedAt: { type: Date, default: null },
}, { timestamps: true });
module.exports = mongoose.model("Claim", schema);
