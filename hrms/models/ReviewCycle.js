const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, enum: ["Planned", "Active", "Complete"], default: "Planned" },
}, { timestamps: true });
module.exports = mongoose.model("ReviewCycle", schema);
