const express = require("express");
const Employee = require("../models/Employee");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/employees/me — the logged-in employee's own profile
router.get("/me", async (req, res) => {
  const employee = await Employee.findById(req.employeeId);
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  const account = await require('../models/RequestAccount').findOne({employee:employee._id});
  if(account) { employee.leaveBalance.annual=account.annual; employee.leaveBalance.sick=account.sick; }
  res.json(employee);
});

// GET /api/employees — company directory (search via ?q=)
router.get("/", async (req, res) => {
  const { q } = req.query;
  const filter = q
    ? {
        $or: [
          { name: new RegExp(q, "i") },
          { role: new RegExp(q, "i") },
          { department: new RegExp(q, "i") },
        ],
      }
    : {};
  filter.employmentStatus = { $ne: "Inactive" };
  const employees = await Employee.find(filter)
    .select("name employeeNo role department email mobile phone1 manager isManager accessLevel")
    .populate("manager", "name email mobile phone1 department role")
    .sort({ department: 1, name: 1 });
  res.json(employees);
});

module.exports = router;
