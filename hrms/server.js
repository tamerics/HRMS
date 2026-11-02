require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");
const attendanceRoutes = require("./routes/attendance");
const leaveRoutes = require("./routes/leave");
const payslipRoutes = require("./routes/payslips");
const goalRoutes = require("./routes/goals");
const onboardingRoutes = require("./routes/onboarding");
const benefitRoutes = require("./routes/benefits");
const openingRoutes = require("./routes/openings");
const adminRoutes = require("./routes/admin");
const adminSuiteRoutes = require("./routes/admin-suite");
const mobileRoutes = require("./routes/mobile");

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "3mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/requests", require("./routes/requests"));
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/benefits", benefitRoutes);
app.use("/api/openings", openingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminSuiteRoutes);
app.use("/api/mobile", mobileRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`HRMS API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
