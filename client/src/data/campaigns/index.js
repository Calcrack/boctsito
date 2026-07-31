// ── Registro de campañas (cliente) ─────────────────────────────────
import troubleBrewing from './troubleBrewing';
import badMoonRising from './badMoonRising';
import sectsViolets from './sectsViolets';
import carousel from './carousel';
import { roles as travelerRoles } from './travelers';
import { extraRoles } from './extras';

export const CAMPAIGNS = {
  [troubleBrewing.id]: troubleBrewing,
  [badMoonRising.id]: badMoonRising,
  [sectsViolets.id]: sectsViolets,
  [carousel.id]: carousel,
};

export const CAMPAIGN_LIST = [troubleBrewing, badMoonRising, sectsViolets, carousel];
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
  for (const r of travelerRoles) {
    if (!seen[r.id]) { seen[r.id] = true; out.push(r); }
  }
  // Roles extra: fuera de las campañas base, pero usados en guiones propios.
  for (const r of extraRoles) {
    if (!seen[r.id]) { seen[r.id] = true; out.push(r); }
  }
  return out;
})();

// Personajes del GUION en curso: los de la campaña activa, más los que el
// Narrador haya repartido desde otra campaña en el montaje (esos extras solo
// viajan al Narrador, así que los jugadores ven exactamente el guion).
// Sin partida cargada todavía → catálogo completo, para no dejar la vista vacía.
export function scriptRoles(game) {
  const ids = (game?.campaignRoles || []).map(r => r.id);
  for (const roleId of Object.values(game?.setup?.assignments || {})) {
    if (roleId) ids.push(roleId);
  }
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const r = ROLE_BY_ID[id];
    if (r) out.push(r);
  }
  return out.length ? out : ALL_ROLES;
}

export const ROLE_BY_ID = Object.fromEntries(ALL_ROLES.map(r => [r.id, r]));
export const ROLE_NAMES = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.name]));
export const ROLE_TYPES = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.type]));

// ── Fichas de estado (grimorio del narrador) ───────────────────────
const GENERIC_STATUSES = [
  '🍺 Borracho', '🧪 Envenenado', '🛡 Protegido', '✅ A salvo',
  '☠ Muerto', '👻 Parece muerto', '🌙 No despierta', '🎯 Atacado',
  '⭐ Marcado', '1️⃣ Habilidad usada',
];
const CAMPAIGN_STATUSES = {
  TROUBLE_BREWING: ['🤵 Es el Amo', '🟥 Registra como malvado'],
  BAD_MOON_RISING: ['⚓ Marinero', '🚫 No puede morir (Posadero)', '🤡 No-muerte usada', '🪦 Profesor usado'],
  SECTS_AND_VIOLETS: ['🐍 Encantado', '🤪 Loco', '🧠 Filósofo activo', '🔮 Info falsa (Vortox)'],
  CAROUSEL: ['🎪 Experimentales', '🎭 Rol dual', '⚡ Habilidad activa', '📋 Cambio de rol'],
};

export function statusTokens(id) {
  return [...GENERIC_STATUSES, ...(CAMPAIGN_STATUSES[id] || [])];
}

// ── Fichas recordatorias (reminder tokens) ─────────────────────────
// Devuelve el catálogo de fichas de los roles EN JUEGO, cada una con el
// arte (img) y nombre del rol dueño, listo para colocar sobre un jugador.
export function remindersForRolesInPlay(campaignId, roleIdsInPlay) {
  const campaign = getCampaign(campaignId);
  const map = campaign.reminders || {};
  const seenRoles = new Set(roleIdsInPlay);
  const out = [];
  for (const roleId of Object.keys(map)) {
    if (!seenRoles.has(roleId)) continue;
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    for (const t of map[roleId]) {
      out.push({
        tokenId: t.id,
        roleId,
        roleName: role.name,
        img: role.img,
        label: t.label,
        duration: t.duration || 'permanent',
      });
    }
  }
  return out;
}
