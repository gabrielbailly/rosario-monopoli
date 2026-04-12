const MYSTERIES = [
  { id: "g1", name: "La Anunciación", group: "gozosos", color: "#4e79a7", cost: 120 },
  { id: "g2", name: "La Visitación", group: "gozosos", color: "#4e79a7", cost: 120 },
  { id: "g3", name: "El Nacimiento", group: "gozosos", color: "#4e79a7", cost: 140 },
  { id: "g4", name: "La Presentación", group: "gozosos", color: "#4e79a7", cost: 140 },
  { id: "g5", name: "El Niño Perdido y Hallado", group: "gozosos", color: "#4e79a7", cost: 160 },
  { id: "d1", name: "La Agonía en el Huerto", group: "dolorosos", color: "#e15759", cost: 160 },
  { id: "d2", name: "La Flagelación", group: "dolorosos", color: "#e15759", cost: 180 },
  { id: "d3", name: "La Coronación de Espinas", group: "dolorosos", color: "#e15759", cost: 180 },
  { id: "d4", name: "Jesús con la Cruz", group: "dolorosos", color: "#e15759", cost: 200 },
  { id: "d5", name: "La Crucifixión", group: "dolorosos", color: "#e15759", cost: 220 },
  { id: "gl1", name: "La Resurrección", group: "gloriosos", color: "#59a14f", cost: 200 },
  { id: "gl2", name: "La Ascensión", group: "gloriosos", color: "#59a14f", cost: 220 },
  { id: "gl3", name: "Pentecostés", group: "gloriosos", color: "#59a14f", cost: 220 },
  { id: "gl4", name: "La Asunción", group: "gloriosos", color: "#59a14f", cost: 240 },
  { id: "gl5", name: "La Coronación de María", group: "gloriosos", color: "#59a14f", cost: 260 },
  { id: "l1", name: "Bautismo en el Jordán", group: "luminosos", color: "#f28e2b", cost: 240 },
  { id: "l2", name: "Bodas de Caná", group: "luminosos", color: "#f28e2b", cost: 240 },
  { id: "l3", name: "Anuncio del Reino", group: "luminosos", color: "#f28e2b", cost: 260 },
  { id: "l4", name: "La Transfiguración", group: "luminosos", color: "#f28e2b", cost: 280 },
  { id: "l5", name: "La Eucaristía", group: "luminosos", color: "#f28e2b", cost: 300 }
];

const BOARD = [
  { type: "start", name: "SALIDA" },
  { type: "mystery", mysteryId: "g1" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "d1" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "g2" },
  { type: "mystery", mysteryId: "l5" },
  { type: "rest", name: "Descanso" },
  { type: "mystery", mysteryId: "gl1" },
  { type: "goStart", name: "Vuelve a SALIDA" },
  { type: "mystery", mysteryId: "d2" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "g3" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "l2" },
  { type: "mystery", mysteryId: "gl2" },
  { type: "mystery", mysteryId: "d3" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "g4" },
  { type: "rest", name: "Descanso" },
  { type: "mystery", mysteryId: "l3" },
  { type: "mystery", mysteryId: "gl3" },
  { type: "mystery", mysteryId: "d4" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "g5" },
  { type: "mystery", mysteryId: "l4" },
  { type: "rest", name: "Descanso" },
  { type: "mystery", mysteryId: "gl4" },
  { type: "mystery", mysteryId: "d5" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "l1" },
  { type: "mystery", mysteryId: "gl5" }
];

const QUIZ_QUESTIONS = [
  {
    id: "q1",
    question: "¿Qué misterio recuerda el anuncio del ángel a María?",
    options: ["La Anunciación", "La Ascensión", "La Coronación"],
    correctIndex: 0
  },
  {
    id: "q2",
    question: "¿En qué grupo está Pentecostés?",
    options: ["Gozosos", "Gloriosos", "Luminosos"],
    correctIndex: 1
  },
  {
    id: "q3",
    question: "¿Qué misterio luminoso sucede en una boda?",
    options: ["Bodas de Caná", "Transfiguración", "Eucaristía"],
    correctIndex: 0
  },
  {
    id: "q4",
    question: "¿Qué misterio doloroso habla de la cruz?",
    options: ["Flagelación", "Jesús con la Cruz", "Agonía en el Huerto"],
    correctIndex: 1
  },
  {
    id: "q5",
    question: "¿Cuántos misterios hay en cada grupo?",
    options: ["3", "5", "10"],
    correctIndex: 1
  },
  {
    id: "q6",
    question: "¿Qué misterio glorioso celebra que Jesús vive?",
    options: ["Resurrección", "Ascensión", "Asunción"],
    correctIndex: 0
  }
];

const SURPRISE_CARDS = [
  { text: "Ayudaste a un compañero: gana 80 €", money: 80 },
  { text: "Perdiste el turno por distracción", skipTurns: 1 },
  { text: "Memorizaste un misterio nuevo: avanza 2 casillas y gana 10 €", moveBy: 2, money: 10 },
  { text: "Donas para una buena causa: paga 60 €", money: -60 },
  { text: "Vuelve a SALIDA y cobra 120", goStart: true, money: 120 }
];

const GROUPS = ["gozosos", "dolorosos", "gloriosos", "luminosos"];

module.exports = {
  BOARD,
  GROUPS,
  MYSTERIES,
  QUIZ_QUESTIONS,
  SURPRISE_CARDS
};
