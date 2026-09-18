const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function energy(plays = 2) {
  const state = new Map([['chartarena_energy_v1', JSON.stringify({ plays, last: Date.now() })]]);
  const context = { window: {}, localStorage: { getItem: k => state.get(k), setItem: (k, v) => state.set(k, v) }, Date };
  vm.runInNewContext(fs.readFileSync('energy.js', 'utf8'), context);
  return context.window.NRG;
}

test('opening a round and checking availability do not spend a play', () => {
  const nrg = energy();
  const pass = nrg.createPass();
  assert.equal(pass.available(), true);
  assert.equal(nrg.plays(), 2);
});
test('confirmation spends once; duplicate confirmation and retry are free', () => {
  const nrg = energy();
  const pass = nrg.createPass();
  assert.equal(pass.consume(), true);
  assert.equal(pass.consume(), true);
  assert.equal(nrg.plays(), 1);
  pass.reset();
  assert.equal(pass.consume(), true);
  assert.equal(nrg.plays(), 0);
});
test('a paid round can be retried with no plays left, but the next cannot start', () => {
  const nrg = energy(1);
  const pass = nrg.createPass();
  assert.equal(pass.consume(), true);
  assert.equal(pass.available(), true);
  assert.equal(pass.consume(), true);
  pass.reset();
  assert.equal(pass.available(), false);
  assert.equal(pass.consume(), false);
  assert.equal(nrg.plays(), 0);
});
test('availability is checked again when another tab uses the last play', () => {
  const nrg = energy(1);
  const a = nrg.createPass(), b = nrg.createPass();
  assert.equal(a.available(), true);
  assert.equal(b.consume(), true);
  assert.equal(a.consume(), false);
  assert.equal(nrg.plays(), 0);
});
