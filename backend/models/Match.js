const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  matchIndex: Number,
  round: Number,
  category: String, // Men's Singles, Men's Doubles, Mixed Doubles
  player1: String,
  player2: String,
  player1Seed: Number,
  player2Seed: Number,
  player1From: Number,
  player2From: Number,
  isBye: { type: Boolean, default: false },
  startTime: Date,
  endTime: Date,
  court: Number,
  winner: String,
  score1: { type: Number, default: 0 },
  score2: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'live', 'completed'], default: 'pending' },
  isCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Match", MatchSchema);