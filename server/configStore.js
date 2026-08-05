// ── Configuración del bot persistente ──────────────────────────────
// Antes TODO estaba hardcodeado en discordBot.js (GUILD_ID, NIGHT_CATEGORY_ID,
// CHANNELS, BOCT_ROLE_ID, narradores). Ahora vive en server/config.json.
// El fichero guarda SOLO los overrides; getConfig() devuelve el valor efectivo
// (defaults + overrides) para no romper nada si el archivo no existe.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const DEFAULTS = {
  guildId: '1462151561575928034',
  nightCategoryId: '1515577274248859648',
  boctRoleId: '1499987378755076218',
  narratorUserIds: ['723204863873384469'],
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
};

let store = null;

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
    resolve();
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
    return true;
  } catch (e) {
    console.error('[Config] save error:', e.message);
    return false;
  }
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

module.exports = { initConfigStore, getConfig, updateConfig, setLocationNames, DEFAULTS };
