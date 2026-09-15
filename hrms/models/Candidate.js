const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  opening: { type: mongoose.Schema.Types.ObjectId, ref: "Opening", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  stage: { type: String, enum: ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"], default: "Applied" },
}, { timestamps: true });
module.exports = mongoose.model("Candidate", schema);
