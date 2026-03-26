// 1001 Game Nights - Dice Factory Dice Helpers
// Version: 3.0.0 - Stub (to be implemented)

let _idCounter = 0;

const createDie = (sides) => ({
  id: `die-${++_idCounter}-${Math.random().toString(36).slice(2, 6)}`,
  sides,
  value: null,
});

const rollDie = (die) => ({
  ...die,
  value: Math.floor(Math.random() * die.sides) + 1,
});

const rollAll = (dice) => dice.map(rollDie);

module.exports = { createDie, rollDie, rollAll };
