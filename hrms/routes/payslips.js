const express = require("express");
const Payslip = require("../models/Payslip");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/payslips — this employee's payslips, most recent first
router.get("/", async (req, res) => {
  const payslips = await Payslip.find({ employee: req.employeeId }).sort({ createdAt: -1 });
  res.json(payslips);
});

module.exports = router;
