const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, default: "All" },
  role: { type: String, default: "All" },
  steps: [{ type: String, required: true }],
}, { timestamps: true });
module.exports = mongoose.model("OnboardingTemplate", schema);
