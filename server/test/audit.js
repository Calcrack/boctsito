// ── Auditoría honesta: ¿qué tiene REALMENTE cada uno de los 181 personajes? ──
// Clasifica por el nivel más alto que alcanza:
//   A  motor        el efecto lo aplica el servidor solo
//   B  botón        panel con acción cableada al motor (narrador pulsa → aplica)
//   C  panel        controles/nota, pero el efecto lo aplica el narrador a mano
//   D  aviso        solo la guía le dice al narrador qué hacer
//   E  nada         ni motor, ni panel, ni aviso
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CLIENT = path.join(ROOT, '..', 'client', 'src', 'data', 'abilityPanels.js');

const { ALL_ROLES } = require(path.join(ROOT, 'campaigns'));
const { AUTO_INFO_ROLES, GENERATORS } = require(path.join(ROOT, 'roleInfo'));
const { HINTED_ROLES } = require(path.join(ROOT, 'narratorHints'));

const gl = fs.readFileSync(path.join(ROOT, 'gameLogic.js'), 'utf8');
const ri = fs.readFileSync(path.join(ROOT, 'roleInfo.js'), 'utf8');
const ap = fs.readFileSync(CLIENT, 'utf8');

// actionTypes que el servidor sabe ejecutar (case '...' dentro de applyNightAction)
const HANDLED = new Set();
const body = gl.slice(gl.indexOf('function applyNightAction'), gl.indexOf('// ── Barbero'));
for (const m of body.matchAll(/case '([A-Z_0-9]+)'/g)) HANDLED.add(m[1]);

// panel declarado por personaje
const PANEL = {};
for (const m of ap.matchAll(/^ {2}([A-Z_0-9]+):\s*\{([^\n]*(?:\n(?!\s{2}[A-Z_0-9]+:)[^\n]*)*)/gm)) {
  PANEL[m[1]] = m[2];
}

// referencia real del id en el motor (permite sufijos tipo XXX_KILL)
function inEngine(id) {
  const re = new RegExp("\\b" + id + "(_[A-Z]+)?\\b");
  return re.test(gl);
}

const rows = [];
for (const id of Object.keys(ALL_ROLES)) {
  const def = ALL_ROLES[id];
  const panelSrc = PANEL[id] || null;
  const actionM = panelSrc && panelSrc.match(/action:\s*'([A-Z_0-9]+)'/);
  const altM = panelSrc && panelSrc.match(/altAction:\s*\{\s*action:\s*'([A-Z_0-9]+)'/);
  const wired = !!(actionM && HANDLED.has(actionM[1])) || !!(altM && HANDLED.has(altM[1]));

  // Motor puro: generador de info, reactivo a muertes, o regla propia en gameLogic
  const autoInfo = AUTO_INFO_ROLES.has(id);
  const reactive = new RegExp("\\b" + id + "\\b").test(ri) && !autoInfo;
  // regla escrita a mano en el motor (excluye solo aparecer en listas de faroles)
  const engineRule = inEngine(id) && !/^(WASHERWOMAN|LIBRARIAN|INVESTIGATOR|COOK)$/.test('') && inEngine(id);
  const dataDriven = !!def.misperception || !!(def.setup && Object.keys(def.setup).length) || !!def.info;

  let level, why;
  if (autoInfo || reactive) { level = 'A'; why = autoInfo ? 'info automática' : 'reacciona a muertes'; }
  else if (engineRule && !wired) { level = 'A'; why = 'regla propia en gameLogic'; }
  else if (wired) { level = 'B'; why = 'botón → ' + (actionM ? actionM[1] : altM[1]); }
  else if (dataDriven && (def.misperception || def.setup)) { level = 'A'; why = 'decisión de montaje'; }
  else if (panelSrc) { level = 'C'; why = 'panel sin acción de motor'; }
  else if (HINTED_ROLES.has(id)) { level = 'D'; why = 'solo aviso de la guía'; }
  else { level = 'E'; why = 'sin nada'; }

  if (HINTED_ROLES.has(id) && level === 'C') { why += ' + aviso'; }
  rows.push({ id, name: def.name, type: def.type, level, why, panel: !!panelSrc, hint: HINTED_ROLES.has(id) });
}

const N = rows.length;
const count = l => rows.filter(r => r.level === l).length;
const LABEL = {
  A: 'MOTOR   — el servidor aplica el efecto solo',
  B: 'BOTÓN   — el narrador pulsa y el motor lo aplica',
  C: 'PANEL   — controles y reglas, efecto a mano',
  D: 'AVISO   — solo la guía dice qué hacer',
  E: 'NADA    — sin panel, sin motor, sin aviso',
};

console.log('═'.repeat(76));
console.log(`AUDITORÍA DE LOS ${N} PERSONAJES — ¿está programada su habilidad?`);
console.log('═'.repeat(76));
for (const l of ['A', 'B', 'C', 'D', 'E']) {
  const n = count(l);
  console.log(`  ${l}  ${LABEL[l].padEnd(48)} ${String(n).padStart(3)}  ${(n * 100 / N).toFixed(0)}%`);
}
console.log('');
console.log(`  Habilidad ejecutada por el programa (A+B): ${count('A') + count('B')} / ${N}`);
console.log(`  Requiere que el narrador la aplique (C+D): ${count('C') + count('D')} / ${N}`);
console.log(`  Sin ningún soporte (E)                   : ${count('E')} / ${N}`);

for (const l of ['E', 'D', 'C']) {
  const list = rows.filter(r => r.level === l);
  if (!list.length) continue;
  console.log(`\n── ${l}: ${LABEL[l]} ─────────────────────`);
  for (const r of list) console.log(`  ${r.id.padEnd(18)} ${r.type.padEnd(9)} ${r.name}`);
}

// desglose por tipo
console.log('\n── por tipo de personaje ────────────────────────────────────');
const types = [...new Set(rows.map(r => r.type))];
for (const ty of types) {
  const g = rows.filter(r => r.type === ty);
  const auto = g.filter(r => r.level === 'A' || r.level === 'B').length;
  console.log(`  ${ty.padEnd(10)} ${String(auto).padStart(3)}/${String(g.length).padEnd(3)} con habilidad ejecutada por el programa`);
}
