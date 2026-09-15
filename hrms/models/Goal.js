const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    title: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    team: { type: String, default: "" },
    reviewCycle: { type: String, default: "" },
    status: { type: String, enum: ["Not started", "In progress", "Complete"], default: "Not started" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);
