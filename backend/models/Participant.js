const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  category: { type: String },
  teamName: { type: String },
  regNo: { type: String },
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Participant", ParticipantSchema);