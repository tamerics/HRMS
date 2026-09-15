const express = require("express");
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.method !== "GET") return res.status(409).json({ error: "Submit and approve requests through the new Leave and Excuses page. Historical requests are read-only." });
  next();
});

// GET /api/leave — this employee's leave requests, most recent first
router.get("/", async (req, res) => {
  const requests = await Leave.find({ employee: req.employeeId }).sort({ createdAt: -1 });
  res.json(requests);
});

// POST /api/leave — submit a new leave request
router.post("/", async (req, res) => {
  const { type, startDate, endDate, reason } = req.body;
  if (!type || !startDate || !endDate) {
    return res.status(400).json({ error: "type, startDate, and endDate are required" });
  }

  const request = await Leave.create({
    employee: req.employeeId,
    type,
    startDate,
    endDate,
    reason: reason || "",
  });
  res.status(201).json(request);
});

// PATCH /api/leave/:id — approve or decline (manager use)
router.patch("/:id", async (req, res) => {
  const { status } = req.body;
  if (!["Approved", "Declined"].includes(status)) {
    return res.status(400).json({ error: "status must be Approved or Declined" });
  }

  const manager = await Employee.findById(req.employeeId);
  if (!manager || !manager.isManager) {
    return res.status(403).json({ error: "Only managers can approve or decline leave" });
  }

  const request = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!request) return res.status(404).json({ error: "Leave request not found" });
  res.json(request);
});

module.exports = router;
