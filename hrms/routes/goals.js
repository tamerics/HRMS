const express = require("express");
const Goal = require("../models/Goal");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/goals
router.get("/", async (req, res) => {
  const goals = await Goal.find({ employee: req.employeeId });
  res.json(goals);
});

// POST /api/goals
router.post("/", async (req, res) => {
  const { title, progress } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });
  const goal = await Goal.create({ employee: req.employeeId, title, progress: progress || 0 });
  res.status(201).json(goal);
});

// PATCH /api/goals/:id — update progress
router.patch("/:id", async (req, res) => {
  const { progress } = req.body;
  const goal = await Goal.findOneAndUpdate(
    { _id: req.params.id, employee: req.employeeId },
    { progress },
    { new: true }
  );
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  res.json(goal);
});

module.exports = router;
