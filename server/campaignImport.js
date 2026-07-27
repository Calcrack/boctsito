// ── Importador de campañas (scripts BotC) ──────────────────────────
// Soporta formato (a) lista de IDs + _meta, y (b) definiciones homebrew.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { ALL_ROLES, getCampaign, EXTRA_SETUP_MODIFIERS } = require('./campaigns');

const CUSTOM_PATH           = path.join(__dirname, 'campaigns-custom.json');
const GITHUB_TOKEN          = process.env.GITHUB_TOKEN;
const GITHUB_REPO           = process.env.GITHUB_REPO;
const GITHUB_BRANCH         = process.env.GITHUB_BRANCH || 'rankings-data';
const CAMPAIGNS_GITHUB_PATH = 'server/campaigns-custom.json';

let _sha   = null;
let _cache = null;

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
  // Roles extra cuyo id canónico no coincide letra a letra con el interno.
  lordoftyphon: 'LORD_OF_TYPHON',
  villageidiot: 'VILLAGE_IDIOT',
  spiritofivory: 'SPIRIT_OF_IVORY',
  stormcatcher: 'STORM_CATCHER',
  deusexfiasco: 'DEUS_EX_FIASCO',
  hellslibrarian: 'HELLS_LIBRARIAN',
  godofug: 'GOD_OF_UG',
  bigwig: 'BIG_WIG',
  bishop: 'BISHOP',
  // Sinónimos y traducciones frecuentes.
  slayer: 'SLAYER',
  huntsman: 'HUNTSMAN',
  nightwatchman: 'NIGHTWATCHMAN',
  poppygrower: 'POPPY_GROWER',
  organgrinder: 'ORGAN_GRINDER',
  plaguedoctor: 'PLAGUE_DOCTOR',
  bountyhunter: 'BOUNTY_HUNTER',
  cultleader: 'CULT_LEADER',
  highpriestess: 'HIGH_PRIESTESS',
  lilmonsta: 'LIL_MONSTA',
  alhadikhia: 'AL_HADIKHIA',
  bonecollector: 'BONE_COLLECTOR',
  mezepheles: 'MEZEPHELES',
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
  // ── Roles extra ──────────────────────────────────────────────────
  XAAN:            { first: 2,  other: 2  }, // envenena antes que nadie
  LORD_OF_TYPHON:  { other: 42 },            // ataque de Demonio
  FIDDLER:         { other: 49 },
  WRAITH:          { first: 8,  other: 8  }, // solo observa, con el resto del Mal
  GNOME:           { first: 9  },
  OGRE:            { first: 11 },
  HERMIT:          { first: 26, other: 26 },
  STORM_CATCHER:   { first: 27 },
  BUREAUCRAT:      { first: 84, other: 84 },
  THIEF:           { first: 85, other: 85 },
  PIXIE:           { first: 86 },
  VILLAGE_IDIOT:   { first: 87, other: 87 },
  DUCHESS:         { other: 88 },
  TOYMAKER:        { other: 89 },
  CACKLEJACK:      { other: 91 },
  ZENOMANCER:      { other: 92 },
  // Sin acción nocturna: ALSAAHIR, PRINCESS, GUNSLINGER, GANGSTER,
  // SCAPEGOAT, DOOMSAYER, BEGGAR, BIG_WIG y el resto de fabulados.
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
  // Roles extra que alteran el reparto (Señor de Typhon +1 Esbirro, Ermitaño −1
  // Forastero, Centinela ±1 Forastero…).
  const minionModifiers = {};
  for (const id of ids) {
    const mod = EXTRA_SETUP_MODIFIERS[id];
    if (!mod) continue;
    if (mod.outsiders) outsiderModifiers[id] = mod.outsiders;
    if (mod.minions)   minionModifiers[id]   = mod.minions;
  }
  const setupNotes = [
    ...ids.filter(id => roles[id].setupNote).map(id => `${roles[id].name}: ${roles[id].setupNote}`),
    ...ids.filter(id => EXTRA_SETUP_MODIFIERS[id]?.note).map(id => `${roles[id].name}: ${EXTRA_SETUP_MODIFIERS[id].note}`),
  ];
  // Recordatorios de narración de los roles que la página no automatiza.
  for (const id of ids) {
    if (roles[id].narratorNote) warnings.push(`ℹ ${roles[id].name}: ${roles[id].narratorNote}`);
  }

  return { name, author, roles, firstNightOrder, otherNightOrder, outsiderModifiers, minionModifiers, setupNotes, warnings };
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

// ── Persistencia de campañas personalizadas (GitHub API, igual que rankings) ──
function _fileLoad() {
  try {
    if (!fs.existsSync(CUSTOM_PATH)) return {};
    return JSON.parse(fs.readFileSync(CUSTOM_PATH, 'utf8')) || {};
  } catch { return {}; }
}

function _ghRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'boct-game',
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function _pushCampaigns(data) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
  const apiPath = `/repos/${GITHUB_REPO}/contents/${CAMPAIGNS_GITHUB_PATH}`;
  if (!_sha) {
    const get = await _ghRequest('GET', `${apiPath}?ref=${GITHUB_BRANCH}`, null);
    if (get.status === 200) _sha = get.body.sha;
    else if (get.status !== 404) { console.error('[Campaigns] GET sha falló:', get.status); return; }
  }
  const body = { message: 'chore: update campaigns', content, branch: GITHUB_BRANCH };
  if (_sha) body.sha = _sha;
  const put = await _ghRequest('PUT', apiPath, body);
  if (put.status === 200 || put.status === 201) {
    _sha = put.body.content?.sha;
    console.log(`[Campaigns] Sincronizadas en GitHub (${Object.keys(data).length})`);
  } else if (put.status === 409) {
    _sha = null;
    const get2 = await _ghRequest('GET', `${apiPath}?ref=${GITHUB_BRANCH}`, null);
    if (get2.status === 200) {
      _sha = get2.body.sha;
      const body2 = { ...body, sha: _sha };
      const put2 = await _ghRequest('PUT', apiPath, body2);
      if (put2.status === 200 || put2.status === 201) _sha = put2.body.content?.sha;
      else { console.error('[Campaigns] Push falló (reintento):', put2.status); _sha = null; }
    }
  } else {
    console.error('[Campaigns] Push falló:', put.status, JSON.stringify(put.body).slice(0, 200));
    _sha = null;
  }
}

async function loadCustomCampaigns() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    _cache = _fileLoad();
    return _cache;
  }
  try {
    const res = await _ghRequest('GET', `/repos/${GITHUB_REPO}/contents/${CAMPAIGNS_GITHUB_PATH}?ref=${GITHUB_BRANCH}`, null);
    if (res.status === 200 && res.body.content) {
      _sha = res.body.sha;
      _cache = JSON.parse(Buffer.from(res.body.content, 'base64').toString('utf8'));
      try { fs.writeFileSync(CUSTOM_PATH, JSON.stringify(_cache, null, 2), 'utf8'); } catch {}
      console.log(`[Campaigns] ${Object.keys(_cache).length} campaña(s) cargada(s) desde GitHub`);
      return _cache;
    }
    if (res.status === 404) { _cache = {}; return _cache; }
    console.error('[Campaigns] GitHub GET falló:', res.status);
  } catch (e) { console.error('[Campaigns] GitHub load error:', e.message); }
  _cache = _fileLoad();
  return _cache;
}

async function saveCustomCampaign(campaign) {
  if (_cache === null) _cache = _fileLoad();
  _cache[campaign.id] = campaign;
  try { fs.writeFileSync(CUSTOM_PATH, JSON.stringify(_cache, null, 2), 'utf8'); } catch {}
  _pushCampaigns(_cache).catch(e => console.error('[Campaigns] push error:', e.message));
  return campaign;
}

async function deleteCustomCampaign(id) {
  if (_cache === null) _cache = _fileLoad();
  delete _cache[id];
  try { fs.writeFileSync(CUSTOM_PATH, JSON.stringify(_cache, null, 2), 'utf8'); } catch {}
  _pushCampaigns(_cache).catch(e => console.error('[Campaigns] push error:', e.message));
}

// ── Reparación de campañas guardadas ────────────────────────────────
// Una campaña importada ANTES de que existiera un rol guarda ese rol como
// stub ("(Rol desconocido)", tipo townfolk, id sin guiones bajos). Al añadir
// el rol de verdad hay que re-resolverla, o el stub se queda para siempre.
// Devuelve la campaña reparada, o la misma si no hacía falta tocarla.
function healCampaign(campaign) {
  if (!campaign || !campaign.roles) return campaign;

  const stubIds = Object.keys(campaign.roles).filter(id => {
    const r = campaign.roles[id];
    return r.unknown || /Rol desconocido/i.test(r.ability || '');
  });
  // Además de los stubs, un rol puede haber cambiado de tipo o alineación
  // (Administrador y Shugenja estaban mal como Esbirros).
  const staleIds = Object.keys(campaign.roles).filter(id => {
    const real = ALL_ROLES[id];
    if (!real) return false;
    const r = campaign.roles[id];
    return r.type !== real.type || r.alignment !== real.alignment;
  });
  if (stubIds.length === 0 && staleIds.length === 0) return campaign;

  // Reconstruye desde la lista de ids original: así se recalculan también el
  // orden de noche, los modificadores de reparto y las notas de montaje.
  const roleIds = Object.keys(campaign.roles).map(id => {
    const r = campaign.roles[id];
    // Los stubs guardan el id crudo del guion en `name`.
    return (r.unknown && r.name) ? r.name : id;
  });
  const rebuilt = parseScript(roleIds, campaign.name);

  const healed = stubIds.filter(id => {
    const raw = (campaign.roles[id].name) || id;
    const resolved = resolveId(raw);
    return resolved && ALL_ROLES[resolved];
  });
  if (healed.length) {
    console.log(`[Campaigns] "${campaign.name}": ${healed.length} rol(es) resueltos que antes eran stub`);
  }
  if (staleIds.length) {
    console.log(`[Campaigns] "${campaign.name}": ${staleIds.length} rol(es) actualizados (tipo/alineación)`);
  }

  return {
    ...campaign,
    roles: rebuilt.roles,
    firstNightOrder: rebuilt.firstNightOrder,
    otherNightOrder: rebuilt.otherNightOrder,
    outsiderModifiers: rebuilt.outsiderModifiers,
    minionModifiers: rebuilt.minionModifiers,
    setupNotes: rebuilt.setupNotes,
    warnings: rebuilt.warnings,
    queueFirst: rebuilt.firstNightOrder.filter(x => x !== 'EVIL_INFO' && ALL_ROLES[x]),
    queueOther: rebuilt.otherNightOrder.filter(x => ALL_ROLES[x]),
  };
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
    minionModifiers: parsed.minionModifiers,
    setupNotes: parsed.setupNotes,
    warnings: parsed.warnings,
    queueFirst, queueOther,
    distribution: getCampaign('TROUBLE_BREWING')?.distribution || {},
  };
}

module.exports = { parseScript, buildCampaign, healCampaign, loadCustomCampaigns, saveCustomCampaign, deleteCustomCampaign, resolveId };
