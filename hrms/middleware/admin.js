const Employee = require("../models/Employee");

async function requireAdmin(req, res, next) {
  try {
    const employee = await Employee.findById(req.employeeId).select("accessLevel");
    if (!employee || !["admin", "hr_admin"].includes(employee.accessLevel)) {
      return res.status(403).json({ error: "Administrator access required" });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAdmin;
