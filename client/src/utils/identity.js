// ── Identidad real vs. falsa (capa 2: "se cree …") ───────────────────
// Terminología FIJA en toda la app (Addendum 2 §E):
//   "Rol real"        = lo que el jugador ES (sólo lo ve el Narrador).
//   "Identidad falsa" = lo que el jugador CREE ser (Marioneta/Borracho/Lunático).
// Icono universal de identidad falsa: 🎭 (máscara).
import { ROLE_BY_ID } from '../data/roles';

export const MASK = '🎭';

const TYPE_LABEL = { townfolk: 'Aldeano', outsider: 'Forastero', minion: 'Esbirro', demon: 'Demonio' };
export function typeLabel(type) { return TYPE_LABEL[type] || type || ''; }

// Resuelve la identidad de un jugador para vistas del NARRADOR.
// `believedRole` sólo llega al cliente del Narrador (o tras fin de partida);
// el rol real JAMÁS se envía a la vista de un jugador (ver getPublicState).
export function formatIdentity(player) {
  const real = player?.role ? ROLE_BY_ID[player.role] : null;
  const believedDef = player?.believedRole ? ROLE_BY_ID[player.believedRole] : null;
  const hasFalse = !!believedDef && player.believedRole !== player.role;
  return {
    real,
    believed: hasFalse ? believedDef : null,
    hasFalse,
    realName: real?.name || '?',
    realType: real?.type || null,
    realTypeLabel: real ? typeLabel(real.type) : '',
    believedName: hasFalse ? believedDef.name : null,
    believedTypeLabel: hasFalse ? typeLabel(believedDef.type) : null,
    // Texto completo (paneles / revisión), sin truncar:
    // "Real: Marioneta (Esbirro) · Se cree: Enterrador (Aldeano)"
    fullLabel: hasFalse
      ? `Real: ${real?.name || '?'} (${typeLabel(real?.type)}) · Se cree: ${believedDef.name} (${typeLabel(believedDef.type)})`
      : `${real?.name || '?'}${real ? ` (${typeLabel(real.type)})` : ''}`,
    // Tooltip universal:
    tooltip: hasFalse
      ? `Este jugador no conoce su rol real. Cree ser ${believedDef.name} (${typeLabel(believedDef.type)}) y recibe información falsa.`
      : '',
  };
}
