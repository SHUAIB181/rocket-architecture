const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
global.window = {}; const load = f => new Function(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'))();
load('mission-data.js'); load('systems-engine.js');
const { simulateAscent, LAUNCH_NASA: N, stdAtmosphere } = require('../js/launch-sim.js'); const { solve } = require('../js/autodebug.js'); const MM = require('../js/mission-math.js');
const M = window.MISSION_DATA, eng = new window.SystemsEngineeringEngine(M);
const base = { destinationId: 'mars', missionClassId: 'discovery', busId: 'discovery_medium', powerId: 'gaas_ultraflex', batteryId: 'li_ion_medium', propulsionId: 'biprop_mmh_nto', propellantMassKg: 420, thermalId: 'active_heaters_louvers', shieldingId: 'enhanced_vault', telecomId: 'high_gain_parabolic', avionicsId: 'dual_redundant_rad750', selectedInstrumentIds: ['high_res_camera', 'multispectral_imager', 'radar_sounder'], launchVehicleId: 'falcon_9' };
const cap = v => { let lo = 10, hi = 300000; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; simulateAscent(v, m, 'al_li_2195', 200, 0).summary.success ? lo = m : hi = m; } return lo; };

test('standard atmosphere matches published values', () => {
  const a = stdAtmosphere(0), b = stdAtmosphere(11000), c = stdAtmosphere(20000);
  assert.ok(Math.abs(a.p - 101325) < 5 && Math.abs(a.rho - 1.225) < 0.01 && Math.abs(a.T - 288.15) < 0.01);
  assert.ok(Math.abs(b.p - 22632) < 60 && Math.abs(c.p - 5475) < 30);
});
test('payload capacity is near published values', () => {
  const band = { electron_smallsat: [200, 350], falcon_9: [17000, 26000], falcon_heavy: [30000, 60000], sls_block1: [80000, 110000] };
  for (const v in band) { const c = cap(v); assert.ok(c >= band[v][0] && c <= band[v][1], v + ' capacity ' + Math.round(c) + ' kg outside ' + band[v]); }
});
test('Falcon 9 reaches orbit with a light payload; mass never increases', () => {
  const r = simulateAscent('falcon_9', 3000, 'al_li_2195', 200, 0); assert.ok(r.summary.success);
  for (let i = 1; i < r.frames.length; i++) assert.ok(r.frames[i].m <= r.frames[i - 1].m + 1e-6);
});
test('no-liftoff simulations still return a playable initial state', () => {
  const r = simulateAscent('electron_smallsat', 300000, 'al_li_2195', 200, 0);
  assert.strictEqual(r.summary.success, false);
  assert.strictEqual(r.summary.outcome, 'NO LIFTOFF - T/W too low');
  assert.strictEqual(r.frames.length, 1);
});
test('boosters separate on Falcon Heavy and SLS', () => { for (const v of ['falcon_heavy', 'sls_block1']) assert.ok(simulateAscent(v, 20000, 'al_li_2195', 200, 0).events.some(e => e.key === 'boostersep')); });
test('jet-stream wind and lighter structure behave sensibly', () => {
  assert.ok(simulateAscent('falcon_9', 3000, 'al_li_2195', 200, 55).summary.success);
  const a = simulateAscent('falcon_9', 8000, 'composite', 200, 0).summary.leftoverPropKg, b = simulateAscent('falcon_9', 8000, 'steel_304l', 200, 0).summary.leftoverPropKg; assert.ok(a > b);
});
test('auto-debug fixes a broken design and leaves a good one alone', () => {
  const bad = { ...base, destinationId: 'moon', launchVehicleId: 'electron_smallsat', propellantMassKg: 20 }; const r = solve(eng, M, bad); assert.ok(r.solved);
  assert.deepStrictEqual(solve(eng, M, r.design).changes, []);
});
test('travel budgets are close to published values', () => {
  const m = MM.transferBudget('Mars'); assert.ok(m.dep > 3.4 && m.dep < 3.9 && m.arr > 1.8 && m.arr < 2.4 && m.days > 240 && m.days < 270);
});
test('staged rocket sizing accounts for payload, staging, burn time and thrust-to-weight', () => {
  const stages = [
    { dryMassKg: 100, propellantMassKg: 900, ispSeconds: 300, thrustKN: 100 },
    { dryMassKg: 40, propellantMassKg: 160, ispSeconds: 340, thrustKN: 20 }
  ];
  const result = MM.stagedRocketBudget(stages, 1000);
  assert.strictEqual(result.wetMassKg, 2200);
  assert.strictEqual(result.stageResults.length, 2);
  assert.ok(result.stageResults[0].ignitionMassKg > result.stageResults[1].ignitionMassKg);
  assert.ok(result.stageResults.every(s => s.deltaVMS > 0 && s.burnTimeS > 0 && s.thrustToWeight > 0));
  assert.strictEqual(result.totalDeltaVMS, result.stageResults.reduce((sum, stage) => sum + stage.deltaVMS, 0));
});
test('staged rocket sizing rejects impossible or malformed inputs', () => {
  assert.throws(() => MM.stagedRocketBudget([], 1000), RangeError);
  assert.throws(() => MM.stagedRocketBudget([{ dryMassKg: 100, propellantMassKg: 0, ispSeconds: 300, thrustKN: 10 }], 1000), RangeError);
  assert.throws(() => MM.stagedRocketBudget([{ dryMassKg: 100, propellantMassKg: 100, ispSeconds: 300, thrustKN: 10 }], 0), RangeError);
});
test('monte carlo: more margin means higher success chance; alerts mean zero', () => {
  const mk = (dv, alerts) => ({ alerts: alerts ? [{}] : [], deltaV: { marginPct: dv }, power: { sunlightMarginPct: 30 }, mass: { launchMassMarginPct: 20 } });
  const lo = MM.monteCarlo(mk(2), { vehicleId: 'falcon_9' }).p, hi = MM.monteCarlo(mk(25), { vehicleId: 'falcon_9' }).p;
  assert.ok(hi > lo); assert.strictEqual(MM.monteCarlo(mk(25, true), {}).p, 0);
});

const AI = require('../js/ai-core.js');
test('offline knowledge answers common questions and falls back to destination data', () => {
  assert.match(AI.answer('what is earth observation', M), /sun-synchronous/i);
  assert.match(AI.answer('Explain delta-v please', M), /velocity/i);
  assert.strictEqual(AI.answer('who won the football match', null), null);
});
test('stream parser handles split chunks and ignores non-text events', () => {
  const st = { buf: '' }, ev = d => 'event: x\ndata: ' + JSON.stringify(d) + '\n\n';
  const full = ev({ type: 'message_start' }) + ev({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } }) + ev({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } });
  const out = [...AI.parseSSE(st, full.slice(0, 70)), ...AI.parseSSE(st, full.slice(70))]; assert.strictEqual(out.join(''), 'Hello');
});
