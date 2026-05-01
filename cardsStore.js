const fs = require("fs");
const path = require("path");
const { MYSTERIES, QUIZ_QUESTIONS, SURPRISE_CARDS } = require("./gameConfig");
const { MYSTERY_QUESTIONS } = require("./gameEngine");

const cardsPath = path.join(__dirname, "cardsData.json");

function defaultCards() {
  return {
    quizQuestions: JSON.parse(JSON.stringify(QUIZ_QUESTIONS)),
    mysteryQuestions: JSON.parse(JSON.stringify(MYSTERY_QUESTIONS)),
    surpriseCards: JSON.parse(JSON.stringify(SURPRISE_CARDS))
  };
}

function normalizeCards(payload) {
  const defaults = defaultCards();
  const normalized = {
    ...defaults,
    ...(payload && typeof payload === "object" ? payload : {})
  };
  if (!normalized.mysteryQuestions || typeof normalized.mysteryQuestions !== "object" || Array.isArray(normalized.mysteryQuestions)) {
    normalized.mysteryQuestions = defaults.mysteryQuestions;
  }
  for (const mystery of MYSTERIES) {
    if (!Array.isArray(normalized.mysteryQuestions[mystery.id]) || !normalized.mysteryQuestions[mystery.id].length) {
      normalized.mysteryQuestions[mystery.id] = defaults.mysteryQuestions[mystery.id] || [];
    }
  }
  return normalized;
}

function validateCards(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Formato inválido: se esperaba un objeto.");
  }
  if (!Array.isArray(payload.quizQuestions) || payload.quizQuestions.length === 0) {
    throw new Error("Debe haber al menos una pregunta en quizQuestions.");
  }
  if (!Array.isArray(payload.surpriseCards) || payload.surpriseCards.length === 0) {
    throw new Error("Debe haber al menos una carta en surpriseCards.");
  }

  payload.quizQuestions.forEach((q, idx) => {
    if (!q || typeof q.question !== "string" || !q.question.trim()) {
      throw new Error(`Pregunta ${idx + 1} inválida.`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`Pregunta ${idx + 1}: options debe tener al menos 2 respuestas.`);
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new Error(`Pregunta ${idx + 1}: correctIndex fuera de rango.`);
    }
  });

  if (!payload.mysteryQuestions || typeof payload.mysteryQuestions !== "object" || Array.isArray(payload.mysteryQuestions)) {
    throw new Error("Debe haber preguntas en mysteryQuestions.");
  }
  for (const mystery of MYSTERIES) {
    const questions = payload.mysteryQuestions[mystery.id];
    if (!Array.isArray(questions) || !questions.length) {
      throw new Error(`Debe haber al menos una pregunta para ${mystery.name}.`);
    }
    questions.forEach((q, idx) => {
      if (!q || typeof q.question !== "string" || !q.question.trim()) {
        throw new Error(`${mystery.name}, pregunta ${idx + 1}: enunciado inválido.`);
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`${mystery.name}, pregunta ${idx + 1}: options debe tener al menos 2 respuestas.`);
      }
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        throw new Error(`${mystery.name}, pregunta ${idx + 1}: correctIndex fuera de rango.`);
      }
    });
  }

  payload.surpriseCards.forEach((card, idx) => {
    if (!card || typeof card.text !== "string" || !card.text.trim()) {
      throw new Error(`Carta sorpresa ${idx + 1} inválida.`);
    }
  });
}

function ensureCardsFile() {
  if (!fs.existsSync(cardsPath)) {
    fs.writeFileSync(cardsPath, JSON.stringify(defaultCards(), null, 2), "utf8");
  }
}

function getCards() {
  ensureCardsFile();
  const raw = fs.readFileSync(cardsPath, "utf8");
  const parsed = normalizeCards(JSON.parse(raw));
  validateCards(parsed);
  return parsed;
}

function saveCards(payload) {
  const normalized = normalizeCards(payload);
  validateCards(normalized);
  fs.writeFileSync(cardsPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

module.exports = {
  getCards,
  saveCards
};
