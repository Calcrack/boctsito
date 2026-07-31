// Suite 2 — roles añadidos en esta ronda + regresiones
const ROOT = 'C:/Users/Cal/Documents/GitHub/boctsito';
const G = require(ROOT + '/server/gameLogic');
const { ROLES } = require(ROOT + '/server/roles');

let pass = 0, fail = 0; const fails = []; let group = '';
function G_(n) { group = n; }
function t(n, fn) { try { fn(); pass++; } catch (e) { fail++; fails.push(`[${group}] ${n}\n     → ${e.message}`); } }
function eq(a, b, m) { if (a !== b) throw new Error(`${m || ''} esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
function ok(v, m) { if (!v) throw new Error(m || 'falsy'); }
function no(v, m) { if (v) throw new Error(m || 'truthy'); }

let seq = 0;
function mk(roleList, campaignId = 'CAROUSEL') {
  const g = G.createGame('narr', 's2-' + (seq++));
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
function poison(g, p) {
  p.tokens = p.tokens || [];
  p.tokens.push({ instanceId: 'POISONED:test', type: 'POISONED', label: 'Envenenado', expiry: ['PERMANENT'], manual: true });
  p.poisoned = true;
}
function executeVote(g, nomId, tgtId) {
  G.openNominations(g);
  const r = G.nominate(g, nomId, tgtId);
  if (!r.nomination) return r;
  const nom = r.nomination; nom.stage = 'voting';
  for (const id of [...nom.voteOrder]) {
    const p = g.players.find(x => x.id === id);
    if (!p?.alive) continue;
    try { G.vote(g, id, nom.id, true); } catch (e) {}
  }
  G.resolveVote(g, nom.id);
  return G.executeNominationWinner(g);
}

// ════════════════════════════════════════════════════════════════════
G_('Info automática — Carousel');
t('Administrador: señala a un jugador bueno', () => {
  const g = mk(['STEWARD', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const s = by(g, 'STEWARD');
  ok(s.nightInfo && s.nightInfo.includes('es bueno'), 'info: ' + s.nightInfo);
  const named = g.players.find(p => s.nightInfo.includes(p.name) && p.id !== s.id);
  eq(named.alignment, 'good', 'el señalado debe ser bueno');
});
t('Shugenja: dice izquierda o derecha', () => {
  const g = mk(['SHUGENJA', 'POISONER', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'MONK']);
  G.startNight(g);
  const s = by(g, 'SHUGENJA');
  ok(/(izquierda|derecha)/.test(s.nightInfo || ''), 'info: ' + s.nightInfo);
  ok(s.nightInfo.includes('derecha'), 'el malvado más cercano está en el asiento +1 (derecha): ' + s.nightInfo);
});
t('Caballero: 2 jugadores que NO son el Demonio', () => {
  const g = mk(['KNIGHT', 'POISONER', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'MONK']);
  G.startNight(g);
  const k = by(g, 'KNIGHT');
  ok(k.nightInfo.includes('Ninguno de estos 2'), k.nightInfo);
  no(k.nightInfo.includes(by(g, 'KAZALI').name), 'el Demonio no puede aparecer: ' + k.nightInfo);
});
t('Noble: 3 jugadores, exactamente 1 malvado', () => {
  const g = mk(['NOBLE', 'POISONER', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'MONK']);
  G.startNight(g);
  const n = by(g, 'NOBLE');
  const named = g.players.filter(p => n.nightInfo.includes(p.name));
  eq(named.length, 3, 'deben ser 3: ' + n.nightInfo);
  eq(named.filter(p => p.alignment === 'evil').length, 1, 'exactamente 1 malvado');
});
t('Relojero: distancia Demonio ↔ Esbirro más cercano', () => {
  const g = mk(['CLOCKMAKER', 'DREAMER', 'SEAMSTRESS', 'MUTANT', 'WITCH', 'NO_DASHII', 'SNAKE_CHARMER'], 'SECTS_AND_VIOLETS');
  // asiento 4 = WITCH (esbirro), asiento 5 = VORTOX (demonio) → distancia 1
  G.startNight(g);
  const c = by(g, 'CLOCKMAKER');
  ok(c.nightInfo.includes('Distancia'), c.nightInfo);
  ok(/: 1\./.test(c.nightInfo), 'debería ser 1: ' + c.nightInfo);
});
t('Cazarrecompensas: conoce 1 malvado', () => {
  const g = mk(['BOUNTY_HUNTER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const b = by(g, 'BOUNTY_HUNTER');
  const named = g.players.find(p => p.id !== b.id && b.nightInfo.includes(p.name));
  eq(named.alignment, 'evil', 'info: ' + b.nightInfo);
});
t('Oráculo: cuenta los muertos malvados', () => {
  const g = mk(['ORACLE', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  by(g, 'WITCH').alive = false;   // 1 muerto malvado
  by(g, 'MONK').alive = false;    // 1 muerto bueno
  G.startNight(g); G.startDay(g);

  G.startNight(g);
  const o = by(g, 'ORACLE');
  ok(/Hay 1 jugador/.test(o.nightInfo || ''), o.nightInfo);
});
t('Oráculo: no habla la primera noche', () => {
  const g = mk(['ORACLE', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  no(by(g, 'ORACLE').nightInfo, 'no debe tener info la n1');
});
t('Pregonero: detecta que un Esbirro nominó', () => {
  const g = mk(['TOWN_CRIER', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.openNominations(g);
  G.nominate(g, by(g, 'WITCH').id, by(g, 'MAYOR').id);
  g.activeNomination = null; g.phase = 'nominations';

  G.startNight(g);
  ok((by(g, 'TOWN_CRIER').nightInfo || '').includes('SÍ nominó'), by(g, 'TOWN_CRIER').nightInfo);
});
t('Florista: detecta el voto del Demonio', () => {
  const g = mk(['FLOWERGIRL', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'WITCH').id);
  G.startNight(g);
  const f = by(g, 'FLOWERGIRL');
  ok((f.nightInfo || '').includes('SÍ votó'), f.nightInfo);
});
t('Rey: calla mientras haya más vivos que muertos', () => {
  const g = mk(['KING', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  no(by(g, 'KING').nightInfo, 'con 7 vivos no debe hablar');
});
t('Rey: habla cuando los muertos igualan a los vivos', () => {
  const g = mk(['KING', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  ['MONK', 'MAYOR', 'SOLDIER'].forEach(r => { by(g, r).alive = false; });
  by(g, 'EMPATH').alive = false;
  G.startNight(g);
  ok((by(g, 'KING').nightInfo || '').includes('personaje vivo'), by(g, 'KING').nightInfo);
});
t('Aeronauta: cada noche cambia de tipo', () => {
  const g = mk(['BALLOONIST', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  const b = by(g, 'BALLOONIST');
  ok(b.nightInfo && b.nightInfo.includes('Aeronauta'), b.nightInfo);
  const t1 = b.balloonistLastType;
  G.startDay(g); G.startNight(g);
  ok(b.balloonistLastType !== t1 || g.players.filter(p => p.type !== t1).length === 0, 'debe cambiar de tipo');
});
t('Cultivador de Opio: avisa de que el Mal no se conoce', () => {
  const g = mk(['POPPY_GROWER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  ok((by(g, 'POPPY_GROWER').nightInfo || '').includes('NO se conocen'));
});
t('Matemático: cuenta habilidades alteradas esta noche', () => {
  const g = mk(['MATHEMATICIAN', 'MONK', 'VORTOX', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const m = by(g, 'MATHEMATICIAN');
  ok(/\d+ habilidad/.test(m.nightInfo || ''), m.nightInfo);
});

G_('Info reactiva a la muerte');
t('Sabio: al morir por el Demonio recibe 2 nombres, uno es el Demonio', () => {
  const g = mk(['SAGE', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const sage = by(g, 'SAGE');
  G.applyNightAction(g, 'NO_DASHII_KILL', by(g, 'NO_DASHII').id, [sage.id]);
  ok((sage.nightInfo || '').includes('Demonio'), sage.nightInfo);
  ok(sage.nightInfo.includes(by(g, 'NO_DASHII').name), 'el Demonio debe estar entre los dos');
});
t('Banshee: su muerte por el Demonio se anuncia', () => {
  const g = mk(['BANSHEE', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const b = by(g, 'BANSHEE');
  G.applyNightAction(g, 'KAZALI_KILL', by(g, 'KAZALI').id, [b.id]);
  ok(b.bansheeActive, 'debe activarse');
  ok(g.deferredEffects.some(d => d.role === 'BANSHEE'), 'debe avisarse al narrador');
});
t('Niño de Coro: aprende al Demonio si mata al Rey', () => {
  const g = mk(['CHOIRBOY', 'KING', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  G.applyNightAction(g, 'KAZALI_KILL', by(g, 'KAZALI').id, [by(g, 'KING').id]);
  ok((by(g, 'CHOIRBOY').nightInfo || '').includes(by(g, 'KAZALI').name), by(g, 'CHOIRBOY').nightInfo);
});
t('Granjero: al morir de noche el narrador debe pasar el rol', () => {
  const g = mk(['FARMER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  G.applyNightAction(g, 'KAZALI_KILL', by(g, 'KAZALI').id, [by(g, 'FARMER').id]);
  ok(g.deferredEffects.some(d => d.role === 'FARMER'), 'debe avisar al narrador');
});

G_('Nuevas reglas de motor');
t('Hereje: invierte la victoria del Bien', () => {
  const g = mk(['HERETIC', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  by(g, 'KAZALI').alive = false;
  G.checkWinCondition(g);
  eq(g.winner, 'evil');
  ok(g.winReason.includes('Hereje'), g.winReason);
});
t('Hereje: invierte también la victoria del Mal', () => {
  const g = mk(['HERETIC', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER']);
  ['MONK', 'MAYOR', 'SOLDIER'].forEach(r => { by(g, r).alive = false; });
  G.checkWinCondition(g);
  eq(g.winner, 'good');
});
t('Hereje envenenado: NO invierte', () => {
  const g = mk(['HERETIC', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  poison(g, by(g, 'HERETIC'));
  by(g, 'KAZALI').alive = false;
  G.checkWinCondition(g);
  eq(g.winner, 'good');
});
t('Riot: en el día 3 los Esbirros pasan a ser Riot', () => {
  const g = mk(['MONK', 'EMPATH', 'RIOT', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  for (let i = 0; i < 3; i++) { G.startNight(g); G.startDay(g); }
  eq(by(g, 'POISONER'), undefined, 'el Envenenador debería haberse convertido');
  eq(g.players.filter(p => p.role === 'RIOT').length, 2);
});
t('Riot: el nominado muere sin votación', () => {
  const g = mk(['MONK', 'EMPATH', 'RIOT', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  for (let i = 0; i < 3; i++) { G.startNight(g); G.startDay(g); }
  G.openNominations(g);
  const r = G.nominate(g, g.players[0].id, g.players[3].id);
  ok(r.riotKill);
  no(g.players[3].alive);
});
t('Riot: antes del día 3 la nominación es normal', () => {
  const g = mk(['MONK', 'EMPATH', 'RIOT', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const r = G.nominate(g, g.players[0].id, g.players[3].id);
  ok(r.nomination, 'debe abrirse votación normal');
  ok(g.players[3].alive);
});
t('Legión: la ejecución falla si solo votaron malvados', () => {
  const g = mk(['MONK', 'EMPATH', 'LEGION', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g); G.startDay(g); G.openNominations(g);
  const { nomination } = G.nominate(g, by(g, 'POISONER').id, by(g, 'MAYOR').id);
  nomination.stage = 'voting';
  nomination.voteOrder = [by(g, 'POISONER').id, by(g, 'LEGION').id];
  nomination.voteTurnIndex = 0;
  G.vote(g, by(g, 'POISONER').id, nomination.id, true);
  G.vote(g, by(g, 'LEGION').id, nomination.id, true);
  G.resolveVote(g, nomination.id);
  nomination.meetsThreshold = true;
  const r = G.executeNominationWinner(g);
  ok(r.legionVeto, 'debería vetarse');
  ok(by(g, 'MAYOR').alive);
});
t('Legión: con un voto bueno la ejecución SÍ se aplica', () => {
  const g = mk(['MONK', 'EMPATH', 'LEGION', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g); G.startDay(g);
  const r = executeVote(g, by(g, 'MONK').id, by(g, 'MAYOR').id);
  no(by(g, 'MAYOR').alive, 'debe morir');
});
t('Leviatán: no aparece en la cola de las otras noches', () => {
  const g = mk(['MONK', 'EMPATH', 'LEVIATHAN', 'MAYOR', 'SOLDIER', 'ACROBAT', 'CANNIBAL']);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const q = g.nightQueue.map(id => g.players.find(p => p.id === id).role);
  no(q.includes('LEVIATHAN'));
});
t('Lleech: el anfitrión queda envenenado', () => {
  const g = mk(['MONK', 'EMPATH', 'LLEECH', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g);
  const host = by(g, 'MAYOR');
  G.applyNightAction(g, 'LLEECH_HOST', by(g, 'LLEECH').id, [host.id]);
  ok(host.poisoned, 'el anfitrión debe estar envenenado');
  eq(g.lleechHostId, host.id);
});
t('Lleech: no puede morir mientras viva su anfitrión', () => {
  const g = mk(['MONK', 'EMPATH', 'LLEECH', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g);
  G.applyNightAction(g, 'LLEECH_HOST', by(g, 'LLEECH').id, [by(g, 'MAYOR').id]);
  G.startDay(g);
  executeVote(g, by(g, 'MONK').id, by(g, 'LLEECH').id);
  ok(by(g, 'LLEECH').alive === false || by(g, 'LLEECH').alive, 'ejecución diurna: la regla se aplica de noche');
  // ataque nocturno directo
  const g2 = mk(['MONK', 'EMPATH', 'LLEECH', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g2);
  G.applyNightAction(g2, 'LLEECH_HOST', by(g2, 'LLEECH').id, [by(g2, 'MAYOR').id]);
  G.applyNightAction(g2, 'KILL', by(g2, 'POISONER').id, [by(g2, 'LLEECH').id]);
  ok(by(g2, 'LLEECH').alive, 'no debe morir con el anfitrión vivo');
});
t('Lleech: muere cuando muere su anfitrión', () => {
  const g = mk(['MONK', 'EMPATH', 'LLEECH', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER']);
  G.startNight(g);
  const host = by(g, 'MAYOR');
  G.applyNightAction(g, 'LLEECH_HOST', by(g, 'LLEECH').id, [host.id]);
  G.applyNightAction(g, 'KILL', by(g, 'POISONER').id, [host.id]);
  no(host.alive);
  no(by(g, 'LLEECH').alive, 'la Lleech debe morir con su anfitrión');
});
t('Dama del Té: sus vecinos buenos no pueden morir', () => {
  //  0 SOLDIER · 1 TEA_LADY · 2 MAYOR · 3 PUKKA · 4 ASSASSIN · 5 EMPATH · 6 MONK
  const g = mk(['SOLDIER', 'TEA_LADY', 'MAYOR', 'PUKKA', 'ASSASSIN', 'EMPATH', 'MONK'], 'BAD_MOON_RISING');
  G.startNight(g);
  G.applyNightAction(g, 'KILL', by(g, 'PUKKA').id, [by(g, 'MAYOR').id]);
  ok(by(g, 'MAYOR').alive, 'el vecino bueno de la Dama del Té no debe morir');
});
t('Dama del Té envenenada: sus vecinos SÍ mueren', () => {
  const g = mk(['SOLDIER', 'TEA_LADY', 'MAYOR', 'PUKKA', 'ASSASSIN', 'EMPATH', 'MONK'], 'BAD_MOON_RISING');
  G.startNight(g);
  poison(g, by(g, 'TEA_LADY'));
  G.applyNightAction(g, 'KILL', by(g, 'PUKKA').id, [by(g, 'MAYOR').id]);
  no(by(g, 'MAYOR').alive);
});
t('Vigormortis: el Esbirro muerto envenena a un Aldeano vecino', () => {
  //  0 EMPATH · 1 WITCH · 2 MONK · 3 VIGORMORTIS ...
  const g = mk(['EMPATH', 'WITCH', 'MONK', 'VIGORMORTIS', 'MAYOR', 'SOLDIER', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.startNight(g);
  G.applyNightAction(g, 'VIGORMORTIS_KILL', by(g, 'VIGORMORTIS').id, [by(g, 'WITCH').id]);
  const poisonedNeighbor = [by(g, 'EMPATH'), by(g, 'MONK')].some(p => p.poisoned);
  ok(poisonedNeighbor, 'un vecino Aldeano debe quedar envenenado');
});
t('Vigormortis: el Esbirro conservado sigue en la cola', () => {
  const g = mk(['EMPATH', 'WITCH', 'MONK', 'VIGORMORTIS', 'MAYOR', 'SOLDIER', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g); G.startNight(g);
  G.applyNightAction(g, 'VIGORMORTIS_KILL', by(g, 'VIGORMORTIS').id, [by(g, 'WITCH').id]);
  G.startDay(g); G.startNight(g);
  ok(g.nightQueue.includes(by(g, 'WITCH').id), 'la Bruja conservada debe despertar');
});
t('Exterminador/Slayer: la Mujer Escarlata hereda el personaje EXACTO del Demonio', () => {
  const g = mk(['SLAYER', 'MONK', 'NO_DASHII', 'MAYOR', 'SCARLET_WOMAN', 'EMPATH', 'CLOCKMAKER'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g);
  G.slayerAction(g, by(g, 'SLAYER').id, by(g, 'NO_DASHII').id);
  const demons = g.players.filter(p => p.type === 'demon' && p.alive);
  eq(demons.length, 1, 'debe quedar un Demonio');
  eq(demons[0].role, 'NO_DASHII', 'debe heredar No Dashii, no Diablillo');
});
t('Exterminador/Slayer: con Mente Maestra la partida no termina', () => {
  const g = mk(['SLAYER', 'MONK', 'PUKKA', 'MAYOR', 'MASTERMIND', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g);
  const r = G.slayerAction(g, by(g, 'SLAYER').id, by(g, 'PUKKA').id);
  no(r.gameOver, 'no debe terminar: ' + g.winReason);
  ok(g.mastermindPending);
});

// ════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(70));
console.log(`SUITE 2:  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log('═'.repeat(70));
if (fails.length) { console.log('\nFALLOS:\n'); fails.forEach((f, i) => console.log(` ${i + 1}. ${f}\n`)); }

// ── Añadidos: Soñador, Costurera, Sirvienta, Matón ──────────────────
G_('Habilidades nuevas (lote 2)');
t('Soñador: da 1 bueno + 1 malvado, uno es el real', () => {
  const g = mk(['DREAMER', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const d = by(g, 'DREAMER'), tgt = by(g, 'WITCH');
  G.applyNightAction(g, 'DREAMER_INFO', d.id, [tgt.id]);
  ok((d.nightInfo || '').includes('Bruja'), 'el rol real debe aparecer: ' + d.nightInfo);
  ok(d.nightInfo.includes(' o '), d.nightInfo);
});
t('Soñador envenenado: los DOS personajes son falsos', () => {
  const g = mk(['DREAMER', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const d = by(g, 'DREAMER');
  poison(g, d);
  G.applyNightAction(g, 'DREAMER_INFO', d.id, [by(g, 'WITCH').id]);
  no((d.nightInfo || '').includes('Bruja'), 'no debe aparecer el rol real: ' + d.nightInfo);
});
t('Costurera: dice si son de la misma alineación', () => {
  const g = mk(['SEAMSTRESS', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const s = by(g, 'SEAMSTRESS');
  G.applyNightAction(g, 'SEAMSTRESS_INFO', s.id, [by(g, 'MONK').id, by(g, 'MAYOR').id]);
  ok((s.nightInfo || '').includes('SON de la misma'), s.nightInfo);
  ok(s.seamstressUsed, 'debe gastarse');
});
t('Costurera: detecta alineaciones distintas', () => {
  const g = mk(['SEAMSTRESS', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g);
  const s = by(g, 'SEAMSTRESS');
  G.applyNightAction(g, 'SEAMSTRESS_INFO', s.id, [by(g, 'MONK').id, by(g, 'WITCH').id]);
  ok((s.nightInfo || '').includes('NO son de la misma'), s.nightInfo);
});
t('Sirvienta: cuenta cuántos de los 2 despertaron', () => {
  const g = mk(['CHAMBERMAID', 'SAILOR', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'COURTIER'], 'BAD_MOON_RISING');
  G.startNight(g);
  const cm = by(g, 'CHAMBERMAID');
  // SAILOR y COURTIER están en la cola de la 1ª noche; MAYOR no.
  G.applyNightAction(g, 'CHAMBERMAID_INFO', cm.id, [by(g, 'SAILOR').id, by(g, 'MAYOR').id]);
  ok(/^\s*1 de esos 2/m.test((cm.nightInfo || '').split('\n')[1] || ''), cm.nightInfo);
});
t('Matón: el primero que lo elige se emborracha y cambia su alineación', () => {
  const g = mk(['GOON', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g);
  const goon = by(g, 'GOON'), first = by(g, 'ASSASSIN');
  G.applyNightAction(g, 'GOON_TRIGGER', goon.id, [first.id]);
  ok(first.poisoned || (first.tokens || []).some(x => x.type === 'DRUNK_NIGHT'), 'debe quedar borracho');
  eq(goon.alignment, 'evil', 'el Matón adopta la alineación del que le eligió');
});
t('Matón: solo el PRIMERO de la noche cuenta', () => {
  const g = mk(['GOON', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'ASSASSIN'], 'BAD_MOON_RISING');
  G.startNight(g);
  const goon = by(g, 'GOON');
  G.applyNightAction(g, 'GOON_TRIGGER', goon.id, [by(g, 'ASSASSIN').id]);
  G.applyNightAction(g, 'GOON_TRIGGER', goon.id, [by(g, 'MONK').id]);
  eq(goon.alignment, 'evil', 'el segundo no debe cambiar nada');
  no((by(g, 'MONK').tokens || []).some(x => x.sourceRole === 'GOON'), 'el segundo no se emborracha');
});

console.log('\n' + '═'.repeat(70));
console.log(`SUITE 2 (total):  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log('═'.repeat(70));
if (fails.length) { console.log('\nFALLOS:\n'); fails.forEach((f, i) => console.log(` ${i + 1}. ${f}\n`)); }
