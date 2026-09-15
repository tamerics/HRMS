const mongoose = require("mongoose");
const request = new mongoose.Schema({
  kind: String, type: String, duration: String, startDate: String, endDate: String, startTime: String, endTime: String,
  hours: Number, days: Number, month: String, balanceKey: String, reason: String, attachmentName: String,
  directManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  generalManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  stage: { type: String, enum: ["Direct manager", "General manager", "Complete"], default: "Direct manager" },
  status: { type: String, enum: ["Pending", "Approved", "Declined"], default: "Pending" },
  decisions: [{ actor: mongoose.Schema.Types.ObjectId, stage: String, decision: String, at: Date }],
  createdAt: { type: Date, default: Date.now }
});
// One atomic document owns request decisions, monthly quotas, and balances.
// Optimistic concurrency prevents double approval/deduction on standalone MongoDB.
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", unique: true, required: true },
  annual: { type: Number, default: 24 }, sick: { type: Number, default: 6 },
  requests: [request]
}, { timestamps: true, optimisticConcurrency: true });
module.exports = mongoose.model("RequestAccount", schema);
