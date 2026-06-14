// ── Registro de campañas (servidor) ────────────────────────────────
const troubleBrewing = require('./troubleBrewing');
const badMoonRising  = require('./badMoonRising');
const sectsViolets   = require('./sectsViolets');

const CAMPAIGNS = {
  [troubleBrewing.id]: troubleBrewing,
  [badMoonRising.id]:  badMoonRising,
  [sectsViolets.id]:   sectsViolets,
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

module.exports = { CAMPAIGNS, DEFAULT_CAMPAIGN, getCampaign, ALL_ROLES };
