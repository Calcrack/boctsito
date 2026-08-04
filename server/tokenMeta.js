// ── Identidad y presentación de las fichas del grimorio ───────────────
// Dos problemas que este módulo resuelve:
//
//  1. DUPLICADOS. Antes las fichas automáticas se identificaban como
//     `TYPE:sourcePlayerId:a` y las manuales como `manual:roleId:tokenId`:
//     dos espacios de nombres que nunca se comparaban entre sí, así que
//     envenenar con el motor y colocar la ficha a mano dejaba DOS fichas
//     idénticas. `tokenKey()` produce una sola clave para ambos caminos.
//
//  2. ILEGIBILIDAD. En el asiento solo había el arte del rol dueño y un
//     `title`. `TOKEN_META` aporta una etiqueta corta y el arte de estado
//     (`client/public/assets/estados/`), que hasta ahora no usaba nadie.

const EST = '/assets/estados/';
// OJO: los ficheros llevan espacios y "a salvo" tiene DOS tras el guion.
const ART = {
  poison: EST + 'estado - envenenado.png',
  safe:   EST + 'estado -  a salvo.png',
  master: EST + 'estado - amo.png',
  smoke:  EST + 'estado - cortina de humo.png',
  dead:   EST + 'estado - muerto hoy.png',
};

// Un `type` puede venir del motor (POISONED, SAFE_TONIGHT…) o de una ficha
// recordatoria de campaña colocada a mano (SAFE, WRONG, POISONED1…).
const TOKEN_META = {
  // Sin habilidad
  POISONED:      { short: 'Veneno',  icon: ART.poison },
  POISONED1:     { short: 'Veneno',  icon: ART.poison },
  POISONED2:     { short: 'Veneno',  icon: ART.poison },
  DRUNK_NIGHT:   { short: 'Ebrio',   icon: ART.poison },
  DRUNK:         { short: 'Ebrio',   icon: ART.poison },
  DRUNK1:        { short: 'Ebrio',   icon: ART.poison },
  DRUNK2:        { short: 'Ebrio',   icon: ART.poison },
  DRUNK3:        { short: 'Ebrio',   icon: ART.poison },
  IS_DRUNK:      { short: 'Borracho', icon: ART.poison },
  NO_ABILITY:    { short: 'Sin hab.', icon: ART.poison },
  HARPY_MADNESS: { short: 'Locura',  icon: ART.poison },
  WITCH_CURSED:  { short: 'Maldito', icon: ART.poison },
  EXORCISED:     { short: 'Exorc.',  icon: ART.poison },

  // Protección
  PROTECTED:     { short: 'A salvo', icon: ART.safe },
  SAFE_TONIGHT:  { short: 'A salvo', icon: ART.safe },
  SAFE:          { short: 'A salvo', icon: ART.safe },
  SAFE1:         { short: 'A salvo', icon: ART.safe },
  SAFE2:         { short: 'A salvo', icon: ART.safe },
  CANT_DIE1:     { short: 'No muere', icon: ART.safe },
  CANT_DIE2:     { short: 'No muere', icon: ART.safe },
  SURVIVES_EXECUTION: { short: 'Sobrevive', icon: ART.safe },

  // Muerte
  DIES:          { short: 'Muere',   icon: ART.dead },
  EXECUTED:      { short: 'Ejecut.', icon: ART.dead },
  EXECUTED_TODAY:{ short: 'Ejecut.', icon: ART.dead },

  // Otros estados con arte propia
  MASTER:        { short: 'Amo',     icon: ART.master },
  RED_HERRING:   { short: 'Humo',    icon: ART.smoke },

  // Sin arte de estado: se cae al arte del rol dueño.
  TOWNSFOLK:       { short: 'Aldeano' },
  OUTSIDER:        { short: 'Forast.' },
  MINION:          { short: 'Esbirro' },
  WRONG:           { short: 'Falso' },
  REGISTERS_EVIL:  { short: 'Registra mal' },
  LIL_MONSTA_KEEPER: { short: 'Canguro' },
  FEARMONGER_MARK: { short: 'Marcado' },
  GNOME_KNOWN:     { short: 'Conocido' },
  BARBER_TONIGHT:  { short: 'Barbero' },
  ALIGNMENT_COPIED:{ short: 'Alin. copiada' },
  ALCHEMIST_ABILITY: { short: 'Alquimista' },
  BOFFIN_ABILITY:  { short: 'Rata lab.' },
  ABILITY_BACK:    { short: 'Hab. vuelve' },
  VOTE_TRIPLE:     { short: 'Voto ×3' },
  VOTE_NEGATIVE:   { short: 'Voto −1' },
  TWIN:            { short: 'Gemelo' },
  EXORCIST_LAST:   { short: 'Anoche' },
};

// Etiqueta corta de respaldo: primera palabra significativa, recortada.
function shortLabel(type, label) {
  const meta = TOKEN_META[type];
  if (meta?.short) return meta.short;
  const txt = String(label || type || '').replace(/\s*\(.*\)\s*$/, '').trim();
  return txt.length <= 9 ? txt : txt.slice(0, 8) + '…';
}

function iconFor(type) {
  const icon = TOKEN_META[type]?.icon;
  return icon ? encodeURI(icon) : null;
}

// Estados de los que un jugador solo puede tener UNO, venga de donde venga.
// Un cadáver se marca "Muere" una sola vez aunque le ataquen el Demonio y el
// Asesino la misma noche; antes salían dos fichas idénticas porque unas rutas
// pasaban `sourcePlayerId` y otras no.
const SINGLETON_TYPES = new Set([
  'DIES', 'EXECUTED_TODAY', 'EXECUTED', 'SURVIVES_EXECUTION', 'ABILITY_BACK',
]);

// Identidad de la ficha. La MISMA ficha colocada por el motor y por el
// narrador a mano produce la misma clave, así que no se duplica.
// `sourcePlayerId` distingue dos Posaderos protegiendo a la vez; su ausencia
// (ficha manual o del narrador) también es un valor estable.
function tokenKey({ type, tokenId, sourceRole, roleId, sourcePlayerId }) {
  if (SINGLETON_TYPES.has(type)) return `${type}@*`;
  const owner = sourceRole || roleId || 'x';
  const sub = tokenId && tokenId !== type ? ':' + tokenId : '';
  return `${type}${sub}@${owner}#${sourcePlayerId || '-'}`;
}

module.exports = { TOKEN_META, tokenKey, shortLabel, iconFor, SINGLETON_TYPES };
