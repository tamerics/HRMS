const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  provider: { type: String, default: "" },
  description: { type: String, default: "" },
  active: { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model("BenefitPlan", schema);
