require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./db");
const Match = require("./models/Match");
const Participant = require("./models/Participant");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

console.log("ENV CHECK:", process.env.MONGO_URI);
dotenv.config();
connectDB();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// --- HELPERS ---

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function groupCompetitors(participants, category) {
  const shuffled = shuffleArray(participants);

  if (category.toLowerCase().includes("singles")) {
    return shuffled.map(p => ({
      id: p._id.toString(),
      name: p.name,
      seed: p.regNo || p._id.toString().slice(-4)
    }));
  } else {
    // Group by Team Name
    const teams = {};
    shuffled.forEach(p => {
      const tName = p.teamName || p.name; // Fallback to name if teamName missing
      if (!teams[tName]) teams[tName] = [];
      teams[tName].push(p.name);
    });

    return Object.entries(teams).map(([teamName, players]) => ({
      id: teamName,
      name: teamName, // Strictly use the Team Name
      players: players,
      seed: teamName
    }));
  }
}

// --- MIDDLEWARE ---

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ error: "Invalid token." });
  }
};

// --- AUTH ROUTES ---

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, adminSecret } = req.body;
    let role = 'user';
    
    if (adminSecret) {
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Invalid admin secret" });
      }
      role = 'admin';
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const user = new User({ username, password, role });
    await user.save();
    res.json({ message: `${role === 'admin' ? 'Admin' : 'User'} registered successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  res.json(req.user);
});

// --- PARTICIPANT ROUTES ---
// Simple Registration
app.post("/api/register", auth, async (req, res) => {
  try {
    const { name, email, phone, category, teamName, regNo } = req.body;

    // Check for duplicate registration in the same category
    const existing = await Participant.findOne({ 
      category, 
      $or: [{ regNo }, { phone }] 
    });

    if (existing) {
      return res.status(400).json({ error: "❌ Duplicate Registration!\nYou are already registered for this category." });
    }

    const participant = new Participant({ name, email, phone, category, teamName, regNo });
    await participant.save();

    // RANDOM SLOT ASSIGNMENT LOGIC
    let matchToFill = null;
    let isNewEntry = true;
    let displayName = name;

    // 1. Check if it's a team that already has a slot
    if (teamName && category.toLowerCase().includes("doubles")) {
      displayName = `${name} (${teamName})`;
      matchToFill = await Match.findOne({
        category,
        $or: [
          { player1: { $regex: new RegExp(`\\(${teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`) } },
          { player2: { $regex: new RegExp(`\\(${teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`) } }
        ]
      });

      if (matchToFill) {
        isNewEntry = false;
        if (matchToFill.player1.endsWith(`(${teamName})`)) {
          const existing = matchToFill.player1.split(" (")[0];
          matchToFill.player1 = `${existing} & ${name} (${teamName})`;
          displayName = matchToFill.player1;
        } else {
          const existing = matchToFill.player2.split(" (")[0];
          matchToFill.player2 = `${existing} & ${name} (${teamName})`;
          displayName = matchToFill.player2;
        }
      }
    }

    // 2. If new entry, find a random empty "Player X"
    if (isNewEntry) {
      const emptyMatches = await Match.find({
        category,
        $or: [
          { player1: { $regex: /^Player / } },
          { player2: { $regex: /^Player / } }
        ]
      });

      if (emptyMatches.length > 0) {
        // Pick a random match from the empty ones
        matchToFill = emptyMatches[Math.floor(Math.random() * emptyMatches.length)];

        // Randomly pick player1 or player2 if both are "Player X"
        if (matchToFill.player1.startsWith("Player ") && matchToFill.player2.startsWith("Player ")) {
          if (Math.random() > 0.5) matchToFill.player1 = displayName;
          else matchToFill.player2 = displayName;
        } else if (matchToFill.player1.startsWith("Player ")) {
          matchToFill.player1 = displayName;
        } else {
          matchToFill.player2 = displayName;
        }
      }
    }

    if (matchToFill) {
      await matchToFill.save();

      // Propagate if it's a Bye or already completed
      if (matchToFill.isBye || matchToFill.isCompleted) {
        if (matchToFill.isBye) {
          matchToFill.winner = displayName;
          await matchToFill.save();
        }
        const nextMatches = await Match.find({
          category,
          $or: [
            { player1From: matchToFill.matchIndex },
            { player2From: matchToFill.matchIndex }
          ]
        });
        for (const nm of nextMatches) {
          if (nm.player1From === matchToFill.matchIndex) nm.player1 = displayName;
          else nm.player2 = displayName;
          await nm.save();
        }
      }
    }

    res.json({ message: "Registered and randomly assigned to a slot!", participant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize Scrambled 33-Player/Team Bracket
app.post("/api/generate-tournament", auth, async (req, res) => {
  try {
    await Match.deleteMany({});
    const categories = ["Men's Singles", "Men's Doubles", "Mixed Doubles"];
    let matchGlobalIndex = 1;
    let totalMatches = 0;

    for (const category of categories) {
      // Create 33 nodes and SCRAMBLE them immediately
      let playerNodes = [];
      for (let i = 1; i <= 33; i++) {
        playerNodes.push({ name: `Player ${i}`, fromMatch: null });
      }

      // Shuffle the Player X labels so Round 1 is random (e.g., Player 14 vs Player 29)
      playerNodes = shuffleArray(playerNodes);

      let round = 1;
      let currentRoundNodes = playerNodes;
      let startTime = new Date();
      startTime.setHours(10, 0, 0, 0);

      while (currentRoundNodes.length > 1) {
        let nextRoundNodes = [];
        let activeMatchInRound = 0;
        let isFinals = currentRoundNodes.length <= 2;
        let matchDuration = isFinals ? 30 : 15;

        // Handle Bye (Pick a random node for the Bye each round)
        if (currentRoundNodes.length % 2 !== 0) {
          const byeIdx = Math.floor(Math.random() * currentRoundNodes.length);
          const byeNode = currentRoundNodes.splice(byeIdx, 1)[0];

          const matchIdx = matchGlobalIndex++;
          const match = new Match({
            matchIndex: matchIdx,
            round,
            category,
            player1: byeNode.name,
            player1From: byeNode.fromMatch,
            player2: "BYE",
            isBye: true,
            status: "completed",
            winner: byeNode.name,
            isCompleted: true
          });
          await match.save();
          nextRoundNodes.push({ name: byeNode.name, fromMatch: matchIdx });
          totalMatches++;
        }

        // Pair remaining nodes
        for (let i = 0; i < currentRoundNodes.length; i += 2) {
          const matchIdx = matchGlobalIndex++;
          const court = (activeMatchInRound % 2) + 1;
          const slotIndex = Math.floor(activeMatchInRound / 2);

          const mStartTime = new Date(startTime);
          mStartTime.setMinutes(startTime.getMinutes() + (slotIndex * matchDuration));

          const match = new Match({
            matchIndex: matchIdx,
            round,
            category,
            player1: currentRoundNodes[i].name,
            player1From: currentRoundNodes[i].fromMatch,
            player2: currentRoundNodes[i + 1].name,
            player2From: currentRoundNodes[i + 1].fromMatch,
            startTime: mStartTime,
            court,
            status: "pending"
          });
          await match.save();

          nextRoundNodes.push({
            name: `Winner of Match ${matchIdx}`,
            fromMatch: matchIdx
          });
          totalMatches++;
          activeMatchInRound++;
        }

        const roundSlots = Math.ceil(activeMatchInRound / 2);
        startTime.setMinutes(startTime.getMinutes() + (roundSlots * matchDuration));
        currentRoundNodes = nextRoundNodes;
        round++;
      }
    }

    res.json({ message: "Scrambled 33-Player bracket generated!", totalMatches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get schedule
app.get("/api/schedule", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const matches = await Match.find(filter).sort({ round: 1, matchIndex: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update score
app.patch("/api/matches/:id/score", auth, async (req, res) => {
  try {
    const { score1, score2, status } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { score1, score2, status },
      { new: true }
    );
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete match and advance winner
app.post("/api/matches/:id/complete", auth, async (req, res) => {
  try {
    const { winner, score1, score2 } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    match.winner = winner;
    match.score1 = score1;
    match.score2 = score2;
    match.status = "completed";
    match.isCompleted = true;
    await match.save();

    // Advance winner logic
    const nextMatches = await Match.find({
      $or: [
        { player1From: match.matchIndex, category: match.category },
        { player2From: match.matchIndex, category: match.category }
      ]
    });

    for (const nextMatch of nextMatches) {
      if (nextMatch.player1From === match.matchIndex) {
        nextMatch.player1 = winner;
      } else if (nextMatch.player2From === match.matchIndex) {
        nextMatch.player2 = winner;
      }
      await nextMatch.save();
    }

    res.json({ message: "Match completed and winner advanced", match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));