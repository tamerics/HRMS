const ZKLib = require("node-zklib");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const FingerprintPunch = require("../models/FingerprintPunch");
const FingerprintSync = require("../models/FingerprintSync");

const config = () => ({
  ip: process.env.FINGERPRINT_IP || "172.16.16.33",
  port: Number(process.env.FINGERPRINT_PORT || 4370),
  timeout: Number(process.env.FINGERPRINT_TIMEOUT || 10000),
  commKey: Number(process.env.FINGERPRINT_COMM_KEY || 0),
});
const localDateKey = (value) => {
  const date = new Date(value); const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const createDevice = () => { const value = config(); if (value.commKey !== 0) throw new Error("This connector supports Comm Key 0 only"); return { value, device: new ZKLib(value.ip, value.port, value.timeout, 4000) }; };

async function withDevice(work) {
  const { value, device } = createDevice();
  try { await device.createSocket(); return await work(device, value); }
  finally { try { await device.disconnect(); } catch {} }
}

async function testConnection() {
  return withDevice(async (device, value) => {
    const [info, users] = await Promise.all([device.getInfo(), device.getUsers()]);
    return { connected: true, ip: value.ip, port: value.port, info, users: (users.data || []).map((user) => ({ uid: user.uid, deviceUserId: String(user.userId), name: user.name })) };
  });
}

async function syncAttendance(triggeredBy, requestedDays = process.env.FINGERPRINT_SYNC_DAYS || 90) {
  const started = config();
  const days = Math.min(3650, Math.max(1, Number(requestedDays) || 90));
  const cutoff = new Date(Date.now() - days * 86400000);
  try {
    const result = await withDevice(async (device, value) => {
      const response = await device.getAttendances(); const logs = response.data || [];
      const employees = await Employee.find({ deviceUserId: { $ne: "" } });
      const employeeByDeviceId = new Map(employees.map((employee) => [String(employee.deviceUserId), employee]));
      const operations = []; const affected = new Map(); let unmatched = 0; let logsEligible = 0;
      for (const log of logs) {
        const deviceUserId = String(log.deviceUserId); const employee = employeeByDeviceId.get(deviceUserId); const punchedAt = new Date(log.recordTime);
        if (Number.isNaN(punchedAt.getTime()) || punchedAt < cutoff) continue;
        logsEligible += 1;
        if (!employee) { unmatched += 1; continue; }
        const date = localDateKey(punchedAt); const key = `${employee._id}:${date}`;
        if (!affected.has(key)) affected.set(key, { employee, date, punches: [] });
        affected.get(key).punches.push(punchedAt);
        operations.push({ updateOne: { filter: { deviceIp: value.ip, deviceUserId, punchedAt }, update: { $setOnInsert: { deviceIp: value.ip, deviceUserId, employee: employee._id, punchedAt, date } }, upsert: true } });
      }
      let punchesImported = 0;
      if (operations.length) { const write = await FingerprintPunch.bulkWrite(operations, { ordered: false }); punchesImported = write.upsertedCount || 0; }
      const attendanceOperations = [];
      for (const { employee, date, punches } of affected.values()) {
        punches.sort((a, b) => a - b);
        const first = punches[0]; const last = punches[punches.length - 1];
        const late = first.getHours() > 9 || (first.getHours() === 9 && first.getMinutes() > 10);
        attendanceOperations.push({ updateOne: { filter: { employee: employee._id, date }, update: { $set: { clockIn: first, clockOut: punches.length > 1 ? last : null, status: late ? "Late" : "On time" } }, upsert: true } });
      }
      if (attendanceOperations.length) await Attendance.bulkWrite(attendanceOperations, { ordered: false });
      return { connected: true, deviceIp: value.ip, days, logsRead: logs.length, logsEligible, punchesImported, unmatched, attendanceDaysUpdated: affected.size };
    });
    await FingerprintSync.create({ deviceIp: started.ip, status: "Success", logsRead: result.logsRead, punchesImported: result.punchesImported, unmatched: result.unmatched, triggeredBy });
    return result;
  } catch (error) {
    await FingerprintSync.create({ deviceIp: started.ip, status: "Failed", message: error.message, triggeredBy });
    throw error;
  }
}

module.exports = { testConnection, syncAttendance };
