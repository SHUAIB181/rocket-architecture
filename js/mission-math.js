/** Pure mission maths: interplanetary delta-v budgets and a Monte Carlo risk model (testable in Node). */
(function () {
  const MU_SUN = 1.32712440018e11, MU_E = 398600.4418, AU = 1.495978707e8;
  const BODY = { Venus: { a: 0.723, mu: 324858.6, r: 6051.8, alt: 300 }, Mars: { a: 1.524, mu: 42828.4, r: 3389.5, alt: 400 }, Jupiter: { a: 5.203, mu: 126686534, r: 71492, ell: [5, 150] } };
  function transferBudget(body) {
    if (body === 'Moon') return { name: 'Moon', dep: 3.13, arr: 0.9, total: 4.03, days: 4, note: 'Trans-lunar injection from LEO plus lunar orbit insertion (typical published values).' };
    const b = BODY[body]; if (!b) return null;
    const r1 = AU, r2 = b.a * AU, aT = (r1 + r2) / 2;
    const vinfDep = Math.abs(Math.sqrt(MU_SUN / r1) * (Math.sqrt(2 * r2 / (r1 + r2)) - 1)), vinfArr = Math.abs(Math.sqrt(MU_SUN / r2) * (1 - Math.sqrt(2 * r1 / (r1 + r2))));
    const rL = 6378.137 + 200, dep = Math.sqrt(vinfDep * vinfDep + 2 * MU_E / rL) - Math.sqrt(MU_E / rL);
    const rp = b.ell ? b.ell[0] * b.r : b.r + b.alt, vh = Math.sqrt(vinfArr * vinfArr + 2 * b.mu / rp);
    const vo = b.ell ? Math.sqrt(b.mu * (2 / rp - 2 / ((b.ell[0] + b.ell[1]) * b.r))) : Math.sqrt(b.mu / rp), arr = vh - vo;
    return { name: body, vinfDep, vinfArr, dep, arr, total: dep + arr, days: Math.PI * Math.sqrt(Math.pow(aT, 3) / MU_SUN) / 86400, note: 'Direct Hohmann transfer, no gravity assists; capture into ' + (b.ell ? 'a 5 x 150 Jupiter-radii orbit' : 'a ' + b.alt + ' km circular orbit') + '.' };
  }
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const gauss = r => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const LAUNCH_REL = { electron_smallsat: 0.93, falcon_9: 0.99, falcon_heavy: 0.97, sls_block1: 0.95 }; // assumptions
  function monteCarlo(report, opts) {
    opts = opts || {}; const n = opts.trials || 2000, r = rng(opts.seed || 1), reasons = {}; let ok = 0;
    const dv = report.deltaV.marginPct, pw = report.power.sunlightMarginPct, lm = report.mass.launchMassMarginPct, rel = LAUNCH_REL[opts.vehicleId] || 0.95;
    for (let i = 0; i < n; i++) {
      let why = null;
      if (report.alerts.length) why = 'Critical design alert';
      else if (r() > rel) why = 'Launch failure';
      else if (dv + gauss(r) * 4 < 0) why = 'Delta-v shortfall';
      else if (pw + gauss(r) * 8 < 0) why = 'Power shortfall';
      else if (lm + gauss(r) * 3 < 0) why = 'Launch mass over capacity';
      else if (r() > Math.pow(0.995, 8)) why = 'Subsystem failure in flight';
      if (why) reasons[why] = (reasons[why] || 0) + 1; else ok++;
    }
    return { p: ok / n, trials: n, reasons };
  }
  const API = { transferBudget, monteCarlo, rng };
  if (typeof window !== 'undefined') window.MissionMath = API; if (typeof module !== 'undefined') module.exports = API;
})();
