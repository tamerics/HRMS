const express = require("express");
const Attendance = require("../models/Attendance");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/*
 * Location is optional. If valid coordinates are supplied, they are saved.
 * Missing or invalid coordinates no longer prevent attendance.
 */
function readLocation(body) {
  if (
    body?.location?.latitude === undefined ||
    body?.location?.longitude === undefined
  ) {
    return null;
  }

  const latitude = Number(body.location.latitude);
  const longitude = Number(body.location.longitude);

  const accuracy =
    body.location.accuracy === undefined
      ? null
      : Number(body.location.accuracy);

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy:
      Number.isFinite(accuracy) && accuracy >= 0
        ? accuracy
        : null,
    capturedAt: new Date(),
  };
}

// GET /api/attendance
router.get("/", async (req, res, next) => {
  try {
    const records = await Attendance.find({
      employee: req.employeeId,
    })
      .sort({ date: -1 })
      .limit(30);

    res.json(records);
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/clock-in
router.post("/clock-in", async (req, res, next) => {
  try {
    const location = readLocation(req.body);
    const date = todayKey();

    const existing = await Attendance.findOne({
      employee: req.employeeId,
      date,
    });

if (existing?.clockIn) {
  return res.status(200).json(existing);
}

    const now = new Date();

    const status =
      now.getHours() > 9 ||
      (now.getHours() === 9 && now.getMinutes() > 10)
        ? "Late"
        : "On time";

    let record;

    if (existing) {
      existing.clockIn = now;
      existing.status = status;

      if (location) {
        existing.clockInLocation = location;
      }

      record = existing;
    } else {
      const attendanceData = {
        employee: req.employeeId,
        date,
        clockIn: now,
        status,
      };

      if (location) {
        attendanceData.clockInLocation = location;
      }

      record = new Attendance(attendanceData);
    }

    await record.save();

    return res.status(201).json(record);
  } catch (error) {
    return next(error);
  }
});

// POST /api/attendance/clock-out
router.post("/clock-out", async (req, res, next) => {
  try {
    const location = readLocation(req.body);
    const date = todayKey();

    const record = await Attendance.findOne({
      employee: req.employeeId,
      date,
    });

    if (!record?.clockIn) {
      return res.status(400).json({
        error: "You haven't clocked in today",
      });
    }

 

    record.clockOut = new Date();

    if (location) {
      record.clockOutLocation = location;
    }

    await record.save();

    return res.json(record);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;