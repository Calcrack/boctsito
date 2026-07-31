// ── Sects & Violets ────────────────────────────────────────────────
const tb = require('./troubleBrewing');

const roles = {
  // Townsfolk
  CLOCKMAKER: { id: 'CLOCKMAKER', name: 'Relojero', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas sabiendo a cuántos pasos está el Demonio de su Esbirro más cercano.', firstNight: true, otherNights: false },
  DREAMER: { id: 'DREAMER', name: 'Soñador', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche elige 1 jugador (no a ti o viajeros): descubres 1 personaje bueno y 1 personaje malo, 1 de ellos es correcto.', firstNight: true, otherNights: true },
  SNAKE_CHARMER: { id: 'SNAKE_CHARMER', name: 'Encantador de Serpientes', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche elige 1 jugador vivo: si es el Demonio intercambiáis personajes y alineamiento y después está envenenado.', firstNight: true, otherNights: true },
  MATHEMATICIAN: { id: 'MATHEMATICIAN', name: 'Matemático', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche sabes cuántas habilidades de personajes han funcionado anormalmente (desde el amanecer) por las habilidades de otros personajes.', firstNight: true, otherNights: true },
  FLOWERGIRL: { id: 'FLOWERGIRL', name: 'Florista', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* descubres si el Demonio ha votado hoy.', firstNight: false, otherNights: true },
  TOWN_CRIER: { id: 'TOWN_CRIER', name: 'Pregonero', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* descubres si 1 Esbirro ha nominado hoy.', firstNight: false, otherNights: true },
  ORACLE: { id: 'ORACLE', name: 'Oráculo', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* sabes cuántos jugadores muertos son malos.', firstNight: false, otherNights: true },
  SAVANT: { id: 'SAVANT', name: 'Erudito', alignment: 'good', type: 'townfolk',
    ability: 'Cada día puedes visitar en privado al Narrador para que te diga 2 informaciones: 1 es cierta y 1 es falsa.', firstNight: false, otherNights: false },
  SEAMSTRESS: { id: 'SEAMSTRESS', name: 'Costurera', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche, elige 2 jugadores (no a ti): descubres si son del mismo alineamiento.', firstNight: true, otherNights: true },
  PHILOSOPHER: { id: 'PHILOSOPHER', name: 'Filósofo', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche, elige 1 personaje bueno: ganas su habilidad. Si el personaje está en juego, está borracho.', firstNight: true, otherNights: true },
  ARTIST: { id: 'ARTIST', name: 'Artista', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, durante el día, hazle en privado al Narrador una pregunta de sí o no.', firstNight: false, otherNights: false },
  JUGGLER: { id: 'JUGGLER', name: 'Malabarista', alignment: 'good', type: 'townfolk',
    ability: 'En tu primer día declara públicamente el personaje de hasta 5 jugadores. Esta noche sabes cuántos has acertado.', firstNight: false, otherNights: true },
  SAGE: { id: 'SAGE', name: 'Sabio', alignment: 'good', type: 'townfolk',
    ability: 'Si el Demonio te mata descubres que es 1 de 2 jugadores.', firstNight: false, otherNights: false },
  // Outsiders
  MUTANT: { id: 'MUTANT', name: 'Mutante', alignment: 'good', type: 'outsider',
    ability: 'Si estás loco sobre que eres un Forastero, puedes ser ejecutado.', firstNight: false, otherNights: false },
  SWEETHEART: { id: 'SWEETHEART', name: 'Adorable', alignment: 'good', type: 'outsider',
    ability: 'Cuando mueras, 1 jugador está borracho.', firstNight: false, otherNights: false },
  BARBER: { id: 'BARBER', name: 'Barbero', alignment: 'good', type: 'outsider',
    ability: 'Cuando mueras, el Demonio puede elegir 2 jugadores por la noche (no otro Demonio) para que intercambien personajes.', firstNight: false, otherNights: true },
  KLUTZ: { id: 'KLUTZ', name: 'Patoso', alignment: 'good', type: 'outsider',
    ability: 'Cuando descubras que has muerto, elige públicamente 1 jugador vivo: si es malo, tu equipo pierde.', firstNight: false, otherNights: false },
  // Minions
  // La Gemela Malvada es ESBIRRO (malvada): la "gemela" buena es el otro
  // jugador, no ella. Estuvo mal clasificada como Forastero buena.
  EVIL_TWIN: { id: 'EVIL_TWIN', name: 'Gemela Malvada', alignment: 'evil', type: 'minion',
    ability: 'Tú y 1 jugador del equipo contrario os conocéis. Si el jugador bueno es ejecutado, los malos ganan. Los buenos no pueden ganar si ambos vivís.', firstNight: true, otherNights: false },
  WITCH: { id: 'WITCH', name: 'Bruja', alignment: 'evil', type: 'minion',
    ability: 'Cada noche elige 1 jugador: si mañana nomina, muere. Si sólo hay 3 jugadores vivos pierdes esta habilidad.', firstNight: true, otherNights: true },
  CERENOVUS: { id: 'CERENOVUS', name: 'Cerenovus', alignment: 'evil', type: 'minion',
    ability: 'Cada noche, elige 1 jugador y 1 personaje bueno: mañana el jugador está loco sobre que es ese personaje o puede ser ejecutado.', firstNight: true, otherNights: true },
  PIT_HAG: { id: 'PIT_HAG', name: 'Pit-Hag', alignment: 'evil', type: 'minion',
    ability: 'Cada noche* elige 1 jugador y 1 personaje al que se convierte (si no está en juego). Si creas un Demonio, las muertes esta noche son arbitrarias.', firstNight: false, otherNights: true },
  // Demons
  FANG_GU: { id: 'FANG_GU', name: 'Fang Gu', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 jugador: muere. El primer Forastero que mates se convierte en Fang Gu malo y, en vez de morir, mueres tú. [+1 Forastero]', firstNight: false, otherNights: true },
  NO_DASHII: { id: 'NO_DASHII', name: 'No Dashii', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 jugador: muere. Tus 2 vecinos Aldeanos están envenenados.', firstNight: false, otherNights: true },
  VORTOX: { id: 'VORTOX', name: 'Vortox', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 jugador: muere. Las habilidades de los Aldeanos dan información falsa. Cada día, si nadie es ejecutado, ganan los malos.', firstNight: false, otherNights: true },
  VIGORMORTIS: { id: 'VIGORMORTIS', name: 'Vigormortis', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 1 jugador: muere. Los Esbirros que mates mantienen su habilidad y 1 Aldeano vecino suyo está envenenado. [-1 Forastero]', firstNight: false, otherNights: true },
};

// ── Tags de montaje/info (vocabulario en troubleBrewing.js) ──────────
const SETUP = {
  FANG_GU:     { outsiderModifier: 1, demonBluffs: 3 },
  VIGORMORTIS: { outsiderModifier: -1, demonBluffs: 3 },
  NO_DASHII:   { demonBluffs: 3 },
  VORTOX:      { demonBluffs: 3 }, // el motor detecta Vortox → info de Aldeanos FORZOSAMENTE falsa
  EVIL_TWIN:   { otherSecret: 'evilTwin' },
};
const INFO = {
  CLOCKMAKER: { firstNight: true, kind: 'clockmaker' }, // distancia Demonio↔Esbirro más cercano
};
for (const [id, s] of Object.entries(SETUP)) if (roles[id]) roles[id].setup = s;
for (const [id, n] of Object.entries(INFO))  if (roles[id]) roles[id].info  = n;

// Colas interactivas del motor (espejo del orden de noche del cliente, sin marcadores *_INFO).
const queueFirst = ['PHILOSOPHER', 'SNAKE_CHARMER', 'EVIL_TWIN', 'WITCH', 'CERENOVUS', 'CLOCKMAKER', 'DREAMER', 'SEAMSTRESS', 'MATHEMATICIAN'];
const queueOther = ['PHILOSOPHER', 'SNAKE_CHARMER', 'WITCH', 'CERENOVUS', 'PIT_HAG', 'FANG_GU', 'NO_DASHII', 'VORTOX', 'VIGORMORTIS', 'SWEETHEART', 'SAGE', 'BARBER', 'JUGGLER', 'DREAMER', 'FLOWERGIRL', 'TOWN_CRIER', 'ORACLE', 'SEAMSTRESS', 'MATHEMATICIAN'];

module.exports = {
  id: 'SECTS_AND_VIOLETS',
  name: 'Sects & Violets',
  roles,
  distribution: tb.distribution,
  outsiderModifiers: { FANG_GU: 1, VIGORMORTIS: -1 },
  queueFirst,
  queueOther,
};
