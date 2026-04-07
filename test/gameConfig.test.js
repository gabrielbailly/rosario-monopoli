const assert = require("assert");
const { BOARD, GROUPS, MYSTERIES } = require("../gameConfig");

const mysteryCells = BOARD.filter((c) => c.type === "mystery");

assert.strictEqual(mysteryCells.length, 20, "El tablero debe tener 20 casillas de misterios.");

for (const group of GROUPS) {
  const inGroup = MYSTERIES.filter((m) => m.group === group);
  assert.strictEqual(inGroup.length, 5, `El grupo ${group} debe tener 5 misterios.`);
}

process.stdout.write("OK: configuracion del tablero validada.\n");
