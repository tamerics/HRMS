const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  deviceIp: { type: String, required: true },
  deviceUserId: { type: String, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  punchedAt: { type: Date, required: true },
  date: { type: String, required: true },
}, { timestamps: true });
schema.index({ deviceIp: 1, deviceUserId: 1, punchedAt: 1 }, { unique: true });
module.exports = mongoose.model("FingerprintPunch", schema);
