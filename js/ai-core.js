/** Shared AI pieces: system prompt, streaming parser, offline knowledge base. Used by the browser and server.js. */
(function () {
  const SYSTEM = `You are Mission Intelligence, a collaborative spacecraft and mission-design assistant for an educational engineering simulator.
Help the learner plan a mission, choose a spacecraft architecture, understand engineering trade-offs, review the live design, and fix its highest-priority constraint. Use the supplied CURRENT STATE and VALID CATALOG as the source of truth. The user is designing a simulated spacecraft and launch plan, not certifying a real vehicle.

Work in these modes:
- Design: turn the stated objective and destination into a concise mission concept, architecture, key trade-offs, and next design decision. If the objective is missing, state a reasonable assumption or ask one focused question.
- Review: lead with launch readiness, cite the actual score/margins/alerts, then give the most useful next action.
- Fix: prioritize critical alerts and propose the smallest reasonable catalog-valid changes. Explain the benefit and any trade-off.
- Teach: explain the idea in plain language, then connect it to the current mission and its numbers.

Be accurate, encouraging, and concise (usually under 200 words). Prefer headings such as Recommendation, Why it matters, Trade-off, and Next step. Keep the learner involved; never say a change was made until they choose Apply. If a question is unrelated, briefly steer back to missions and engineering. Simulator figures are approximate educational values, not official NASA data. Never invent NASA facts, part options, IDs, citations, or links; say when something is uncertain.

When recommending specific design changes, use ONLY IDs and fields in the supplied catalog. End the reply with exactly one fenced block named apply containing valid JSON with only the fields to change, for example
\`\`\`apply
{"powerId":"mmrtg_nuclear","propellantMassKg":800}
\`\`\`
Allowed fields: busId, powerId, batteryId, propulsionId, thermalId, shieldingId, telecomId, avionicsId, launchVehicleId, missionClassId, propellantMassKg (20-2200), selectedInstrumentIds (array). Leave the block out when no specific change is needed. The Apply button is the only way your recommendation should change the design.`;
  const MODEL = 'gemini-3.5-flash-lite';
  const G = [
    [['earth observation', 'remote sensing', 'eos '], 'Earth observation means using satellites to measure our own planet: land, oceans, ice and atmosphere. They usually fly sun-synchronous orbits (about 98 degrees inclination, 600-800 km up) so every pass over a place happens at the same local time and lighting. NASA examples: Landsat (land change), MODIS (vegetation and sea temperature) and OCO-2 (carbon dioxide). In this simulator it is the easiest destination for power (1 AU from the Sun), but you must handle radiation from the South Atlantic Anomaly.'],
    [['delta-v', 'delta v', 'deltav'], 'Delta-v is the total change in velocity a spacecraft can make with its engines. It is the real "budget" of a mission: leaving Earth orbit for Mars costs about 3.6 km/s, and capturing into Mars orbit about 2 km/s more. Rocket equation: delta-v = Isp x g0 x ln(wet mass / dry mass). More propellant or a higher-Isp engine raises it.'],
    [['specific impulse', 'isp'], 'Specific impulse (Isp, in seconds) measures how efficiently an engine uses propellant: thrust divided by propellant weight flow. Hydrazine thrusters are roughly 220 s, bipropellant engines about 320 s, hydrogen-oxygen engines about 450 s, and ion engines 3,000 s or more, but ion thrust is tiny.'],
    [['rocket equation', 'tsiolkovsky'], 'The Tsiolkovsky rocket equation: delta-v = Isp x g0 x ln(m_wet / m_dry). Because of the logarithm, doubling propellant gives much less than double the delta-v. That is why rockets use stages: dropping empty tanks improves the mass ratio.'],
    [['max-q', 'max q', 'dynamic pressure'], 'Max-Q is the moment of maximum dynamic pressure (0.5 x air density x speed squared) on the rocket, usually about a minute after liftoff. Air is still thick but the rocket is already fast, so structural stress peaks. Engines are often throttled down briefly to reduce the load.'],
    [['sun-synchronous', 'sso', 'leo', 'low earth orbit'], 'Low Earth orbit (LEO) is roughly 160-2,000 km up. At 200 km the orbital speed is about 7.8 km/s and one lap takes about 90 minutes. A sun-synchronous orbit (SSO) is a near-polar LEO whose plane rotates once a year, so a satellite crosses each latitude at the same local solar time.'],
    [['hohmann', 'transfer orbit', 'launch window'], 'A Hohmann transfer is the most fuel-efficient two-burn path between circular orbits. For planets it only works when they are in the right positions, which creates launch windows. Mars windows come about every 26 months. The Planner tab estimates upcoming windows.'],
    [['gravity assist', 'flyby', 'slingshot'], 'A gravity assist (slingshot) uses a planet\'s gravity and orbital motion to change a spacecraft\'s speed and direction without spending propellant. Relative to the planet no speed is gained, but relative to the Sun it can be. Many outer-planet missions, including Europa Clipper, use assists.'],
    [['mmrtg', 'rtg', 'nuclear power', 'plutonium', 'radioisotope'], 'A radioisotope thermoelectric generator (RTG) turns heat from decaying plutonium-238 into electricity. NASA\'s MMRTG gives about 110 W at launch and powers Curiosity and Perseverance. It works anywhere, which is why far-out missions use it when sunlight is too weak.'],
    [['inverse square', 'solar flux', 'solar power', 'solar panel', 'solar array'], 'Sunlight intensity falls with the square of distance from the Sun. At Earth it is about 1,361 W/m2; at Mars (1.52 AU) only about 43% of that; at Jupiter and Europa (5.2 AU) about 3.7%. That is why solar arrays suit Earth and Mars but outer-planet missions need much bigger arrays or nuclear power.'],
    [['radiation', 'van allen', 'saa', 'south atlantic', 'total ionizing', 'tid'], 'Space radiation damages electronics and people. Total ionizing dose (TID) builds up over time; single-event upsets are sudden bit flips. Hotspots include the Van Allen belts, the South Atlantic Anomaly and especially Jupiter\'s magnetosphere around Europa, which needs a heavy shielded vault (Europa Clipper uses one).'],
    [['thermal', 'temperature', 'heat pipe', 'louver', 'radiator'], 'Spacecraft thermal control balances heat from the Sun, internal electronics and radiating to cold space. Tools include insulation blankets, louvers, heat pipes, radiators and small heaters (or radioisotope heaters on cold missions). The Moon\'s polar craters can fall to about 27 K (-246 C) while sunlit areas exceed 100 C.'],
    [['dsn', 'deep space network', 'telecom', 'downlink', 'antenna'], 'NASA\'s Deep Space Network has big dishes at Goldstone (California), Madrid and Canberra so a spacecraft is always in view of one as Earth turns. Data rate falls with the square of distance, so far missions use big dishes, high frequencies or optical (laser) links.'],
    [['staging', 'stage separation', 'multi-stage', 'why stages'], 'Rockets drop empty tanks and engines (staging) so the remaining stage no longer has to accelerate dead weight. This improves the mass ratio and therefore delta-v. Falcon Heavy and SLS also use strap-on boosters that burn in parallel and separate early.'],
    [['thrust to weight', 'twr', 't/w'], 'Thrust-to-weight ratio (T/W) is engine thrust divided by vehicle weight. At liftoff it must exceed 1 or the rocket cannot leave the pad; launchers are typically about 1.2-1.6. High T/W reduces gravity losses but raises g-loads, so engines are often throttled to about 4 g.'],
    [['ion', 'electric propulsion', 'xenon', 'hall thruster'], 'Ion and Hall thrusters accelerate xenon with electric fields. Isp is 10 times higher than chemical engines, so they save propellant, but thrust is only millinewtons and they need lots of power, so spacecraft thrust gently for months.'],
    [['reaction wheel', 'momentum', 'attitude'], 'Reaction wheels point a spacecraft by spinning flywheels, using no propellant. Small disturbance torques slowly add momentum, so wheels saturate and must be unloaded with thrusters or magnetic torquers.'],
    [['fairing', 'payload fairing'], 'The fairing is the nose shell that protects the payload from air pressure and heating. It is dropped once the air is thin enough that heating falls below about 1,135 W/m2, usually after 3 minutes or so.'],
    [['europa'], 'Europa is Jupiter\'s moon with a global salty ocean under an ice shell about 15-25 km thick, a top target in the search for life. Missions face intense radiation, very weak sunlight and long travel times. NASA\'s Europa Clipper is studying it with flybys.'],
    [['shackleton', 'artemis', 'lunar south pole', 'water ice'], 'Permanently shadowed craters near the Moon\'s south pole, such as Shackleton, stay near 27 K and may hold water ice that could supply future astronauts with water and rocket fuel. NASA\'s Artemis program targets that region.'],
    [['jezero', 'perseverance', 'mars delta'], 'Jezero Crater on Mars once held a lake and has a river delta where clays and carbonates could preserve signs of ancient life. NASA\'s Perseverance rover is exploring it and caching samples.'],
    [['how do i use', 'how to use', 'how does this work', 'get started', 'tutorial'], 'Follow the six steps along the top: 1) choose a destination and mission class; 2) build the spacecraft in the Engineering Bay and keep the margin ledger green; 3) launch and watch the physics-based ascent; 4) run mission operations; 5) explore science data; 6) read the debrief. Use AUTO-DEBUG to fix problems, and the Toolbox for risk, travel, reports and the guided demo.']];
  const STOP = new Set('what is the and for how does why with this that are can you about from have into your'.split(' '));
  const toks = s => (String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(w => !STOP.has(w));
  function answer(q, data) {
    const ql = ' ' + q.toLowerCase() + ' '; let best = null;
    G.forEach(([keys, a]) => { let sc = 0; keys.forEach(k => { if (ql.includes(k)) sc += k.length; }); if (sc && (!best || sc > best.sc)) best = { sc, a }; });
    if (best) return best.a;
    if (data) { const qt = new Set(toks(q)); let top = null;
      ['destinations', 'instruments'].forEach(cat => Object.values(data[cat] || {}).forEach(o => { const strs = Object.values(o).filter(v => typeof v === 'string'); const ot = new Set(toks(strs.join(' '))); let sc = 0; qt.forEach(t => { if (ot.has(t)) sc++; }); if (sc >= 2 && (!top || sc > top.sc)) top = { sc, t: (o.name || '') + ': ' + strs.filter(s => s !== o.name).join(' ') }; }));
      if (top) return top.t; }
    return null;
  }
  function parseSSE(state, chunk) { // returns text deltas from an Anthropic event stream
    state.buf += chunk.replace(/\r\n/g, '\n'); const out = []; let i;
    while ((i = state.buf.indexOf('\n\n')) >= 0) { const block = state.buf.slice(0, i); state.buf = state.buf.slice(i + 2); const line = block.split('\n').find(l => l.startsWith('data: ')); if (!line) continue;
      try { const j = JSON.parse(line.slice(6)); if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') out.push(j.delta.text); } catch (e) { /* ignore partial */ } }
    return out;
  }
  const API = { SYSTEM, MODEL, answer, parseSSE };
  if (typeof window !== 'undefined') { window.AI_SYSTEM = SYSTEM; window.AI_MODEL = MODEL; window.AIKB = { answer }; window.AICore = API; }
  if (typeof module !== 'undefined') module.exports = API;
})();
