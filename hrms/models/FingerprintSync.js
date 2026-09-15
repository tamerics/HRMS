const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  deviceIp: { type: String, required: true },
  status: { type: String, enum: ["Success", "Failed"], required: true },
  logsRead: { type: Number, default: 0 },
  punchesImported: { type: Number, default: 0 },
  unmatched: { type: Number, default: 0 },
  message: { type: String, default: "" },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
}, { timestamps: true });
module.exports = mongoose.model("FingerprintSync", schema);
