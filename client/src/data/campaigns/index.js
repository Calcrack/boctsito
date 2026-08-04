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

// CAMPAIGN_LIST = fuente de roles (incluye Carousel).
// SELECTABLE_CAMPAIGNS = guiones que el Narrador puede elegir. The Carousel no
// es una campaña sino una expansión de roles: sus 56 personajes siguen
// disponibles para guiones personalizados, pero no se ofrece como partida.
export const CAMPAIGN_LIST = [troubleBrewing, badMoonRising, sectsViolets, carousel];
export const HIDDEN_CAMPAIGN_IDS = ['CAROUSEL'];
export const SELECTABLE_CAMPAIGNS = CAMPAIGN_LIST.filter(c => !HIDDEN_CAMPAIGN_IDS.includes(c.id));
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
// Fusiona el rol que manda el servidor (name/type/ability/image, y que SÍ
// conoce los roles homebrew de un guion importado) con el del catálogo local
// (que aporta `img` y `night`). Antes se hacía `ROLE_BY_ID[id]` a secas y los
// personajes de guiones propios desaparecían en silencio de todas las listas.
export function scriptRoles(game) {
  if (!game) return ALL_ROLES;
  const seen = new Set();
  const out = [];
  const push = (srv, id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const local = ROLE_BY_ID[id];
    if (!local && !srv) return;
    out.push({
      ...(local || {}),
      id,
      name:      srv?.name      || local?.name || id,
      type:      srv?.type      || local?.type,
      alignment: srv?.alignment || local?.alignment,
      ability:   srv?.ability   || local?.ability,
      img:       local?.img     || srv?.image || null,
      homebrew:  !!srv?.homebrew,
    });
  };
  for (const r of game.campaignRoles || []) push(r, r.id);
  for (const roleId of Object.values(game.setup?.assignments || {})) push(null, roleId);
  return out.length ? out : ALL_ROLES;
}

// Mapa id → rol del guion en curso (mismo criterio que scriptRoles).
export function scriptRoleById(game) {
  return Object.fromEntries(scriptRoles(game).map(r => [r.id, r]));
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
// `game` es opcional: con él se añaden las fichas de los personajes que el
// catálogo local no conoce (roles extra y guiones importados), leyendo
// `campaignRoles[].reminders` que manda el servidor. Sin esto, un guion propio
// se quedaba con las fichas de Trouble Brewing (el fallback de getCampaign).
export function remindersForRolesInPlay(campaignId, roleIdsInPlay, game = null) {
  const campaign = getCampaign(campaignId);
  const map = campaign.reminders || {};
  const seenRoles = new Set(roleIdsInPlay);
  const out = [];
  const covered = new Set();
  for (const roleId of Object.keys(map)) {
    if (!seenRoles.has(roleId)) continue;
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    covered.add(roleId);
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
  for (const srv of game?.campaignRoles || []) {
    if (!seenRoles.has(srv.id) || covered.has(srv.id)) continue;
    if (!Array.isArray(srv.reminders) || !srv.reminders.length) continue;
    for (const label of srv.reminders) {
      out.push({
        tokenId: slugToken(label),
        roleId: srv.id,
        roleName: srv.name,
        img: ROLE_BY_ID[srv.id]?.img || srv.image || null,
        label,
        duration: 'permanent',
      });
    }
  }
  return out;
}

// "Cortina de humo" → "CORTINA_DE_HUMO". Necesitamos un id estable porque la
// ficha se identifica por (roleId, tokenId) en el servidor.
function slugToken(label) {
  return String(label)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
