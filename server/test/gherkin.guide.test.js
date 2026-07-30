// Suite 5 — Guía · Noche completa: todos los personajes con paso nocturno
// aparecen en la guía del narrador y sus acciones llegan al motor.
// Cubre los roles que faltaban (Señor de Typhon, Hechicero, Xaan, Gnomo,
// Ogro, Duendecillo, Tonto del Pueblo, Violinista, Burócrata, Ladrón,
// Juguetero…) y verifica que ninguna acción de la guía quede sin handler.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'gameLogic'));
const { ALL_ROLES } = require(path.join(ROOT, 'campaigns'));
const { HINTED_ROLES, computeRoleHints } = require(path.join(ROOT, 'narratorHints'));

const WALKTHROUGH = path.join(ROOT, '..', 'client', 'src', 'components', 'NightWalkthrough.jsx');
const src = fs.readFileSync(WALKTHROUGH, 'utf8');

let pass = 0, fail = 0; const fails = []; let group = '';
function G_(n) { group = n; }
function t(n, fn) { try { fn(); pass++; } catch (e) { fail++; fails.push(`[${group}] ${n}\n     → ${e.message}`); } }
function eq(a, b, m) { if (a !== b) throw new Error(`${m || ''} esperado ${JSON.stringify(b)}, obtenido ${JSON.stringify(a)}`); }
function ok(v, m) { if (!v) throw new Error(m || 'falsy'); }

// ── Lectura de la guía del cliente ───────────────────────────────────
function grabOrder(name) {
  const m = src.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`no encuentro ${name}`);
  return [...m[1].matchAll(/'([A-Z_0-9]+)'/g)].map(x => x[1]);
}
const FIRST = grabOrder('GLOBAL_FIRST_NIGHT_ORDER');
const OTHER = grabOrder('GLOBAL_OTHER_NIGHT_ORDER');
const patBody = src.match(/const NIGHT_ROLE_PATTERN = \{([\s\S]*?)\n\};/)[1];
const PATTERNS = {};
for (const m of patBody.matchAll(/^ {2}([A-Z_0-9]+):\s*\{([\s\S]*?)(?=\n {2}[A-Z_0-9]+:\s*\{|$)/gm)) PATTERNS[m[1]] = m[2];
// actionTypes que el motor sabe ejecutar
const gl = fs.readFileSync(path.join(ROOT, 'gameLogic.js'), 'utf8');
const body = gl.slice(gl.indexOf('function applyNightAction'), gl.indexOf('// ── Barbero'));
const HANDLED = new Set([...body.matchAll(/case '([A-Z_0-9]+)'/g)].map(m => m[1]));

G_('Cobertura de la guía');
t('todo personaje que despierta de noche tiene patrón en la guía', () => {
  const missing = Object.entries(ALL_ROLES)
    .filter(([id, r]) => (r.firstNight || r.otherNights) && !PATTERNS[id])
    .map(([id]) => id);
  eq(missing.join(', '), '', 'sin patrón:');
});
t('todo personaje de primera noche está en el orden global de la 1ª noche', () => {
  const missing = Object.entries(ALL_ROLES)
    .filter(([id, r]) => r.firstNight && !FIRST.includes(id)).map(([id]) => id);
  eq(missing.join(', '), '', 'fuera del orden N1:');
});
t('todo personaje de noches siguientes está en el orden global de noches*', () => {
  const missing = Object.entries(ALL_ROLES)
    .filter(([id, r]) => r.otherNights && !OTHER.includes(id)).map(([id]) => id);
  eq(missing.join(', '), '', 'fuera del orden N*:');
});
t('el Señor de Typhon aparece en la guía con su ataque', () => {
  ok(PATTERNS.LORD_OF_TYPHON, 'sin patrón');
  ok(PATTERNS.LORD_OF_TYPHON.includes('LORD_OF_TYPHON_KILL'), 'sin acción de ataque');
  ok(OTHER.includes('LORD_OF_TYPHON'), 'no está en el orden de noches*');
});
t('el Hechicero aparece en la guía con su panel de deseos', () => {
  ok(PATTERNS.WIZARD, 'sin patrón');
  ok(PATTERNS.WIZARD.includes('P_PANEL'), 'no abre el panel completo');
  ok(FIRST.includes('WIZARD') && OTHER.includes('WIZARD'), 'no está en los órdenes de noche');
});
t('ningún id de los órdenes globales es un personaje inexistente', () => {
  const ghosts = [...new Set([...FIRST, ...OTHER])].filter(id => !ALL_ROLES[id]);
  eq(ghosts.join(', '), '', 'ids fantasma:');
});
t('ninguna acción de la guía queda sin handler en el servidor', () => {
  const used = [...patBody.matchAll(/effect(?:Yes|No)?:\s*'([A-Z_0-9]+)'/g)].map(m => m[1]);
  const dead = [...new Set(used)].filter(a => !HANDLED.has(a));
  eq(dead.join(', '), '', 'acciones muertas:');
});
t('los roles nuevos con decisión del narrador tienen aviso en la guía', () => {
  for (const id of ['WIZARD', 'LORD_OF_TYPHON', 'XAAN', 'FIDDLER', 'GNOME', 'OGRE', 'VILLAGE_IDIOT', 'HERMIT', 'TOYMAKER', 'DUCHESS']) {
    ok(HINTED_ROLES.has(id), `${id} sin aviso de narrador`);
  }
});

// ── Motor ────────────────────────────────────────────────────────────
let seq = 0;
function mk(roleList, campaignId = 'CAROUSEL') {
  const g = G.createGame('narr', 'guide-' + (seq++));
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
const BASE = ['MONK', 'MAYOR', 'SOLDIER', 'EMPATH', 'RECLUSE'];

G_('Señor de Typhon');
t('mata al objetivo elegido', () => {
  const g = mk(['LORD_OF_TYPHON', 'POISONER', ...BASE]);
  G.startNight(g); G.startDay(g); G.startNight(g);
  const typhon = by(g, 'LORD_OF_TYPHON'), victim = by(g, 'EMPATH');
  act(g, 'LORD_OF_TYPHON_KILL', typhon.id, [victim.id]);
  eq(victim.alive, false, 'la víctima debe morir');
});
t('no mata si está envenenado', () => {
  const g = mk(['LORD_OF_TYPHON', 'POISONER', ...BASE]);
  G.startNight(g);
  const typhon = by(g, 'LORD_OF_TYPHON'), victim = by(g, 'EMPATH');
  typhon.tokens = [{ instanceId: 'x', type: 'POISONED', label: 'Envenenado', expiry: ['PERMANENT'], manual: true }];
  typhon.poisoned = true;
  act(g, 'LORD_OF_TYPHON_KILL', typhon.id, [victim.id]);
  eq(victim.alive, true, 'envenenado no mata');
});
t('el Soldado sobrevive a su ataque', () => {
  const g = mk(['LORD_OF_TYPHON', 'POISONER', ...BASE]);
  G.startNight(g);
  act(g, 'LORD_OF_TYPHON_KILL', by(g, 'LORD_OF_TYPHON').id, [by(g, 'SOLDIER').id]);
  eq(by(g, 'SOLDIER').alive, true, 'el Soldado es inmune al Demonio');
});

G_('Xaan');
t('envenena a todos los Aldeanos vivos', () => {
  const g = mk(['XAAN', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const xaan = by(g, 'XAAN');
  act(g, 'XAAN_POISON', xaan.id, []);
  const townfolk = g.players.filter(p => p.type === 'townfolk');
  ok(townfolk.length > 0, 'debe haber Aldeanos');
  for (const tf of townfolk) ok(tf.poisoned, `${tf.name} debería estar envenenado`);
  eq(by(g, 'IMP').poisoned, false, 'el Demonio no se envenena');
});
t('el veneno del Xaan se limpia al anochecer', () => {
  const g = mk(['XAAN', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  act(g, 'XAAN_POISON', by(g, 'XAAN').id, []);
  G.startDay(g); G.startNight(g);
  eq(by(g, 'EMPATH').poisoned, false, 'el veneno dura hasta el anochecer');
});

G_('Ogro');
t('copia la alineación del elegido', () => {
  const g = mk(['OGRE', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const ogre = by(g, 'OGRE');
  eq(ogre.alignment, 'good', 'empieza bueno');
  act(g, 'OGRE_ALIGN', ogre.id, [by(g, 'IMP').id]);
  eq(ogre.alignment, 'evil', 'copia la alineación malvada');
});
t('envenenado no copia nada', () => {
  const g = mk(['OGRE', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const ogre = by(g, 'OGRE');
  ogre.tokens = [{ instanceId: 'x', type: 'POISONED', label: 'Envenenado', expiry: ['PERMANENT'], manual: true }];
  ogre.poisoned = true;
  act(g, 'OGRE_ALIGN', ogre.id, [by(g, 'IMP').id]);
  eq(ogre.alignment, 'good', 'borracho o envenenado no cambia de bando');
});

G_('Burócrata y Ladrón');
t('el Burócrata triplica el voto del elegido', () => {
  const g = mk(['BUREAUCRAT', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const target = by(g, 'MAYOR');
  act(g, 'BUREAUCRAT_VOTE', by(g, 'BUREAUCRAT').id, [target.id]);
  eq(target.voteWeight, 3, 'voto triple');
});
t('el Ladrón pone el voto en negativo', () => {
  const g = mk(['THIEF', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const target = by(g, 'MAYOR');
  act(g, 'THIEF_VOTE', by(g, 'THIEF').id, [target.id]);
  eq(target.voteWeight, -1, 'voto negativo');
});
t('el recuento de la nominación usa el peso del voto', () => {
  const g = mk(['BUREAUCRAT', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const boosted = by(g, 'MAYOR');
  act(g, 'BUREAUCRAT_VOTE', by(g, 'BUREAUCRAT').id, [boosted.id]);
  G.startDay(g);
  G.openNominations(g);
  const nominator = by(g, 'SOLDIER'), nominee = by(g, 'RECLUSE');
  const { nomination: nom } = G.nominate(g, nominator.id, nominee.id);
  nom.stage = 'voting'; nom.voteOrder = [];   // el paso de argumentos lo abre el socket
  G.vote(g, boosted.id, nom.id, true);
  const res = G.resolveVote(g, nom.id);
  eq(res.tally, 3, 'un voto triple cuenta como 3');
});
t('el peso vuelve a 1 al anochecer', () => {
  const g = mk(['BUREAUCRAT', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const target = by(g, 'MAYOR');
  act(g, 'BUREAUCRAT_VOTE', by(g, 'BUREAUCRAT').id, [target.id]);
  G.startDay(g); G.startNight(g);
  eq(target.voteWeight, 1, 'la ficha caduca al anochecer');
});

G_('Tonto del Pueblo, Duendecillo, Gnomo');
t('el Tonto del Pueblo recibe la alineación real si está sano', () => {
  const g = mk(['VILLAGE_IDIOT', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const vi = by(g, 'VILLAGE_IDIOT');
  act(g, 'VILLAGE_IDIOT_INFO', vi.id, [by(g, 'IMP').id]);
  ok(vi.nightInfo.includes('MALVADO'), `info inesperada: ${vi.nightInfo}`);
});
t('el Tonto del Pueblo borracho recibe la alineación contraria', () => {
  const g = mk(['VILLAGE_IDIOT', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const vi = by(g, 'VILLAGE_IDIOT');
  vi.tokens = [{ instanceId: 'x', type: 'DRUNK_NIGHT', label: 'Borracho', expiry: ['PERMANENT'], manual: true }];
  vi.poisoned = true;
  act(g, 'VILLAGE_IDIOT_INFO', vi.id, [by(g, 'IMP').id]);
  ok(vi.nightInfo.includes('BUENO'), `info inesperada: ${vi.nightInfo}`);
});
t('el Duendecillo aprende un Aldeano concreto', () => {
  const g = mk(['PIXIE', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const px = by(g, 'PIXIE');
  act(g, 'PIXIE_INFO', px.id, [by(g, 'EMPATH').id]);
  ok(px.nightInfo.includes('Empático') || px.nightInfo.includes('Empática'), `info inesperada: ${px.nightInfo}`);
  eq(px.pixieKnownRole, 'EMPATH');
});
t('el Gnomo marca al jugador que todos conocen', () => {
  const g = mk(['GNOME', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  const gn = by(g, 'GNOME'), known = by(g, 'MAYOR');
  act(g, 'GNOME_KNOWN', gn.id, [known.id]);
  eq(g.gnomeKnownId, known.id);
  ok((known.tokens || []).some(x => x.type === 'GNOME_KNOWN'), 'sin ficha de jugador conocido');
});

G_('Violinista y Juguetero');
t('el Violinista deja el duelo anotado y gasta su uso', () => {
  const g = mk(['FIDDLER', 'POISONER', ...BASE]);
  G.startNight(g);
  const fd = by(g, 'FIDDLER'), rival = by(g, 'MAYOR');
  act(g, 'FIDDLER_DUEL', fd.id, [rival.id]);
  eq(g.fiddlerDuel.rivalId, rival.id);
  eq(fd.fiddlerUsed, true, 'debe gastarse');
});
t('el Violinista no puede repetir el duelo', () => {
  const g = mk(['FIDDLER', 'POISONER', ...BASE]);
  G.startNight(g);
  const fd = by(g, 'FIDDLER');
  act(g, 'FIDDLER_DUEL', fd.id, [by(g, 'MAYOR').id]);
  act(g, 'FIDDLER_DUEL', fd.id, [by(g, 'SOLDIER').id]);
  eq(g.fiddlerDuel.rivalId, by(g, 'MAYOR').id, 'el segundo duelo no debe registrarse');
});
t('el Juguetero puede bloquear el ataque del Demonio', () => {
  const g = mk(['TOYMAKER', 'IMP', ...BASE], 'TROUBLE_BREWING');
  G.startNight(g);
  act(g, 'DEMON_NO_ATTACK', by(g, 'TOYMAKER').id, []);
  eq(g.toymakerSkipUsed, true);
  const victim = by(g, 'EMPATH');
  act(g, 'IMP_KILL', by(g, 'IMP').id, [victim.id]);
  eq(victim.alive, true, 'el Demonio no mata esta noche');
});

G_('Avisos del narrador');
t('el Hechicero avisa cuando tiene un deseo pendiente', () => {
  const g = mk(['WIZARD', 'IMP', ...BASE]);
  G.startNight(g);
  g.wish = { status: 'pending', text: 'quiero ser el Demonio' };
  const hints = computeRoleHints(g).filter(h => h.roleId === 'WIZARD');
  ok(hints.some(h => h.severity === 'warn'), 'debería avisar del deseo pendiente');
});
t('el Xaan avisa en qué noche envenena', () => {
  const g = mk(['XAAN', 'IMP', 'RECLUSE', 'MONK', 'MAYOR', 'SOLDIER', 'EMPATH']);
  G.startNight(g);
  const hints = computeRoleHints(g).filter(h => h.roleId === 'XAAN');
  ok(hints.length > 0, 'sin aviso');
  ok(/noche \d/.test(hints[0].text), `texto inesperado: ${hints[0].text}`);
});

const line = '═'.repeat(70);
console.log(`\n${line}`);
console.log(`SUITE 5 (guía completa):  ${pass} OK   ${fail} FALLOS   (${pass + fail} pruebas)`);
console.log(line);
if (fails.length) { console.log('\n' + fails.join('\n')); process.exitCode = 1; }
