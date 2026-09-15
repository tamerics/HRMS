const mongoose = require("mongoose");

const onboardingStepSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    label: { type: String, required: true },
    done: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OnboardingStep", onboardingStepSchema);
