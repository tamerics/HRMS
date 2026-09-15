const express = require("express");
const Employee = require("../models/Employee");
const Leave = require("../models/Leave");
const Attendance = require("../models/Attendance");
const Payslip = require("../models/Payslip");
const Goal = require("../models/Goal");
const OnboardingStep = require("../models/OnboardingStep");
const Benefit = require("../models/Benefit");
const FingerprintPunch = require("../models/FingerprintPunch");
const bcrypt = require("bcryptjs");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");

const router = express.Router();
router.use(requireAuth, requireAdmin);
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const internalEmail = () => `employee.${Date.now()}.${Math.random().toString(36).slice(2, 10)}@no-email.local`;

router.get("/dashboard", asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [employees, managers, pendingLeave, presentToday] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ isManager: true }),
    Leave.countDocuments({ status: "Pending" }),
    Attendance.countDocuments({ date: today, clockIn: { $exists: true } }),
  ]);
  res.json({ employees, managers, pendingLeave, presentToday });
}));

router.get("/employees", asyncHandler(async (req, res) => {
  const employees = await Employee.find()
    .select("name email employeeNo role department manager employmentStatus hireDate deviceUserId isManager accessLevel leaveBalance gender dateOfBirth country nationalId oldNationalId passport immigrationNo phone1 phone2 mobile traveller family allowances payrollProfile createdAt")
    .populate("manager", "name email")
    .sort({ name: 1 });
  const accounts = await require('../models/RequestAccount').find({employee:{$in:employees.map(p=>p._id)}});
  const balances = new Map(accounts.map(a=>[String(a.employee),a]));
  for(const p of employees) { const a=balances.get(String(p._id)); if(a){p.leaveBalance.annual=a.annual;p.leaveBalance.sick=a.sick;} }
  res.json(employees);
}));

router.post("/employees", asyncHandler(async (req, res) => {
  const { name, email, password, role, department, manager, employmentStatus, hireDate, deviceUserId, isManager, accessLevel } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  const temporaryPassword = String(password || "1234");
  if (temporaryPassword.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }
  const normalizedEmail = String(email || "").trim().toLowerCase() || internalEmail();
  if (email && await Employee.exists({ email: normalizedEmail })) {
    return res.status(409).json({ error: "An employee with that email already exists" });
  }
  const employee = await Employee.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(temporaryPassword, 12),
    role: role?.trim() || "Employee",
    department: department?.trim() || "General",
    manager: manager || null,
    employmentStatus: employmentStatus || "Active",
    hireDate: hireDate || "",
    deviceUserId: deviceUserId || "",
    isManager: Boolean(isManager) || accessLevel === "manager",
    accessLevel: ["admin", "hr_admin", "manager"].includes(accessLevel) ? accessLevel : "employee",
    employeeNo: req.body.employeeNo || "", mobile: req.body.mobile || "", phone1: req.body.phone1 || "",
  });
  res.status(201).json(employee);
}));

router.patch("/employees/:id", asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found" });

  const { name, email, password, role, department, manager, employmentStatus, hireDate, deviceUserId, isManager, accessLevel } = req.body;
  for (const key of ["employeeNo", "gender", "dateOfBirth", "country", "nationalId", "oldNationalId", "passport", "immigrationNo", "phone1", "phone2", "mobile"]) {
    if (req.body[key] !== undefined) employee[key] = String(req.body[key]).trim();
  }
  if (req.body.traveller !== undefined) employee.traveller = Boolean(req.body.traveller);
  if (req.body.payrollProfile && typeof req.body.payrollProfile === "object") employee.payrollProfile = { ...(employee.payrollProfile?.toObject?.() || {}), ...req.body.payrollProfile };
  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail) {
      const duplicate = await Employee.exists({ email: normalizedEmail, _id: { $ne: employee._id } });
      if (duplicate) return res.status(409).json({ error: "An employee with that email already exists" });
      employee.email = normalizedEmail;
    } else if (!employee.email.endsWith("@no-email.local")) employee.email = internalEmail();
  }
  if (name !== undefined) employee.name = name.trim();
  if (role !== undefined) employee.role = role.trim() || "Employee";
  if (department !== undefined) employee.department = department.trim() || "General";
  if (manager !== undefined) employee.manager = manager || null;
  if (employmentStatus !== undefined) employee.employmentStatus = employmentStatus;
  if (hireDate !== undefined) employee.hireDate = hireDate;
  if (deviceUserId !== undefined) employee.deviceUserId = String(deviceUserId).trim();
  if (isManager !== undefined) employee.isManager = Boolean(isManager);
  if (accessLevel !== undefined) {
    const nextAccess = ["admin", "hr_admin", "manager"].includes(accessLevel) ? accessLevel : "employee";
    if (String(employee._id) === String(req.employeeId) && !["admin", "hr_admin"].includes(nextAccess)) {
      return res.status(400).json({ error: "You cannot remove your own administrator access" });
    }
    employee.accessLevel = nextAccess;
  }
  if (password) {
    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }
    employee.passwordHash = await bcrypt.hash(password, 12);
  }
  await employee.save();
  res.json(employee);
}));

router.delete("/employees/bulk-delete", asyncHandler(async (req, res) => {
  const ids = [...new Set((req.body.ids || []).map(String).filter(Boolean))];
  if (!ids.length) return res.status(400).json({ error: "Select at least one employee" });
  if (ids.includes(String(req.employeeId))) return res.status(400).json({ error: "You cannot delete your own administrator account" });

  const employees = await Employee.find({ _id: { $in: ids } }).select("_id accessLevel");
  if (!employees.length) return res.status(404).json({ error: "No selected employees were found" });
  const selectedIds = employees.map((employee) => employee._id);
  const selectedAdminCount = employees.filter((employee) => ["admin", "hr_admin"].includes(employee.accessLevel)).length;
  const adminCount = await Employee.countDocuments({ accessLevel: { $in: ["admin", "hr_admin"] } });
  if (adminCount - selectedAdminCount < 1) return res.status(400).json({ error: "At least one administrator account must remain" });

  await Promise.all([
    Attendance.deleteMany({ employee: { $in: selectedIds } }),
    Leave.deleteMany({ employee: { $in: selectedIds } }),
    Payslip.deleteMany({ employee: { $in: selectedIds } }),
    Goal.deleteMany({ employee: { $in: selectedIds } }),
    OnboardingStep.deleteMany({ employee: { $in: selectedIds } }),
    Benefit.deleteMany({ employee: { $in: selectedIds } }),
    FingerprintPunch.deleteMany({ employee: { $in: selectedIds } }),
    Employee.updateMany({ manager: { $in: selectedIds } }, { $set: { manager: null } }),
  ]);
  const result = await Employee.deleteMany({ _id: { $in: selectedIds } });
  res.json({ deleted: result.deletedCount, ids: selectedIds });
}));

router.delete("/employees/:id", asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.employeeId)) {
    return res.status(400).json({ error: "You cannot delete your own administrator account" });
  }
  const employee = await Employee.findById(req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  if (["admin", "hr_admin"].includes(employee.accessLevel) && await Employee.countDocuments({ accessLevel: { $in: ["admin", "hr_admin"] } }) <= 1) {
    return res.status(400).json({ error: "The last administrator account cannot be deleted" });
  }

  await Promise.all([
    Attendance.deleteMany({ employee: employee._id }),
    Leave.deleteMany({ employee: employee._id }),
    Payslip.deleteMany({ employee: employee._id }),
    Goal.deleteMany({ employee: employee._id }),
    OnboardingStep.deleteMany({ employee: employee._id }),
    Benefit.deleteMany({ employee: employee._id }),
    FingerprintPunch.deleteMany({ employee: employee._id }),
    Employee.updateMany({ manager: employee._id }, { $set: { manager: null } }),
  ]);
  await employee.deleteOne();
  res.json({ deleted: true, id: employee._id });
}));

router.get("/leave", asyncHandler(async (req, res) => {
  const requests = await Leave.find()
    .populate("employee", "name email department")
    .sort({ createdAt: -1 });
  res.json(requests);
}));

router.patch("/leave/:id", asyncHandler(async (req, res) => {
    return res.status(409).json({ error: "Historical requests are read-only. Use the two-level approval queue in Leave." });
  const update = {};
  if (req.body.type !== undefined) {
    if (!["Annual", "Sick", "WFH"].includes(req.body.type)) return res.status(400).json({ error: "Invalid leave type" });
    update.type = req.body.type;
  }
  if (req.body.status !== undefined) {
    if (!["Pending", "Approved", "Declined"].includes(req.body.status)) return res.status(400).json({ error: "Invalid leave status" });
    update.status = req.body.status;
  }
  if (req.body.startDate !== undefined) update.startDate = String(req.body.startDate);
  if (req.body.endDate !== undefined) update.endDate = String(req.body.endDate);
  if (req.body.reason !== undefined) update.reason = String(req.body.reason).trim();
  const current = await Leave.findById(req.params.id);
  if (!current) return res.status(404).json({ error: "Leave request not found" });
  const startDate = update.startDate ?? current.startDate;
  const endDate = update.endDate ?? current.endDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return res.status(400).json({ error: "Valid start and end dates are required" });
  if (endDate < startDate) return res.status(400).json({ error: "End date cannot be before start date" });
  const request = await Leave.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    .populate("employee", "name email department");
  res.json(request);
}));

router.delete("/leave/:id", asyncHandler(async (req, res) => {
    return res.status(409).json({ error: "Historical leave records are retained for audit." });
  const request = await Leave.findByIdAndDelete(req.params.id);
  if (!request) return res.status(404).json({ error: "Leave request not found" });
  res.json({ deleted: true, id: request._id });
}));

module.exports = router;
