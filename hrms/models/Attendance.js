const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  accuracy: { type: Number, default: null, min: 0 },
  capturedAt: { type: Date, required: true },
}, { _id: false });

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true }, // "2026-08-18"
    clockIn: { type: Date },
    clockOut: { type: Date },
    clockInLocation: { type: locationSchema, default: null },
    clockOutLocation: { type: locationSchema, default: null },
    status: { type: String, enum: ["On time", "Late", "Leave"], default: "On time" },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
