// ── Registro de campañas (servidor) ────────────────────────────────
const { getCampaignLocationNames } = require('../configStore');
const troubleBrewing = require('./troubleBrewing');
const badMoonRising  = require('./badMoonRising');
const sectsViolets   = require('./sectsViolets');
const carousel       = require('./carousel');
const travelers      = require('./travelers');
const { EXTRA_ROLES, EXTRA_SETUP_MODIFIERS } = require('./extras');

const CAMPAIGNS = {
  [troubleBrewing.id]: troubleBrewing,
  [badMoonRising.id]:  badMoonRising,
  [sectsViolets.id]:   sectsViolets,
  [carousel.id]:       carousel,
};

const DEFAULT_CAMPAIGN = troubleBrewing.id;

// Campañas que NO se ofrecen como guion jugable, pero cuyos roles siguen en
// ALL_ROLES para que los guiones personalizados puedan usarlos. The Carousel
// no es una campaña: es la expansión de roles experimentales.
const HIDDEN_CAMPAIGN_IDS = new Set(['CAROUSEL']);

function getCampaign(id) {
  return CAMPAIGNS[id] || CAMPAIGNS[DEFAULT_CAMPAIGN];
}

// Mapa plano de TODOS los roles (ids únicos entre campañas) para lookups ROLES[id].
const ALL_ROLES = {};
for (const c of Object.values(CAMPAIGNS)) {
  for (const [id, role] of Object.entries(c.roles)) {
    if (!ALL_ROLES[id]) ALL_ROLES[id] = role;
  }
}
for (const [id, role] of Object.entries(travelers.roles)) {
  if (!ALL_ROLES[id]) ALL_ROLES[id] = role;
}
// Roles extra: no forman campaña propia, pero deben resolverse en guiones
// personalizados en vez de caer como stub "(Rol desconocido)".
for (const [id, role] of Object.entries(EXTRA_ROLES)) {
  if (!ALL_ROLES[id]) ALL_ROLES[id] = role;
}

// Modificadores de reparto GLOBALES: unión de los de cada campaña más los de
// los roles extra. El asistente de montaje los necesita cuando el Narrador
// reparte un personaje de fuera de la campaña activa (Barón en S&V, Señor de
// Typhon en Trouble Brewing…): sin esto la composición saldría mal contada.
const ALL_OUTSIDER_MODIFIERS = {};
const ALL_MINION_MODIFIERS = {};
function absorbModifiers(campaign) {
  for (const [id, delta] of Object.entries(campaign.outsiderModifiers || {})) {
    if (ALL_OUTSIDER_MODIFIERS[id] == null) ALL_OUTSIDER_MODIFIERS[id] = delta;
  }
  for (const [id, delta] of Object.entries(campaign.minionModifiers || {})) {
    if (ALL_MINION_MODIFIERS[id] == null) ALL_MINION_MODIFIERS[id] = delta;
  }
}
for (const c of Object.values(CAMPAIGNS)) absorbModifiers(c);
for (const [id, mod] of Object.entries(EXTRA_SETUP_MODIFIERS)) {
  if (mod.outsiders != null && ALL_OUTSIDER_MODIFIERS[id] == null) ALL_OUTSIDER_MODIFIERS[id] = mod.outsiders;
  if (mod.minions   != null && ALL_MINION_MODIFIERS[id]   == null) ALL_MINION_MODIFIERS[id]   = mod.minions;
}

// Registro dinámico de campañas personalizadas (mutando los objetos compartidos
// para que getCampaign y ROLES[id] sigan resolviendo en caliente).
function registerCampaign(campaign) {
  if (!campaign || !campaign.id) return;
  CAMPAIGNS[campaign.id] = campaign;
  for (const [id, role] of Object.entries(campaign.roles || {})) {
    if (!ALL_ROLES[id]) ALL_ROLES[id] = role; // no piso roles oficiales globales
  }
  absorbModifiers(campaign);
}

function listCampaigns() {
  return Object.values(CAMPAIGNS)
    .filter(c => c.isCustom || !HIDDEN_CAMPAIGN_IDS.has(c.id))
    .map(c => ({
      id: c.id, name: c.name, isCustom: !!c.isCustom, author: c.author || null,
      locationNames: getCampaignLocationNames(c.id),
    }));
}

module.exports = {
  CAMPAIGNS, DEFAULT_CAMPAIGN, getCampaign, ALL_ROLES, registerCampaign, listCampaigns,
  HIDDEN_CAMPAIGN_IDS,
  EXTRA_ROLES, EXTRA_SETUP_MODIFIERS,
  ALL_OUTSIDER_MODIFIERS, ALL_MINION_MODIFIERS,
};
