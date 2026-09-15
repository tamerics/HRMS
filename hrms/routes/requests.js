const express = require("express");
const Employee = require("../models/Employee");
const Account = require("../models/RequestAccount");
const Settings = require("../models/CompanySettings");
const { details, TYPES } = require("../services/request-policy");
const router = express.Router();
const admin = e => ["admin", "hr_admin"].includes(e.accessLevel);
const same = (a, b) => String(a) === String(b);
const wrap = fn => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    const status = error.name === "VersionError" || error.code === 11000 ? 409 : 400;
    res.status(status).json({ error: status === 409 ? "Another update completed. Refresh and try again." : error.message });
  }
};
router.use(require("../middleware/auth"));
// Authentication and active employment are checked for every operation.
router.use(async (req, res, next) => {
  try {
    req.person = await Employee.findById(req.employeeId);
    if (!req.person || req.person.employmentStatus === "Inactive") return res.status(403).json({ error: "Active employee required" });
    next();
  } catch (e) { next(e); }
});
async function account(employee) {
  let value = await Account.findOne({ employee: employee._id });
  if (!value) value = await Account.create({ employee: employee._id, annual: employee.leaveBalance?.annual ?? 24, sick: employee.leaveBalance?.sick ?? 6 });
  return value;
}
router.get("/", wrap(async (req, res) => {
  const mine = await account(req.person);
  const accounts = await Account.find(admin(req.person) ? {} : { $or: [{ employee: req.person._id }, { "requests.directManager": req.person._id }, { "requests.generalManager": req.person._id }] }).populate("employee", "name department");
  const rows = accounts.flatMap(a => a.requests.filter(r => admin(req.person) || same(a.employee?._id, req.person._id) || same(r.directManager, req.person._id) || same(r.generalManager, req.person._id)).map(r => ({ ...r.toObject(), employee: a.employee, canDecide: r.status === "Pending" && !same(a.employee?._id, req.person._id) && same(r.stage === "Direct manager" ? r.directManager : r.generalManager, req.person._id) })));
  res.json({ types: TYPES, balances: { annual: mine.annual, sick: mine.sick }, requests: rows.sort((a,b) => b.createdAt - a.createdAt), employeeId: req.person._id, administrator: admin(req.person) });
}));
router.post("/", wrap(async (req, res) => {
  const value = details(req.body);
  const settings = await Settings.findOne({ key: "company" });
  const direct = await Employee.findById(req.person.manager);
  const general = await Employee.findById(settings?.generalManager);
  if (!direct || !general || direct.employmentStatus === "Inactive" || general.employmentStatus === "Inactive") throw new Error("Ask HR to assign an active direct manager and general manager before submitting.");
  if (same(direct._id, general._id) || same(direct._id, req.person._id) || same(general._id, req.person._id)) throw new Error("The applicant and the two approvers must be three different employees.");
  const a = await account(req.person);
  if (value.kind === "Excuse" && a.requests.filter(r => r.kind === "Excuse" && r.month === value.month).length >= 2) throw new Error("Two excuse requests have already been submitted for this month, including rejected requests.");
  if (value.balanceKey && a[value.balanceKey] < value.days) throw new Error("Insufficient leave balance");
  a.requests.push({ ...value, reason: String(req.body.reason || "").slice(0, 2000), directManager: direct._id, generalManager: general._id });
  await a.save();
  res.status(201).json(a.requests[a.requests.length - 1]);
}));
router.patch("/:id/decision", wrap(async (req, res) => {
  if (!["Approved", "Declined"].includes(req.body.status)) throw new Error("Select Approved or Declined");
  const a = await Account.findOne({ "requests._id": req.params.id });
  const r = a?.requests.id(req.params.id);
  if (!r) return res.status(404).json({ error: "Request not found" });
  const approver = r.stage === "Direct manager" ? r.directManager : r.generalManager;
  if (same(a.employee, req.person._id) || !same(approver, req.person._id)) return res.status(403).json({ error: "Only the assigned approver for this stage may decide" });
  if (r.status !== "Pending" || req.body.stage !== r.stage) return res.status(409).json({ error: "This approval stage has already changed. Refresh." });
  r.decisions.push({ actor: req.person._id, stage: r.stage, decision: req.body.status, at: new Date() });
  if (req.body.status === "Declined") { r.status = "Declined"; r.stage = "Complete"; }
  else if (r.stage === "Direct manager") r.stage = "General manager";
  else {
    if (r.balanceKey) {
      if (a[r.balanceKey] < r.days) throw new Error("Insufficient balance for final approval");
      a[r.balanceKey] -= r.days;
    }
    r.status = "Approved"; r.stage = "Complete";
  }
  await a.save();
  res.json(r);
}));
router.get("/configuration", wrap(async (req, res) => {
  if (!admin(req.person)) return res.sendStatus(403);
  const settings = await Settings.findOne({ key: "company" });
  res.json({ generalManager: settings?.generalManager || "", employees: await Employee.find({ employmentStatus: { $ne: "Inactive" } }).select("name department manager").sort({ name: 1 }) });
}));
router.put("/configuration/direct-manager", wrap(async (req, res) => {
  if (!admin(req.person)) return res.sendStatus(403);
  const employee = await Employee.findById(req.body.employee);
  if (!employee || employee.employmentStatus === "Inactive") throw new Error("Select an active employee");
  const manager = req.body.manager ? await Employee.findById(req.body.manager) : null;
  if (req.body.manager && (!manager || manager.employmentStatus === "Inactive")) throw new Error("Select an active direct manager");
  if (manager && same(employee._id, manager._id)) throw new Error("An employee cannot be their own direct manager");
  const settings = await Settings.findOne({ key: "company" });
  if (manager && same(manager._id, settings?.generalManager)) throw new Error("Direct manager must be different from the general manager");
  employee.manager = manager?._id || null;
  await employee.save();
  res.json({ saved: true, employee: employee._id, manager: employee.manager });
}));
router.get("/balances", wrap(async (req, res) => {
  if(!admin(req.person)) return res.sendStatus(403);
  const people=await Employee.find().sort({name:1});
  const values=await Account.find();
  const byId=new Map(values.map(a=>[String(a.employee),a]));
  res.json(people.map(p=>({employee:p._id,name:p.name,annual:byId.get(String(p._id))?.annual??p.leaveBalance.annual,sick:byId.get(String(p._id))?.sick??p.leaveBalance.sick})));
}));
router.put("/balances/all", wrap(async (req, res) => {
  if (!admin(req.person)) return res.sendStatus(403);
  const annual = Number(req.body.annual);
  const sick = Number(req.body.sick);
  if (!Number.isFinite(annual) || annual < 0 || !Number.isFinite(sick) || sick < 0) {
    return res.status(400).json({ error: "Annual and sick balances must be non-negative numbers" });
  }
  const people = await Employee.find().select("_id");
  if (people.length) {
    await Account.bulkWrite(people.map(person => ({
      updateOne: {
        filter: { employee: person._id },
        update: { $set: { annual, sick } },
        upsert: true
      }
    })));
    await Employee.updateMany(
      { _id: { $in: people.map(person => person._id) } },
      { $set: { "leaveBalance.annual": annual, "leaveBalance.sick": sick } }
    );
  }
  res.json({ updated: people.length, annual, sick });
}));
router.put("/configuration", wrap(async (req, res) => {
  if (!admin(req.person)) return res.sendStatus(403);
  const gm = await Employee.findById(req.body.generalManager);
  if (!gm || gm.employmentStatus === "Inactive") throw new Error("Select an active general manager");
  await Settings.findOneAndUpdate({ key: "company" }, { $set: { generalManager: gm._id, "leavePolicy.annualDefault": 24, "leavePolicy.sickDefault": 6 } }, { upsert: true, runValidators: true });
  res.json({ saved: true });
}));
module.exports = router;
