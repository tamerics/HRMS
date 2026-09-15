const mongoose = require("mongoose");

const openingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    applicants: { type: Number, default: 0 },
    status: { type: String, enum: ["Draft", "Open", "Closed"], default: "Open" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opening", openingSchema);
