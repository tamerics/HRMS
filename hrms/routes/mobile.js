const express = require("express");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Claim = require("../models/Claim");
const Announcement = require("../models/Announcement");
const Settings = require("../models/CompanySettings");
const router = express.Router();
const privileged = person => ["admin", "hr_admin"].includes(person.accessLevel) || person.isManager;
const wrap = fn => async (req, res, next) => { try { await fn(req, res, next); } catch (error) { res.status(400).json({ error: error.message }); } };
router.use(require("../middleware/auth"));
router.use(wrap(async (req, res, next) => {
  req.person = await Employee.findById(req.employeeId).populate("manager", "name email mobile phone1 department role");
  if (!req.person || req.person.employmentStatus === "Inactive") return res.status(403).json({ error: "Active employee required" });
  next();
}));
router.get("/bootstrap", wrap(async (req, res) => {
  const company = await Settings.findOne({ key: "company" }).lean();
  const announcements = await Announcement.find({ published: true }).sort({ publishedAt: -1 }).limit(20).lean();
  res.json({ employee: req.person, company: company || { companyName: "HRMS" }, announcements });
}));
router.get("/team-attendance", wrap(async (req, res) => {
  if (!privileged(req.person)) return res.status(403).json({ error: "Manager access required" });
  const people = await Employee.find(["admin", "hr_admin"].includes(req.person.accessLevel) ? {} : { manager: req.person._id }).select("name employeeNo department role").lean();
  const ids = people.map(person => person._id);
  const from = String(req.query.from || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const records = await Attendance.find({ employee: { $in: ids }, date: { $gte: from } }).sort({ date: -1 }).lean();
  res.json({ people, records });
}));
router.get("/claims", wrap(async (req, res) => {
  const filter = privileged(req.person) ? { $or: [{ employee: req.person._id }, { status: "Pending" }] } : { employee: req.person._id };
  res.json(await Claim.find(filter).populate("employee", "name employeeNo department").populate("decidedBy", "name").sort({ createdAt: -1 }));
}));
router.post("/claims", wrap(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid claim amount");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.expenseDate || "")) throw new Error("Select an expense date");
  const created = await Claim.create({ employee: req.person._id, category: req.body.category, expenseDate: req.body.expenseDate, amount, description: req.body.description, attachmentName: req.body.attachmentName, attachmentData: req.body.attachmentData });
  res.status(201).json(await created.populate("employee", "name employeeNo department"));
}));
router.patch("/claims/:id", wrap(async (req, res) => {
  if (!privileged(req.person) || !["Approved", "Declined"].includes(req.body.status)) return res.status(403).json({ error: "Manager decision required" });
  const claim = await Claim.findById(req.params.id);
  if (!claim || claim.status !== "Pending") return res.status(409).json({ error: "Claim is no longer pending" });
  claim.status = req.body.status; claim.decidedBy = req.person._id; claim.decidedAt = new Date(); await claim.save();
  res.json(await claim.populate("employee", "name employeeNo department"));
}));
module.exports = router;
