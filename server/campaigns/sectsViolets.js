// ── Sects & Violets ────────────────────────────────────────────────
const tb = require('./troubleBrewing');

const roles = {
  // Townsfolk
  CLOCKMAKER: { id: 'CLOCKMAKER', name: 'Relojero', alignment: 'good', type: 'townfolk',
    ability: 'Primera noche: sabes la distancia (en asientos) entre el Demonio y su Esbirro más cercano.', firstNight: true, otherNights: false },
  DREAMER: { id: 'DREAMER', name: 'Soñador', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: elige un jugador (no a ti ni Viajeros). Sabes 1 personaje bueno y 1 malvado, uno de ellos correcto.', firstNight: true, otherNights: true },
  SNAKE_CHARMER: { id: 'SNAKE_CHARMER', name: 'Encantador de Serpientes', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: elige un jugador vivo. Si es el Demonio, intercambiáis personaje y alineación, y queda envenenado.', firstNight: true, otherNights: true },
  MATHEMATICIAN: { id: 'MATHEMATICIAN', name: 'Matemático', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: sabes cuántas habilidades funcionaron de forma anormal (por otra habilidad) desde el amanecer.', firstNight: true, otherNights: true },
  FLOWERGIRL: { id: 'FLOWERGIRL', name: 'Niña de las Flores', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche*: sabes si un Demonio votó hoy.', firstNight: false, otherNights: true },
  TOWN_CRIER: { id: 'TOWN_CRIER', name: 'Pregonero', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche*: sabes si algún Esbirro nominó hoy.', firstNight: false, otherNights: true },
  ORACLE: { id: 'ORACLE', name: 'Oráculo', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche*: sabes cuántos jugadores muertos son malvados.', firstNight: false, otherNights: true },
  SAVANT: { id: 'SAVANT', name: 'Erudito', alignment: 'good', type: 'townfolk',
    ability: 'Cada día: visita al Narrador en privado para saber 2 cosas: 1 verdadera y 1 falsa.', firstNight: false, otherNights: false },
  SEAMSTRESS: { id: 'SEAMSTRESS', name: 'Costurera', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, de noche: elige 2 jugadores (no a ti). Sabes si son de la misma alineación.', firstNight: true, otherNights: true },
  PHILOSOPHER: { id: 'PHILOSOPHER', name: 'Filósofo', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, de noche: elige un personaje bueno. Ganas su habilidad. Si está en juego, queda borracho.', firstNight: true, otherNights: true },
  ARTIST: { id: 'ARTIST', name: 'Artista', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, de día: pregunta al Narrador en privado una pregunta de sí/no.', firstNight: false, otherNights: false },
  JUGGLER: { id: 'JUGGLER', name: 'Malabarista', alignment: 'good', type: 'townfolk',
    ability: 'Primer día: adivina en público hasta 5 personajes de jugadores. Esa noche, sabes cuántos acertaste.', firstNight: false, otherNights: true },
  SAGE: { id: 'SAGE', name: 'Sabio', alignment: 'good', type: 'townfolk',
    ability: 'Si el Demonio te mata, sabes que es 1 de 2 jugadores.', firstNight: false, otherNights: false },
  // Outsiders
  MUTANT: { id: 'MUTANT', name: 'Mutante', alignment: 'good', type: 'outsider',
    ability: 'Si finges ser un Forastero (estás "loco"), puedes ser ejecutado.', firstNight: false, otherNights: false },
  SWEETHEART: { id: 'SWEETHEART', name: 'Encanto', alignment: 'good', type: 'outsider',
    ability: 'Cuando mueres, 1 jugador queda borracho a partir de ese momento.', firstNight: false, otherNights: false },
  BARBER: { id: 'BARBER', name: 'Barbero', alignment: 'good', type: 'outsider',
    ability: 'Si mueres hoy o esta noche, el Demonio puede elegir 2 jugadores (no otro Demonio) para intercambiar sus personajes.', firstNight: false, otherNights: true },
  KLUTZ: { id: 'KLUTZ', name: 'Torpe', alignment: 'good', type: 'outsider',
    ability: 'Cuando sepas que has muerto, elige en público 1 jugador vivo: si es malvado, tu equipo pierde.', firstNight: false, otherNights: false },
  // Minions
  // La Gemela Malvada es ESBIRRO (malvada): la "gemela" buena es el otro
  // jugador, no ella. Estuvo mal clasificada como Forastero buena.
  EVIL_TWIN: { id: 'EVIL_TWIN', name: 'Gemela Malvada', alignment: 'evil', type: 'minion',
    ability: 'Tú y un jugador de alineación opuesta os conocéis. Si el bueno es ejecutado, gana el Mal. El Bien no gana mientras viváis ambos.', firstNight: true, otherNights: false },
  WITCH: { id: 'WITCH', name: 'Bruja', alignment: 'evil', type: 'minion',
    ability: 'Cada noche: elige un jugador. Si nomina mañana, muere. Si solo quedan 3 jugadores vivos, pierdes esta habilidad.', firstNight: true, otherNights: true },
  CERENOVUS: { id: 'CERENOVUS', name: 'Descerebrado', alignment: 'evil', type: 'minion',
    ability: 'Cada noche: elige un jugador y un personaje bueno: está "loco" como ese personaje mañana, o puede ser ejecutado.', firstNight: true, otherNights: true },
  PIT_HAG: { id: 'PIT_HAG', name: 'Brujo del Caldero', alignment: 'evil', type: 'minion',
    ability: 'Cada noche*: elige un jugador y un personaje (si no está en juego): se convierte en él. Si se crea un Demonio, las muertes de esa noche son arbitrarias.', firstNight: false, otherNights: true },
  // Demons
  FANG_GU: { id: 'FANG_GU', name: 'Fang Gu', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un jugador: muere. El 1er Forastero que mates se convierte en el nuevo Fang Gu y tú mueres. [+1 Forastero]', firstNight: false, otherNights: true },
  NO_DASHII: { id: 'NO_DASHII', name: 'No Dashii', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un jugador: muere. Tus 2 Aldeanos vecinos están envenenados.', firstNight: false, otherNights: true },
  VORTOX: { id: 'VORTOX', name: 'Vortox', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un jugador: muere. Las habilidades de los Aldeanos dan información falsa. Cada día sin ejecución, gana el Mal.', firstNight: false, otherNights: true },
  VIGORMORTIS: { id: 'VIGORMORTIS', name: 'Vigormortis', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*: elige un jugador: muere. Los Esbirros que mates conservan su habilidad y envenenan 1 Aldeano vecino. [-1 Forastero]', firstNight: false, otherNights: true },
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
