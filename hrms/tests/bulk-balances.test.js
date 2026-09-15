const test = require("node:test");
const assert = require("node:assert/strict");
const router = require("../routes/requests");
const Account = require("../models/RequestAccount");
const Employee = require("../models/Employee");

function response() {
  return {
    code: 200,
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; return this; },
    sendStatus(value) { this.code = value; return this; }
  };
}

async function call(req) {
  const res = response();
  const layer = router.stack.find(item => item.route?.path === "/balances/all" && item.route.methods.put);
  await layer.route.stack[0].handle(req, res);
  return res;
}

test("an administrator can replace every employee balance", async () => {
  const original = { find: Employee.find, updateMany: Employee.updateMany, bulkWrite: Account.bulkWrite };
  let operations;
  let legacyUpdate;
  try {
    Employee.find = () => ({ select: async () => [{ _id: "employee-1" }, { _id: "employee-2" }] });
    Account.bulkWrite = async value => { operations = value; };
    Employee.updateMany = async (...value) => { legacyUpdate = value; };

    const res = await call({ person: { accessLevel: "hr_admin" }, body: { annual: 24, sick: 6 } });
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, { updated: 2, annual: 24, sick: 6 });
    assert.equal(operations.length, 2);
    assert.deepEqual(operations[0].updateOne.update.$set, { annual: 24, sick: 6 });
    assert.equal(operations[0].updateOne.upsert, true);
    assert.deepEqual(legacyUpdate[1].$set, { "leaveBalance.annual": 24, "leaveBalance.sick": 6 });

    const invalid = await call({ person: { accessLevel: "hr_admin" }, body: { annual: -1, sick: 6 } });
    assert.equal(invalid.code, 400);
  } finally {
    Employee.find = original.find;
    Employee.updateMany = original.updateMany;
    Account.bulkWrite = original.bulkWrite;
  }
});
