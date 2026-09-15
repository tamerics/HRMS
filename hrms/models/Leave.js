const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    type: { type: String, enum: ["Annual", "Sick", "WFH"], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Declined"], default: "Pending" },
    reason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);
