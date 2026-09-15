// Populates the database with the same sample data the frontend demo uses.
// Run with: npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");

const Employee = require("./models/Employee");
const Attendance = require("./models/Attendance");
const Leave = require("./models/Leave");
const Payslip = require("./models/Payslip");
const Goal = require("./models/Goal");
const OnboardingStep = require("./models/OnboardingStep");
const Benefit = require("./models/Benefit");
const Opening = require("./models/Opening");

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    Employee.deleteMany({}),
    Attendance.deleteMany({}),
    Leave.deleteMany({}),
    Payslip.deleteMany({}),
    Goal.deleteMany({}),
    OnboardingStep.deleteMany({}),
    Benefit.deleteMany({}),
    Opening.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("Creating employees...");
  const sara = await Employee.create({
    name: "Sara Reyes",
    email: "sara@example.com",
    passwordHash,
    role: "Product Designer",
    department: "Design",
    leaveBalance: { annual: 14, sick: 6, wfh: 3 },
  });

  await Employee.create({
    name: "HRMS Administrator",
    email: "admin@example.com",
    passwordHash,
    role: "System Administrator",
    department: "People",
    isManager: true,
    accessLevel: "admin",
  });

  await Employee.create([
    { name: "Marcus Chen", email: "marcus@example.com", passwordHash, role: "Engineering Manager", department: "Engineering", isManager: true },
    { name: "Priya Nair", email: "priya@example.com", passwordHash, role: "HR Business Partner", department: "People", isManager: true },
    { name: "Diego Alvarez", email: "diego@example.com", passwordHash, role: "Sales Lead", department: "Sales" },
    { name: "Yuki Tanaka", email: "yuki@example.com", passwordHash, role: "Product Manager", department: "Product" },
    { name: "Amara Obi", email: "amara@example.com", passwordHash, role: "Recruiter", department: "People" },
  ]);

  console.log("Creating attendance history...");
  await Attendance.create([
    { employee: sara._id, date: "2026-08-11", clockIn: new Date("2026-08-11T09:02:00"), clockOut: new Date("2026-08-11T18:10:00"), status: "On time" },
    { employee: sara._id, date: "2026-08-12", clockIn: new Date("2026-08-12T09:14:00"), clockOut: new Date("2026-08-12T18:02:00"), status: "Late" },
    { employee: sara._id, date: "2026-08-13", clockIn: new Date("2026-08-13T08:58:00"), clockOut: new Date("2026-08-13T17:59:00"), status: "On time" },
    { employee: sara._id, date: "2026-08-14", clockIn: new Date("2026-08-14T09:00:00"), clockOut: new Date("2026-08-14T18:20:00"), status: "On time" },
  ]);

  console.log("Creating leave requests...");
  await Leave.create([
    { employee: sara._id, type: "Annual", startDate: "2026-08-15", endDate: "2026-08-15", status: "Approved" },
    { employee: sara._id, type: "Sick", startDate: "2026-07-28", endDate: "2026-07-29", status: "Approved" },
    { employee: sara._id, type: "WFH", startDate: "2026-08-21", endDate: "2026-08-21", status: "Pending" },
  ]);

  console.log("Creating payslips...");
  await Payslip.create([
    { employee: sara._id, month: "July 2026", gross: 6200, deductions: 1140, net: 5060 },
    { employee: sara._id, month: "June 2026", gross: 6200, deductions: 1140, net: 5060 },
    { employee: sara._id, month: "May 2026", gross: 6000, deductions: 1080, net: 4920 },
  ]);

  console.log("Creating goals...");
  await Goal.create([
    { employee: sara._id, title: "Ship redesigned onboarding flow", progress: 80 },
    { employee: sara._id, title: "Mentor two junior designers", progress: 45 },
    { employee: sara._id, title: "Complete accessibility audit", progress: 20 },
  ]);

  console.log("Creating onboarding checklist...");
  await OnboardingStep.create([
    { employee: sara._id, label: "Sign offer letter", done: true, order: 1 },
    { employee: sara._id, label: "Complete tax & bank forms", done: true, order: 2 },
    { employee: sara._id, label: "Set up laptop & accounts", done: true, order: 3 },
    { employee: sara._id, label: "Meet your team", done: false, order: 4 },
    { employee: sara._id, label: "Benefits enrollment", done: false, order: 5 },
  ]);

  console.log("Creating benefits...");
  await Benefit.create([
    { employee: sara._id, name: "Health Insurance", detail: "Family plan · Active" },
    { employee: sara._id, name: "Retirement Plan", detail: "6% employer match" },
    { employee: sara._id, name: "Wellness Stipend", detail: "$40 / month remaining" },
  ]);

  console.log("Creating job openings...");
  await Opening.create([
    { title: "Senior Product Designer", department: "Design", applicants: 12 },
    { title: "Backend Engineer", department: "Engineering", applicants: 27 },
    { title: "People Ops Associate", department: "People", applicants: 8 },
  ]);

  console.log("\nDone. Log in with:");
  console.log("  email: sara@example.com");
  console.log("  password: password123");
  console.log("  admin: admin@example.com / password123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
