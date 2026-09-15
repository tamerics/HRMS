import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, Clock, Calendar, Wallet, Grid3x3, Search, ChevronRight, ChevronLeft,
  TrendingUp, Users, Gift, Briefcase, Plus, LogOut, Bell,
  MapPin, CheckCircle2, Circle, Star, Settings, AlertCircle, ShieldCheck,
} from "lucide-react";
import AdminSuite from "./AdminSuite.jsx";
import Requests from "./Requests.jsx";
import MobilePortal from "./MobilePortal.jsx";

// ---------- API client ----------
// Token lives only in React state (never localStorage/sessionStorage) —
// it resets on refresh, which is expected for an artifact preview.
async function apiRequest(apiBase, token, path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---------- Small building blocks ----------
function Meridian() {
  return <div className="meridian" />;
}

function SectionLabel({ children, right }) {
  return (
    <div className="section-label-row">
      <span className="section-label">{children}</span>
      {right}
    </div>
  );
}

function TopBar({ title, onBack, initials }) {
  return (
    <div className="topbar">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft size={20} />
        </button>
      ) : (
        <div className="avatar-sm">{initials}</div>
      )}
      <div className="topbar-title">{title}</div>
      <button className="icon-btn" aria-label="Notifications">
        <Bell size={18} />
      </button>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    Approved: "moss",
    Pending: "gold",
    "On time": "moss",
    Late: "brick",
    Leave: "gold",
    Declined: "brick",
  };
  return <span className={`pill pill-${map[status] || "moss"}`}>{status}</span>;
}

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="error-note">
      <AlertCircle size={14} />
      <span>{message}</span>
    </div>
  );
}

function EmptyNote({ message }) {
  return <div className="empty-note">{message}</div>;
}

// ---------- Day arc (signature element) ----------
function DayArc({ progress }) {
  const r = 54;
  const c = Math.PI * r;
  const dash = (progress / 100) * c;
  return (
    <div className="dayarc-wrap">
      <svg viewBox="0 0 140 80" width="140" height="80">
        <path d={`M 10 74 A ${r} ${r} 0 0 1 130 74`} fill="none" stroke="var(--line)" strokeWidth="8" strokeLinecap="round" />
        <path
          d={`M 10 74 A ${r} ${r} 0 0 1 130 74`}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
        <defs>
          <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="dayarc-label">
        <div className="dayarc-num">{progress}%</div>
        <div className="dayarc-sub">of workday</div>
      </div>
    </div>
  );
}

// ---------- helpers ----------
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location is not supported on this device."));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      (error) => reject(new Error(error.code === 1 ? "Location permission is required to record attendance." : "Unable to obtain your GPS location. Move to an open area and try again.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtTimeSeconds(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtHours(startIso, endIso) {
  if (!startIso) return "—";
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date();
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
function dayProgress(record) {
  if (!record || !record.clockIn) return 0;
  const start = new Date(record.clockIn);
  const end = record.clockOut ? new Date(record.clockOut) : new Date();
  const mins = (end - start) / 60000;
  return Math.min(100, Math.round((mins / (9 * 60)) * 100));
}

// ---------- Login screen ----------
function LoginScreen({ onLogin, apiBase, setApiBase, loading, error }) {
  const [email, setEmail] = useState("sara@example.com");
  const [password, setPassword] = useState("password123");
  const [showSettings, setShowSettings] = useState(false);
  const [connection, setConnection] = useState({ status: "checking", message: "Checking HRMS server…" });

  const checkConnection = useCallback(async () => {
    setConnection({ status: "checking", message: "Checking HRMS server…" });
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${apiBase}/health`, { signal: controller.signal, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.status !== "ok") throw new Error(`Server returned HTTP ${response.status}`);
      const server = apiBase.startsWith("http") ? apiBase.replace(/\/api\/?$/, "") : window.location.origin;
      setConnection({ status: "online", message: `Connected to ${server}` });
    } catch (connectionError) {
      setConnection({ status: "offline", message: connectionError.name === "AbortError" ? "Connection timed out" : "HRMS server is unreachable" });
    } finally { window.clearTimeout(timer); }
  }, [apiBase]);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  return (
    <div className="screen login-screen">
      <div className="login-hero">
        <div className="hero-eyebrow">HRMS</div>
        <h1 className="hero-title">Sign in.</h1>
        <p className="login-sub">Connect to your HRMS API to see live data.</p>
      </div>

      <div className="content-pad">
        <div className={`login-connection ${connection.status}`}><span className="connection-dot"/><div><b>{connection.status === "online" ? "Server online" : connection.status === "checking" ? "Checking connection" : "Server offline"}</b><small>{connection.message}</small></div>{connection.status !== "checking"&&<button className="admin-small-btn" type="button" onClick={checkConnection}>Retry</button>}</div>
        <div className="field-label">Email</div>
        <input className="text-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        <div className="field-label">Password</div>
        <input className="text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

        <ErrorNote message={error} />

        <button className="primary-btn full" disabled={loading || connection.status !== "online"} onClick={() => onLogin(email, password)}>
          {loading ? "Signing in…" : connection.status === "checking" ? "Checking server…" : connection.status === "offline" ? "Server unavailable" : "Sign in"}
        </button>

        <button className="link-btn settings-toggle" onClick={() => setShowSettings((v) => !v)}>
          <Settings size={13} /> API settings
        </button>

        {showSettings && (
          <div className="settings-box">
            <div className="field-label">API base URL</div>
            <input className="text-input" value={apiBase} onChange={(e) => setApiBase(e.target.value)} placeholder="http://localhost:4000/api" />
            <div className="settings-hint">
              Point this at your running backend (see the hrms-backend README). The default
              assumes it's running locally on port 4000.
            </div>
          </div>
        )}

        <div className="demo-hint">
          Demo login: <span className="mono">sara@example.com</span> / <span className="mono">password123</span>
          {" "}(after running <span className="mono">npm run seed</span>)
        </div>
      </div>
    </div>
  );
}

// ---------- Screens ----------
function HomeScreen({ employee, goTab, todayRecord, onClock, clockBusy, leaveRequests, loading, error }) {
  const clockedIn = !!(todayRecord && todayRecord.clockIn && !todayRecord.clockOut);
  const progress = dayProgress(todayRecord);
  const firstName = employee?.name?.split(" ")[0] || "there";

  return (
    <div className="screen">
      <div className="hero">
        <div className="hero-eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 className="hero-title">Hi, {firstName}.</h1>
        <div className="hero-arc-row">
          <DayArc progress={progress} />
          <div className="hero-clock-block">
            <div className="hero-clock-time">
              {todayRecord?.clockIn ? `${fmtTime(todayRecord.clockIn)} → ${fmtTime(todayRecord.clockOut)}` : "Not clocked in"}
            </div>
            <div style={{display:'flex',gap:8}}><button className="clock-btn" onClick={()=>onClock('clock-in')} disabled={clockBusy||!!todayRecord?.clockIn}>Clock in</button><button className="clock-btn clock-btn-out" onClick={()=>onClock('clock-out')} disabled={clockBusy||!todayRecord?.clockIn}>Clock out</button></div>
          </div>
        </div>
      </div>

      <ErrorNote message={error} />
      <Meridian />

      <SectionLabel right={<button className="link-btn" onClick={() => goTab("leave")}>View all</button>}>
        Leave balance
      </SectionLabel>
      <div className="balance-row">
        <div className="balance-card"><div className="balance-num">{employee?.leaveBalance?.annual ?? "—"}</div><div className="balance-label">Annual</div></div>
        <div className="balance-card"><div className="balance-num">{employee?.leaveBalance?.sick ?? "—"}</div><div className="balance-label">Sick</div></div>
        <div className="balance-card"><div className="balance-num">{employee?.leaveBalance?.wfh ?? "—"}</div><div className="balance-label">WFH</div></div>
      </div>

      <Meridian />

      <SectionLabel>Quick access</SectionLabel>
      <div className="quick-grid">
        {[
          { icon: <Wallet size={18} />, label: "Payslips", tab: "pay" },
          { icon: <Users size={18} />, label: "Directory", tab: "directory" },
          { icon: <TrendingUp size={18} />, label: "Goals", tab: "performance" },
          { icon: <Gift size={18} />, label: "Benefits", tab: "benefits" },
        ].map((q) => (
          <button key={q.label} className="quick-tile" onClick={() => goTab(q.tab)}>
            <div className="quick-icon">{q.icon}</div>
            <div className="quick-label">{q.label}</div>
          </button>
        ))}
      </div>

      <Meridian />

      <SectionLabel>Recent activity</SectionLabel>
      {loading ? (
        <EmptyNote message="Loading…" />
      ) : leaveRequests.length === 0 ? (
        <EmptyNote message="No leave requests yet." />
      ) : (
        <div className="list-card">
          {leaveRequests.slice(0, 2).map((l) => (
            <div className="list-row" key={l._id}>
              <div>
                <div className="list-row-title">{l.type} leave</div>
                <div className="list-row-sub">{l.startDate}{l.endDate !== l.startDate ? ` – ${l.endDate}` : ""}</div>
              </div>
              <StatusPill status={l.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AttendanceScreen({ attendance, todayRecord, onClock, clockBusy, loading, error }) {
  const clockedIn = !!(todayRecord && todayRecord.clockIn && !todayRecord.clockOut);
  const progress = dayProgress(todayRecord);

  return (
    <div className="screen">
      <TopBar title="Attendance" />
      <div className="content-pad">
        <div className="hero-arc-row centered">
          <DayArc progress={progress} />
        </div>
        <div className="clock-time-big">
          {todayRecord?.clockIn ? `${fmtTimeSeconds(todayRecord.clockIn)} → ${fmtTimeSeconds(todayRecord.clockOut)}` : "Not clocked in"}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><button className="clock-btn full" onClick={()=>onClock('clock-in')} disabled={clockBusy||!!todayRecord?.clockIn}>Clock in</button><button className="clock-btn full clock-btn-out" onClick={()=>onClock('clock-out')} disabled={clockBusy||!todayRecord?.clockIn}>Clock out</button></div>
        <ErrorNote message={error} />
        <div className="geo-note">Clock-in and clock-out are available on the company LAN</div>

        <Meridian />
        <SectionLabel>History</SectionLabel>
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : attendance.length === 0 ? (
          <EmptyNote message="No attendance records yet." />
        ) : (
          <div className="list-card">
            {attendance.map((a) => (
              <div className="list-row" key={a._id}>
                <div>
                  <div className="list-row-title">{a.date}</div>
                  <div className="list-row-sub mono">{fmtTimeSeconds(a.clockIn)} → {fmtTimeSeconds(a.clockOut)} · {fmtHours(a.clockIn, a.clockOut)}{a.clockInLocation ? " · GPS recorded" : ""}</div>
                </div>
                <StatusPill status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeaveScreen({ employee, leaveRequests, loading, error, onSubmit, submitBusy, submitError }) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("Annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const submit = async () => {
    if (!startDate || !endDate) return;
    const ok = await onSubmit({ type, startDate, endDate });
    if (ok) {
      setShowForm(false);
      setStartDate("");
      setEndDate("");
    }
  };

  return (
    <div className="screen">
      <TopBar title="Leave" />
      <div className="content-pad">
        <div className="balance-row">
          <div className="balance-card"><div className="balance-num">{employee?.leaveBalance?.annual ?? "—"}</div><div className="balance-label">Annual</div></div>
          <div className="balance-card"><div className="balance-num">{employee?.leaveBalance?.sick ?? "—"}</div><div className="balance-label">Sick</div></div>
          <div className="balance-card"><div className="balance-num">{employee?.leaveBalance?.wfh ?? "—"}</div><div className="balance-label">WFH</div></div>
        </div>

        <button className="primary-btn" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Request leave
        </button>

        <ErrorNote message={error} />
        <Meridian />
        <SectionLabel>History</SectionLabel>
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : leaveRequests.length === 0 ? (
          <EmptyNote message="No leave requests yet." />
        ) : (
          <div className="list-card">
            {leaveRequests.map((l) => (
              <div className="list-row" key={l._id}>
                <div>
                  <div className="list-row-title">{l.type} leave</div>
                  <div className="list-row-sub">{l.startDate}{l.endDate !== l.startDate ? ` – ${l.endDate}` : ""}</div>
                </div>
                <StatusPill status={l.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="sheet-overlay" onClick={() => !submitBusy && setShowForm(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-title">Request leave</div>
            <div className="field-label">Type</div>
            <div className="chip-row">
              {["Annual", "Sick", "WFH"].map((t) => (
                <button key={t} className={`chip ${type === t ? "chip-active" : ""}`} onClick={() => setType(t)}>{t}</button>
              ))}
            </div>
            <div className="field-label">Start date</div>
            <input className="text-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <div className="field-label">End date</div>
            <input className="text-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <ErrorNote message={submitError} />
            <button className="primary-btn full" onClick={submit} disabled={submitBusy}>
              {submitBusy ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PayScreen({ payslips, loading, error }) {
  const [selected, setSelected] = useState(null);
  if (selected) {
    return (
      <div className="screen">
        <TopBar title={selected.month} onBack={() => setSelected(null)} />
        <div className="content-pad">
          <div className="payslip-net">
            <div className="payslip-net-label">Net pay</div>
            <div className="payslip-net-num">${selected.net.toLocaleString()}</div>
          </div>
          <Meridian />
          <div className="list-card">
            <div className="list-row"><div className="list-row-title">Gross pay</div><div className="mono">${selected.gross.toLocaleString()}</div></div>
            <div className="list-row"><div className="list-row-title">Deductions</div><div className="mono">-${selected.deductions.toLocaleString()}</div></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="screen">
      <TopBar title="Payslips" />
      <div className="content-pad">
        <SectionLabel>History</SectionLabel>
        <ErrorNote message={error} />
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : payslips.length === 0 ? (
          <EmptyNote message="No payslips yet." />
        ) : (
          <div className="list-card">
            {payslips.map((p) => (
              <button className="list-row list-row-btn" key={p._id} onClick={() => setSelected(p)}>
                <div>
                  <div className="list-row-title">{p.month}</div>
                  <div className="list-row-sub mono">Net ${p.net.toLocaleString()}</div>
                </div>
                <ChevronRight size={16} color="var(--ink-soft)" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DirectoryScreen({ onBack, directory, loading, error }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => directory.filter((d) => (d.name + d.role + d.department).toLowerCase().includes(q.toLowerCase())),
    [q, directory]
  );
  return (
    <div className="screen">
      <TopBar title="Directory" onBack={onBack} />
      <div className="content-pad">
        <div className="search-row">
          <Search size={16} color="var(--ink-soft)" />
          <input className="search-input" placeholder="Search people or teams" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ErrorNote message={error} />
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : filtered.length === 0 ? (
          <EmptyNote message="No one matches that search." />
        ) : (
          <div className="list-card">
            {filtered.map((d) => (
              <div className="list-row" key={d._id}>
                <div className="row-with-avatar">
                  <div className="avatar-sm">{d.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
                  <div>
                    <div className="list-row-title">{d.name}</div>
                    <div className="list-row-sub">{d.role} · {d.department}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PerformanceScreen({ onBack, goals, loading, error }) {
  return (
    <div className="screen">
      <TopBar title="Performance" onBack={onBack} />
      <div className="content-pad">
        <SectionLabel>Current goals</SectionLabel>
        <ErrorNote message={error} />
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : goals.length === 0 ? (
          <EmptyNote message="No goals set yet." />
        ) : (
          <div className="list-card">
            {goals.map((g) => (
              <div className="goal-row" key={g._id}>
                <div className="list-row-title">{g.title}</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${g.progress}%` }} />
                </div>
                <div className="list-row-sub">{g.progress}% complete</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingScreen({ onBack, steps, loading, error, onToggle }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <div className="screen">
      <TopBar title="Onboarding" onBack={onBack} />
      <div className="content-pad">
        <SectionLabel>{loading ? "Loading…" : `${done} of ${steps.length} steps complete`}</SectionLabel>
        <ErrorNote message={error} />
        {!loading && steps.length === 0 ? (
          <EmptyNote message="No checklist assigned." />
        ) : (
          <div className="list-card">
            {steps.map((s) => (
              <button className="list-row list-row-btn" key={s._id} onClick={() => onToggle(s)}>
                <div className="row-with-avatar">
                  {s.done ? <CheckCircle2 size={18} color="var(--moss)" /> : <Circle size={18} color="var(--line)" />}
                  <div className={`list-row-title ${s.done ? "done" : ""}`}>{s.label}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BenefitsScreen({ onBack, benefits, loading, error }) {
  return (
    <div className="screen">
      <TopBar title="Benefits" onBack={onBack} />
      <div className="content-pad">
        <SectionLabel>Enrolled</SectionLabel>
        <ErrorNote message={error} />
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : benefits.length === 0 ? (
          <EmptyNote message="No benefits on file." />
        ) : (
          <div className="list-card">
            {benefits.map((b) => (
              <div className="list-row" key={b._id}>
                <div>
                  <div className="list-row-title">{b.name}</div>
                  <div className="list-row-sub">{b.detail}</div>
                </div>
                <Gift size={16} color="var(--gold)" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecruitmentScreen({ onBack, openings, loading, error }) {
  return (
    <div className="screen">
      <TopBar title="Team openings" onBack={onBack} />
      <div className="content-pad">
        <SectionLabel>Open roles</SectionLabel>
        <ErrorNote message={error} />
        {loading ? (
          <EmptyNote message="Loading…" />
        ) : openings.length === 0 ? (
          <EmptyNote message="No open roles right now." />
        ) : (
          <div className="list-card">
            {openings.map((o) => (
              <div className="list-row" key={o._id}>
                <div>
                  <div className="list-row-title">{o.title}</div>
                  <div className="list-row-sub">{o.department}</div>
                </div>
                <span className="pill pill-gold">{o.applicants} applicants</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminScreen({ stats, employees, leave, loading, error, onDecision, onSaveEmployee, onDeleteEmployee }) {
  const emptyEmployee = { name: "", email: "", password: "", role: "", department: "", isManager: false, accessLevel: "employee" };
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyEmployee);
  const [saving, setSaving] = useState(false);

  const editEmployee = (person) => {
    setEditingId(person._id);
    setDraft({
      name: person.name || "", email: person.email || "", password: "",
      role: person.role || "", department: person.department || "",
      isManager: Boolean(person.isManager), accessLevel: person.accessLevel || "employee",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setDraft(emptyEmployee);
  };

  const submitEmployee = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onSaveEmployee(draft, editingId);
    setSaving(false);
    if (saved) resetForm();
  };
  const cards = [
    ["Employees", stats?.employees ?? 0],
    ["Managers", stats?.managers ?? 0],
    ["Present today", stats?.presentToday ?? 0],
    ["Pending leave", stats?.pendingLeave ?? 0],
  ];
  return (
    <div className="screen">
      <TopBar title="Admin dashboard" initials="AD" />
      <div className="content-pad">
        <ErrorNote message={error} />
        <div className="admin-metrics">
          {cards.map(([label, value]) => (
            <div className="admin-metric" key={label}>
              <div className="admin-metric-value">{value}</div>
              <div className="admin-metric-label">{label}</div>
            </div>
          ))}
        </div>
        <Meridian />
        <SectionLabel>{editingId ? "Edit employee" : "Add employee"}</SectionLabel>
        <form className="admin-employee-form" onSubmit={submitEmployee}>
          <input className="text-input" required placeholder="Full name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="text-input" required type="email" placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          <input className="text-input" required={!editingId} type="password" minLength={12} placeholder={editingId ? "New password (optional)" : "Temporary password (12+ characters)"} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
          <input className="text-input" placeholder="Job role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <input className="text-input" placeholder="Department" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} />
          <select className="text-input" value={draft.accessLevel} onChange={(e) => setDraft({ ...draft, accessLevel: e.target.value })}>
            <option value="employee">Employee access</option>
            <option value="admin">Administrator access</option>
          </select>
          <label className="admin-checkbox">
            <input type="checkbox" checked={draft.isManager} onChange={(e) => setDraft({ ...draft, isManager: e.target.checked })} />
            Can manage staff leave
          </label>
          <div className="admin-form-actions">
            <button className="primary-btn" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add employee"}</button>
            {editingId && <button className="secondary-btn" type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
        <Meridian />
        <SectionLabel>Leave approvals</SectionLabel>
        {loading ? <EmptyNote message="Loading requests…" /> : leave.length === 0 ? (
          <EmptyNote message="No leave requests." />
        ) : (
          <div className="list-card">
            {leave.map((request) => (
              <div className="admin-leave-row" key={request._id}>
                <div>
                  <div className="list-row-title">{request.employee?.name || "Employee"}</div>
                  <div className="list-row-sub">{request.type} · {request.startDate} to {request.endDate}</div>
                </div>
                {request.status === "Pending" ? (
                  <div className="admin-actions">
                    <button className="admin-approve" onClick={() => onDecision(request._id, "Approved")}>Approve</button>
                    <button className="admin-decline" onClick={() => onDecision(request._id, "Declined")}>Decline</button>
                  </div>
                ) : <StatusPill status={request.status} />}
              </div>
            ))}
          </div>
        )}
        <Meridian />
        <SectionLabel>Employees</SectionLabel>
        <div className="list-card">
          {employees.map((person) => (
            <div className="list-row" key={person._id}>
              <div>
                <div className="list-row-title">{person.name}</div>
                <div className="list-row-sub">{person.email} · {person.role} · {person.department}</div>
              </div>
              <div className="admin-actions">
                {person.accessLevel === "admin" && <span className="pill pill-gold">Admin</span>}
                <button className="admin-edit" onClick={() => editEmployee(person)}>Edit</button>
                <button className="admin-delete" onClick={() => {
                  if (window.confirm(`Delete ${person.name} and all of their HR records? This cannot be undone.`)) {
                    onDeleteEmployee(person);
                  }
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoreScreen({ open, employee, onSignOut }) {
  const tiles = [
    { icon: <Users size={20} />, label: "Directory", key: "directory" },
    { icon: <TrendingUp size={20} />, label: "Performance", key: "performance" },
    { icon: <Briefcase size={20} />, label: "Onboarding", key: "onboarding" },
    { icon: <Gift size={20} />, label: "Benefits", key: "benefits" },
    { icon: <Star size={20} />, label: "Team openings", key: "recruitment" },
  ];
  return (
    <div className="screen">
      <TopBar title="More" />
      <div className="content-pad">
        <div className="profile-card">
          <div className="avatar-lg">{employee?.name?.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
          <div>
            <div className="profile-name">{employee?.name}</div>
            <div className="profile-role">{employee?.role} · {employee?.department}</div>
          </div>
        </div>
        <Meridian />
        <div className="more-grid">
          {tiles.map((t) => (
            <button className="quick-tile" key={t.key} onClick={() => open(t.key)}>
              <div className="quick-icon">{t.icon}</div>
              <div className="quick-label">{t.label}</div>
            </button>
          ))}
        </div>
        <Meridian />
        <button className="signout-btn" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
      </div>
    </div>
  );
}

// ---------- App shell ----------
export default function HRMSApp() {
  const [apiBase, setApiBase] = useState("/api");
  const [token, setToken] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [tab, setTab] = useState("home");
  const [moreScreen, setMoreScreen] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [onboardingSteps, setOnboardingSteps] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [openings, setOpenings] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminEmployees, setAdminEmployees] = useState([]);
  const [adminLeave, setAdminLeave] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [clockBusy, setClockBusy] = useState(false);
  const [clockError, setClockError] = useState("");
  const [leaveSubmitBusy, setLeaveSubmitBusy] = useState(false);
  const [leaveSubmitError, setLeaveSubmitError] = useState("");

  const api = useCallback((path, options) => apiRequest(apiBase, token, path, options), [apiBase, token]);

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const [att, leave, pay, dir, gl, ob, ben, open] = await Promise.all([
        api("/attendance"),
        api("/leave"),
        api("/payslips"),
        api("/employees"),
        api("/goals"),
        api("/onboarding"),
        api("/benefits"),
        api("/openings"),
      ]);
      setAttendance(att);
      setLeaveRequests(leave);
      setPayslips(pay);
      setDirectory(dir);
      setGoals(gl);
      setOnboardingSteps(ob);
      setBenefits(ben);
      setOpenings(open);
    } catch (err) {
      setDataError(err.message || "Couldn't reach the API");
    } finally {
      setDataLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  const loadAdmin = useCallback(async () => {
    if (employee?.accessLevel !== "admin") return;
    setAdminLoading(true);
    setAdminError("");
    try {
      const [stats, people, requests] = await Promise.all([
        api("/admin/dashboard"), api("/admin/employees"), api("/admin/leave"),
      ]);
      setAdminStats(stats);
      setAdminEmployees(people);
      setAdminLeave(requests);
    } catch (err) {
      setAdminError(err.message || "Couldn't load admin data");
    } finally {
      setAdminLoading(false);
    }
  }, [api, employee]);

  useEffect(() => {
    if (tab === "admin") loadAdmin();
  }, [tab, loadAdmin]);

  const handleLogin = async (email, password) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const data = await apiRequest(apiBase, null, "/auth/login", { method: "POST", body: { email, password } });
      setToken(data.token);
      setEmployee(data.employee);
    } catch (err) {
      setAuthError(err.message || "Couldn't sign in");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setToken(null);
    setEmployee(null);
    setTab("home");
    setMoreScreen(null);
  };

  const todayRecord = useMemo(() => attendance.find((a) => a.date === todayKey()), [attendance]);

  const handleClock = async (action) => {
    setClockBusy(true);
    setClockError("");
    try {
      const clockedIn = todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
      const endpoint = ['clock-in','clock-out'].includes(action) ? action : clockedIn ? 'clock-out' : 'clock-in';
      const updated = await api(`/attendance/${endpoint}`, { method: "POST", body: {} });
      setAttendance((prev) => {
        const others = prev.filter((a) => a.date !== updated.date);
        return [updated, ...others].sort((a, b) => (a.date < b.date ? 1 : -1));
      });
    } catch (err) {
      setClockError(err.message || "Couldn't update attendance");
    } finally {
      setClockBusy(false);
    }
  };

  const handleLeaveSubmit = async ({ type, startDate, endDate }) => {
    setLeaveSubmitBusy(true);
    setLeaveSubmitError("");
    try {
      const created = await api("/leave", { method: "POST", body: { type, startDate, endDate } });
      setLeaveRequests((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      setLeaveSubmitError(err.message || "Couldn't submit request");
      return false;
    } finally {
      setLeaveSubmitBusy(false);
    }
  };

  const handleOnboardingToggle = async (step) => {
    try {
      const updated = await api(`/onboarding/${step._id}`, { method: "PATCH", body: { done: !step.done } });
      setOnboardingSteps((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    } catch {
      // silently ignore in this demo — could surface a toast here
    }
  };

  const handleAdminDecision = async (id, status) => {
    try {
      const updated = await api(`/admin/leave/${id}`, { method: "PATCH", body: { status } });
      setAdminLeave((prev) => prev.map((item) => item._id === id ? updated : item));
      setAdminStats((prev) => prev ? { ...prev, pendingLeave: Math.max(0, prev.pendingLeave - 1) } : prev);
    } catch (err) {
      setAdminError(err.message || "Couldn't update leave request");
    }
  };

  const handleAdminEmployeeSave = async (draft, id) => {
    setAdminError("");
    try {
      const saved = await api(id ? `/admin/employees/${id}` : "/admin/employees", {
        method: id ? "PATCH" : "POST",
        body: draft,
      });
      setAdminEmployees((prev) => id
        ? prev.map((person) => person._id === id ? saved : person).sort((a, b) => a.name.localeCompare(b.name))
        : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      if (!id) setAdminStats((prev) => prev ? { ...prev, employees: prev.employees + 1, managers: prev.managers + (saved.isManager ? 1 : 0) } : prev);
      return true;
    } catch (err) {
      setAdminError(err.message || "Couldn't save employee");
      return false;
    }
  };

  const handleAdminEmployeeDelete = async (person) => {
    setAdminError("");
    try {
      await api(`/admin/employees/${person._id}`, { method: "DELETE" });
      setAdminEmployees((prev) => prev.filter((item) => item._id !== person._id));
      setAdminStats((prev) => prev ? {
        ...prev,
        employees: Math.max(0, prev.employees - 1),
        managers: Math.max(0, prev.managers - (person.isManager ? 1 : 0)),
      } : prev);
    } catch (err) {
      setAdminError(err.message || "Couldn't delete employee");
    }
  };

  const goTab = (t) => {
    setMoreScreen(null);
    setTab(t);
  };

  if (!token || !employee) {
    return (
      <AppFrame>
        <LoginScreen onLogin={handleLogin} apiBase={apiBase} setApiBase={setApiBase} loading={authLoading} error={authError} />
      </AppFrame>
    );
  }

  if (tab !== "admin") {
    return (
      <AppFrame>
        <MobilePortal
          api={api}
          employee={employee}
          attendance={attendance}
          payslips={payslips}
          directory={directory}
          todayRecord={todayRecord}
          onClock={handleClock}
          clockBusy={clockBusy}
          error={clockError || dataError}
          onOpenAdmin={() => setTab("admin")}
          onSignOut={handleSignOut}
        />
      </AppFrame>
    );
  }

  if (["admin", "hr_admin"].includes(employee.accessLevel)) {
    return <AppFrame desktop><AdminSuite api={api} onExit={() => goTab("home")} /></AppFrame>;
  }
  return <AppFrame><div className="error-note">This account does not have access to administration.</div></AppFrame>;

  let body;
  if (tab === "more" && moreScreen) {
    const back = () => setMoreScreen(null);
    body =
      moreScreen === "directory" ? <DirectoryScreen onBack={back} directory={directory} loading={dataLoading} error={dataError} /> :
      moreScreen === "performance" ? <PerformanceScreen onBack={back} goals={goals} loading={dataLoading} error={dataError} /> :
      moreScreen === "onboarding" ? <OnboardingScreen onBack={back} steps={onboardingSteps} loading={dataLoading} error={dataError} onToggle={handleOnboardingToggle} /> :
      moreScreen === "benefits" ? <BenefitsScreen onBack={back} benefits={benefits} loading={dataLoading} error={dataError} /> :
      moreScreen === "recruitment" ? <RecruitmentScreen onBack={back} openings={openings} loading={dataLoading} error={dataError} /> : null;
  } else if (tab === "home") {
    body = (
      <HomeScreen
        employee={employee}
        goTab={goTab}
        todayRecord={todayRecord}
        onClock={handleClock}
        clockBusy={clockBusy}
        leaveRequests={leaveRequests}
        loading={dataLoading}
        error={dataError || clockError}
      />
    );
  } else if (tab === "attendance") {
    body = (
      <AttendanceScreen
        attendance={attendance}
        todayRecord={todayRecord}
        onClock={handleClock}
        clockBusy={clockBusy}
        loading={dataLoading}
        error={clockError || dataError}
      />
    );
  } else if (tab === "leave") {
    body = (
      <Requests api={api}
        employee={employee}
        leaveRequests={leaveRequests}
        loading={dataLoading}
        error={dataError}
        onSubmit={handleLeaveSubmit}
        submitBusy={leaveSubmitBusy}
        submitError={leaveSubmitError}
      />
    );
  } else if (tab === "pay") {
    body = <PayScreen payslips={payslips} loading={dataLoading} error={dataError} />;
  } else if (tab === "more") {
    body = <MoreScreen open={setMoreScreen} employee={employee} onSignOut={handleSignOut} />;
  } else if (tab === "admin" && ["admin", "hr_admin"].includes(employee.accessLevel)) {
    body = <AdminSuite api={api} onExit={() => goTab("home")} />;
  }

  const NAV = [
    { key: "home", icon: Home, label: "Home" },
    { key: "attendance", icon: Clock, label: "Time" },
    { key: "leave", icon: Calendar, label: "Leave" },
    { key: "pay", icon: Wallet, label: "Pay" },
    { key: "more", icon: Grid3x3, label: "More" },
    ...(["admin", "hr_admin"].includes(employee.accessLevel) ? [{ key: "admin", icon: ShieldCheck, label: "Admin" }] : []),
  ];

  return (
    <AppFrame desktop={tab === "admin"}>
      {body}
      {tab !== "admin" && <div className="navbar">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = tab === n.key;
          return (
            <button key={n.key} className={`nav-btn ${active ? "active" : ""}`} onClick={() => goTab(n.key)}>
              <Icon size={20} />
              <span className="nav-btn-label">{n.label}</span>
            </button>
          );
        })}
      </div>}
    </AppFrame>
  );
}

function AppFrame({ children, desktop = false }) {
  return (
    <div className="app-outer">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

        :root {
          --bg: #EEF1EE;
          --surface: #FFFFFF;
          --surface-alt: #E4E9E1;
          --ink: #1B3A34;
          --ink-soft: #5B6B65;
          --accent: #E2632E;
          --accent-soft: #FBE4D8;
          --gold: #C9A227;
          --gold-soft: #F5EBC7;
          --moss: #3E7C59;
          --moss-soft: #E1EFE5;
          --brick: #B23A48;
          --brick-soft: #F6DEE1;
          --line: #DCE2DA;
        }
        * { box-sizing: border-box; }
        .app-outer {
          background: var(--bg);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }
        .app-shell {
          width: 100%;
          max-width: 430px;
          min-height: 100vh;
          background: var(--bg);
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .app-shell.desktop {
          max-width: 1600px;
          width: 100%;
          background: var(--bg);
        }
        .screen { flex: 1; padding-bottom: 96px; animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
        .content-pad { padding: 4px 20px 20px; }
        .login-connection { display:flex; align-items:center; gap:10px; margin:2px 0 18px; padding:12px; border-radius:12px; border:1px solid var(--line); background:var(--surface); }
        .login-connection>div { min-width:0; flex:1; display:flex; flex-direction:column; gap:2px; }
        .login-connection b { font-size:12px; }
        .login-connection small { color:var(--ink-soft); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .connection-dot { width:10px; height:10px; border-radius:50%; flex:0 0 auto; }
        .login-connection.online .connection-dot { background:var(--moss); box-shadow:0 0 0 4px var(--moss-soft); }
        .login-connection.offline .connection-dot { background:var(--brick); box-shadow:0 0 0 4px var(--brick-soft); }
        .login-connection.checking .connection-dot { background:var(--gold); box-shadow:0 0 0 4px var(--gold-soft); animation:pulse 1s infinite alternate; }
        @keyframes pulse { to { opacity:.4; } }

        .hero { padding: 22px 20px 12px; }
        .hero-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); }
        .hero-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 30px; margin: 4px 0 16px; }
        .hero-arc-row { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border-radius: 20px; padding: 16px 18px; box-shadow: 0 1px 0 var(--line); }
        .hero-arc-row.centered { justify-content: center; margin: 8px 0 0; }
        .hero-clock-block { text-align: right; }
        .hero-clock-time { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; max-width: 140px; }
        .clock-time-big { font-family: 'IBM Plex Mono', monospace; text-align: center; font-size: 14px; color: var(--ink-soft); margin: 10px 0 14px; }

        .dayarc-wrap { position: relative; width: 140px; height: 84px; }
        .dayarc-label { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; }
        .dayarc-num { font-family: 'Fraunces', serif; font-weight: 600; font-size: 20px; }
        .dayarc-sub { font-size: 10px; color: var(--ink-soft); }

        .clock-btn { background: var(--ink); color: #fff; border: none; padding: 10px 18px; border-radius: 100px; font-weight: 600; font-size: 13px; cursor: pointer; }
        .clock-btn-out { background: var(--brick); }
        .clock-btn:disabled { opacity: 0.6; cursor: default; }
        .clock-btn.full { width: 100%; padding: 14px; font-size: 15px; }
        .geo-note { display: flex; gap: 6px; align-items: center; justify-content: center; font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }

        .meridian { height: 1px; margin: 22px 20px; background: linear-gradient(90deg, var(--accent), transparent); }
        .content-pad .meridian { margin-left: 0; margin-right: 0; }

        .section-label-row { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; margin-bottom: 10px; }
        .content-pad .section-label-row { padding: 0; }
        .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-soft); }
        .link-btn { background: none; border: none; color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }

        .balance-row { display: flex; gap: 10px; padding: 0 20px; }
        .content-pad .balance-row { padding: 0; margin-bottom: 16px; }
        .balance-card { flex: 1; background: var(--surface); border-radius: 16px; padding: 14px 8px; text-align: center; }
        .balance-num { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 600; color: var(--ink); }
        .balance-label { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }

        .quick-grid, .more-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 0 20px; }
        .content-pad .quick-grid, .content-pad .more-grid { padding: 0; }
        .more-grid { grid-template-columns: repeat(3, 1fr); }
        .quick-tile { background: var(--surface); border: none; border-radius: 16px; padding: 14px 6px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
        .quick-icon { color: var(--accent); }
        .quick-label { font-size: 11px; font-weight: 600; text-align: center; }

        .list-card { background: var(--surface); border-radius: 16px; margin: 0 20px; overflow: hidden; }
        .content-pad .list-card { margin: 0; }
        .list-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); width: 100%; background: none; border-left: none; border-right: none; border-top: none; text-align: left; }
        .list-row:last-child { border-bottom: none; }
        .list-row-btn { cursor: pointer; }
        .list-row-title { font-size: 14px; font-weight: 600; }
        .list-row-title.done { color: var(--ink-soft); text-decoration: line-through; }
        .list-row-sub { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
        .row-with-avatar { display: flex; align-items: center; gap: 10px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }

        .pill { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 100px; white-space: nowrap; }
        .pill-moss { background: var(--moss-soft); color: var(--moss); }
        .pill-gold { background: var(--gold-soft); color: #8a6d10; }
        .pill-brick { background: var(--brick-soft); color: var(--brick); }

        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px 14px; position: sticky; top: 0; background: var(--bg); z-index: 5; }
        .topbar-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px; }
        .icon-btn { background: var(--surface); border: none; width: 34px; height: 34px; border-radius: 100px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .avatar-sm { width: 34px; height: 34px; border-radius: 100px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; }
        .avatar-lg { width: 52px; height: 52px; border-radius: 100px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; }

        .primary-btn { width: auto; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--accent); color: #fff; border: none; padding: 13px 18px; border-radius: 14px; font-weight: 600; font-size: 14px; cursor: pointer; margin-bottom: 8px; }
        .primary-btn.full { width: 100%; }
        .primary-btn:disabled { opacity: 0.6; cursor: default; }

        .goal-row { padding: 14px 16px; border-bottom: 1px solid var(--line); }
        .goal-row:last-child { border-bottom: none; }
        .progress-track { height: 6px; background: var(--surface-alt); border-radius: 100px; margin: 8px 0 6px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--accent)); border-radius: 100px; }

        .payslip-net { background: var(--ink); color: #fff; border-radius: 18px; padding: 22px; text-align: center; }
        .payslip-net-label { font-size: 12px; opacity: 0.7; font-family: 'IBM Plex Mono', monospace; }
        .payslip-net-num { font-family: 'Fraunces', serif; font-size: 34px; font-weight: 600; margin-top: 4px; }

        .search-row { display: flex; align-items: center; gap: 8px; background: var(--surface); border-radius: 12px; padding: 11px 14px; margin-bottom: 14px; }
        .search-input { border: none; outline: none; background: none; font-size: 14px; flex: 1; font-family: 'Inter', sans-serif; color: var(--ink); }

        .profile-card { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: 16px; padding: 16px; }
        .profile-name { font-family: 'Fraunces', serif; font-weight: 600; font-size: 16px; }
        .profile-role { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
        .signout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: none; border: 1px solid var(--line); padding: 12px; border-radius: 14px; color: var(--brick); font-weight: 600; font-size: 13px; cursor: pointer; }

        .navbar { position: sticky; bottom: 0; display: flex; background: var(--surface); border-top: 1px solid var(--line); padding: 10px 8px calc(10px + env(safe-area-inset-bottom)); }
        .nav-btn { flex: 1; background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; color: var(--ink-soft); padding: 4px 0; }
        .nav-btn.active { color: var(--accent); }
        .nav-btn-label { font-size: 10px; font-weight: 600; }
        .admin-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .admin-metric { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
        .admin-metric-value { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 600; }
        .admin-metric-label { color: var(--ink-soft); font-size: 12px; margin-top: 2px; }
        .admin-leave-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 14px; border-bottom: 1px solid var(--line); }
        .admin-leave-row:last-child { border-bottom: 0; }
        .admin-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .admin-approve, .admin-decline { border: 0; border-radius: 8px; padding: 7px 9px; color: white; font-size: 11px; font-weight: 700; cursor: pointer; }
        .admin-approve { background: var(--moss); }
        .admin-decline { background: var(--brick); }
        .admin-edit { border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 8px; padding: 7px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .admin-delete { border: 1px solid var(--brick); background: var(--brick-soft); color: var(--brick); border-radius: 8px; padding: 7px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .admin-employee-form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
        .admin-checkbox { display: flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 12px; }
        .admin-form-actions { display: flex; align-items: center; gap: 8px; grid-column: 1 / -1; }
        .secondary-btn { border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 10px; padding: 10px 14px; font-weight: 700; cursor: pointer; }
        @media (max-width: 560px) { .admin-employee-form { grid-template-columns: 1fr; } .admin-form-actions { grid-column: auto; } }

        .sheet-overlay { position: fixed; inset: 0; background: rgba(27,58,52,0.35); display: flex; align-items: flex-end; justify-content: center; z-index: 20; }
        .sheet { background: var(--surface); width: 100%; max-width: 430px; border-radius: 22px 22px 0 0; padding: 10px 20px 26px; animation: slideUp 0.25s ease; }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0;} to { transform: translateY(0); opacity: 1; } }
        .sheet-handle { width: 36px; height: 4px; background: var(--line); border-radius: 100px; margin: 4px auto 14px; }
        .sheet-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px; margin-bottom: 16px; }
        .field-label { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin-bottom: 8px; margin-top: 14px; }
        .chip-row { display: flex; gap: 8px; }
        .chip { background: var(--surface-alt); border: none; padding: 8px 14px; border-radius: 100px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--ink-soft); }
        .chip-active { background: var(--ink); color: #fff; }
        .text-input { width: 100%; background: var(--surface-alt); border: none; border-radius: 12px; padding: 12px 14px; font-size: 14px; font-family: 'Inter', sans-serif; color: var(--ink); outline: none; }

        .login-screen { padding-top: 10px; }
        .login-hero { padding: 30px 20px 10px; }
        .login-sub { font-size: 13px; color: var(--ink-soft); margin-top: 6px; }
        .settings-toggle { margin: 14px auto 0; display: flex; justify-content: center; width: 100%; }
        .settings-box { background: var(--surface); border-radius: 14px; padding: 14px; margin-top: 12px; }
        .settings-hint { font-size: 11px; color: var(--ink-soft); margin-top: 8px; line-height: 1.5; }
        .demo-hint { font-size: 12px; color: var(--ink-soft); margin-top: 22px; text-align: center; line-height: 1.6; }

        .error-note { display: flex; align-items: center; gap: 6px; background: var(--brick-soft); color: var(--brick); font-size: 12px; font-weight: 600; padding: 10px 12px; border-radius: 10px; margin: 10px 0; }
        .empty-note { font-size: 13px; color: var(--ink-soft); padding: 16px; text-align: center; background: var(--surface); border-radius: 16px; }
      `}</style>
      <div className={`app-shell ${desktop ? "desktop" : ""}`}>{children}</div>
    </div>
  );
}
