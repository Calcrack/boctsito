// Cruce gherkin.md ↔ implementación → informe de cobertura
const fs = require('fs');
const ROOT = 'C:/Users/Cal/Documents/GitHub/boctsito';
const { ALL_ROLES } = require(ROOT + '/server/campaigns');
const { AUTO_INFO_ROLES } = require(ROOT + '/server/roleInfo');

const md = fs.readFileSync(ROOT + '/gherkin.md', 'utf8').split(/\r?\n/);
const gl = fs.readFileSync(ROOT + '/server/gameLogic.js', 'utf8');
const ri = fs.readFileSync(ROOT + '/server/roleInfo.js', 'utf8');
const su = fs.readFileSync(ROOT + '/server/setup.js', 'utf8');
const ap = fs.readFileSync(ROOT + '/client/src/data/abilityPanels.js', 'utf8');

// nombre (ES) → id
const byName = {};
for (const r of Object.values(ALL_ROLES)) byName[r.name.toLowerCase()] = r.id;

const feats = [];
let cur = null;
for (let i = 0; i < md.length; i++) {
  const m = md[i].match(/^## Feature:\s*(.+?)\s*(?:—\s*(TB|BMR|S&V|Carousel))?\s*$/);
  if (m) {
    const raw = m[1].replace(/\s*—.*$/, '').trim();
    const namePart = raw.replace(/\s*\((Aldeano|Forastero|Esbirro|Demonio|Viajero|Fabricado)\)\s*$/, '').trim();
    const alts = namePart.split('/').map(s => s.trim());
    let id = null;
    for (const a of alts) { if (byName[a.toLowerCase()]) { id = byName[a.toLowerCase()]; break; } }
    cur = { title: m[1], id, tags: {}, line: i + 1 };
    feats.push(cur);
    continue;
  }
  if (!cur) continue;
  const t = md[i].match(/@(auto|panel|narrador|privado|extra)/g);
  if (t) t.forEach(x => cur.tags[x] = (cur.tags[x] || 0) + 1);
}

const roleFeats = feats.filter(f => f.id);
const unmatched = feats.filter(f => !f.id && !/^(Mini-panel|Acciones|Cambiar|Ruleta|Presencia|Registro|Reglas|Sucesión|Terminar|Fases|Nominaciones|Pedir|Resolver|Catálogo|Cola|Orden|Entrada)/.test(f.title));

function impl(id) {
  const re = new RegExp('\\b' + id + '(_[A-Z]+)?\\b', 'g');
  const def = ALL_ROLES[id] || {};
  // Vías data-driven: misperception (Borracho/Marioneta/Lunático) y tags de montaje.
  const dataDriven = (def.misperception ? 1 : 0)
    + (def.setup ? Object.keys(def.setup).length : 0)
    + (def.info ? 1 : 0);
  return {
    engine: (gl.match(re) || []).length,
    info: (AUTO_INFO_ROLES.has(id) ? 1 : 0) + (ri.match(re) || []).length,
    setup: (su.match(re) || []).length + dataDriven,
    panel: (ap.match(re) || []).length,
  };
}

const buckets = { auto: [], panelOnly: [], gap: [] };
for (const f of roleFeats) {
  const i = impl(f.id);
  const needsAuto = (f.tags['@auto'] || 0) > 0;
  const hasEngine = i.engine > 0 || i.info > 0 || i.setup > 0;
  if (needsAuto && !hasEngine) buckets.gap.push({ ...f, ...i });
  else if (needsAuto && hasEngine) buckets.auto.push({ ...f, ...i });
  else buckets.panelOnly.push({ ...f, ...i });
}

const line = (b) => b.map(x => `${x.id.padEnd(18)} ${ALL_ROLES[x.id].type.padEnd(9)} ${x.title}`).join('\n');

console.log('═'.repeat(78));
console.log('COBERTURA POR PERSONAJE (features de rol con escenarios)');
console.log('═'.repeat(78));
console.log(`\nTOTAL features de rol emparejadas: ${roleFeats.length}`);
console.log(`  ✅ @auto implementado en motor : ${buckets.auto.length}`);
console.log(`  🟡 solo panel (según gherkin)  : ${buckets.panelOnly.length}`);
console.log(`  ❌ @auto SIN implementar       : ${buckets.gap.length}`);
console.log('\n── ❌ HUECOS (@auto sin motor) ─────────────────────────────────────');
console.log(line(buckets.gap) || '  (ninguno)');
console.log('\n── 🟡 SOLO PANEL (decisión del narrador, correcto) ────────────────');
console.log(line(buckets.panelOnly) || '  (ninguno)');
console.log('\n── features sin emparejar con un id de rol ────────────────────────');
console.log(unmatched.map(f => '  ' + f.title).join('\n') || '  (ninguna)');
// roles del catálogo sin ninguna presencia
const orphan = Object.keys(ALL_ROLES).filter(id => {
  const i = impl(id);
  return i.engine === 0 && i.info === 0 && i.setup === 0 && i.panel === 0;
});
console.log('\n── roles del catálogo sin panel NI motor ──────────────────────────');
console.log(orphan.map(id => `  ${id} (${ALL_ROLES[id].type})`).join('\n') || '  (ninguno)');
