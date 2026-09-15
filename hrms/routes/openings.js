const express = require("express");
const Opening = require("../models/Opening");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/openings — visible to all logged-in employees
router.get("/", async (req, res) => {
  const openings = await Opening.find();
  res.json(openings);
});

module.exports = router;
