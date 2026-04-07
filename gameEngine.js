const { BOARD, GROUPS, MYSTERIES, QUIZ_QUESTIONS, SURPRISE_CARDS } = require("./gameConfig");

const GROUP_SIZE = 5;
const START_MONEY = 1200;
const MAX_TURNS = 80;
const HOTEL_COST = 150;

const mysteryById = Object.fromEntries(MYSTERIES.map((m) => [m.id, m]));

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(list) {
  return list[randomInt(0, list.length - 1)];
}

function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function createInitialState(playersInput) {
  const players = playersInput.map((player, index) => ({
    id: `p${index + 1}`,
    name: player.name,
    isBot: !!player.isBot,
    position: 0,
    money: START_MONEY,
    points: 0,
    ownedMysteries: [],
    completedGroups: [],
    hotels: [],
    skipTurns: 0,
    bankrupt: false
  }));

  return {
    version: 1,
    board: BOARD,
    ownership: {},
    turn: 1,
    currentPlayerIndex: 0,
    lastRoll: null,
    pending: null,
    log: ["Comienza la partida."],
    players,
    gameOver: false,
    winnerId: null
  };
}

function addLog(state, message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 25);
}

function awardGroupIfCompleted(state, player, group) {
  if (player.completedGroups.includes(group)) {
    return;
  }
  const groupCount = player.ownedMysteries
    .map((id) => mysteryById[id])
    .filter((m) => m.group === group).length;
  if (groupCount === GROUP_SIZE) {
    player.completedGroups.push(group);
    player.points += 120;
    addLog(state, `${player.name} completo los 5 misterios ${group} y desbloqueo hoteles.`);
  }
}

function movePlayer(state, player, steps) {
  const boardLength = state.board.length;
  const oldPosition = player.position;
  player.position = (player.position + steps + boardLength) % boardLength;
  if (steps > 0 && player.position < oldPosition) {
    player.money += 120;
    player.points += 15;
    addLog(state, `${player.name} paso por SALIDA y gano 120.`);
  }
}

function goToStart(state, player) {
  player.position = 0;
  addLog(state, `${player.name} vuelve a SALIDA.`);
}

function resolveMysteryLanding(state, player, cell) {
  const mystery = mysteryById[cell.mysteryId];
  const ownerId = state.ownership[mystery.id];

  if (!ownerId) {
    state.pending = {
      type: "buy",
      mysteryId: mystery.id,
      message: `${mystery.name} esta libre. Cuesta ${mystery.cost}.`
    };
    return;
  }

  if (ownerId === player.id) {
    const canBuild = player.completedGroups.includes(mystery.group) && !player.hotels.includes(mystery.id);
    if (canBuild) {
      state.pending = {
        type: "buildHotel",
        mysteryId: mystery.id,
        message: `Puedes construir hotel en ${mystery.name} por ${HOTEL_COST}.`
      };
      return;
    }
    addLog(state, `${player.name} cae en su propio misterio ${mystery.name}.`);
    return;
  }

  const owner = state.players.find((p) => p.id === ownerId);
  const hasHotel = owner.hotels.includes(mystery.id);
  const rent = hasHotel ? Math.floor(mystery.cost / 2) : Math.floor(mystery.cost / 5);

  player.money -= rent;
  owner.money += rent;
  owner.points += hasHotel ? 30 : 15;
  addLog(state, `${player.name} paga ${rent} a ${owner.name} por ${mystery.name}.`);
}

function resolveSurprise(state, player) {
  const card = pickOne(SURPRISE_CARDS);
  addLog(state, `${player.name} saco sorpresa: ${card.text}`);
  if (card.money) {
    player.money += card.money;
  }
  if (card.points) {
    player.points += card.points;
  }
  if (card.skipTurns) {
    player.skipTurns += card.skipTurns;
  }
  if (card.moveBy) {
    movePlayer(state, player, card.moveBy);
  }
  if (card.goStart) {
    goToStart(state, player);
  }
}

function resolveLanding(state, player) {
  const cell = state.board[player.position];
  if (cell.type === "mystery") {
    resolveMysteryLanding(state, player, cell);
    return;
  }
  if (cell.type === "quiz") {
    const question = pickOne(QUIZ_QUESTIONS);
    state.pending = { type: "quiz", question };
    addLog(state, `${player.name} cae en casilla Trivial Rosario.`);
    return;
  }
  if (cell.type === "surprise") {
    resolveSurprise(state, player);
    return;
  }
  if (cell.type === "goStart") {
    goToStart(state, player);
    player.money += 120;
    addLog(state, `${player.name} cobra 120 al volver a SALIDA.`);
    return;
  }
  if (cell.type === "rest") {
    player.points += 10;
    addLog(state, `${player.name} descansa y gana 10 puntos.`);
    return;
  }
  if (cell.type === "start") {
    player.money += 80;
    addLog(state, `${player.name} cae en SALIDA y gana 80.`);
  }
}

function checkBankruptcy(state, player) {
  if (player.money >= 0) {
    return;
  }
  player.bankrupt = true;
  player.money = 0;
  addLog(state, `${player.name} se queda sin dinero y sale de la partida.`);
  for (const mysteryId of player.ownedMysteries) {
    delete state.ownership[mysteryId];
  }
  player.ownedMysteries = [];
  player.hotels = [];
}

function maybeEndGame(state) {
  const activePlayers = state.players.filter((p) => !p.bankrupt);
  if (activePlayers.length <= 1 || state.turn > MAX_TURNS) {
    state.gameOver = true;
    let best = state.players[0];
    for (const player of state.players) {
      const score = player.points + player.money;
      const bestScore = best.points + best.money;
      if (score > bestScore) {
        best = player;
      }
    }
    state.winnerId = best.id;
    addLog(state, `Partida terminada. Gana ${best.name}.`);
  }
}

function nextTurn(state) {
  if (state.gameOver) {
    return;
  }
  let tries = 0;
  while (tries < state.players.length) {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
      state.turn += 1;
    }
    const player = getCurrentPlayer(state);
    if (!player.bankrupt) {
      if (player.skipTurns > 0) {
        player.skipTurns -= 1;
        addLog(state, `${player.name} pierde turno.`);
        tries += 1;
        continue;
      }
      break;
    }
    tries += 1;
  }
  maybeEndGame(state);
}

function rollDice(state) {
  if (state.gameOver) {
    return;
  }
  const player = getCurrentPlayer(state);
  if (player.bankrupt) {
    nextTurn(state);
    return;
  }
  const dice = randomInt(1, 6);
  state.lastRoll = dice;
  addLog(state, `${player.name} lanza un ${dice}.`);
  movePlayer(state, player, dice);
  resolveLanding(state, player);
  checkBankruptcy(state, player);
}

function resolvePending(state, choice) {
  if (!state.pending || state.gameOver) {
    return;
  }
  const player = getCurrentPlayer(state);
  if (state.pending.type === "buy") {
    const mystery = mysteryById[state.pending.mysteryId];
    if (choice.buy && player.money >= mystery.cost) {
      player.money -= mystery.cost;
      player.points += 35;
      player.ownedMysteries.push(mystery.id);
      state.ownership[mystery.id] = player.id;
      awardGroupIfCompleted(state, player, mystery.group);
      addLog(state, `${player.name} compro ${mystery.name}.`);
    } else {
      addLog(state, `${player.name} no compro ${mystery.name}.`);
    }
  }

  if (state.pending.type === "buildHotel") {
    const mystery = mysteryById[state.pending.mysteryId];
    if (choice.build && player.money >= HOTEL_COST) {
      player.money -= HOTEL_COST;
      player.points += 45;
      player.hotels.push(mystery.id);
      addLog(state, `${player.name} construyo hotel en ${mystery.name}.`);
    } else {
      addLog(state, `${player.name} decide no construir hotel.`);
    }
  }

  if (state.pending.type === "quiz") {
    const isCorrect = Number(choice.answerIndex) === state.pending.question.correctIndex;
    if (isCorrect) {
      player.money += 90;
      player.points += 30;
      addLog(state, `${player.name} acierta la pregunta y gana premio.`);
    } else {
      player.points = Math.max(0, player.points - 10);
      addLog(state, `${player.name} falla la pregunta.`);
    }
  }

  state.pending = null;
  checkBankruptcy(state, player);
  maybeEndGame(state);
  if (!state.gameOver) {
    nextTurn(state);
  }
}

function resolveBotTurn(state) {
  let safety = 0;
  while (!state.gameOver && getCurrentPlayer(state).isBot && safety < 20) {
    rollDice(state);
    if (state.pending) {
      if (state.pending.type === "buy") {
        const mystery = mysteryById[state.pending.mysteryId];
        resolvePending(state, { buy: getCurrentPlayer(state).money >= mystery.cost + 80 });
      } else if (state.pending.type === "buildHotel") {
        resolvePending(state, { build: getCurrentPlayer(state).money >= HOTEL_COST + 120 });
      } else if (state.pending.type === "quiz") {
        const answerIndex = Math.random() < 0.7
          ? state.pending.question.correctIndex
          : randomInt(0, state.pending.question.options.length - 1);
        resolvePending(state, { answerIndex });
      }
    } else {
      nextTurn(state);
    }
    safety += 1;
  }
}

module.exports = {
  MYSTERIES,
  createInitialState,
  getCurrentPlayer,
  nextTurn,
  resolveBotTurn,
  resolvePending,
  rollDice
};
