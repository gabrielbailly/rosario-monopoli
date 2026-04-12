const colors = ["#4e79a7", "#e15759", "#59a14f", "#f28e2b"];

const state = {
  gameId: null,
  gameName: null,
  gameState: null,
  config: null,
  previousGameState: null,
  adminToken: null,
  adminContent: null,
  lastShownMoneyEvent: null,
  lastShownDrawKey: null,
  lastShownCenterCardKey: null,
  animatingPlayerId: null,
  userToken: localStorage.getItem("userToken") || null,
  username: localStorage.getItem("username") || null
};

const boardEl = document.getElementById("board");
const playersFormEl = document.getElementById("playersForm");
const savedGamesEl = document.getElementById("savedGames");
const gamePanelEl = document.getElementById("gamePanel");
const setupPanelEl = document.getElementById("setupPanel");
const savedPanelEl = document.getElementById("savedPanel");
const userPanelEl = document.getElementById("userPanel");
const mysteryModalEl = document.getElementById("mysteryModal");
const mysteryModalCardEl = document.getElementById("mysteryModalCard");

const groupLabels = {
  gozosos: "Misterios Gozosos",
  dolorosos: "Misterios Dolorosos",
  gloriosos: "Misterios Gloriosos",
  luminosos: "Misterios Luminosos"
};

const groupShortLabels = {
  gozosos: "Gozosos",
  dolorosos: "Dolorosos",
  gloriosos: "Gloriosos",
  luminosos: "Luminosos"
};

const groupOrder = {
  gozosos: 0,
  dolorosos: 1,
  gloriosos: 2,
  luminosos: 3
};

function getTrackMeta(cellCount) {
  let rows = 8;
  let cols = 10;
  if (cellCount !== (2 * (rows + cols) - 4)) {
    const side = Math.max(4, Math.ceil((cellCount + 4) / 4));
    rows = side;
    cols = side;
  }

  const perimeter = [];
  for (let c = cols; c >= 1; c -= 1) {
    perimeter.push([rows, c]);
  }
  for (let r = rows - 1; r >= 1; r -= 1) {
    perimeter.push([r, 1]);
  }
  for (let c = 2; c <= cols; c += 1) {
    perimeter.push([1, c]);
  }
  for (let r = 2; r <= rows - 1; r += 1) {
    perimeter.push([r, cols]);
  }

  return {
    rows,
    cols,
    positions: perimeter.slice(0, cellCount),
    perimeter
  };
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatMoney(value) {
  return `${value} €`;
}

function buildDefaultGameName() {
  const now = new Date();
  const date = now.toLocaleDateString("es-ES");
  const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `Partida ${date} ${time}`;
}

function setDefaultGameName(force = false) {
  const input = document.getElementById("gameName");
  if (!input) {
    return;
  }
  if (force || !String(input.value || "").trim()) {
    input.value = buildDefaultGameName();
  }
}

function formatPlayerName(name) {
  if (typeof name !== "string") {
    return name;
  }
  if (name.toLowerCase() === "maquina") {
    return "Máquina";
  }
  return name;
}

function escAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasQuestionPending(gameState) {
  if (!gameState || !gameState.pending) {
    return false;
  }
  return gameState.pending.type === "quiz" || gameState.pending.type === "mysteryQuiz";
}

function buildMysteryPlaceholderImage(mystery) {
  const title = escAttr(mystery.name || "Misterio");
  const color = escAttr(mystery.color || "#4e79a7");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${color}' stop-opacity='0.82'/><stop offset='100%' stop-color='#f0dec1'/></linearGradient></defs><rect width='600' height='360' fill='url(#g)'/><circle cx='470' cy='70' r='88' fill='rgba(255,255,255,0.35)'/><text x='300' y='170' text-anchor='middle' font-size='42' font-family='Trebuchet MS, sans-serif' fill='#ffffff' font-weight='700'>${title}</text><text x='300' y='222' text-anchor='middle' font-size='26' font-family='Trebuchet MS, sans-serif' fill='#ffffff'>Misterio del Rosario</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function loadMysteryImage(imgEl, mystery) {
  const base = `/images/mysteries/${mystery.id}`;
  const candidates = [`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`];
  let index = 0;

  const tryNext = () => {
    if (index >= candidates.length) {
      imgEl.onerror = null;
      imgEl.src = buildMysteryPlaceholderImage(mystery);
      return;
    }
    imgEl.src = candidates[index];
    index += 1;
  };

  imgEl.onerror = () => tryNext();
  tryNext();
}

function closeMysteryModal() {
  if (!mysteryModalEl) {
    return;
  }
  mysteryModalEl.classList.add("hidden");
  if (mysteryModalCardEl) {
    mysteryModalCardEl.innerHTML = "";
  }
}

function showMysteryModal({ mystery, order, statusText }) {
  if (!mysteryModalEl || !mysteryModalCardEl || !mystery) {
    return;
  }
  const groupLabel = groupLabels[mystery.group] || mystery.group;
  mysteryModalCardEl.style.borderColor = mystery.color;
  mysteryModalCardEl.innerHTML = `
    <button id="mysteryModalCloseBtn" class="mysteryModalCloseBtn" type="button" aria-label="Cerrar">X</button>
    <div class="mysteryModalImageWrap">
      <img id="mysteryModalImage" class="mysteryModalImage" alt="${escAttr(mystery.name)}" />
    </div>
    <div class="mysteryModalInfo">
      <h3 id="mysteryModalTitle">${order}º ${escAttr(mystery.name)}</h3>
      <div class="mysteryModalLine"><strong>Grupo:</strong> ${escAttr(groupLabel)}</div>
      <div class="mysteryModalLine"><strong>Estado:</strong> ${escAttr(statusText)}</div>
      <div class="mysteryModalLine"><strong>Valor:</strong> ${formatMoney(mystery.cost)}</div>
      <div class="mysteryModalHint">Para conseguir este misterio, responde bien la pregunta al caer en esta casilla.</div>
    </div>
  `;
  const imageEl = document.getElementById("mysteryModalImage");
  if (imageEl) {
    loadMysteryImage(imageEl, mystery);
  }
  const closeBtn = document.getElementById("mysteryModalCloseBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeMysteryModal(), { once: true });
  }
  mysteryModalEl.classList.remove("hidden");
}

function getForwardPath(fromIndex, toIndex, total) {
  if (fromIndex === toIndex || total <= 0) {
    return [];
  }
  const steps = (toIndex - fromIndex + total) % total;
  const safeSteps = Math.min(steps, 14);
  const path = [];
  for (let i = 1; i <= safeSteps; i += 1) {
    path.push((fromIndex + i) % total);
  }
  if (path[path.length - 1] !== toIndex) {
    path.push(toIndex);
  }
  return path;
}

function getCellCenter(index) {
  const tile = boardEl.querySelector(`.cell[data-index='${index}']`);
  if (!tile) {
    return null;
  }
  return {
    x: tile.offsetLeft + tile.offsetWidth / 2,
    y: tile.offsetTop + tile.offsetHeight / 2
  };
}

async function animateMove(playerIdx, fromPosition, toPosition) {
  if (fromPosition === toPosition || fromPosition == null || toPosition == null) {
    return;
  }
  const path = getForwardPath(fromPosition, toPosition, state.gameState.board.length);
  if (!path.length) {
    return;
  }

  const start = getCellCenter(fromPosition);
  if (!start) {
    return;
  }

  const moving = document.createElement("div");
  moving.className = "movingToken";
  moving.style.background = colors[playerIdx % colors.length];
  moving.style.left = `${start.x}px`;
  moving.style.top = `${start.y}px`;
  boardEl.appendChild(moving);

  for (const stepIndex of path) {
    const center = getCellCenter(stepIndex);
    if (center) {
      moving.style.left = `${center.x}px`;
      moving.style.top = `${center.y}px`;
      await sleep(230);
    }
  }

  moving.remove();
}

const audioState = {
  context: null,
  enabled: false
};

function ensureAudio() {
  if (!audioState.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }
    audioState.context = new AudioContextClass();
  }
  if (audioState.context.state === "suspended") {
    audioState.context.resume().catch(() => {});
  }
  audioState.enabled = true;
  return true;
}

function beep(freq, ms, delayMs) {
  if (!audioState.enabled || !audioState.context) {
    return;
  }
  const ctx = audioState.context;
  const now = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "triangle";
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + ms / 1000 + 0.02);
}

function playDiceCupSound() {
  if (!ensureAudio()) {
    return;
  }
  const rattles = 11;
  for (let i = 0; i < rattles; i += 1) {
    const freq = 170 + Math.random() * 520;
    const dur = 38 + Math.random() * 46;
    const delay = i * 36 + Math.random() * 14;
    beep(freq, dur, delay);
  }
  beep(220, 90, 430);
}

function playSound(type) {
  if (!ensureAudio()) {
    return;
  }
  if (type === "dice") {
    playDiceCupSound();
  }
  if (type === "move") {
    beep(330, 70, 0);
    beep(420, 70, 70);
  }
  if (type === "question") {
    beep(520, 110, 0);
    beep(640, 110, 120);
  }
  if (type === "buy") {
    beep(460, 120, 0);
    beep(620, 160, 120);
  }
  if (type === "pass") {
    beep(310, 80, 0);
  }
  if (type === "correct") {
    beep(620, 120, 0);
    beep(780, 120, 130);
    beep(940, 150, 260);
  }
  if (type === "wrong") {
    beep(280, 140, 0);
    beep(220, 180, 160);
  }
}

function getMysteryMap() {
  const map = {};
  for (const m of state.config.mysteries) {
    map[m.id] = m;
  }
  return map;
}

function getMysteryOrderMap() {
  const map = {};
  const byGroup = {
    gozosos: 0,
    dolorosos: 0,
    gloriosos: 0,
    luminosos: 0
  };
  for (const mystery of state.config.mysteries) {
    byGroup[mystery.group] += 1;
    map[mystery.id] = byGroup[mystery.group];
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
  botLabel.innerHTML = "<input type='checkbox'> Máquina";
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
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.admin) {
    if (state.adminToken) {
      headers["X-Admin-Authorization"] = `Bearer ${state.adminToken}`;
    }
  } else if (state.userToken) {
    headers.Authorization = `Bearer ${state.userToken}`;
  }
  const requestOptions = { ...options };
  delete requestOptions.admin;
  const response = await fetch(path, {
    ...requestOptions,
    headers
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch (_err) {
    throw new Error(`Respuesta no JSON en ${path}: ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    if (response.status === 401 && !options.admin) {
      state.userToken = null;
      state.username = null;
      localStorage.removeItem("userToken");
      localStorage.removeItem("username");
      renderSessionUi();
    }
    throw new Error(body.error || "Error de API");
  }
  return body;
}

function renderSessionUi() {
  const loginBox = document.getElementById("loginBox");
  const sessionBox = document.getElementById("sessionBox");
  const text = document.getElementById("sessionText");
  if (state.userToken && state.username) {
    loginBox.classList.add("hidden");
    sessionBox.classList.remove("hidden");
    text.textContent = `Sesión iniciada: ${state.username}`;
  } else {
    loginBox.classList.remove("hidden");
    sessionBox.classList.add("hidden");
    text.textContent = "";
  }
}

async function loginUser() {
  const username = document.getElementById("usernameInput").value.trim();
  const pin = document.getElementById("pinInput").value.trim();
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, pin })
  });
  state.userToken = data.token;
  state.username = data.username;
  localStorage.setItem("userToken", state.userToken);
  localStorage.setItem("username", state.username);
  renderSessionUi();
  await refreshSavedGames();
}

function logoutUser() {
  state.userToken = null;
  state.username = null;
  localStorage.removeItem("userToken");
  localStorage.removeItem("username");
  state.gameId = null;
  state.gameState = null;
  gamePanelEl.classList.add("hidden");
  userPanelEl.classList.remove("hidden");
  setupPanelEl.classList.remove("hidden");
  savedPanelEl.classList.remove("hidden");
  setDefaultGameName(true);
  renderSessionUi();
  savedGamesEl.innerHTML = "<li>Inicia sesión para ver partidas.</li>";
}

async function openAdminPanel() {
  document.getElementById("adminModal").classList.remove("hidden");
  document.getElementById("adminSaveBtn").classList.add("hidden");
  document.getElementById("adminPassword").value = "";

  if (state.adminToken) {
    try {
      await loadAdminContent();
      return;
    } catch (_err) {
      state.adminToken = null;
    }
  }

  document.getElementById("adminLoginBox").classList.remove("hidden");
  document.getElementById("adminEditorBox").classList.add("hidden");
}

function closeAdminPanel() {
  document.getElementById("adminModal").classList.add("hidden");
}

function createQuestionCard(question, index) {
  const wrap = document.createElement("div");
  wrap.className = "adminItem";
  wrap.innerHTML = `
    <div class="adminItemHead">
      <strong>Pregunta ${index + 1}</strong>
      <button class="ghost" data-remove-question="${index}">Eliminar</button>
    </div>
    <label class="field">Pregunta
      <input data-q-question="${index}" value="${escAttr(question.question)}" />
    </label>
    <label class="field">Respuesta A
      <input data-q-opt-a="${index}" value="${escAttr((question.options && question.options[0]) || "")}" />
    </label>
    <label class="field">Respuesta B
      <input data-q-opt-b="${index}" value="${escAttr((question.options && question.options[1]) || "")}" />
    </label>
    <label class="field">Respuesta C
      <input data-q-opt-c="${index}" value="${escAttr((question.options && question.options[2]) || "")}" />
    </label>
    <label class="field">Respuesta correcta
      <select data-q-correct="${index}">
        <option value="0">A</option>
        <option value="1">B</option>
        <option value="2">C</option>
      </select>
    </label>
  `;
  const select = wrap.querySelector(`[data-q-correct='${index}']`);
  select.value = String(Number.isInteger(question.correctIndex) ? question.correctIndex : 0);
  return wrap;
}

function createSurpriseCard(card, index) {
  const wrap = document.createElement("div");
  wrap.className = "adminItem";
  wrap.innerHTML = `
    <div class="adminItemHead">
      <strong>Sorpresa ${index + 1}</strong>
      <button class="ghost" data-remove-surprise="${index}">Eliminar</button>
    </div>
    <label class="field">Texto
      <input data-s-text="${index}" value="${escAttr(card.text)}" />
    </label>
    <label class="field">Dinero (+/-)
      <input data-s-money="${index}" type="number" value="${card.money || 0}" />
    </label>
    <label class="field">Mover casillas
      <input data-s-move="${index}" type="number" value="${card.moveBy || 0}" />
    </label>
    <label class="field">Pierde turnos
      <input data-s-skip="${index}" type="number" value="${card.skipTurns || 0}" />
    </label>
    <label><input data-s-gostart="${index}" type="checkbox" ${card.goStart ? "checked" : ""} /> Ir a SALIDA</label>
  `;
  return wrap;
}

function renderAdminEditors(content) {
  const qBox = document.getElementById("questionsFields");
  const sBox = document.getElementById("surprisesFields");
  qBox.innerHTML = "";
  sBox.innerHTML = "";

  content.quizQuestions.forEach((q, idx) => qBox.appendChild(createQuestionCard(q, idx)));
  content.surpriseCards.forEach((s, idx) => sBox.appendChild(createSurpriseCard(s, idx)));

  qBox.querySelectorAll("[data-remove-question]").forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.removeQuestion);
      content.quizQuestions.splice(idx, 1);
      renderAdminEditors(content);
    };
  });
  sBox.querySelectorAll("[data-remove-surprise]").forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.removeSurprise);
      content.surpriseCards.splice(idx, 1);
      renderAdminEditors(content);
    };
  });

  document.getElementById("addQuestionBtn").onclick = () => {
    content.quizQuestions.push({
      id: `q${Date.now()}`,
      question: "",
      options: ["", "", ""],
      correctIndex: 0
    });
    renderAdminEditors(content);
  };

  document.getElementById("addSurpriseBtn").onclick = () => {
    content.surpriseCards.push({ text: "", money: 0, moveBy: 0, skipTurns: 0, goStart: false });
    renderAdminEditors(content);
  };
}

function readAdminEditors() {
  const quizQuestions = [];
  const surpriseCards = [];

  const questionItems = [...document.querySelectorAll("#questionsFields .adminItem")];
  questionItems.forEach((_, idx) => {
    const question = document.querySelector(`[data-q-question='${idx}']`).value.trim();
    const a = document.querySelector(`[data-q-opt-a='${idx}']`).value.trim();
    const b = document.querySelector(`[data-q-opt-b='${idx}']`).value.trim();
    const c = document.querySelector(`[data-q-opt-c='${idx}']`).value.trim();
    const correctIndex = Number(document.querySelector(`[data-q-correct='${idx}']`).value);
    quizQuestions.push({
      id: `q${idx + 1}`,
      question,
      options: [a, b, c],
      correctIndex
    });
  });

  const surpriseItems = [...document.querySelectorAll("#surprisesFields .adminItem")];
  surpriseItems.forEach((_, idx) => {
    const text = document.querySelector(`[data-s-text='${idx}']`).value.trim();
    const money = Number(document.querySelector(`[data-s-money='${idx}']`).value || 0);
    const moveBy = Number(document.querySelector(`[data-s-move='${idx}']`).value || 0);
    const skipTurns = Number(document.querySelector(`[data-s-skip='${idx}']`).value || 0);
    const goStart = document.querySelector(`[data-s-gostart='${idx}']`).checked;
    const card = { text };
    if (money) {
      card.money = money;
    }
    if (moveBy) {
      card.moveBy = moveBy;
    }
    if (skipTurns) {
      card.skipTurns = skipTurns;
    }
    if (goStart) {
      card.goStart = true;
    }
    surpriseCards.push(card);
  });

  return { quizQuestions, surpriseCards };
}

function clearValidationMarks() {
  document.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}

function markInvalid(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.add("invalid");
  }
}

function validateAdminEditors() {
  clearValidationMarks();
  const errors = [];

  const questionItems = [...document.querySelectorAll("#questionsFields .adminItem")];
  if (!questionItems.length) {
    errors.push("Debe haber al menos una pregunta.");
  }
  questionItems.forEach((_, idx) => {
    const q = document.querySelector(`[data-q-question='${idx}']`).value.trim();
    const a = document.querySelector(`[data-q-opt-a='${idx}']`).value.trim();
    const b = document.querySelector(`[data-q-opt-b='${idx}']`).value.trim();
    const c = document.querySelector(`[data-q-opt-c='${idx}']`).value.trim();
    if (!q) {
      errors.push(`Pregunta ${idx + 1}: enunciado vacío.`);
      markInvalid(`[data-q-question='${idx}']`);
    }
    if (!a) {
      errors.push(`Pregunta ${idx + 1}: falta respuesta A.`);
      markInvalid(`[data-q-opt-a='${idx}']`);
    }
    if (!b) {
      errors.push(`Pregunta ${idx + 1}: falta respuesta B.`);
      markInvalid(`[data-q-opt-b='${idx}']`);
    }
    if (!c) {
      errors.push(`Pregunta ${idx + 1}: falta respuesta C.`);
      markInvalid(`[data-q-opt-c='${idx}']`);
    }
  });

  const surpriseItems = [...document.querySelectorAll("#surprisesFields .adminItem")];
  if (!surpriseItems.length) {
    errors.push("Debe haber al menos una sorpresa.");
  }
  surpriseItems.forEach((_, idx) => {
    const text = document.querySelector(`[data-s-text='${idx}']`).value.trim();
    if (!text) {
      errors.push(`Sorpresa ${idx + 1}: texto vacío.`);
      markInvalid(`[data-s-text='${idx}']`);
    }
  });

  return errors;
}

async function loadAdminContent() {
  const data = await api("/api/admin/content", { admin: true });
  state.adminContent = JSON.parse(JSON.stringify(data));
  renderAdminEditors(state.adminContent);
  document.getElementById("adminLoginBox").classList.add("hidden");
  document.getElementById("adminEditorBox").classList.remove("hidden");
  document.getElementById("adminSaveBtn").classList.remove("hidden");
}

async function adminLogin() {
  const password = document.getElementById("adminPassword").value;
  const data = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password })
  });
  state.adminToken = data.token;
  await loadAdminContent();
}

async function adminSave() {
  const errors = validateAdminEditors();
  if (errors.length) {
    alert(`Revisa el formulario:\n- ${errors.slice(0, 6).join("\n- ")}`);
    return;
  }

  const { quizQuestions, surpriseCards } = readAdminEditors();
  await api("/api/admin/content", {
    method: "PUT",
    body: JSON.stringify({ quizQuestions, surpriseCards }),
    admin: true
  });
  alert("Contenido guardado. Las nuevas partidas usarán estos cambios.");
  state.config = await api("/api/config");
}

function renderSavedGames(list) {
  savedGamesEl.innerHTML = "";
  if (!state.userToken) {
    savedGamesEl.innerHTML = "<li>Inicia sesión para ver tus partidas.</li>";
    return;
  }
  if (!list.length) {
    savedGamesEl.innerHTML = "<li>No hay partidas guardadas.</li>";
    return;
  }
  for (const game of list) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.textContent = `Cargar: ${game.name} (turno ${game.turn})`;
    btn.onclick = () => loadGame(game.id);
    const delBtn = document.createElement("button");
    delBtn.textContent = "Eliminar";
    delBtn.className = "ghost";
    delBtn.onclick = () => deleteGame(game.id).catch((err) => alert(err.message));
    li.appendChild(btn);
    li.appendChild(delBtn);
    savedGamesEl.appendChild(li);
  }
}

function renderBoard() {
  const game = state.gameState;
  closeMysteryModal();
  const mysteryMap = getMysteryMap();
  const mysteryOrderMap = getMysteryOrderMap();
  const currentPlayer = game.players[game.currentPlayerIndex];
  const { rows, cols, positions, perimeter } = getTrackMeta(game.board.length);
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  boardEl.innerHTML = "";

  const centerRowStart = 3;
  const centerRowEnd = Math.max(4, rows - 2);
  const centerColStart = 3;
  const centerColEnd = Math.max(4, cols - 2);
  const center = document.createElement("div");
  center.className = "boardCenter";
  center.style.gridRow = `${centerRowStart} / ${centerRowEnd + 1}`;
  center.style.gridColumn = `${centerColStart} / ${centerColEnd + 1}`;
  center.innerHTML = `
    <div class="pile" id="pile-surprise"><div class="pileTop">Ⓢ Sorpresa</div></div>
    <div class="pile" id="pile-mystery"><div class="pileTop">Ⓜ Misterios</div></div>
  `;
  boardEl.appendChild(center);

  const overlay = document.createElement("div");
  overlay.id = "centerOverlay";
  overlay.className = "centerOverlay";
  boardEl.appendChild(overlay);

  for (let i = 0; i < game.board.length; i += 1) {
    const cell = game.board[i];
    const tile = document.createElement("div");
    tile.className = "cell";
    tile.dataset.index = String(i);
    const [r, c] = positions[i] || [1, 1];
    tile.style.gridRow = String(r);
    tile.style.gridColumn = String(c);

    let name = cell.name || cell.type;
    let label = "";
    let groupText = "";
    let ownerText = "";
    let statusText = "";
    let iconText = "";
    if (cell.type === "mystery") {
      const mystery = mysteryMap[cell.mysteryId];
      tile.classList.add("mystery");
      name = mystery.name;
      label = `${mysteryOrderMap[mystery.id]}º ${mystery.name}`;
      groupText = groupShortLabels[mystery.group];
      tile.style.borderTop = `6px solid ${mystery.color}`;
      tile.style.backgroundColor = hexToRgba(mystery.color, 0.17);
      const ownerId = game.ownership[mystery.id];
      if (ownerId) {
        const owner = game.players.find((p) => p.id === ownerId);
        if (owner) {
          const ownerIndex = game.players.findIndex((p) => p.id === ownerId);
          const ownerColor = colors[(ownerIndex >= 0 ? ownerIndex : 0) % colors.length];
          ownerText = `<span class="mysteryOwnerInfo"><span class="ownerMark" style="background:${ownerColor}"></span>${escAttr(owner.name)}</span>`;
          statusText = `Comprado por: ${owner.name}`;
        } else {
          ownerText = "Asignado";
          statusText = "Comprado";
        }
      } else {
        ownerText = `Libre: ${formatMoney(mystery.cost)}`;
        statusText = "Libre";
      }
    } else if (cell.type === "surprise") {
      name = "Sorpresa";
      iconText = "S";
      tile.classList.add("surprise");
    } else if (cell.type === "quiz") {
      name = "Pregunta Trivial";
      iconText = "?";
      tile.classList.add("quiz");
    } else {
      if (cell.type === "start") {
        iconText = "GO";
      } else if (cell.type === "goStart") {
        iconText = ">>";
      } else if (cell.type === "rest") {
        iconText = "R";
      }
      tile.classList.add("special");
    }

    const tokens = game.players
      .map((p, idx) => ({ player: p, idx }))
      .filter((x) => x.player.position === i && !x.player.bankrupt && x.player.id !== state.animatingPlayerId)
      .map((x) => {
        const currentClass = currentPlayer && x.player.id === currentPlayer.id ? " currentTurnToken" : "";
        return `<span class="token${currentClass}" style="background:${colors[x.idx % colors.length]}" title="${x.player.name}"></span>`;
      })
      .join("");

    if (cell.type === "mystery") {
      tile.innerHTML = `<div class="mysteryText"><div class="group">${groupText}</div><div class="label">${label}</div><div class="owner">${ownerText}</div></div><div class="tokens mysteryTokens">${tokens}</div>`;
      const mystery = mysteryMap[cell.mysteryId];
      const order = mysteryOrderMap[mystery.id];
      tile.tabIndex = 0;
      tile.addEventListener("click", () => showMysteryModal({ mystery, order, statusText }));
      tile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showMysteryModal({ mystery, order, statusText });
        }
      });
    } else {
      tile.innerHTML = `<div class="cellTop"><span class="cellIcon">${iconText}</span></div><div class="name">${name}</div><div class="owner">${ownerText}</div><div class="tokens">${tokens}</div>`;
    }
    boardEl.appendChild(tile);
  }

  for (let i = game.board.length; i < perimeter.length; i += 1) {
    const [r, c] = perimeter[i];
    const tile = document.createElement("div");
    tile.className = "cell filler quiz";
    tile.style.gridRow = String(r);
    tile.style.gridColumn = String(c);
    tile.innerHTML = "<div class='cellTop'><span class='cellIcon'>?</span></div><div class='name'>Pregunta</div><div class='owner'>Casilla extra</div>";
    boardEl.appendChild(tile);
  }
}

function liftPile(type) {
  const pile = document.getElementById(`pile-${type}`);
  if (!pile) {
    return;
  }
  pile.classList.remove("lift");
  void pile.offsetWidth;
  pile.classList.add("lift");
  setTimeout(() => {
    pile.classList.remove("lift");
  }, 420);
}

async function showFloatingCard(type, title, lines = [], options = {}) {
  const visibleMs = Number.isFinite(options.visibleMs) ? options.visibleMs : 1250;
  const requireContinue = !!options.requireContinue;
  const continueLabel = options.continueLabel || "Continuar";
  const overlay = document.getElementById("centerOverlay");
  if (!overlay) {
    return;
  }
  overlay.classList.add("active");
  const card = document.createElement("div");
  card.className = `floatingCard ${type}`;
  const linesHtml = lines
    .filter(Boolean)
    .map((line) => `<div class="floatingLine">${line}</div>`)
    .join("");
  card.innerHTML = `
    <div class="floatingTitle">${title}</div>
    ${linesHtml}
  `;
  if (requireContinue) {
    const continueBtn = document.createElement("button");
    continueBtn.className = "centerActionBtn continueBtn";
    continueBtn.textContent = continueLabel;
    card.appendChild(continueBtn);
  }
  overlay.appendChild(card);
  await sleep(20);
  card.classList.add("show");
  if (requireContinue) {
    await new Promise((resolve) => {
      const btn = card.querySelector(".continueBtn");
      if (!btn) {
        resolve();
        return;
      }
      btn.addEventListener("click", () => resolve(), { once: true });
    });
  } else {
    await sleep(visibleMs);
  }
  card.classList.remove("show");
  await sleep(220);
  card.remove();
  if (!overlay.querySelector(".floatingCard")) {
    overlay.classList.remove("active");
  }
}

async function showPaymentCardIfNeeded() {
  if (!state.gameState || !state.gameState.lastPayment || state.gameState.lastMoneyEvent) {
    return;
  }
  const payment = state.gameState.lastPayment;
  const toName = payment.to && payment.to !== "banco" ? formatPlayerName(payment.to) : null;
  const toText = toName ? `a ${toName}` : "al banco";
  const fromName = formatPlayerName(payment.from);
  const mysteryHtml = payment.mysteryName
    ? `<span class="moneyMysteryName">${payment.mysteryName}</span>`
    : "";
  const mainLine = mysteryHtml
    ? `${fromName} paga ${formatMoney(payment.amount)} ${toText} por ${mysteryHtml}`
    : `${fromName} paga ${formatMoney(payment.amount)} ${toText}`;
  await showFloatingCard("surprise", "💸 Pago realizado", [
    mainLine,
    payment.reason || ""
  ], { requireContinue: true });
}

async function showMoneyEventCardIfNeeded() {
  if (!state.gameState) {
    return;
  }
  let text = state.gameState.lastMoneyEvent;
  if (!text && Array.isArray(state.gameState.log)) {
    const logMoney = state.gameState.log.find((line) => /\bpaga\b|\bgana\b|\bcobra\b/i.test(line));
    text = logMoney || null;
  }
  if (!text || text === state.lastShownMoneyEvent) {
    return;
  }
  if (state.gameState.lastDraw && state.gameState.lastDraw.type === "surprise") {
    state.lastShownMoneyEvent = text;
    return;
  }
  text = text.replace(/\bMaquina\b/g, "Máquina");

  const isPayment = /\bpaga\b/i.test(text);
  const cardType = isPayment ? "moneyPay" : "moneyGain";
  const title = isPayment ? "💸 Pago" : "💶 Ganancia";
  let renderedText = text;
  if (isPayment) {
    renderedText = text.replace(/(\spor\s)([^.]+)(\.?$)/i, (_m, prefix, mysteryName, end) => {
      return `${prefix}<span class="moneyMysteryName">${mysteryName.trim()}</span>${end || ""}`;
    });
  }
  await showFloatingCard(cardType, title, [renderedText], { requireContinue: true });
  state.lastShownMoneyEvent = text;
}

async function showSurpriseCardIfNeeded() {
  if (!state.gameState || !state.gameState.lastDraw || state.gameState.lastDraw.type !== "surprise") {
    return;
  }
  const key = `${state.gameState.turn}|${state.gameState.currentPlayerIndex}|${state.gameState.lastDraw.text}`;
  if (key === state.lastShownDrawKey) {
    return;
  }
  state.lastShownDrawKey = key;
  liftPile("surprise");
  await showFloatingCard("surprise", "Tarjeta Sorpresa", [state.gameState.lastDraw.text], { requireContinue: true });
}

async function showCenterCardMessageIfNeeded() {
  if (!state.gameState || !state.gameState.lastCenterCard) {
    return;
  }
  const card = state.gameState.lastCenterCard;
  const key = `${state.gameState.turn}|${state.gameState.currentPlayerIndex}|${card.title}|${(card.lines || []).join("|")}`;
  if (key === state.lastShownCenterCardKey) {
    return;
  }
  state.lastShownCenterCardKey = key;
  await showFloatingCard(card.type || "mystery", card.title || "Aviso", card.lines || [], { requireContinue: true });
}

function animateNumber(el, from, to, duration = 780) {
  if (!el) {
    return;
  }
  const start = performance.now();
  const diff = to - from;
  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const value = Math.round(from + diff * progress);
    el.textContent = String(value);
    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}

function animatePlayerStats() {
  if (!state.previousGameState || !state.gameState) {
    return;
  }
  const prevById = Object.fromEntries(state.previousGameState.players.map((p) => [p.id, p]));
  for (const player of state.gameState.players) {
    const prev = prevById[player.id];
    if (!prev) {
      continue;
    }
    const moneyEl = document.getElementById(`moneyValue-${player.id}`);
    const moneyDeltaEl = document.getElementById(`moneyDelta-${player.id}`);

    const moneyDiff = Number(player.money || 0) - Number(prev.money || 0);

    if (moneyDiff !== 0) {
      animateNumber(moneyEl, Number(prev.money || 0), Number(player.money || 0));
      if (moneyDeltaEl) {
        moneyDeltaEl.textContent = `${moneyDiff > 0 ? "+" : ""}${moneyDiff} €`;
        moneyDeltaEl.className = `deltaBadge ${moneyDiff > 0 ? "up" : "down"}`;
      }
    }
  }
}

function renderPlayers() {
  const container = document.getElementById("playersInfo");
  const current = state.gameState.players[state.gameState.currentPlayerIndex];
  const mysteryMap = getMysteryMap();
  const mysteryOrderMap = getMysteryOrderMap();
  container.innerHTML = "";
  state.gameState.players.forEach((player, idx) => {
    const div = document.createElement("div");
    div.className = `playerCard ${player.id === current.id ? "current" : ""} ${player.isBot ? "bot" : "human"}`;
    const role = player.isBot ? "Máquina" : "Alumno";
    const badge = `<span class="playerToken" style="background:${colors[idx % colors.length]}"></span>`;
    const ownedMysteriesSorted = player.ownedMysteries
      .map((id) => mysteryMap[id])
      .filter(Boolean)
      .sort((a, b) => {
        const groupDiff = (groupOrder[a.group] ?? 99) - (groupOrder[b.group] ?? 99);
        if (groupDiff !== 0) {
          return groupDiff;
        }
        return (mysteryOrderMap[a.id] ?? 99) - (mysteryOrderMap[b.id] ?? 99);
      });

    const grouped = {};
    for (const mystery of ownedMysteriesSorted) {
      if (!grouped[mystery.group]) {
        grouped[mystery.group] = [];
      }
      grouped[mystery.group].push(mystery);
    }

    const groupKeys = ["gozosos", "dolorosos", "gloriosos", "luminosos"];
    const ownedGroupsHtml = groupKeys
      .filter((group) => grouped[group] && grouped[group].length)
      .map((group) => {
        const tags = grouped[group]
          .map((m) => `<span class="ownedTag" style="background:${m.color}">${mysteryOrderMap[m.id]}º ${m.name}</span>`)
          .join("");
        return `<div class="ownedGroup"><div class="ownedGroupTitle">${groupLabels[group]}</div><div class="ownedList">${tags}</div></div>`;
      })
      .join("");
    div.innerHTML = `
      <div class="playerNameRow">${badge}<strong>${formatPlayerName(player.name)}</strong> (${role}) · 💰 <span id="moneyValue-${player.id}">${player.money}</span> € <span id="moneyDelta-${player.id}" class="deltaBadge"></span> · 📿 ${player.ownedMysteries.length}</div>
      <div>${ownedGroupsHtml || "<span>Sin misterios comprados</span>"}</div>
    `;
    container.appendChild(div);
  });
}

function renderLog() {
  const list = document.getElementById("recentLog");
  if (!list) {
    return;
  }
  list.innerHTML = state.gameState.log
    .slice(0, 3)
    .map((item, idx) => `<li class="${idx === 0 ? "latestEvent" : ""}">${String(item).replace(/\bMaquina\b/g, "Máquina")}</li>`)
    .join("");
}

function renderTurn() {
  const current = state.gameState.players[state.gameState.currentPlayerIndex];
  const who = current.isBot ? `${formatPlayerName(current.name)} (Máquina)` : formatPlayerName(current.name);
  const turnText = `Turno ${state.gameState.turn} | Juega: ${who}`;
  document.getElementById("turnInfo").textContent = turnText;
}

function renderPending() {
  const pending = state.gameState.pending;
  const overlay = document.getElementById("centerOverlay");
  if (!overlay) {
    return;
  }
  overlay.innerHTML = "";
  overlay.classList.remove("active");

  if (state.gameState.gameOver) {
    const winner = state.gameState.players.find((p) => p.id === state.gameState.winnerId);
    overlay.classList.add("active");
    overlay.innerHTML = `<div class="floatingCard mystery show persistent"><div class="floatingTitle">Partida terminada</div><div class="floatingLine">Gana ${winner.name}</div></div>`;
    document.getElementById("rollBtn").disabled = true;
    return;
  }

  document.getElementById("rollBtn").disabled = !!pending;
  if (!pending) {
    return;
  }

  overlay.classList.add("active");
  const card = document.createElement("div");
  card.className = "floatingCard question show persistent";

  if (pending.type === "mysteryQuiz") {
    card.classList.remove("question");
    card.classList.add("mystery");
    const mysteryMap = getMysteryMap();
    const mysteryOrderMap = getMysteryOrderMap();
    const mystery = mysteryMap[pending.mysteryId];
    if (mystery) {
      card.innerHTML = `<div class="floatingTitle">Tarjeta de Misterio</div><div class="floatingLine">${mysteryOrderMap[mystery.id]}º ${mystery.name}</div><div class="floatingLine big">${pending.question.question}</div>`;
    } else {
      card.innerHTML = `<div class="floatingTitle">Tarjeta de Misterio</div><div class="floatingLine big">${pending.message || "Responde para conseguir este misterio"}</div>`;
    }
    pending.question.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.className = "centerActionBtn";
      btn.dataset.answerIndex = String(idx);
      btn.onclick = () => resolveAction({ answerIndex: idx });
      card.appendChild(btn);
    });
  }

  if (pending.type === "quiz") {
    card.classList.remove("mystery");
    card.classList.add("question");
    card.innerHTML = `<div class="floatingTitle">Tarjeta de Pregunta</div><div class="floatingLine big">${pending.question.question}</div>`;
    pending.question.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.className = "centerActionBtn";
      btn.dataset.answerIndex = String(idx);
      btn.onclick = () => resolveAction({ answerIndex: idx });
      card.appendChild(btn);
    });
  }

  overlay.appendChild(card);
}

function renderAll() {
  userPanelEl.classList.add("hidden");
  setupPanelEl.classList.add("hidden");
  savedPanelEl.classList.add("hidden");
  gamePanelEl.classList.remove("hidden");
  document.getElementById("gameTitle").textContent = state.gameName;
  renderBoard();
  renderPlayers();
  animatePlayerStats();
  renderTurn();
  renderPending();
  renderLog();
}

async function refreshSavedGames() {
  if (!state.userToken) {
    renderSavedGames([]);
    return;
  }
  const list = await api("/api/games");
  renderSavedGames(list);
}

async function deleteGame(gameId) {
  await api(`/api/games/${gameId}`, { method: "DELETE" });
  if (state.gameId === gameId) {
    state.gameId = null;
    state.gameState = null;
    gamePanelEl.classList.add("hidden");
    userPanelEl.classList.remove("hidden");
    setupPanelEl.classList.remove("hidden");
    savedPanelEl.classList.remove("hidden");
    setDefaultGameName(true);
  }
  await refreshSavedGames();
}

async function startGame() {
  if (!state.userToken) {
    alert("Debes iniciar sesión para crear una partida.");
    return;
  }
  const players = collectPlayers();
  const durationInput = document.querySelector("input[name='duration']:checked");
  const payload = {
    name: document.getElementById("gameName").value,
    duration: durationInput ? durationInput.value : "media",
    players
  };
  const data = await api("/api/games", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.gameId = data.id;
  state.gameName = data.name;
  state.gameState = data.state;
  state.lastShownMoneyEvent = null;
  state.lastShownDrawKey = null;
  state.lastShownCenterCardKey = null;
  renderAll();
  await refreshSavedGames();
  if (!state.gameState.pending) {
    await runBotTurns();
  }
}

async function loadGame(gameId) {
  if (!state.userToken) {
    alert("Debes iniciar sesión.");
    return;
  }
  const data = await api(`/api/games/${gameId}`);
  state.gameId = data.id;
  state.gameName = data.name;
  state.gameState = data.state;
  state.lastShownMoneyEvent = null;
  state.lastShownDrawKey = null;
  state.lastShownCenterCardKey = null;
  renderAll();
  if (!state.gameState.pending) {
    await runBotTurns();
  }
}

async function finishGame() {
  if (!state.gameId) {
    return;
  }
  await api(`/api/games/${state.gameId}/finish`, { method: "POST", body: JSON.stringify({}) });
  state.gameId = null;
  state.gameState = null;
  gamePanelEl.classList.add("hidden");
  userPanelEl.classList.remove("hidden");
  setupPanelEl.classList.remove("hidden");
  savedPanelEl.classList.remove("hidden");
  setDefaultGameName(true);
  await refreshSavedGames();
}

async function roll() {
  const active = state.gameState.players[state.gameState.currentPlayerIndex];
  if (!active || active.isBot) {
    return;
  }

  playSound("dice");
  const previous = state.gameState;
  const movingPlayer = state.gameState.players[state.gameState.currentPlayerIndex];
  const movingPlayerId = movingPlayer.id;
  const movingPlayerIdx = state.gameState.currentPlayerIndex;
  const fromPosition = movingPlayer.position;
  const data = await api(`/api/games/${state.gameId}/roll`, {
    method: "POST",
    body: JSON.stringify({})
  });
  state.previousGameState = previous;
  state.gameState = data.state;
  playSound("move");
  if (!previous.pending && state.gameState.pending && state.gameState.pending.type === "quiz") {
    playSound("question");
  }
  state.animatingPlayerId = movingPlayerId;
  renderAll();
  const movedPlayerNow = state.gameState.players.find((player) => player.id === movingPlayerId);
  if (movedPlayerNow) {
    await animateMove(movingPlayerIdx, fromPosition, movedPlayerNow.position);
    state.animatingPlayerId = null;
    renderAll();
    const landed = state.gameState.board[movedPlayerNow.position];
    if (landed && landed.type === "quiz") {
      liftPile("question");
    }
    await showSurpriseCardIfNeeded();
    await showMoneyEventCardIfNeeded();
    await showPaymentCardIfNeeded();
  } else {
    state.animatingPlayerId = null;
  }
  await refreshSavedGames();
  if (!state.gameState.pending) {
    await runBotTurns();
  }
}

async function resolveAction(payload, skipBotLoop = false) {
  let shouldPlayCorrect = false;
  let shouldPlayWrong = false;
  if (state.gameState.pending && (state.gameState.pending.type === "quiz" || state.gameState.pending.type === "mysteryQuiz")) {
    const correct = Number(payload.answerIndex) === state.gameState.pending.question.correctIndex;
    shouldPlayCorrect = correct;
    shouldPlayWrong = !correct;
  }
  const previous = state.gameState;
  const data = await api(`/api/games/${state.gameId}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.previousGameState = previous;
  state.gameState = data.state;
  await showSurpriseCardIfNeeded();
  if (previous.pending && previous.pending.type === "mysteryQuiz" && shouldPlayCorrect) {
    liftPile("mystery");
    const mysteryMap = getMysteryMap();
    const mysteryOrderMap = getMysteryOrderMap();
    const mystery = mysteryMap[previous.pending.mysteryId];
    if (mystery) {
      await showFloatingCard("mystery", "Tarjeta de Misterio", [
        `¡Correcto! Has conseguido ${mysteryOrderMap[mystery.id]}º ${mystery.name}`
      ]);
    }
  }
  if (shouldPlayCorrect) {
    playSound("correct");
  }
  if (shouldPlayWrong) {
    playSound("wrong");
  }
  if (!previous.pending && state.gameState.pending && (state.gameState.pending.type === "quiz" || state.gameState.pending.type === "mysteryQuiz")) {
    playSound("question");
  }

  renderAll();
  await showCenterCardMessageIfNeeded();
  await showMoneyEventCardIfNeeded();
  await refreshSavedGames();
  if (!skipBotLoop) {
    await runBotTurns();
  }
}

async function runBotTurns() {
  if (!state.gameState || hasQuestionPending(state.gameState)) {
    return;
  }

  async function animateBotButtonPress(choice) {
    const overlay = document.getElementById("centerOverlay");
    if (!overlay) {
      return;
    }
    let target = null;
    if (Object.prototype.hasOwnProperty.call(choice, "answerIndex")) {
      target = overlay.querySelector(`[data-answer-index='${choice.answerIndex}']`);
    }
    if (!target) {
      return;
    }
    target.classList.add("autoPress");
    await sleep(420);
    target.classList.remove("autoPress");
  }

  function chooseBotAction(pending, bot) {
    if (!pending) {
      return {};
    }
    if (pending.type === "quiz" || pending.type === "mysteryQuiz") {
      const answerIndex = Math.random() < 0.7
        ? pending.question.correctIndex
        : Math.floor(Math.random() * pending.question.options.length);
      return { answerIndex };
    }
    return {};
  }

  let safety = 0;
  while (state.gameState && !state.gameState.gameOver && safety < 20) {
    if (hasQuestionPending(state.gameState)) {
      break;
    }
    if (state.gameState.pending && !state.gameState.players[state.gameState.currentPlayerIndex].isBot) {
      break;
    }

    const current = state.gameState.players[state.gameState.currentPlayerIndex];
    if (!current || !current.isBot) {
      break;
    }

    await sleep(1000);
    ensureAudio();
    playSound("dice");
    const beforeRoll = state.gameState;
    const fromPosition = current.position;
    const botId = current.id;
    const data = await api(`/api/games/${state.gameId}/roll`, {
      method: "POST",
      body: JSON.stringify({})
    });
    state.previousGameState = beforeRoll;
    state.gameState = data.state;
    playSound("move");
    state.animatingPlayerId = botId;
    renderAll();

    const movedBot = state.gameState.players.find((p) => p.id === botId);
    if (movedBot) {
      await animateMove(state.gameState.players.indexOf(movedBot), fromPosition, movedBot.position);
      state.animatingPlayerId = null;
      renderAll();
      const landed = state.gameState.board[movedBot.position];
      if (landed && landed.type === "quiz") {
        liftPile("question");
        playSound("question");
      }
      await showSurpriseCardIfNeeded();
      await showMoneyEventCardIfNeeded();
      await showPaymentCardIfNeeded();
    } else {
      state.animatingPlayerId = null;
    }

    if (state.gameState.pending) {
      const botNow = state.gameState.players[state.gameState.currentPlayerIndex];
      const pending = state.gameState.pending;
      const choice = chooseBotAction(pending, botNow);

      if (pending.type === "quiz") {
        liftPile("question");
        playSound("question");
        await showFloatingCard("question", "Tarjeta de Pregunta", [pending.question.question]);
      }
      if (pending.type === "mysteryQuiz") {
        liftPile("mystery");
        await showFloatingCard("mystery", "Tarjeta de Misterio", [pending.question.question]);
      }

      await animateBotButtonPress(choice);
      await sleep(1400);
      await resolveAction(choice, true);
    } else {
      await refreshSavedGames();
    }

    await sleep(500);

    safety += 1;
  }
}

function addDefaultPlayers() {
  playersFormEl.innerHTML = "";
  createPlayerRow("Alumno 1", false);
  createPlayerRow("Máquina", true);
}

async function init() {
  state.config = await api("/api/config");
  addDefaultPlayers();
  setDefaultGameName(true);
  renderSessionUi();

  if (mysteryModalEl) {
    mysteryModalEl.addEventListener("click", (event) => {
      if (event.target === mysteryModalEl) {
        closeMysteryModal();
      }
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mysteryModalEl && !mysteryModalEl.classList.contains("hidden")) {
      closeMysteryModal();
    }
  });

  document.getElementById("startBtn").onclick = () => startGame().catch(alert);
  document.getElementById("addPlayerBtn").onclick = () => {
    ensureAudio();
    if (playersFormEl.querySelectorAll(".playerRow").length >= 4) {
      alert("Máximo 4 jugadores");
      return;
    }
    createPlayerRow(`Jugador ${playersFormEl.querySelectorAll(".playerRow").length + 1}`, false);
  };
  document.getElementById("rollBtn").onclick = () => roll().catch(alert);
  document.getElementById("finishBtn").onclick = () => finishGame().catch(alert);
  document.getElementById("refreshSavedBtn").onclick = () => refreshSavedGames().catch(alert);
  document.getElementById("loginBtn").onclick = () => loginUser().catch((err) => alert(err.message));
  document.getElementById("logoutBtn").onclick = () => logoutUser();
  document.getElementById("startBtn").addEventListener("click", ensureAudio);
  document.getElementById("rollBtn").addEventListener("click", ensureAudio);
  document.getElementById("adminBtn").onclick = () => openAdminPanel().catch((err) => alert(err.message));
  document.getElementById("adminLoginBtn").onclick = () => adminLogin().catch((err) => alert(err.message));
  document.getElementById("adminSaveBtn").onclick = () => adminSave().catch((err) => alert(err.message));
  document.getElementById("adminCloseBtn").onclick = () => closeAdminPanel();
  document.getElementById("adminModal").onclick = (event) => {
    if (event.target.id === "adminModal") {
      closeAdminPanel();
    }
  };

  await refreshSavedGames();
}

init().catch((err) => alert(err.message));
