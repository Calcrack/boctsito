// ── Sects & Violets (cliente / UI) ─────────────────────────────────
export const roles = [
  // Aldeanos
  { id: 'CLOCKMAKER', name: 'Relojero', alignment: 'good', type: 'townfolk', img: '/assets/roles/clockmaker.png',
    ability: 'Primera noche: sabes la distancia (en asientos) entre el Demonio y su Esbirro más cercano.', controls: ['info'] },
  { id: 'DREAMER', name: 'Soñador', alignment: 'good', type: 'townfolk', img: '/assets/roles/dreamer.png',
    ability: 'Cada noche: elige un jugador. Sabes 1 personaje bueno y 1 malvado, uno de ellos correcto.', controls: ['info'] },
  { id: 'SNAKE_CHARMER', name: 'Encantador de Serpientes', alignment: 'good', type: 'townfolk', img: '/assets/roles/snakecharmer.png',
    ability: 'Cada noche: elige un jugador vivo. Si es el Demonio, intercambiáis personaje y alineación, y queda envenenado.', controls: ['info', 'poison'] },
  { id: 'MATHEMATICIAN', name: 'Matemático', alignment: 'good', type: 'townfolk', img: '/assets/roles/mathematician.png',
    ability: 'Cada noche: sabes cuántas habilidades funcionaron de forma anormal desde el amanecer.', controls: ['info'] },
  { id: 'FLOWERGIRL', name: 'Niña de las Flores', alignment: 'good', type: 'townfolk', img: '/assets/roles/flowergirl.png',
    ability: 'Cada noche*: sabes si un Demonio votó hoy.', controls: ['info'] },
  { id: 'TOWN_CRIER', name: 'Pregonero', alignment: 'good', type: 'townfolk', img: '/assets/roles/towncrier.png',
    ability: 'Cada noche*: sabes si algún Esbirro nominó hoy.', controls: ['info'] },
  { id: 'ORACLE', name: 'Oráculo', alignment: 'good', type: 'townfolk', img: '/assets/roles/oracle.png',
    ability: 'Cada noche*: sabes cuántos jugadores muertos son malvados.', controls: ['info'] },
  { id: 'SAVANT', name: 'Erudito', alignment: 'good', type: 'townfolk', img: '/assets/roles/savant.png',
    ability: 'Cada día: visita al Narrador en privado para saber 2 cosas: 1 verdadera y 1 falsa.', controls: ['info'] },
  { id: 'SEAMSTRESS', name: 'Costurera', alignment: 'good', type: 'townfolk', img: '/assets/roles/seamstress.png',
    ability: 'Una vez por partida, de noche: elige 2 jugadores (no a ti). Sabes si son de la misma alineación.', controls: ['info'] },
  { id: 'PHILOSOPHER', name: 'Filósofo', alignment: 'good', type: 'townfolk', img: '/assets/roles/philosopher.png',
    ability: 'Una vez por partida, de noche: elige un personaje bueno. Ganas su habilidad. Si está en juego, queda borracho.', controls: ['drunk', 'info'] },
  { id: 'ARTIST', name: 'Artista', alignment: 'good', type: 'townfolk', img: '/assets/roles/artist.png',
    ability: 'Una vez por partida, de día: pregunta al Narrador en privado una pregunta de sí/no.', controls: ['info'] },
  { id: 'JUGGLER', name: 'Malabarista', alignment: 'good', type: 'townfolk', img: '/assets/roles/juggler.png',
    ability: 'Primer día: adivina en público hasta 5 personajes. Esa noche, sabes cuántos acertaste.', controls: ['info'] },
  { id: 'SAGE', name: 'Sabio', alignment: 'good', type: 'townfolk', img: '/assets/roles/sage.png',
    ability: 'Si el Demonio te mata, sabes que es 1 de 2 jugadores.', controls: ['info'] },
  // Forasteros
  { id: 'MUTANT', name: 'Mutante', alignment: 'good', type: 'outsider', img: '/assets/roles/mutant.png',
    ability: 'Si finges ser un Forastero (estás "loco"), puedes ser ejecutado.', controls: ['info'] },
  { id: 'SWEETHEART', name: 'Encanto', alignment: 'good', type: 'outsider', img: '/assets/roles/sweetheart.png',
    ability: 'Cuando mueres, 1 jugador queda borracho a partir de ese momento.', controls: ['drunk'] },
  { id: 'BARBER', name: 'Barbero', alignment: 'good', type: 'outsider', img: '/assets/roles/barber.png',
    ability: 'Si mueres hoy o esta noche, el Demonio puede intercambiar los personajes de 2 jugadores.', controls: ['info'] },
  { id: 'KLUTZ', name: 'Torpe', alignment: 'good', type: 'outsider', img: '/assets/roles/klutz.png',
    ability: 'Cuando sepas que has muerto, elige en público 1 jugador vivo: si es malvado, tu equipo pierde.', controls: ['info'] },
  { id: 'EVIL_TWIN', name: 'Gemela Malvada', alignment: 'good', type: 'outsider', img: '/assets/roles/eviltwin.png',
    ability: 'Tú y un jugador de alineación opuesta os conocéis. Si el bueno es ejecutado, gana el Mal.', controls: ['info'] },
  // Esbirros
  { id: 'WITCH', name: 'Bruja', alignment: 'evil', type: 'minion', img: '/assets/roles/witch.png',
    ability: 'Cada noche: elige un jugador. Si nomina mañana, muere. Con solo 3 vivos, pierdes esta habilidad.', controls: ['kill', 'info'] },
  { id: 'CERENOVUS', name: 'Descerebrado', alignment: 'evil', type: 'minion', img: '/assets/roles/cerenovus.png',
    ability: 'Cada noche: elige un jugador y un personaje bueno: está "loco" como ese personaje mañana, o puede ser ejecutado.', controls: ['info'] },
  { id: 'PIT_HAG', name: 'Brujo del Caldero', alignment: 'evil', type: 'minion', img: '/assets/roles/pithag.png',
    ability: 'Cada noche*: elige un jugador y un personaje (si no está en juego): se convierte en él.', controls: ['info', 'kill'] },
  // Demonios
  { id: 'FANG_GU', name: 'Fang Gu', alignment: 'evil', type: 'demon', img: '/assets/roles/fanggu.png',
    ability: 'Cada noche*: elige un jugador: muere. El 1er Forastero que mates se convierte en Fang Gu y tú mueres.', controls: ['kill'] },
  { id: 'NO_DASHII', name: 'No Dashii', alignment: 'evil', type: 'demon', img: '/assets/roles/nodashii.png',
    ability: 'Cada noche*: elige un jugador: muere. Tus 2 Aldeanos vecinos están envenenados.', controls: ['kill', 'poison'] },
  { id: 'VORTOX', name: 'Vortox', alignment: 'evil', type: 'demon', img: '/assets/roles/vortox.png',
    ability: 'Cada noche*: elige un jugador: muere. Los Aldeanos dan info falsa. Cada día sin ejecución, gana el Mal.', controls: ['kill'] },
  { id: 'VIGORMORTIS', name: 'Vigormortis', alignment: 'evil', type: 'demon', img: '/assets/roles/vigormortis.png',
    ability: 'Cada noche*: elige un jugador: muere. Los Esbirros que mates conservan su habilidad y envenenan 1 Aldeano vecino.', controls: ['kill', 'poison'] },
];

export const firstNightOrder = ['PHILOSOPHER', 'MINION_INFO', 'DEMON_INFO', 'SNAKE_CHARMER', 'EVIL_TWIN', 'WITCH', 'CERENOVUS', 'CLOCKMAKER', 'DREAMER', 'SEAMSTRESS', 'MATHEMATICIAN'];
export const otherNightOrder = ['PHILOSOPHER', 'SNAKE_CHARMER', 'WITCH', 'CERENOVUS', 'PIT_HAG', 'FANG_GU', 'NO_DASHII', 'VORTOX', 'VIGORMORTIS', 'SWEETHEART', 'SAGE', 'BARBER', 'DREAMER', 'FLOWERGIRL', 'TOWN_CRIER', 'ORACLE', 'SEAMSTRESS', 'MATHEMATICIAN'];

// ── Fichas recordatorias (reminder tokens) por rol dueño ───────────────
export const reminders = {
  MATHEMATICIAN:  [{ id: 'ABNORMAL', label: 'Habilidad anormal', duration: 'night' }],
  SNAKE_CHARMER:  [{ id: 'POISONED', label: 'Envenenado', duration: 'permanent' }],
  PHILOSOPHER:    [{ id: 'IS_PHILOSOPHER', label: 'Es el Filósofo', duration: 'permanent' }, { id: 'DRUNK', label: 'Borracho', duration: 'permanent' }],
  FLOWERGIRL:     [{ id: 'DEMON_VOTED', label: 'Demonio votó', duration: 'night' }, { id: 'DEMON_NOT_VOTED', label: 'Demonio no votó', duration: 'night' }],
  TOWN_CRIER:     [{ id: 'MINION_NOM', label: 'Esbirro nominó', duration: 'night' }, { id: 'MINION_NOT_NOM', label: 'Esbirro no nominó', duration: 'night' }],
  BARBER:         [{ id: 'HAIRCUT', label: 'Corte de pelo hoy', duration: 'day' }, { id: 'ONCE', label: 'Una vez', duration: 'oneShot' }],
  SWEETHEART:     [{ id: 'CHARM', label: 'Encanto (borracho)', duration: 'permanent' }],
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
