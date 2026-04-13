const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID, createHmac, timingSafeEqual } = require("crypto");
const { BOARD, MYSTERIES } = require("./gameConfig");
const { getCards, saveCards } = require("./cardsStore");
const { all, get, initDb, run } = require("./db");
const { createInitialState, getCurrentPlayer, nextTurn, resolvePending, rollDice } = require("./gameEngine");

const app = express();
const PORT = process.env.PORT || 3000;
let initPromise = null;
const adminSessions = new Map();
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const USER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.SESSION_SECRET || "rosario-monopoli-secret";
}

function base64UrlEncode(text) {
  return Buffer.from(text, "utf8").toString("base64url");
}

function signText(text) {
  return createHmac("sha256", getSessionSecret()).update(text).digest("base64url");
}

function createSignedToken(payload) {
  const serialized = JSON.stringify(payload);
  const encoded = base64UrlEncode(serialized);
  const signature = signText(encoded);
  return `${encoded}.${signature}`;
}

function verifySignedToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const expected = signText(encoded);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expected);
  if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
    return null;
  }
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const payload = JSON.parse(decoded);
    if (!payload || typeof payload !== "object") {
      return null;
    }
    if (!payload.exp || Date.now() > Number(payload.exp)) {
      return null;
    }
    return payload;
  } catch (_err) {
    return null;
  }
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123";
}

function createAdminSession() {
  const token = randomUUID();
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return token;
}

function isAdminAuthorized(req) {
  const auth = req.headers["x-admin-authorization"] || req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !adminSessions.has(token)) {
    return false;
  }
  const expiresAt = adminSessions.get(token);
  if (Date.now() > expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
  return true;
}

function createUserSession(userId) {
  return createSignedToken({
    typ: "user",
    uid: Number(userId),
    exp: Date.now() + USER_SESSION_TTL_MS
  });
}

function requireUser(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = verifySignedToken(token);
  if (!payload || payload.typ !== "user") {
    res.status(401).json({ error: "Debes iniciar sesión." });
    return;
  }
  req.userId = Number(payload.uid);
  next();
}

function getBotChoice(state) {
  const current = getCurrentPlayer(state);
  const pending = state.pending;
  if (!pending) {
    return {};
  }
  if (pending.type === "mysteryQuiz" || pending.type === "mysteryOwnerQuiz" || pending.type === "quiz") {
    const answerIndex = Math.random() < 0.7
      ? pending.question.correctIndex
      : Math.floor(Math.random() * pending.question.options.length);
    return { answerIndex };
  }
  return {};
}

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

async function saveGame(id, userId, name, state) {
  const now = new Date().toISOString();
  await run(
    `
    INSERT INTO games (id, user_id, name, state_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      name = excluded.name,
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
    `,
    [id, userId, name, JSON.stringify(state), now, now]
  );
}

async function persistScores(gameId, state) {
  await run("DELETE FROM scores WHERE game_id = ?", [gameId]);
  for (const player of state.players) {
    await run(
      "INSERT INTO scores (game_id, player_name, points, money, owned_count, saved_at) VALUES (?, ?, ?, ?, ?, ?)",
      [gameId, player.name, 0, player.money, player.ownedMysteries.length, new Date().toISOString()]
    );
  }
}

app.get("/api/config", (_req, res) => {
  const cards = getCards();
  res.json({
    board: BOARD,
    mysteries: MYSTERIES,
    quizCount: cards.quizQuestions.length
  });
});

app.post("/api/auth/login", safeRoute(async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const pin = String(req.body.pin || "").trim();
  if (username.length < 3) {
    res.status(400).json({ error: "El usuario debe tener al menos 3 caracteres." });
    return;
  }
  if (pin.length < 4) {
    res.status(400).json({ error: "El PIN debe tener al menos 4 caracteres." });
    return;
  }

  const existing = await get("SELECT * FROM users WHERE username = ?", [username]);
  let userId;
  if (!existing) {
    const created = await run(
      "INSERT INTO users (username, pin, created_at) VALUES (?, ?, ?)",
      [username, pin, new Date().toISOString()]
    );
    userId = created.lastID || (created.rows && created.rows[0] && created.rows[0].id);
    if (!userId) {
      const user = await get("SELECT id FROM users WHERE username = ?", [username]);
      userId = user.id;
    }
  } else {
    if (existing.pin !== pin) {
      res.status(401).json({ error: "PIN incorrecto." });
      return;
    }
    userId = existing.id;
  }

  const token = createUserSession(Number(userId));
  res.json({ token, username });
}));

app.post("/api/admin/login", safeRoute(async (req, res) => {
  const password = String(req.body.password || "");
  if (password !== getAdminPassword()) {
    res.status(401).json({ error: "Contraseña incorrecta." });
    return;
  }
  const token = createAdminSession();
  res.json({ token });
}));

app.get("/api/admin/content", safeRoute(async (req, res) => {
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }
  res.json(getCards());
}));

app.put("/api/admin/content", safeRoute(async (req, res) => {
  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }
  const saved = saveCards(req.body || {});
  res.json(saved);
}));

app.get("/api/health", safeRoute(async (_req, res) => {
  await all("SELECT 1 AS ok");
  res.json({ ok: true, now: new Date().toISOString() });
}));

app.get("/api/games", requireUser, safeRoute(async (req, res) => {
  const rows = await all("SELECT * FROM games WHERE user_id = ? ORDER BY updated_at DESC", [req.userId]);
  res.json(rows.map(gameSummaryRow));
}));

app.post("/api/games", requireUser, safeRoute(async (req, res) => {
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
  const duration = ["corta", "media", "larga"].includes(req.body.duration) ? req.body.duration : "media";
  const cards = getCards();
  const state = createInitialState(cleanedPlayers, cards, { duration });
  await saveGame(id, req.userId, gameName, state);
  res.status(201).json({ id, name: gameName, state });
}));

app.get("/api/games/:id", requireUser, safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game || Number(game.user_id) !== Number(req.userId)) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  res.json({ id: game.id, name: game.name, state: game.state, updatedAt: game.updated_at });
}));

app.post("/api/games/:id/roll", requireUser, safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game || Number(game.user_id) !== Number(req.userId)) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  if (game.state.pending) {
    res.status(400).json({ error: "Hay una acción pendiente por resolver." });
    return;
  }
  rollDice(game.state);
  if (!game.state.pending) {
    nextTurn(game.state);
  }
  await saveGame(game.id, req.userId, game.name, game.state);
  if (game.state.gameOver) {
    await persistScores(game.id, game.state);
  }
  res.json({ state: game.state });
}));

app.post("/api/games/:id/resolve", requireUser, safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game || Number(game.user_id) !== Number(req.userId)) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  if (!game.state.pending) {
    res.status(400).json({ error: "No hay acción pendiente." });
    return;
  }
  const currentPlayer = getCurrentPlayer(game.state);
  const body = req.body || {};
  const choice = currentPlayer.isBot && Object.keys(body).length === 0 ? getBotChoice(game.state) : body;

  resolvePending(game.state, choice);
  await saveGame(game.id, req.userId, game.name, game.state);
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
app.post("/api/games/:id/finish", requireUser, safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game || Number(game.user_id) !== Number(req.userId)) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  game.state.gameOver = true;
  game.state.log = [`Partida finalizada por el usuario.`, ...(game.state.log || [])].slice(0, 25);
  await saveGame(game.id, req.userId, game.name, game.state);
  await persistScores(game.id, game.state);
  res.json({ ok: true });
}));

app.delete("/api/games/:id", requireUser, safeRoute(async (req, res) => {
  const game = await loadGame(req.params.id);
  if (!game || Number(game.user_id) !== Number(req.userId)) {
    res.status(404).json({ error: "Partida no encontrada." });
    return;
  }
  await run("DELETE FROM scores WHERE game_id = ?", [game.id]);
  await run("DELETE FROM games WHERE id = ?", [game.id]);
  res.json({ ok: true });
}));
