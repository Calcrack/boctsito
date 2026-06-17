// ── The Carousel (campaña experimental) ─────────────────────────────────

const roles = {
  // ── ALDEANOS ────────────────────────────────────────────────────────────
  ACROBAT: {
    id: 'ACROBAT', name: 'Acróbata', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche*: elige un jugador. Si está o se vuelve borracho o envenenado esta noche, mueres.',
    firstNight: false, otherNights: true,
  },
  ALCHEMIST: {
    id: 'ALCHEMIST', name: 'Alquimista', alignment: 'good', type: 'townfolk',
    ability: 'Tienes una habilidad de Esbirro. Cuando la uses, el Narrador puede pedirte que elijas diferente.',
    firstNight: true, otherNights: false,
    setup: { alchemistAbility: true },
  },
  AMNESIAC: {
    id: 'AMNESIAC', name: 'Amnésico', alignment: 'good', type: 'townfolk',
    ability: 'No sabes cuál es tu habilidad. Cada día, adivina en privado cuál es: aprendes qué tan preciso eres.',
    firstNight: false, otherNights: false,
  },
  ATHEIST: {
    id: 'ATHEIST', name: 'Ateo', alignment: 'good', type: 'townfolk',
    ability: 'Todos los jugadores son buenos. Los buenos ganan si el Narrador es ejecutado.',
    firstNight: true, otherNights: false,
  },
  BALLOONIST: {
    id: 'BALLOONIST', name: 'Aeronauta', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: aprendes un jugador de tipo diferente al de anoche.',
    firstNight: false, otherNights: true,
  },
  BANSHEE: {
    id: 'BANSHEE', name: 'Banshee', alignment: 'good', type: 'townfolk',
    ability: 'Si el Demonio te mata, todos lo aprenden. De ahora en adelante, puedes nominar dos veces por día.',
    firstNight: false, otherNights: false,
  },
  BOUNTY_HUNTER: {
    id: 'BOUNTY_HUNTER', name: 'Cazarrecompensas', alignment: 'good', type: 'townfolk',
    ability: 'Comienzas sabiendo 1 jugador malo. Si el que conoces muere, aprendes otro jugador malo esta noche.',
    firstNight: true, otherNights: true,
  },
  CANNIBAL: {
    id: 'CANNIBAL', name: 'Caníbal', alignment: 'good', type: 'townfolk',
    ability: 'Tienes la habilidad del ejecutado recientemente. Si es malo, te envenenan.',
    firstNight: false, otherNights: true,
  },
  CHOIRBOY: {
    id: 'CHOIRBOY', name: 'Niño Coro', alignment: 'good', type: 'townfolk',
    ability: 'Si el Demonio mata al Rey, aprendes cuál es el Demonio.',
    firstNight: false, otherNights: false,
  },
  CULT_LEADER: {
    id: 'CULT_LEADER', name: 'Líder Cultista', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche, tomas la alineación de un vecino vivo. Si todos los buenos se unen a tu culto, tu equipo gana.',
    firstNight: false, otherNights: true,
  },
  ENGINEER: {
    id: 'ENGINEER', name: 'Ingeniero', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, en la noche, elige qué Esbirros o qué Demonio está en juego.',
    firstNight: false, otherNights: true,
  },
  FARMER: {
    id: 'FARMER', name: 'Granjero', alignment: 'good', type: 'townfolk',
    ability: 'Cuando mueres de noche, un jugador bueno vivo se convierte en Granjero.',
    firstNight: false, otherNights: false,
  },
  FISHERMAN: {
    id: 'FISHERMAN', name: 'Pescador', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, durante el día, visita al Narrador para obtener consejo.',
    firstNight: false, otherNights: false,
  },
  GENERAL: {
    id: 'GENERAL', name: 'General', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche, aprendes qué alineación cree el Narrador que está ganando.',
    firstNight: false, otherNights: true,
  },
  HIGH_PRIESTESS: {
    id: 'HIGH_PRIESTESS', name: 'Sacerdotisa Mayor', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche, aprende cuál jugador cree el Narrador que deberías conocer.',
    firstNight: false, otherNights: true,
  },
  HUNTSMAN: {
    id: 'HUNTSMAN', name: 'Cazador', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, elige un jugador: la Damisela se convierte en un Aldeano que no está en juego.',
    firstNight: false, otherNights: true,
  },
  KING: {
    id: 'KING', name: 'Rey', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche, si los muertos igualan o superan a los vivos, aprendes un personaje vivo.',
    firstNight: true, otherNights: true,
  },
  KNIGHT: {
    id: 'KNIGHT', name: 'Caballero', alignment: 'good', type: 'townfolk',
    ability: 'Comienzas sabiendo 2 jugadores que no son el Demonio.',
    firstNight: true, otherNights: false,
  },
  LYCANTHROPE: {
    id: 'LYCANTHROPE', name: 'Licántropo', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche*: elige un jugador. Si es bueno, muere y el Demonio no mata esta noche.',
    firstNight: false, otherNights: true,
  },
  MAGICIAN: {
    id: 'MAGICIAN', name: 'Mago', alignment: 'good', type: 'townfolk',
    ability: 'El Demonio cree que eres un Esbirro. Los Esbirros creen que eres un Demonio.',
    firstNight: true, otherNights: false,
  },
  NIGHTWATCHMAN: {
    id: 'NIGHTWATCHMAN', name: 'Guardián Nocturno', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, elige un jugador: aprenden que eres el Guardián Nocturno.',
    firstNight: false, otherNights: true,
  },
  NOBLE: {
    id: 'NOBLE', name: 'Noble', alignment: 'good', type: 'townfolk',
    ability: 'Comienzas conociendo 3 jugadores, exactamente 1 de los cuales es malo.',
    firstNight: true, otherNights: false,
  },
  POPPY_GROWER: {
    id: 'POPPY_GROWER', name: 'Cultivador de Adormidera', alignment: 'good', type: 'townfolk',
    ability: 'Los Esbirros y Demonios no se conocen. Si mueres, se conocen esa noche.',
    firstNight: true, otherNights: false,
  },
  PREACHER: {
    id: 'PREACHER', name: 'Predicador', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche, elige un jugador: si es Esbirro, lo aprendes. Todos los Esbirros elegidos pierden habilidad.',
    firstNight: false, otherNights: true,
  },
  BOFFIN: {
    id: 'BOFFIN', name: 'Rata de Laboratorio', alignment: 'good', type: 'townfolk',
    ability: 'El Demonio tiene la habilidad de un bueno no en juego. Ambos lo saben desde noche 1.',
    firstNight: true, otherNights: false,
    setup: { boffinAbility: true },
  },
  SHUGENJA: {
    id: 'SHUGENJA', name: 'Shugenja', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas sabiendo si el jugador malo más cercano está a tu izquierda o a tu derecha.',
    firstNight: true, otherNights: false,
  },
  STEWARD: {
    id: 'STEWARD', name: 'Administrador', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo a 1 jugador bueno.',
    firstNight: true, otherNights: false,
  },

  // ── FORASTEROS ──────────────────────────────────────────────────────────
  DAMSEL: {
    id: 'DAMSEL', name: 'Damisela', alignment: 'good', type: 'outsider',
    ability: 'Todos los Esbirros saben que una Damisela está en juego. Si un Esbirro te adivina, pierdes.',
    firstNight: true, otherNights: false,
  },
  GOLEM: {
    id: 'GOLEM', name: 'Gólem', alignment: 'good', type: 'outsider',
    ability: 'Solo puedes nominar una vez. Si lo haces, si el nominado no es el Demonio, muere.',
    firstNight: false, otherNights: false,
  },
  HATTER: {
    id: 'HATTER', name: 'Sombrerero', alignment: 'good', type: 'outsider',
    ability: 'Si mueres hoy o esta noche, los Esbirros y Demonio pueden elegir nuevos personajes.',
    firstNight: false, otherNights: false,
  },
  HERETIC: {
    id: 'HERETIC', name: 'Hereje', alignment: 'good', type: 'outsider',
    ability: 'Quien gana, pierde. Quien pierde, gana, incluso si estás muerto.',
    firstNight: false, otherNights: false,
  },
  PLAGUE_DOCTOR: {
    id: 'PLAGUE_DOCTOR', name: 'Doctor de la Peste', alignment: 'good', type: 'outsider',
    ability: 'Cuando mueres, el Narrador gana una habilidad de Esbirro.',
    firstNight: false, otherNights: false,
  },
  POLITICIAN: {
    id: 'POLITICIAN', name: 'Político', alignment: 'good', type: 'outsider',
    ability: 'Si fuiste responsable de que tu equipo pierda, cambias alineación y ganas.',
    firstNight: false, otherNights: false,
  },
  PUZZLEMASTER: {
    id: 'PUZZLEMASTER', name: 'Maestro Acertijos', alignment: 'good', type: 'outsider',
    ability: '1 jugador está borracho. Si adivinas quién, aprendes al Demonio.',
    firstNight: true, otherNights: false,
    setup: { puzzlemasterDrunk: true },
  },
  SNITCH: {
    id: 'SNITCH', name: 'Soplón', alignment: 'good', type: 'outsider',
    ability: 'Cada Esbirro recibe 3 bluffs.',
    firstNight: true, otherNights: false,
  },

  // ── ESBIRROS ────────────────────────────────────────────────────────────
  BOOMDANDY: {
    id: 'BOOMDANDY', name: 'Pólvora', alignment: 'evil', type: 'minion',
    ability: 'Si eres ejecutado, todos excepto 3 mueren.',
    firstNight: false, otherNights: false,
  },
  FEARMONGER: {
    id: 'FEARMONGER', name: 'Sembrador de Miedo', alignment: 'evil', type: 'minion',
    ability: 'Cada noche, elige un jugador: si lo nominas y ejecutas, tu equipo pierde.',
    firstNight: false, otherNights: true,
  },
  GOBLIN: {
    id: 'GOBLIN', name: 'Goblin', alignment: 'evil', type: 'minion',
    ability: 'Si públicamente reclamas ser el Goblin cuando te nominan y eres ejecutado, tu equipo gana.',
    firstNight: false, otherNights: false,
  },
  HARPY: {
    id: 'HARPY', name: 'Arpía', alignment: 'evil', type: 'minion',
    ability: 'Cada noche, elige 2 jugadores: mañana, el primero cree que el segundo es malo.',
    firstNight: false, otherNights: true,
  },
  MARIONETTE: {
    id: 'MARIONETTE', name: 'Marioneta', alignment: 'evil', type: 'minion',
    ability: 'Crees que eres bueno, pero eres un Esbirro. El Demonio te conoce.',
    firstNight: true, otherNights: false,
    // Capa 2: cree ser un rol bueno no en juego; no despierta con el mal; el Demonio la conoce.
    misperception: { believes: 'unusedGood', wakesWithEvil: false, demonKnows: true },
  },
  MEZEPHELES: {
    id: 'MEZEPHELES', name: 'Mezefeles', alignment: 'evil', type: 'minion',
    ability: 'Comienzas sabiendo una palabra secreta. El primer jugador bueno que la diga se vuelve malo.',
    firstNight: true, otherNights: false,
  },
  ORGAN_GRINDER: {
    id: 'ORGAN_GRINDER', name: 'Organillero', alignment: 'evil', type: 'minion',
    ability: 'Todos cierran los ojos al votar. Cada noche, elige si estás borracho.',
    firstNight: false, otherNights: true,
  },
  PSYCHOPATH: {
    id: 'PSYCHOPATH', name: 'Psicópata', alignment: 'evil', type: 'minion',
    ability: 'Cada día, antes de nominaciones, puedes elegir públicamente un jugador: muere.',
    firstNight: false, otherNights: false,
  },
  MASTERMIND: {
    id: 'MASTERMIND', name: 'Mente Maestra', alignment: 'evil', type: 'minion',
    ability: 'Si el Demonio es ejecutado, la partida continúa 1 día más. Si alguien es ejecutado ese día, su equipo pierde.',
    firstNight: false, otherNights: false,
  },
  SUMMONER: {
    id: 'SUMMONER', name: 'Invocador', alignment: 'evil', type: 'minion',
    ability: 'Recibes 3 bluffs. En la noche 3, elige un jugador: se vuelve un Demonio malo.',
    firstNight: true, otherNights: true,
  },
  VIZIER: {
    id: 'VIZIER', name: 'Visir', alignment: 'evil', type: 'minion',
    ability: 'Todos saben que eres el Visir. No puedes morir durante el día.',
    firstNight: false, otherNights: false,
  },
  WIDOW: {
    id: 'WIDOW', name: 'Viuda', alignment: 'evil', type: 'minion',
    ability: 'En tu primera noche, mira el Grimorio y elige un jugador: se envenena.',
    firstNight: true, otherNights: false,
  },
  YAGGABABBLE: {
    id: 'YAGGABABBLE', name: 'Yaggababble', alignment: 'evil', type: 'minion',
    ability: 'Comienzas sabiendo una frase secreta. Por cada vez que la dijiste hoy, un jugador muere.',
    firstNight: true, otherNights: true,
  },

  // ── DEMONIOS ────────────────────────────────────────────────────────────
  AL_HADIKHIA: {
    id: 'AL_HADIKHIA', name: 'Al-Hadikhia', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige 3 jugadores que eligen silenciosamente vivir o morir.',
    firstNight: false, otherNights: true,
  },
  KAZALI: {
    id: 'KAZALI', name: 'Kazali', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un jugador que muere. Tú eliges qué jugadores son Esbirros.',
    firstNight: true, otherNights: true,
  },
  LEGION: {
    id: 'LEGION', name: 'Legión', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: un jugador puede morir. Las ejecuciones fallan si solo malignos votaron.',
    firstNight: true, otherNights: true,
  },
  LEVIATHAN: {
    id: 'LEVIATHAN', name: 'Leviatán', alignment: 'evil', type: 'demon',
    ability: 'Si +1 buenos ejecutados, los malos ganan. Después del día 5, los malos ganan.',
    firstNight: true, otherNights: false,
  },
  LIL_MONSTA: {
    id: 'LIL_MONSTA', name: 'Pequeña Monsta', alignment: 'evil', type: 'demon',
    ability: 'Cada noche, los Esbirros eligen quién cuida y es el "Demonio".',
    firstNight: true, otherNights: true,
  },
  LLEECH: {
    id: 'LLEECH', name: 'Sangijuela', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un jugador que muere. Mueres si tu anfitrión envenenado está muerto.',
    firstNight: true, otherNights: true,
  },
  OJO: {
    id: 'OJO', name: 'Ojo', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un personaje que muere. Si no está en juego, el Narrador elige.',
    firstNight: false, otherNights: true,
  },
  RIOT: {
    id: 'RIOT', name: 'Motín', alignment: 'evil', type: 'demon',
    ability: 'En el día 3, los Esbirros se vuelven Motín y los nominados mueren inmediatamente.',
    firstNight: true, otherNights: false,
  },
};

const BASE_DISTRIBUTION = {
  5:  { townfolk: 2, outsiders: 1, minions: 1, demons: 1 },
  6:  { townfolk: 3, outsiders: 1, minions: 1, demons: 1 },
  7:  { townfolk: 4, outsiders: 1, minions: 1, demons: 1 },
  8:  { townfolk: 5, outsiders: 1, minions: 1, demons: 1 },
  9:  { townfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  10: { townfolk: 6, outsiders: 2, minions: 1, demons: 1 },
  11: { townfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  12: { townfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  13: { townfolk: 8, outsiders: 2, minions: 2, demons: 1 },
  14: { townfolk: 9, outsiders: 2, minions: 2, demons: 1 },
  15: { townfolk: 9, outsiders: 2, minions: 3, demons: 1 },
};

// Orden nocturno derivado de análisis de habilidades
const queueFirst = [
  'POPPY_GROWER', 'MAGICIAN', 'KAZALI', 'LEGION', 'LIL_MONSTA', 'RIOT', 'LEVIATHAN',
  // 'MARIONETTE' NO entra en la cola interactiva: es pasiva y no despierta con el mal.
  'MEZEPHELES', 'WIDOW', 'SUMMONER', 'SHUGENJA', 'STEWARD',
  'PUZZLEMASTER', 'ALCHEMIST', 'AMNESIAC',
  'BOUNTY_HUNTER', 'KNIGHT', 'BOFFIN', 'NOBLE', 'DAMSEL', 'SNITCH',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
];

const queueOther = [
  'POPPY_GROWER', 'LLEECH', 'KAZALI', 'LEGION', 'LIL_MONSTA', 'OJO', 'AL_HADIKHIA',
  'WIDOW', 'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER', 'SUMMONER', 'YAGGABABBLE',
  'PREACHER', 'LYCANTHROPE', 'HUNTSMAN', 'ENGINEER', 'ACROBAT',
  'CANNIBAL', 'BOUNTY_HUNTER', 'CULT_LEADER',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
];

// ── Tags de montaje/info (vocabulario en troubleBrewing.js) — best-effort ──
// Carousel es experimental: tags base para que TODO rol fluya por el wizard
// (identidad falsa, bluffs, veneno inicial); la info bespoke de roles exóticos
// se completa de forma incremental (P6).
const SETUP = {
  AL_HADIKHIA: { demonBluffs: 3 }, KAZALI: { demonBluffs: 3 }, LEGION: { demonBluffs: 3 },
  LEVIATHAN: { demonBluffs: 3 }, LIL_MONSTA: { demonBluffs: 3 }, LLEECH: { demonBluffs: 3 },
  OJO: { demonBluffs: 3 }, RIOT: { demonBluffs: 3 },
  WIDOW: { initialPoison: true }, SUMMONER: { summonerSetup: true, demonBluffs: 3 },
};
const INFO = {
  BOUNTY_HUNTER: { firstNight: true, kind: 'knowEvilPlayer' }, // 1 jugador malo
};
for (const [id, s] of Object.entries(SETUP)) if (roles[id]) roles[id].setup = s;
for (const [id, n] of Object.entries(INFO))  if (roles[id]) roles[id].info  = n;

module.exports = {
  id: 'CAROUSEL',
  name: 'The Carousel',
  name_es: 'El Carrusel',
  roles,
  distribution: BASE_DISTRIBUTION,
  outsiderModifiers: {},
  queueFirst,
  queueOther,
};
