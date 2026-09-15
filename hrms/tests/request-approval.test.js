const test=require('node:test'), assert=require('node:assert/strict');
const router=require('../routes/requests'), Account=require('../models/RequestAccount'), Employee=require('../models/Employee'), Settings=require('../models/CompanySettings');
const applicant='111111111111111111111111',direct='222222222222222222222222',general='333333333333333333333333';
function response(){return {code:200,status(n){this.code=n;return this;},json(v){this.body=v;return this;},sendStatus(n){this.code=n;return this;}};}
async function call(path,method,req){const res=response();await router.stack.find(s=>s.route?.path===path&&s.route.methods[method]).route.stack[0].handle(req,res);return res;}
test('Two-stage workflow, authorization, Funeral, rejection quota and duplicate decisions',async()=>{
  const old={find:Account.findOne,employee:Employee.findById,settings:Settings.findOne};
  try {
    Employee.findById=async id=>({_id:id,employmentStatus:'Active'});
    Settings.findOne=async()=>({generalManager:general});
    const a=new Account({employee:applicant,annual:24,sick:6});
    a.save=async()=>a;
    Account.findOne=async()=>a;
    const person={_id:applicant,manager:direct};
    let res=await call('/','post',{person,body:{type:'Vacation',startDate:'2026-09-15',endDate:'2026-09-17'}});
    assert.equal(res.code,201);
    const r=a.requests[0],params={id:String(r._id)};
    res=await call('/:id/decision','patch',{person:{_id:general},params,body:{status:'Approved',stage:'Direct manager'}});
    assert.equal(res.code,403);
    res=await call('/:id/decision','patch',{person:{_id:direct},params,body:{status:'Approved',stage:'Direct manager'}});
    assert.equal(res.code,200);assert.equal(r.stage,'General manager');assert.equal(r.status,'Pending');assert.equal(a.annual,24);
    res=await call('/:id/decision','patch',{person:{_id:general},params,body:{status:'Approved',stage:'General manager'}});
    assert.equal(res.code,200);assert.equal(a.annual,21);assert.equal(r.status,'Approved');assert.equal(r.decisions.length,2);
    await call('/:id/decision','patch',{person:{_id:general},params,body:{status:'Approved',stage:'General manager'}});
    assert.equal(a.annual,21);
    await call('/','post',{person,body:{type:'Funeral',startDate:'2026-09-20',endDate:'2026-09-22'}});
    const funeral=a.requests[1];
    for(const [id,stage] of [[direct,'Direct manager'],[general,'General manager']]) await call('/:id/decision','patch',{person:{_id:id},params:{id:String(funeral._id)},body:{status:'Approved',stage}});
    assert.equal(a.annual,21);assert.equal(a.sick,6);
    for(let i=0;i<2;i++) {
      res=await call('/','post',{person,body:{kind:'Excuse',startDate:'2026-09-25',startTime:'10:00'}});
      assert.equal(res.code,201);const excuse=a.requests[a.requests.length-1];
      await call('/:id/decision','patch',{person:{_id:direct},params:{id:String(excuse._id)},body:{status:'Declined',stage:'Direct manager'}});
    }
    res=await call('/','post',{person,body:{kind:'Excuse',startDate:'2026-09-26',startTime:'10:00'}});
    assert.equal(res.code,400);assert.match(res.body.error,/including rejected/);
    res=await call('/','post',{person,body:{kind:'Excuse',startDate:'2026-10-01',startTime:'10:00'}});assert.equal(res.code,201);
    assert.equal(Account.schema.options.optimisticConcurrency,true);
  } finally {Account.findOne=old.find;Employee.findById=old.employee;Settings.findOne=old.settings;}
});
