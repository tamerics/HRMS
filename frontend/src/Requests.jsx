import { useEffect, useState } from 'react';

export function ApprovalSettings({ api }) {
  const [data, setData] = useState(null), [message, setMessage] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(''), [selectedManager, setSelectedManager] = useState(''), [savingManager, setSavingManager] = useState(false);
  useEffect(() => { api('/requests/configuration').then(setData).catch(e => setMessage(e.message)); }, [api]);
  return <section className="admin-card"><h3>Two-level approval settings</h3><p>Direct manager first, then the selected general manager. Approvers must be different employees.</p>
    {data && <form onSubmit={async e => { e.preventDefault(); try { await api('/requests/configuration', { method:'PUT', body:{generalManager:data.generalManager} }); setMessage('Approval settings saved'); } catch(e) { setMessage(e.message); } }}>
      <label>General manager<select required className="text-input" value={data.generalManager} onChange={e=>setData({...data,generalManager:e.target.value})}><option value="">Select general manager</option>{data.employees.map(e=><option key={e._id} value={e._id}>{e.name} — {e.department}</option>)}</select></label><button className="primary-btn">Save approval settings</button>
    </form>}
    {data && <form style={{marginTop:24,display:'grid',gap:10}} onSubmit={async e=>{
      e.preventDefault();setSavingManager(true);setMessage('');
      try {
        const result=await api('/requests/configuration/direct-manager',{method:'PUT',body:{employee:selectedEmployee,manager:selectedManager}});
        setData(current=>({...current,employees:current.employees.map(p=>p._id===result.employee?{...p,manager:result.manager}:p)}));
        setMessage('Direct manager saved. Applies to new requests.');
      }catch(e){setMessage(e.message);}finally{setSavingManager(false);}
    }}>
      <h3>Direct manager per employee</h3>
      <label>Employee<select required disabled={savingManager} className="text-input" value={selectedEmployee} onChange={e=>{setSelectedEmployee(e.target.value);setSelectedManager(data.employees.find(p=>p._id===e.target.value)?.manager||'');}}><option value="">Select employee</option>{data.employees.map(p=><option key={p._id} value={p._id}>{p.name} — {p.department}</option>)}</select></label>
      <label>Direct manager<select disabled={!selectedEmployee||savingManager} className="text-input" value={selectedManager} onChange={e=>setSelectedManager(e.target.value)}><option value="">Not assigned</option>{data.employees.filter(p=>p._id!==selectedEmployee).map(p=><option key={p._id} value={p._id}>{p.name} — {p.department}</option>)}</select></label>
      <button className="primary-btn" disabled={!selectedEmployee||savingManager}>{savingManager?'Saving…':'Save direct manager'}</button>
      <small>Requests already submitted keep their original approvers. A direct manager must differ from the employee and general manager.</small>
    </form>}
    <p role="status">{message}</p><p>New employees: 24 annual days and 6 sick days. Existing remaining balances are preserved. Funeral leave and excuses do not deduct days.</p></section>;
}

function Balances({api}) {
  const [rows,setRows]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[all,setAll]=useState({annual:24,sick:6});
  const reload=()=>api('/requests/balances').then(setRows);
  useEffect(()=>{reload().catch(e=>setMessage(e.message));},[api]);
  const setEveryone=async e=>{
    e.preventDefault();
    if(!window.confirm(`Replace the remaining balances for all ${rows.length} employees with Annual ${all.annual} and Sick ${all.sick}?`)) return;
    setBusy(true);setMessage('');
    try {
      const result=await api('/requests/balances/all',{method:'PUT',body:all});
      await reload();
      setMessage(`Updated ${result.updated} employees to Annual ${result.annual} and Sick ${result.sick}.`);
    } catch(e) { setMessage(e.message); } finally { setBusy(false); }
  };
  return <section className="admin-card"><h3>Employee balances</h3>
    <form className="admin-form" style={{marginBottom:20,paddingBottom:20,borderBottom:'1px solid #dce2dc'}} onSubmit={setEveryone}>
      <h4 style={{gridColumn:'1 / -1',margin:0}}>Set everyone to the same balance</h4>
      {['annual','sick'].map(key=><label key={key}>{key}<input className="text-input" aria-label={`All employees ${key}`} type="number" min="0" step="0.5" required value={all[key]} onChange={e=>setAll({...all,[key]:e.target.value})}/></label>)}
      <button disabled={busy||rows.length===0} className="primary-btn">{busy?'Updating…':`Set balance for all ${rows.length} employees`}</button>
      <small style={{gridColumn:'1 / -1'}}>This replaces each employee’s remaining Annual and Sick balance. It does not add to the current balance.</small>
    </form>
    <p role="status">{message}</p>{rows.map((r,index)=><form key={r.employee} style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'end',marginBottom:14}} onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api(`/admin/employees/${r.employee}/balance`,{method:'PATCH',body:{annual:r.annual,sick:r.sick}});setMessage(`Saved ${r.name}`);}catch(e){setMessage(e.message);}finally{setBusy(false);}}}><b style={{flexBasis:'100%'}}>{r.name}</b>{['annual','sick'].map(key=><label key={key}>{key}<input aria-label={`${r.name} ${key}`} style={{width:76}} type="number" min="0" step="0.5" required value={r[key]} onChange={e=>setRows(rows.map((x,i)=>i===index?{...x,[key]:e.target.value}:x))}/></label>)}<button disabled={busy} className="admin-small-btn">Save balances</button></form>)}</section>;
}

export default function Requests({ api }) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [draft,setDraft]=useState({kind:'Leave',type:'Vacation',startDate:'',endDate:'',startTime:'09:00',reason:''});
  const [history,setHistory]=useState([]);
  const [period,setPeriod]=useState({from:'',to:''});
  const filtered=(data?.requests||[]).filter(r=>(!period.from||r.endDate>=period.from)&&(!period.to||r.startDate<=period.to));
  const exportReport=()=>{
    const cell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
    const rows=[['Employee','Category','Type','From','To','Time','Hours','Days','Status','Approval stage'],...filtered.map(r=>[r.employee?.name,r.kind,r.type,r.startDate,r.endDate,r.startTime,r.hours,r.days,r.status,r.stage])];
    const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='leave-excuse-report.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const load=()=>api('/requests').then(setData);
  useEffect(()=>{load().catch(e=>setError(e.message)); api('/leave').then(setHistory).catch(()=>{});},[api]);
  const run=async fn=>{setBusy(true);setError('');try{await fn();await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const field=(name,label,type='text')=><label>{label}<input className="text-input" type={type} required={name!=='reason'} value={draft[name]} onChange={e=>setDraft({...draft,[name]:e.target.value})}/></label>;
  const row=r=><article className="admin-card" key={r._id}><strong>{r.employee?.name || 'My request'} · {r.type}</strong><p>{r.startDate} → {r.endDate}{r.kind==='Excuse'?` · ${r.startTime} · 2 hours`:` · ${r.days} days`}</p><p>{r.reason}</p><p><b>{r.status}</b> · {r.stage}</p>{(r.decisions||[]).map((d,i)=><small style={{display:'block'}} key={i}>{d.stage}: {d.decision} · {new Date(d.at).toLocaleString()}</small>)}{r.canDecide&&<div className="admin-row-actions">{['Approved','Declined'].map(status=><button className="admin-small-btn" disabled={busy} key={status} onClick={()=>run(()=>api(`/requests/${r._id}/decision`,{method:'PATCH',body:{status,stage:r.stage}}))}>{status==='Approved'?'Approve':'Decline'}</button>)}</div>}</article>;
  return <div className="content-pad requests-workflow"><h2>Leave and excuses</h2>{error&&<p className="error-note" role="alert">{error}</p>}{!data?<p>Loading requests…</p>:<>
    <section className="admin-card"><b>Annual: {data.balances.annual} days · Sick: {data.balances.sick} days</b><p>Personal, Vacation and Emergency use annual days. Funeral is not deducted.</p></section>
    <section className="admin-card"><h3>New request</h3><form className="admin-form" onSubmit={e=>{e.preventDefault();run(()=>api('/requests',{method:'POST',body:{...draft,endDate:draft.kind==='Excuse'?draft.startDate:draft.endDate}}));}}>
      <label>Request category<select className="text-input" value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value})}><option>Leave</option><option>Excuse</option></select></label>
      {draft.kind==='Leave'&&<label>Leave type<select className="text-input" value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{data.types.map(t=><option key={t}>{t}</option>)}</select></label>}
      {field('startDate',draft.kind==='Excuse'?'Excuse date':'Start date','date')}{draft.kind==='Leave'?field('endDate','End date','date'):field('startTime','Start time (two hours)','time')}{field('reason','Reason')}
      <button className="primary-btn" disabled={busy}>{busy?'Saving…':'Submit request'}</button></form><p>Two excuses per calendar month, two hours each. Pending, approved and rejected requests all count. Both approval levels are required.</p></section>
    <h3>Waiting for my decision</h3>{data.requests.filter(r=>r.canDecide).map(row)}{!data.requests.some(r=>r.canDecide)&&<p>No requests awaiting your decision.</p>}
    <h3>Requests and approval history</h3><div className="admin-form"><label>Period from<input className="text-input" type="date" value={period.from} onChange={e=>setPeriod({...period,from:e.target.value})}/></label><label>Period to<input className="text-input" type="date" value={period.to} onChange={e=>setPeriod({...period,to:e.target.value})}/></label></div><button className="admin-small-btn" onClick={exportReport}>Export filtered report CSV</button>{filtered.map(row)}
    {data.administrator&&<Balances api={api}/>}
    {history.length>0&&<details><summary>Previous leave records (before two-level approval)</summary><p>Previous pending requests require resubmission using the new form.</p>{history.map(r=><p key={r._id}>{r.type} · {r.startDate} → {r.endDate} · {r.status}</p>)}</details>}
  </>}<style>{`.requests-workflow{min-width:0}.requests-workflow .admin-card{background:white;padding:16px;border:1px solid #dce2dc;border-radius:14px;margin-bottom:12px}.requests-workflow .admin-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.requests-workflow label{display:grid;gap:6px}.requests-workflow p{overflow-wrap:anywhere}.requests-workflow .admin-row-actions{display:flex;gap:8px}@media(max-width:650px){.requests-workflow .admin-form{grid-template-columns:1fr}}`}</style></div>;
}
