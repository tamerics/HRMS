require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Employee = require("./models/Employee");

async function createAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Set ADMIN_PASSWORD to at least 12 characters for this command");
  }

  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await Employee.findOne({ email });
  if (existing) {
    existing.accessLevel = "admin";
    existing.isManager = true;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Promoted existing account to administrator: ${email}`);
  } else {
    await Employee.create({
      name: process.env.ADMIN_NAME || "HRMS Administrator",
      email,
      passwordHash,
      role: "System Administrator",
      department: "People",
      isManager: true,
      accessLevel: "admin",
    });
    console.log(`Created administrator: ${email}`);
  }
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error("Create admin failed:", err.message);
  process.exit(1);
});
