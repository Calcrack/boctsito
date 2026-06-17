import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ROLE_BY_ID, getCampaign } from '../data/roles';
import { typeLabel, MASK } from '../utils/identity';
import StatusChips from './StatusChips';

const INFO_MARKERS = new Set(['EVIL_INFO', 'MINION_INFO', 'DEMON_INFO']);

// Orden global BotC (todas las ediciones combinadas, posiciones oficiales).
// Usado para insertar roles cross-edition en el lugar correcto.
const GLOBAL_FIRST_NIGHT_ORDER = [
  'POPPY_GROWER','MAGICIAN',
  'KAZALI','LEGION','LIL_MONSTA','RIOT','LEVIATHAN',
  'LUNATIC','MARIONETTE','MEZEPHELES','WIDOW','SUMMONER','SHUGENJA','STEWARD',
  'PHILOSOPHER',
  'SAILOR','COURTIER','GODFATHER','DEVILS_ADVOCATE',
  'PUKKA',
  'SNAKE_CHARMER','EVIL_TWIN','WITCH','CERENOVUS',
  'PUZZLEMASTER','ALCHEMIST','AMNESIAC',
  'CLOCKMAKER','DREAMER','SEAMSTRESS','MATHEMATICIAN',
  'WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER',
  'BUTLER','SPY',
  'BOUNTY_HUNTER','KNIGHT','NOBLE','DAMSEL','SNITCH',
  'GRANDMOTHER','CHAMBERMAID',
  'BALLOONIST','GENERAL','HIGH_PRIESTESS','KING',
  'JUGGLER',
];

const GLOBAL_OTHER_NIGHT_ORDER = [
  'POPPY_GROWER',
  'LLEECH','KAZALI','LEGION','LIL_MONSTA','OJO','AL_HADIKHIA',
  'WIDOW','MEZEPHELES','FEARMONGER','HARPY','ORGAN_GRINDER','SUMMONER','YAGGABABBLE',
  'PHILOSOPHER','SAILOR','COURTIER','INNKEEPER','GAMBLER',
  'POISONER','MONK',
  'DEVILS_ADVOCATE','LUNATIC','EXORCIST',
  'SNAKE_CHARMER','WITCH','CERENOVUS','PIT_HAG',
  'ZOMBUUL','PUKKA','SHABALOTH','PO',
  'FANG_GU','NO_DASHII','VORTOX','VIGORMORTIS',
  'SCARLET_WOMAN','IMP','ASSASSIN','GODFATHER',
  'PREACHER','LYCANTHROPE','HUNTSMAN','ENGINEER','ACROBAT',
  'CANNIBAL','RAVENKEEPER',
  'UNDERTAKER','EMPATH','FORTUNE_TELLER','BUTLER',
  'SWEETHEART','SAGE','BARBER','DREAMER',
  'FLOWERGIRL','TOWN_CRIER','ORACLE','SEAMSTRESS','MATHEMATICIAN',
  'GOSSIP','PROFESSOR','MINSTREL','TEA_LADY','PACIFIST','FOOL','MOONCHILD','TINKER',
  'GRANDMOTHER','CHAMBERMAID',
  'SPY',
  'BOUNTY_HUNTER','CULT_LEADER',
  'BALLOONIST','GENERAL','HIGH_PRIESTESS','KING',
];

function buildSteps(game) {
  const campaign    = getCampaign(game.campaignId);
  const isFirstNight = game.nightNumber <= 1;
  const players     = game.players;
  const pendingRaven = players.find(p => p.role === 'RAVENKEEPER' && p.pendingRavenkeeper);

  const campaignOrder = isFirstNight ? campaign.firstNightOrder : campaign.otherNightOrder;
  const globalOrder   = isFirstNight ? GLOBAL_FIRST_NIGHT_ORDER : GLOBAL_OTHER_NIGHT_ORDER;

  // All role IDs carried by players (role + believedRole + drunkAs)
  const playerRoleIds = new Set(
    players.flatMap(p => [p.role, p.believedRole, p.drunkAs].filter(Boolean))
  );

  // Roles already covered by the campaign's own night order
  const campaignSet = new Set(campaignOrder.filter(id => !INFO_MARKERS.has(id)));

  // Supplement: role IDs that players carry, have a pattern, but aren't in campaign order
  const globalPos = new Map(globalOrder.map((id, i) => [id, i]));
  const supplementSorted = [...new Set(
    [...playerRoleIds].filter(id =>
      !campaignSet.has(id) && NIGHT_ROLE_PATTERN[id] && globalPos.has(id)
    )
  )].sort((a, b) => (globalPos.get(a) ?? 9999) - (globalPos.get(b) ?? 9999));

  // Build effective order: campaign order with supplements inserted at global positions
  const effectiveOrder = [...campaignOrder];
  for (const sid of supplementSorted) {
    const spos = globalPos.get(sid) ?? 9999;
    let insertAt = effectiveOrder.length;
    for (let i = 0; i < effectiveOrder.length; i++) {
      const eid = effectiveOrder[i];
      if (INFO_MARKERS.has(eid)) continue;
      if (spos < (globalPos.get(eid) ?? i * 1000)) { insertAt = i; break; }
    }
    effectiveOrder.splice(insertAt, 0, sid);
  }

  // Generate steps
  const steps = [];
  let infoShown = false;
  const rolesInOrder = new Set(effectiveOrder.filter(id => !INFO_MARKERS.has(id)));

  for (const roleId of effectiveOrder) {
    if (INFO_MARKERS.has(roleId)) {
      if (infoShown) continue;
      infoShown = true;
      steps.push({ type: 'info' });
      continue;
    }
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    const isPending = roleId === 'RAVENKEEPER' && !!pendingRaven;
    const actors = players.filter(p =>
      (p.role === roleId ||
       (p.role === 'DRUNK' && p.drunkAs === roleId) ||
       (p.believedRole === roleId && !rolesInOrder.has(p.role))) &&
      (isPending ? true : p.alive)
    );
    for (const actor of actors) steps.push({ type: 'role', role, actor });
  }
  return steps;
}

// ── Patrón de acción del Narrador por rol ───────────────────────────────
const NIGHT_ROLE_PATTERN = {
  // ── TB ──────────────────────────────────────────────────────────────────
  WASHERWOMAN:    { kind: 'P2', targetType: 'townfolk', emoji: '🧺' },
  LIBRARIAN:      { kind: 'P2', targetType: 'outsider', emoji: '📚' },
  INVESTIGATOR:   { kind: 'P2', targetType: 'minion',   emoji: '🔍' },
  COOK:           { kind: 'P1', what: 'evilPairs',      emoji: '🍳', label: 'pareja(s) de vecinos malvados' },
  EMPATH:         { kind: 'P1', what: 'evilNeighbors',  emoji: '💞', label: 'vecino(s) malvado(s) vivos' },
  UNDERTAKER:     { kind: 'P1', what: 'executedRole',   emoji: '⚰️' },
  POISONER:       { kind: 'P3', effect: 'POISONER_ACTION', emoji: '🧪', label: 'Envenenar a', notSelf: false },
  MONK:           { kind: 'P3', effect: 'MONK_PROTECT',    emoji: '🛡️', label: 'Proteger a',  notSelf: true  },
  IMP:            { kind: 'P3', effect: 'IMP_KILL',        emoji: '👹', label: 'Atacar a',    notSelf: false },
  BUTLER:         { kind: 'P3', effect: 'BUTLER_MASTER',   emoji: '🤵', label: 'Amo de',      notSelf: true  },
  FORTUNE_TELLER: { kind: 'P4', emoji: '🔮' },
  SPY:            { kind: 'P_INFO', emoji: '🕵️',
                    note: 'Mostrar el Grimorio completo al Espía esta noche.' },
  SCARLET_WOMAN:  { kind: 'P_INFO', emoji: '💄',
                    note: '¿El Diablillo murió con ≥5 jugadores vivos? Si SÍ → esta jugadora se convierte automáticamente en el nuevo Diablillo.' },
  // ── BMR demons ──────────────────────────────────────────────────────────
  PUKKA:    { kind: 'P3', effect: 'PUKKA_POISON',    emoji: '🕸️', label: 'Envenenar a', notSelf: false,
              note: 'Primero: el envenenado de anoche muere ahora. Luego elige a quién envenenar esta noche.' },
  ZOMBUUL:  { kind: 'P3', effect: 'ZOMBUUL_KILL',    emoji: '🧟', label: 'Atacar a',    notSelf: false,
              note: 'Solo actúa si nadie murió de día. Su 1ª "muerte" lo deja muerto-vivo (sigue activo).' },
  PO:       { kind: 'P_PO', emoji: '💀' },
  SHABALOTH:{ kind: 'P3x2', effect: 'SHABALOTH_KILL', emoji: '👁️',
              note: 'Elige 2 objetivos. Puede revivir a 1 muerto de la noche anterior.' },
  // ── S&V demons ──────────────────────────────────────────────────────────
  FANG_GU:     { kind: 'P3', effect: 'FANG_GU_KILL',    emoji: '🌿', label: 'Atacar a', notSelf: false,
                 note: '1er Forastero que mata → ese Forastero se vuelve Fang Gu (malo); Fang Gu muere.' },
  NO_DASHII:   { kind: 'P3', effect: 'NO_DASHII_KILL',  emoji: '🐲', label: 'Atacar a', notSelf: false,
                 note: 'Sus 2 Aldeanos vecinos vivos están envenenados. Recalcular al morir alguien.' },
  VORTOX:      { kind: 'P3', effect: 'VORTOX_KILL',     emoji: '🌀', label: 'Atacar a', notSelf: false,
                 note: 'Toda info de Aldeanos es FALSA. Sin ejecución hoy → el Mal gana.' },
  VIGORMORTIS: { kind: 'P3', effect: 'VIGORMORTIS_KILL',emoji: '🦴', label: 'Atacar a', notSelf: false,
                 note: 'Esbirros que mata conservan habilidad y envenenan a 1 Aldeano vecino.' },
  // ── Carousel demons ─────────────────────────────────────────────────────
  KAZALI:      { kind: 'P3', effect: 'KAZALI_KILL',      emoji: '👑', label: 'Atacar a',           notSelf: false },
  LLEECH:      { kind: 'P3', effect: 'LLEECH_KILL',      emoji: '🩸', label: 'Atacar a',           notSelf: false,
                 note: 'Muere si su anfitrión (primer jugador elegido) muere envenenado.' },
  OJO:         { kind: 'P3', effect: 'OJO_KILL',         emoji: '👁️', label: 'Elige personaje',    notSelf: false,
                 note: 'Elige un personaje (no jugador): muere quien lo tenga. Si nadie, el Narrador elige.' },
  LEGION:      { kind: 'P3', effect: 'LEGION_KILL',      emoji: '⚔️', label: 'Atacar a',           notSelf: false,
                 note: 'Ejecuciones fallan si solo votaron malignos. Mayoría de jugadores son Legión.' },
  AL_HADIKHIA: { kind: 'P3', effect: 'AL_HADIKHIA_KILL', emoji: '🏛️', label: 'Elige 3 jugadores',  notSelf: false,
                 note: 'Elige 3; cada uno decide silenciosamente (pulgar arriba/abajo) vivir o morir.' },
  // ── BMR aldeanos ─────────────────────────────────────────────────────────
  LUNATIC:         { kind: 'P_INFO', emoji: '🌕',
                     note: 'El Lunático cree ser el Demonio. Despiértalo; deja que "elija" su objetivo. Tú decides quién muere de verdad (o nadie). Dale la misma info que recibiría el Demonio real.' },
  MOONCHILD:       { kind: 'P_MOONCHILD', emoji: '🌙' },
  TINKER:          { kind: 'P_YESNO', emoji: '🔧', label: '¿Muere el Manitas esta noche?',
                     yesLabel: '💀 Muere', noLabel: '✅ Vive esta noche' },
  GRANDMOTHER:     { kind: 'P3',     effect: 'GRANDMOTHER_INFO',          emoji: '👵', label: 'Nieto',               notSelf: true,  firstNightOnly: true },
  SAILOR:          { kind: 'P3',     effect: 'SAILOR_DRUNK',              emoji: '⚓', label: 'Emborrachar a',       notSelf: true,
                     note: 'Tú O el elegido quedáis borrachos (Narrador decide). Pierdes inmunidad si eres tú el borracho.' },
  CHAMBERMAID:     { kind: 'P_CHAMBERMAID', emoji: '🛎️' },
  EXORCIST:        { kind: 'P3',     effect: 'EXORCIST_CHOOSE',           emoji: '✝️', label: 'Elegir a',            notSelf: true,
                     note: 'Si es el Demonio: informarle quién eres + suprimir su ataque. Si no: nada (no dar señal).' },
  INNKEEPER:       { kind: 'P3x2',   effect: 'INNKEEPER_PROTECT',         emoji: '🏨',
                     note: 'Ambos quedan protegidos de toda muerte nocturna. Narrador elige cuál de los 2 queda borracho.' },
  GAMBLER:         { kind: 'P_GAMBLER', emoji: '🎲' },
  GOSSIP:          { kind: 'P_GOSSIP', emoji: '💬' },
  COURTIER:        { kind: 'P_COURTIER', emoji: '🎴' },
  PROFESSOR:       { kind: 'P3',     effect: 'PROFESSOR_REVIVE',          emoji: '🎓', label: 'Revivir a',           notSelf: false,  deadOnly: true,
                     note: 'Solo jugadores muertos. Si es Aldeano: revive. Si no: nada (sin señal). Una sola vez.' },
  MINSTREL:        { kind: 'P_INFO', emoji: '🎻',
                     note: 'Si hoy murió ejecutado un Esbirro + Juglar sano: todos los vivos quedan borrachos hasta el crepúsculo.' },
  TEA_LADY:        { kind: 'P_INFO', emoji: '🍵',
                     note: 'Recalcular vecinos vivos. Si ambos son buenos + Dama sana: no pueden morir (incluye ejecución).' },
  PACIFIST:        { kind: 'P_INFO', emoji: '🕊️',
                     note: 'Al ejecutar un bueno: el Narrador PUEDE decidir que no muera. No es automático.' },
  FOOL:            { kind: 'P_INFO', emoji: '🃏',
                     note: '1ª vez que el Bufón moriría (sano): no muere. Marcar "salvación usada"; después sí puede morir.' },
  // ── BMR esbirros ─────────────────────────────────────────────────────────
  GODFATHER:       { kind: 'P3',     effect: 'GODFATHER_KILL',            emoji: '🎩', label: 'Atacar a',            notSelf: false,
                     note: 'Solo actúa si murió un Forastero de día. Primera noche: ver Forasteros en el paso de info del mal.' },
  DEVILS_ADVOCATE: { kind: 'P3',     effect: 'DEVILS_ADVOCATE_PROTECT',   emoji: '⚖️', label: 'Proteger ejecución a', notSelf: false,
                     note: 'No puede repetir al mismo jugador de anoche. Token "Sobrevive ejecución" hasta el crepúsculo siguiente.' },
  ASSASSIN:        { kind: 'P3',     effect: 'ASSASSIN_KILL',             emoji: '🗡️', label: 'Matar a',             notSelf: false,
                     note: 'Una sola vez. Ignora TODA protección (Soldado, Monje, Posadero…). Marcar "usado".' },
  // ── S&V aldeanos ─────────────────────────────────────────────────────────
  CLOCKMAKER:      { kind: 'P1',     what: 'distance',   emoji: '⏰', label: 'asiento(s) entre el Demonio y su Esbirro más cercano' },
  DREAMER:         { kind: 'P_DREAMER', emoji: '💭' },
  SNAKE_CHARMER:   { kind: 'P3',     effect: 'SNAKE_CHARMER',             emoji: '🐍', label: 'Elegir a',            notSelf: true,
                     note: 'Si es el Demonio: intercambian personaje + alineación. Encantador → Demonio (malo). Demonio → Encantador (envenenado). Si no: nada.' },
  MATHEMATICIAN:   { kind: 'P1',     what: 'abnormal',   emoji: '🧮', label: 'habilidad(es) que funcionaron de forma anormal esta noche' },
  FLOWERGIRL:      { kind: 'P1',     what: 'yesno',      emoji: '🌸', label: '¿Votó el Demonio hoy?' },
  TOWN_CRIER:      { kind: 'P1',     what: 'yesno',      emoji: '📢', label: '¿Nominó algún Esbirro hoy?' },
  ORACLE:          { kind: 'P1',     what: 'deadEvil',   emoji: '🔮', label: 'jugador(es) muerto(s) malvado(s)' },
  SEAMSTRESS:      { kind: 'P4',     emoji: '🧵', sameAlignment: true,
                     note: 'Responde SÍ si son del mismo bando, NO si son de bandos distintos.' },
  PHILOSOPHER:     { kind: 'P_PHILOSOPHER', emoji: '📜' },
  JUGGLER:         { kind: 'P1',     what: 'abnormal',   emoji: '🤹', label: 'acierto(s) en las adivinanzas del día 1' },
  // ── S&V esbirros ─────────────────────────────────────────────────────────
  WITCH:           { kind: 'P3',     effect: 'WITCH_CURSE',               emoji: '🧙‍♀️', label: 'Maldecir a',         notSelf: false,
                     note: 'Si nomina mañana, muere inmediatamente. Con ≤3 vivos: habilidad desactivada.' },
  CERENOVUS:       { kind: 'P_INFO', emoji: '🧠',
                     note: 'Elige jugador + personaje bueno. Mañana debe actuar como ese personaje, so pena de ejecución por el Narrador.' },
  PIT_HAG:         { kind: 'P_INFO', emoji: '🪄',
                     note: 'Noches 2+. Elige jugador + personaje NO en juego → se convierte en él. Puede crear un 2º Demonio.' },
  // ── S&V forasteros con paso nocturno ────────────────────────────────────
  EVIL_TWIN:     { kind: 'P_INFO', emoji: '👯', firstNightOnly: true,
                   note: 'Despertar a la Gemela Malvada y a su contraparte simultáneamente — se reconocen mutuamente.' },
  BARBER:        { kind: 'P_INFO', emoji: '✂️',
                   note: 'Si el Barbero murió hoy o esta noche y el Demonio está sano: el Demonio puede intercambiar los personajes de 2 jugadores esta noche.' },
  // ── Carousel aldeanos ────────────────────────────────────────────────────
  ACROBAT:         { kind: 'P3',     effect: 'ACROBAT_CHECK',             emoji: '🤸', label: 'Elegir a',            notSelf: true,
                     note: 'Si el elegido está borracho/envenenado esta noche: el Acróbata muere.' },
  ALCHEMIST:       { kind: 'P_INFO', emoji: '⚗️',
                     note: 'Tiene la habilidad de un Esbirro (fijada en setup). Actúa según esa habilidad esta noche.' },
  BALLOONIST:      { kind: 'P_INFO', emoji: '🎈',
                     note: 'Mostrar 1 jugador del tipo que corresponda esta noche (rotando: Aldeano/Forastero/Esbirro/Demonio).' },
  BOUNTY_HUNTER:   { kind: 'P3', effect: 'BOUNTY_HUNTER_REVEAL', emoji: '💰', label: 'Revelar malvado a',
                     evilOnly: true,
                     note: 'Primera noche: mostrar 1 jugador malvado. Al morir el revelado: esa noche mostrar otro malvado.' },
  CANNIBAL:        { kind: 'P_INFO', emoji: '🍖',
                     note: 'Tiene la habilidad del último ejecutado bueno. Si era malo: info falsa esta noche.' },
  CULT_LEADER:     { kind: 'P_INFO', emoji: '✨',
                     note: 'Cada noche: adopta la alineación de 1 vecino vivo. Narrador decide cuál vecino.' },
  ENGINEER:        { kind: 'P_INFO', emoji: '⚙️',
                     note: 'Una sola vez. Elige "cambiar Esbirros" o "cambiar Demonio" → aplicar cambio de roles.' },
  GENERAL:         { kind: 'P1', what: 'opinion', emoji: '🎖️', label: '¿Quién va ganando?' },
  HIGH_PRIESTESS:  { kind: 'P3', effect: 'HIGH_PRIESTESS', emoji: '🌙', label: 'Jugador a mostrar', notSelf: false },
  HUNTSMAN:        { kind: 'P3',     effect: 'HUNTSMAN',                  emoji: '🏹', label: 'Elegir a',            notSelf: true,
                     note: 'Una sola vez. Si es la Damisela: se transforma en 1 Aldeano (Narrador elige cuál). Marcar "usado".' },
  KING:            { kind: 'P_INFO', emoji: '♔',
                     note: 'Solo actúa si muertos ≥ vivos. Narrador elige qué personaje vivo mostrar al Rey.' },
  LYCANTHROPE:     { kind: 'P3',     effect: 'LYCANTHROPE_KILL',          emoji: '🐺', label: 'Elegir a',            notSelf: true,
                     note: 'Si es bueno: muere Y se suprime el ataque del Demonio esta noche. Si es malo: nada, Demonio ataca normalmente.' },
  MAGICIAN:        { kind: 'P_INFO', emoji: '🎩',
                     note: 'Pasivo. El Demonio ve al Mago como Esbirro. Los Esbirros ven al Mago como Demonio (ajustado en info del mal).' },
  NIGHTWATCHMAN:   { kind: 'P3',     effect: 'NIGHTWATCHMAN',             emoji: '🔦', label: 'Elegir a',            notSelf: true,
                     note: 'Una sola vez. El elegido se despierta y aprende que eres el Guardián Nocturno. Marcar "usado".' },
  NOBLE:           { kind: 'P_NOBLE', emoji: '🎭', firstNightOnly: true },
  POPPY_GROWER:    { kind: 'P_INFO', emoji: '🌺',
                     note: 'Pasivo. Info mutua del mal suprimida mientras viva. Al morir: activar sesión de info del mal esa misma noche.' },
  PREACHER:        { kind: 'P3',     effect: 'PREACHER',                  emoji: '⛪', label: 'Elegir a',            notSelf: true,
                     note: 'Si es Esbirro: responder SÍ + desactivar su habilidad mientras el Predicador viva.' },
  // ── Carousel forasteros con paso nocturno ────────────────────────────────
  PUZZLEMASTER:    { kind: 'P_INFO', emoji: '🧩',
                     note: 'Un jugador está borracho (fijado en setup). De día, si el Maestro lo adivina y está sano: revelarle al Demonio.' },
  SNITCH:          { kind: 'P_INFO', emoji: '🤫',
                     note: 'Primera noche: además del Demonio, cada Esbirro recibe 3 bluffs propios.' },
  LIL_MONSTA:    { kind: 'P_INFO', emoji: '👶',
                   note: 'Los Esbirros eligen silenciosamente quién porta al Bebé esta noche. Ese Esbirro actúa como Demonio hasta mañana.' },
  RIOT:          { kind: 'P_INFO', emoji: '⚔️',
                   note: 'Recuerda: las nominaciones matan durante el día. La ejecución falla si solo votaron malvados. RIOT puede nominar.' },
  // ── Carousel esbirros ────────────────────────────────────────────────────
  FEARMONGER:      { kind: 'P3',     effect: 'FEARMONGER',                emoji: '😨', label: 'Objetivo del miedo',  notSelf: false,
                     note: 'Si el Fearmonger nomina Y ejecuta a este mismo jugador: el Bien gana.' },
  HARPY:           { kind: 'P3x2',   effect: 'HARPY',                     emoji: '🦅',
                     note: 'Mañana el Jugador 1 "cree que" el Jugador 2 es malvado.' },
  MEZEPHELES:      { kind: 'P_INFO', emoji: '📝',
                     note: 'Primera noche: dar la palabra secreta. El primer bueno que la diga → cambia a malvado (solo la primera vez).' },
  ORGAN_GRINDER:   { kind: 'P_INFO', emoji: '🎠',
                     note: 'Decide si queda borracho esta noche. Recordar: todos los jugadores votan con ojos cerrados mientras viva.' },
  SUMMONER:        { kind: 'P_INFO', emoji: '🌀',
                     note: 'Noche 1: dar 3 bluffs. Noche 3: el Invocador elige 1 jugador + tipo de Demonio → ese jugador pasa a ser el Demonio.' },
  WIDOW:           { kind: 'P3',     effect: 'WIDOW_POISON',              emoji: '🕷️', label: 'Envenenar permanente a', notSelf: false,
                     note: 'Primera noche. Ver Grimorio completo. El elegido queda envenenado permanentemente. Informar a 1 bueno al azar: "hay una Viuda".' },
  YAGGABABBLE:     { kind: 'P_INFO', emoji: '🗣️',
                     note: 'Registrar cuántas veces dijo la frase hoy. Esa noche: hasta N ataques opcionales (uno por repetición).' },
};

function calcEvilNeighbors(game, playerId) {
  const living = game.players.filter(p => p.alive);
  const idx = living.findIndex(p => p.id === playerId);
  if (idx === -1 || living.length <= 1) return 0;
  const n = living.length;
  const left  = living[(idx - 1 + n) % n];
  const right = living[(idx + 1) % n];
  return (left?.alignment === 'evil' ? 1 : 0) + (right?.alignment === 'evil' ? 1 : 0);
}

function calcEvilPairs(game) {
  const living = game.players.filter(p => p.alive);
  const n = living.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (living[i].alignment === 'evil' && living[(i + 1) % n].alignment === 'evil') count++;
  }
  return count;
}

function calcDeadEvil(game) {
  return game.players.filter(p => !p.alive && p.alignment === 'evil').length;
}

function calcMinDistance(game) {
  const living = game.players.filter(p => p.alive);
  const n = living.length;
  const di = living.findIndex(p => p.type === 'demon');
  if (di === -1) return 0;
  const mis = living.map((p, i) => p.type === 'minion' ? i : -1).filter(i => i !== -1);
  if (!mis.length) return 0;
  return Math.min(...mis.map(mi => Math.min(Math.abs(mi - di), n - Math.abs(mi - di))));
}

export default function NightWalkthrough({ onActiveActor, embedded = false }) {
  const { state, send } = useGame();
  const { game } = state;
  const [idx, setIdx] = useState(0);
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => { setIdx(0); }, [game?.nightNumber]);

  const isNight = game && ['first_night', 'night'].includes(game.phase);
  const steps = isNight ? buildSteps(game) : [];
  const total = steps.length;
  const current = Math.min(idx, Math.max(0, total - 1));
  const step = steps[current];

  useEffect(() => {
    if (!onActiveActor) return;
    onActiveActor(step?.type === 'role' ? step.actor.id : null);
    return () => onActiveActor && onActiveActor(null);
  }, [step?.type, step?.actor?.id, onActiveActor]);

  if (!isNight) return null;

  const minions = game.players.filter(p => p.type === 'minion' && ROLE_BY_ID[p.role]?.misperception?.wakesWithEvil !== false);
  const demons  = game.players.filter(p => p.type === 'demon');

  const containerStyle = { width: '100%', display: 'flex', flexDirection: 'column', maxHeight: '70vh', background: 'rgba(8,9,16,0.7)', border: '1px solid var(--gold)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(201,162,74,0.08)', borderBottom: 'var(--hairline)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold-hot)' }}>
          🌙 Guía · Noche {game.nightNumber} — paso {current + 1}/{total}
        </span>
      </div>

      <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {!step ? (
          <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--bone-400)', fontStyle: 'italic', textAlign: 'center' }}>
            No hay roles que actúen esta noche.
          </p>
        ) : step.type === 'info' ? (
          <div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--blood-hi)', marginBottom: 8 }}>Info Esbirros &amp; Demonio</p>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-400)', fontStyle: 'italic', marginBottom: 8 }}>
              Entra a la sala de cada uno y dale su información por voz.
            </p>
            {[...minions, ...demons].map(m => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', flex: 1 }}>
                    {m.name} · {m.type === 'demon' ? '👹 Demonio' : '😈 Esbirro'}
                  </span>
                  {m.discordId && (
                    <button onClick={() => send('MOVE_NARRATOR_TO_ROOM', { playerId: m.id })}
                      className="btn-action primary" style={{ fontSize: 9, padding: '3px 8px' }}>🚪 Ir a su sala</button>
                  )}
                </div>
                {m.nightInfo
                  ? <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--bone-100)', whiteSpace: 'pre-line', margin: 0 }}>{m.nightInfo}</p>
                  : <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-500)', fontStyle: 'italic', margin: 0 }}>Info pendiente.</p>}
              </div>
            ))}
            {game.nightNumber === 1 && <BluffsPanel game={game} send={send} />}
          </div>
        ) : (
          <RoleStepView step={step} game={game} send={send} />
        )}
      </div>

      <div style={{ padding: '8px 16px 10px', borderTop: 'var(--hairline)' }}>
        {step?.type === 'role' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--bone-300)', cursor: 'pointer' }}>
              <input type="checkbox" checked={completed.has(current)} onChange={e => {
                const c = new Set(completed);
                if (e.target.checked) c.add(current); else c.delete(current);
                setCompleted(c);
              }} />
              Desperté
            </label>
            {step.actor.discordId && (
              <button onClick={() => send('MOVE_NARRATOR_TO_ROOM', { playerId: step.actor.id })}
                className="btn-action primary" style={{ fontSize: 11, padding: '4px 10px' }}>🚪 Ir a su habitación</button>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIdx(Math.max(0, current - 1))} disabled={current <= 0}
            className="btn-action" style={{ flex: 1, opacity: current <= 0 ? 0.35 : 1 }}>← Anterior</button>
          <button onClick={() => setIdx(Math.min(total - 1, current + 1))} disabled={current >= total - 1}
            className="btn-action primary" style={{ flex: 1, opacity: current >= total - 1 ? 0.35 : 1 }}>Siguiente →</button>
        </div>
      </div>
    </div>
  );
}

function RoleStepView({ step, game, send }) {
  const { role, actor } = step;
  const trueDef    = ROLE_BY_ID[actor.role] || role;
  const believedDef = actor.believedRole ? ROLE_BY_ID[actor.believedRole] : null;
  const isMisperc  = !!believedDef && actor.believedRole !== actor.role;
  const shown      = isMisperc ? believedDef : role;
  const evil       = shown.alignment === 'evil';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {shown.img && <img src={shown.img} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: evil ? 'var(--blood-hi)' : 'var(--bone-100)' }}>{shown.name}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--bone-300)' }}>
            🗣 {actor.name}{actor.poisoned ? ' · 🧪 envenenado' : ''}{!actor.alive ? ' · ☠' : ''}
          </div>
        </div>
      </div>

      {isMisperc && (
        <div style={{ background: 'rgba(168,58,45,0.14)', border: '1px solid var(--blood-dim)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p className="identity-false" style={{ color: 'var(--blood-hi)', marginBottom: 4 }} title={`${actor.name} no conoce su rol real. Cree ser ${shown.name} y recibe información falsa.`}>
            <span className="mask">{MASK}</span>&nbsp;<strong>Identidad falsa</strong>
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--blood-hi)', margin: 0, lineHeight: 1.5 }}>
            {actor.name} — Real: <strong>{trueDef.name}</strong> ({typeLabel(trueDef.type)}) · Se cree: <strong>{shown.name}</strong> ({typeLabel(shown.type)}). Su habilidad NO funciona — dale información <strong>FALSA</strong>.
          </p>
        </div>
      )}

      {actor.poisoned && !isMisperc && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: '#4ade80', margin: 0, lineHeight: 1.5 }}>
            🧪 <strong>{actor.name} está envenenado</strong>: su habilidad NO funciona — dale información <strong>FALSA</strong>.
          </p>
        </div>
      )}

      <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-300)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>{shown.ability}</p>

      {actor.nightInfo ? (
        <div style={{ background: 'rgba(201,162,74,0.07)', border: 'var(--hairline)', borderRadius: 4, padding: '8px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Para decirle por voz</p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--bone-100)', whiteSpace: 'pre-line', margin: 0 }}>{actor.nightInfo}</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(0,0,0,0.25)', border: 'var(--hairline-bone)', borderRadius: 4, padding: '7px 10px', marginBottom: 10 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-500)', fontStyle: 'italic', margin: 0 }}>
            Sin información previa — decide abajo y confirma.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--bone-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grimorio:</span>
        <StatusChips player={actor} compact />
      </div>

      <NarratorActionPanel actor={actor} role={shown} trueRole={trueDef} game={game} send={send} />
    </div>
  );
}

// ── Dispatcher: elige el panel correcto según el patrón del rol ──────────
function NarratorActionPanel({ actor, role, trueRole, game, send }) {
  const isMisperc = actor.believedRole && actor.believedRole !== actor.role;
  // For misperception (Marionette/Lunatic): show believed role's panel so narrator goes through the motions
  const p = NIGHT_ROLE_PATTERN[isMisperc ? role.id : trueRole.id];
  if (!p) return null;
  const isFirstNight = game.nightNumber === 1;
  if (p.kind === 'P2' && !isFirstNight) return null;
  if ((p.kind === 'P3' || p.kind === 'P3x2') && trueRole.id === 'MONK' && isFirstNight) return null;
  if (p.kind === 'P1' && p.what === 'executedRole' && !game.executedToday) return null;
  if (p.firstNightOnly && !isFirstNight) return null;
  const roleName = role.name;
  switch (p.kind) {
    case 'P2':     return <P2Panel     actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P1':     return <P1Panel     actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P3':     return <P3Panel     actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P3x2':   return <P3x2Panel   actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P4':     return <P4Panel     actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_INFO':        return <P_InfoPanel      actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_DREAMER':    return <DreamerPanel     actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_CHAMBERMAID':return <ChambermaidPanel actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_PO':         return <POPanel          actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_PHILOSOPHER':return <PhilosopherPanel actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_YESNO':      return <YesNoPanel       actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_GAMBLER':    return <GamblerPanel     actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_GOSSIP':     return <GossipPanel      actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_COURTIER':   return <CourtierPanel    actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_MOONCHILD':  return <MoonchildPanel   actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    case 'P_NOBLE':      return <NoblePanel       actor={actor} pattern={p} game={game} send={send} roleName={roleName} />;
    default:             return null;
  }
}

const panelStyle = { marginTop: 10, background: 'rgba(201,162,74,0.06)', border: '1px solid rgba(201,162,74,0.25)', borderRadius: 6, padding: '10px 12px' };
const labelStyle = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', margin: '0 0 8px' };
const selStyle   = { fontSize: 11, background: 'var(--ink-600)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: 'var(--bone-100)', padding: '4px 6px', width: '100%', marginBottom: 4 };
const btnPrimary = { width: '100%', fontSize: 11, padding: '6px 0' };
const poisonNote = <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: '#4ade80', fontStyle: 'italic', margin: '0 0 6px' }}>🧪 Envenenado: elige libremente (info FALSA).</p>;

// P2 — par verdadero + señuelo + personaje (Lavandera, Bibliotecario, Investigador)
function P2Panel({ actor, pattern, game, send, roleName }) {
  const [trueSeat,  setTrueSeat]  = useState('');
  const [decoySeat, setDecoySeat] = useState('');
  const [shownRole, setShownRole] = useState('');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive && p.id !== actor.id);
  const isp    = actor.poisoned;
  const validTrue  = isp ? living : living.filter(p => p.type === pattern.targetType);
  const validDecoy = living.filter(p => p.id !== trueSeat);
  const roleChoices = (game.campaignRoles || []).filter(r => r.type === pattern.targetType);

  const trueName  = game.players.find(p => p.id === trueSeat)?.name;
  const decoyName = game.players.find(p => p.id === decoySeat)?.name;
  const can = trueSeat && decoySeat && trueSeat !== decoySeat && shownRole;
  const info = can ? `${pattern.emoji} ${roleName || ROLE_BY_ID[actor.role]?.name || ''}\nEntre ${trueName} y ${decoyName} hay un/una ${shownRole}.` : null;

  const confirm = () => {
    if (!info) return;
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: info });
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Decidir info (P2)'}</p>
      {isp && poisonNote}
      <select style={selStyle} value={trueSeat} onChange={e => { setTrueSeat(e.target.value); setOk(false); }}>
        <option value="">Jugador VERDADERO{!isp ? ` (${pattern.targetType})` : ''}</option>
        {validTrue.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={decoySeat} onChange={e => { setDecoySeat(e.target.value); setOk(false); }}>
        <option value="">Jugador SEÑUELO</option>
        {validDecoy.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={shownRole} onChange={e => { setShownRole(e.target.value); setOk(false); }}>
        <option value="">Rol a mostrar</option>
        {roleChoices.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
      </select>
      {info && <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-300)', fontStyle: 'italic', margin: '4px 0' }}>{info}</p>}
      <button onClick={confirm} disabled={!can} className="btn-action primary" style={btnPrimary}>✓ Confirmar info</button>
    </div>
  );
}

// P1 — número calculado + override (Empática, Cocinero, Sepulturero, Oráculo, Relojero, Niña de las Flores…)
function P1Panel({ actor, pattern, game, send, roleName }) {
  const [val, setVal] = useState('');
  const [ok,  setOk]  = useState(false);
  const name = roleName || ROLE_BY_ID[actor.role]?.name || '';

  if (pattern.what === 'executedRole') {
    const exec = game.players.find(p => p.id === game.executedToday);
    if (!exec) return null;
    const execRoleName = ROLE_BY_ID[exec.role]?.name || '?';
    const info = `${pattern.emoji} ${name}\nEl ejecutado (${exec.name}) era: ${execRoleName}.`;
    return (
      <div style={panelStyle}>
        <p style={labelStyle}>{ok ? '✓ Confirmado' : name}</p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-100)', margin: '0 0 6px' }}>{info}</p>
        <button onClick={() => { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: info }); setOk(true); }}
          className="btn-action primary" style={btnPrimary}>✓ Confirmar</button>
      </div>
    );
  }

  if (pattern.what === 'opinion') {
    const options = [['good', '✅ Va ganando el Bien'], ['neutral', '⚖ Empate'], ['evil', '🔴 Va ganando el Mal']];
    const label = options.find(([v]) => v === val)?.[1] || '';
    const infoStr = val ? `${pattern.emoji} ${name}\nOpinión: ${label}.` : null;
    return (
      <div style={panelStyle}>
        <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'General — opinión del Narrador'}</p>
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {options.map(([v, lbl]) => (
            <button key={v} className="btn-night" onClick={() => { setVal(v); setOk(false); }}
              style={{ flex: 1, fontSize: 10, padding: '6px 2px', borderColor: val === v ? 'var(--gold)' : undefined, color: val === v ? 'var(--gold-hot)' : undefined }}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => { if (infoStr) { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: infoStr }); setOk(true); } }}
          disabled={!infoStr} className="btn-action primary" style={{ ...btnPrimary, opacity: infoStr ? 1 : 0.4 }}>✓ Confirmar</button>
      </div>
    );
  }

  if (pattern.what === 'yesno') {
    const answer = val === 'yes' ? 'SÍ' : val === 'no' ? 'NO' : null;
    const infoStr = answer ? `${pattern.emoji} ${name}\n${pattern.label} ${answer}.` : null;
    return (
      <div style={panelStyle}>
        <p style={labelStyle}>{ok ? '✓ Info confirmada' : pattern.label}</p>
        {actor.poisoned && poisonNote}
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {[['yes', '✅ SÍ'], ['no', '❌ NO']].map(([v, lbl]) => (
            <button key={v} onClick={() => { setVal(v); setOk(false); }} className="btn-night"
              style={{ flex: 1, fontSize: 13, padding: '6px 0', borderColor: val === v ? 'var(--gold)' : undefined, color: val === v ? 'var(--gold-hot)' : undefined }}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={() => { if (infoStr) { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: infoStr }); setOk(true); } }}
          disabled={!infoStr} className="btn-action primary" style={{ ...btnPrimary, opacity: infoStr ? 1 : 0.4 }}>✓ Confirmar</button>
      </div>
    );
  }

  const autoMap = {
    evilNeighbors: () => calcEvilNeighbors(game, actor.id),
    evilPairs:     () => calcEvilPairs(game),
    deadEvil:      () => calcDeadEvil(game),
    distance:      () => calcMinDistance(game),
    abnormal:      () => null,
  };
  const auto = autoMap[pattern.what]?.() ?? null;
  const maxV = pattern.what === 'evilNeighbors' ? 2
             : pattern.what === 'distance'       ? Math.max(8, game.players.filter(p => p.alive).length - 1)
             : Math.min(6, Math.floor(game.players.length / 2) + 1);
  const infoStr = val !== '' ? `${pattern.emoji} ${name}\nTienes ${val} ${pattern.label}.` : null;

  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Decidir número'}</p>
      {actor.poisoned && poisonNote}
      {!actor.poisoned && auto != null && <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-400)', margin: '0 0 4px' }}>
        Auto: <strong style={{ color: 'var(--good)' }}>{auto}</strong> {pattern.label}
      </p>}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {Array.from({ length: maxV + 1 }, (_, i) => (
          <button key={i} onClick={() => { setVal(String(i)); setOk(false); }} className="btn-night"
            style={{ flex: '1 0 auto', minWidth: 32, fontSize: 14, padding: '5px 0', borderColor: String(i) === val ? 'var(--gold)' : undefined, color: String(i) === val ? 'var(--gold-hot)' : undefined }}>
            {i}
          </button>
        ))}
      </div>
      {!actor.poisoned && val === '' && auto != null && (
        <button onClick={() => setVal(String(auto))} className="btn-night" style={{ width: '100%', fontSize: 10, padding: '4px 0', marginBottom: 4 }}>
          Usar calculado ({auto})
        </button>
      )}
      <button onClick={() => { if (infoStr) { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: infoStr }); setOk(true); } }}
        disabled={!infoStr} className="btn-action primary" style={{ ...btnPrimary, opacity: infoStr ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P3 — elegir 1 jugador (Envenenador, Monje, Mayordomo, Imp, Abuela, y todos los Demonios no-TB)
function P3Panel({ actor, pattern, game, send, roleName }) {
  const [targetId, setTargetId] = useState('');
  const [ok, setOk] = useState(false);

  const pool = pattern.deadOnly
    ? game.players.filter(p => !p.alive)
    : game.players.filter(p =>
        p.alive &&
        (pattern.notSelf ? p.id !== actor.id : true) &&
        (pattern.evilOnly && !actor.poisoned ? p.alignment === 'evil' : true)
      );

  const infoLabels = {
    POISONER_ACTION:          n => `🧪 Envenenador\nEnvenenaste a ${n} esta noche.`,
    MONK_PROTECT:             n => `🛡️ Monje\nProtegiste a ${n} esta noche.`,
    IMP_KILL:                 n => `👹 Diablillo\nAtacaste a ${n} esta noche.`,
    BUTLER_MASTER:            n => `🤵 Mayordomo\nTu Amo esta noche es ${n}.`,
    GRANDMOTHER_INFO:         n => {
      const gp = game.players.find(p => p.id === targetId);
      const rn = ROLE_BY_ID[gp?.role]?.name || '?';
      return `👵 Abuela\nTu nieto es ${n} (${rn}).`;
    },
    SAILOR_DRUNK:             n => `⚓ Marinero\nEmborrachaste a ${n} (o a ti mismo — Narrador decide cuál de los 2).`,
    EXORCIST_CHOOSE:          n => `✝️ Exorcista\nElegiste a ${n} esta noche.`,
    GAMBLER_GUESS:            n => `🎲 Tahúr\nApuesta de ${actor.name} por ${n}.`,
    PROFESSOR_REVIVE:         n => `🎓 Profesor\nIntentó revivir a ${n}.`,
    GODFATHER_KILL:           n => `🎩 Padrino\nAtacó a ${n} esta noche.`,
    DEVILS_ADVOCATE_PROTECT:  n => `⚖️ Abogado del Diablo\nProtegido de ejecución mañana: ${n}.`,
    ASSASSIN_KILL:            n => `🗡️ Asesino\nMató a ${n} (ignorando todas las protecciones).`,
    SNAKE_CHARMER:            n => `🐍 Encantador de Serpientes\nEligió a ${n} esta noche.`,
    WITCH_CURSE:              n => `🧙‍♀️ Bruja\nMaldijo a ${n} (si nomina mañana, muere).`,
    HUNTSMAN:                 n => `🏹 Cazador\nEligió a ${n} esta noche.`,
    LYCANTHROPE_KILL:         n => `🐺 Licántropo\nEligió a ${n} esta noche.`,
    ACROBAT_CHECK:            n => `🤸 Acróbata\nEligió a ${n} esta noche.`,
    FEARMONGER:               n => `😨 Sembrador de Miedo\nObjetivo: ${n}.`,
    WIDOW_POISON:             n => `🕷️ Viuda\nEnvenenó permanentemente a ${n}.`,
    PREACHER:                 n => `⛪ Predicador\nEligió a ${n} esta noche.`,
    NIGHTWATCHMAN:            n => `🔦 Guardián Nocturno\nInformó a ${n} de su identidad.`,
    HIGH_PRIESTESS:           n => `🌙 Alta Sacerdotisa\nJugador a mostrar al Rey esta noche: ${n}.`,
    BOUNTY_HUNTER_REVEAL:     n => `💰 Cazarrecompensas\nRevela a ${n} como jugador malvado.`,
  };

  const confirm = () => {
    if (!targetId) return;
    const tname = game.players.find(p => p.id === targetId)?.name;
    const fallback = n => `${pattern.emoji} ${roleName || ''}\n${pattern.label} ${n} esta noche.`;
    const nightInfo = (infoLabels[pattern.effect] || fallback)(tname);
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, actionType: pattern.effect, targetIds: [targetId], nightInfo });
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Acción aplicada' : pattern.label || roleName}</p>
      {pattern.note && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', margin: '0 0 8px', borderLeft: '2px solid var(--gold)', paddingLeft: 6, lineHeight: 1.4 }}>
          ⚠ {pattern.note}
        </p>
      )}
      <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setOk(false); }}>
        <option value="">{pattern.label || 'Elegir jugador'}…</option>
        {pool.map(p => <option key={p.id} value={p.id}>{p.name}{pattern.deadOnly ? ' ☠' : ''}</option>)}
      </select>
      <button onClick={confirm} disabled={!targetId} className="btn-action primary"
        style={{ ...btnPrimary, opacity: targetId ? 1 : 0.4 }}>{pattern.emoji} Aplicar</button>
    </div>
  );
}

// P3x2 — elegir 2 jugadores (Shabaloth, Innkeeper, Harpy)
function P3x2Panel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive);
  const can = t1 && t2 && t1 !== t2;

  const buildInfo = (n1, n2) => {
    if (pattern.effect === 'INNKEEPER_PROTECT') return `🏨 Posadero\nProtegidos: ${n1} y ${n2}. Decide cuál de los 2 queda borracho.`;
    if (pattern.effect === 'HARPY')             return `🦅 Arpía\nMañana ${n1} cree que ${n2} es malvado.`;
    return `${pattern.emoji} ${roleName}\nAtacaste a ${n1} y ${n2} esta noche.`;
  };

  const confirm = () => {
    if (!can) return;
    const n1 = game.players.find(p => p.id === t1)?.name;
    const n2 = game.players.find(p => p.id === t2)?.name;
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, actionType: pattern.effect, targetIds: [t1, t2], nightInfo: buildInfo(n1, n2) });
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Acción aplicada' : `${roleName} — 2 objetivos`}</p>
      {pattern.note && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', margin: '0 0 8px', borderLeft: '2px solid var(--gold)', paddingLeft: 6, lineHeight: 1.4 }}>
          ⚠ {pattern.note}
        </p>
      )}
      <select style={selStyle} value={t1} onChange={e => { setT1(e.target.value); setOk(false); }}>
        <option value="">Jugador 1…</option>
        {living.filter(p => p.id !== t2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={t2} onChange={e => { setT2(e.target.value); setOk(false); }}>
        <option value="">Jugador 2…</option>
        {living.filter(p => p.id !== t1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button onClick={confirm} disabled={!can} className="btn-action primary"
        style={{ ...btnPrimary, opacity: can ? 1 : 0.4 }}>{pattern.emoji} Aplicar</button>
    </div>
  );
}

// P4 — 2 jugadores + sí/no (Adivina, Costurera)
function P4Panel({ actor, pattern, game, send, roleName }) {
  const isFirstNight = game.nightNumber === 1;
  const isSameAlign = !!pattern.sameAlignment;
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [redHerring, setRedHerring] = useState(game.smokeScreenPlayerId || '');
  const [ok, setOk] = useState(false);

  const living = game.players.filter(p => p.alive && p.id !== actor.id);
  const goodPl = game.players.filter(p => p.alignment === 'good');
  const p1d = game.players.find(p => p.id === p1);
  const p2d = game.players.find(p => p.id === p2);
  const rh  = redHerring || game.smokeScreenPlayerId;

  const result = (p1d && p2d && !actor.poisoned)
    ? isSameAlign
      ? (p1d.alignment === p2d.alignment ? '✅ Misma alineación' : '❌ Distinta alineación')
      : ((p1d.type === 'demon' || p1d.id === rh || p2d.type === 'demon' || p2d.id === rh)
          ? '✅ SÍ hay Demonio' : '❌ NO hay Demonio')
    : null;

  const can = p1 && p2 && p1 !== p2;
  const label = roleName || (isSameAlign ? 'Costurera' : 'Adivina');

  const buildInfo = () => {
    const n1 = p1d?.name, n2 = p2d?.name;
    const res = actor.poisoned ? '(info FALSA — decide tú)' : (result || '…');
    return isSameAlign
      ? `${pattern.emoji} ${label}\n¿${n1} y ${n2} son del mismo bando? ${res}.`
      : `🔮 ${label}\nEntre ${n1} y ${n2}: ${res}.`;
  };

  const confirm = () => {
    if (!can) return;
    const payload = { actorId: actor.id, nightInfo: buildInfo() };
    if (!isSameAlign && isFirstNight && redHerring) payload.redHerringSeatId = redHerring;
    send('NIGHT_NARRATOR_ACTION', payload);
    setOk(true);
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : `${label} — elegir 2 jugadores`}</p>
      {pattern.note && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', margin: '0 0 8px', borderLeft: '2px solid var(--gold)', paddingLeft: 6, lineHeight: 1.4 }}>
          ⚠ {pattern.note}
        </p>
      )}
      {!isSameAlign && isFirstNight && (
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '6px 8px', marginBottom: 8 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--bone-400)', textTransform: 'uppercase', margin: '0 0 4px' }}>Falso positivo (solo 1ª noche)</p>
          <select style={{ ...selStyle, marginBottom: 0 }} value={redHerring} onChange={e => {
            setRedHerring(e.target.value);
            if (e.target.value) send('NIGHT_NARRATOR_ACTION', { redHerringSeatId: e.target.value });
          }}>
            <option value="">Sin falso positivo</option>
            {goodPl.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}
      <select style={selStyle} value={p1} onChange={e => { setP1(e.target.value); setOk(false); }}>
        <option value="">Jugador 1</option>
        {living.filter(p => p.id !== p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={p2} onChange={e => { setP2(e.target.value); setOk(false); }}>
        <option value="">Jugador 2</option>
        {living.filter(p => p.id !== p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {result && !actor.poisoned && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: result.startsWith('✅') ? 'var(--blood-hi)' : 'var(--good)', margin: '4px 0', textAlign: 'center', fontWeight: 700 }}>{result}</p>
      )}
      {actor.poisoned && poisonNote}
      <button onClick={confirm} disabled={!can} className="btn-action primary"
        style={{ ...btnPrimary, opacity: can ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_INFO — recordatorio de mecánica especial; sin selector de jugador
function P_InfoPanel({ actor, pattern, send, roleName }) {
  const [ok, setOk] = useState(false);
  const confirm = () => {
    send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: `${pattern.emoji} ${roleName}\n[Narrador gestionó manualmente]` });
    setOk(true);
  };
  return (
    <div style={{ ...panelStyle, borderColor: 'rgba(201,162,74,0.18)' }}>
      <p style={labelStyle}>{ok ? '✓ Anotado' : `${roleName} — recordatorio`}</p>
      {pattern.note && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--gold)', margin: '0 0 8px', borderLeft: '2px solid var(--gold)', paddingLeft: 8, lineHeight: 1.5 }}>
          {pattern.note}
        </p>
      )}
      <button onClick={confirm} className="btn-action" style={{ ...btnPrimary, opacity: ok ? 0.5 : 1 }}>
        {ok ? '✓ Anotado' : '✓ Confirmar paso'}
      </button>
    </div>
  );
}

// P_DREAMER — elegir objetivo + señuelo de alineación opuesta (Soñador)
function DreamerPanel({ actor, pattern, game, send, roleName }) {
  const [targetId, setTargetId] = useState('');
  const [decoyId, setDecoyId] = useState('');
  const [ok, setOk] = useState(false);

  const pool = game.players.filter(p => p.alive && p.id !== actor.id);
  const target = game.players.find(p => p.id === targetId);
  const targetDef = target ? ROLE_BY_ID[target.role] : null;
  const oppositeAlign = targetDef?.alignment === 'good' ? 'evil' : 'good';
  const decoyRoles = (game.campaignRoles || []).filter(r => r.alignment === oppositeAlign && r.id !== target?.role);

  const buildInfo = () => {
    const decoyDef = ROLE_BY_ID[decoyId];
    return `💭 Soñador\n${target?.name} eligió a un jugador. Muéstrale: [${targetDef?.name}] y [${decoyDef?.name}].`;
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Soñador — objetivo y señuelo'}</p>
      <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setDecoyId(''); setOk(false); }}>
        <option value="">Jugador elegido por el Soñador…</option>
        {pool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {targetDef && (
        <>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--bone-200)', margin: '4px 0 6px' }}>
            Rol real: <strong>{targetDef.name}</strong> ({targetDef.alignment === 'good' ? 'bueno' : 'malvado'})
          </p>
          <select style={selStyle} value={decoyId} onChange={e => { setDecoyId(e.target.value); setOk(false); }}>
            <option value="">Señuelo ({oppositeAlign === 'good' ? 'bueno' : 'malvado'})…</option>
            {decoyRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </>
      )}
      {targetDef && decoyId && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: 'var(--gold)', margin: '4px 0', fontStyle: 'italic' }}>
          Decir: "{targetDef.name}" + "{ROLE_BY_ID[decoyId]?.name}"
        </p>
      )}
      <button onClick={() => { if (targetId && decoyId) { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: buildInfo() }); setOk(true); } }}
        disabled={!targetId || !decoyId || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (targetId && decoyId && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_CHAMBERMAID — elegir 2 jugadores + contar cuántos despertaron (Doncella)
function ChambermaidPanel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [count, setCount] = useState(null);
  const [ok, setOk] = useState(false);

  const pool = game.players.filter(p => p.alive && p.id !== actor.id);
  const can = t1 && t2 && t1 !== t2 && count !== null;

  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Doncella — 2 jugadores observados'}</p>
      <select style={selStyle} value={t1} onChange={e => { setT1(e.target.value); setOk(false); }}>
        <option value="">Jugador 1…</option>
        {pool.filter(p => p.id !== t2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={t2} onChange={e => { setT2(e.target.value); setOk(false); }}>
        <option value="">Jugador 2…</option>
        {pool.filter(p => p.id !== t1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {t1 && t2 && (
        <>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--bone-400)', margin: '6px 0 4px' }}>¿Cuántos despertaron por su habilidad esta noche?</p>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {[0, 1, 2].map(n => (
              <button key={n} className="btn-night" onClick={() => { setCount(n); setOk(false); }}
                style={{ flex: 1, fontSize: 15, padding: '6px 0', borderColor: count === n ? 'var(--gold)' : undefined, color: count === n ? 'var(--gold-hot)' : undefined }}>
                {n}
              </button>
            ))}
          </div>
        </>
      )}
      <button onClick={() => {
        if (!can) return;
        const n1 = game.players.find(p => p.id === t1)?.name;
        const n2 = game.players.find(p => p.id === t2)?.name;
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: `🛎️ Doncella\n${n1} y ${n2}: despertaron ${count} de 2 por su habilidad.` });
        setOk(true);
      }} disabled={!can || ok} className="btn-action primary" style={{ ...btnPrimary, opacity: (can && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_PO — ataque normal o saltar (con x3 al siguiente turno via localStorage)
function POPanel({ actor, pattern, game, send }) {
  const isTripleMode = localStorage.getItem('botc_po_skip_night') === String(game.nightNumber - 1);
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [t3, setT3] = useState('');
  const [targetId, setTargetId] = useState('');
  const [ok, setOk] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const living = game.players.filter(p => p.alive);

  if (isTripleMode) {
    const can = t1 && t2 && t3 && new Set([t1, t2, t3]).size === 3;
    const n = id => game.players.find(p => p.id === id)?.name;
    return (
      <div style={{ ...panelStyle, borderColor: 'rgba(168,58,45,0.5)' }}>
        <p style={{ ...labelStyle, color: 'var(--blood-hi)' }}>⚠ PO — Ataque ×3 (saltó anoche)</p>
        <select style={selStyle} value={t1} onChange={e => { setT1(e.target.value); setOk(false); }}>
          <option value="">Objetivo 1…</option>
          {living.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={selStyle} value={t2} onChange={e => { setT2(e.target.value); setOk(false); }}>
          <option value="">Objetivo 2…</option>
          {living.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={selStyle} value={t3} onChange={e => { setT3(e.target.value); setOk(false); }}>
          <option value="">Objetivo 3…</option>
          {living.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => {
          if (!can) return;
          send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, actionType: 'PO_KILL', targetIds: [t1, t2, t3], nightInfo: `💀 PO atacó ×3: ${n(t1)}, ${n(t2)}, ${n(t3)}.` });
          setOk(true);
        }} disabled={!can || ok} className="btn-action primary"
          style={{ ...btnPrimary, opacity: (can && !ok) ? 1 : 0.4 }}>{ok ? '✓ Aplicado' : '💀 Atacar ×3'}</button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok || skipped ? '✓ Acción aplicada' : '💀 PO — Atacar o Saltar'}</p>
      <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setOk(false); }}>
        <option value="">Elegir objetivo…</option>
        {living.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button onClick={() => {
        if (!targetId) return;
        const tname = game.players.find(p => p.id === targetId)?.name;
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, actionType: 'PO_KILL', targetIds: [targetId], nightInfo: `💀 PO atacó a ${tname} esta noche.` });
        setOk(true);
      }} disabled={!targetId || ok || skipped} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (targetId && !ok && !skipped) ? 1 : 0.4 }}>💀 Atacar</button>
      <button onClick={() => {
        localStorage.setItem('botc_po_skip_night', String(game.nightNumber));
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: '⏭ PO saltó el ataque esta noche — próxima noche atacará ×3.' });
        setSkipped(true);
      }} disabled={ok || skipped} className="btn-night"
        style={{ width: '100%', fontSize: 11, marginTop: 4, opacity: (ok || skipped) ? 0.4 : 1 }}>
        {skipped ? '⏭ Saltó el ataque (×3 próxima noche)' : '⏭ Saltar ataque (próxima noche ×3)'}
      </button>
    </div>
  );
}

// P_PHILOSOPHER — elegir personaje bueno una sola vez (Filósofo)
function PhilosopherPanel({ actor, pattern, game, send, roleName }) {
  const [roleId, setRoleId] = useState('');
  const [ok, setOk] = useState(false);

  const goodRoles = (game.campaignRoles || []).filter(r => r.alignment === 'good' && r.id !== actor.role);
  const chosenDef = roleId ? ROLE_BY_ID[roleId] : null;
  const playerWithRole = roleId ? game.players.find(p => p.role === roleId && p.id !== actor.id) : null;

  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Registrado (una vez)' : 'Filósofo — elegir personaje bueno'}</p>
      <select style={selStyle} value={roleId} onChange={e => { setRoleId(e.target.value); setOk(false); }}>
        <option value="">Personaje bueno elegido…</option>
        {goodRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {playerWithRole && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: '#fbbf24', margin: '4px 0' }}>
          ⚠ {playerWithRole.name} ya tiene ese rol → queda borracho
        </p>
      )}
      <button onClick={() => {
        if (!chosenDef) return;
        const note = playerWithRole ? `Marcar a ${playerWithRole.name} como borracho.` : 'El personaje no está en juego.';
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: `📜 Filósofo\nEligió: ${chosenDef.name}. ${note}` });
        setOk(true);
      }} disabled={!roleId || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (roleId && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_YESNO — decisión binaria del Narrador (Manitas, etc.)
function YesNoPanel({ actor, pattern, send, roleName }) {
  const [val, setVal] = useState('');
  const [ok, setOk] = useState(false);
  const chosen = val === 'yes' ? (pattern.yesLabel || 'SÍ') : val === 'no' ? (pattern.noLabel || 'NO') : null;
  const info = chosen ? `${pattern.emoji} ${roleName}\n${pattern.label}: ${chosen}.` : null;
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Anotado' : pattern.label}</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button onClick={() => { setVal('yes'); setOk(false); }} className="btn-night"
          style={{ flex: 1, fontSize: 12, borderColor: val === 'yes' ? 'var(--blood-hi)' : undefined, color: val === 'yes' ? 'var(--blood-hi)' : undefined }}>
          {pattern.yesLabel || 'SÍ'}
        </button>
        <button onClick={() => { setVal('no'); setOk(false); }} className="btn-night"
          style={{ flex: 1, fontSize: 12, borderColor: val === 'no' ? 'var(--good)' : undefined, color: val === 'no' ? 'var(--good)' : undefined }}>
          {pattern.noLabel || 'NO'}
        </button>
      </div>
      <button onClick={() => { if (info) { send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: info }); setOk(true); } }}
        disabled={!info} className="btn-action primary" style={{ ...btnPrimary, opacity: info ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_GAMBLER — Tahúr: elige jugador + personaje, muestra si la apuesta es correcta
function GamblerPanel({ actor, pattern, game, send, roleName }) {
  const [targetId, setTargetId] = useState('');
  const [guessRoleId, setGuessRoleId] = useState('');
  const [ok, setOk] = useState(false);

  const pool = game.players.filter(p => p.alive && p.id !== actor.id);
  // All roles in play (campaign + any cross-edition players bring)
  const rolesInPlay = [];
  const seen = new Set();
  for (const pl of game.players) {
    const def = ROLE_BY_ID[pl.role];
    if (def && !seen.has(def.id)) { seen.add(def.id); rolesInPlay.push(def); }
  }
  // Also add campaign roles not in play for guessing
  for (const r of (game.campaignRoles || [])) {
    if (!seen.has(r.id)) { seen.add(r.id); rolesInPlay.push(r); }
  }

  const target = game.players.find(p => p.id === targetId);
  const guessCorrect = target && guessRoleId && !actor.poisoned && target.role === guessRoleId;
  const guessWrong   = target && guessRoleId && (actor.poisoned || target.role !== guessRoleId);
  const can = targetId && guessRoleId;

  const buildInfo = () => {
    const rname = ROLE_BY_ID[guessRoleId]?.name || guessRoleId;
    return `🎲 Tahúr\n${actor.name} apostó: ${target?.name} es ${rname}. ${guessCorrect ? 'CORRECTO — no muere.' : 'INCORRECTO — ¡muere esta noche!'}`;
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Resultado registrado' : 'Tahúr — apuesta de esta noche'}</p>
      {actor.poisoned && poisonNote}
      <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setGuessRoleId(''); setOk(false); }}>
        <option value="">Jugador apostado…</option>
        {pool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select style={selStyle} value={guessRoleId} onChange={e => { setGuessRoleId(e.target.value); setOk(false); }}>
        <option value="">Personaje que adivina…</option>
        {rolesInPlay.sort((a, b) => a.name.localeCompare(b.name)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {can && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700, textAlign: 'center', margin: '4px 0',
            color: guessCorrect ? 'var(--good)' : 'var(--blood-hi)' }}>
          {guessCorrect ? '✅ CORRECTO — el Tahúr no muere' : '💀 INCORRECTO — el Tahúr muere esta noche'}
        </p>
      )}
      <button onClick={() => { if (!can) return; send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: buildInfo() }); setOk(true); }}
        disabled={!can || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (can && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_GOSSIP — Cotilla: ¿declaración verdadera? → si sí, elige quién muere
function GossipPanel({ actor, pattern, game, send, roleName }) {
  const [triggered, setTriggered] = useState(null);
  const [targetId, setTargetId] = useState('');
  const [ok, setOk] = useState(false);

  const pool = game.players.filter(p => p.alive && p.id !== actor.id);

  const buildInfo = () => {
    if (!triggered) return null;
    if (triggered === 'no') return `💬 Cotilla\nDeclaración pública no verdadera (o Cotilla envenenada). No hay muerte.`;
    const tname = game.players.find(p => p.id === targetId)?.name;
    return `💬 Cotilla\nDeclaración verdadera — muere ${tname} esta noche.`;
  };
  const can = triggered === 'no' || (triggered === 'yes' && targetId);
  const info = buildInfo();
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Anotado' : 'Cotilla — ¿se activa hoy?'}</p>
      {actor.poisoned && poisonNote}
      <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', margin: '0 0 6px', borderLeft: '2px solid var(--gold)', paddingLeft: 6 }}>
        ¿Algún jugador hizo una declaración pública verdadera hoy?
      </p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[['yes', '✅ SÍ — se activa'], ['no', '❌ NO — sin efecto']].map(([v, lbl]) => (
          <button key={v} onClick={() => { setTriggered(v); setTargetId(''); setOk(false); }} className="btn-night"
            style={{ flex: 1, fontSize: 11, borderColor: triggered === v ? 'var(--gold)' : undefined, color: triggered === v ? 'var(--gold-hot)' : undefined }}>
            {lbl}
          </button>
        ))}
      </div>
      {triggered === 'yes' && !actor.poisoned && (
        <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setOk(false); }}>
          <option value="">¿Quién muere esta noche?</option>
          {pool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button onClick={() => { if (!can || !info) return; send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: info }); setOk(true); }}
        disabled={!can || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (can && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_COURTIER — Cortesano: elige un personaje (no jugador) que queda borracho 3 noches
function CourtierPanel({ actor, pattern, game, send, roleName }) {
  const [guessRoleId, setGuessRoleId] = useState('');
  const [ok, setOk] = useState(false);

  const rolesInPlay = [];
  const seen = new Set();
  for (const pl of game.players) {
    const def = ROLE_BY_ID[pl.role];
    if (def && pl.id !== actor.id && !seen.has(def.id)) { seen.add(def.id); rolesInPlay.push(def); }
  }

  const targetPlayer = guessRoleId ? game.players.find(p => p.role === guessRoleId) : null;
  const chosenDef = ROLE_BY_ID[guessRoleId];

  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Registrado (una vez)' : 'Cortesano — elegir personaje a borrachar'}</p>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--gold)', margin: '0 0 6px', borderLeft: '2px solid var(--gold)', paddingLeft: 6 }}>
        Una sola vez por partida. El personaje elegido queda borracho 3 noches + 3 días.
      </p>
      <select style={selStyle} value={guessRoleId} onChange={e => { setGuessRoleId(e.target.value); setOk(false); }}>
        <option value="">Personaje elegido…</option>
        {rolesInPlay.sort((a, b) => a.name.localeCompare(b.name)).map(r => <option key={r.id} value={r.id}>{r.name} ({game.players.find(p => p.role === r.id)?.name || '?'})</option>)}
      </select>
      {targetPlayer && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 12, color: '#fbbf24', margin: '4px 0' }}>
          ⚠ {targetPlayer.name} ({chosenDef?.name}) queda borracho 3 noches + 3 días.
        </p>
      )}
      <button onClick={() => {
        if (!guessRoleId || !chosenDef) return;
        const tp = targetPlayer?.name || '(desconocido)';
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: `🎴 Cortesano\nEligió: ${chosenDef.name} (${tp}). Borracho 3 noches + 3 días.` });
        setOk(true);
      }} disabled={!guessRoleId || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (guessRoleId && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_MOONCHILD — Lunático: si murió, elige quién muere al amanecer
function MoonchildPanel({ actor, pattern, game, send, roleName }) {
  const [died, setDied] = useState(null);
  const [targetId, setTargetId] = useState('');
  const [ok, setOk] = useState(false);

  const pool = game.players.filter(p => p.alive && p.id !== actor.id);
  const can = died === false || (died === true && targetId);

  const buildInfo = () => {
    if (!died) return `🌙 Lunático\nNo murió esta noche — sin efecto.`;
    const tname = game.players.find(p => p.id === targetId)?.name;
    return `🌙 Lunático\nMurió esta noche. Al amanecer muere: ${tname}.`;
  };
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Anotado' : 'Lunático — ¿murió esta noche?'}</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[[true, '💀 Sí murió'], [false, '✅ No murió']].map(([v, lbl]) => (
          <button key={String(v)} onClick={() => { setDied(v); setTargetId(''); setOk(false); }} className="btn-night"
            style={{ flex: 1, fontSize: 12, borderColor: died === v ? (v ? 'var(--blood-hi)' : 'var(--good)') : undefined, color: died === v ? (v ? 'var(--blood-hi)' : 'var(--good)') : undefined }}>
            {lbl}
          </button>
        ))}
      </div>
      {died === true && (
        <select style={selStyle} value={targetId} onChange={e => { setTargetId(e.target.value); setOk(false); }}>
          <option value="">¿Quién muere al amanecer?</option>
          {pool.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button onClick={() => {
        if (!can) return;
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: buildInfo() });
        setOk(true);
      }} disabled={!can || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (can && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P_NOBLE — Noble: elige 3 jugadores donde exactamente 1 es malvado (primera noche)
function NoblePanel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [t3, setT3] = useState('');
  const [ok, setOk] = useState(false);

  const pool = game.players.filter(p => p.alive && p.id !== actor.id);
  const selected = [t1, t2, t3].filter(Boolean);
  const can = t1 && t2 && t3 && new Set([t1, t2, t3]).size === 3;
  const evilCount = selected.filter(id => game.players.find(p => p.id === id)?.alignment === 'evil').length;
  const validCombo = actor.poisoned || evilCount === 1;

  const n = id => game.players.find(p => p.id === id)?.name || '?';
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{ok ? '✓ Info confirmada' : 'Noble — elegir 3 jugadores (1 malvado)'}</p>
      {actor.poisoned && poisonNote}
      {[['Jugador 1', t1, setT1, t2, t3], ['Jugador 2', t2, setT2, t1, t3], ['Jugador 3', t3, setT3, t1, t2]].map(([lbl, val, setter, ex1, ex2]) => (
        <select key={lbl} style={selStyle} value={val} onChange={e => { setter(e.target.value); setOk(false); }}>
          <option value="">{lbl}…</option>
          {pool.filter(p => p.id !== ex1 && p.id !== ex2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      ))}
      {can && !actor.poisoned && !validCombo && (
        <p style={{ fontFamily: 'var(--serif)', fontSize: 11, color: 'var(--blood-hi)', margin: '2px 0' }}>
          ⚠ Selección inválida: debe haber exactamente 1 malvado entre los 3 ({evilCount} seleccionados).
        </p>
      )}
      <button onClick={() => {
        if (!can || !validCombo) return;
        send('NIGHT_NARRATOR_ACTION', { actorId: actor.id, nightInfo: `🎭 Noble\nMostrados: ${n(t1)}, ${n(t2)}, ${n(t3)}. Exactamente 1 es malvado real.` });
        setOk(true);
      }} disabled={!can || !validCombo || ok} className="btn-action primary"
        style={{ ...btnPrimary, opacity: (can && validCombo && !ok) ? 1 : 0.4 }}>✓ Confirmar</button>
    </div>
  );
}

// P7 — Bluffs del Demonio (en el paso "Info Esbirros & Demonio", noche 1)
function BluffsPanel({ game, send }) {
  const notInPlay = game.rolesNotInPlay || [];
  const allRoles  = game.campaignRoles  || [];
  const [selected, setSelected] = useState(game.narratorRolesForImp || []);
  const [ok, setOk] = useState((game.narratorRolesForImp || []).length >= 3);

  const candidates = allRoles.filter(r => notInPlay.includes(r.id) && r.alignment === 'good');

  const toggle = rid => {
    setSelected(prev => prev.includes(rid)
      ? prev.filter(x => x !== rid)
      : prev.length < 3 ? [...prev, rid] : prev);
    setOk(false);
  };
  const confirm = () => { send('NIGHT_NARRATOR_ACTION', { bluffs: selected }); setOk(true); };

  return (
    <div style={{ marginTop: 10, background: 'rgba(168,58,45,0.08)', border: '1px solid var(--blood-dim)', borderRadius: 6, padding: '10px 12px' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--blood-hi)', margin: '0 0 6px' }}>
        {ok ? '✓ Bluffs fijados' : `Bluffs del Demonio (${selected.length}/3)`}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
        {candidates.map(r => {
          const on   = selected.includes(r.id);
          const full = selected.length >= 3 && !on;
          return (
            <button key={r.id} disabled={full} className="btn-night"
              style={{ fontSize: 9, opacity: full ? 0.35 : 1, borderColor: on ? 'var(--blood-hi)' : undefined, color: on ? 'var(--blood-hi)' : undefined }}
              onClick={() => toggle(r.id)}>
              {r.name}
            </button>
          );
        })}
      </div>
      <button onClick={confirm} disabled={selected.length < 3} className="btn-action"
        style={{ width: '100%', fontSize: 11, padding: '5px 0', opacity: selected.length >= 3 ? 1 : 0.4 }}>
        ✓ Confirmar bluffs
      </button>
    </div>
  );
}
