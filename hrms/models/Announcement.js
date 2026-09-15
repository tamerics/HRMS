const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 160 }, body: { type: String, maxlength: 4000, default: "" },
  published: { type: Boolean, default: true }, publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model("Announcement", schema);
