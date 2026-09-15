const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

const router = express.Router();

function signToken(employee) {
  return jwt.sign({ id: employee._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const existing = await Employee.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const employee = await Employee.create({
      name,
      email,
      passwordHash,
      role: role || "Employee",
      department: department || "General",
    });

    const token = signToken(employee);
    res.status(201).json({ token, employee });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", detail: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const employee = await Employee.findOne({ email: email.toLowerCase() });
    if (!employee) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, employee.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(employee);
    res.json({ token, employee });
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

module.exports = router;
