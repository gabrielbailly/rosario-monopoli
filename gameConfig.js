const MYSTERIES = [
  { id: "g1", name: "La Anunciacion", group: "gozosos", color: "#4e79a7", cost: 120 },
  { id: "g2", name: "La Visitacion", group: "gozosos", color: "#4e79a7", cost: 120 },
  { id: "g3", name: "El Nacimiento", group: "gozosos", color: "#4e79a7", cost: 140 },
  { id: "g4", name: "La Presentacion", group: "gozosos", color: "#4e79a7", cost: 140 },
  { id: "g5", name: "El Nino Perdido y Hallado", group: "gozosos", color: "#4e79a7", cost: 160 },
  { id: "d1", name: "La Agonia en el Huerto", group: "dolorosos", color: "#e15759", cost: 160 },
  { id: "d2", name: "La Flagelacion", group: "dolorosos", color: "#e15759", cost: 180 },
  { id: "d3", name: "La Coronacion de Espinas", group: "dolorosos", color: "#e15759", cost: 180 },
  { id: "d4", name: "Jesus con la Cruz", group: "dolorosos", color: "#e15759", cost: 200 },
  { id: "d5", name: "La Crucifixion", group: "dolorosos", color: "#e15759", cost: 220 },
  { id: "gl1", name: "La Resurreccion", group: "gloriosos", color: "#59a14f", cost: 200 },
  { id: "gl2", name: "La Ascension", group: "gloriosos", color: "#59a14f", cost: 220 },
  { id: "gl3", name: "Pentecostes", group: "gloriosos", color: "#59a14f", cost: 220 },
  { id: "gl4", name: "La Asuncion", group: "gloriosos", color: "#59a14f", cost: 240 },
  { id: "gl5", name: "La Coronacion de Maria", group: "gloriosos", color: "#59a14f", cost: 260 },
  { id: "l1", name: "Bautismo en el Jordan", group: "luminosos", color: "#f28e2b", cost: 240 },
  { id: "l2", name: "Bodas de Cana", group: "luminosos", color: "#f28e2b", cost: 240 },
  { id: "l3", name: "Anuncio del Reino", group: "luminosos", color: "#f28e2b", cost: 260 },
  { id: "l4", name: "La Transfiguracion", group: "luminosos", color: "#f28e2b", cost: 280 },
  { id: "l5", name: "La Eucaristia", group: "luminosos", color: "#f28e2b", cost: 300 }
];

const BOARD = [
  { type: "start", name: "SALIDA" },
  { type: "mystery", mysteryId: "g1" },
  { type: "quiz", name: "Trivial Rosario" },
  { type: "mystery", mysteryId: "g2" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "g3" },
  { type: "mystery", mysteryId: "g4" },
  { type: "goStart", name: "Vuelve a SALIDA" },
  { type: "mystery", mysteryId: "g5" },
  { type: "mystery", mysteryId: "d1" },
  { type: "quiz", name: "Trivial Rosario" },
  { type: "mystery", mysteryId: "d2" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "d3" },
  { type: "rest", name: "Descanso" },
  { type: "mystery", mysteryId: "d4" },
  { type: "mystery", mysteryId: "d5" },
  { type: "quiz", name: "Trivial Rosario" },
  { type: "mystery", mysteryId: "gl1" },
  { type: "surprise", name: "Sorpresa" },
  { type: "mystery", mysteryId: "gl2" },
  { type: "mystery", mysteryId: "gl3" },
  { type: "mystery", mysteryId: "gl4" },
  { type: "quiz", name: "Trivial Rosario" },
  { type: "mystery", mysteryId: "gl5" },
  { type: "mystery", mysteryId: "l1" },
  { type: "mystery", mysteryId: "l2" },
  { type: "mystery", mysteryId: "l3" },
  { type: "mystery", mysteryId: "l4" },
  { type: "mystery", mysteryId: "l5" }
];

const QUIZ_QUESTIONS = [
  {
    id: "q1",
    question: "Que misterio recuerda el anuncio del angel a Maria?",
    options: ["La Anunciacion", "La Ascension", "La Coronacion"],
    correctIndex: 0
  },
  {
    id: "q2",
    question: "En que grupo esta Pentecostes?",
    options: ["Gozosos", "Gloriosos", "Luminosos"],
    correctIndex: 1
  },
  {
    id: "q3",
    question: "Que misterio luminoso sucede en una boda?",
    options: ["Bodas de Cana", "Transfiguracion", "Eucaristia"],
    correctIndex: 0
  },
  {
    id: "q4",
    question: "Que misterio doloroso habla de la cruz?",
    options: ["Flagelacion", "Jesus con la Cruz", "Agonia en el Huerto"],
    correctIndex: 1
  },
  {
    id: "q5",
    question: "Cuantos misterios hay en cada grupo?",
    options: ["3", "5", "10"],
    correctIndex: 1
  },
  {
    id: "q6",
    question: "Que misterio glorioso celebra que Jesus vive?",
    options: ["Resurreccion", "Ascension", "Asuncion"],
    correctIndex: 0
  }
];

const SURPRISE_CARDS = [
  { text: "Ayudaste a un companero: gana 80 puntos", money: 80, points: 20 },
  { text: "Perdiste el turno por distraccion", skipTurns: 1 },
  { text: "Memorizaste un misterio nuevo: avanza 2 casillas", moveBy: 2, points: 10 },
  { text: "Donas para una buena causa: paga 60", money: -60, points: 15 },
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
