// ── Sects & Violets (cliente / UI) ─────────────────────────────────
export const roles = [
  // Aldeanos
  { id: 'CLOCKMAKER', name: 'Relojero', alignment: 'good', type: 'townfolk', img: '/assets/roles/clockmaker.png',
    ability: 'Empiezas sabiendo a cuántos pasos está el Demonio de su Esbirro más cercano.', controls: ['info'] },
  { id: 'DREAMER', name: 'Soñador', alignment: 'good', type: 'townfolk', img: '/assets/roles/dreamer.png',
    ability: 'Cada noche elige 1 jugador (no a ti o viajeros): descubres 1 personaje bueno y 1 personaje malo, 1 de ellos es correcto.', controls: ['info'] },
  { id: 'SNAKE_CHARMER', name: 'Encantador de Serpientes', alignment: 'good', type: 'townfolk', img: '/assets/roles/snakecharmer.png',
    ability: 'Cada noche elige 1 jugador vivo: si es el Demonio intercambiáis personajes y alineamiento y después está envenenado.', controls: ['info', 'poison'] },
  { id: 'MATHEMATICIAN', name: 'Matemático', alignment: 'good', type: 'townfolk', img: '/assets/roles/mathematician.png',
    ability: 'Cada noche sabes cuántas habilidades de personajes han funcionado anormalmente (desde el amanecer) por las habilidades de otros personajes.', controls: ['info'] },
  { id: 'FLOWERGIRL', name: 'Florista', alignment: 'good', type: 'townfolk', img: '/assets/roles/flowergirl.png',
    ability: 'Cada noche* descubres si el Demonio ha votado hoy.', controls: ['info'] },
  { id: 'TOWN_CRIER', name: 'Pregonero', alignment: 'good', type: 'townfolk', img: '/assets/roles/towncrier.png',
    ability: 'Cada noche* descubres si 1 Esbirro ha nominado hoy.', controls: ['info'] },
  { id: 'ORACLE', name: 'Oráculo', alignment: 'good', type: 'townfolk', img: '/assets/roles/oracle.png',
    ability: 'Cada noche* sabes cuántos jugadores muertos son malos.', controls: ['info'] },
  { id: 'SAVANT', name: 'Erudito', alignment: 'good', type: 'townfolk', img: '/assets/roles/savant.png',
    ability: 'Cada día puedes visitar en privado al Narrador para que te diga 2 informaciones: 1 es cierta y 1 es falsa.', controls: ['info'] },
  { id: 'SEAMSTRESS', name: 'Costurera', alignment: 'good', type: 'townfolk', img: '/assets/roles/seamstress.png',
    ability: 'Una vez por partida, por la noche, elige 2 jugadores (no a ti): descubres si son del mismo alineamiento.', controls: ['info'] },
  { id: 'PHILOSOPHER', name: 'Filósofo', alignment: 'good', type: 'townfolk', img: '/assets/roles/philosopher.png',
    ability: 'Una vez por partida, por la noche, elige 1 personaje bueno: ganas su habilidad. Si el personaje está en juego, está borracho.', controls: ['drunk', 'info'] },
  { id: 'ARTIST', name: 'Artista', alignment: 'good', type: 'townfolk', img: '/assets/roles/artist.png',
    ability: 'Una vez por partida, durante el día, hazle en privado al Narrador una pregunta de sí o no.', controls: ['info'] },
  { id: 'JUGGLER', name: 'Malabarista', alignment: 'good', type: 'townfolk', img: '/assets/roles/juggler.png',
    ability: 'En tu primer día declara públicamente el personaje de hasta 5 jugadores. Esta noche sabes cuántos has acertado.', controls: ['info'] },
  { id: 'SAGE', name: 'Sabio', alignment: 'good', type: 'townfolk', img: '/assets/roles/sage.png',
    ability: 'Si el Demonio te mata descubres que es 1 de 2 jugadores.', controls: ['info'] },
  // Forasteros
  { id: 'MUTANT', name: 'Mutante', alignment: 'good', type: 'outsider', img: '/assets/roles/mutant.png',
    ability: 'Si estás loco sobre que eres un Forastero, puedes ser ejecutado.', controls: ['info'] },
  { id: 'SWEETHEART', name: 'Adorable', alignment: 'good', type: 'outsider', img: '/assets/roles/sweetheart.png',
    ability: 'Cuando mueras, 1 jugador está borracho.', controls: ['drunk'] },
  { id: 'BARBER', name: 'Barbero', alignment: 'good', type: 'outsider', img: '/assets/roles/barber.png',
    ability: 'Cuando mueras, el Demonio puede elegir 2 jugadores por la noche (no otro Demonio) para que intercambien personajes.', controls: ['info'] },
  { id: 'KLUTZ', name: 'Patoso', alignment: 'good', type: 'outsider', img: '/assets/roles/klutz.png',
    ability: 'Cuando descubras que has muerto, elige públicamente 1 jugador vivo: si es malo, tu equipo pierde.', controls: ['info'] },
  // Esbirros
  // Espejo del servidor: la Gemela Malvada es Esbirro (malvada).
  { id: 'EVIL_TWIN', name: 'Gemela Malvada', alignment: 'evil', type: 'minion', img: '/assets/roles/eviltwin.png',
    ability: 'Tú y 1 jugador del equipo contrario os conocéis. Si el jugador bueno es ejecutado, los malos ganan. Los buenos no pueden ganar si ambos vivís.', controls: ['info'] },
  { id: 'WITCH', name: 'Bruja', alignment: 'evil', type: 'minion', img: '/assets/roles/witch.png',
    ability: 'Cada noche elige 1 jugador: si mañana nomina, muere. Si sólo hay 3 jugadores vivos pierdes esta habilidad.', controls: ['kill', 'info'] },
  { id: 'CERENOVUS', name: 'Cerenovus', alignment: 'evil', type: 'minion', img: '/assets/roles/cerenovus.png',
    ability: 'Cada noche, elige 1 jugador y 1 personaje bueno: mañana el jugador está loco sobre que es ese personaje o puede ser ejecutado.', controls: ['info'] },
  { id: 'PIT_HAG', name: 'Pit-Hag', alignment: 'evil', type: 'minion', img: '/assets/roles/pithag.png',
    ability: 'Cada noche* elige 1 jugador y 1 personaje al que se convierte (si no está en juego). Si creas un Demonio, las muertes esta noche son arbitrarias.', controls: ['info', 'kill'] },
  // Demonios
  { id: 'FANG_GU', name: 'Fang Gu', alignment: 'evil', type: 'demon', img: '/assets/roles/fanggu.png',
    ability: 'Cada noche* elige 1 jugador: muere. El primer Forastero que mates se convierte en Fang Gu malo y, en vez de morir, mueres tú. [+1 Forastero]', controls: ['kill'] },
  { id: 'NO_DASHII', name: 'No Dashii', alignment: 'evil', type: 'demon', img: '/assets/roles/nodashii.png',
    ability: 'Cada noche* elige 1 jugador: muere. Tus 2 vecinos Aldeanos están envenenados.', controls: ['kill', 'poison'] },
  { id: 'VORTOX', name: 'Vortox', alignment: 'evil', type: 'demon', img: '/assets/roles/vortox.png',
    ability: 'Cada noche* elige 1 jugador: muere. Las habilidades de los Aldeanos dan información falsa. Cada día, si nadie es ejecutado, ganan los malos.', controls: ['kill'] },
  { id: 'VIGORMORTIS', name: 'Vigormortis', alignment: 'evil', type: 'demon', img: '/assets/roles/vigormortis.png',
    ability: 'Cada noche* elige 1 jugador: muere. Los Esbirros que mates mantienen su habilidad y 1 Aldeano vecino suyo está envenenado. [-1 Forastero]', controls: ['kill', 'poison'] },
];

export const firstNightOrder = ['PHILOSOPHER', 'MINION_INFO', 'DEMON_INFO', 'SNAKE_CHARMER', 'EVIL_TWIN', 'WITCH', 'CERENOVUS', 'CLOCKMAKER', 'DREAMER', 'SEAMSTRESS', 'MATHEMATICIAN'];
export const otherNightOrder = ['PHILOSOPHER', 'SNAKE_CHARMER', 'WITCH', 'CERENOVUS', 'PIT_HAG', 'FANG_GU', 'NO_DASHII', 'VORTOX', 'VIGORMORTIS', 'SWEETHEART', 'SAGE', 'BARBER', 'JUGGLER', 'DREAMER', 'FLOWERGIRL', 'TOWN_CRIER', 'ORACLE', 'SEAMSTRESS', 'MATHEMATICIAN'];

// ── Fichas recordatorias (reminder tokens) por rol dueño ───────────────
export const reminders = {
  MATHEMATICIAN:  [{ id: 'ABNORMAL', label: 'Habilidad anormal', duration: 'night' }],
  SNAKE_CHARMER:  [{ id: 'POISONED', label: 'Envenenado', duration: 'permanent' }],
  PHILOSOPHER:    [{ id: 'IS_PHILOSOPHER', label: 'Es el Filósofo', duration: 'permanent' }, { id: 'DRUNK', label: 'Borracho', duration: 'permanent' }],
  FLOWERGIRL:     [{ id: 'DEMON_VOTED', label: 'Demonio votó', duration: 'night' }, { id: 'DEMON_NOT_VOTED', label: 'Demonio no votó', duration: 'night' }],
  TOWN_CRIER:     [{ id: 'MINION_NOM', label: 'Esbirro nominó', duration: 'night' }, { id: 'MINION_NOT_NOM', label: 'Esbirro no nominó', duration: 'night' }],
  BARBER:         [{ id: 'HAIRCUT', label: 'Corte de pelo hoy', duration: 'day' }, { id: 'ONCE', label: 'Una vez', duration: 'oneShot' }],
  SWEETHEART:     [{ id: 'CHARM', label: 'Adorable (borracho)', duration: 'permanent' }],
  CERENOVUS:      [{ id: 'MAD', label: 'Maldito / Loco', duration: 'day' }],
  EVIL_TWIN:      [{ id: 'TWIN', label: 'Gemela', duration: 'permanent' }],
  MUTANT:         [{ id: 'CONVINCED', label: 'Convencido (loco)', duration: 'permanent' }],
  NO_DASHII:      [{ id: 'POISONED1', label: 'Envenenado', duration: 'permanent' }, { id: 'POISONED2', label: 'Envenenado', duration: 'permanent' }],
  VIGORMORTIS:    [{ id: 'WITH_ABILITY', label: 'Con habilidad', duration: 'permanent' }, { id: 'POISONED', label: 'Envenenado', duration: 'permanent' }],
  VORTOX:         [{ id: 'DIES', label: 'Muere', duration: 'night' }],
};

export default {
  id: 'SECTS_AND_VIOLETS',
  name: 'Sects & Violets',
  roles,
  firstNightOrder,
  otherNightOrder,
  reminders,
};
