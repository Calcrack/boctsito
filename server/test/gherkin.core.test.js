// Suite de pruebas gherkin.md → server/gameLogic.js
const ROOT = 'C:/Users/Cal/Documents/GitHub/boctsito';
const G = require(ROOT + '/server/gameLogic');
const { ROLES } = require(ROOT + '/server/roles');
const SETUP = require(ROOT + '/server/setup');

let pass = 0, fail = 0;
const fails = [];
let group = '';
function G_(name) { group = name; }
function t(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; fails.push(`[${group}] ${name}\n     → ${e.message}`); }
}
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''} esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
function ok(v, msg) { if (!v) throw new Error(msg || 'falsy'); }
function no(v, msg) { if (v) throw new Error(msg || 'truthy'); }

// ── helper: crea partida con roles concretos por asiento ──────────────
let seq = 0;
function mk(roleList, campaignId = 'TROUBLE_BREWING') {
  const g = G.createGame('narr', 'test-' + (seq++));
  g.campaignId = campaignId;
  roleList.forEach((r, i) => G.addPlayer(g, { name: 'P' + i }));
  const assignments = {};
  g.players.forEach((p, i) => { assignments[p.id] = roleList[i]; });
  g.setup.seatOrder = g.players.map(p => p.id);
  g.setup.assignments = assignments;
  g.setup.decisions = [];
  G.applySetup(g);
  return g;
}
const by = (g, roleId) => g.players.find(p => p.role === roleId);
// envenena de verdad (el motor recalcula p.poisoned desde las fichas)
function poison(g, p) {
  p.tokens = p.tokens || [];
  p.tokens.push({ instanceId: 'POISONED:test', type: 'POISONED', tokenId: 'POISONED', label: 'Envenenado', expiry: ['PERMANENT'], manual: true });
  p.poisoned = true;
}
const seat = (g, i) => g.players[i];

// Ejecuta una noche entera enviando acciones por la cola.
function night(g, actions = {}) {
  G.startNight(g);
  for (const pid of [...g.nightQueue]) {
    const p = g.players.find(x => x.id === pid);
    const a = actions[p.role];
    if (a) G.applyNightAction(g, a.action, pid, a.targets(g));
  }
  return g;
}
function day(g) { G.startDay(g); return g; }

// Nominación + votación completas (todos los vivos votan a favor).
function executeVote(g, nominatorId, nomineeId) {
  G.openNominations(g);
  const r = G.nominate(g, nominatorId, nomineeId);
  if (!r.nomination) return r;
  const nom = r.nomination;
  nom.stage = 'voting';
  for (const id of [...nom.voteOrder]) {
    const p = g.players.find(x => x.id === id);
    if (!p?.alive) continue;
    try { G.vote(g, id, nom.id, true); } catch (e) { /* mayordomo etc. */ }
  }
  G.resolveVote(g, nom.id);
  return G.executeNominationWinner(g);
}

// ════════════════════════════════════════════════════════════════════
G_('MOTOR: catálogo');
t('los 181 personajes del gherkin resuelven en ROLES', () => {
  eq(Object.keys(ROLES).length, 181);
});
t('ningún rol sin nombre/tipo/alineación', () => {
  const bad = Object.values(ROLES).filter(r => !r.name || !r.type || !r.alignment);
  eq(bad.length, 0, bad.map(b => b.id).join(','));
});

// ════════════════════════════════════════════════════════════════════
G_('MOTOR: cola nocturna');
t('roles de solo-primera-noche no vuelven en la noche 2', () => {
  const g = mk(['WASHERWOMAN', 'LIBRARIAN', 'INVESTIGATOR', 'COOK', 'POISONER', 'IMP', 'MONK']);
  G.startNight(g);  // n1
  const q1 = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  ok(q1.includes('WASHERWOMAN'), 'lavandera debe estar en n1');
  G.startDay(g); G.startNight(g); // n2
  const q2 = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  no(q2.includes('WASHERWOMAN'), 'lavandera no debe estar en n2');
  no(q2.includes('COOK'), 'cocinero no debe estar en n2');
});
t('el Diablillo NO actúa la primera noche', () => {
  const g = mk(['WASHERWOMAN', 'LIBRARIAN', 'INVESTIGATOR', 'COOK', 'POISONER', 'IMP', 'MONK']);
  G.startNight(g);
  const q = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  no(q.includes('IMP'), 'IMP no debe estar en la 1ª noche');
});
t('el Envenenador actúa antes que los roles de información (TB n1)', () => {
  const g = mk(['WASHERWOMAN', 'EMPATH', 'INVESTIGATOR', 'COOK', 'POISONER', 'IMP', 'MONK']);
  G.startNight(g);
  const q = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  ok(q.indexOf('POISONER') < q.indexOf('EMPATH'), 'orden ' + q.join('>'));
});
t('el Monje actúa antes que el Diablillo (TB otras noches)', () => {
  const g = mk(['MONK', 'EMPATH', 'INVESTIGATOR', 'MAYOR', 'POISONER', 'IMP', 'SOLDIER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const q = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  ok(q.indexOf('MONK') < q.indexOf('IMP'), 'orden ' + q.join('>'));
});
t('los muertos salen de la cola', () => {
  const g = mk(['MONK', 'EMPATH', 'INVESTIGATOR', 'MAYOR', 'POISONER', 'IMP', 'SOLDIER']);
  by(g, 'MONK').alive = false;
  G.startNight(g); G.startDay(g); G.startNight(g);
  const q = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  no(q.includes('MONK'));
});
t('Vigormortis: Esbirro muerto con habilidad conservada sigue en la cola', () => {
  const g = mk(['CLOCKMAKER', 'DREAMER', 'SEAMSTRESS', 'MUTANT', 'WITCH', 'VIGORMORTIS', 'SNAKE_CHARMER'], 'SECTS_AND_VIOLETS');
  const w = by(g, 'WITCH');
  w.alive = false; w.vigormortisAlive = true;
  G.startNight(g); G.startDay(g); G.startNight(g);
  const q = g.nightQueue;
  ok(q.includes(w.id), 'la Bruja conservada por Vigormortis debería seguir despertando');
});

// ════════════════════════════════════════════════════════════════════
G_('TB: información');
t('Lavandera: recibe un par y un personaje de Aldeano real', () => {
  const g = mk(['WASHERWOMAN', 'MONK', 'EMPATH', 'MAYOR', 'POISONER', 'IMP', 'SOLDIER']);
  G.startNight(g);
  const w = by(g, 'WASHERWOMAN');
  ok(w.nightInfo && w.nightInfo.includes('Lavandera'), 'sin info: ' + w.nightInfo);
});
t('Bibliotecario: avisa cuando no hay Forasteros', () => {
  const g = mk(['LIBRARIAN', 'MONK', 'EMPATH', 'MAYOR', 'POISONER', 'IMP', 'SOLDIER']);
  G.startNight(g);
  ok(by(g, 'LIBRARIAN').nightInfo.includes('No hay Forasteros'));
});
t('Investigador: avisa cuando no hay Esbirros vivos', () => {
  const g = mk(['INVESTIGATOR', 'MONK', 'EMPATH', 'MAYOR', 'SAINT', 'IMP', 'SOLDIER']);
  G.startNight(g);
  ok(by(g, 'INVESTIGATOR').nightInfo.includes('No hay Esbirros'));
});
t('Cocinero: cuenta parejas de vecinos malvados correctamente', () => {
  // asientos: 0 COOK,1 POISONER,2 IMP,3 MONK,4 MAYOR → 1 pareja (1-2)
  const g = mk(['COOK', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g);
  const info = by(g, 'COOK').nightInfo;
  ok(/Hay 1 pareja/.test(info), info);
});
t('Empático: cuenta vecinos malvados vivos', () => {
  // 0 EMPATH entre 4(MAYOR) y 1(POISONER) → 1
  const g = mk(['EMPATH', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g);
  ok(/Tienes 1 vecino/.test(by(g, 'EMPATH').nightInfo), by(g, 'EMPATH').nightInfo);
});
t('Empático: salta a los vecinos muertos', () => {
  const g = mk(['EMPATH', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  by(g, 'POISONER').alive = false;      // vecino malvado muerto → cuenta al siguiente vivo (IMP)
  G.startNight(g);
  ok(/Tienes 1 vecino/.test(by(g, 'EMPATH').nightInfo), by(g, 'EMPATH').nightInfo);
});
t('Empático envenenada: sigue dando un número (nunca "nada")', () => {
  const g = mk(['EMPATH', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g); poison(g, by(g, 'EMPATH')); G.generateSingleRoleInfo && G.generateSingleRoleInfo(g, by(g,'EMPATH').id);
  ok(/Tienes [0-2] vecino/.test(by(g, 'EMPATH').nightInfo), by(g, 'EMPATH').nightInfo);
});
t('Pitonisa: detecta al Demonio entre 2 elegidos', () => {
  const g = mk(['FORTUNE_TELLER', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g);
  const ft = by(g, 'FORTUNE_TELLER');
  G.applyNightAction(g, 'FORTUNE_TELLER', ft.id, [by(g, 'IMP').id, by(g, 'MONK').id]);
  ok(ft.nightInfo.includes('SÍ hay Demonio'), ft.nightInfo);
});
t('Pitonisa: señuelo (smokeScreen) aparece como Demonio', () => {
  const g = mk(['FORTUNE_TELLER', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g);
  g.smokeScreenPlayerId = by(g, 'MONK').id;
  const ft = by(g, 'FORTUNE_TELLER');
  G.applyNightAction(g, 'FORTUNE_TELLER', ft.id, [by(g, 'MONK').id, by(g, 'MAYOR').id]);
  ok(ft.nightInfo.includes('SÍ hay Demonio'), ft.nightInfo);
});
t('Enterrador: solo despierta si hubo ejecución', () => {
  const g = mk(['UNDERTAKER', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const q = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  no(q.includes('UNDERTAKER'), 'sin ejecución no debe despertar');
});
t('Enterrador: aprende el personaje del ejecutado', () => {
  const g = mk(['UNDERTAKER', 'POISONER', 'IMP', 'MONK', 'MAYOR', 'SOLDIER', 'EMPATH']);
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'POISONER').id);
  G.startNight(g);
  const u = by(g, 'UNDERTAKER');
  ok(u.nightInfo && u.nightInfo.includes('Envenenador'), u.nightInfo);
});
t('Espía: ve el grimorio completo', () => {
  const g = mk(['SPY', 'POISONER', 'IMP', 'MONK', 'MAYOR']);
  G.startNight(g);
  const s = by(g, 'SPY');
  ok(s.nightInfo.includes('GRIMORIO') && s.nightInfo.includes('Diablillo'), s.nightInfo);
});
t('Criacuervos: al morir de noche queda pendiente y aprende un personaje', () => {
  const g = mk(['RAVENKEEPER', 'POISONER', 'IMP', 'MONK', 'MAYOR', 'SOLDIER', 'EMPATH']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const rk = by(g, 'RAVENKEEPER'), imp = by(g, 'IMP');
  G.applyNightAction(g, 'IMP_KILL', imp.id, [rk.id]);
  ok(rk.pendingRavenkeeper, 'debería quedar pendiente');
  G.applyNightAction(g, 'RAVENKEEPER_INFO', rk.id, [imp.id]);
  ok(rk.nightInfo.includes('Diablillo'), rk.nightInfo);
});

// ════════════════════════════════════════════════════════════════════
G_('TB: protección y muerte');
t('Monje: protege del Demonio', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const monk = by(g, 'MONK'), imp = by(g, 'IMP'), tgt = by(g, 'EMPATH');
  G.applyNightAction(g, 'PROTECT', monk.id, [tgt.id]);
  G.applyNightAction(g, 'IMP_KILL', imp.id, [tgt.id]);
  ok(tgt.alive, 'el protegido no debe morir');
});
t('Monje envenenado: su protección NO funciona', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const monk = by(g, 'MONK'), imp = by(g, 'IMP'), tgt = by(g, 'EMPATH');
  const pois = by(g, 'POISONER');
  G.applyNightAction(g, 'POISON', pois.id, [monk.id]);
  G.applyNightAction(g, 'PROTECT', monk.id, [tgt.id]);
  G.applyNightAction(g, 'IMP_KILL', imp.id, [tgt.id]);
  no(tgt.alive, 'el objetivo debería morir: el Monje estaba envenenado');
});
t('Soldado: inmune al Demonio', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const s = by(g, 'SOLDIER');
  G.applyNightAction(g, 'IMP_KILL', by(g, 'IMP').id, [s.id]);
  ok(s.alive);
});
t('Soldado envenenado: SÍ muere', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const s = by(g, 'SOLDIER');
  G.applyNightAction(g, 'POISON', by(g, 'POISONER').id, [s.id]);
  G.applyNightAction(g, 'IMP_KILL', by(g, 'IMP').id, [s.id]);
  no(s.alive);
});
t('Alcalde: el ataque nocturno se redirige a otro', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const m = by(g, 'MAYOR');
  G.applyNightAction(g, 'IMP_KILL', by(g, 'IMP').id, [m.id]);
  ok(m.alive, 'el Alcalde no debe morir');
  eq(g.nightDeaths.length, 1, 'debería morir otro en su lugar');
});
t('Alcalde: gana con 3 vivos y sin ejecución', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER']);
  by(g, 'MONK').alive = false; by(g, 'SOLDIER').alive = false;
  ok(G.mayorWin(g));
  eq(g.winner, 'good');
});
t('Envenenador: el veneno dura la noche y el día siguiente', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g);
  G.applyNightAction(g, 'POISON', by(g, 'POISONER').id, [by(g, 'EMPATH').id]);
  ok(by(g, 'EMPATH').poisoned, 'envenenado de noche');
  G.startDay(g);
  ok(by(g, 'EMPATH').poisoned, 'sigue envenenado de día');
  G.startNight(g);
  no(by(g, 'EMPATH').poisoned, 'limpio al anochecer siguiente');
});
t('Envenenador: solo un envenenado a la vez (ON_REPLACE)', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g);
  const pz = by(g, 'POISONER').id;
  G.applyNightAction(g, 'POISON', pz, [by(g, 'EMPATH').id]);
  G.applyNightAction(g, 'POISON', pz, [by(g, 'MONK').id]);
  no(by(g, 'EMPATH').poisoned, 'el primero debe quedar limpio');
  ok(by(g, 'MONK').poisoned);
});
t('Demonio envenenado: no mata', () => {
  const g = mk(['MONK', 'POISONER', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'BUTLER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const imp = by(g, 'IMP');
  G.applyNightAction(g, 'POISON', by(g, 'POISONER').id, [imp.id]);
  G.applyNightAction(g, 'IMP_KILL', imp.id, [by(g, 'EMPATH').id]);
  ok(by(g, 'EMPATH').alive);
});

// ════════════════════════════════════════════════════════════════════
G_('TB: día, nominación, votación');
t('Virgen: el Aldeano que la nomina muere', () => {
  const g = mk(['VIRGIN', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const r = G.nominate(g, by(g, 'MONK').id, by(g, 'VIRGIN').id);
  ok(r.virginTrigger, 'debe dispararse');
  no(by(g, 'MONK').alive);
});
t('Virgen: se gasta con la PRIMERA nominación aunque no sea Aldeano', () => {
  const g = mk(['VIRGIN', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.openNominations(g);
  G.nominate(g, by(g, 'POISONER').id, by(g, 'VIRGIN').id);
  ok(by(g, 'VIRGIN').virginUsed, 'el poder debe gastarse');
  ok(by(g, 'POISONER').alive, 'un Esbirro no muere');
});
t('Virgen envenenada: no mata pero se gasta', () => {
  const g = mk(['VIRGIN', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); poison(g, by(g, 'VIRGIN')); G.startDay(g); G.openNominations(g);
  G.nominate(g, by(g, 'MONK').id, by(g, 'VIRGIN').id);
  ok(by(g, 'MONK').alive);
  ok(by(g, 'VIRGIN').virginUsed);
});
t('Exterminador/Slayer: mata al Demonio', () => {
  const g = mk(['SLAYER', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g);
  const r = G.slayerAction(g, by(g, 'SLAYER').id, by(g, 'IMP').id);
  no(by(g, 'IMP').alive, 'el Diablillo debe morir');
});
t('Exterminador/Slayer: no funciona sobre un bueno y se gasta', () => {
  const g = mk(['SLAYER', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g);
  G.slayerAction(g, by(g, 'SLAYER').id, by(g, 'MONK').id);
  ok(by(g, 'MONK').alive);
  ok(by(g, 'SLAYER').slayerUsed);
});
t('Exterminador/Slayer envenenado: no mata al Demonio', () => {
  const g = mk(['SLAYER', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); poison(g, by(g, 'SLAYER')); G.startDay(g);
  G.slayerAction(g, by(g, 'SLAYER').id, by(g, 'IMP').id);
  ok(by(g, 'IMP').alive);
});
t('Santo ejecutado: pierde el Bien', () => {
  const g = mk(['SAINT', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, by(g, 'SAINT').id);
  eq(g.winner, 'evil');
});
t('Santo envenenado ejecutado: NO pierde el Bien', () => {
  const g = mk(['SAINT', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); poison(g, by(g, 'SAINT')); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'SAINT').id);
  no(g.winner === 'evil', 'no debería ganar el Mal');
});
t('Mayordomo: no puede votar a favor si su Amo no votó', () => {
  const g = mk(['BUTLER', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const b = by(g, 'BUTLER'), master = by(g, 'MAYOR');
  G.applyNightAction(g, 'BUTLER_MASTER', b.id, [master.id]);
  G.startDay(g); G.openNominations(g);
  const { nomination } = G.nominate(g, by(g, 'MONK').id, by(g, 'SOLDIER').id);
  nomination.stage = 'voting';
  nomination.voteOrder = [b.id];  // fuerza el turno del mayordomo
  nomination.voteTurnIndex = 0;
  let threw = false;
  try { G.vote(g, b.id, nomination.id, true); } catch (e) { threw = true; }
  ok(threw, 'debería rechazar el voto');
});
t('voto fantasma: los muertos solo votan una vez en toda la partida', () => {
  const g = mk(['BUTLER', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  const dead = by(g, 'SOLDIER'); dead.alive = false;
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const { nomination } = G.nominate(g, by(g, 'MONK').id, by(g, 'MAYOR').id);
  nomination.stage = 'voting'; nomination.voteOrder = [dead.id]; nomination.voteTurnIndex = 0;
  G.vote(g, dead.id, nomination.id, true);
  G.resolveVote(g, nomination.id);
  const { nomination: n2 } = G.nominate(g, by(g, 'EMPATH').id, by(g, 'MAYOR').id);
  n2.stage = 'voting'; n2.voteOrder = [dead.id]; n2.voteTurnIndex = 0;
  let threw = false;
  try { G.vote(g, dead.id, n2.id, true); } catch (e) { threw = true; }
  ok(threw, 'el segundo voto fantasma debe fallar');
});
t('empate: nadie es ejecutado', () => {
  const g = mk(['BUTLER', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const a = G.nominate(g, by(g, 'MONK').id, by(g, 'MAYOR').id).nomination;
  a.resolved = true; a.meetsThreshold = true; a.tally = 4; a.executed = false;
  g.activeNomination = null; g.phase = 'nominations';
  const b = G.nominate(g, by(g, 'EMPATH').id, by(g, 'SOLDIER').id).nomination;
  b.resolved = true; b.meetsThreshold = true; b.tally = 4; b.executed = false;
  g.activeNomination = null; g.phase = 'nominations';
  const r = G.executeNominationWinner(g);
  ok(r.tie, 'debería ser empate');
  eq(r.executed, null);
});

// ════════════════════════════════════════════════════════════════════
G_('Sucesión del Demonio');
t('Mujer Escarlata: hereda el MISMO personaje con 5+ vivos', () => {
  const g = mk(['SCARLET_WOMAN', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'IMP').id);
  const sw = g.players.find(p => p.name === by(g, 'IMP')?.name);
  const newDemon = g.players.filter(p => p.type === 'demon' && p.alive);
  eq(newDemon.length, 1, 'debe haber un Demonio vivo');
  eq(newDemon[0].role, 'IMP');
  no(g.phase === 'game_over', 'la partida no debe terminar');
});
t('Mujer Escarlata: con menos de 5 vivos NO hereda', () => {
  const g = mk(['SCARLET_WOMAN', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  by(g, 'EMPATH').alive = false; by(g, 'POISONER').alive = false; by(g, 'SOLDIER').alive = false;
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'IMP').id);
  eq(g.winner, 'good');
});
t('Diablillo autoataque: un Esbirro se convierte en Diablillo', () => {
  const g = mk(['SCARLET_WOMAN', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const imp = by(g, 'IMP');
  G.applyNightAction(g, 'IMP_KILL', imp.id, [imp.id]);
  no(imp.alive);
  const demons = g.players.filter(p => p.type === 'demon' && p.alive);
  eq(demons.length, 1, 'debe haber un nuevo Diablillo');
});
t('Mente Maestra: el Demonio ejecutado NO termina la partida', () => {
  const g = mk(['MASTERMIND', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, by(g, 'IMP').id);
  no(g.phase === 'game_over', 'no debe terminar: ' + g.winReason);
  ok(g.mastermindPending, 'debe quedar el día extra pendiente');
});
t('Mente Maestra: día extra sin ejecución → ganan los buenos', () => {
  const g = mk(['MASTERMIND', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'IMP').id);
  G.startNight(g); G.startDay(g); // día extra
  eq(g.mastermindDay, g.dayNumber);
  G.startNight(g);
  eq(g.winner, 'good');
});
t('Mente Maestra: día extra ejecutando a un bueno → ganan los malos', () => {
  const g = mk(['MASTERMIND', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'IMP').id);
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'EMPATH').id, by(g, 'MAYOR').id);
  eq(g.winner, 'evil');
});
t('Zombuul: su primera muerte es fingida', () => {
  const g = mk(['MASTERMIND', 'MONK', 'ZOMBUUL', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'ZOMBUUL').id);
  const z = by(g, 'ZOMBUUL');
  ok(z.zombuulFirstDied, 'debe marcarse la muerte fingida');
  no(g.phase === 'game_over', 'la partida no debe terminar');
});
t('Lil’ Monsta: un Esbirro pasa a cuidarla y cuenta como Demonio', () => {
  const g = mk(['POISONER', 'MONK', 'LIL_MONSTA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'LIL_MONSTA').id);
  no(g.phase === 'game_over', 'no debe terminar');
  ok((by(g, 'POISONER').tokens || []).some(t => t.type === 'LIL_MONSTA_KEEPER'));
});

// ════════════════════════════════════════════════════════════════════
G_('BMR');
t('Marinero: no puede morir', () => {
  const g = mk(['SAILOR', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'GAMBLER'], 'BAD_MOON_RISING');
  G.startNight(g);
  const s = by(g, 'SAILOR');
  G.applyNightAction(g, 'SAILOR_DRUNK', s.id, [by(g, 'MONK').id]);
  G.applyNightAction(g, 'KILL', by(g, 'PUKKA').id, [s.id]);
  ok(s.alive, 'el Marinero no debe poder morir');
});
t('Posadero: los dos elegidos quedan a salvo y uno borracho', () => {
  const g = mk(['INNKEEPER', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'GAMBLER'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const ik = by(g, 'INNKEEPER'), a = by(g, 'MAYOR'), b = by(g, 'SOLDIER');
  G.applyNightAction(g, 'INNKEEPER_PROTECT', ik.id, [a.id, b.id, b.id]);
  G.applyNightAction(g, 'KILL', by(g, 'PUKKA').id, [a.id]);
  ok(a.alive, 'a salvo');
  ok((b.tokens || []).some(t => t.type === 'DRUNK_NIGHT'), 'b debe estar borracho');
});
t('Exorcista: el Demonio elegido no mata esa noche', () => {
  const g = mk(['EXORCIST', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'GAMBLER'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const ex = by(g, 'EXORCIST'), demon = by(g, 'PUKKA');
  G.applyNightAction(g, 'EXORCIST_CHOOSE', ex.id, [demon.id]);
  ok(demon.safeTonight || (demon.tokens || []).some(t => t.type === 'EXORCISED'), 'debe quedar exorcizado');
});
t('Abogado del Diablo: el elegido sobrevive a la ejecución', () => {
  const g = mk(['DEVILS_ADVOCATE', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'GAMBLER'], 'BAD_MOON_RISING');
  G.startNight(g);
  const da = by(g, 'DEVILS_ADVOCATE'), tgt = by(g, 'MAYOR');
  G.applyNightAction(g, 'DEVILS_ADVOCATE_PROTECT', da.id, [tgt.id]);
  G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, tgt.id);
  ok(tgt.alive, 'debe sobrevivir');
  ok(r.savedByDA);
});
t('Asesino: su ataque ignora protecciones', () => {
  const g = mk(['DEVILS_ADVOCATE', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const tgt = by(g, 'MAYOR');
  tgt.protected = true; tgt.safeTonight = true;
  G.applyNightAction(g, 'ASSASSIN_KILL', by(g, 'ASSASSIN').id, [tgt.id]);
  no(tgt.alive, 'debe morir pese a la protección');
});
t('Pukka: mata al envenenado de la noche anterior', () => {
  const g = mk(['DEVILS_ADVOCATE', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g);
  const pk = by(g, 'PUKKA'), v1 = by(g, 'MAYOR'), v2 = by(g, 'SOLDIER');
  G.applyNightAction(g, 'PUKKA_POISON', pk.id, [v1.id]);
  ok(v1.poisoned && v1.alive);
  G.startDay(g); G.startNight(g);
  G.applyNightAction(g, 'PUKKA_POISON', pk.id, [v2.id]);
  no(v1.alive, 'el envenenado anterior debe morir');
  ok(v2.poisoned);
});
t('Profesor: revive a un Aldeano muerto una vez', () => {
  const g = mk(['PROFESSOR', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const dead = by(g, 'SOLDIER'); dead.alive = false;
  G.applyNightAction(g, 'PROFESSOR_REVIVE', by(g, 'PROFESSOR').id, [dead.id]);
  ok(dead.alive, 'debe revivir');
});
t('Profesor: NO revive a un Forastero/Esbirro', () => {
  const g = mk(['PROFESSOR', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const dead = by(g, 'ASSASSIN'); dead.alive = false;
  G.applyNightAction(g, 'PROFESSOR_REVIVE', by(g, 'PROFESSOR').id, [dead.id]);
  no(dead.alive, 'un Esbirro no debe revivir');
});
t('Abuela: muere si el Demonio mata a su nieto', () => {
  const g = mk(['GRANDMOTHER', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g);
  const gm = by(g, 'GRANDMOTHER'), child = by(g, 'MAYOR');
  G.applyNightAction(g, 'GRANDMOTHER_INFO', gm.id, [child.id]);
  G.startDay(g); G.startNight(g);
  G.applyNightAction(g, 'KILL', by(g, 'PUKKA').id, [child.id]);
  no(gm.alive, 'la Abuela debe morir con su nieto');
});
t('Bufón: la primera muerte no le mata', () => {
  const g = mk(['FOOL', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const f = by(g, 'FOOL');
  G.applyNightAction(g, 'KILL', by(g, 'PUKKA').id, [f.id]);
  ok(f.alive, 'el Bufón debe sobrevivir la 1ª vez');
  ok(f.foolUsed, 'el uso debe gastarse');
});
t('Juglar: Esbirro ejecutado emborracha a todos los demás', () => {
  const g = mk(['MINSTREL', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'ASSASSIN').id);
  ok(g.minstrelPending, 'debe quedar pendiente');
  G.startNight(g);
  const drunks = g.players.filter(p => p.alive && (p.tokens || []).some(t => t.sourceRole === 'MINSTREL'));
  ok(drunks.length >= 3, 'deberían emborracharse todos menos el Juglar, obtenidos ' + drunks.length);
  no(drunks.some(p => p.role === 'MINSTREL'), 'el Juglar no se emborracha');
});

// ════════════════════════════════════════════════════════════════════
G_('S&V');
t('Bruja: el maldito muere al nominar', () => {
  const g = mk(['WITCH', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const w = by(g, 'WITCH'), v = by(g, 'MONK');
  G.applyNightAction(g, 'WITCH_CURSE', w.id, [v.id]);
  G.startDay(g); G.openNominations(g);
  G.nominate(g, v.id, by(g, 'MAYOR').id);
  no(v.alive, 'el maldito debe morir al nominar');
});
t('Bruja: con 3 o menos vivos pierde su habilidad', () => {
  const g = mk(['WITCH', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const w = by(g, 'WITCH'), v = by(g, 'MONK');
  G.applyNightAction(g, 'WITCH_CURSE', w.id, [v.id]);
  ['MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'].forEach(r => { by(g, r).alive = false; });
  G.startDay(g); G.openNominations(g);
  G.nominate(g, v.id, w.id);
  ok(v.alive, 'con 3 vivos la Bruja no mata');
});
t('Vortox: día sin ejecución → ganan los malvados', () => {
  const g = mk(['WITCH', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.startNight(g);
  eq(g.winner, 'evil', 'motivo: ' + g.winReason);
});
t('Fang Gu: el Forastero elegido se convierte en Fang Gu y el original muere', () => {
  const g = mk(['MUTANT', 'MONK', 'FANG_GU', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const fg = by(g, 'FANG_GU'), out = by(g, 'MUTANT');
  G.applyNightAction(g, 'FANG_GU_KILL', fg.id, [out.id]);
  eq(out.role, 'FANG_GU');
  eq(out.alignment, 'evil');
  no(fg.alive, 'el Fang Gu original debe morir');
});
t('Vigormortis: el Esbirro que mata conserva su habilidad', () => {
  const g = mk(['WITCH', 'MONK', 'VIGORMORTIS', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const w = by(g, 'WITCH');
  G.applyNightAction(g, 'VIGORMORTIS_KILL', by(g, 'VIGORMORTIS').id, [w.id]);
  no(w.alive);
  ok(w.vigormortisAlive, 'debe conservar la habilidad');
});
t('Gemela Malvada: el gemelo bueno ejecutado → gana el Mal', () => {
  const g = mk(['EVIL_TWIN', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  g.evilTwinPair = { evilId: by(g, 'EVIL_TWIN').id, goodId: by(g, 'MAYOR').id };
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'MAYOR').id);
  eq(g.winner, 'evil');
});
t('Barbero: al morir se abre el intercambio del Demonio esa noche', () => {
  const g = mk(['BARBER', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'BARBER').id);
  const b = by(g, 'BARBER');
  ok((b.tokens || []).some(t => t.type === 'BARBER_TONIGHT'), 'debe abrirse el paso del Barbero');
});
t('Barbero: el intercambio cambia los personajes de 2 jugadores', () => {
  const g = mk(['BARBER', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'BARBER').id);
  const a = by(g, 'MAYOR'), b = by(g, 'SOLDIER');
  const ra = a.role, rb = b.role;
  G.barberSwap(g, a.id, b.id);
  eq(a.role, rb); eq(b.role, ra);
});

// ════════════════════════════════════════════════════════════════════
G_('Carousel');
t('Acróbata: muere si su elegido está borracho/envenenado', () => {
  const g = mk(['ACROBAT', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER'], 'CAROUSEL');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const ac = by(g, 'ACROBAT'), tgt = by(g, 'MAYOR');
  G.applyNightAction(g, 'POISON', by(g, 'POISONER').id, [tgt.id]);
  G.applyNightAction(g, 'ACROBAT_CHECK', ac.id, [tgt.id]);
  no(ac.alive, 'el Acróbata debe morir');
});
t('Gólem: si nomina a un no-Demonio, el nominado muere', () => {
  const g = mk(['GOLEM', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER'], 'CAROUSEL');
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const r = G.nominate(g, by(g, 'GOLEM').id, by(g, 'MAYOR').id);
  ok(r.golemTrigger);
  no(by(g, 'MAYOR').alive);
});
t('Gólem: solo puede nominar una vez', () => {
  const g = mk(['GOLEM', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER'], 'CAROUSEL');
  G.startNight(g); G.startDay(g); G.openNominations(g);
  G.nominate(g, by(g, 'GOLEM').id, by(g, 'MAYOR').id);
  let threw = false;
  try { G.nominate(g, by(g, 'GOLEM').id, by(g, 'SOLDIER').id); } catch (e) { threw = true; }
  ok(threw);
});
t('Visir: no muere ejecutado durante el día', () => {
  const g = mk(['VIZIER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, by(g, 'VIZIER').id);
  ok(by(g, 'VIZIER').alive, 'el Visir no debe morir de día');
  ok(r.vizierSurvived);
});
t('Fearmonger: nominar y ejecutar a su marcado decide la partida', () => {
  const g = mk(['FEARMONGER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g);
  const fm = by(g, 'FEARMONGER'), tgt = by(g, 'MAYOR');
  G.applyNightAction(g, 'FEARMONGER', fm.id, [tgt.id]);
  G.startDay(g);
  executeVote(g, fm.id, tgt.id);
  eq(g.winner, 'evil');
});
t('Ateo: ejecutar al Narrador hace ganar al Bien', () => {
  const g = mk(['ATHEIST', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, 'NARRATOR');
  eq(g.winner, 'good');
});
t('Ateo: sin Ateo, ejecutar al Narrador no mata a nadie', () => {
  const g = mk(['CANNIBAL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, 'NARRATOR');
  ok(r.narratorExecuted);
  no(g.phase === 'game_over');
});
t('Ateo: las condiciones de victoria normales quedan desactivadas', () => {
  const g = mk(['ATHEIST', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER']);
  by(g, 'KAZALI').alive = false;
  eq(G.checkWinCondition(g), false, 'no debe declarar victoria con Ateo en juego');
});
t('Psicópata: la ejecución abre piedra-papel-tijera en vez de matarle', () => {
  const g = mk(['PSYCHOPATH', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, by(g, 'PSYCHOPATH').id);
  ok(r.roshambo, 'debe abrirse el roshambo');
  ok(by(g, 'PSYCHOPATH').alive);
  ok(g.pendingRoshambo);
});
t('Psicópata: pierde el roshambo → muere', () => {
  const g = mk(['PSYCHOPATH', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  const monk = by(g, 'MONK'), ps = by(g, 'PSYCHOPATH');
  executeVote(g, monk.id, ps.id);
  G.roshamboThrow(g, ps.id, 'piedra');
  G.roshamboThrow(g, monk.id, 'papel');
  no(ps.alive, 'debe morir al perder');
});
t('Psicópata: mata de día antes de nominaciones', () => {
  const g = mk(['PSYCHOPATH', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  G.psychopathDayKill(g, by(g, 'PSYCHOPATH').id, by(g, 'MAYOR').id);
  no(by(g, 'MAYOR').alive);
});
t('Rata de Laboratorio: el Demonio inicial recibe la habilidad buena', () => {
  const g = G.createGame('n', 'boffin-1');
  g.campaignId = 'CAROUSEL';
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(n => G.addPlayer(g, { name: n }));
  const roles = ['BOFFIN', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'];
  const assignments = {};
  g.players.forEach((p, i) => { assignments[p.id] = roles[i]; });
  g.setup.seatOrder = g.players.map(p => p.id);
  g.setup.assignments = assignments;
  g.setup.decisions = [{ id: 'boffinAbility:x', kind: 'boffinAbility', seat: g.players[0].id, chosen: 'SLAYER' }];
  G.applySetup(g);
  eq(by(g, 'KAZALI').borrowedAbility, 'SLAYER');
});
t('Alquimista: recibe la habilidad de Esbirro elegida en el montaje', () => {
  const g = G.createGame('n', 'alch-1');
  g.campaignId = 'CAROUSEL';
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(n => G.addPlayer(g, { name: n }));
  const roles = ['ALCHEMIST', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'];
  const assignments = {};
  g.players.forEach((p, i) => { assignments[p.id] = roles[i]; });
  g.setup.seatOrder = g.players.map(p => p.id);
  g.setup.assignments = assignments;
  g.setup.decisions = [{ id: 'alchemistAbility:x', kind: 'alchemistAbility', seat: g.players[0].id, chosen: 'POISONER' }];
  G.applySetup(g);
  eq(by(g, 'ALCHEMIST').borrowedAbility, 'POISONER');
});

// ════════════════════════════════════════════════════════════════════
G_('Montaje (setup)');
t('Barón: +2 Forasteros en la distribución', () => {
  const base = require(ROOT + '/server/roles').getDistribution(10, ['IMP'], 'TROUBLE_BREWING');
  const withBaron = require(ROOT + '/server/roles').getDistribution(10, ['IMP', 'BARON'], 'TROUBLE_BREWING');
  eq(withBaron.outsiders, base.outsiders + 2);
});
t('Señor de Typhon: +1 Esbirro', () => {
  const base = require(ROOT + '/server/roles').getDistribution(10, ['IMP'], 'TROUBLE_BREWING');
  const w = require(ROOT + '/server/roles').getDistribution(10, ['LORD_OF_TYPHON'], 'TROUBLE_BREWING');
  eq(w.minions, base.minions + 1);
});
t('Borracho: cree ser un Aldeano y su habilidad no funciona', () => {
  const g = G.createGame('n', 'drunk-1');
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(n => G.addPlayer(g, { name: n }));
  const roles = ['DRUNK', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER'];
  const assignments = {};
  g.players.forEach((p, i) => { assignments[p.id] = roles[i]; });
  g.setup.seatOrder = g.players.map(p => p.id);
  g.setup.assignments = assignments;
  g.setup.decisions = [{ id: 'identidadFalsa:x', kind: 'identidadFalsa', seat: g.players[0].id, role: 'drunk', chosenGoodRole: 'FORTUNE_TELLER' }];
  G.applySetup(g);
  eq(by(g, 'DRUNK').drunkAs, 'FORTUNE_TELLER');
  eq(by(g, 'DRUNK').believedRole, 'FORTUNE_TELLER');
});
t('Marioneta: no despierta con el Mal y los Esbirros no la conocen', () => {
  const g = mk(['MARIONETTE', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'WIDOW', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g);
  const widow = by(g, 'WIDOW');
  no((widow.nightInfo || '').includes(by(g, 'MARIONETTE').name), 'la Marioneta no debe salir en la info del Esbirro');
  ok((by(g, 'KAZALI').nightInfo || '').includes('Marioneta'), 'el Demonio sí debe saberlo');
});
t('el montaje exige resolver toda decisión oculta', () => {
  const g = mk(['DRUNK', 'MONK', 'IMP', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  const decs = SETUP.computeRequiredDecisions(g);
  ok(decs.some(d => d.kind === 'identidadFalsa'), 'debe pedir la identidad falsa del Borracho');
  no(SETUP.isSetupComplete(decs), 'sin elegir, el montaje no puede cerrarse');
});
t('Espía/Recluso: el registro inicial se pide en el montaje', () => {
  const g = mk(['SPY', 'MONK', 'IMP', 'MAYOR', 'RECLUSE', 'EMPATH', 'POISONER']);
  const decs = SETUP.computeRequiredDecisions(g);
  eq(decs.filter(d => d.kind === 'registroInicial').length, 2);
});

// ════════════════════════════════════════════════════════════════════
G_('Hechicero (deseos)');
t('catálogo de deseos disponible', () => {
  const W = require(ROOT + '/server/wishes');
  const list = W.WISHES || W.WISH_CATALOG || W.default;
  ok(list && Object.keys(list).length > 0, 'debería existir un catálogo');
});
t('deseo REVEAL_DEMON revela al Demonio', () => {
  const g = mk(['WIZARD', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.startNight(g);
  G.applyWish(g, 'REVEAL_DEMON', {});
  ok((by(g, 'WIZARD').nightInfo || '').includes(by(g, 'KAZALI').name), by(g, 'WIZARD').nightInfo);
});
t('deseo GRANT_GRIMOIRE da acceso al grimorio', () => {
  const g = mk(['WIZARD', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT'], 'CAROUSEL');
  G.applyWish(g, 'GRANT_GRIMOIRE', {});
  ok(by(g, 'WIZARD').seesGrimoire);
});

// ════════════════════════════════════════════════════════════════════
G_('Reglas globales de victoria');
t('sin Demonios vivos → ganan los buenos', () => {
  const g = mk(['MONK', 'EMPATH', 'IMP', 'MAYOR', 'SOLDIER']);
  by(g, 'IMP').alive = false;
  G.checkWinCondition(g);
  eq(g.winner, 'good');
});
t('2 vivos → ganan los malvados', () => {
  const g = mk(['MONK', 'EMPATH', 'IMP', 'MAYOR', 'SOLDIER']);
  ['MONK', 'EMPATH', 'MAYOR'].forEach(r => { by(g, r).alive = false; });
  G.checkWinCondition(g);
  eq(g.winner, 'evil');
});
t('Leviatán: pasado el día 5 ganan los malvados', () => {
  const g = mk(['MONK', 'EMPATH', 'LEVIATHAN', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL'], 'CAROUSEL');
  for (let i = 0; i < 6; i++) { G.startNight(g); G.startDay(g); }
  eq(g.winner, 'evil', 'motivo: ' + g.winReason);
});
t('Leviatán: 2 buenos ejecutados → ganan los malvados', () => {
  const g = mk(['MONK', 'EMPATH', 'LEVIATHAN', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL'], 'CAROUSEL');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'MAYOR').id);
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'SOLDIER').id);
  eq(g.winner, 'evil', 'motivo: ' + g.winReason);
});
t('Riot: en el día 3 los nominados mueren inmediatamente', () => {
  const g = mk(['MONK', 'EMPATH', 'RIOT', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER'], 'CAROUSEL');
  for (let i = 0; i < 3; i++) { G.startNight(g); G.startDay(g); }
  G.openNominations(g);
  G.nominate(g, by(g, 'MONK').id, by(g, 'MAYOR').id);
  no(by(g, 'MAYOR').alive, 'en día 3 con Riot el nominado muere al instante');
});
t('Hereje: quien gana pierde', () => {
  const g = mk(['HERETIC', 'EMPATH', 'KAZALI', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER'], 'CAROUSEL');
  by(g, 'KAZALI').alive = false;
  G.checkWinCondition(g);
  eq(g.winner, 'evil', 'con Hereje vivo del lado bueno, la victoria buena se invierte');
});
t('Legión: la ejecución falla si solo votaron malvados', () => {
  const g = mk(['MONK', 'EMPATH', 'LEGION', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER'], 'CAROUSEL');
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const { nomination } = G.nominate(g, by(g, 'POISONER').id, by(g, 'MAYOR').id);
  nomination.stage = 'voting';
  nomination.voteOrder = [by(g, 'POISONER').id, by(g, 'LEGION').id];
  nomination.voteTurnIndex = 0;
  G.vote(g, by(g, 'POISONER').id, nomination.id, true);
  G.vote(g, by(g, 'LEGION').id, nomination.id, true);
  G.resolveVote(g, nomination.id);
  nomination.meetsThreshold = true;
  G.executeNominationWinner(g);
  ok(by(g, 'MAYOR').alive, 'la ejecución debería fallar (solo malvados votaron)');
});

// ════════════════════════════════════════════════════════════════════
G_('Ruleta congelada / estado público');
t('de noche los jugadores ven la instantánea del día', () => {
  const g = mk(['MONK', 'EMPATH', 'IMP', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const victim = by(g, 'ACROBAT');
  G.applyNightAction(g, 'IMP_KILL', by(g, 'IMP').id, [victim.id]);
  const view = G.getPublicState(g, by(g, 'EMPATH').id, false, {});
  const seen = view.players.find(p => p.id === victim.id);
  ok(seen.alive, 'de noche el jugador debe seguir viéndose vivo (ruleta congelada)');
});
t('el narrador SÍ ve la muerte inmediatamente', () => {
  const g = mk(['MONK', 'EMPATH', 'IMP', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const victim = by(g, 'ACROBAT');
  G.applyNightAction(g, 'IMP_KILL', by(g, 'IMP').id, [victim.id]);
  const view = G.getPublicState(g, 'narr', true, {});
  no(view.players.find(p => p.id === victim.id).alive);
});
t('un jugador nunca ve el rol de otro', () => {
  const g = mk(['MONK', 'EMPATH', 'IMP', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g);
  const view = G.getPublicState(g, by(g, 'EMPATH').id, false, {});
  const other = view.players.find(p => p.id === by(g, 'IMP').id);
  no(other.role, 'no debe filtrarse el rol ajeno: ' + other.role);
});

// ── Reemplazar jugador ───────────────────────────────────────────────
G_('Reemplazar jugador');
t('el asiento conserva personaje, fichas y estado', () => {
  const g = mk(['POISONER', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g);
  const p = by(g, 'EMPATH');
  G.applyNightAction(g, 'POISON', by(g, 'POISONER').id, [p.id]);
  p.alive = false;
  const fichas = p.tokens.length;
  G.replacePlayer(g, p.id, { name: 'Sustituta' });
  eq(p.name, 'Sustituta');
  eq(p.role, 'EMPATH', 'debe conservar el personaje');
  eq(p.tokens.length, fichas, 'debe conservar las fichas');
  eq(p.alive, false, 'debe conservar vivo/muerto');
});
t('actualiza el nombre en las nominaciones ya registradas', () => {
  const g = mk(['POISONER', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const a = by(g, 'MONK'), b = by(g, 'MAYOR');
  G.nominate(g, a.id, b.id);
  G.replacePlayer(g, b.id, { name: 'Nuevo' });
  const nom = g.nominations[0];
  eq(nom.nomineeName, 'Nuevo');
});
t('no toca a los demás jugadores ni relanza el montaje', () => {
  const g = mk(['POISONER', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g);
  const antes = g.players.length;
  G.replacePlayer(g, by(g, 'MONK').id, { name: 'Otro' });
  eq(g.players.length, antes);
  eq(by(g, 'IMP').role, 'IMP');
});
t('reemplazar a alguien inexistente da error', () => {
  const g = mk(['POISONER', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  let err = null;
  try { G.replacePlayer(g, 'no-existe', { name: 'X' }); } catch (e) { err = e; }
  ok(err, 'debería lanzar');
});

// ── Gemela Malvada ───────────────────────────────────────────────────
G_('Gemela Malvada');
function twins() {
  const g = mk(['EVIL_TWIN', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE'], 'SECTS_AND_VIOLETS');
  const evil = by(g, 'EVIL_TWIN');
  const good = by(g, 'MAYOR');
  g.setup.decisions = [{ id: 'x', kind: 'otroSecreto', secret: 'evilTwin', seat: evil.id, targetSeat: good.id }];
  G.applySetup(g);
  return { g, evil, good };
}
t('los dos gemelos se conocen', () => {
  const { g, evil, good } = twins();
  eq(evil.evilTwinOf, good.id);
  eq(good.evilTwinOf, evil.id);
  const view = G.getPublicState(g, good.id, false);
  eq(view.players.find(p => p.id === good.id).evilTwinName, evil.name);
});
t('cada gemelo lleva su ficha en el grimorio', () => {
  const { evil, good } = twins();
  ok((evil.tokens || []).some(t => t.type === 'TWIN'), 'la gemela sin ficha');
  ok((good.tokens || []).some(t => t.type === 'TWIN'), 'el gemelo bueno sin ficha');
});
t('el Bien no gana mientras los dos gemelos vivan', () => {
  const { g } = twins();
  by(g, 'IMP').alive = false;
  G.checkWinCondition(g);
  no(g.winner, 'no debería terminar: ' + g.winReason);
});
t('muerto el gemelo bueno, el Bien ya puede ganar', () => {
  const { g, good } = twins();
  by(g, 'IMP').alive = false;
  good.alive = false;
  G.checkWinCondition(g);
  eq(g.winner, 'good');
});
t('avisa al narrador de que hay un gemelo bueno', () => {
  const { g } = twins();
  const view = G.getPublicState(g, null, true);
  ok(view.advice.some(a => /gemelo bueno/i.test(a.text)), 'sin aviso');
});

// ── Legión ───────────────────────────────────────────────────────────
G_('Legión');
t('el montaje convierte en Legión a los asientos marcados', () => {
  const g = mk(['LEGION', 'BARON', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE'], 'CAROUSEL');
  const ids = g.players.slice(0, 4).map(p => p.id);
  g.setup.decisions = [{ id: 'l', kind: 'legionSeats', seat: g.players[0].id, min: 4, chosen: ids }];
  G.applySetup(g);
  eq(g.players.filter(p => p.role === 'LEGION').length, 4);
  ok(g.players.filter(p => p.role === 'LEGION').every(p => p.alignment === 'evil'), 'deberían ser malvados');
});

// ── Grimorio del Espía / la Viuda ────────────────────────────────────
G_('Grimorio (Espía y Viuda)');
t('el Espía ve el personaje de todos los asientos de noche', () => {
  const g = mk(['SPY', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g);
  const spy = by(g, 'SPY');
  const view = G.getPublicState(g, spy.id, false);
  ok(view.viewerSeesGrimoire, 'debería marcarse como lector del Grimorio');
  const sinRol = view.players.filter(p => !p.role).map(p => p.name);
  eq(sinRol.join(','), '', 'asientos sin personaje visible');
});
t('el Espía NO ve conexión ni fichas', () => {
  const g = mk(['SPY', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g);
  const spy = by(g, 'SPY');
  const view = G.getPublicState(g, spy.id, false, { [spy.id]: 'online' });
  ok(view.players.every(p => p.presence === undefined), 'no debe viajar la conexión');
  ok(view.players.every(p => p.tokens === undefined), 'no deben viajar las fichas');
});
t('de día el Espía no ve el Grimorio', () => {
  const g = mk(['SPY', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g); G.startDay(g);
  const spy = by(g, 'SPY');
  const view = G.getPublicState(g, spy.id, false);
  no(view.viewerSeesGrimoire, 'de día no lee el Grimorio');
  no(view.players.find(p => p.role === 'IMP'), 'no debe filtrarse el Demonio de día');
});
t('la Viuda ve el Grimorio su noche y no las siguientes', () => {
  const g = mk(['WIDOW', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE'], 'CAROUSEL');
  G.startNight(g);
  const widow = by(g, 'WIDOW');
  ok(G.getPublicState(g, widow.id, false).viewerSeesGrimoire, 'noche 1: debería verlo');
  G.startDay(g); G.startNight(g);
  no(G.getPublicState(g, widow.id, false).viewerSeesGrimoire, 'noche 2: ya no');
});
t('un Espía muerto no lee el Grimorio', () => {
  const g = mk(['SPY', 'IMP', 'MONK', 'EMPATH', 'SOLDIER', 'MAYOR', 'RECLUSE']);
  G.startNight(g);
  by(g, 'SPY').alive = false;
  no(G.getPublicState(g, by(g, 'SPY').id, false).viewerSeesGrimoire);
});

// ════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(70));
console.log(`RESULTADO:  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log('═'.repeat(70));
if (fails.length) {
  console.log('\nFALLOS:\n');
  fails.forEach((f, i) => console.log(` ${i + 1}. ${f}\n`));
}
