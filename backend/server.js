require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./db");
const Match = require("./models/Match");
const Participant = require("./models/Participant");
console.log("ENV CHECK:", process.env.MONGODB_URI);
dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend - fixed path
app.use(express.static(path.join(__dirname, "public")));

// Routes

// Add participant
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, phone, category, teamName, regNo } = req.body;
    const participant = new Participant({ name, email, phone, category, teamName, regNo });
    await participant.save();
    res.json({ message: "Registered successfully", participant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate tournament schedule for all categories
app.post("/api/generate-tournament", async (req, res) => {
  try {
    await Match.deleteMany({});

    const categories = ["Men's Singles", "Men's Doubles", "Mixed Doubles"];
    let totalMatches = 0;

    for (const category of categories) {
      let currentPlayers = [];
      for (let i = 1; i <= 33; i++) {
        currentPlayers.push({ seed: i, fromMatch: null });
      }

      let round = 1;
      let matchGlobalIndex = 1;
      let startTime = new Date();
      startTime.setHours(10, 0, 0, 0);

      while (currentPlayers.length > 1) {
        let roundMatches = [];
        let nextRoundPlayers = [];
        let isLastTwoRounds = (currentPlayers.length <= 3);
        let matchDuration = isLastTwoRounds ? 30 : 15;

        if (currentPlayers.length % 2 !== 0) {
          const byePlayer = currentPlayers.splice(currentPlayers.length - 1, 1)[0];
          const matchIdx = matchGlobalIndex++;
          const byeMatch = new Match({
            matchIndex: matchIdx,
            round: round,
            category: category,
            player1: `Player ${byePlayer.seed}`,
            player1Seed: byePlayer.seed,
            player1From: byePlayer.fromMatch,
            player2: "BYE",
            isBye: true,
            startTime: null,
            endTime: null,
            court: null
          });
          await byeMatch.save();
          nextRoundPlayers.push({ seed: byePlayer.seed, fromMatch: matchIdx });
          totalMatches++;
        }

        for (let i = 0; i < currentPlayers.length; i += 2) {
          roundMatches.push({ p1: currentPlayers[i], p2: currentPlayers[i + 1] });
        }

        for (let i = 0; i < roundMatches.length; i++) {
          const court = (i % 2) + 1;
          const slotIndex = Math.floor(i / 2);
          const mStartTime = new Date(startTime);
          mStartTime.setMinutes(startTime.getMinutes() + (slotIndex * matchDuration));
          const mEndTime = new Date(mStartTime);
          mEndTime.setMinutes(mStartTime.getMinutes() + matchDuration);

          const matchIdx = matchGlobalIndex++;
          const match = new Match({
            matchIndex: matchIdx,
            round: round,
            category: category,
            player1: `Player ${roundMatches[i].p1.seed}`,
            player1Seed: roundMatches[i].p1.seed,
            player1From: roundMatches[i].p1.fromMatch,
            player2: `Player ${roundMatches[i].p2.seed}`,
            player2Seed: roundMatches[i].p2.seed,
            player2From: roundMatches[i].p2.fromMatch,
            startTime: mStartTime,
            endTime: mEndTime,
            court: court
          });
          await match.save();
          nextRoundPlayers.push({ seed: roundMatches[i].p1.seed, fromMatch: matchIdx });
          totalMatches++;
        }

        const roundSlots = Math.ceil(roundMatches.length / 2);
        startTime.setMinutes(startTime.getMinutes() + (roundSlots * matchDuration));
        currentPlayers = nextRoundPlayers;
        round++;
      }
    }

    res.json({ message: "Tournament generated for all categories", totalMatches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get schedule with category filter
app.get("/api/schedule", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const matches = await Match.find(filter).sort({ round: 1, startTime: 1, matchIndex: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get participants
app.get("/api/participants", async (req, res) => {
  try {
    const participants = await Participant.find().sort({ registeredAt: -1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));