// ── Importador de campañas (scripts BotC) ──────────────────────────
// Soporta formato (a) lista de IDs + _meta, y (b) definiciones homebrew.
const fs = require('fs');
const path = require('path');
const { ALL_ROLES } = require('./campaigns');

const CUSTOM_PATH = path.join(__dirname, 'campaigns-custom.json');

// Alias: id canónico de botc → nuestro ID interno cuando difieren.
const ID_ALIASES = {
  chef: 'COOK',
  fortuneteller: 'FORTUNE_TELLER',
  scarletwoman: 'SCARLET_WOMAN',
  devilsadvocate: 'DEVILS_ADVOCATE',
  snakecharmer: 'SNAKE_CHARMER',
  eviltwin: 'EVIL_TWIN',
  towncrier: 'TOWN_CRIER',
  pithag: 'PIT_HAG',
  nodashii: 'NO_DASHII',
  fanggu: 'FANG_GU',
  tealady: 'TEA_LADY',
};

// Roles homebrew/experimentales que no están en nuestras campañas base.
// Definidos con corrección mecánica de BotC.
const HOMEBREW = {
  PUZZLEMASTER: {
    id: 'PUZZLEMASTER', name: 'Maestro de Puzzles', alignment: 'good', type: 'townfolk',
    ability: 'Un jugador está borracho, incluso si tú no lo sabes. Si adivinas quién es (de día), sabes el personaje del Demonio, pero tu adivinanza falla una vez.',
    firstNight: false, otherNights: false, reminders: ['Borracho', 'Adivinanza usada'],
  },
  MARIONETTE: {
    id: 'MARIONETTE', name: 'Marioneta', alignment: 'evil', type: 'minion',
    ability: 'Crees que eres un personaje bueno, pero no lo eres. El Demonio sabe quién eres. Estás sentado junto al Demonio.',
    firstNight: false, otherNights: false, reminders: ['Es la Marioneta'],
    setupNote: 'Reemplaza a un Aldeano; siempre vecino del Demonio.',
  },
};

// Orden de noche canónico (subconjunto, IDs internos). Posición = prioridad.
// first: primera noche; other: noches siguientes. 0/undefined = no actúa.
const NIGHT_PRIORITY = {
  POISONER:      { first: 10, other: 10 },
  SNAKE_CHARMER: { first: 12, other: 12 },
  GODFATHER:     { first: 14, other: 55 },
  DEVILS_ADVOCATE:{ first: 16, other: 16 },
  EVIL_TWIN:     { first: 18 },
  WITCH:         { first: 20, other: 20 },
  CERENOVUS:     { first: 22, other: 22 },
  PUKKA:         { first: 24, other: 24 },
  PO:            { other: 26 },
  SAILOR:        { first: 28, other: 28 },
  COURTIER:      { first: 30, other: 30 },
  EXORCIST:      { other: 32 },
  INNKEEPER:     { other: 34 },
  GAMBLER:       { other: 36 },
  MONK:          { other: 38 },
  SCARLET_WOMAN: { other: 40 },
  IMP:           { other: 42 },
  ZOMBUUL:       { other: 41 },
  SHABALOTH:     { other: 43 },
  FANG_GU:       { other: 44 },
  NO_DASHII:     { other: 45 },
  VORTOX:        { other: 46 },
  VIGORMORTIS:   { other: 47 },
  ASSASSIN:      { other: 48 },
  GOSSIP:        { other: 50 },
  WASHERWOMAN:   { first: 60 },
  LIBRARIAN:     { first: 61 },
  INVESTIGATOR:  { first: 62 },
  CHEF: { first: 63 }, COOK: { first: 63 },
  CLOCKMAKER:    { first: 64 },
  DREAMER:       { first: 65, other: 65 },
  EMPATH:        { first: 66, other: 66 },
  FORTUNE_TELLER:{ first: 67, other: 67 },
  UNDERTAKER:    { other: 68 },
  RAVENKEEPER:   { other: 69 },
  GRANDMOTHER:   { first: 70, other: 70 },
  CHAMBERMAID:   { first: 71, other: 71 },
  MATHEMATICIAN: { first: 72, other: 72 },
  FLOWERGIRL:    { other: 73 },
  TOWN_CRIER:    { other: 74 },
  ORACLE:        { other: 75 },
  SEAMSTRESS:    { first: 76, other: 76 },
  PROFESSOR:     { other: 77 },
  SAGE:          { other: 78 },
  BARBER:        { other: 79 },
  SWEETHEART:    { other: 80 },
  MINSTREL:      { other: 81 },
  TEA_LADY:      { other: 82 },
  PHILOSOPHER:   { first: 5, other: 5 },
  PUZZLEMASTER:  {},
  BUTLER:        { first: 90, other: 90 },
  SPY:           { first: 95, other: 95 },
  MAYOR:         {},
};

function normalize(id) {
  return String(id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

// Lookup de nuestros roles por id normalizado.
const NORM_LOOKUP = {};
for (const id of Object.keys(ALL_ROLES)) NORM_LOOKUP[normalize(id)] = id;

function resolveId(rawId) {
  const norm = normalize(rawId);
  if (ID_ALIASES[norm]) return ID_ALIASES[norm];
  if (NORM_LOOKUP[norm]) return NORM_LOOKUP[norm];
  // homebrew por id en MAYÚSCULAS
  const upper = norm.toUpperCase();
  if (HOMEBREW[upper]) return upper;
  return null; // desconocido
}

// Parsea un script (string JSON o array/obj ya parseado).
function parseScript(input, fallbackName = 'Campaña personalizada') {
  let data;
  if (typeof input === 'string') {
    try { data = JSON.parse(input); }
    catch (e) { throw new Error(`JSON inválido: ${e.message}`); }
  } else data = input;

  if (!Array.isArray(data)) {
    if (data && Array.isArray(data.roles)) data = data.roles;
    else throw new Error('El script debe ser una lista de roles (array).');
  }

  const warnings = [];
  let name = fallbackName, author = '';
  const roles = {};

  for (const entry of data) {
    // _meta
    if (entry && entry.id === '_meta') {
      if (entry.name) name = entry.name;
      if (entry.author) author = entry.author;
      continue;
    }

    // Definición completa (homebrew con campos)
    if (entry && typeof entry === 'object' && entry.ability) {
      const id = (entry.id || normalize(entry.name)).toUpperCase().replace(/[^A-Z0-9]/g, '_');
      roles[id] = {
        id, name: entry.name || id,
        alignment: ['minion', 'demon'].includes(entry.team) ? 'evil' : 'good',
        type: mapTeam(entry.team),
        ability: entry.ability,
        firstNight: !!entry.firstNight, otherNights: !!entry.otherNight,
        reminders: entry.reminders || [],
        image: entry.image || null,
        _firstPos: entry.firstNight || 0, _otherPos: entry.otherNight || 0,
        homebrew: true,
      };
      continue;
    }

    // Lista simple: string id u { id }
    const rawId = typeof entry === 'string' ? entry : entry?.id;
    if (!rawId) continue;
    const resolved = resolveId(rawId);
    if (resolved && ALL_ROLES[resolved]) {
      roles[resolved] = { ...ALL_ROLES[resolved] };
    } else if (resolved && HOMEBREW[resolved]) {
      roles[resolved] = { ...HOMEBREW[resolved], homebrew: true };
      warnings.push(`Rol homebrew "${rawId}" → ${HOMEBREW[resolved].name} (revisa sus fichas a mano).`);
    } else {
      // Desconocido total: stub + aviso. No inventamos habilidad.
      const id = rawId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      roles[id] = {
        id, name: rawId, alignment: 'good', type: 'townfolk',
        ability: '(Rol desconocido — define su habilidad y fichas a mano)',
        firstNight: false, otherNights: false, reminders: [], homebrew: true, unknown: true,
      };
      warnings.push(`⚠ Rol desconocido "${rawId}": añadido como stub. Gestiónalo manualmente.`);
    }
  }

  // Orden de noche
  const ids = Object.keys(roles);
  const firstNightOrder = orderNight(ids, roles, 'first');
  const otherNightOrder = orderNight(ids, roles, 'other');

  // Modificadores de setup (Barón +2 forasteros, etc.)
  const outsiderModifiers = {};
  if (roles.BARON) outsiderModifiers.BARON = 2;
  if (roles.GODFATHER) outsiderModifiers.GODFATHER = 0; // ejemplo, no altera base
  const setupNotes = ids.filter(id => roles[id].setupNote).map(id => `${roles[id].name}: ${roles[id].setupNote}`);

  return { name, author, roles, firstNightOrder, otherNightOrder, outsiderModifiers, setupNotes, warnings };
}

function mapTeam(team) {
  switch (team) {
    case 'outsider': return 'outsider';
    case 'minion':   return 'minion';
    case 'demon':    return 'demon';
    case 'traveler': return 'traveler';
    case 'fabled':   return 'fabled';
    default:         return 'townfolk';
  }
}

function orderNight(ids, roles, phase) {
  const key = phase === 'first' ? 'first' : 'other';
  const acts = ids.filter(id => {
    const r = roles[id];
    if (r.homebrew && (r._firstPos || r._otherPos)) return phase === 'first' ? r._firstPos > 0 : r._otherPos > 0;
    const pr = NIGHT_PRIORITY[id];
    if (pr && pr[key] != null) return true;
    return phase === 'first' ? r.firstNight : r.otherNights;
  });
  acts.sort((a, b) => priorityOf(a, roles, key) - priorityOf(b, roles, key));
  // Marcador de info malvada al principio de la primera noche.
  if (phase === 'first') return ['EVIL_INFO', ...acts];
  return acts;
}

function priorityOf(id, roles, key) {
  const r = roles[id];
  if (r.homebrew) {
    const pos = key === 'first' ? r._firstPos : r._otherPos;
    if (pos) return pos;
  }
  const pr = NIGHT_PRIORITY[id];
  if (pr && pr[key] != null) return pr[key];
  return 999;
}

// ── Persistencia de campañas personalizadas ────────────────────────
function loadCustomCampaigns() {
  try {
    if (!fs.existsSync(CUSTOM_PATH)) return {};
    return JSON.parse(fs.readFileSync(CUSTOM_PATH, 'utf8')) || {};
  } catch { return {}; }
}

function saveCustomCampaign(campaign) {
  const all = loadCustomCampaigns();
  all[campaign.id] = campaign;
  fs.writeFileSync(CUSTOM_PATH, JSON.stringify(all, null, 2), 'utf8');
  return campaign;
}

function deleteCustomCampaign(id) {
  const all = loadCustomCampaigns();
  delete all[id];
  fs.writeFileSync(CUSTOM_PATH, JSON.stringify(all, null, 2), 'utf8');
}

// Construye una campaña lista para el motor a partir de un script.
function buildCampaign(input, fallbackName) {
  const parsed = parseScript(input, fallbackName);
  const id = 'CUSTOM_' + normalize(parsed.name).toUpperCase().slice(0, 24) + '_' + Date.now().toString(36);
  // queueFirst/queueOther: roles interactivos (los que el motor sabe automatizar).
  const queueFirst = parsed.firstNightOrder.filter(x => x !== 'EVIL_INFO' && ALL_ROLES[x]);
  const queueOther = parsed.otherNightOrder.filter(x => ALL_ROLES[x]);
  return {
    id, name: parsed.name, author: parsed.author, isCustom: true,
    roles: parsed.roles,
    firstNightOrder: parsed.firstNightOrder,
    otherNightOrder: parsed.otherNightOrder,
    outsiderModifiers: parsed.outsiderModifiers,
    setupNotes: parsed.setupNotes,
    warnings: parsed.warnings,
    queueFirst, queueOther,
  };
}

module.exports = { parseScript, buildCampaign, loadCustomCampaigns, saveCustomCampaign, deleteCustomCampaign, resolveId };
