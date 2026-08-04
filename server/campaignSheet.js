// ── Hoja de campaña ──────────────────────────────────────────────────
// Genera, a partir del guion activo, la hoja de personajes que los jugadores
// abren en una pestaña nueva: nombre, arte y habilidad, agrupados por tipo y
// en dos columnas. Funciona igual con campañas oficiales y con guiones
// importados, porque lee el objeto de campaña del servidor (que ya incluye
// los roles homebrew con su `image` y su `ability`).
const { imageFor } = require('./roleImages');

const GROUPS = [
  { type: 'townfolk', rail: 'ALDEANOS',   cls: 'good' },
  { type: 'outsider', rail: 'FORASTEROS', cls: 'good' },
  { type: 'minion',   rail: 'ESBIRROS',   cls: 'evil' },
  { type: 'demon',    rail: 'DEMONIOS',   cls: 'evil' },
];

// Nombre inglés derivado del id. Casi todos salen bien con title-case; los
// que llevan apóstrofo o guion van en la tabla de excepciones.
const EN_OVERRIDES = {
  LIL_MONSTA: "Lil' Monsta", AL_HADIKHIA: 'Al-Hadikhia', NO_DASHII: 'No Dashii',
  PIT_HAG: 'Pit-Hag', DEVILS_ADVOCATE: "Devil's Advocate", HELLS_LIBRARIAN: "Hell's Librarian",
  FANG_GU: 'Fang Gu', LORD_OF_TYPHON: 'Lord of Typhon', DEUS_EX_FIASCO: 'Deus Ex Fiasco',
  GOD_OF_UG: 'God of Ug', SPIRIT_OF_IVORY: 'Spirit of Ivory', TOWN_CRIER: 'Town Crier',
  EVIL_TWIN: 'Evil Twin', VILLAGE_IDIOT: 'Village Idiot', HIGH_PRIESTESS: 'High Priestess',
  BONE_COLLECTOR: 'Bone Collector', PLAGUE_DOCTOR: 'Plague Doctor', ORGAN_GRINDER: 'Organ Grinder',
  POPPY_GROWER: 'Poppy Grower', BOUNTY_HUNTER: 'Bounty Hunter', CULT_LEADER: 'Cult Leader',
  SNAKE_CHARMER: 'Snake Charmer', SCARLET_WOMAN: 'Scarlet Woman', FORTUNE_TELLER: 'Fortune Teller',
  STORM_CATCHER: 'Storm Catcher', NIGHTWATCHMAN: 'Nightwatchman',
};
const LOWER_WORDS = new Set(['of', 'the', 'ex']);
function englishName(id) {
  if (EN_OVERRIDES[id]) return EN_OVERRIDES[id];
  return String(id).toLowerCase().split('_')
    .map((w, i) => (i > 0 && LOWER_WORDS.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Resalta el vocabulario del juego. SIEMPRE después de escapar: si no, un
// texto con `<script>` se colaría por el hueco que dejan los <span>.
const KEYWORDS = [
  [/\b(Demonios?)\b/g, 'kw-demon'],
  [/\b(Esbirros?)\b/g, 'kw-minion'],
  [/\b(Forasteros?)\b/g, 'kw-outsider'],
  [/\b(Aldeanos?)\b/g, 'kw-townfolk'],
  [/\b(malvad[oa]s?|mal[oa]s?)\b/g, 'kw-evil'],
  [/\b(buen[oa]s?)\b/g, 'kw-good'],
];
function highlight(text) {
  let out = escapeHtml(text);
  for (const [re, cls] of KEYWORDS) out = out.replace(re, `<span class="${cls}">$1</span>`);
  return out;
}

function initialBadge(role) {
  const letter = escapeHtml((role.name || '?').trim().charAt(0).toUpperCase());
  return `<span class="art art-initial">${letter}</span>`;
}

function entryHtml(role) {
  const img = imageFor(role);
  const art = img
    ? `<img class="art" src="${escapeHtml(img)}" alt="" loading="lazy">`
    : initialBadge(role);
  const star = role.otherNights && !role.firstNight ? '<sup>*</sup>' : '';
  return `<li class="entry">
      ${art}
      <div class="txt">
        <p class="nm">${escapeHtml(role.name)}${star} <em>(${escapeHtml(englishName(role.id))})</em></p>
        <p class="ab">${highlight(role.ability || '')}</p>
      </div>
    </li>`;
}

function sectionHtml(group, roles) {
  if (!roles.length) return '';
  return `<section class="grp ${group.cls}">
    <div class="rail"><span>${group.rail}</span></div>
    <ul class="cols">${roles.map(entryHtml).join('')}</ul>
  </section>`;
}

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#2b0e12;color:#efe3d4;font-family:Georgia,'Times New Roman',serif;
     -webkit-font-smoothing:antialiased}
.sheet{max-width:1120px;margin:0 auto;padding:28px 18px 40px}
header{text-align:center;padding:14px 0 22px}
h1{margin:0;font-size:clamp(26px,5vw,42px);font-weight:400;letter-spacing:.14em;
   text-transform:uppercase;color:#f6ecdd}
.sub{margin:8px 0 0;font-size:13px;font-style:italic;color:#c2a48f}
.grp{display:grid;grid-template-columns:26px 1fr;gap:12px;border-top:1px solid rgba(226,200,170,.18);
     padding:16px 0}
.rail{display:flex;align-items:center;justify-content:center;
      background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.1));border-radius:4px}
.rail span{writing-mode:vertical-rl;transform:rotate(180deg);font-family:ui-monospace,Menlo,Consolas,monospace;
           font-size:9px;letter-spacing:.3em;color:#c9a24a}
.cols{list-style:none;margin:0;padding:0;column-count:2;column-gap:34px}
@media (max-width:720px){.cols{column-count:1}}
.entry{break-inside:avoid;display:flex;gap:10px;padding:7px 0;align-items:flex-start}
.art{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:0 0 38px;
     background:rgba(0,0,0,.35);border:1px solid rgba(226,200,170,.25)}
.art-initial{display:inline-flex;align-items:center;justify-content:center;
             font-size:17px;color:#c9a24a}
.txt{min-width:0}
.nm{margin:0 0 2px;font-size:15px;font-weight:700;line-height:1.2}
.nm em{font-size:11px;font-weight:400;font-style:italic;color:#b09582}
.ab{margin:0;font-size:12.5px;line-height:1.45;color:#e2d3c2}
.good .nm{color:#7ea6dd}
.evil .nm{color:#e0645a}
.kw-good{color:#7ea6dd}
.kw-evil,.kw-demon,.kw-minion{color:#e0645a}
.kw-outsider{color:#8fb3e0}
.kw-townfolk{color:#8fb3e0}
sup{color:#c9a24a}
footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;
       border-top:1px solid rgba(226,200,170,.18);margin-top:18px;padding-top:12px;
       font-size:10px;color:#a98d79;font-family:ui-monospace,Menlo,Consolas,monospace}
@media print{
  body{background:#2b0e12}
  .sheet{max-width:none;padding:8mm}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

function renderCampaignSheet(campaign) {
  const all = Object.values(campaign.roles || {});
  const sections = GROUPS
    .map(g => sectionHtml(g, all.filter(r => r.type === g.type)))
    .join('');
  const shown = all.filter(r => GROUPS.some(g => g.type === r.type)).length;
  const title = campaign.name_es || campaign.name || 'Guion';
  const author = campaign.author ? ` · ${escapeHtml(campaign.author)}` : '';
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hoja de campaña · ${escapeHtml(title)}</title>
<style>${CSS}</style>
</head><body>
<div class="sheet">
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="sub">${shown} personajes · habilidades según el manual de mecánicas${author}</p>
  </header>
  ${sections || '<p class="sub">Este guion no tiene personajes.</p>'}
  <footer>
    <span>Los Campanarios · ${escapeHtml(campaign.name || '')}</span>
    <span>* No la primera noche</span>
  </footer>
</div>
</body></html>`;
}

module.exports = { renderCampaignSheet, englishName, escapeHtml, highlight };
