const express = require("express");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Payslip = require("../models/Payslip");
const Goal = require("../models/Goal");
const OnboardingStep = require("../models/OnboardingStep");
const OnboardingTemplate = require("../models/OnboardingTemplate");
const Benefit = require("../models/Benefit");
const BenefitPlan = require("../models/BenefitPlan");
const Opening = require("../models/Opening");
const Candidate = require("../models/Candidate");
const ReviewCycle = require("../models/ReviewCycle");
const CompanySettings = require("../models/CompanySettings");
const FingerprintSync = require("../models/FingerprintSync");
const FingerprintPunch = require("../models/FingerprintPunch");
const fingerprint = require("../services/fingerprint");
const requireAuth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");

const router = express.Router();
let fingerprintSyncRunning = false;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const internalEmail = () => `employee.${Date.now()}.${Math.random().toString(36).slice(2, 10)}@no-email.local`;
router.use(requireAuth, requireAdmin);

router.post("/employees/import", wrap(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length || rows.length > 500) return res.status(400).json({ error: "Provide 1 to 500 employee rows" });
  const results = { created: 0, skipped: [] };
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = Number(row._rowNumber) || index + 2;
    const suppliedEmail = String(row.email || "").trim().toLowerCase();
    const email = suppliedEmail || internalEmail();
    const temporaryPassword = String(row.password || "1234");
    if (!row.name || temporaryPassword.length < 4) {
      results.skipped.push({ row: rowNumber, email: suppliedEmail, name: String(row.name || ""), reason: "Name is required and password must contain at least 4 characters" });
      continue;
    }
    if (suppliedEmail && await Employee.exists({ email })) {
      results.skipped.push({ row: rowNumber, email: suppliedEmail, name: String(row.name || ""), reason: "Email already exists" });
      continue;
    }
    try {
      await Employee.create({
        name: String(row.name).trim(), email,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        role: row.role || "Employee", department: row.department || "General",
        employmentStatus: row.employmentStatus || "Active", hireDate: row.hireDate || "",
        deviceUserId: row.deviceUserId ? String(row.deviceUserId).trim() : "",
        accessLevel: ["manager", "hr_admin"].includes(row.accessLevel) ? row.accessLevel : "employee",
        isManager: row.accessLevel === "manager" || String(row.isManager).toLowerCase() === "true",
      });
      results.created += 1;
    } catch (error) {
      const reason = error?.code === 11000 ? "Email already exists" : Object.values(error?.errors || {})[0]?.message || "Invalid employee data";
      results.skipped.push({ row: rowNumber, email: suppliedEmail, name: String(row.name || ""), reason });
    }
  }
  res.status(201).json({ ...results, processed: rows.length });
}));

router.get("/attendance", wrap(async (req, res) => {
  const employeeFilter = {};
  if (req.query.department) employeeFilter.department = req.query.department;
  if (req.query.employee) employeeFilter._id = req.query.employee;
  const employeeIds = Object.keys(employeeFilter).length ? await Employee.find(employeeFilter).distinct("_id") : null;
  const filter = {};
  if (employeeIds) filter.employee = { $in: employeeIds };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = req.query.from;
    if (req.query.to) filter.date.$lte = req.query.to;
  }
  res.json(await Attendance.find(filter).populate("employee", "name department role").sort({ date: -1 }).limit(1000));
}));

router.get("/fingerprint/history", wrap(async (req, res) => res.json(await FingerprintSync.find().populate("triggeredBy", "name email").sort({ createdAt: -1 }).limit(20))));
router.post("/fingerprint/test", wrap(async (req, res) => res.json(await fingerprint.testConnection())));
router.post("/fingerprint/sync", wrap(async (req, res) => {
  if (fingerprintSyncRunning) return res.status(409).json({ error: "A fingerprint sync is already running" });
  fingerprintSyncRunning = true;
  try { res.json(await fingerprint.syncAttendance(req.employeeId, req.body.days)); }
  finally { fingerprintSyncRunning = false; }
}));

router.patch("/attendance/:id", wrap(async (req, res) => {
  const update = {};
  for (const key of ["date", "clockIn", "clockOut", "status"]) if (req.body[key] !== undefined) update[key] = req.body[key] || null;
  const record = await Attendance.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate("employee", "name department role");
  if (!record) return res.status(404).json({ error: "Attendance record not found" });
  res.json(record);
}));

router.get("/attendance/flags", wrap(async (req, res) => {
  const since = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const until = req.query.to || new Date().toISOString().slice(0, 10);
  const attendanceMatch = { date: { $gte: since, $lte: until } };
  if (req.query.employee) attendanceMatch.employee = new (require("mongoose").Types.ObjectId)(req.query.employee);
  const rows = await Attendance.aggregate([
    { $match: attendanceMatch },
    { $group: { _id: "$employee", late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } }, daysPresent: { $sum: 1 } } },
  ]);
  const periodEnd = new Date(`${until}T00:00:00`); const start = new Date(`${since}T00:00:00`); let workdays = 0;
  for (let day = new Date(start); day <= periodEnd; day.setDate(day.getDate() + 1)) if (![0, 6].includes(day.getDay())) workdays += 1;
  const byEmployee = new Map(rows.map((row) => [String(row._id), row]));
  const employeeFilter = { employmentStatus: "Active" };
  if (req.query.department) employeeFilter.department = req.query.department;
  if (req.query.employee) employeeFilter._id = req.query.employee;
  const employees = await Employee.find(employeeFilter).select("name department");
  res.json(employees.map((employee) => {
    const row = byEmployee.get(String(employee._id)) || { late: 0, daysPresent: 0 };
    return { employee, late: row.late, daysPresent: row.daysPresent, absent: Math.max(0, workdays - row.daysPresent) };
  }).filter((row) => row.late >= 3 || row.absent >= 3).sort((a, b) => (b.late + b.absent) - (a.late + a.absent)));
}));

router.patch("/employees/:id/balance", wrap(async (req, res) => {
    const EmployeeAccount = require('../models/RequestAccount');
    const person = await Employee.findById(req.params.id);
    if(!person) return res.status(404).json({error:'Employee not found'});
    let account = await EmployeeAccount.findOne({employee:person._id});
    if(!account) account = new EmployeeAccount({employee:person._id,annual:person.leaveBalance.annual,sick:person.leaveBalance.sick});
    for(const key of ['annual','sick']) if(req.body[key] !== undefined) {
      const amount = Number(req.body[key]);
      if(!Number.isFinite(amount)||amount<0) return res.status(400).json({error:'Balances must be non-negative numbers'});
      account[key]=amount;
    }
    await account.save();
    person.leaveBalance.annual=account.annual; person.leaveBalance.sick=account.sick;
    return res.json(person);
  const update = {};
  for (const key of ["annual", "sick", "wfh"]) if (Number.isFinite(Number(req.body[key]))) update[`leaveBalance.${key}`] = Number(req.body[key]);
  const employee = await Employee.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  res.json(employee);
}));

router.get("/leave/calendar", wrap(async (req, res) => {
  const filter = { status: "Approved" };
  if (req.query.from || req.query.to) {
    if (req.query.from) filter.endDate = { $gte: req.query.from };
    if (req.query.to) filter.startDate = { $lte: req.query.to };
  }
  res.json(await Leave.find(filter).populate("employee", "name department").sort({ startDate: 1 }));
}));

router.get("/payroll", wrap(async (req, res) => res.json(await Payslip.find().populate("employee", "name email department").sort({ createdAt: -1 }))));
router.post("/payroll", wrap(async (req, res) => {
  const { employee, month, gross, deductions = 0, bonus = 0, payDate = "" } = req.body;
  if (!employee || !month || !Number.isFinite(Number(gross))) return res.status(400).json({ error: "employee, month, and gross are required" });
  const net = Number(gross) + Number(bonus) - Number(deductions);
  res.status(201).json(await (await Payslip.create({ employee, month, gross, deductions, bonus, net, payDate })).populate("employee", "name email department"));
}));
router.patch("/payroll/:id", wrap(async (req, res) => {
  const current = await Payslip.findById(req.params.id);
  if (!current) return res.status(404).json({ error: "Payslip not found" });
  if (req.body.month !== undefined) {
    if (!String(req.body.month).trim()) return res.status(400).json({ error: "Pay cycle is required" });
    current.month = String(req.body.month).trim();
  }
  for (const key of ["gross", "deductions", "bonus"]) {
    if (req.body[key] !== undefined) {
      const value = Number(req.body[key]);
      if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: `${key} must be a non-negative number` });
      current[key] = value;
    }
  }
  if (req.body.payDate !== undefined) current.payDate = String(req.body.payDate);
  current.net = Number(current.gross) + Number(current.bonus || 0) - Number(current.deductions);
  await current.save();
  res.json(await current.populate("employee", "name email department"));
}));
router.delete("/payroll/:id", wrap(async (req, res) => {
  const payslip = await Payslip.findByIdAndDelete(req.params.id);
  if (!payslip) return res.status(404).json({ error: "Payslip not found" });
  res.json({ deleted: true, id: payslip._id });
}));

router.get("/goals", wrap(async (req, res) => res.json(await Goal.find().populate("employee", "name department manager").sort({ createdAt: -1 }))));
router.post("/goals", wrap(async (req, res) => res.status(201).json(await (await Goal.create(req.body)).populate("employee", "name department manager"))));
router.patch("/goals/:id", wrap(async (req, res) => res.json(await Goal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("employee", "name department manager"))));
router.get("/review-cycles", wrap(async (req, res) => res.json(await ReviewCycle.find().sort({ startDate: -1 }))));
router.post("/review-cycles", wrap(async (req, res) => res.status(201).json(await ReviewCycle.create(req.body))));
router.patch("/review-cycles/:id", wrap(async (req, res) => res.json(await ReviewCycle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))));

router.get("/onboarding", wrap(async (req, res) => res.json(await OnboardingStep.find().populate("employee", "name department role").sort({ createdAt: -1, order: 1 }))));
router.get("/onboarding-templates", wrap(async (req, res) => res.json(await OnboardingTemplate.find().sort({ name: 1 }))));
router.post("/onboarding-templates", wrap(async (req, res) => res.status(201).json(await OnboardingTemplate.create(req.body))));
router.patch("/onboarding-templates/:id", wrap(async (req, res) => res.json(await OnboardingTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))));

router.get("/benefit-plans", wrap(async (req, res) => res.json(await BenefitPlan.find().sort({ name: 1 }))));
router.post("/benefit-plans", wrap(async (req, res) => res.status(201).json(await BenefitPlan.create(req.body))));
router.patch("/benefit-plans/:id", wrap(async (req, res) => res.json(await BenefitPlan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))));
router.get("/benefit-enrollments", wrap(async (req, res) => res.json(await Benefit.find().populate("employee", "name department").populate("plan", "name provider").sort({ createdAt: -1 }))));
router.post("/benefit-enrollments", wrap(async (req, res) => res.status(201).json(await (await Benefit.create(req.body)).populate(["employee", "plan"]))));
router.patch("/benefit-enrollments/:id", wrap(async (req, res) => res.json(await Benefit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("employee", "name department").populate("plan", "name provider"))));

router.get("/openings", wrap(async (req, res) => res.json(await Opening.find().sort({ createdAt: -1 }))));
router.post("/openings", wrap(async (req, res) => res.status(201).json(await Opening.create(req.body))));
router.patch("/openings/:id", wrap(async (req, res) => res.json(await Opening.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))));
router.get("/candidates", wrap(async (req, res) => res.json(await Candidate.find().populate("opening", "title department").sort({ createdAt: -1 }))));
router.post("/candidates", wrap(async (req, res) => {
  const candidate = await Candidate.create(req.body);
  await Opening.findByIdAndUpdate(candidate.opening, { $inc: { applicants: 1 } });
  res.status(201).json(await candidate.populate("opening", "title department"));
}));
router.patch("/candidates/:id", wrap(async (req, res) => res.json(await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("opening", "title department"))));

router.get("/settings", wrap(async (req, res) => res.json(await CompanySettings.findOneAndUpdate({ key: "company" }, { $setOnInsert: { key: "company", departments: ["General", "People", "Engineering", "Design", "Product", "Sales"] } }, { upsert: true, new: true }))));
router.put("/settings", wrap(async (req, res) => res.json(await CompanySettings.findOneAndUpdate({ key: "company" }, { $set: req.body }, { upsert: true, new: true, runValidators: true }))));
router.post("/settings/delete-period", wrap(async (req, res) => {
  const { from, to, confirmation } = req.body;
  const targets = Array.isArray(req.body.targets) ? [...new Set(req.body.targets)] : [];
  if (confirmation !== "DELETE") return res.status(400).json({ error: "Type DELETE to confirm permanent deletion" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return res.status(400).json({ error: "Valid From and To dates are required" });
  if (to < from) return res.status(400).json({ error: "To date cannot be before From date" });
  if (!targets.length || targets.some((target) => !["attendance", "leave"].includes(target))) return res.status(400).json({ error: "Select Attendance, Leave, or both" });

  const result = { from, to, attendanceDeleted: 0, fingerprintPunchesDeleted: 0, leaveDeleted: 0 };
  if (targets.includes("attendance")) {
    const [attendance, punches] = await Promise.all([
      Attendance.deleteMany({ date: { $gte: from, $lte: to } }),
      FingerprintPunch.deleteMany({ date: { $gte: from, $lte: to } }),
    ]);
    result.attendanceDeleted = attendance.deletedCount;
    result.fingerprintPunchesDeleted = punches.deletedCount;
  }
  if (targets.includes("leave")) {
    const leave = await Leave.deleteMany({ startDate: { $lte: to }, endDate: { $gte: from } });
    result.leaveDeleted = leave.deletedCount;
  }
  res.json(result);
}));

router.get("/analytics", wrap(async (req, res) => {
  const [headcount, leaveTrend, attendanceTrend, hires, openings, inactive, totalEmployees, hiredCandidates] = await Promise.all([
    Employee.aggregate([{ $match: { employmentStatus: { $ne: "Inactive" } } }, { $group: { _id: "$department", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Leave.aggregate([{ $group: { _id: { $substr: ["$startDate", 0, 7] }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $limit: 12 }]),
    Attendance.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Candidate.countDocuments({ stage: "Hired" }),
    Opening.countDocuments({ status: "Open" }),
    Employee.countDocuments({ employmentStatus: "Inactive" }),
    Employee.countDocuments(),
    Candidate.find({ stage: "Hired" }).select("createdAt updatedAt"),
  ]);
  const averageTimeToHireDays = hiredCandidates.length ? Math.round(hiredCandidates.reduce((sum, candidate) => sum + (candidate.updatedAt - candidate.createdAt) / 86400000, 0) / hiredCandidates.length) : 0;
  res.json({ headcount, leaveTrend, attendanceTrend, hires, openRoles: openings, inactive, turnoverRate: totalEmployees ? Math.round((inactive / totalEmployees) * 1000) / 10 : 0, averageTimeToHireDays });
}));

module.exports = router;
