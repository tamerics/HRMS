const express = require("express");
const OnboardingStep = require("../models/OnboardingStep");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/onboarding
router.get("/", async (req, res) => {
  const steps = await OnboardingStep.find({ employee: req.employeeId }).sort({ order: 1 });
  res.json(steps);
});

// PATCH /api/onboarding/:id — mark a step done/undone
router.patch("/:id", async (req, res) => {
  const { done } = req.body;
  const step = await OnboardingStep.findOneAndUpdate(
    { _id: req.params.id, employee: req.employeeId },
    { done },
    { new: true }
  );
  if (!step) return res.status(404).json({ error: "Onboarding step not found" });
  res.json(step);
});

module.exports = router;
