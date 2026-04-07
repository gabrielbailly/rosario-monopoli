const colors = ["#4e79a7", "#e15759", "#59a14f", "#f28e2b"];

const state = {
  gameId: null,
  gameName: null,
  gameState: null,
  config: null
};

const boardEl = document.getElementById("board");
const playersFormEl = document.getElementById("playersForm");
const savedGamesEl = document.getElementById("savedGames");
const gamePanelEl = document.getElementById("gamePanel");
const pendingTextEl = document.getElementById("pendingText");
const pendingActionsEl = document.getElementById("pendingActions");

const pos = [
  [8, 8], [8, 7], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1],
  [7, 1], [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2],
  [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [2, 8], [3, 8],
  [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [8, 7]
];

function getMysteryMap() {
  const map = {};
  for (const m of state.config.mysteries) {
    map[m.id] = m;
  }
  return map;
}

function createPlayerRow(name, isBot) {
  const row = document.createElement("div");
  row.className = "playerRow";

  const nameInput = document.createElement("input");
  nameInput.value = name;
  nameInput.maxLength = 20;

  const botLabel = document.createElement("label");
  botLabel.innerHTML = "<input type='checkbox'> Maquina";
  botLabel.querySelector("input").checked = !!isBot;

  row.appendChild(nameInput);
  row.appendChild(botLabel);
  playersFormEl.appendChild(row);
}

function collectPlayers() {
  const rows = [...playersFormEl.querySelectorAll(".playerRow")];
  return rows.map((row) => ({
    name: row.querySelector("input[type='text'], input:not([type='checkbox'])").value || "Jugador",
    isBot: row.querySelector("input[type='checkbox']").checked
  }));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Error de API");
  }
  return body;
}

function renderSavedGames(list) {
  savedGamesEl.innerHTML = "";
  if (!list.length) {
    savedGamesEl.innerHTML = "<li>No hay partidas guardadas.</li>";
    return;
  }
  for (const game of list) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `Cargar: ${game.name} (turno ${game.turn})`;
    btn.onclick = () => loadGame(game.id);
    li.appendChild(btn);
    savedGamesEl.appendChild(li);
  }
}

function renderBoard() {
  const game = state.gameState;
  const mysteryMap = getMysteryMap();
  boardEl.innerHTML = "";

  for (let i = 0; i < game.board.length; i += 1) {
    const cell = game.board[i];
    const tile = document.createElement("div");
    tile.className = "cell";
    const [r, c] = pos[i];
    tile.style.gridRow = String(r);
    tile.style.gridColumn = String(c);

    let name = cell.name || cell.type;
    let ownerText = "";
    if (cell.type === "mystery") {
      const mystery = mysteryMap[cell.mysteryId];
      name = mystery.name;
      tile.style.borderTop = `6px solid ${mystery.color}`;
      const ownerId = game.ownership[mystery.id];
      if (ownerId) {
        const owner = game.players.find((p) => p.id === ownerId);
        const hotel = owner.hotels.includes(mystery.id) ? " | HOTEL" : "";
        ownerText = `Dueno: ${owner.name}${hotel}`;
      } else {
        ownerText = `Libre: ${mystery.cost}`;
      }
    }

    const tokens = game.players
      .map((p, idx) => ({ player: p, idx }))
      .filter((x) => x.player.position === i && !x.player.bankrupt)
      .map((x) => `<span class="token" style="background:${colors[x.idx % colors.length]}" title="${x.player.name}"></span>`)
      .join("");

    tile.innerHTML = `<div class="name">${name}</div><div class="owner">${ownerText}</div><div class="tokens">${tokens}</div>`;
    boardEl.appendChild(tile);
  }
}

function renderPlayers() {
  const container = document.getElementById("playersInfo");
  const current = state.gameState.players[state.gameState.currentPlayerIndex];
  container.innerHTML = "";
  for (const player of state.gameState.players) {
    const div = document.createElement("div");
    div.className = `playerCard ${player.id === current.id ? "current" : ""}`;
    const role = player.isBot ? "Maquina" : "Alumno";
    const status = player.bankrupt ? "SIN DINERO" : "Activo";
    div.innerHTML = `
      <strong>${player.name}</strong> (${role})<br>
      Dinero: ${player.money}<br>
      Puntos: ${player.points}<br>
      Misterios: ${player.ownedMysteries.length} | Hoteles: ${player.hotels.length}<br>
      Estado: ${status}
    `;
    container.appendChild(div);
  }
}

function renderLog() {
  const list = document.getElementById("logList");
  list.innerHTML = state.gameState.log.map((item) => `<li>${item}</li>`).join("");
}

function renderTurn() {
  const current = state.gameState.players[state.gameState.currentPlayerIndex];
  const turnText = `Turno ${state.gameState.turn} | Juega: ${current.name}`;
  document.getElementById("turnInfo").textContent = turnText;
}

function renderPending() {
  const pending = state.gameState.pending;
  pendingActionsEl.innerHTML = "";

  if (state.gameState.gameOver) {
    const winner = state.gameState.players.find((p) => p.id === state.gameState.winnerId);
    pendingTextEl.textContent = `Partida terminada. Gana ${winner.name}.`;
    document.getElementById("rollBtn").disabled = true;
    return;
  }

  document.getElementById("rollBtn").disabled = !!pending;
  if (!pending) {
    pendingTextEl.textContent = "No hay acciones pendientes.";
    return;
  }

  pendingTextEl.textContent = pending.message || "Resuelve la accion.";
  if (pending.type === "buy") {
    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Comprar";
    buyBtn.onclick = () => resolveAction({ buy: true });
    const passBtn = document.createElement("button");
    passBtn.textContent = "Pasar";
    passBtn.className = "ghost";
    passBtn.onclick = () => resolveAction({ buy: false });
    pendingActionsEl.appendChild(buyBtn);
    pendingActionsEl.appendChild(passBtn);
  }

  if (pending.type === "buildHotel") {
    const buildBtn = document.createElement("button");
    buildBtn.textContent = "Construir hotel";
    buildBtn.onclick = () => resolveAction({ build: true });
    const noBtn = document.createElement("button");
    noBtn.className = "ghost";
    noBtn.textContent = "No construir";
    noBtn.onclick = () => resolveAction({ build: false });
    pendingActionsEl.appendChild(buildBtn);
    pendingActionsEl.appendChild(noBtn);
  }

  if (pending.type === "quiz") {
    pendingTextEl.textContent = pending.question.question;
    pending.question.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => resolveAction({ answerIndex: idx });
      pendingActionsEl.appendChild(btn);
    });
  }
}

function renderAll() {
  gamePanelEl.classList.remove("hidden");
  document.getElementById("gameTitle").textContent = state.gameName;
  renderBoard();
  renderPlayers();
  renderTurn();
  renderPending();
  renderLog();
}

async function refreshSavedGames() {
  const list = await api("/api/games");
  renderSavedGames(list);
}

async function startGame() {
  const players = collectPlayers();
  const payload = {
    name: document.getElementById("gameName").value,
    players
  };
  const data = await api("/api/games", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.gameId = data.id;
  state.gameName = data.name;
  state.gameState = data.state;
  renderAll();
  await refreshSavedGames();
}

async function loadGame(gameId) {
  const data = await api(`/api/games/${gameId}`);
  state.gameId = data.id;
  state.gameName = data.name;
  state.gameState = data.state;
  renderAll();
}

async function roll() {
  const data = await api(`/api/games/${state.gameId}/roll`, {
    method: "POST",
    body: JSON.stringify({})
  });
  state.gameState = data.state;
  renderAll();
  await refreshSavedGames();
}

async function resolveAction(payload) {
  const data = await api(`/api/games/${state.gameId}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.gameState = data.state;
  renderAll();
  await refreshSavedGames();
}

function addDefaultPlayers() {
  playersFormEl.innerHTML = "";
  createPlayerRow("Alumno 1", false);
  createPlayerRow("Maquina", true);
}

async function init() {
  state.config = await api("/api/config");
  addDefaultPlayers();

  document.getElementById("startBtn").onclick = () => startGame().catch(alert);
  document.getElementById("addPlayerBtn").onclick = () => {
    if (playersFormEl.querySelectorAll(".playerRow").length >= 4) {
      alert("Maximo 4 jugadores");
      return;
    }
    createPlayerRow(`Jugador ${playersFormEl.querySelectorAll(".playerRow").length + 1}`, false);
  };
  document.getElementById("rollBtn").onclick = () => roll().catch(alert);
  document.getElementById("refreshSavedBtn").onclick = () => refreshSavedGames().catch(alert);

  await refreshSavedGames();
}

init().catch((err) => alert(err.message));
