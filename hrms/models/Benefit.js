const mongoose = require("mongoose");

const benefitSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    name: { type: String, required: true },
    detail: { type: String, default: "" },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "BenefitPlan", default: null },
    status: { type: String, enum: ["Active", "Waived", "Pending"], default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Benefit", benefitSchema);
