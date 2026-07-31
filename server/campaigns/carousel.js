// ── The Carousel (campaña experimental) ─────────────────────────────────

const roles = {
  // ── ALDEANOS ────────────────────────────────────────────────────────────
  ACROBAT: {
    id: 'ACROBAT', name: 'Acróbata', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* elige 1 jugador: si está borracho o envenenado, o acaba estándolo esta noche, mueres.',
    firstNight: false, otherNights: true,
  },
  ALCHEMIST: {
    id: 'ALCHEMIST', name: 'Alquimista', alignment: 'good', type: 'townfolk',
    ability: 'Tienes la habilidad de un Esbirro. Cuando la uses, el Narrador puede pedirte que hagas otra elección.',
    firstNight: true, otherNights: false,
    setup: { alchemistAbility: true },
  },
  AMNESIAC: {
    id: 'AMNESIAC', name: 'Amnésico', alignment: 'good', type: 'townfolk',
    ability: 'No sabes cuál es tu habilidad. Cada día intenta adivinarla en privado y sabes lo cerca que estás.',
    firstNight: false, otherNights: false,
  },
  ATHEIST: {
    id: 'ATHEIST', name: 'Ateo', alignment: 'good', type: 'townfolk',
    ability: 'El Narrador puede romper las reglas. Si el Narrador es ejecutado, ganan los buenos, aunque estés muerto. [No hay malos]',
    firstNight: false, otherNights: false,
  },
  BALLOONIST: {
    id: 'BALLOONIST', name: 'Aeronauta', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche descubres 1 jugador de un tipo diferente al de la noche anterior. [+0 o +1 Forastero]',
    firstNight: true, otherNights: true,
  },
  BANSHEE: {
    id: 'BANSHEE', name: 'Banshee', alignment: 'good', type: 'townfolk',
    ability: 'Si el Demonio te mata, todos los jugadores lo saben. A partir de ahora, puedes nominar 2 veces por día y votar 2 veces por nominación.',
    firstNight: false, otherNights: false,
  },
  BOUNTY_HUNTER: {
    id: 'BOUNTY_HUNTER', name: 'Cazarrecompensas', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo 1 jugador malo. Si ese jugador muere, descubres 1 jugador malo esta noche. [1 Aldeano es malo]',
    firstNight: true, otherNights: true,
  },
  CANNIBAL: {
    id: 'CANNIBAL', name: 'Caníbal', alignment: 'good', type: 'townfolk',
    ability: 'Tienes la habilidad del último jugador muerto ejecutado. Si es malo, estás envenenado hasta que 1 bueno muera ejecutado.',
    firstNight: false, otherNights: true,
  },
  CHOIRBOY: {
    id: 'CHOIRBOY', name: 'Niño del Coro', alignment: 'good', type: 'townfolk',
    ability: 'Si el Demonio mata al Rey, descubres qué jugador es el Demonio [+ Rey]',
    firstNight: false, otherNights: false,
  },
  CULT_LEADER: {
    id: 'CULT_LEADER', name: 'Líder de Culto', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche te conviertes al alineamiento de 1 vecino vivo. Si todos los jugadores buenos eligen unirse a tu culto, tu bando gana.',
    firstNight: true, otherNights: true,
  },
  ENGINEER: {
    id: 'ENGINEER', name: 'Ingeniero', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche, elige qué Esbirros o qué Demonio está en juego.',
    firstNight: true, otherNights: true,
  },
  FARMER: {
    id: 'FARMER', name: 'Granjero', alignment: 'good', type: 'townfolk',
    ability: 'Cuando mueres por la noche, 1 jugador vivo bueno se convierte en Granjero.',
    firstNight: false, otherNights: false,
  },
  FISHERMAN: {
    id: 'FISHERMAN', name: 'Pescador', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, durante el día, puedes visitar al Narrador para que te aconseje sobre cómo debe ganar tu bando.',
    firstNight: false, otherNights: false,
  },
  GENERAL: {
    id: 'GENERAL', name: 'General', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche sabes qué alineamiento cree el Narrador que está ganando: bueno, malo o ninguno.',
    firstNight: true, otherNights: true,
  },
  HIGH_PRIESTESS: {
    id: 'HIGH_PRIESTESS', name: 'Suma Sacerdotisa', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche sabes con qué jugador cree el Narrador que deberías hablar más.',
    firstNight: true, otherNights: true,
  },
  HUNTSMAN: {
    id: 'HUNTSMAN', name: 'Cazador', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche, elige 1 jugador vivo: si es la Damisela se convierte en 1 Aldeano que no esté en juego. [+ Damisela]',
    firstNight: true, otherNights: true,
  },
  KING: {
    id: 'KING', name: 'Rey', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche, si hay igual o más muertos que vivos, descubres 1 personaje vivo. El Demonio sabe que eres el Rey.',
    firstNight: true, otherNights: true,
  },
  KNIGHT: {
    id: 'KNIGHT', name: 'Caballero', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo 2 jugadores que no son el Demonio.',
    firstNight: true, otherNights: false,
  },
  LYCANTHROPE: {
    id: 'LYCANTHROPE', name: 'Licántropo', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* elige 1 jugador vivo: si es bueno, muere y el Demonio no mata esta noche. Un jugador bueno aparece como malo.',
    firstNight: false, otherNights: true,
  },
  MAGICIAN: {
    id: 'MAGICIAN', name: 'Mago', alignment: 'good', type: 'townfolk',
    ability: 'El Demonio piensa que eres un Esbirro. Los Esbirros piensan que eres un Demonio.',
    firstNight: true, otherNights: false,
  },
  NIGHTWATCHMAN: {
    id: 'NIGHTWATCHMAN', name: 'Sereno', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche, elige 1 jugador: descubre que eres Sereno.',
    firstNight: true, otherNights: true,
  },
  NOBLE: {
    id: 'NOBLE', name: 'Noble', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo 3 jugadores, 1 y solo 1 de ellos es malo.',
    firstNight: true, otherNights: false,
  },
  POPPY_GROWER: {
    id: 'POPPY_GROWER', name: 'Cultivador de Opio', alignment: 'good', type: 'townfolk',
    ability: 'Los Esbirros y el Demonio no se conocen. Si mueres, se conocen esta noche.',
    firstNight: true, otherNights: false,
  },
  PREACHER: {
    id: 'PREACHER', name: 'Predicador', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche elige 1 jugador: si es Esbirro lo sabe. Los Esbirros elegidos no tienen habilidad.',
    firstNight: true, otherNights: true,
  },
  SHUGENJA: {
    id: 'SHUGENJA', name: 'Shugenja', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas sabiendo si el jugador malo más cercano está a tu izquierda o tu derecha. Si es equidistante, la información es arbitraria.',
    firstNight: true, otherNights: false,
  },
  STEWARD: {
    id: 'STEWARD', name: 'Administrador', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo 1 jugador bueno.',
    firstNight: true, otherNights: false,
  },

  // ── FORASTEROS ──────────────────────────────────────────────────────────
  DAMSEL: {
    id: 'DAMSEL', name: 'Damisela', alignment: 'good', type: 'outsider',
    ability: 'Los Esbirros saben que una Damisela está en juego. Si un Esbirro adivina quién eres (una vez por partida) tu equipo pierde.',
    firstNight: true, otherNights: false,
  },
  GOLEM: {
    id: 'GOLEM', name: 'Gólem', alignment: 'good', type: 'outsider',
    ability: 'Sólo puedes nominar 1 vez. Cuando lo hagas, si el nominado no es el Demonio, muere.',
    firstNight: false, otherNights: false,
  },
  HATTER: {
    id: 'HATTER', name: 'Sombrerero', alignment: 'good', type: 'outsider',
    ability: 'Si mueres hoy o esta noche, los Esbirros y el Demonio pueden elegir nuevos Esbirros y Demonios que ser.',
    firstNight: false, otherNights: false,
  },
  HERETIC: {
    id: 'HERETIC', name: 'Hereje', alignment: 'good', type: 'outsider',
    ability: 'Quien gane, pierde y quien pierda gana, aunque estés muerto.',
    firstNight: false, otherNights: false,
  },
  PLAGUE_DOCTOR: {
    id: 'PLAGUE_DOCTOR', name: 'Doctor de Plaga', alignment: 'good', type: 'outsider',
    ability: 'Cuando mueres, el Narrador gana la habilidad de un Esbirro.',
    firstNight: false, otherNights: false,
  },
  POLITICIAN: {
    id: 'POLITICIAN', name: 'Político', alignment: 'good', type: 'outsider',
    ability: 'Si eres el jugador más responsable de que tu equipo pierda, cambias de alineamiento y ganas, aunque estés muerto.',
    firstNight: false, otherNights: false,
  },
  PUZZLEMASTER: {
    id: 'PUZZLEMASTER', name: 'Maestro del Puzle', alignment: 'good', type: 'outsider',
    ability: 'Un jugador está borracho, aunque estés muerto. Si adivinas quién es (una vez por partida), descubres quién es el Demonio, pero si fallas recibes información falsa.',
    firstNight: true, otherNights: false,
    setup: { puzzlemasterDrunk: true },
  },
  SNITCH: {
    id: 'SNITCH', name: 'Soplón', alignment: 'good', type: 'outsider',
    ability: 'Los Esbirros empiezan conociendo 3 faroles.',
    firstNight: true, otherNights: false,
  },

  // ── ESBIRROS ────────────────────────────────────────────────────────────
  BOFFIN: {
    id: 'BOFFIN', name: 'Rata de Laboratorio', alignment: 'evil', type: 'minion',
    ability: 'El Demonio (incluso borracho o envenenado) tiene la habilidad de un bueno que no esté en juego. Ambos sabéis cuál.',
    firstNight: true, otherNights: false,
    setup: { boffinAbility: true },
  },
  BOOMDANDY: {
    id: 'BOOMDANDY', name: 'Boomdandy', alignment: 'evil', type: 'minion',
    ability: 'Si eres ejecutado, todos los jugadores menos 3 mueren. Después de una cuenta atrás de 10 a 1, el jugador con más jugadores apuntándole muere.',
    firstNight: false, otherNights: false,
  },
  FEARMONGER: {
    id: 'FEARMONGER', name: 'Fearmonger', alignment: 'evil', type: 'minion',
    ability: 'Cada noche elige 1 jugador: si le nominas y ejecutas, su equipo pierde. Todos los jugadores saben si has elegido a un nuevo jugador.',
    firstNight: true, otherNights: true,
  },
  GOBLIN: {
    id: 'GOBLIN', name: 'Goblin', alignment: 'evil', type: 'minion',
    ability: 'Si públicamente declaras ser Goblin cuando te nominen y eres ejecutado ese día, tu equipo gana.',
    firstNight: false, otherNights: false,
  },
  HARPY: {
    id: 'HARPY', name: 'Arpía', alignment: 'evil', type: 'minion',
    ability: 'Cada noche elige 2 jugadores: mañana, el primer jugador está loco sobre que el segundo es malo o uno o ambos pueden morir.',
    firstNight: true, otherNights: true,
  },
  MARIONETTE: {
    id: 'MARIONETTE', name: 'Marioneta', alignment: 'evil', type: 'minion',
    ability: 'Piensas que eres un personaje bueno, pero no lo eres. El Demonio sabe quién eres. [Estás adyacente al Demonio]',
    firstNight: true, otherNights: false,
    // Capa 2: cree ser un rol bueno no en juego; no despierta con el mal; el Demonio la conoce.
    misperception: { believes: 'unusedGood', wakesWithEvil: false, demonKnows: true },
  },
  MEZEPHELES: {
    id: 'MEZEPHELES', name: 'Mezepheles', alignment: 'evil', type: 'minion',
    ability: 'Empiezas conociendo 1 palabra secreta. El primer jugador bueno en decirla se convierte en malo esta noche.',
    firstNight: true, otherNights: false,
  },
  ORGAN_GRINDER: {
    id: 'ORGAN_GRINDER', name: 'Organillero', alignment: 'evil', type: 'minion',
    ability: 'Todos los jugadores cierran los ojos al votar y su voto se cuenta en secreto. Cada noche decides si estás borracho hasta el crepúsculo o no.',
    firstNight: true, otherNights: true,
  },
  PSYCHOPATH: {
    id: 'PSYCHOPATH', name: 'Psicópata', alignment: 'evil', type: 'minion',
    ability: 'Cada día, antes de las nominaciones, puedes elegir públicamente 1 jugador: muere. Si eres ejecutado, solo mueres si pierdes a piedra-papel-tijera.',
    firstNight: false, otherNights: false,
  },
  MASTERMIND: {
    id: 'MASTERMIND', name: 'Mente Maestra', alignment: 'evil', type: 'minion',
    ability: 'Si el Demonio muere por ejecución (terminando la partida), juega 1 día más. Si 1 jugador es ejecutado ese día, su equipo pierde.',
    firstNight: false, otherNights: false,
  },
  SUMMONER: {
    id: 'SUMMONER', name: 'Invocador', alignment: 'evil', type: 'minion',
    ability: 'Recibes 3 faroles. En la tercera noche elige 1 jugador: se vuelve malo y el Demonio que elijas. [No hay Demonio]',
    firstNight: true, otherNights: true,
  },
  VIZIER: {
    id: 'VIZIER', name: 'Visir', alignment: 'evil', type: 'minion',
    ability: 'Todos los jugadores saben que eres el Visir. No puedes morir durante el día. Si algún bueno vota, puedes elegir ejecutar inmediatamente.',
    firstNight: false, otherNights: false,
  },
  WIDOW: {
    id: 'WIDOW', name: 'Viuda', alignment: 'evil', type: 'minion',
    ability: 'En tu primera noche ves el Grimorio y eliges 1 jugador: está envenenado. 1 jugador bueno sabe que el Viuda está en juego.',
    firstNight: true, otherNights: false,
  },
  // El Hechicero es ESBIRRO (malvado): concede un deseo con precio, no es un
  // Aldeano. Estaba mal clasificado como Aldeano bueno.
  WIZARD: {
    id: 'WIZARD', name: 'Hechicero', alignment: 'evil', type: 'minion',
    ability: 'Una vez por partida pídele en privado un deseo al Narrador: si se concede, tu deseo puede tener un precio y deja pistas de su naturaleza.',
    firstNight: false, otherNights: false,
  },

  // ── DEMONIOS ────────────────────────────────────────────────────────────
  // Yaggababble es DEMONIO, no Esbirro.
  YAGGABABBLE: {
    id: 'YAGGABABBLE', name: 'Yaggababble', alignment: 'evil', type: 'demon',
    ability: 'Empiezas conociendo 1 frase secreta. Cada vez que la digas públicamente hoy, 1 jugador puede morir.',
    firstNight: true, otherNights: true,
  },
  AL_HADIKHIA: {
    id: 'AL_HADIKHIA', name: 'Al-Hadikhia', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* puedes elegir a 3 jugadores (todos descubren quiénes son): cada uno elige en silencio si vive o muere, pero si todos viven, todos mueren.',
    firstNight: false, otherNights: true,
  },
  KAZALI: {
    id: 'KAZALI', name: 'Kazali', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 jugador: muere. [Eliges los Esbirros en juego y qué jugadores son. -? a +? Forasteros]',
    firstNight: true, otherNights: true,
  },
  LEGION: {
    id: 'LEGION', name: 'Legión', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* 1 jugador puede morir. Las ejecuciones fallan si sólo votan los malos. Apareces también como Esbirro. [La mayoría de jugadores son Legión]',
    firstNight: true, otherNights: true,
  },
  LEVIATHAN: {
    id: 'LEVIATHAN', name: 'Leviatán', alignment: 'evil', type: 'demon',
    ability: 'Si más de 1 jugador bueno es ejecutado, los malos ganan. Todos los jugadores saben que estás en juego. Después del día 5, los malos ganan.',
    firstNight: true, otherNights: false,
  },
  LIL_MONSTA: {
    id: 'LIL_MONSTA', name: 'Lil’ Monsta', alignment: 'evil', type: 'demon',
    ability: 'Cada noche los Esbirros eligen quién cuida a Lil’ Monsta y «es el Demonio». Cada noche* 1 jugador puede morir. [+1 Esbirro]',
    firstNight: true, otherNights: true,
  },
  LLEECH: {
    id: 'LLEECH', name: 'Lleech', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 jugador: muere. Empiezas eligiendo 1 jugador: está envenenado. Mueres si y sólo si ese jugador está muerto.',
    firstNight: true, otherNights: true,
  },
  OJO: {
    id: 'OJO', name: 'Ojo', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 personaje: muere. Si no está en juego, el Narrador decide quién muere.',
    firstNight: false, otherNights: true,
  },
  RIOT: {
    id: 'RIOT', name: 'Riot', alignment: 'evil', type: 'demon',
    ability: 'En día 3, los Esbirros se convierten en Riot y los nominados mueren pero pueden nominar a un jugador vivo inmediatamente. Esto debe pasar.',
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
  'POPPY_GROWER', 'MAGICIAN',
  'PREACHER',     // antes de los Esbirros: les quita la habilidad esta noche
  'ENGINEER',     // antes que nadie: decide qué Esbirros / Demonio hay en juego
  'BOFFIN',       // demon conoce su habilidad buena antes de actuar
  'KAZALI', 'LEGION', 'LIL_MONSTA', 'LLEECH', 'RIOT', 'LEVIATHAN',
  // 'MARIONETTE' NO entra en la cola interactiva: es pasiva y no despierta con el mal.
  // Sin asterisco en su habilidad → estos Esbirros SÍ actúan la primera noche.
  'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER', 'SUMMONER', 'YAGGABABBLE',
  'SHUGENJA', 'STEWARD',
  'PUZZLEMASTER', 'ALCHEMIST',
  'HUNTSMAN',     // salva a la Damisela antes de que los Esbirros la busquen
  'BOUNTY_HUNTER', 'CULT_LEADER', 'NIGHTWATCHMAN', 'KNIGHT', 'NOBLE', 'DAMSEL', 'SNITCH',
  'BALLOONIST', 'GENERAL', 'HIGH_PRIESTESS', 'KING',
  'WIDOW',        // al final: mira el Grimorio completo tras todos los tokens colocados
];

const queueOther = [
  'POPPY_GROWER',
  'PREACHER',    // antes de esbirros: quita habilidad del esbirro elegido esa noche
  'LYCANTHROPE', // antes de demonios: si mata a bueno, bloquea ataque del demonio
  'ENGINEER',    // antes de demonios: cambia qué roles están en juego antes de que actúen
  'HUNTSMAN',    // antes de demonios: salva Damisela antes que actúe demonio (canónico)
  'LLEECH', 'KAZALI', 'LEGION', 'LIL_MONSTA', 'OJO', 'AL_HADIKHIA',
  'MEZEPHELES', 'FEARMONGER', 'HARPY', 'ORGAN_GRINDER', 'SUMMONER', 'YAGGABABBLE',
  'ACROBAT', 'CANNIBAL', 'BOUNTY_HUNTER', 'CULT_LEADER', 'NIGHTWATCHMAN',
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
