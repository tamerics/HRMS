const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: String, required: true }, // "July 2026"
    gross: { type: Number, required: true },
    deductions: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    net: { type: Number, required: true },
    payDate: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payslip", payslipSchema);
