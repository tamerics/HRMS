const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "Employee" }, // job title
    department: { type: String, default: "General" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    employmentStatus: { type: String, enum: ["Active", "Inactive", "On leave"], default: "Active" },
    hireDate: { type: String, default: "" },
    employeeNo: { type: String, default: "" },
    gender: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    country: { type: String, default: "" },
    nationalId: { type: String, default: "" },
    oldNationalId: { type: String, default: "" },
    passport: { type: String, default: "" },
    immigrationNo: { type: String, default: "" },
    phone1: { type: String, default: "" },
    phone2: { type: String, default: "" },
    mobile: { type: String, default: "" },
    traveller: { type: Boolean, default: false },
    family: [{ name: String, relationship: String, phone: String }],
    allowances: [{ name: String, amount: Number }],
    payrollProfile: {
      epfNo: { type: String, default: "" }, socsoType: { type: String, default: "" },
      eisType: { type: String, default: "" }, taxResident: { type: String, default: "" },
      taxCategory: { type: String, default: "" }, selfDisabled: { type: String, default: "" },
      wages: { type: Number, default: 0 }, taxNo: { type: String, default: "" },
      paymentMethod: { type: String, default: "" }, eaSerialNo: { type: String, default: "" },
      bank: { type: String, default: "" }, bankAccount: { type: String, default: "" },
      maritalStatus: { type: String, default: "" },
    },
    deviceUserId: { type: String, default: "", trim: true },
    isManager: { type: Boolean, default: false },
    accessLevel: { type: String, enum: ["employee", "manager", "hr_admin", "admin"], default: "employee" },
    leaveBalance: {
      annual: { type: Number, default: 24 },
      sick: { type: Number, default: 6 },
      wfh: { type: Number, default: 3 },
    },
  },
  { timestamps: true }
);

// Never send the password hash back in API responses
employeeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model("Employee", employeeSchema);
