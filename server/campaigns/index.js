// ── Registro de campañas (servidor) ────────────────────────────────
const troubleBrewing = require('./troubleBrewing');
const badMoonRising  = require('./badMoonRising');
const sectsViolets   = require('./sectsViolets');
const carousel       = require('./carousel');

const CAMPAIGNS = {
  [troubleBrewing.id]: troubleBrewing,
  [badMoonRising.id]:  badMoonRising,
  [sectsViolets.id]:   sectsViolets,
  [carousel.id]:       carousel,
};

const DEFAULT_CAMPAIGN = troubleBrewing.id;

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

// Registro dinámico de campañas personalizadas (mutando los objetos compartidos
// para que getCampaign y ROLES[id] sigan resolviendo en caliente).
function registerCampaign(campaign) {
  if (!campaign || !campaign.id) return;
  CAMPAIGNS[campaign.id] = campaign;
  for (const [id, role] of Object.entries(campaign.roles || {})) {
    if (!ALL_ROLES[id]) ALL_ROLES[id] = role; // no piso roles oficiales globales
  }
}

function listCampaigns() {
  return Object.values(CAMPAIGNS).map(c => ({ id: c.id, name: c.name, isCustom: !!c.isCustom, author: c.author || null }));
}

module.exports = { CAMPAIGNS, DEFAULT_CAMPAIGN, getCampaign, ALL_ROLES, registerCampaign, listCampaigns };
