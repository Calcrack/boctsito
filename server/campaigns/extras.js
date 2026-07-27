// ── Roles extra (no pertenecen a ninguna campaña base) ──────────────
// Personajes de `Mecanicas Personajes.txt` que no están en Trouble Brewing,
// Bad Moon Rising, Sects & Violets ni The Carousel, pero que aparecen en
// guiones personalizados. Se registran en ALL_ROLES para que el importador
// (`resolveId`) los resuelva en vez de crear un stub "(Rol desconocido)".
//
// El id interno normalizado (minúsculas, sin guiones bajos) coincide con el
// id canónico de botc: LORD_OF_TYPHON → "lordoftyphon".

const EXTRA_ROLES = {
  // ── ALDEANOS ──────────────────────────────────────────────────────
  ALSAAHIR: {
    id: 'ALSAAHIR', name: 'Alsaahir', alignment: 'good', type: 'townfolk',
    ability: 'Cada día, si adivinas públicamente qué jugadores son Esbirros y cuáles Demonios, ganan los buenos.',
    firstNight: false, otherNights: false,
    reminders: ['Adivinanza correcta'],
    narratorNote: 'Si acierta el reparto exacto del Mal, declara la victoria del Bien a mano.',
  },
  PIXIE: {
    id: 'PIXIE', name: 'Duendecillo', alignment: 'good', type: 'townfolk',
    ability: 'Empiezas conociendo 1 Aldeano en juego. Si estás loco de ser ese personaje, ganas su habilidad cuando muera.',
    firstNight: true, otherNights: false,
    reminders: ['Aldeano conocido', 'Habilidad heredada'],
    narratorNote: 'Impón la locura con "Cambiar rol → solo rol creído". Al morir el original, dale su personaje.',
  },
  PRINCESS: {
    id: 'PRINCESS', name: 'Princesa', alignment: 'good', type: 'townfolk',
    ability: 'En tu primer día, si nominas y ejecutan a ese jugador, el Demonio no mata esta noche.',
    firstNight: false, otherNights: false,
    reminders: ['El Demonio no mata'],
    narratorNote: 'Solo su PRIMER día. Si se cumple, salta el ataque del Demonio esa noche.',
  },
  VILLAGE_IDIOT: {
    id: 'VILLAGE_IDIOT', name: 'Tonto del Pueblo', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche elige un jugador: descubres su alineación. [+0 a +2 Tontos del Pueblo, uno de ellos borracho]',
    firstNight: true, otherNights: true,
    reminders: ['Borracho'],
    setupNote: 'Puede haber hasta 3 Tontos del Pueblo; exactamente uno está borracho.',
    narratorNote: 'Si hay varios, marca a uno como borracho y dale información falsa siempre.',
  },
  HERMIT: {
    id: 'HERMIT', name: 'Ermitaño', alignment: 'good', type: 'outsider',
    ability: 'Tienes todas las habilidades de Forastero. [−0 o −1 Forasteros]',
    firstNight: true, otherNights: true,
    reminders: ['Habilidades de Forastero'],
    setupNote: 'Puede haber 1 Forastero menos.',
    narratorNote: 'Acumula todas las habilidades de Forastero del guion: resuélvelas una por una cada noche.',
  },
  OGRE: {
    id: 'OGRE', name: 'Ogro', alignment: 'good', type: 'outsider',
    ability: 'En tu primera noche elige un jugador (no a ti): tomas su alineación, sin saber cuál, incluso borracho o envenenado.',
    firstNight: true, otherNights: false,
    reminders: ['Alineación copiada'],
    narratorNote: 'Cambia su alineación EN SILENCIO: él nunca debe saber si cambió.',
  },

  // ── ESBIRROS ──────────────────────────────────────────────────────
  GNOME: {
    id: 'GNOME', name: 'Gnomo', alignment: 'evil', type: 'minion',
    ability: 'Todos empiezan conociendo a un jugador de tu alineación. Puedes elegir matar a quien le nomine.',
    firstNight: true, otherNights: false,
    reminders: ['Jugador conocido'],
    narratorNote: 'Anuncia públicamente el nombre en la primera noche. Si alguien lo nomina, el Gnomo puede matarlo.',
  },
  WRAITH: {
    id: 'WRAITH', name: 'Espectro', alignment: 'evil', type: 'minion',
    ability: 'Puedes abrir los ojos por la noche. Despiertas cuando lo hagan los demás jugadores malvados.',
    firstNight: true, otherNights: true,
    reminders: ['Despierta con el Mal'],
    narratorNote: 'No tiene acción: solo observa. Despiértalo siempre que despiertes a otro malvado.',
  },

  // ── DEMONIOS ──────────────────────────────────────────────────────
  LORD_OF_TYPHON: {
    id: 'LORD_OF_TYPHON', name: 'Señor de Typhon', alignment: 'evil', type: 'demon',
    ability: 'Cada noche* elige un jugador: muere. [Los personajes malvados están en línea. Tú estás en el centro. +1 Esbirro. −? a +? Forasteros]',
    firstNight: false, otherNights: true,
    reminders: ['Muere'],
    setupNote: 'Los malvados se sientan en línea con el Señor de Typhon en el centro. +1 Esbirro.',
    narratorNote: 'Valida el orden de asientos en el montaje antes de bloquear el reparto.',
  },
  FIDDLER: {
    id: 'FIDDLER', name: 'Violinista', alignment: 'evil', type: 'demon',
    ability: 'Una vez por partida, de noche, elige un jugador del bando contrario: todos deciden en votación cuál de los 2 gana.',
    firstNight: false, otherNights: true,
    reminders: ['Elegido para el duelo'],
    narratorNote: 'Abre una votación especial entre los dos candidatos: el bando del ganador gana la partida.',
  },
  XAAN: {
    id: 'XAAN', name: 'Xaan', alignment: 'evil', type: 'demon',
    ability: 'En la noche X todos los Aldeanos están envenenados hasta el crepúsculo. [X Forasteros]',
    firstNight: true, otherNights: true,
    reminders: ['Noche X', 'Envenenado'],
    setupNote: 'El número de Forasteros define en qué noche (X) se envenena a todo el pueblo.',
    narratorNote: 'Lleva la cuenta de las noches: al llegar a X, envenena a TODOS los Aldeanos hasta el anochecer.',
  },

  // ── VIAJEROS ──────────────────────────────────────────────────────
  BEGGAR: {
    id: 'BEGGAR', name: 'Mendigo', alignment: 'good', type: 'traveler',
    ability: 'Debes usar una ficha de votación para votar. Si un jugador muerto te da la suya, descubres su alineación. Estás sobrio y sano.',
    firstNight: false, otherNights: false,
    reminders: ['Ficha de voto recibida'],
    narratorNote: 'Al recibir un voto fantasma, dile la alineación de quien se lo dio.',
  },
  BUREAUCRAT: {
    id: 'BUREAUCRAT', name: 'Burócrata', alignment: 'evil', type: 'traveler',
    ability: 'Cada noche elige un jugador (no a ti): su voto cuenta como 3 votos mañana.',
    firstNight: true, otherNights: true,
    reminders: ['Voto triple'],
  },
  THIEF: {
    id: 'THIEF', name: 'Ladrón', alignment: 'evil', type: 'traveler',
    ability: 'Cada noche elige un jugador (no a ti): su voto cuenta en negativo mañana.',
    firstNight: true, otherNights: true,
    reminders: ['Voto negativo'],
  },
  GUNSLINGER: {
    id: 'GUNSLINGER', name: 'Pistolero', alignment: 'evil', type: 'traveler',
    ability: 'Cada día, tras contarse la primera votación, puedes elegir un jugador que haya votado: muere.',
    firstNight: false, otherNights: false,
    reminders: ['Disparo usado hoy'],
    narratorNote: 'Solo entre los que votaron en esa nominación concreta.',
  },
  GANGSTER: {
    id: 'GANGSTER', name: 'Gánster', alignment: 'evil', type: 'traveler',
    ability: 'Una vez por día puedes matar a uno de tus vecinos vivos si el otro vecino vivo lo acepta.',
    firstNight: false, otherNights: false,
    reminders: ['Muerte usada hoy'],
    narratorNote: 'Solo vecinos vivos, y solo con el consentimiento explícito del otro vecino.',
  },
  SCAPEGOAT: {
    id: 'SCAPEGOAT', name: 'Chivo Expiatorio', alignment: 'good', type: 'traveler',
    ability: 'Si se ejecuta a un jugador de tu alineación, puedes morir tú en su lugar.',
    firstNight: false, otherNights: false,
    reminders: ['Sustitución usada'],
  },
  DOOMSAYER: {
    id: 'DOOMSAYER', name: 'Agorero', alignment: 'good', type: 'traveler',
    ability: 'Si quedan 4 o más vivos, cada jugador vivo puede, una vez por partida, declarar en público que muera un jugador de su alineación.',
    firstNight: false, otherNights: false,
    reminders: ['Declaración usada'],
    narratorNote: 'Un uso por jugador, no por Agorero. El objetivo debe ser de la alineación de quien declara.',
  },
  DUCHESS: {
    id: 'DUCHESS', name: 'Duquesa', alignment: 'evil', type: 'traveler',
    ability: 'Cada día 3 jugadores pueden visitarte. De noche* cada visitante sabe cuántos visitantes eran malvados, pero 1 recibe información falsa.',
    firstNight: false, otherNights: true,
    reminders: ['Visitante', 'Información falsa'],
    narratorNote: 'Marca a los 3 visitantes y a cuál de ellos le mientes.',
  },
  BIG_WIG: {
    id: 'BIG_WIG', name: 'Mandamás', alignment: 'evil', type: 'traveler',
    ability: 'Cada nominado elige un jugador: hasta la votación solo puede hablar el elegido, y está loco de que el nominado es bueno o puede morir.',
    firstNight: false, otherNights: false,
    reminders: ['Portavoz', 'Loco'],
    narratorNote: 'Silencia a todos menos al portavoz durante esa nominación.',
  },

  // ── FABULADOS (modifican las reglas de la partida) ────────────────
  ANGEL: {
    id: 'ANGEL', name: 'Ángel', alignment: 'good', type: 'fabled',
    ability: 'Algo malo puede pasarle a quien sea más responsable de la muerte de un jugador novato.',
    firstNight: false, otherNights: false,
    reminders: ['Jugador novato', 'Protegido'],
    narratorNote: 'Marca al novato. Si alguien lo mata sin motivo, castígalo como veas.',
  },
  BOOTLEGGER: {
    id: 'BOOTLEGGER', name: 'Contrabandista', alignment: 'good', type: 'fabled',
    ability: 'Este guion tiene personajes o reglas caseras.',
    firstNight: false, otherNights: false,
    narratorNote: 'Anota aquí las reglas caseras del guion y anúncialas al empezar.',
  },
  BUDDHIST: {
    id: 'BUDDHIST', name: 'Budista', alignment: 'good', type: 'fabled',
    ability: 'Durante los primeros 2 minutos de cada día, los jugadores veteranos no pueden hablar.',
    firstNight: false, otherNights: false,
    reminders: ['Veterano'],
    narratorNote: 'Marca quién es veterano y cronometra los 2 minutos de silencio.',
  },
  CACKLEJACK: {
    id: 'CACKLEJACK', name: 'Risistencia', alignment: 'good', type: 'fabled',
    ability: 'Cada día elige un jugador: un jugador DISTINTO cambia de personaje esta noche.',
    firstNight: false, otherNights: true,
    reminders: ['Cambia de personaje'],
    narratorNote: 'Usa "Cambiar rol" sobre el jugador distinto del elegido.',
  },
  DEUS_EX_FIASCO: {
    id: 'DEUS_EX_FIASCO', name: 'Deus Ex Fiasco', alignment: 'good', type: 'fabled',
    ability: 'Al menos una vez por partida el Narrador cometerá un error, lo corregirá y lo admitirá públicamente.',
    firstNight: false, otherNights: false,
    reminders: ['Error admitido'],
  },
  DJINN: {
    id: 'DJINN', name: 'Djinn', alignment: 'good', type: 'fabled',
    ability: 'Utiliza la regla especial del Djinn de este guion.',
    firstNight: false, otherNights: false,
    narratorNote: 'Escribe aquí la regla especial y anúnciala a todos antes de empezar.',
  },
  FERRYMAN: {
    id: 'FERRYMAN', name: 'Barquero', alignment: 'good', type: 'fabled',
    ability: 'En el último día, todos los jugadores muertos recuperan su voto.',
    firstNight: false, otherNights: false,
    narratorNote: 'Cuando decidas que es el último día, devuelve el voto fantasma a todos los muertos.',
  },
  FIBBIN: {
    id: 'FIBBIN', name: 'Fibbin', alignment: 'good', type: 'fabled',
    ability: 'Una vez por partida, un jugador bueno puede recibir información incorrecta.',
    firstNight: false, otherNights: false,
    reminders: ['Mentira usada'],
    narratorNote: 'Falsifica la información de un paso nocturno cualquiera. Una sola vez.',
  },
  GARDENER: {
    id: 'GARDENER', name: 'Jardinero', alignment: 'good', type: 'fabled',
    ability: 'El Narrador puede asignar uno o más personajes a jugadores concretos.',
    firstNight: false, otherNights: false,
    narratorNote: 'Usa la asignación manual del asistente de montaje.',
  },
  GOD_OF_UG: {
    id: 'GOD_OF_UG', name: 'Dios de Ug', alignment: 'good', type: 'fabled',
    ability: 'Hay un gorro Ug. Quien lo lleva solo puede hablar con un sonido, pero su voto cuenta doble. Si falla, pierde el gorro.',
    firstNight: false, otherNights: false,
    reminders: ['Gorro Ug'],
    narratorNote: 'La ficha del gorro pasa de jugador a jugador; su voto vale 2 mientras lo lleve.',
  },
  HELLS_LIBRARIAN: {
    id: 'HELLS_LIBRARIAN', name: 'Bibliotecario del Infierno', alignment: 'good', type: 'fabled',
    ability: 'Algo malo puede pasarle a quien hable cuando el Narrador pida silencio.',
    firstNight: false, otherNights: false,
    reminders: ['Habló en silencio'],
  },
  HINDU: {
    id: 'HINDU', name: 'Hindú', alignment: 'good', type: 'fabled',
    ability: 'Los primeros 4 jugadores que mueran se reencarnan en Viajeros de su misma alineación.',
    firstNight: false, otherNights: false,
    reminders: ['Reencarnado'],
    narratorNote: 'Al morir, conviértelos en Viajero con "Cambiar rol" conservando su alineación.',
  },
  KNAVES: {
    id: 'KNAVES', name: 'Truhanes', alignment: 'good', type: 'fabled',
    ability: 'Hay 2 Narradores: uno miente y otro dice la verdad. Una vez por partida, en el crepúsculo, pueden intercambiarse.',
    firstNight: false, otherNights: false,
    reminders: ['Intercambio usado'],
    narratorNote: 'La página admite varios narradores: acordad quién miente y anotad el intercambio.',
  },
  POPE: {
    id: 'POPE', name: 'Papa', alignment: 'good', type: 'fabled',
    ability: 'Hay personajes buenos duplicados en juego. Pueden ser faroles.',
    firstNight: false, otherNights: false,
    setupNote: 'Permite repartir el mismo personaje bueno a más de un jugador.',
  },
  REVOLUTIONARY: {
    id: 'REVOLUTIONARY', name: 'Revolucionario', alignment: 'good', type: 'fabled',
    ability: '2 jugadores vecinos son de la misma alineación. Una vez por partida, uno de ellos aparecerá de la alineación contraria.',
    firstNight: false, otherNights: false,
    reminders: ['Pareja', 'Registro falso usado'],
  },
  SENTINEL: {
    id: 'SENTINEL', name: 'Centinela', alignment: 'good', type: 'fabled',
    ability: 'Puede haber 1 Forastero más o 1 menos en juego.',
    firstNight: false, otherNights: false,
    setupNote: 'Modificador de reparto: ±1 Forastero, a criterio del narrador.',
  },
  SPIRIT_OF_IVORY: {
    id: 'SPIRIT_OF_IVORY', name: 'Espíritu de Marfil', alignment: 'good', type: 'fabled',
    ability: 'No puede haber más de 1 jugador malvado extra.',
    firstNight: false, otherNights: false,
    setupNote: 'Valida que el reparto no genere más de un malvado adicional.',
  },
  STORM_CATCHER: {
    id: 'STORM_CATCHER', name: 'Atrapa Tormentas', alignment: 'good', type: 'fabled',
    ability: 'Nombra un personaje bueno: si está en juego solo puede morir por ejecución, pero los malvados saben quién es.',
    firstNight: true, otherNights: false,
    reminders: ['Protegido', 'Conocido por el Mal'],
  },
  TOR: {
    id: 'TOR', name: 'Tor', alignment: 'good', type: 'fabled',
    ability: 'Los jugadores no conocen su personaje ni su alineación. Los descubren al morir.',
    firstNight: false, otherNights: false,
    narratorNote: 'No reveles los personajes al repartir: hazlo solo cuando cada jugador muera.',
  },
  TOYMAKER: {
    id: 'TOYMAKER', name: 'Juguetero', alignment: 'good', type: 'fabled',
    ability: 'El Demonio puede decidir no atacar una noche, y debe hacerlo al menos 1 vez por partida. Los malvados reciben su información inicial normal.',
    firstNight: false, otherNights: true,
    reminders: ['Noche sin ataque usada'],
  },
  VENTRILOQUIST: {
    id: 'VENTRILOQUIST', name: 'Ventrílocuo', alignment: 'good', type: 'fabled',
    ability: 'Si un jugador está loco de ser un personaje nuevo durante su nominación, puede no morir si lo ejecutan hoy.',
    firstNight: false, otherNights: false,
    reminders: ['Loco', 'Sobrevive la ejecución'],
  },
  ZEALOT: {
    id: 'ZEALOT', name: 'Fanático', alignment: 'good', type: 'fabled',
    ability: 'Si hay 5 o más jugadores vivos, debes votar en todas las nominaciones.',
    firstNight: false, otherNights: false,
    reminders: ['Voto obligatorio'],
  },
  ZENOMANCER: {
    id: 'ZENOMANCER', name: 'Zenomante', alignment: 'good', type: 'fabled',
    ability: 'Uno o más jugadores tienen una misión. Cuando la completan, reciben información verdadera.',
    firstNight: false, otherNights: true,
    reminders: ['Misión', 'Misión completada'],
    narratorNote: 'Escribe la misión de cada jugador y márcala como cumplida cuando corresponda.',
  },
};

// Modificadores de reparto que aportan estos personajes.
const EXTRA_SETUP_MODIFIERS = {
  LORD_OF_TYPHON: { minions: 1 },
  HERMIT:         { outsiders: -1 },
  SENTINEL:       { outsiders: 1 },
  XAAN:           { note: 'El número de Forasteros define la noche X.' },
  VILLAGE_IDIOT:  { note: 'Hasta 3 Tontos del Pueblo; uno de ellos borracho.' },
  POPE:           { note: 'Se permiten personajes buenos duplicados.' },
};

module.exports = { EXTRA_ROLES, EXTRA_SETUP_MODIFIERS };
