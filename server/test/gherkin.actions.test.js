// Suite 4 — acciones que el cliente disparaba y el servidor ignoraba,
// más los controles nuevos del narrador (contador, cambio de bando, escalas).
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'gameLogic'));

let pass = 0, fail = 0; const fails = []; let group = '';
function G_(n) { group = n; }
function t(n, fn) { try { fn(); pass++; } catch (e) { fail++; fails.push(`[${group}] ${n}\n     → ${e.message}`); } }
function eq(a, b, m) { if (a !== b) throw new Error(`${m || ''} esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
function ok(v, m) { if (!v) throw new Error(m || 'falsy'); }
function no(v, m) { if (v) throw new Error(m || 'truthy'); }

let seq = 0;
function mk(roleList, campaignId = 'CAROUSEL') {
  const g = G.createGame('narr', 's4-' + (seq++));
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
const by = (g, r) => g.players.find(p => p.role === r);
const act = (g, type, actorId, targets = []) => G.applyNightAction(g, type, actorId, targets);
function poison(g, p) {
  p.tokens = p.tokens || [];
  p.tokens.push({ instanceId: 'POISONED:test', type: 'POISONED', label: 'Envenenado', expiry: ['PERMANENT'], manual: true });
  p.poisoned = true;
}

G_('Acciones antes muertas');
t('Encantador de Serpientes: intercambia personaje y alineación con el Demonio', () => {
  const g = mk(['SNAKE_CHARMER', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const sc = by(g, 'SNAKE_CHARMER'), demon = by(g, 'NO_DASHII');
  act(g, 'SNAKE_CHARMER', sc.id, [demon.id]);
  eq(sc.role, 'NO_DASHII', 'el Encantador debe ser ahora el Demonio');
  eq(sc.alignment, 'evil');
  eq(demon.role, 'SNAKE_CHARMER');
  eq(demon.alignment, 'good');
  ok(demon.poisoned, 'el ex-Demonio queda envenenado');
});
t('Encantador de Serpientes: si falla, no pasa nada', () => {
  const g = mk(['SNAKE_CHARMER', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const sc = by(g, 'SNAKE_CHARMER');
  act(g, 'SNAKE_CHARMER', sc.id, [by(g, 'MONK').id]);
  eq(sc.role, 'SNAKE_CHARMER');
  ok(sc.nightInfo.includes('No pasa nada'));
});
t('Encantador envenenado: no hay intercambio aunque acierte', () => {
  const g = mk(['SNAKE_CHARMER', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const sc = by(g, 'SNAKE_CHARMER');
  poison(g, sc);
  act(g, 'SNAKE_CHARMER', sc.id, [by(g, 'NO_DASHII').id]);
  eq(sc.role, 'SNAKE_CHARMER');
});
t('Predicador: el Esbirro pierde su habilidad (ficha permanente)', () => {
  const g = mk(['PREACHER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const pr = by(g, 'PREACHER'), min = by(g, 'POISONER');
  act(g, 'PREACHER', pr.id, [min.id]);
  ok((min.tokens || []).some(x => x.type === 'NO_ABILITY'), 'debe llevar ficha "sin habilidad"');
  ok(pr.nightInfo.includes('SÍ es Esbirro'));
});
t('Predicador: si falla no coloca ficha', () => {
  const g = mk(['PREACHER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const pr = by(g, 'PREACHER'), t2 = by(g, 'MAYOR');
  act(g, 'PREACHER', pr.id, [t2.id]);
  no((t2.tokens || []).some(x => x.type === 'NO_ABILITY'));
});
t('Viuda: envenena de forma permanente y ve el Grimorio', () => {
  const g = mk(['WIDOW', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const w = by(g, 'WIDOW'), v = by(g, 'MAYOR');
  act(g, 'WIDOW_POISON', w.id, [v.id]);
  ok(v.poisoned);
  ok(w.nightInfo.includes('GRIMORIO'));
  G.startDay(g); G.startNight(g);
  ok(v.poisoned, 'el veneno de la Viuda es permanente');
});
t('Licántropo: mata al bueno y bloquea al Demonio esa noche', () => {
  const g = mk(['LYCANTHROPE', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const ly = by(g, 'LYCANTHROPE'), v = by(g, 'MAYOR');
  act(g, 'LYCANTHROPE_KILL', ly.id, [v.id]);
  no(v.alive, 'el bueno debe morir');
  eq(g.demonBlockedNight, g.nightNumber);
  act(g, 'KAZALI_KILL', by(g, 'KAZALI').id, [by(g, 'SOLDIER').id]);
  ok(by(g, 'SOLDIER').alive, 'el Demonio no debe poder matar esta noche');
});
t('Licántropo: si elige a un malvado, el Demonio mata normal', () => {
  const g = mk(['LYCANTHROPE', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  act(g, 'LYCANTHROPE_KILL', by(g, 'LYCANTHROPE').id, [by(g, 'POISONER').id]);
  ok(by(g, 'POISONER').alive, 'un malvado no muere');
  act(g, 'KAZALI_KILL', by(g, 'KAZALI').id, [by(g, 'SOLDIER').id]);
  no(by(g, 'SOLDIER').alive, 'el Demonio sí mata');
});
t('Cazador: acierta → la Damisela pasa a Aldeano fuera de juego', () => {
  const g = mk(['HUNTSMAN', 'DAMSEL', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const h = by(g, 'HUNTSMAN'), d = by(g, 'DAMSEL');
  act(g, 'HUNTSMAN', h.id, [d.id]);
  no(d.role === 'DAMSEL', 'ya no debe ser Damisela');
  eq(d.type, 'townfolk');
  eq(d.alignment, 'good');
  ok(h.huntsmanUsed);
  ok(h.nightInfo.includes('Acertaste'));
});
t('Cazador: falla → nada cambia, pero el uso se gasta', () => {
  const g = mk(['HUNTSMAN', 'DAMSEL', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const h = by(g, 'HUNTSMAN');
  act(g, 'HUNTSMAN', h.id, [by(g, 'MAYOR').id]);
  eq(by(g, 'DAMSEL').role, 'DAMSEL');
  ok(h.huntsmanUsed);
});
t('Suma Sacerdotisa: recibe el jugador que elige el narrador', () => {
  const g = mk(['HIGH_PRIESTESS', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const hp = by(g, 'HIGH_PRIESTESS');
  act(g, 'HIGH_PRIESTESS', hp.id, [by(g, 'MAYOR').id]);
  ok(hp.nightInfo.includes(by(g, 'MAYOR').name), hp.nightInfo);
});
t('Sereno: el elegido aprende quién es', () => {
  const g = mk(['NIGHTWATCHMAN', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const nw = by(g, 'NIGHTWATCHMAN'), t2 = by(g, 'MAYOR');
  act(g, 'NIGHTWATCHMAN', nw.id, [t2.id]);
  ok(t2.nightInfo.includes(nw.name), t2.nightInfo);
  ok(nw.nightwatchmanUsed);
});
t('Arpía: el primero recibe la creencia sobre el segundo', () => {
  const g = mk(['HARPY', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const [a, b] = [by(g, 'MAYOR'), by(g, 'SOLDIER')];
  act(g, 'HARPY', by(g, 'HARPY').id, [a.id, b.id]);
  ok((a.tokens || []).some(x => x.type === 'HARPY_MADNESS'));
  ok(a.nightInfo.includes(b.name));
});
t('Coleccionista de Huesos: el muerto despierta SOLO esa noche', () => {
  const g = mk(['BONE_COLLECTOR', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'FEARMONGER']);
  const dead = by(g, 'FEARMONGER'); dead.alive = false;
  G.startNight(g); G.startDay(g); G.startNight(g);
  act(g, 'BONE_COLLECT', by(g, 'BONE_COLLECTOR').id, [dead.id]);
  eq(dead.abilityBackNight, g.nightNumber, 'marcado para esta noche');
  G.startDay(g); G.startNight(g);
  no(g.nightQueue.includes(dead.id), 'la noche siguiente ya NO despierta');
});
t('Cazarrecompensas: el botón fija el malvado conocido', () => {
  const g = mk(['BOUNTY_HUNTER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const bh = by(g, 'BOUNTY_HUNTER'), evil = by(g, 'POISONER');
  act(g, 'BOUNTY_HUNTER_REVEAL', bh.id, [evil.id]);
  eq(bh.bountyKnownId, evil.id);
  ok(bh.nightInfo.includes(evil.name));
});
t('PO_KILL ya no es una acción muerta', () => {
  const g = mk(['MONK', 'EMPATH', 'PO', 'MAYOR', 'SOLDIER', 'GAMBLER', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  act(g, 'PO_KILL', by(g, 'PO').id, [by(g, 'MAYOR').id]);
  no(by(g, 'MAYOR').alive);
});

G_('Controles nuevos del narrador');
t('Yaggababble: mata tantos como veces dijo su frase', () => {
  const g = mk(['MONK', 'EMPATH', 'YAGGABABBLE', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g); G.startDay(g);
  g.counters.yaggaSaidToday = 2;   // el narrador la contó 2 veces durante el día
  G.startNight(g);
  const y = by(g, 'YAGGABABBLE');
  act(g, 'YAGGABABBLE_KILL', y.id, [by(g, 'MAYOR').id, by(g, 'ACROBAT').id]);
  no(by(g, 'MAYOR').alive);
  no(by(g, 'ACROBAT').alive);
});
t('Yaggababble: el contador del día sobrevive al anochecer', () => {
  const g = mk(['MONK', 'EMPATH', 'YAGGABABBLE', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g); G.startDay(g);
  g.counters.yaggaSaidToday = 1;
  G.startNight(g);
  eq(g.counters.yaggaSaidToday, 1, 'no debe reiniciarse al anochecer');
});
t('Yaggababble: si no dijo la frase no mata a nadie', () => {
  const g = mk(['MONK', 'EMPATH', 'YAGGABABBLE', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  eq(g.counters.yaggaSaidToday, 0, 'el amanecer lo reinicia');
  act(g, 'YAGGABABBLE_KILL', by(g, 'YAGGABABBLE').id, [by(g, 'MAYOR').id]);
  ok(by(g, 'MAYOR').alive, 'no debería morir nadie');
});
t("Lil' Monsta: el canguro cuenta como Demonio vivo", () => {
  const g = mk(['LIL_MONSTA', 'BARON', 'POISONER', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g);
  const keeper = by(g, 'BARON');
  act(g, 'LIL_MONSTA_ASSIGN', by(g, 'LIL_MONSTA').id, [keeper.id]);
  ok((keeper.tokens || []).some(t => t.type === 'LIL_MONSTA_KEEPER'), 'sin ficha de canguro');
});
t("Lil' Monsta: solo hay un canguro a la vez", () => {
  const g = mk(['LIL_MONSTA', 'BARON', 'POISONER', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g);
  const lm = by(g, 'LIL_MONSTA').id;
  act(g, 'LIL_MONSTA_ASSIGN', lm, [by(g, 'BARON').id]);
  act(g, 'LIL_MONSTA_ASSIGN', lm, [by(g, 'POISONER').id]);
  const conFicha = g.players.filter(p => (p.tokens || []).some(t => t.type === 'LIL_MONSTA_KEEPER'));
  eq(conFicha.length, 1);
  eq(conFicha[0].role, 'POISONER');
});
t('Adorable: al morir deja borracho a 1 jugador de forma permanente', () => {
  const g = mk(['SWEETHEART', 'IMP', 'MONK', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  act(g, 'SWEETHEART_DRUNK', by(g, 'SWEETHEART').id, [victim.id]);
  ok(victim.poisoned, 'debería quedar inhabilitado');
  G.startDay(g); G.startNight(g);
  ok(victim.poisoned, 'y seguir estándolo el resto de la partida');
});
t('Yaggababble envenenado: no mata a nadie', () => {
  const g = mk(['MONK', 'EMPATH', 'YAGGABABBLE', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g);
  const y = by(g, 'YAGGABABBLE');
  poison(g, y);
  act(g, 'YAGGABABBLE_KILL', y.id, [by(g, 'MAYOR').id]);
  ok(by(g, 'MAYOR').alive);
});
t('Político: el botón le cambia de bando', () => {
  const g = mk(['POLITICIAN', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const pol = by(g, 'POLITICIAN');
  eq(pol.alignment, 'good');
  act(g, 'POLITICIAN_SWITCH', pol.id, []);
  eq(pol.alignment, 'evil');
  ok(pol.politicianSwitched);
});
t('Damisela: si los Esbirros aciertan, ganan los malvados', () => {
  const g = mk(['DAMSEL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  act(g, 'DAMSEL_GUESS', by(g, 'POISONER').id, [by(g, 'DAMSEL').id]);
  eq(g.winner, 'evil');
});
t('Damisela: si fallan, no pueden reintentarlo', () => {
  const g = mk(['DAMSEL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  act(g, 'DAMSEL_GUESS', by(g, 'POISONER').id, [by(g, 'MAYOR').id]);
  ok(g.damselGuessUsed);
  no(g.winner, 'nadie gana al fallar');
  act(g, 'DAMSEL_GUESS', by(g, 'POISONER').id, [by(g, 'DAMSEL').id]);
  no(g.winner, 'el segundo intento no cuenta');
});
t('Damisela envenenada: el acierto no hace perder a los buenos', () => {
  const g = mk(['DAMSEL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  poison(g, by(g, 'DAMSEL'));
  act(g, 'DAMSEL_GUESS', by(g, 'POISONER').id, [by(g, 'DAMSEL').id]);
  no(g.winner);
});
t('General: recibe la opinión del narrador', () => {
  const g = mk(['GENERAL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const gen = by(g, 'GENERAL');
  act(g, 'GENERAL_INFO', gen.id, ['evil']);
  ok(gen.nightInfo.includes('MAL va ganando'), gen.nightInfo);
  act(g, 'GENERAL_INFO', gen.id, ['good']);
  ok(gen.nightInfo.includes('BIEN va ganando'));
});
t('Amnésico: el narrador fija su habilidad y responde su intento', () => {
  const g = mk(['AMNESIAC', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const am = by(g, 'AMNESIAC');
  act(g, 'AMNESIAC_SET', am.id, ['Cada noche sabes si dos jugadores son del mismo bando']);
  ok(g.amnesiacAbility.includes('mismo bando'));
  act(g, 'AMNESIAC_GUESS', am.id, ['templado']);
  ok(am.nightInfo.includes('TEMPLADO'), am.nightInfo);
  act(g, 'AMNESIAC_GUESS', am.id, ['bingo']);
  ok(am.amnesiacSolved);
});
t('SEND_INFO: el texto libre del narrador llega al jugador', () => {
  const g = mk(['MONK', 'EMPATH', 'KAZALI', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g);
  const m = by(g, 'MONK');
  act(g, 'SEND_INFO', m.id, ['Mensaje del narrador']);
  eq(m.nightInfo, 'Mensaje del narrador');
});

// ── Fichas del grimorio ──────────────────────────────────────────────
G_('Fichas del grimorio');
const TB = ['POISONER', 'IMP', 'MONK', 'SOLDIER', 'EMPATH', 'MAYOR', 'RECLUSE'];

t('el veneno del motor y la ficha manual del Envenenador comparten identidad', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'EMPATH');
  const ficha = { tokenId: 'POISONED', roleId: 'POISONER', label: 'Envenenado', duration: 'night' };
  act(g, 'POISON', by(g, 'POISONER').id, [victim.id]);
  const venenos = () => victim.tokens.filter(x => x.type === 'POISONED').length;
  eq(venenos(), 1, 'tras envenenar el motor');
  // Colocar la ficha del mismo rol NO añade una segunda idéntica.
  G.placeManualToken(g, victim.id, ficha);
  eq(venenos(), 1, 'colocar sobre la del motor no duplica');
  // Desde el selector (toggle) sí se puede quitar.
  G.placeManualToken(g, victim.id, ficha, true);
  eq(venenos(), 0, 'toggle la quita');
  G.placeManualToken(g, victim.id, ficha, true);
  eq(venenos(), 1, 'y la vuelve a poner, nunca dos');
});

t('dos fuentes distintas de "A salvo" sí son dos fichas', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'MONK', label: 'A salvo', duration: 'night' });
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'SOLDIER', label: 'A salvo', duration: 'permanent' });
  eq(victim.tokens.length, 2, 'deberían convivir');
  eq(new Set(victim.tokens.map(x => x.key)).size, 2, 'claves distintas');
});

t('las fichas con la misma etiqueta se numeran', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'MONK', label: 'A salvo' });
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'SOLDIER', label: 'A salvo' });
  eq(victim.tokens.map(x => `${x.ordinal}/${x.ordinalOf}`).join(' '), '1/2 2/2');
});

t('una ficha sola no lleva número', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'MONK', label: 'A salvo' });
  eq(victim.tokens[0].ordinalOf, null);
});

t('colocar dos veces la misma ficha manual la quita solo con toggle', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  const ficha = { tokenId: 'SAFE', roleId: 'MONK', label: 'A salvo' };
  G.placeManualToken(g, victim.id, ficha);
  G.placeManualToken(g, victim.id, ficha);
  eq(victim.tokens.length, 1, 'sin toggle es idempotente');
  G.placeManualToken(g, victim.id, ficha, true);
  eq(victim.tokens.length, 0, 'con toggle se quita');
});

t('cada ficha tiene uid único', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'MONK', label: 'A salvo' });
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'SOLDIER', label: 'A salvo' });
  const uids = victim.tokens.map(x => x.uid);
  ok(uids.every(Boolean), 'falta uid');
  eq(new Set(uids).size, uids.length, 'uids repetidos');
});

t('REMOVE_TOKEN por uid quita exactamente una', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'MAYOR');
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'MONK', label: 'A salvo' });
  G.placeManualToken(g, victim.id, { tokenId: 'SAFE', roleId: 'SOLDIER', label: 'A salvo' });
  G.removePlayerToken(g, victim.id, victim.tokens[0].uid);
  eq(victim.tokens.length, 1);
  eq(victim.tokens[0].ordinalOf, null, 'debe renumerarse');
});

t('un cadáver solo lleva UNA ficha "Muere" aunque le ataquen dos', () => {
  const g = mk(['IMP', 'ASSASSIN', 'MONK', 'SOLDIER', 'EMPATH', 'MAYOR', 'RECLUSE'], 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'EMPATH');
  act(g, 'IMP_KILL', by(g, 'IMP').id, [victim.id]);
  act(g, 'ASSASSIN_KILL', by(g, 'ASSASSIN').id, [victim.id]);
  eq(victim.tokens.filter(x => x.type === 'DIES').length, 1, 'fichas "Muere"');
});

t('el veneno del narrador no lleva la cara de la víctima', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'EMPATH');
  act(g, 'POISON', null, [victim.id]);
  const tok = victim.tokens.find(x => x.type === 'POISONED');
  eq(tok.roleId, 'NARRATOR', 'debería atribuirse al narrador');
  ok(tok.icon && /estados/.test(tok.icon), 'debería usar el arte de estado: ' + tok.icon);
});

t('el veneno del narrador y el del Envenenador conviven sin confundirse', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  const victim = by(g, 'EMPATH');
  act(g, 'POISON', null, [victim.id]);
  act(g, 'POISON', by(g, 'POISONER').id, [victim.id]);
  const venenos = victim.tokens.filter(x => x.type === 'POISONED');
  eq(venenos.length, 2, 'son dos fuentes distintas');
  eq(new Set(venenos.map(x => x.roleId)).size, 2, 'con dueños distintos');
});

t('toda ficha viaja al cliente con etiqueta corta e imagen resuelta', () => {
  const g = mk(TB, 'TROUBLE_BREWING');
  G.startNight(g);
  act(g, 'POISON', by(g, 'POISONER').id, [by(g, 'EMPATH').id]);
  const view = G.getPublicState(g, null, true);
  const tok = view.players.flatMap(p => p.tokens || []).find(x => x.type === 'POISONED');
  ok(tok.uid, 'sin uid');
  eq(tok.short, 'Veneno');
  ok(tok.img, 'sin imagen resuelta');
});

console.log('\n' + '═'.repeat(70));
console.log(`SUITE 4 (acciones):  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log('═'.repeat(70));
if (fails.length) { console.log('\nFALLOS:\n'); fails.forEach((f, i) => console.log(` ${i + 1}. ${f}\n`)); }
if (fail > 0) process.exitCode = 1;
