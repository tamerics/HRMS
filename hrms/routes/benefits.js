const express = require("express");
const Benefit = require("../models/Benefit");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/benefits
router.get("/", async (req, res) => {
  const benefits = await Benefit.find({ employee: req.employeeId });
  res.json(benefits);
});

module.exports = router;
