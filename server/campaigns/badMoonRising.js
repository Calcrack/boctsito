// ── Bad Moon Rising ────────────────────────────────────────────────
const tb = require('./troubleBrewing');

const roles = {
  // Townsfolk
  GRANDMOTHER: { id: 'GRANDMOTHER', name: 'Abuela', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo 1 jugador bueno y su personaje. Si el Demonio le mata, tú también mueres.', firstNight: true, otherNights: false },
  SAILOR: { id: 'SAILOR', name: 'Marinero', alignment: 'good', type: 'townfolk',
    ability: 'No puedes morir. Cada noche elige 1 jugador vivo: tú o ese jugador estáis borrachos hasta el crepúsculo.', firstNight: true, otherNights: true },
  CHAMBERMAID: { id: 'CHAMBERMAID', name: 'Sirvienta', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche elige 2 jugadores vivos (no a ti). Descubres cuántos han despertado esta noche por su habilidad.', firstNight: true, otherNights: true },
  EXORCIST: { id: 'EXORCIST', name: 'Exorcista', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* elige 1 jugador (diferente al de la noche anterior): si es el Demonio, éste sabe quién eres y no se despierta esta noche.', firstNight: false, otherNights: true },
  INNKEEPER: { id: 'INNKEEPER', name: 'Posadero', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* elige 2 jugadores: no pueden morir esta noche, pero 1 está borracho hasta el crepúsculo.', firstNight: false, otherNights: true },
  GAMBLER: { id: 'GAMBLER', name: 'Tahúr', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche* elige 1 jugador e intenta adivinar su personaje: si fallas, mueres.', firstNight: false, otherNights: true },
  GOSSIP: { id: 'GOSSIP', name: 'Chismoso', alignment: 'good', type: 'townfolk',
    ability: 'Cada día puedes hacer una declaración pública. Esta noche, si fue cierta, 1 jugador muere.', firstNight: false, otherNights: true },
  COURTIER: { id: 'COURTIER', name: 'Cortesano', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche, elige 1 personaje: está borracho durante 3 días y 3 noches.', firstNight: true, otherNights: true },
  PROFESSOR: { id: 'PROFESSOR', name: 'Profesor', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, por la noche*, elige 1 jugador muerto. Si es Aldeano, resucita.', firstNight: false, otherNights: true },
  MINSTREL: { id: 'MINSTREL', name: 'Juglar', alignment: 'good', type: 'townfolk',
    ability: 'Cuando un Esbirro muera por ejecución, todos los jugadores (salvo viajeros) están borrachos hasta el crepúsculo de mañana.', firstNight: false, otherNights: false },
  TEA_LADY: { id: 'TEA_LADY', name: 'Dama del Té', alignment: 'good', type: 'townfolk',
    ability: 'Si tus vecinos vivos son buenos, no pueden morir.', firstNight: false, otherNights: false },
  PACIFIST: { id: 'PACIFIST', name: 'Pacifista', alignment: 'good', type: 'townfolk',
    ability: 'Los jugadores buenos ejecutados pueden no morir.', firstNight: false, otherNights: false },
  FOOL: { id: 'FOOL', name: 'Bufón', alignment: 'good', type: 'townfolk',
    ability: 'La primera vez que mueras, no mueres.', firstNight: false, otherNights: false },
  // Outsiders
  GOON: { id: 'GOON', name: 'Matón', alignment: 'good', type: 'outsider',
    ability: 'Cada noche, el primer jugador que te elija por su habilidad está borracho hasta el crepúsculo. Te conviertes a su alineamiento.', firstNight: false, otherNights: false },
  LUNATIC: { id: 'LUNATIC', name: 'Lunático', alignment: 'good', type: 'outsider',
    ability: 'Crees que eres un Demonio, pero no lo eres. El Demonio sabe quién eres y a quién eliges por la noche.', firstNight: true, otherNights: true,
    // Capa 2: cree ser el Demonio. (La lógica nocturna completa requiere el orden de noche de BMR.)
    misperception: { believes: 'demon', wakesWithEvil: false, demonKnows: true } },
  TINKER: { id: 'TINKER', name: 'Manitas', alignment: 'good', type: 'outsider',
    ability: 'Puedes morir en cualquier momento.', firstNight: false, otherNights: false },
  MOONCHILD: { id: 'MOONCHILD', name: 'Niña de la Luna', alignment: 'good', type: 'outsider',
    ability: 'Cuando descubras que has muerto, elige públicamente 1 jugador vivo. Esta noche, si era bueno, muere.', firstNight: false, otherNights: false },
  // Minions
  GODFATHER: { id: 'GODFATHER', name: 'Padrino', alignment: 'evil', type: 'minion',
    ability: 'Empiezas conociendo qué Forasteros están en juego. Si 1 muere por el día, elige 1 jugador esta noche: muere. [-1 o +1 Forastero]', firstNight: true, otherNights: true },
  DEVILS_ADVOCATE: { id: 'DEVILS_ADVOCATE', name: 'Abogado del Diablo', alignment: 'evil', type: 'minion',
    ability: 'Cada noche elige 1 jugador vivo (diferente al de la noche anterior): si es ejecutado mañana, no muere.', firstNight: true, otherNights: true },
  ASSASSIN: { id: 'ASSASSIN', name: 'Asesino', alignment: 'evil', type: 'minion',
    ability: 'Una vez por partida, por la noche*, elige 1 jugador: muere, incluso si por otro motivo no pudiera.', firstNight: false, otherNights: true },
  MASTERMIND: { id: 'MASTERMIND', name: 'Mente Maestra', alignment: 'evil', type: 'minion',
    ability: 'Si el Demonio muere por ejecución (terminando la partida), juega 1 día más. Si 1 jugador es ejecutado ese día, su equipo pierde.', firstNight: false, otherNights: false },
  // Demons
  ZOMBUUL: { id: 'ZOMBUUL', name: 'Zombuul', alignment: 'evil', type: 'demon',
    ability: 'Cada noche*, si nadie ha muerto durante el día, elige 1 jugador: muere. La primera vez que mueras, vives pero apareces como muerto.', firstNight: false, otherNights: true },
  PUKKA: { id: 'PUKKA', name: 'Pukka', alignment: 'evil', type: 'demon',
    ability: 'Cada noche elige 1 jugador: está envenenado. El anterior jugador envenenado muere y después está sano.', firstNight: true, otherNights: true },
  SHABALOTH: { id: 'SHABALOTH', name: 'Shabaloth', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige 2 jugadores: mueren. 1 jugador muerto elegido la noche anterior puede ser regurgitado.', firstNight: false, otherNights: true },
  PO: { id: 'PO', name: 'Po', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* puedes elegir 1 jugador: muere. Si tu última elección fue no elegir a nadie, elige a 3 jugadores esta noche.', firstNight: false, otherNights: true },
};

// ── Tags de montaje/info (vocabulario en troubleBrewing.js) ──────────
const SETUP = {
  GODFATHER: { outsiderModifierChoice: [-1, 1], otherSecret: 'godfatherOutsiders' }, // narrador elige ±1 Forastero
  PUKKA:     { initialPoison: true, demonBluffs: 3 },
  LUNATIC:   { lunaticExtras: true }, // falseIdentity ya lo infiere misperception.believes='demon'
  ZOMBUUL:   { demonBluffs: 3 },
  SHABALOTH: { demonBluffs: 3 },
  PO:        { demonBluffs: 3 },
};
const INFO = {
  GRANDMOTHER: { firstNight: true, kind: 'knowGoodPlayer' },  // 1 jugador bueno + su personaje
  GODFATHER:   { firstNight: true, kind: 'knowOutsiders' },   // qué Forasteros hay
};
for (const [id, s] of Object.entries(SETUP)) if (roles[id]) roles[id].setup = s;
for (const [id, n] of Object.entries(INFO))  if (roles[id]) roles[id].info  = n;

// Colas interactivas del motor (espejo del orden de noche del cliente, sin marcadores *_INFO).
const queueFirst = ['LUNATIC', 'PUKKA', 'SAILOR', 'COURTIER', 'GODFATHER', 'DEVILS_ADVOCATE', 'GRANDMOTHER', 'CHAMBERMAID'];
const queueOther = ['SAILOR', 'COURTIER', 'INNKEEPER', 'DEVILS_ADVOCATE', 'LUNATIC', 'EXORCIST', 'ZOMBUUL', 'PUKKA', 'SHABALOTH', 'PO', 'ASSASSIN', 'GODFATHER', 'GAMBLER', 'GOSSIP', 'PROFESSOR', 'MINSTREL', 'TEA_LADY', 'PACIFIST', 'FOOL', 'MOONCHILD', 'GRANDMOTHER', 'CHAMBERMAID'];

module.exports = {
  id: 'BAD_MOON_RISING',
  name: 'Bad Moon Rising',
  roles,
  distribution: tb.distribution,
  outsiderModifiers: {}, // Padrino ±1 narrador elige en setup (outsiderModifierChoice)
  queueFirst,
  queueOther,
};
