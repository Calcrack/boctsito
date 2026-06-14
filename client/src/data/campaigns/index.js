// ── Registro de campañas (cliente) ─────────────────────────────────
import troubleBrewing from './troubleBrewing';
import badMoonRising from './badMoonRising';
import sectsViolets from './sectsViolets';

export const CAMPAIGNS = {
  [troubleBrewing.id]: troubleBrewing,
  [badMoonRising.id]: badMoonRising,
  [sectsViolets.id]: sectsViolets,
};

export const CAMPAIGN_LIST = [troubleBrewing, badMoonRising, sectsViolets];
export const DEFAULT_CAMPAIGN = troubleBrewing.id;

export function getCampaign(id) {
  return CAMPAIGNS[id] || CAMPAIGNS[DEFAULT_CAMPAIGN];
}

// Roles de una campaña concreta.
export function campaignRoles(id) {
  return getCampaign(id).roles;
}

// Mapa plano de TODOS los roles (para lookups por id en cualquier vista).
export const ALL_ROLES = (() => {
  const seen = {};
  const out = [];
  for (const c of CAMPAIGN_LIST) {
    for (const r of c.roles) {
      if (!seen[r.id]) { seen[r.id] = true; out.push(r); }
    }
  }
  return out;
})();

export const ROLE_BY_ID = Object.fromEntries(ALL_ROLES.map(r => [r.id, r]));
export const ROLE_NAMES = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.name]));
export const ROLE_TYPES = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.type]));
