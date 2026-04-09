const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");
const { BOARD, MYSTERIES, QUIZ_QUESTIONS } = require("./gameConfig");
const { all, get, initDb, run } = require("./db");
const { createInitialState, getCurrentPlayer, nextTurn, resolveBotTurn, resolvePending, rollDice } = require("./gameEngine");

const app = express();
const PORT = process.env.PORT || 3000;
let initPromise = null;

function ensureDbInitialized() {
  if (!initPromise) {
    initPromise = initDb();
  }
  return initPromise;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(async (_req, _res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err) {
    next(err);
  }
});

function safeRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function gameSummaryRow(row) {
  const state = JSON.parse(row.state_json);
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    turn: state.turn,
    players: state.players.map((p) => ({
      name: p.name,
      points: p.points,
      money: p.money,
      bankrupt: p.bankrupt
    })),
    gameOver: state.gameOver
  };
}

async function loadGame(id) {
  const row = await get("SELECT * FROM games WHERE id = ?", [id]);
  if (!row) {
    return null;
  }
  return {
    ...row,
    state: JSON.parse(row.state_json)
  };
}

async function saveGame(id, name, state) {
  const now = new Date().toISOString();
  await run(
    `
    INSERT INTO games (id, name, state_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
    `,
    [id, name, JSON.stringify(state), now, now]
  );
}

async function persistScores(gameId, state) {
  await run("DELETE FROM scores WHERE game_id = ?", [gameId]);
  for (const player of state.players) {
    await run(
      "INSERT INTO scores (game_id, player_name, points, money, owned_count, saved_at) VALUES (?, ?, ?, ?, ?, ?)",
      [gameId, player.name, player.points, player.money, player.ownedMysteries.length, new Date().toISOString()]
    );
  }
}

app.get("/api/config", (_req, res) => {
  res.json({
    board: BOARD,
    mysteries: MYSTERIES,
    quizCount: QUIZ_QUESTIONS.length
  });
});

app.get("/api/health", safeRoute(async (_req, res) => {
  await all("SELECT 1 AS ok");
  res.json({ ok: true, now: new Date().toISOString() });
}));

app.get("/api/games", safeRoute(async (_req, res) => {
  const rows = await all("SELECT * FROM games ORDER BY updated_at DESC");
  res.json(rows.map(gameSummaryRow));
}));

app.post("/api/games", safeRoute(async (req, res) => {
  const players = Array.isArray(req.body.players) ? req.body.players : [];
  if (players.length < 2 || players.length > 4) {
    res.status(400).json({ error: "Debe haber entre 2 y 4 jugadores." });
    return;
  }
  const cleanedPlayers = players.map((p, i) => ({
    name: String(p.name || `Jugador ${i + 1}`).slice(0, 20),
    isBot: !!p.isBot
  }));
  const id = randomUUID();
  const gameName = String(req.body.name || "Partida de Rosario").slice(0, 40);
  const state = createInitialState(cleanedPlayers);
  await saveGame(id, gameName, state);
  res.status(201).json({ id, name: gameName, state });
}));

app.get("/api/games/:id", safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  res.json({ id: game.id, name: game.name, state: game.state, updatedAt: game.updated_at });
}));

app.post("/api/games/:id/roll", safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  if (game.state.pending) {
    res.status(400).json({ error: "Hay una accion pendiente por resolver." });
    return;
  }
  const currentPlayer = getCurrentPlayer(game.state);
  if (currentPlayer.isBot) {
    res.status(400).json({ error: "El turno actual lo controla la maquina." });
    return;
  }

  rollDice(game.state);
  if (!game.state.pending) {
    nextTurn(game.state);
  }
  resolveBotTurn(game.state);
  await saveGame(game.id, game.name, game.state);
  if (game.state.gameOver) {
    await persistScores(game.id, game.state);
  }
  res.json({ state: game.state });
}));

app.post("/api/games/:id/resolve", safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  if (!game.state.pending) {
    res.status(400).json({ error: "No hay accion pendiente." });
    return;
  }
  const currentPlayer = getCurrentPlayer(game.state);
  if (currentPlayer.isBot) {
    res.status(400).json({ error: "La accion pendiente es de la maquina." });
    return;
  }

  resolvePending(game.state, req.body || {});
  resolveBotTurn(game.state);
  await saveGame(game.id, game.name, game.state);
  if (game.state.gameOver) {
    await persistScores(game.id, game.state);
  }
  res.json({ state: game.state });
}));

app.get("/api/scores", safeRoute(async (_req, res) => {
  const rows = await all(
    "SELECT game_id, player_name, points, money, owned_count, saved_at FROM scores ORDER BY saved_at DESC LIMIT 40"
  );
  res.json(rows);
}));

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: "Error interno", detail: err.message });
});

if (require.main === module) {
  ensureDbInitialized().then(() => {
    app.listen(PORT, () => {
      process.stdout.write(`Servidor listo en http://localhost:${PORT}\n`);
    });
  }).catch((err) => {
    process.stderr.write(`Error al iniciar: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = app;
