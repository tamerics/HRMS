const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  key: { type: String, default: "company", unique: true },
  companyName: { type: String, default: "HRMS" },
  attention: { type: String, default: "" },
  address: { type: String, default: "" },
  phone1: { type: String, default: "" },
  phone2: { type: String, default: "" },
  fax: { type: String, default: "" },
  businessNature: { type: String, default: "" },
  workSchedule: { start: { type: String, default: "09:00" }, end: { type: String, default: "18:00" } },
  overtime: {
    workDayStart: { type: String, default: "18:00" }, workDayMinimumMinutes: { type: Number, default: 30 },
    workDayMaximumMinutes: { type: Number, default: 240 }, workDayRate: { type: Number, default: 1.5 },
    restDayRate: { type: Number, default: 2 }, publicHolidayRate: { type: Number, default: 2 },
  },
  generalManager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  departments: [{ type: String }],
  holidays: [{ name: String, date: String }],
  leavePolicy: {
    annualDefault: { type: Number, default: 24 },
    sickDefault: { type: Number, default: 6 },
    wfhDefault: { type: Number, default: 3 },
    annualAccrualMonthly: { type: Number, default: 1.17 },
    carryoverLimit: { type: Number, default: 5 },
  },
  payCycle: { type: String, enum: ["Monthly", "Biweekly", "Weekly"], default: "Monthly" },
  nextPayDate: { type: String, default: "" },
}, { timestamps: true });
module.exports = mongoose.model("CompanySettings", schema);
