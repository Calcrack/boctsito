// Suite 3 — guía del narrador (roles NO automatizados a propósito)
// Estos personajes se resuelven a mano: la prueba comprueba que la página
// avisa en el MOMENTO correcto y dice con qué control resolverlo.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'gameLogic'));
const { HINTED_ROLES, computeRoleHints } = require(path.join(ROOT, 'narratorHints'));

let pass = 0, fail = 0; const fails = []; let group = '';
function G_(n) { group = n; }
function t(n, fn) { try { fn(); pass++; } catch (e) { fail++; fails.push(`[${group}] ${n}\n     → ${e.message}`); } }
function eq(a, b, m) { if (a !== b) throw new Error(`${m || ''} esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
function ok(v, m) { if (!v) throw new Error(m || 'falsy'); }

let seq = 0;
function mk(roleList, campaignId = 'CAROUSEL') {
  const g = G.createGame('narr', 's3-' + (seq++));
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
const hintsOf = (g, roleId) => computeRoleHints(g).filter(h => h.roleId === roleId);

G_('Guía del narrador — cobertura');
t('los 25 huecos declarados tienen aviso', () => {
  const esperados = ['GAMBLER', 'GOSSIP', 'COURTIER', 'MOONCHILD', 'SNAKE_CHARMER', 'PHILOSOPHER', 'JUGGLER',
    'KLUTZ', 'CERENOVUS', 'PIT_HAG', 'CANNIBAL', 'CULT_LEADER', 'ENGINEER', 'LYCANTHROPE', 'PREACHER', 'DAMSEL',
    'HATTER', 'SNITCH', 'HARPY', 'MEZEPHELES', 'ORGAN_GRINDER', 'BISHOP', 'BUTCHER', 'VOUDON', 'ZENOMANCER'];
  const faltan = esperados.filter(id => !HINTED_ROLES.has(id));
  eq(faltan.length, 0, 'sin aviso: ' + faltan.join(','));
  eq(esperados.length, 25);
});
t('en montaje y fin de partida no se avisa de nada', () => {
  const g = mk(['GAMBLER', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  eq(computeRoleHints(g).length, 0, 'en role_reveal no debe avisar');
  g.phase = 'game_over';
  eq(computeRoleHints(g).length, 0);
});
t('los avisos llegan SOLO al narrador', () => {
  const g = mk(['GAMBLER', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g); G.startDay(g); G.startNight(g);
  const narr = G.getPublicState(g, 'narr', true, {});
  const jug = G.getPublicState(g, by(g, 'MONK').id, false, {});
  ok((narr.roleHints || []).length > 0, 'el narrador debe verlos');
  eq(jug.roleHints, undefined, 'un jugador no debe verlos nunca');
});

G_('Guía — momento correcto');
t('Tahúr: avisa solo a partir de la noche 2', () => {
  const g = mk(['GAMBLER', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g);
  eq(hintsOf(g, 'GAMBLER').length, 0, 'la 1ª noche no actúa');
  G.startDay(g); G.startNight(g);
  eq(hintsOf(g, 'GAMBLER').length, 1);
  ok(hintsOf(g, 'GAMBLER')[0].text.includes('FALLA'));
});
t('Torpe: solo avisa cuando ya está muerto, y es urgente', () => {
  const g = mk(['KLUTZ', 'MONK', 'NO_DASHII', 'MAYOR', 'SOLDIER', 'EMPATH', 'WITCH'], 'SECTS_AND_VIOLETS');
  G.startNight(g); G.startDay(g);
  eq(hintsOf(g, 'KLUTZ').length, 0, 'vivo: nada que decidir');
  by(g, 'KLUTZ').alive = false;
  const h = hintsOf(g, 'KLUTZ');
  eq(h.length, 1);
  eq(h[0].severity, 'danger');
});
t('Hijo de la Luna: igual, solo al morir', () => {
  const g = mk(['MOONCHILD', 'MONK', 'PUKKA', 'MAYOR', 'SOLDIER', 'EMPATH', 'SAILOR'], 'BAD_MOON_RISING');
  G.startNight(g);
  eq(hintsOf(g, 'MOONCHILD').length, 0);
  by(g, 'MOONCHILD').alive = false;
  eq(hintsOf(g, 'MOONCHILD').length, 1);
});
t('Sombrerero: avisa del reparto del Mal al morir', () => {
  const g = mk(['HATTER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  eq(hintsOf(g, 'HATTER').length, 0);
  by(g, 'HATTER').alive = false;
  ok(hintsOf(g, 'HATTER')[0].text.includes('personajes NUEVOS'));
});
t('Soplón: avisa de los 3 faroles solo en la primera noche', () => {
  const g = mk(['SNITCH', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  eq(hintsOf(g, 'SNITCH').length, 1);
  ok(hintsOf(g, 'SNITCH')[0].text.includes('3 faroles'));
  G.startDay(g); G.startNight(g);
  eq(hintsOf(g, 'SNITCH').length, 0, 'ya no aplica en n2');
});
t('Damisela: aviso a los Esbirros la n1, y aviso de acierto de día', () => {
  const g = mk(['DAMSEL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  ok(hintsOf(g, 'DAMSEL')[0].text.includes('Esbirro'));
  G.startDay(g);
  ok(hintsOf(g, 'DAMSEL').some(h => h.text.includes('ganan los malvados')));
});
t('Mezefeles: palabra secreta la n1, «alguien la dijo» después', () => {
  const g = mk(['MEZEPHELES', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  ok(hintsOf(g, 'MEZEPHELES')[0].text.includes('palabra secreta'));
  G.startDay(g); G.startNight(g);
  ok(hintsOf(g, 'MEZEPHELES')[0].text.includes('se vuelve malvado'));
});
t('Carnicero: avisa de reabrir nominaciones solo tras una ejecución', () => {
  const g = mk(['BUTCHER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g); G.startDay(g);
  eq(hintsOf(g, 'BUTCHER').length, 0, 'sin ejecución todavía');
  g.executedToday = by(g, 'MAYOR').id;
  ok(hintsOf(g, 'BUTCHER')[0].text.includes('OTRA VEZ'));
});
t('Caníbal: el aviso nombra al ejecutado y avisa si era malvado', () => {
  const g = mk(['CANNIBAL', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g); G.startDay(g);
  G.openNominations(g);
  const { nomination } = G.nominate(g, by(g, 'MONK').id, by(g, 'POISONER').id);
  nomination.stage = 'voting';
  for (const id of [...nomination.voteOrder]) { try { G.vote(g, id, nomination.id, true); } catch (e) { /* turno */ } }
  G.resolveVote(g, nomination.id);
  G.executeNominationWinner(g);
  eq(g.lastExecutedRole, 'POISONER');
  G.startNight(g);
  const h = hintsOf(g, 'CANNIBAL')[0];
  ok(h.text.includes('Envenenador'), h.text);
  ok(h.text.includes('MALVADO'), h.text);
});
t('Ingeniero: el aviso desaparece al gastarse el uso', () => {
  const g = mk(['ENGINEER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  eq(hintsOf(g, 'ENGINEER').length, 1);
  by(g, 'ENGINEER').engineerUsed = true;
  eq(hintsOf(g, 'ENGINEER').length, 0);
});
t('el aviso marca cuándo el personaje está borracho o envenenado', () => {
  const g = mk(['PREACHER', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'POISONER']);
  G.startNight(g);
  G.applyNightAction(g, 'POISON', by(g, 'POISONER').id, [by(g, 'PREACHER').id]);
  const h = hintsOf(g, 'PREACHER')[0];
  ok(h.impaired, 'debe marcarse como no funcional');
});
t('cada aviso dice con qué control resolverlo', () => {
  const g = mk(['HARPY', 'MONK', 'KAZALI', 'MAYOR', 'SOLDIER', 'EMPATH', 'ACROBAT']);
  G.startNight(g);
  const h = hintsOf(g, 'HARPY')[0];
  ok(h.needs && h.needs.length > 5, 'falta la pista de control: ' + h.needs);
  ok(h.playerName && h.roleName);
});
t('un guion sin estos personajes no genera ruido', () => {
  const g = mk(['MONK', 'EMPATH', 'IMP', 'MAYOR', 'SOLDIER', 'ACROBAT', 'POISONER'], 'TROUBLE_BREWING');
  G.startNight(g);
  eq(computeRoleHints(g).length, 0, 'TB puro no debe generar avisos');
});

console.log('\n' + '═'.repeat(70));
console.log(`SUITE 3 (guía):  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log('═'.repeat(70));
if (fails.length) { console.log('\nFALLOS:\n'); fails.forEach((f, i) => console.log(` ${i + 1}. ${f}\n`)); }
if (fail > 0) process.exitCode = 1;
