// ── Configuración del bot persistente ──────────────────────────────
// Antes TODO estaba hardcodeado en discordBot.js (GUILD_ID, NIGHT_CATEGORY_ID,
// CHANNELS, BOCT_ROLE_ID, narradores). Ahora vive en server/config.json.
// El fichero guarda SOLO los overrides; getConfig() devuelve el valor efectivo
// (defaults + overrides) para no romper nada si el archivo no existe.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, 'config.json');

// Persistencia de la config en GitHub (igual que rankings/campañas): Render es
// efímero, así que los overrides se guardan en la branch config-data para que
// sobrevivan a los reinicios. Si no hay credenciales, cae al archivo local.
const GITHUB_TOKEN     = process.env.GITHUB_TOKEN;
const GITHUB_REPO      = process.env.GITHUB_REPO;
const GITHUB_FILE_PATH = process.env.GITHUB_CONFIG_PATH || 'server/config.json';
const GITHUB_BRANCH    = process.env.GITHUB_BRANCH    || 'config-data';

// Contraseña de admin NO se guarda en claro: solo su SHA-256. El valor en
// texto de este hash por defecto es "B0ct-Adm1n-0806!" (cámbialo con el env
// ADMIN_PASSWORD o editando el hash de config.json). Nadie puede leerla del
// repositorio y reutilizarla.
const DEFAULT_ADMIN_PASSWORD_HASH = 'd2a2b755f3843a3c8afbf4b86cdb906d7e8d2d75420c1f2784e9e2ab0845585e';

function hashAdminPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

const DEFAULTS = {
  guildId: '1462151561575928034',
  nightCategoryId: '1515577274248859648',
  boctRoleId: '1499987378755076218',
  narratorUserIds: ['723204863873384469'],
  // Rol de Discord de los narradores: quien lo tenga pasa a ser narrador
  // automáticamente (se sincroniza al cargar los miembros del servidor).
  narratorRoleId: '',
  adminUserIds: [],
  channels: {
    PLAZA: '1467693963610951711',
    MERCADO: '1467694466319257652',
    TABERNA: '1467694502109122765',
    CEMENTERIO: '1467694524137472050',
    BOSQUE: '1467694546665214085',
    CONFESIONARIO: '1499969856160792676',
  },
  locationNames: {
    PLAZA: 'Plaza',
    MERCADO: 'Mercado',
    TABERNA: 'Taberna',
    CEMENTERIO: 'Cementerio',
    BOSQUE: 'Bosque',
    CONFESIONARIO: 'Confesionario',
  },
  // Nombres de los emplazamientos POR CAMPAÑA (sobreescriben locationNames
  // cuando esa campaña está activa). Custom y por defecto: cada campaña lleva
  // su propio nombre. Las 3 por defecto cogen estos valores si no se editan.
  campaignLocationNames: {},
  // Hash SHA-256 de la contraseña de admin (nunca la contraseña en claro).
  adminPasswordHash: DEFAULT_ADMIN_PASSWORD_HASH,
  // Canal de Discord donde el bot publica la imagen del fin de partida.
  gameOverChannelId: '',
};

let store = null;
let _ghSha = null;

function _ghRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'boct-config',
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

async function _pushToGithub(config) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;
  const content = Buffer.from(JSON.stringify(config, null, 2), 'utf8').toString('base64');
  const apiPath = `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  if (!_ghSha) {
    const get = await _ghRequest('GET', `${apiPath}?ref=${GITHUB_BRANCH}`, null);
    if (get.status === 200) _ghSha = get.body.sha;
    else if (get.status !== 404) { console.error('[Config] GET sha falló:', get.status); return; }
  }
  const body = { message: 'chore: update config', content, branch: GITHUB_BRANCH };
  if (_ghSha) body.sha = _ghSha;
  const put = await _ghRequest('PUT', apiPath, body);
  if (put.status === 200 || put.status === 201) {
    _ghSha = put.body.content?.sha;
    console.log('[Config] Sincronizado en GitHub');
  } else if (put.status === 409) {
    _ghSha = null;
    const get2 = await _ghRequest('GET', `${apiPath}?ref=${GITHUB_BRANCH}`, null);
    if (get2.status === 200) {
      _ghSha = get2.body.sha;
      const body2 = { ...body, sha: _ghSha };
      const put2 = await _ghRequest('PUT', apiPath, body2);
      if (put2.status === 200 || put2.status === 201) _ghSha = put2.body.content?.sha;
      else { console.error('[Config] Push falló (reintento):', put2.status); _ghSha = null; }
    }
  } else {
    console.error('[Config] Push falló:', put.status, JSON.stringify(put.body).slice(0, 200));
    _ghSha = null;
  }
}

// Load config from GitHub (branch config-data); falls back to local file.
function _loadFromGithub() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return false;
  return _ghRequest('GET', `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`, null)
    .then(res => {
      if (res.status === 200 && res.body.content) {
        _ghSha = res.body.sha;
        const remote = JSON.parse(Buffer.from(res.body.content, 'base64').toString('utf8'));
        store = { ...(remote && typeof remote === 'object' ? remote : {}), overrides: (remote?.overrides && typeof remote.overrides === 'object') ? remote.overrides : {} };
        try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), 'utf8'); } catch {}
        console.log('[Config] Cargado desde GitHub');
        return true;
      }
      if (res.status === 404) console.log('[Config] No hay config remota, empezando de cero');
      return false;
    })
    .catch(() => false);
}

function initConfigStore() {
  return new Promise((resolve) => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        store = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      }
    } catch (e) {
      console.error('[Config] init error:', e.message);
    }
    if (!store || typeof store !== 'object') store = {};
    if (!store.overrides || typeof store.overrides !== 'object') store.overrides = {};
    // GitHub gana sobre el archivo local (rebuilds efímeros del servidor).
    _loadFromGithub().then(() => resolve());
  });
}

function getConfig() {
  const merged = { ...DEFAULTS };
  const o = (store && store.overrides) || {};
  for (const key of Object.keys(o)) {
    const v = o[key];
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v) && key in DEFAULTS) {
      merged[key] = { ...(DEFAULTS[key] || {}), ...v };
    } else {
      merged[key] = v;
    }
  }
  return merged;
}

function persist() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('[Config] save error:', e.message);
    return false;
  }
  // Sincroniza en GitHub (forma podada: solo overrides + metadatos relevantes).
  _pushToGithub({
    overrides: store.overrides || {},
    updatedAt: store.updatedAt || null,
    updatedBy: store.updatedBy || null,
  }).catch(e => console.error('[Config] GitHub push error:', e.message));
  return true;
}

// Aplica un patch parcial sobre la config. `actor` = id del usuario admin que
// realizó el cambio (auditoría básica: quién y cuándo).
function updateConfig(patch, actor) {
  const o = store.overrides;
  for (const key of Object.keys(patch || {})) {
    const v = patch[key];
    if (v === null || v === undefined) continue;
    if (typeof v === 'object' && !Array.isArray(v) && typeof o[key] === 'object' && o[key] !== null) {
      o[key] = { ...o[key], ...v };
    } else {
      o[key] = v;
    }
  }
  store.updatedAt = Date.now();
  store.updatedBy = actor || null;
  persist();
  return getConfig();
}

// Nombres visibles de los emplazamientos (punto 2): solo se guardan los que
// vienen escritos; los vacíos se ignoran y quedan con el default.
function setLocationNames(names, actor) {
  const clean = {};
  for (const key of Object.keys(DEFAULTS.locationNames)) {
    const v = (names || {})[key];
    if (typeof v === 'string' && v.trim()) clean[key] = v.trim().slice(0, 40);
  }
  return updateConfig({ locationNames: clean }, actor);
}

// Nombres de los emplazamientos de UNA campaña concreta: base = los del
// default de config (Plaza, Mercado, Taberna…) + overrides de esa campaña.
function getCampaignLocationNames(campaignId) {
  const over = (store?.overrides?.campaignLocationNames || {})[campaignId] || {};
  return { ...DEFAULTS.locationNames, ...over };
}

function setCampaignLocationNames(campaignId, names, actor) {
  const clean = {};
  for (const key of Object.keys(DEFAULTS.locationNames)) {
    const v = (names || {})[key];
    if (typeof v === 'string' && v.trim()) clean[key] = v.trim().slice(0, 40);
  }
  const o = store.overrides;
  if (!o.campaignLocationNames || typeof o.campaignLocationNames !== 'object') o.campaignLocationNames = {};
  o.campaignLocationNames[campaignId] = { ...(o.campaignLocationNames[campaignId] || {}), ...clean };
  store.updatedAt = Date.now();
  store.updatedBy = actor || null;
  persist();
  return getCampaignLocationNames(campaignId);
}

// ── Contraseña de admin ────────────────────────────────────────────
// Solo se almacena el hash SHA-256 (nunca el valor en claro). El env
// ADMIN_PASSWORD tiene prioridad: permite cambiar la contraseña sin tocar
// config.json. Sin env, se compara contra el hash persistido.
function verifyAdminPassword(pw) {
  if (process.env.ADMIN_PASSWORD) {
    return hashAdminPassword(pw) === hashAdminPassword(process.env.ADMIN_PASSWORD);
  }
  return hashAdminPassword(pw) === ((store?.overrides?.adminPasswordHash) || DEFAULT_ADMIN_PASSWORD_HASH);
}

function setAdminPassword(newPw, actor) {
  if (!newPw || !String(newPw).trim()) return false;
  updateConfig({ adminPasswordHash: hashAdminPassword(String(newPw).trim()) }, actor);
  return true;
}

module.exports = { initConfigStore, getConfig, updateConfig, setLocationNames, getCampaignLocationNames, setCampaignLocationNames, verifyAdminPassword, setAdminPassword, DEFAULTS };
