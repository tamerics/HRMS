const TYPES = ["Sick", "Personal", "Vacation", "Emergency", "Funeral"];
function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Use YYYY-MM-DD dates");
  const parsed = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return parsed;
}
function details(body) {
  const start = date(body.startDate), end = date(body.endDate || body.startDate);
  if (end < start) throw new Error("End date cannot precede start date");
  if (body.kind === "Excuse") {
    if (+start !== +end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime || "")) throw new Error("An excuse requires one date and a start time");
    const [hours, minutes] = body.startTime.split(":").map(Number);
    if (hours * 60 + minutes + 120 > 1440) throw new Error("The two-hour excuse must end within the same day");
    return { kind: "Excuse", type: "Excuse", duration: "Time", startDate: body.startDate, endDate: body.startDate, startTime: body.startTime, hours: 2, days: 0, balanceKey: null, month: body.startDate.slice(0, 7), attachmentName: String(body.attachmentName || "").slice(0, 255) };
  }
  if (!TYPES.includes(body.type)) throw new Error("Select Sick, Personal, Vacation, Emergency, or Funeral");
  const duration = ["Full Day", "Half Day", "Time"].includes(body.duration) ? body.duration : "Full Day";
  let days = Math.round((end - start) / 86400000) + 1;
  let hours = 0;
  if (duration === "Half Day") {
    if (+start !== +end) throw new Error("Half-day leave must use one date");
    days = 0.5;
  }
  if (duration === "Time") {
    if (+start !== +end || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.startTime || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.endTime || "")) throw new Error("Timed leave requires one date and valid start/end times");
    const minutes = Number(body.endTime.slice(0, 2)) * 60 + Number(body.endTime.slice(3)) - Number(body.startTime.slice(0, 2)) * 60 - Number(body.startTime.slice(3));
    if (minutes < 1 || minutes > 480) throw new Error("Timed leave must be between 1 minute and 8 hours");
    hours = minutes / 60; days = hours / 8;
  }
  return { kind: "Leave", type: body.type, duration, startDate: body.startDate, endDate: body.endDate || body.startDate, startTime: body.startTime || "", endTime: body.endTime || "", hours, days, attachmentName: String(body.attachmentName || "").slice(0, 255), balanceKey: body.type === "Funeral" ? null : body.type === "Sick" ? "sick" : "annual" };
}
module.exports = { TYPES, details };
