// ── Agregador de roles multi-campaña ───────────────────────────────
// ROLES = mapa plano de todos los roles (ids únicos entre campañas) para
// que los lookups ROLES[id] sigan funcionando en gameLogic.js.
const { CAMPAIGNS, DEFAULT_CAMPAIGN, getCampaign, ALL_ROLES } = require('./campaigns');

const ROLES = ALL_ROLES;

// Distribución base de la campaña por defecto (compatibilidad).
const BASE_DISTRIBUTION = getCampaign(DEFAULT_CAMPAIGN).distribution;

function getDistribution(playerCount, selectedRoles, campaignId) {
  const campaign = getCampaign(campaignId);
  const base = campaign.distribution[playerCount] || { townfolk: 3, outsiders: 0, minions: 1, demons: 1 };
  const dist = { ...base };
  const mods = campaign.outsiderModifiers || {};
  for (const [roleId, delta] of Object.entries(mods)) {
    if (selectedRoles.includes(roleId)) {
      dist.outsiders = Math.min(dist.outsiders + delta, playerCount - dist.demons - dist.minions);
      dist.townfolk = playerCount - dist.outsiders - dist.minions - dist.demons;
    }
  }
  return dist;
}

function getRolesByType(type, campaignId) {
  const campaign = getCampaign(campaignId);
  return Object.values(campaign.roles).filter(r => r.type === type);
}

module.exports = {
  ROLES, BASE_DISTRIBUTION, getDistribution, getRolesByType,
  CAMPAIGNS, DEFAULT_CAMPAIGN, getCampaign,
};
