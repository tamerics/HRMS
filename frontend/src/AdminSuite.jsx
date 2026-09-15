import { useEffect, useMemo, useState } from "react";
import Requests, { ApprovalSettings } from "./Requests.jsx";
import {
  LayoutDashboard, Fingerprint, CalendarDays, Banknote, Target,
  ClipboardCheck, HeartPulse, BriefcaseBusiness, SlidersHorizontal,
  ChartNoAxesCombined, RefreshCw, ArrowUpRight, Users, Clock3,
  CheckCircle2, AlertTriangle, Sparkles,
} from "lucide-react";

const sectionMeta = {
  "Core HR": { icon: LayoutDashboard, label: "People overview" },
  Attendance: { icon: Fingerprint, label: "Time & attendance" },
  Leave: { icon: CalendarDays, label: "Leave & excuses" },
  Payroll: { icon: Banknote, label: "Pay cycles" },
  Performance: { icon: Target, label: "Goals & reviews" },
  Onboarding: { icon: ClipboardCheck, label: "New hires" },
  Benefits: { icon: HeartPulse, label: "Plans & enrollment" },
  Recruitment: { icon: BriefcaseBusiness, label: "Hiring pipeline" },
  Settings: { icon: SlidersHorizontal, label: "Company setup" },
  Analytics: { icon: ChartNoAxesCombined, label: "Reports & trends" },
};
const sections = Object.keys(sectionMeta);
const sectionDescriptions = {
  "Core HR": "Manage employee records, access, reporting lines, and bulk onboarding.",
  Attendance: "Review time records, correct punches, and identify attendance risks.",
  Leave: "Approve requests, adjust balances, and review the company leave calendar.",
  Payroll: "Generate pay records, apply adjustments, and export accounting reports.",
  Performance: "Assign goals and manage organisation-wide review cycles.",
  Onboarding: "Build role-based checklists and monitor new-hire completion.",
  Benefits: "Maintain benefit plans and employee enrollments.",
  Recruitment: "Manage openings and move candidates through the hiring pipeline.",
  Settings: "Configure departments, holidays, leave defaults, and pay cycles.",
  Analytics: "Monitor headcount, attendance, leave, turnover, and hiring trends.",
};
const csv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const publicEmail = (email) => String(email || "").endsWith("@no-email.local") ? "" : String(email || "");
const parseCsv = (text) => {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += character;
  }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
};

export default function AdminSuite({ api, onExit }) {
  const [section, setSection] = useState("Core HR");
  const [data, setData] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", department: "", employee: "" });
  const [employeeImport, setEmployeeImport] = useState({ busy: false, processed: 0, total: 0, created: 0, skipped: [], error: "" });

  const load = async () => {
    setBusy(true); setError("");
    try {
      const loaders = {
        "Core HR": [["stats", "/admin/dashboard"], ["employees", "/admin/employees"]],
        Attendance: [["attendance", `/admin/attendance?from=${filters.from}&to=${filters.to}&department=${encodeURIComponent(filters.department)}&employee=${encodeURIComponent(filters.employee)}`], ["flags", `/admin/attendance/flags?from=${filters.from}&to=${filters.to}&department=${encodeURIComponent(filters.department)}&employee=${encodeURIComponent(filters.employee)}`], ["employees", "/admin/employees"], ["fingerprintHistory", "/admin/fingerprint/history"]],
        Leave: [["leave", "/admin/leave"], ["calendar", "/admin/leave/calendar"], ["employees", "/admin/employees"]],
        Payroll: [["payroll", "/admin/payroll"], ["employees", "/admin/employees"]],
        Performance: [["goals", "/admin/goals"], ["cycles", "/admin/review-cycles"], ["employees", "/admin/employees"]],
        Onboarding: [["templates", "/admin/onboarding-templates"], ["onboarding", "/admin/onboarding"]],
        Benefits: [["plans", "/admin/benefit-plans"], ["enrollments", "/admin/benefit-enrollments"], ["employees", "/admin/employees"]],
        Recruitment: [["openings", "/admin/openings"], ["candidates", "/admin/candidates"]],
        Settings: [["settings", "/admin/settings"]],
        Analytics: [["analytics", "/admin/analytics"]],
      };
      const entries = await Promise.all(loaders[section].map(async ([key, url]) => [key, await api(url)]));
      setData(Object.fromEntries(entries));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, [section]);

  const mutate = async (url, method, body) => {
    setError("");
    try { await api(url, { method, body }); await load(); return true; }
    catch (err) { setError(err.message); return false; }
  };
  const submit = (handler) => async (event) => { event.preventDefault(); await handler(Object.fromEntries(new FormData(event.currentTarget))); event.currentTarget.reset(); };
  const employees = data.employees || [];
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department).filter(Boolean))], [employees]);

  const ActiveIcon = sectionMeta[section].icon;
  return <div className="screen admin-suite">
    <div className="topbar admin-command-bar"><div className="admin-brand"><div className="admin-brand-mark">HR</div><div><div className="admin-brand-title">HRMS Workspace</div><small>People operations control center</small></div></div><div className="admin-command-actions"><span className="admin-live"><i/>Live</span><button className="admin-small-btn" onClick={onExit}>Employee app <ArrowUpRight size={13}/></button></div></div>
    <nav className="admin-tabs" aria-label="Administration modules"><div className="admin-nav-label">Workspace</div>{sections.map((item) => { const Icon=sectionMeta[item].icon; return <button className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}><Icon size={17}/><span><b>{item}</b><small>{sectionMeta[item].label}</small></span></button>; })}</nav>
    <div className="content-pad">
      <div className="admin-page-heading"><div><div className="admin-page-eyebrow"><ActiveIcon size={13}/> HR ADMINISTRATION</div><h1>{section}</h1><p>{sectionDescriptions[section]}</p></div><button className="admin-refresh" disabled={busy} onClick={load}><RefreshCw size={15} className={busy?"spin":""}/><span>Refresh data</span></button></div>
      {error && <div className="error-note">{error}</div>}
      {busy && <div className="empty-note">Loading {section}…</div>}
      {!busy && section === "Core HR" && <Core data={data} mutate={mutate} api={api} load={load} employeeImport={employeeImport} setEmployeeImport={setEmployeeImport} onNavigate={setSection} />}
      {!busy && section === "Attendance" && <Attendance data={data} filters={filters} setFilters={setFilters} load={load} mutate={mutate} api={api} departments={departments} />}
      {!busy && section === "Leave" && <Requests api={api} />}
      {!busy && section === "Payroll" && <Payroll data={data} mutate={mutate} submit={submit} />}
      {!busy && section === "Performance" && <Performance data={data} mutate={mutate} submit={submit} />}
      {!busy && section === "Onboarding" && <Onboarding data={data} mutate={mutate} submit={submit} />}
      {!busy && section === "Benefits" && <Benefits data={data} mutate={mutate} submit={submit} />}
      {!busy && section === "Recruitment" && <Recruitment data={data} mutate={mutate} submit={submit} />}
      {!busy && section === "Settings" && <><ApprovalSettings api={api}/><Settings settings={data.settings} mutate={mutate} api={api} /></>}
      {!busy && section === "Analytics" && <Analytics value={data.analytics} />}
    </div>
    <style>{`
      .admin-suite { --admin-navy:#172033;--admin-pink:#d52e78;--admin-pink-soft:#fff0f6;--admin-violet:#6b4eff;padding-bottom:76px;background:#f5f7fb;color:var(--admin-navy); }
      .admin-command-bar{background:#fff!important;border-bottom:1px solid #e8eaf0}.admin-brand,.admin-command-actions{display:flex;align-items:center;gap:11px}.admin-brand-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--admin-violet),var(--admin-pink));display:grid;place-items:center;color:#fff;font-weight:800;box-shadow:0 8px 20px rgba(107,78,255,.2)}.admin-brand-title{font-size:14px;font-weight:800;letter-spacing:-.02em}.admin-brand small{display:block;color:#7b8190;font-size:10px;margin-top:1px}.admin-command-actions .admin-small-btn{display:flex;align-items:center;gap:5px}.admin-live{display:none;align-items:center;gap:6px;color:#247a55;font-size:11px;font-weight:700}.admin-live i{width:7px;height:7px;background:#35b879;border-radius:50%;box-shadow:0 0 0 4px #e4f7ee}
      .admin-tabs { display:flex;gap:7px;overflow:auto;padding:10px 14px;background:#fff;border-bottom:1px solid #e8eaf0;scrollbar-width:none;position:sticky;top:66px;z-index:4}.admin-tabs::-webkit-scrollbar{display:none}.admin-nav-label{display:none}
      .admin-tabs button { display:flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid #e2e5eb;background:#fff;border-radius:999px;padding:9px 12px;font-size:11px;font-weight:700;color:#697083;transition:.18s ease; }
      .admin-tabs button span{display:block}.admin-tabs button small{display:none}.admin-tabs button.active { background:var(--admin-pink);border-color:var(--admin-pink);color:#fff;box-shadow:0 7px 18px rgba(213,46,120,.22) } .admin-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
      .admin-page-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:14px 0 22px}.admin-page-heading h1{font-family:'Inter',sans-serif;font-size:32px;letter-spacing:-.04em;margin:5px 0 5px}.admin-page-heading p{margin:0;color:#697083;font-size:13px;max-width:680px;line-height:1.55}.admin-page-eyebrow{display:flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;color:var(--admin-pink)}.admin-refresh{display:flex;align-items:center;gap:7px;border:1px solid #e1e4ea;background:#fff;border-radius:11px;padding:10px 13px;color:var(--admin-navy);font-size:11px;font-weight:700}.admin-refresh:disabled{opacity:.55}.spin{animation:admin-spin .8s linear infinite}@keyframes admin-spin{to{transform:rotate(360deg)}}
      .admin-card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:16px; margin-bottom:12px; box-shadow:0 4px 16px rgba(27,58,52,.035); } .admin-card h3 { margin:0 0 14px; font-size:16px; }
      .admin-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; } .admin-form .wide { grid-column:1/-1; } .admin-form button { min-height:38px; }
      .admin-field{display:flex;flex-direction:column;gap:6px;min-width:0}.admin-field-label{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft)}.admin-field.wide{grid-column:1/-1}.admin-field .text-input{min-height:42px;border:1px solid transparent}.admin-field .text-input:focus{border-color:var(--accent);background:#fff;box-shadow:0 0 0 3px var(--accent-soft)}
      .admin-table { width:100%; border-collapse:collapse; font-size:11px; } .admin-table th,.admin-table td { text-align:left; padding:9px 6px; border-bottom:1px solid var(--line); vertical-align:top; }
      .admin-table-wrap{width:100%;overflow-x:auto}.admin-card-help{margin:-5px 0 14px;color:var(--ink-soft);font-size:12px}.leave-balance-table{min-width:760px}.leave-balance-field{display:flex;flex-direction:column;gap:5px;min-width:110px}.leave-balance-field span{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft)}.leave-balance-field input{width:100%;max-width:130px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:8px 10px;color:var(--ink);font:600 12px 'Inter',sans-serif}.leave-balance-field input:disabled{background:var(--surface-alt);color:var(--ink-soft);border-color:transparent}.leave-balance-field input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
      .fingerprint-device-row{display:flex;align-items:center;justify-content:space-between;gap:16px}.fingerprint-device-title{display:flex;align-items:center;gap:8px;font-weight:700}.fingerprint-dot{width:9px;height:9px;border-radius:50%;background:var(--moss);box-shadow:0 0 0 4px var(--moss-soft)}.fingerprint-progress{margin-top:14px}.fingerprint-progress-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px;font-size:12px;font-weight:700}.fingerprint-progress-track{height:10px;overflow:hidden;border-radius:999px;background:#dfe5df}.fingerprint-progress-fill{height:100%;border-radius:inherit;background:var(--orange);transition:width .45s ease}.fingerprint-result{margin-top:12px;padding:10px 12px;border-radius:9px;font-size:12px;font-weight:600}.fingerprint-result.success{background:var(--moss-soft);color:var(--moss)}.fingerprint-result.error{background:var(--brick-soft);color:var(--brick)}.fingerprint-history{margin-top:10px;color:var(--ink-soft);font-size:11px}.attendance-chart-legend{display:flex;gap:18px;margin:0 0 16px;font-size:11px;color:var(--ink-soft)}.attendance-chart-legend span{display:flex;align-items:center;gap:6px}.attendance-chart-key{width:10px;height:10px;border-radius:3px}.attendance-chart-key.late,.attendance-bar.late{background:var(--orange)}.attendance-chart-key.absent,.attendance-bar.absent{background:var(--brick)}.attendance-chart{display:flex;flex-direction:column;gap:13px}.attendance-chart-row{display:grid;grid-template-columns:minmax(110px,180px) 1fr;gap:14px;align-items:center}.attendance-chart-name{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.attendance-chart-bars{display:grid;gap:6px}.attendance-bar-track{height:20px;border-radius:6px;background:var(--surface-alt);overflow:hidden;position:relative}.attendance-bar{height:100%;min-width:2px;border-radius:6px;display:flex;align-items:center;justify-content:flex-end;padding-right:7px;color:#fff;font-size:10px;font-weight:800;transition:width .4s ease}.attendance-bar.zero{min-width:0;padding:0}.attendance-chart-empty{text-align:center;padding:28px;color:var(--ink-soft)}
      .admin-table th { color:var(--ink-soft); text-transform:uppercase; font-size:9px; letter-spacing:.06em; } .admin-row-actions { display:flex; gap:5px; flex-wrap:wrap; }
      .cleanup-choice{flex-direction:row;align-items:center;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-alt)}.cleanup-choice input{width:18px;height:18px;accent-color:var(--accent)}.cleanup-choice span{display:flex;flex-direction:column;gap:3px}.cleanup-choice small{color:var(--ink-soft)}.admin-cleanup-btn{background:var(--brick)!important}.admin-cleanup-btn:disabled{opacity:.45;cursor:not-allowed}
      .admin-small-btn { border:1px solid var(--line); background:#fff; border-radius:7px; padding:5px 7px; font-size:10px; font-weight:700; } .admin-danger { color:var(--brick); border-color:var(--brick); }
      .admin-metric-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.admin-metric-box{position:relative;overflow:hidden;background:#fff;border:1px solid #e7e9ef;border-radius:16px;padding:16px;box-shadow:0 9px 28px rgba(23,32,51,.045)}
      .admin-metric-box b{display:block;font-family:'Inter',sans-serif;font-size:28px;letter-spacing:-.04em}.admin-metric-box span{font-size:10px;color:#747b8b}.admin-metric-box:after{content:'';position:absolute;width:42px;height:42px;border-radius:50%;right:-17px;top:-17px;background:var(--admin-pink-soft)}
      .admin-launchpad{background:linear-gradient(135deg,#172033 0%,#26294a 62%,#5d3565 100%);color:#fff;border:0!important;padding:22px!important}.admin-launchpad-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:17px}.admin-launchpad-head h3{margin:3px 0 5px!important;font-size:21px!important}.admin-launchpad-head p{margin:0;color:#c6cada;font-size:12px}.admin-launchpad-badge{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:700;white-space:nowrap}.admin-module-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.admin-module{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.08);color:#fff;border-radius:13px;padding:12px;min-width:0}.admin-module:hover{background:rgba(255,255,255,.14)}.admin-module-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,var(--admin-pink),#f15b9c);flex:0 0 auto}.admin-module b,.admin-module small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-module b{font-size:11px}.admin-module small{font-size:9px;color:#c5cada;margin-top:2px}
      @media(max-width:650px){.admin-grid,.admin-form{grid-template-columns:1fr}.admin-form .wide{grid-column:auto}.admin-metric-grid{grid-template-columns:repeat(2,1fr)}.admin-table{font-size:10px}.admin-page-heading{align-items:flex-start}.admin-page-heading h1{font-size:28px}.admin-refresh span{display:none}.admin-refresh{padding:9px}.admin-brand small,.admin-live{display:none}.admin-module-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-launchpad{padding:17px!important}.admin-launchpad-badge{display:none}}
      @media(min-width:900px){
        .admin-suite{display:grid;grid-template-columns:248px minmax(0,1fr);grid-template-rows:68px minmax(0,1fr);min-height:100vh;padding-bottom:0}
        .admin-suite>.topbar{grid-column:1/-1;grid-row:1;padding:0 28px;position:sticky;top:0;z-index:5;box-shadow:0 1px 0 var(--line)}
        .admin-live{display:flex}.admin-tabs{position:sticky;top:68px;height:calc(100vh - 68px);grid-column:1;grid-row:2;flex-direction:column;align-items:stretch;overflow:auto;padding:23px 14px;border-right:1px solid #e5e7ee;border-bottom:0;background:#fff;gap:5px}.admin-nav-label{display:block;padding:0 13px 10px;color:#979cab;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
        .admin-tabs button{text-align:left;border:0;background:transparent;border-radius:11px;padding:10px 12px;font-size:12px;color:#626a7b}.admin-tabs button span{min-width:0}.admin-tabs button small{display:block;color:#9a9fad;font-size:9px;font-weight:500;margin-top:2px}.admin-tabs button.active{background:var(--admin-pink-soft);color:var(--admin-pink);box-shadow:none}.admin-tabs button.active small{color:#b15b81}
        .admin-suite>.content-pad{grid-column:2;grid-row:2;width:100%;max-width:1440px;padding:28px 36px 54px;margin:0 auto;overflow:auto}
        .admin-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.admin-card{padding:18px;margin-bottom:16px}.admin-table{font-size:12px}.admin-table th,.admin-table td{padding:11px 8px}
      }
    `}</style>
  </div>;
}

function FormField({ name, label, placeholder, type = "text", required = false, children, defaultValue, wide = false }) {
  const title = label || placeholder || name.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
  return <label className={`admin-field ${wide ? "wide" : ""}`}><span className="admin-field-label">{title}{required ? " *" : ""}</span>{children ? <select className="text-input" name={name} required={required} defaultValue={defaultValue || ""}>{children}</select> : <input className="text-input" name={name} type={type} placeholder={placeholder ? `Enter ${placeholder.toLowerCase()}` : ""} required={required} defaultValue={defaultValue} />}</label>;
}
function Card({ title, children }) { return <div className="admin-card"><h3>{title}</h3>{children}</div>; }
function EmployeeOptions({ employees }) { return <><option value="">Select employee</option>{employees.map((e) => <option value={e._id} key={e._id}>{e.name} — {e.department}</option>)}</>; }

function Core({ data, mutate, api, load, employeeImport, setEmployeeImport, onNavigate }) {
  const employees = data.employees || []; const stats = data.stats || {};
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const add = async (event) => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.isManager = body.accessLevel === "manager"; if (await mutate("/admin/employees", "POST", body)) event.currentTarget.reset(); };
  const saveEdit = async (event) => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget)); body.isManager = body.accessLevel === "manager"; if (await mutate(`/admin/employees/${editing._id}`, "PATCH", body)) setEditing(null); };
  const importCsv = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      const headers = (parsed.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim());
      const rows = parsed.map((values, index) => ({ ...Object.fromEntries(values.map((value, column) => [headers[column], value])), _rowNumber: index + 2 }));
      if (!rows.length) throw new Error("The CSV file has no employee rows");
      if (rows.length > 500) throw new Error("A maximum of 500 employee rows can be imported at once");
      const state = { busy: true, processed: 0, total: rows.length, created: 0, skipped: [], error: "" }; setEmployeeImport(state);
      for (let start = 0; start < rows.length; start += 20) {
        const batch = rows.slice(start, start + 20);
        const result = await api("/admin/employees/import", { method: "POST", body: { rows: batch } });
        state.processed += result.processed || batch.length; state.created += result.created; state.skipped.push(...result.skipped);
        setEmployeeImport({ ...state, skipped: [...state.skipped] });
      }
      setEmployeeImport({ ...state, busy: false, skipped: [...state.skipped] }); await load();
    } catch (error) { setEmployeeImport((current) => ({ ...current, busy: false, error: error.message })); }
    event.target.value = "";
  };
  const importPercent = employeeImport.total ? Math.round(employeeImport.processed / employeeImport.total * 100) : 0;
  const downloadSkipped = () => { const rows = ["row,name,email,reason", ...employeeImport.skipped.map((item) => [item.row,item.name,item.email,item.reason].map(csv).join(","))]; const link=document.createElement("a"); link.href=URL.createObjectURL(new Blob([rows.join("\r\n")],{type:"text/csv;charset=utf-8"})); link.download="employee-import-skipped.csv"; link.click(); URL.revokeObjectURL(link.href); };
  const toggleSelected = (id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleAll = () => setSelected(selected.length === employees.length ? [] : employees.map((employee) => employee._id));
  const deleteSelected = async () => { if (!selected.length || !confirm(`Delete ${selected.length} selected employees and their related HR records? This cannot be undone.`)) return; if (await mutate("/admin/employees/bulk-delete", "DELETE", { ids: selected })) { setSelected([]); setEditing(null); } };
  const exportEmployees = () => {
    const headings = ["name", "email", "role", "department", "manager", "employmentStatus", "hireDate", "accessLevel", "deviceUserId", "annualLeave", "sickLeave", "wfhLeave"];
    const rows = employees.map((employee) => [employee.name, publicEmail(employee.email), employee.role, employee.department, employee.manager?.name || "", employee.employmentStatus, employee.hireDate, employee.accessLevel, employee.deviceUserId, employee.leaveBalance?.annual, employee.leaveBalance?.sick, employee.leaveBalance?.wfh].map(csv).join(","));
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([[headings.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8" })); link.download = `employees-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const overviewModules = [
    ["Attendance", "Live time records", Clock3],
    ["Leave", "Approvals & calendar", CalendarDays],
    ["Payroll", "Cycles & payslips", Banknote],
    ["Analytics", "Workforce trends", ChartNoAxesCombined],
  ];
  return <><div className="admin-launchpad admin-card"><div className="admin-launchpad-head"><div><small>UNIFIED HR WORKSPACE</small><h3>Everything your people team needs</h3><p>Move from daily attendance to approvals, payroll, and reports in one place.</p></div><span className="admin-launchpad-badge"><Sparkles size={13}/> Live operations</span></div><div className="admin-module-grid">{overviewModules.map(([name,description,Icon])=><button className="admin-module" key={name} onClick={()=>onNavigate(name)}><span className="admin-module-icon"><Icon size={17}/></span><span><b>{name}</b><small>{description}</small></span><ArrowUpRight size={14}/></button>)}</div></div><div className="admin-metric-grid">{[["Employees",stats.employees,Users],["Managers",stats.managers,CheckCircle2],["Present today",stats.presentToday,Clock3],["Pending leave",stats.pendingLeave,AlertTriangle]].map(([a,b,Icon])=><div className="admin-metric-box" key={a}><Icon size={17} color="var(--admin-pink)"/><b>{b||0}</b><span>{a}</span></div>)}</div>
    <Card title="Add employee"><form className="admin-form" onSubmit={add}><FormField name="name" placeholder="Full name" required/><FormField name="email" type="email" label="Email address (optional)" placeholder="Email address (optional)"/><FormField name="password" type="password" label="Temporary password" defaultValue="1234"/><FormField name="role" placeholder="Job role"/><FormField name="department" placeholder="Department"/><FormField name="hireDate" type="date"/><FormField name="deviceUserId" label="Fingerprint device user ID" placeholder="Device user ID"/><FormField name="manager"><EmployeeOptions employees={employees}/></FormField><FormField name="employmentStatus"><option>Active</option><option>Inactive</option><option>On leave</option></FormField><FormField name="accessLevel"><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr_admin">HR admin</option></FormField><button className="primary-btn">Add employee</button></form><div style={{marginTop:10}}><label className={`admin-small-btn ${employeeImport.busy?"disabled":""}`}>Bulk import CSV<input hidden type="file" accept=".csv" disabled={employeeImport.busy} onChange={importCsv}/></label> <small>Only name is required. Email is optional; missing passwords default to 1234. Minimum password length: 4.</small></div>{employeeImport.total>0&&<div className="fingerprint-progress"><div className="fingerprint-progress-head"><span>{employeeImport.busy?"Importing employees":`Import complete: ${employeeImport.created} created, ${employeeImport.skipped.length} skipped`}</span><span>{employeeImport.processed}/{employeeImport.total} · {importPercent}%</span></div><div className="fingerprint-progress-track"><div className="fingerprint-progress-fill" style={{width:`${importPercent}%`}}/></div></div>}{employeeImport.error&&<div className="fingerprint-result error">{employeeImport.error}</div>}{employeeImport.skipped.length>0&&<div className="import-skipped"><div className="admin-row-actions"><b>Skipped records and reasons</b><button className="admin-small-btn" onClick={downloadSkipped}>Download skipped CSV</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CSV row</th><th>Name</th><th>Email</th><th>Reason</th></tr></thead><tbody>{employeeImport.skipped.map((item,index)=><tr key={`${item.row}-${index}`}><td>{item.row}</td><td>{item.name||"—"}</td><td>{item.email||"—"}</td><td>{item.reason}</td></tr>)}</tbody></table></div></div>}</Card>
    {editing && <Card title={`Edit employee — ${editing.name}`}><form className="admin-form" onSubmit={saveEdit}><FormField name="name" label="Full name" required defaultValue={editing.name}/><FormField name="email" type="email" label="Email address (optional)" defaultValue={publicEmail(editing.email)}/><FormField name="role" label="Job role" defaultValue={editing.role}/><FormField name="department" label="Department" defaultValue={editing.department}/><FormField name="hireDate" label="Hire date" type="date" defaultValue={editing.hireDate?.slice(0,10)}/><FormField name="deviceUserId" label="Fingerprint device user ID" defaultValue={editing.deviceUserId}/><FormField name="manager" label="Manager" defaultValue={editing.manager?._id||editing.manager}><EmployeeOptions employees={employees.filter(employee=>employee._id!==editing._id)}/></FormField><FormField name="employmentStatus" label="Employment status" defaultValue={editing.employmentStatus||"Active"}><option>Active</option><option>Inactive</option><option>On leave</option></FormField><FormField name="accessLevel" label="System access" defaultValue={editing.accessLevel||"employee"}><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr_admin">HR admin</option></FormField><FormField name="password" type="password" label="New password (optional, minimum 4)" placeholder="Leave blank to keep current password"/><div className="admin-row-actions"><button className="primary-btn" type="submit">Save employee</button><button className="admin-small-btn" type="button" onClick={()=>setEditing(null)}>Cancel</button></div></form></Card>}
    <Card title="Employee directory"><div className="admin-row-actions directory-toolbar"><button className="admin-small-btn" onClick={exportEmployees} disabled={!employees.length}>Export employees CSV</button><button className="admin-small-btn admin-danger" onClick={deleteSelected} disabled={!selected.length}>Delete selected ({selected.length})</button><span><small>{selected.length} of {employees.length} selected</small></span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th><input type="checkbox" aria-label="Select all employees" checked={employees.length>0&&selected.length===employees.length} onChange={toggleAll}/></th><th>Name</th><th>Role / department</th><th>Fingerprint ID</th><th>Status</th><th>Access</th><th>Actions</th></tr></thead><tbody>{employees.map((p)=><tr key={p._id}><td><input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.includes(p._id)} onChange={()=>toggleSelected(p._id)}/></td><td>{p.name}<br/><small>{publicEmail(p.email)||"No email"}</small></td><td>{p.role}<br/><small>{p.department}</small></td><td>{p.deviceUserId||"—"}</td><td>{p.employmentStatus||"Active"}</td><td>{p.accessLevel}</td><td><div className="admin-row-actions"><button className="admin-small-btn" onClick={()=>setEditing(p)}>Edit</button><button className="admin-small-btn" onClick={()=>mutate(`/admin/employees/${p._id}`,"PATCH",{employmentStatus:p.employmentStatus==="Inactive"?"Active":"Inactive"})}>{p.employmentStatus==="Inactive"?"Activate":"Deactivate"}</button><button className="admin-small-btn admin-danger" onClick={()=>confirm(`Delete ${p.name} and all related HR records?`)&&mutate(`/admin/employees/${p._id}`,"DELETE")}>Delete</button></div></td></tr>)}</tbody></table></div></Card></>;
}

function Attendance({ data, filters, setFilters, load, mutate, api }) {
  const records = data.attendance || [];
  const attendanceFlags = data.flags || [];
  const maximumFlag = Math.max(1, ...attendanceFlags.flatMap((flag) => [flag.late || 0, flag.absent || 0]));
  const totalLate = attendanceFlags.reduce((total, flag) => total + (flag.late || 0), 0);
  const totalAbsent = attendanceFlags.reduce((total, flag) => total + (flag.absent || 0), 0);
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceResult, setDeviceResult] = useState(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStage, setSyncStage] = useState("");
  const downloadDeviceUsers = async () => {
    setDeviceBusy(true); setDeviceResult(null); setSyncStage(""); setSyncProgress(0);
    try {
      const result = await api("/admin/fingerprint/test", { method: "POST" });
      const rows = ["device_uid,device_user_id,name", ...(result.users || []).map((user) => [user.uid, user.deviceUserId, user.name].map(csv).join(","))];
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
      link.download = `fingerprint-device-users-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click(); URL.revokeObjectURL(link.href);
      setDeviceResult({ ...result, downloadedUsers: (result.users || []).length });
    } catch (error) { setDeviceResult({ error: error.message }); }
    finally { setDeviceBusy(false); }
  };
  const deviceAction = async (path) => {
    const syncing = path.endsWith("sync"); let progressTimer;
    setDeviceBusy(true); setDeviceResult(null);
    if (!syncing) { setSyncStage(""); setSyncProgress(0); }
    if (syncing) {
      setSyncProgress(4); setSyncStage("Connecting to fingerprint machine");
      progressTimer = window.setInterval(() => setSyncProgress((current) => {
        const next = Math.min(92, current + (current < 30 ? 7 : current < 70 ? 4 : 1));
        setSyncStage(next < 30 ? "Connecting to fingerprint machine" : next < 70 ? "Downloading attendance logs" : "Matching employees and updating attendance");
        return next;
      }), 700);
    }
    try {
      const result = await api(path, { method: "POST", body: syncing ? { days: 90 } : undefined });
      setDeviceResult(result);
      if (syncing) { setSyncProgress(100); setSyncStage("Synchronization completed"); await load(); }
    } catch (error) {
      setDeviceResult({ error: error.message });
      if (syncing) { setSyncProgress(0); setSyncStage("Synchronization failed"); }
    } finally { if (progressTimer) window.clearInterval(progressTimer); setDeviceBusy(false); }
  };
  const reportRows = records.map((record) => ({
    Employee: record.employee?.name || "",
    Department: record.employee?.department || "",
    Role: record.employee?.role || "",
    Date: record.date,
    "Clock in": record.clockIn ? new Date(record.clockIn).toLocaleString() : "",
    "Clock out": record.clockOut ? new Date(record.clockOut).toLocaleString() : "",
    "Clock-in latitude": record.clockInLocation?.latitude ?? "",
    "Clock-in longitude": record.clockInLocation?.longitude ?? "",
    "Clock-out latitude": record.clockOutLocation?.latitude ?? "",
    "Clock-out longitude": record.clockOutLocation?.longitude ?? "",
    Status: record.status,
  }));
  const filename = `attendance-${filters.from || "all"}-${filters.to || "all"}`;
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(reportRows);
    sheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 12 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };
  const exportPdf = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const document = new jsPDF({ orientation: "landscape" });
    document.setFontSize(16); document.text("Attendance report", 14, 15);
    document.setFontSize(9); document.text(`Generated ${new Date().toLocaleString()} · ${records.length} records`, 14, 21);
    autoTable(document, {
      startY: 26,
      head: [["Employee", "Department", "Role", "Date", "Clock in", "Clock out", "In lat", "In lng", "Out lat", "Out lng", "Status"]],
      body: reportRows.map((row) => Object.values(row)),
      styles: { fontSize: 8 }, headStyles: { fillColor: [27, 58, 52] },
    });
    document.save(`${filename}.pdf`);
  };
  return <>
    <Card title="ZKTeco K15 Pro fingerprint machine">
      <div className="fingerprint-device-row"><div><div className="fingerprint-device-title"><span className="fingerprint-dot"/>172.16.16.33:4370</div><div className="admin-card-help">Comm Key 0 · Logs remain on the device after synchronization.</div></div><div className="admin-row-actions"><button className="admin-small-btn" disabled={deviceBusy} onClick={()=>deviceAction("/admin/fingerprint/test")}>Test connection</button><button className="admin-small-btn" disabled={deviceBusy} onClick={downloadDeviceUsers}>Download device users</button><button className="primary-btn" disabled={deviceBusy} onClick={()=>deviceAction("/admin/fingerprint/sync")}>{deviceBusy&&syncStage?`Syncing ${syncProgress}%`:"Sync attendance"}</button></div></div>
      {(syncProgress > 0 || syncStage) && <div className="fingerprint-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={syncProgress}><div className="fingerprint-progress-head"><span>{syncStage}</span><span>{syncProgress}%</span></div><div className="fingerprint-progress-track"><div className="fingerprint-progress-fill" style={{width:`${syncProgress}%`}}/></div></div>}
      {deviceResult && <div className={`fingerprint-result ${deviceResult.error?"error":"success"}`}>{deviceResult.error ? deviceResult.error : deviceResult.downloadedUsers !== undefined ? `Downloaded ${deviceResult.downloadedUsers} device users to CSV.` : deviceResult.logsRead !== undefined ? `Read ${deviceResult.logsRead} device logs · ${deviceResult.logsEligible} within 90 days · imported ${deviceResult.punchesImported} new punches · updated ${deviceResult.attendanceDaysUpdated} attendance days · ${deviceResult.unmatched} unmatched` : `Connected · ${deviceResult.info?.userCounts||deviceResult.users?.length||0} device users · ${deviceResult.info?.logCounts||0} logs`}</div>}
      {(data.fingerprintHistory||[]).length>0 && <div className="fingerprint-history"><b>Latest sync:</b> {new Date(data.fingerprintHistory[0].createdAt).toLocaleString()} · {data.fingerprintHistory[0].status} · {data.fingerprintHistory[0].punchesImported} imported · {data.fingerprintHistory[0].unmatched} unmatched</div>}
    </Card>
    <Card title="Report filters"><div className="admin-form"><label className="admin-field"><span className="admin-field-label">From date</span><input className="text-input" type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label><label className="admin-field"><span className="admin-field-label">To date</span><input className="text-input" type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label><label className="admin-field"><span className="admin-field-label">Department</span><input className="text-input" placeholder="Enter department" value={filters.department} onChange={e=>setFilters({...filters,department:e.target.value})}/></label><label className="admin-field"><span className="admin-field-label">Employee</span><select className="text-input" value={filters.employee} onChange={e=>setFilters({...filters,employee:e.target.value})}><option value="">All employees</option>{(data.employees||[]).map(employee=><option key={employee._id} value={employee._id}>{employee.name} — {employee.department}</option>)}</select></label><button className="primary-btn" onClick={load}>Apply filters</button></div></Card>
    <Card title="Attendance records"><div className="admin-row-actions" style={{marginBottom:10}}><button className="admin-small-btn" disabled={!records.length} onClick={exportExcel}>Export Excel</button><button className="admin-small-btn" disabled={!records.length} onClick={exportPdf}>Export PDF</button><span><small>{records.length} filtered records</small></span></div><table className="admin-table"><thead><tr><th>Employee</th><th>Date</th><th>Clock in</th><th>Clock out</th><th>Clock-in location</th><th>Clock-out location</th><th>Status</th><th/></tr></thead><tbody>{records.map(r=><tr key={r._id}><td>{r.employee?.name}<br/><small>{r.employee?.department}</small></td><td>{r.date}</td><td>{r.clockIn?new Date(r.clockIn).toLocaleString():"—"}</td><td>{r.clockOut?new Date(r.clockOut).toLocaleString():"—"}</td><td>{r.clockInLocation?<a className="admin-small-btn" href={`https://maps.google.com/?q=${r.clockInLocation.latitude},${r.clockInLocation.longitude}`} target="_blank" rel="noreferrer">View map<br/>{Math.round(r.clockInLocation.accuracy||0)}m</a>:"—"}</td><td>{r.clockOutLocation?<a className="admin-small-btn" href={`https://maps.google.com/?q=${r.clockOutLocation.latitude},${r.clockOutLocation.longitude}`} target="_blank" rel="noreferrer">View map<br/>{Math.round(r.clockOutLocation.accuracy||0)}m</a>:"—"}</td><td>{r.status}</td><td><button className="admin-small-btn" onClick={()=>{const clockIn=prompt("Clock-in ISO date/time",r.clockIn||"");if(clockIn===null)return;const clockOut=prompt("Clock-out ISO date/time",r.clockOut||"");if(clockOut===null)return;mutate(`/admin/attendance/${r._id}`,"PATCH",{clockIn,clockOut});}}>Correct</button></td></tr>)}</tbody></table></Card>
    <Card title="Lateness and absence charts"><div className="admin-metric-grid"><div className="admin-metric-box"><b>{attendanceFlags.length}</b><span>Flagged employees</span></div><div className="admin-metric-box"><b>{totalLate}</b><span>Late arrivals</span></div><div className="admin-metric-box"><b>{totalAbsent}</b><span>Absent workdays</span></div><div className="admin-metric-box"><b>{totalLate+totalAbsent}</b><span>Total exceptions</span></div></div><div className="attendance-chart-legend"><span><i className="attendance-chart-key late"/>Late arrivals</span><span><i className="attendance-chart-key absent"/>Absent workdays</span></div>{attendanceFlags.length?<div className="attendance-chart">{attendanceFlags.map((flag)=><div className="attendance-chart-row" key={flag.employee?._id}><div className="attendance-chart-name" title={flag.employee?.name}>{flag.employee?.name||"Unknown employee"}</div><div className="attendance-chart-bars"><div className="attendance-bar-track" title={`${flag.late||0} late arrivals`}><div className={`attendance-bar late ${flag.late?"":"zero"}`} style={{width:`${(flag.late||0)/maximumFlag*100}%`}}>{flag.late||""}</div></div><div className="attendance-bar-track" title={`${flag.absent||0} absent workdays`}><div className={`attendance-bar absent ${flag.absent?"":"zero"}`} style={{width:`${(flag.absent||0)/maximumFlag*100}%`}}>{flag.absent||""}</div></div></div></div>)}</div>:<div className="attendance-chart-empty">No lateness or absence flags for this reporting period.</div>}</Card>
  </>;
}

function Leave({ data, mutate }) {
  const [editing, setEditing] = useState(null);
  const [balance, setBalance] = useState({ annual: 0, sick: 0, wfh: 0 });
  const [leaveEditing, setLeaveEditing] = useState(null);
  const [reportFilters, setReportFilters] = useState({ from: "", to: "", employee: "", department: "", status: "Approved" });
  const leaveDays = (request) => Math.max(1, Math.round((new Date(`${request.endDate}T00:00:00`) - new Date(`${request.startDate}T00:00:00`)) / 86400000) + 1);
  const reportRows = (data.leave || []).filter((request) => {
    const overlaps = (!reportFilters.from || request.endDate >= reportFilters.from) && (!reportFilters.to || request.startDate <= reportFilters.to);
    return overlaps && (!reportFilters.employee || request.employee?._id === reportFilters.employee) && (!reportFilters.department || request.employee?.department === reportFilters.department) && (!reportFilters.status || request.status === reportFilters.status);
  });
  const reportDays = reportRows.reduce((total, request) => total + leaveDays(request), 0);
  const reportTypes = reportRows.reduce((totals, request) => ({ ...totals, [request.type]: (totals[request.type] || 0) + leaveDays(request) }), {});
  const reportDepartments = [...new Set((data.employees || []).map((employee) => employee.department).filter(Boolean))].sort();
  const exportLeaveReport = () => {
    const rows = ["employee,email,department,leaveType,startDate,endDate,days,status,reason", ...reportRows.map((request) => [request.employee?.name, publicEmail(request.employee?.email), request.employee?.department, request.type, request.startDate, request.endDate, leaveDays(request), request.status, request.reason].map(csv).join(","))];
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" })); link.download = `employee-leave-${reportFilters.from || "all"}-${reportFilters.to || "all"}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const startEdit = (employee) => {
    setEditing(employee._id);
    setBalance({ annual: employee.leaveBalance?.annual ?? 14, sick: employee.leaveBalance?.sick ?? 6, wfh: employee.leaveBalance?.wfh ?? 3 });
  };
  const saveBalance = async (employee) => {
    if (await mutate(`/admin/employees/${employee._id}/balance`, "PATCH", balance)) setEditing(null);
  };
  const saveLeave = async (event) => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    if (await mutate(`/admin/leave/${leaveEditing._id}`, "PATCH", body)) setLeaveEditing(null);
  };
  return <>
    <Card title="Pending and historical requests"><table className="admin-table"><thead><tr><th>Employee</th><th>Leave type</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>{(data.leave||[]).map(r=><tr key={r._id}><td>{r.employee?.name}</td><td>{r.type}</td><td>{r.startDate} — {r.endDate}</td><td>{r.status}</td><td><div className="admin-row-actions">{r.status==="Pending"&&<><button className="admin-small-btn" onClick={()=>mutate(`/admin/leave/${r._id}`,"PATCH",{status:"Approved"})}>Approve</button><button className="admin-small-btn" onClick={()=>mutate(`/admin/leave/${r._id}`,"PATCH",{status:"Declined"})}>Decline</button></>}<button className="admin-small-btn" onClick={()=>setLeaveEditing(r)}>Edit</button><button className="admin-small-btn admin-danger" onClick={()=>confirm(`Delete ${r.employee?.name||"employee"} leave request? This cannot be undone.`)&&mutate(`/admin/leave/${r._id}`,"DELETE")}>Delete</button></div></td></tr>)}</tbody></table></Card>
    {leaveEditing&&<Card title={`Edit leave request — ${leaveEditing.employee?.name||"Employee"}`}><form className="admin-form" onSubmit={saveLeave}><FormField name="type" label="Leave type" defaultValue={leaveEditing.type}><option>Annual</option><option>Sick</option><option>WFH</option></FormField><FormField name="status" label="Request status" defaultValue={leaveEditing.status}><option>Pending</option><option>Approved</option><option>Declined</option></FormField><FormField name="startDate" label="Start date" type="date" required defaultValue={leaveEditing.startDate}/><FormField name="endDate" label="End date" type="date" required defaultValue={leaveEditing.endDate}/><FormField name="reason" label="Leave reason" defaultValue={leaveEditing.reason} wide/><div className="admin-row-actions"><button className="primary-btn" type="submit">Save leave request</button><button className="admin-small-btn" type="button" onClick={()=>setLeaveEditing(null)}>Cancel</button></div></form></Card>}
    <Card title="Employee leave period report"><div className="admin-form"><label className="admin-field"><span className="admin-field-label">Period to</span><input className="text-input" type="date" value={reportFilters.to} onChange={(event)=>setReportFilters({...reportFilters,to:event.target.value})}/></label><label className="admin-field"><span className="admin-field-label">Employee</span><select className="text-input" value={reportFilters.employee} onChange={(event)=>setReportFilters({...reportFilters,employee:event.target.value})}><option value="">All employees</option>{(data.employees||[]).map((employee)=><option key={employee._id} value={employee._id}>{employee.name}</option>)}</select></label><label className="admin-field"><span className="admin-field-label">Department</span><select className="text-input" value={reportFilters.department} onChange={(event)=>setReportFilters({...reportFilters,department:event.target.value})}><option value="">All departments</option>{reportDepartments.map((department)=><option key={department}>{department}</option>)}</select></label><label className="admin-field"><span className="admin-field-label">Leave status</span><select className="text-input" value={reportFilters.status} onChange={(event)=>setReportFilters({...reportFilters,status:event.target.value})}><option value="">All statuses</option><option>Approved</option><option>Pending</option><option>Declined</option></select></label><label className="admin-field"><span className="admin-field-label">Period from</span><input className="text-input" type="date" value={reportFilters.from} onChange={(event)=>setReportFilters({...reportFilters,from:event.target.value})}/></label></div><div className="admin-metric-grid" style={{marginTop:14}}><div className="admin-metric-box"><b>{reportRows.length}</b><span>Leave requests</span></div><div className="admin-metric-box"><b>{reportDays}</b><span>Total leave days</span></div><div className="admin-metric-box"><b>{reportTypes.Annual||0}</b><span>Annual days</span></div><div className="admin-metric-box"><b>{(reportTypes.Sick||0)+(reportTypes.WFH||0)}</b><span>Sick / WFH days</span></div></div><div className="admin-row-actions" style={{marginBottom:10}}><button className="admin-small-btn" disabled={!reportRows.length} onClick={exportLeaveReport}>Export leave report CSV</button><span><small>{reportRows.length} matching records</small></span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Period</th><th>Days</th><th>Status</th><th>Reason</th></tr></thead><tbody>{reportRows.map((request)=><tr key={request._id}><td>{request.employee?.name}</td><td>{request.employee?.department||"—"}</td><td>{request.type}</td><td>{request.startDate} — {request.endDate}</td><td>{leaveDays(request)}</td><td>{request.status}</td><td>{request.reason||"—"}</td></tr>)}</tbody></table></div></Card>
    <Card title="Employee leave balances"><p className="admin-card-help">Select Edit to adjust the available days for each leave category.</p><div className="admin-table-wrap"><table className="admin-table leave-balance-table"><thead><tr><th>Employee</th><th>Annual leave</th><th>Sick leave</th><th>Work from home</th><th>Actions</th></tr></thead><tbody>{(data.employees||[]).map(employee=>{const active=editing===employee._id;return <tr key={employee._id}><td><b>{employee.name}</b><br/><small>{employee.department}</small></td>{["annual","sick","wfh"].map(kind=><td key={kind}><label className="leave-balance-field"><span>{kind==="wfh"?"WFH days":`${kind[0].toUpperCase()+kind.slice(1)} days`}</span><input type="number" min="0" step="0.5" disabled={!active} value={active?balance[kind]:(employee.leaveBalance?.[kind]??({annual:14,sick:6,wfh:3}[kind]))} onChange={event=>setBalance({...balance,[kind]:Number(event.target.value)})}/></label></td>)}<td><div className="admin-row-actions">{active?<><button className="admin-small-btn" onClick={()=>saveBalance(employee)}>Save</button><button className="admin-small-btn" onClick={()=>setEditing(null)}>Cancel</button></>:<button className="admin-small-btn" onClick={()=>startEdit(employee)}>Edit</button>}</div></td></tr>})}</tbody></table></div></Card>
    <Card title="Company leave calendar">{(data.calendar||[]).map(r=><p key={r._id}><b>{r.employee?.name}</b> · {r.type} · {r.startDate} to {r.endDate}</p>)}</Card>
  </>;
}

function Payroll({ data, mutate, submit }) {
  const rows = data.payroll || [];
  const [editingPayroll, setEditingPayroll] = useState(null);
  const exportCsv = () => {
    const text = ["employee,email,department,month,gross,bonus,deductions,net,payDate", ...rows.map(row=>[row.employee?.name,publicEmail(row.employee?.email),row.employee?.department,row.month,row.gross,row.bonus,row.deductions,row.net,row.payDate].map(csv).join(","))].join("\n");
    const link=document.createElement("a"); link.href=URL.createObjectURL(new Blob([text],{type:"text/csv"})); link.download="payroll.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  const savePayroll = async (event) => {
    event.preventDefault(); const body=Object.fromEntries(new FormData(event.currentTarget));
    if (await mutate(`/admin/payroll/${editingPayroll._id}`,"PATCH",body)) setEditingPayroll(null);
  };
  return <><Card title="Generate payslip"><form className="admin-form" onSubmit={submit(body=>mutate("/admin/payroll","POST",body))}><FormField name="employee" required><EmployeeOptions employees={data.employees||[]}/></FormField><FormField name="month" placeholder="Pay cycle (e.g. August 2026)" required/><FormField name="gross" type="number" placeholder="Gross" required/><FormField name="bonus" type="number" placeholder="Bonus"/><FormField name="deductions" type="number" placeholder="Deductions"/><FormField name="payDate" type="date"/><button className="primary-btn">Generate</button></form></Card>{editingPayroll&&<Card title={`Edit payroll — ${editingPayroll.employee?.name||"Employee"}`}><form className="admin-form" onSubmit={savePayroll}><FormField name="month" label="Pay cycle" required defaultValue={editingPayroll.month}/><FormField name="payDate" label="Pay date" type="date" defaultValue={editingPayroll.payDate}/><FormField name="gross" label="Gross pay" type="number" required defaultValue={editingPayroll.gross}/><FormField name="bonus" label="Bonus" type="number" defaultValue={editingPayroll.bonus||0}/><FormField name="deductions" label="Deductions" type="number" defaultValue={editingPayroll.deductions||0}/><label className="admin-field"><span className="admin-field-label">Calculated net pay</span><div className="text-input payroll-net-preview">{Number(editingPayroll.gross)+Number(editingPayroll.bonus||0)-Number(editingPayroll.deductions||0)}</div></label><div className="admin-row-actions"><button className="primary-btn" type="submit">Save payroll</button><button className="admin-small-btn" type="button" onClick={()=>setEditingPayroll(null)}>Cancel</button></div></form></Card>}<Card title="Payroll records"><div className="admin-row-actions" style={{marginBottom:10}}><button className="admin-small-btn" disabled={!rows.length} onClick={exportCsv}>Export CSV</button><span><small>{rows.length} payroll records</small></span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Employee</th><th>Pay cycle</th><th>Gross</th><th>Bonus</th><th>Deductions</th><th>Net</th><th>Pay date</th><th>Actions</th></tr></thead><tbody>{rows.map(row=><tr key={row._id}><td><b>{row.employee?.name}</b><br/><small>{row.employee?.department}</small></td><td>{row.month}</td><td>{row.gross}</td><td>{row.bonus||0}</td><td>{row.deductions||0}</td><td><b>{row.net}</b></td><td>{row.payDate||"—"}</td><td><div className="admin-row-actions"><button className="admin-small-btn" onClick={()=>setEditingPayroll(row)}>Edit</button><button className="admin-small-btn admin-danger" onClick={()=>confirm(`Delete ${row.employee?.name||"employee"} payroll record for ${row.month}? This cannot be undone.`)&&mutate(`/admin/payroll/${row._id}`,"DELETE")}>Delete</button></div></td></tr>)}</tbody></table></div></Card></>;
}

function Performance({ data, mutate, submit }) { return <><div className="admin-grid"><Card title="Assign goal"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/goals","POST",{...b,progress:Number(b.progress||0),status:"Not started"}))}><FormField name="employee" required><EmployeeOptions employees={data.employees||[]}/></FormField><FormField name="title" placeholder="Goal" required/><FormField name="team" placeholder="Team"/><FormField name="reviewCycle" placeholder="Review cycle"/><FormField name="progress" type="number" placeholder="Progress %"/><button className="primary-btn">Assign</button></form></Card><Card title="Create review cycle"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/review-cycles","POST",b))}><FormField name="name" placeholder="Cycle name" required/><FormField name="startDate" type="date" required/><FormField name="endDate" type="date" required/><FormField name="status"><option>Planned</option><option>Active</option><option>Complete</option></FormField><button className="primary-btn">Create</button></form></Card></div><Card title="Organisation goals"><table className="admin-table"><tbody>{(data.goals||[]).map(g=><tr key={g._id}><td>{g.employee?.name}</td><td>{g.title}</td><td>{g.progress}%</td><td>{g.status}</td><td><button className="admin-small-btn" onClick={()=>{const progress=prompt("Progress %",g.progress);if(progress===null)return;const status=Number(progress)>=100?"Complete":"In progress";mutate(`/admin/goals/${g._id}`,"PATCH",{progress,status});}}>Update</button></td></tr>)}</tbody></table></Card><Card title="Review cycles">{(data.cycles||[]).map(c=><p key={c._id}><b>{c.name}</b> · {c.startDate} to {c.endDate} · {c.status}</p>)}</Card></>; }

function Onboarding({ data, mutate, submit }) { return <><Card title="Checklist template"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/onboarding-templates","POST",{...b,steps:b.steps.split(/\r?\n/).filter(Boolean)}))}><FormField name="name" label="Template name" placeholder="Template name" required/><FormField name="department" label="Applicable department" placeholder="Department or All"/><FormField name="role" label="Applicable job role" placeholder="Role or All"/><label className="admin-field wide"><span className="admin-field-label">Checklist steps *</span><textarea className="text-input" name="steps" placeholder="Enter one checklist step per line" required/></label><button className="primary-btn">Create template</button></form></Card><Card title="Templates">{(data.templates||[]).map(t=><p key={t._id}><b>{t.name}</b> · {t.department} / {t.role} · {t.steps.length} steps</p>)}</Card><Card title="New-hire progress">{Object.values((data.onboarding||[]).reduce((a,s)=>{const k=s.employee?._id||"x";a[k]=a[k]||{name:s.employee?.name,total:0,done:0};a[k].total++;if(s.done)a[k].done++;return a;},{})).map(x=><p key={x.name}><b>{x.name}</b> — {x.done}/{x.total} complete</p>)}</Card></>; }

function Benefits({ data, mutate, submit }) { return <><div className="admin-grid"><Card title="Add benefit plan"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/benefit-plans","POST",b))}><FormField name="name" placeholder="Plan name" required/><FormField name="provider" placeholder="Provider"/><FormField name="description" placeholder="Description"/><button className="primary-btn">Add plan</button></form></Card><Card title="Enroll employee"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/benefit-enrollments","POST",{...b,name:(data.plans||[]).find(p=>p._id===b.plan)?.name||"Benefit"}))}><FormField name="employee" required><EmployeeOptions employees={data.employees||[]}/></FormField><FormField name="plan" required><option value="">Select plan</option>{(data.plans||[]).map(p=><option key={p._id} value={p._id}>{p.name}</option>)}</FormField><FormField name="status"><option>Active</option><option>Pending</option><option>Waived</option></FormField><button className="primary-btn">Enroll</button></form></Card></div><Card title="Plans">{(data.plans||[]).map(p=><p key={p._id}><b>{p.name}</b> · {p.provider} · {p.active?"Active":"Inactive"} <button className="admin-small-btn" onClick={()=>mutate(`/admin/benefit-plans/${p._id}`,"PATCH",{active:!p.active})}>Toggle</button></p>)}</Card><Card title="Enrollments">{(data.enrollments||[]).map(e=><p key={e._id}><b>{e.employee?.name}</b> · {e.plan?.name||e.name} · {e.status}</p>)}</Card></>; }

function Recruitment({ data, mutate, submit }) { return <><div className="admin-grid"><Card title="Post opening"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/openings","POST",b))}><FormField name="title" placeholder="Job title" required/><FormField name="department" placeholder="Department" required/><FormField name="status"><option>Open</option><option>Draft</option><option>Closed</option></FormField><FormField name="description" placeholder="Description"/><button className="primary-btn">Post</button></form></Card><Card title="Add candidate"><form className="admin-form" onSubmit={submit(b=>mutate("/admin/candidates","POST",b))}><FormField name="opening" required><option value="">Select opening</option>{(data.openings||[]).map(o=><option key={o._id} value={o._id}>{o.title}</option>)}</FormField><FormField name="name" placeholder="Candidate name" required/><FormField name="email" type="email" placeholder="Email" required/><FormField name="stage"><option>Applied</option><option>Screening</option><option>Interview</option><option>Offer</option><option>Hired</option><option>Rejected</option></FormField><button className="primary-btn">Add</button></form></Card></div><Card title="Openings">{(data.openings||[]).map(o=><p key={o._id}><b>{o.title}</b> · {o.department} · {o.applicants} applicants · {o.status} <button className="admin-small-btn" onClick={()=>{const status=prompt("Draft, Open, or Closed",o.status);status&&mutate(`/admin/openings/${o._id}`,"PATCH",{status});}}>Edit</button></p>)}</Card><Card title="Candidate pipeline">{(data.candidates||[]).map(c=><p key={c._id}><b>{c.name}</b> · {c.opening?.title} · {c.stage} <button className="admin-small-btn" onClick={()=>{const stage=prompt("Applied, Screening, Interview, Offer, Hired, or Rejected",c.stage);stage&&mutate(`/admin/candidates/${c._id}`,"PATCH",{stage});}}>Move</button></p>)}</Card></>; }

function Settings({ settings={}, mutate, api }) {
  const [cleanup, setCleanup] = useState({ from: "", to: "", attendance: true, leave: false, confirmation: "" });
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const save = async (event) => {
    event.preventDefault(); const body = Object.fromEntries(new FormData(event.currentTarget));
    await mutate("/admin/settings", "PUT", { companyName:body.companyName, attention:body.attention, address:body.address, phone1:body.phone1, phone2:body.phone2, fax:body.fax, businessNature:body.businessNature, workSchedule:{start:body.workStart,end:body.workEnd}, overtime:{workDayStart:body.otStart,workDayMinimumMinutes:Number(body.otMinimum),workDayMaximumMinutes:Number(body.otMaximum),workDayRate:Number(body.workDayRate),restDayRate:Number(body.restDayRate),publicHolidayRate:Number(body.publicHolidayRate)}, departments:body.departments.split(",").map(value=>value.trim()).filter(Boolean), holidays:body.holidays.split(/\r?\n/).filter(Boolean).map(value=>{const [name,date]=value.split("|");return{name:name?.trim(),date:date?.trim()}}), leavePolicy:{annualDefault:Number(body.annualDefault),sickDefault:Number(body.sickDefault),wfhDefault:Number(body.wfhDefault),annualAccrualMonthly:Number(body.annualAccrualMonthly),carryoverLimit:Number(body.carryoverLimit)}, payCycle:body.payCycle,nextPayDate:body.nextPayDate });
  };
  const deletePeriod = async (event) => {
    event.preventDefault();
    if (!cleanup.from || !cleanup.to || cleanup.to < cleanup.from) return setCleanupResult({ error: "Enter a valid From and To date period." });
    const targets = [cleanup.attendance&&"attendance", cleanup.leave&&"leave"].filter(Boolean);
    if (!targets.length) return setCleanupResult({ error: "Select Attendance, Leave, or both." });
    if (cleanup.confirmation !== "DELETE") return setCleanupResult({ error: "Type DELETE exactly to confirm." });
    if (!confirm(`Permanently delete selected data from ${cleanup.from} through ${cleanup.to}? This cannot be undone.`)) return;
    setCleanupBusy(true); setCleanupResult(null);
    try { setCleanupResult(await api("/admin/settings/delete-period", { method:"POST", body:{ from:cleanup.from,to:cleanup.to,targets,confirmation:cleanup.confirmation } })); setCleanup({...cleanup,confirmation:""}); }
    catch (error) { setCleanupResult({ error:error.message }); }
    finally { setCleanupBusy(false); }
  };
  return <><Card title="Company settings"><form className="admin-form" onSubmit={save}><FormField name="companyName" label="Company name" placeholder="Company name" defaultValue={settings.companyName}/><FormField name="attention" label="Attention" defaultValue={settings.attention}/><label className="admin-field wide"><span className="admin-field-label">Address</span><textarea className="text-input" name="address" defaultValue={settings.address}/></label><FormField name="phone1" label="Phone 1" defaultValue={settings.phone1}/><FormField name="phone2" label="Phone 2" defaultValue={settings.phone2}/><FormField name="fax" label="Fax" defaultValue={settings.fax}/><FormField name="businessNature" label="Business nature" defaultValue={settings.businessNature}/><FormField name="workStart" label="Workday starts" type="time" defaultValue={settings.workSchedule?.start||"09:00"}/><FormField name="workEnd" label="Workday ends" type="time" defaultValue={settings.workSchedule?.end||"18:00"}/><FormField name="otStart" label="OT starts" type="time" defaultValue={settings.overtime?.workDayStart||"18:00"}/><FormField name="otMinimum" label="Minimum OT minutes" type="number" defaultValue={settings.overtime?.workDayMinimumMinutes??30}/><FormField name="otMaximum" label="Maximum OT minutes" type="number" defaultValue={settings.overtime?.workDayMaximumMinutes??240}/><FormField name="workDayRate" label="Workday OT rate" type="number" step="0.1" defaultValue={settings.overtime?.workDayRate??1.5}/><FormField name="restDayRate" label="Rest-day OT rate" type="number" step="0.1" defaultValue={settings.overtime?.restDayRate??2}/><FormField name="publicHolidayRate" label="Holiday OT rate" type="number" step="0.1" defaultValue={settings.overtime?.publicHolidayRate??2}/><FormField name="departments" label="Departments and teams" placeholder="Departments, comma separated" defaultValue={(settings.departments||[]).join(", ")}/><label className="admin-field wide"><span className="admin-field-label">Public holidays</span><textarea className="text-input" name="holidays" defaultValue={(settings.holidays||[]).map(holiday=>`${holiday.name}|${holiday.date}`).join("\n")} placeholder="Holiday name|YYYY-MM-DD, one per line"/></label><FormField name="annualDefault" label="Default annual leave days" type="number" defaultValue={settings.leavePolicy?.annualDefault??14}/><FormField name="sickDefault" label="Default sick leave days" type="number" defaultValue={settings.leavePolicy?.sickDefault??6}/><FormField name="wfhDefault" label="Default WFH days" type="number" defaultValue={settings.leavePolicy?.wfhDefault??3}/><FormField name="annualAccrualMonthly" label="Monthly annual-leave accrual" type="number" defaultValue={settings.leavePolicy?.annualAccrualMonthly??1.17}/><FormField name="carryoverLimit" label="Annual carryover limit" type="number" defaultValue={settings.leavePolicy?.carryoverLimit??5}/><FormField name="payCycle" label="Payroll cycle" defaultValue={settings.payCycle}><option>Monthly</option><option>Biweekly</option><option>Weekly</option></FormField><FormField name="nextPayDate" label="Next pay date" type="date" defaultValue={settings.nextPayDate}/><button className="primary-btn">Save settings</button></form></Card><Card title="Data cleanup"><p className="admin-card-help">Permanently delete old records within a date period. Export any required reports first. Fingerprint punches for deleted attendance are also removed locally.</p><form className="admin-form" onSubmit={deletePeriod}><label className="admin-field"><span className="admin-field-label">From date *</span><input className="text-input" type="date" required value={cleanup.from} onChange={event=>setCleanup({...cleanup,from:event.target.value})}/></label><label className="admin-field"><span className="admin-field-label">To date *</span><input className="text-input" type="date" required value={cleanup.to} onChange={event=>setCleanup({...cleanup,to:event.target.value})}/></label><label className="admin-field cleanup-choice"><input type="checkbox" checked={cleanup.attendance} onChange={event=>setCleanup({...cleanup,attendance:event.target.checked})}/><span><b>Attendance records</b><small>Includes locally imported fingerprint punches</small></span></label><label className="admin-field cleanup-choice"><input type="checkbox" checked={cleanup.leave} onChange={event=>setCleanup({...cleanup,leave:event.target.checked})}/><span><b>Leave requests</b><small>Deletes requests overlapping the selected period</small></span></label><label className="admin-field wide"><span className="admin-field-label">Type DELETE to confirm *</span><input className="text-input" value={cleanup.confirmation} onChange={event=>setCleanup({...cleanup,confirmation:event.target.value})} placeholder="DELETE" autoComplete="off"/></label><button className="primary-btn admin-cleanup-btn" disabled={cleanupBusy||cleanup.confirmation!=="DELETE"}>{cleanupBusy?"Deleting…":"Delete selected period data"}</button></form>{cleanupResult&&<div className={`fingerprint-result ${cleanupResult.error?"error":"success"}`}>{cleanupResult.error||`Deleted ${cleanupResult.attendanceDeleted} attendance records, ${cleanupResult.fingerprintPunchesDeleted} fingerprint punches, and ${cleanupResult.leaveDeleted} leave requests.`}</div>}<p className="admin-card-help" style={{marginTop:12}}>Important: fingerprint logs remain on the physical device. A later sync can re-import logs still inside the configured synchronization window.</p></Card></>;
}

function Analytics({ value={} }) { return <><div className="admin-metric-grid"><div className="admin-metric-box"><b>{value.hires||0}</b><span>Hires tracked</span></div><div className="admin-metric-box"><b>{value.openRoles||0}</b><span>Open roles</span></div><div className="admin-metric-box"><b>{value.turnoverRate||0}%</b><span>Turnover</span></div><div className="admin-metric-box"><b>{value.averageTimeToHireDays||0}</b><span>Avg. days to hire</span></div></div><div className="admin-grid"><Card title="Headcount by department">{(value.headcount||[]).map(x=><p key={x._id}><b>{x._id||"General"}</b> — {x.count}</p>)}</Card><Card title="Attendance trend">{(value.attendanceTrend||[]).map(x=><p key={x._id}><b>{x._id}</b> — {x.count}</p>)}</Card><Card title="Leave trend">{(value.leaveTrend||[]).map(x=><p key={x._id}><b>{x._id}</b> — {x.count} requests</p>)}</Card></div></>; }
