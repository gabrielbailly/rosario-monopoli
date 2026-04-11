const fs = require("fs");
const path = require("path");
const { QUIZ_QUESTIONS, SURPRISE_CARDS } = require("./gameConfig");

const cardsPath = path.join(__dirname, "cardsData.json");

function defaultCards() {
  return {
    quizQuestions: JSON.parse(JSON.stringify(QUIZ_QUESTIONS)),
    surpriseCards: JSON.parse(JSON.stringify(SURPRISE_CARDS))
  };
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
  const parsed = JSON.parse(raw);
  validateCards(parsed);
  return parsed;
}

function saveCards(payload) {
  validateCards(payload);
  fs.writeFileSync(cardsPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

module.exports = {
  getCards,
  saveCards
};
