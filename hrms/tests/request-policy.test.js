const test = require('node:test');
const assert = require('node:assert/strict');
const { details } = require('../services/request-policy');
const leave = type => details({ type, startDate:'2026-09-14', endDate:'2026-09-16' });
test('Personal, Vacation and Emergency use annual balance', () => {
  for(const type of ['Personal','Vacation','Emergency']) { assert.equal(leave(type).balanceKey,'annual'); assert.equal(leave(type).days,3); }
});
test('Sick uses sick balance; Funeral does not deduct',()=>{assert.equal(leave('Sick').balanceKey,'sick');assert.equal(leave('Funeral').balanceKey,null);});
test('Invalid dates and retired types rejected',()=>{assert.throws(()=>details({type:'Sick',startDate:'2026-02-30'}));assert.throws(()=>leave('Annual'));assert.throws(()=>leave('WFH'));});
test('Excuses are exactly two hours without day deduction',()=>{const r=details({kind:'Excuse',startDate:'2026-09-14',startTime:'10:30',hours:1});assert.equal(r.hours,2);assert.equal(r.balanceKey,null);assert.equal(r.month,'2026-09');});
test('Excuses crossing midnight rejected',()=>assert.throws(()=>details({kind:'Excuse',startDate:'2026-09-14',startTime:'23:00'})));
test('Half-day leave deducts half a day and must use one date',()=>{const row=details({type:'Vacation',duration:'Half Day',startDate:'2026-09-14',endDate:'2026-09-14'});assert.equal(row.days,.5);assert.throws(()=>details({type:'Vacation',duration:'Half Day',startDate:'2026-09-14',endDate:'2026-09-15'}));});
test('Timed leave calculates a fractional eight-hour day',()=>{const row=details({type:'Personal',duration:'Time',startDate:'2026-09-14',endDate:'2026-09-14',startTime:'09:00',endTime:'11:00'});assert.equal(row.hours,2);assert.equal(row.days,.25);});
