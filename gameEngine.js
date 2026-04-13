const { BOARD, GROUPS, MYSTERIES, QUIZ_QUESTIONS, SURPRISE_CARDS } = require("./gameConfig");

const GROUP_SIZE = 5;

const DURATION_PRESETS = {
  corta: {
    startMoney: 700,
    passStartBonus: 70,
    startCellBonus: 40,
    goStartBonus: 80,
    restBonus: 25,
    quizReward: 70,
    rentDivisor: 4
  },
  media: {
    startMoney: 1000,
    passStartBonus: 90,
    startCellBonus: 50,
    goStartBonus: 100,
    restBonus: 30,
    quizReward: 80,
    rentDivisor: 5
  },
  larga: {
    startMoney: 1300,
    passStartBonus: 120,
    startCellBonus: 70,
    goStartBonus: 120,
    restBonus: 40,
    quizReward: 90,
    rentDivisor: 6
  }
};

const mysteryById = Object.fromEntries(MYSTERIES.map((m) => [m.id, m]));
const GROUP_LABELS = {
  gozosos: "Gozosos",
  dolorosos: "Dolorosos",
  gloriosos: "Gloriosos",
  luminosos: "Luminosos"
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(list) {
  return list[randomInt(0, list.length - 1)];
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createMysteryQuestion(mystery) {
  const groups = Object.keys(GROUP_LABELS);
  const wrongGroups = shuffle(groups.filter((g) => g !== mystery.group)).slice(0, 2);
  const options = shuffle([mystery.group, ...wrongGroups]).map((g) => GROUP_LABELS[g]);
  const correctIndex = options.indexOf(GROUP_LABELS[mystery.group]);
  return {
    question: `¿A qué grupo pertenece ${mystery.name}?`,
    options,
    correctIndex
  };
}

function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function createInitialState(playersInput, cards = {}, options = {}) {
  const duration = options.duration || "media";
  const rules = DURATION_PRESETS[duration] || DURATION_PRESETS.media;

  const players = playersInput.map((player, index) => ({
    id: `p${index + 1}`,
    name: player.name,
    isBot: !!player.isBot,
    position: 0,
    money: rules.startMoney,
    ownedMysteries: [],
    completedGroups: [],
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
    lastPayment: null,
    lastMoneyEvent: null,
    lastCenterCard: null,
    duration,
    rules,
    quizQuestions: Array.isArray(cards.quizQuestions) && cards.quizQuestions.length ? cards.quizQuestions : QUIZ_QUESTIONS,
    surpriseCards: Array.isArray(cards.surpriseCards) && cards.surpriseCards.length ? cards.surpriseCards : SURPRISE_CARDS,
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
    addLog(state, `${player.name} completó los 5 misterios ${group}.`);
  }
}

function movePlayer(state, player, steps) {
  const boardLength = state.board.length;
  const oldPosition = player.position;
  player.position = (player.position + steps + boardLength) % boardLength;
  if (steps > 0 && player.position < oldPosition) {
    player.money += state.rules.passStartBonus;
    state.lastMoneyEvent = `${player.name} gana ${state.rules.passStartBonus} € al pasar por SALIDA.`;
    addLog(state, `${player.name} pasó por SALIDA y ganó ${state.rules.passStartBonus} €.`);
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
    const question = createMysteryQuestion(mystery);
    state.pending = {
      type: "mysteryQuiz",
      mysteryId: mystery.id,
      question,
      message: `Responde correctamente para conseguir ${mystery.name}.`
    };
    return;
  }

  if (ownerId === player.id) {
    addLog(state, `${player.name} cae en su propio misterio ${mystery.name}.`);
    return;
  }

  const owner = state.players.find((p) => p.id === ownerId);
  const rent = Math.max(15, Math.floor(mystery.cost / state.rules.rentDivisor));
  const question = createMysteryQuestion(mystery);
  state.pending = {
    type: "mysteryOwnerQuiz",
    mysteryId: mystery.id,
    ownerId,
    ownerName: owner ? owner.name : "dueño",
    rent,
    question,
    message: `Responde bien para librarte de pagar ${rent} € por ${mystery.name}.`
  };
}

function resolveSurprise(state, player) {
  const card = pickOne(state.surpriseCards && state.surpriseCards.length ? state.surpriseCards : SURPRISE_CARDS);
  state.lastDraw = { type: "surprise", text: card.text };
  addLog(state, `${player.name} sacó sorpresa: ${card.text}`);
  if (card.money) {
    player.money += card.money;
    if (card.money < 0) {
      state.lastPayment = {
        from: player.name,
        to: "banco",
        amount: Math.abs(card.money),
        reason: "Carta de sorpresa"
      };
      state.lastMoneyEvent = `${player.name} paga ${Math.abs(card.money)} € por sorpresa.`;
    }
    if (card.money > 0) {
      state.lastMoneyEvent = `${player.name} gana ${card.money} € por sorpresa.`;
    }
  }
  if (card.points) {
    player.money += card.points;
    if (card.points > 0) {
      state.lastMoneyEvent = `${player.name} gana ${card.points} € por sorpresa.`;
    }
    if (card.points < 0) {
      state.lastMoneyEvent = `${player.name} paga ${Math.abs(card.points)} € por sorpresa.`;
    }
  }
  if (card.skipTurns) {
    player.skipTurns += card.skipTurns;
  }
  if (card.moveBy) {
    movePlayer(state, player, card.moveBy);
  }
}

function resolveLanding(state, player) {
  const cell = state.board[player.position];
  if (cell.type === "mystery") {
    resolveMysteryLanding(state, player, cell);
    return;
  }
  if (cell.type === "surprise") {
    resolveSurprise(state, player);
    return;
  }
  if (cell.type === "goStart") {
    goToStart(state, player);
    player.money += state.rules.goStartBonus;
    state.lastMoneyEvent = `${player.name} gana ${state.rules.goStartBonus} € al volver a SALIDA.`;
    addLog(state, `${player.name} cobra ${state.rules.goStartBonus} € al volver a SALIDA.`);
    return;
  }
  if (cell.type === "rest") {
    player.money += state.rules.restBonus;
    state.lastMoneyEvent = `${player.name} gana ${state.rules.restBonus} € en descanso.`;
    addLog(state, `${player.name} descansa y gana ${state.rules.restBonus} €.`);
    return;
  }
  if (cell.type === "start") {
    player.money += state.rules.startCellBonus;
    state.lastMoneyEvent = `${player.name} gana ${state.rules.startCellBonus} € por caer en SALIDA.`;
    addLog(state, `${player.name} cae en SALIDA y gana ${state.rules.startCellBonus} €.`);
  }
}

function checkBankruptcy(state, player) {
  if (player.money > 0) {
    return;
  }
  player.bankrupt = true;
  player.money = 0;
  addLog(state, `${player.name} se queda sin dinero y sale de la partida.`);
  for (const mysteryId of player.ownedMysteries) {
    delete state.ownership[mysteryId];
  }
  player.ownedMysteries = [];
}

function maybeEndGame(state) {
  const activePlayers = state.players.filter((p) => !p.bankrupt);
  if (activePlayers.length === 0) {
    state.gameOver = true;
    let best = state.players[0];
    for (const player of state.players) {
      const score = player.money;
      const bestScore = best.money;
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
  state.lastDraw = null;
  state.lastPayment = null;
  state.lastMoneyEvent = null;
  state.lastCenterCard = null;
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
  state.lastMoneyEvent = null;
  state.lastCenterCard = null;
  const player = getCurrentPlayer(state);
  if (state.pending.type === "mysteryQuiz") {
    const mystery = mysteryById[state.pending.mysteryId];
    const isCorrect = Number(choice.answerIndex) === state.pending.question.correctIndex;
    if (isCorrect) {
      player.ownedMysteries.push(mystery.id);
      state.ownership[mystery.id] = player.id;
      awardGroupIfCompleted(state, player, mystery.group);
      addLog(state, `${player.name} consigue ${mystery.name} al acertar.`);
    } else {
      state.lastCenterCard = {
        type: "mystery",
        title: "Tarjeta de Misterio",
        lines: [
          "Respuesta incorrecta.",
          `No has conseguido ${mystery.name}.`
        ]
      };
      addLog(state, `${player.name} falla y no consigue ${mystery.name}.`);
    }
  }

  if (state.pending.type === "mysteryOwnerQuiz") {
    const mystery = mysteryById[state.pending.mysteryId];
    const owner = state.players.find((p) => p.id === state.pending.ownerId);
    const isCorrect = Number(choice.answerIndex) === state.pending.question.correctIndex;
    if (isCorrect) {
      state.lastCenterCard = {
        type: "mystery",
        title: "Tarjeta de Misterio",
        lines: [
          "¡Correcto!",
          `Te libras de pagar por ${mystery.name}.`
        ]
      };
      addLog(state, `${player.name} acierta y no paga alquiler por ${mystery.name}.`);
    } else if (owner && !owner.bankrupt) {
      const rent = Number(state.pending.rent || 0);
      player.money -= rent;
      owner.money += rent;
      state.lastPayment = {
        from: player.name,
        to: owner.name,
        amount: rent,
        reason: `Alquiler de ${mystery.name}`,
        mysteryName: mystery.name
      };
      state.lastMoneyEvent = `${player.name} paga ${rent} € a ${owner.name}.`;
      addLog(state, `${player.name} falla y paga ${rent} a ${owner.name} por ${mystery.name}.`);
    }
  }

  if (state.pending.type === "quiz") {
    const isCorrect = Number(choice.answerIndex) === state.pending.question.correctIndex;
    if (isCorrect) {
      player.money += state.rules.quizReward;
      state.lastMoneyEvent = `${player.name} gana ${state.rules.quizReward} € por acertar la pregunta.`;
      addLog(state, `${player.name} acierta la pregunta y gana premio.`);
    } else {
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
      } else if (state.pending.type === "quiz" || state.pending.type === "mysteryOwnerQuiz" || state.pending.type === "mysteryQuiz") {
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
