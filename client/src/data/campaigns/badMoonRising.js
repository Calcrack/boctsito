// ── Bad Moon Rising (cliente / UI) ─────────────────────────────────
// controls: botones genéricos que el narrador puede usar para ese rol.
//   kill · poison · drunk · protect · safe · revive   (+ caja de info siempre)
export const roles = [
  // Aldeanos
  { id: 'GRANDMOTHER', name: 'Abuela', alignment: 'good', type: 'townfolk', img: '/assets/roles/grandmother.png',
    ability: 'Empiezas conociendo 1 jugador bueno y su personaje. Si el Demonio le mata, tú también mueres.', controls: ['info'] },
  { id: 'SAILOR', name: 'Marinero', alignment: 'good', type: 'townfolk', img: '/assets/roles/sailor.png',
    ability: 'No puedes morir. Cada noche elige 1 jugador vivo: tú o ese jugador estáis borrachos hasta el crepúsculo.', controls: ['drunk', 'safe'] },
  { id: 'CHAMBERMAID', name: 'Sirvienta', alignment: 'good', type: 'townfolk', img: '/assets/roles/chambermaid.png',
    ability: 'Cada noche elige 2 jugadores vivos (no a ti). Descubres cuántos han despertado esta noche por su habilidad.', controls: ['info'] },
  { id: 'EXORCIST', name: 'Exorcista', alignment: 'good', type: 'townfolk', img: '/assets/roles/exorcist.png',
    ability: 'Cada noche* elige 1 jugador (diferente al de la noche anterior): si es el Demonio, éste sabe quién eres y no se despierta esta noche.', controls: ['info'] },
  { id: 'INNKEEPER', name: 'Posadero', alignment: 'good', type: 'townfolk', img: '/assets/roles/innkeeper.png',
    ability: 'Cada noche* elige 2 jugadores: no pueden morir esta noche, pero 1 está borracho hasta el crepúsculo.', controls: ['safe', 'drunk'] },
  { id: 'GAMBLER', name: 'Tahúr', alignment: 'good', type: 'townfolk', img: '/assets/roles/gambler.png',
    ability: 'Cada noche* elige 1 jugador e intenta adivinar su personaje: si fallas, mueres.', controls: ['kill', 'info'] },
  { id: 'GOSSIP', name: 'Chismoso', alignment: 'good', type: 'townfolk', img: '/assets/roles/gossip.png',
    ability: 'Cada día puedes hacer una declaración pública. Esta noche, si fue cierta, 1 jugador muere.', controls: ['kill'] },
  { id: 'COURTIER', name: 'Cortesano', alignment: 'good', type: 'townfolk', img: '/assets/roles/courtier.png',
    ability: 'Una vez por partida, por la noche, elige 1 personaje: está borracho durante 3 días y 3 noches.', controls: ['drunk'] },
  { id: 'PROFESSOR', name: 'Profesor', alignment: 'good', type: 'townfolk', img: '/assets/roles/professor.png',
    ability: 'Una vez por partida, por la noche*, elige 1 jugador muerto. Si es Aldeano, resucita.', controls: ['revive'] },
  { id: 'MINSTREL', name: 'Juglar', alignment: 'good', type: 'townfolk', img: '/assets/roles/minstrel.png',
    ability: 'Cuando un Esbirro muera por ejecución, todos los jugadores (salvo viajeros) están borrachos hasta el crepúsculo de mañana.', controls: ['drunk'] },
  { id: 'TEA_LADY', name: 'Dama del Té', alignment: 'good', type: 'townfolk', img: '/assets/roles/tealady.png',
    ability: 'Si tus vecinos vivos son buenos, no pueden morir.', controls: ['safe'] },
  { id: 'PACIFIST', name: 'Pacifista', alignment: 'good', type: 'townfolk', img: '/assets/roles/pacifist.png',
    ability: 'Los jugadores buenos ejecutados pueden no morir.', controls: ['info'] },
  { id: 'FOOL', name: 'Bufón', alignment: 'good', type: 'townfolk', img: '/assets/roles/fool.png',
    ability: 'La primera vez que mueras, no mueres.', controls: ['info'] },
  // Forasteros
  { id: 'GOON', name: 'Matón', alignment: 'good', type: 'outsider', img: '/assets/roles/goon.png',
    ability: 'Cada noche, el primer jugador que te elija por su habilidad está borracho hasta el crepúsculo. Te conviertes a su alineamiento.', controls: ['drunk', 'info'] },
  { id: 'LUNATIC', name: 'Lunático', alignment: 'good', type: 'outsider', img: '/assets/roles/lunatic.png',
    ability: 'Crees que eres un Demonio, pero no lo eres. El Demonio sabe quién eres y a quién eliges por la noche.', controls: ['info'] },
  { id: 'TINKER', name: 'Manitas', alignment: 'good', type: 'outsider', img: '/assets/roles/tinker.png',
    ability: 'Puedes morir en cualquier momento.', controls: ['kill'] },
  { id: 'MOONCHILD', name: 'Niña de la Luna', alignment: 'good', type: 'outsider', img: '/assets/roles/moonchild.png',
    ability: 'Cuando descubras que has muerto, elige públicamente 1 jugador vivo. Esta noche, si era bueno, muere.', controls: ['kill'] },
  // Esbirros
  { id: 'GODFATHER', name: 'Padrino', alignment: 'evil', type: 'minion', img: '/assets/roles/godfather.png',
    ability: 'Empiezas conociendo qué Forasteros están en juego. Si 1 muere por el día, elige 1 jugador esta noche: muere. [-1 o +1 Forastero]', controls: ['info', 'kill'] },
  { id: 'DEVILS_ADVOCATE', name: 'Abogado del Diablo', alignment: 'evil', type: 'minion', img: '/assets/roles/devilsadvocate.png',
    ability: 'Cada noche elige 1 jugador vivo (diferente al de la noche anterior): si es ejecutado mañana, no muere.', controls: ['safe', 'info'] },
  { id: 'ASSASSIN', name: 'Asesino', alignment: 'evil', type: 'minion', img: '/assets/roles/assassin.png',
    ability: 'Una vez por partida, por la noche*, elige 1 jugador: muere, incluso si por otro motivo no pudiera.', controls: ['kill'] },
  { id: 'MASTERMIND', name: 'Mente Maestra', alignment: 'evil', type: 'minion', img: '/assets/roles/mastermind.png',
    ability: 'Si el Demonio muere por ejecución (terminando la partida), juega 1 día más. Si 1 jugador es ejecutado ese día, su equipo pierde.', controls: ['info'] },
  // Demonios
  { id: 'ZOMBUUL', name: 'Zombuul', alignment: 'evil', type: 'demon', img: '/assets/roles/zombuul.png',
    ability: 'Cada noche*, si nadie ha muerto durante el día, elige 1 jugador: muere. La primera vez que mueras, vives pero apareces como muerto.', controls: ['kill'] },
  { id: 'PUKKA', name: 'Pukka', alignment: 'evil', type: 'demon', img: '/assets/roles/pukka.png',
    ability: 'Cada noche elige 1 jugador: está envenenado. El anterior jugador envenenado muere y después está sano.', controls: ['poison', 'kill'] },
  { id: 'SHABALOTH', name: 'Shabaloth', alignment: 'evil', type: 'demon', img: '/assets/roles/shabaloth.png',
    ability: 'Cada noche* elige 2 jugadores: mueren. 1 jugador muerto elegido la noche anterior puede ser regurgitado.', controls: ['kill', 'revive'] },
  { id: 'PO', name: 'Po', alignment: 'evil', type: 'demon', img: '/assets/roles/po.png',
    ability: 'Cada noche* puedes elegir 1 jugador: muere. Si tu última elección fue no elegir a nadie, elige a 3 jugadores esta noche.', controls: ['kill'] },
];

export const firstNightOrder = ['MINION_INFO', 'LUNATIC', 'DEMON_INFO', 'PUKKA', 'SAILOR', 'COURTIER', 'GODFATHER', 'DEVILS_ADVOCATE', 'GRANDMOTHER', 'CHAMBERMAID'];
export const otherNightOrder = ['SAILOR', 'COURTIER', 'INNKEEPER', 'DEVILS_ADVOCATE', 'LUNATIC', 'EXORCIST', 'ZOMBUUL', 'PUKKA', 'SHABALOTH', 'PO', 'ASSASSIN', 'GODFATHER', 'GAMBLER', 'GOSSIP', 'PROFESSOR', 'MINSTREL', 'TEA_LADY', 'PACIFIST', 'FOOL', 'MOONCHILD', 'GRANDMOTHER', 'CHAMBERMAID'];

// ── Fichas recordatorias (reminder tokens) por rol dueño ───────────────
export const reminders = {
  GRANDMOTHER:    [{ id: 'GRANDCHILD', label: 'Nieto', duration: 'permanent' }],
  SAILOR:         [{ id: 'DRUNK', label: 'Borracho', duration: 'night' }],
  INNKEEPER:      [{ id: 'SAFE1', label: 'A salvo', duration: 'night' }, { id: 'SAFE2', label: 'A salvo', duration: 'night' }, { id: 'DRUNK', label: 'Borracho', duration: 'night' }],
  COURTIER:       [{ id: 'CHOSEN', label: 'Elegido', duration: 'permanent' }, { id: 'DRUNK1', label: 'Borracho 1', duration: 'permanent' }, { id: 'DRUNK2', label: 'Borracho 2', duration: 'permanent' }, { id: 'DRUNK3', label: 'Borracho 3', duration: 'permanent' }, { id: 'NO_ABILITY', label: 'Sin habilidad', duration: 'oneShot' }],
  PROFESSOR:      [{ id: 'ALIVE', label: 'Vivo', duration: 'permanent' }, { id: 'NO_ABILITY', label: 'Sin habilidad', duration: 'oneShot' }],
  MINSTREL:       [{ id: 'ALL_DRUNK', label: 'Todos borrachos', duration: 'day' }],
  TEA_LADY:       [{ id: 'CANT_DIE1', label: 'No puede morir', duration: 'permanent' }, { id: 'CANT_DIE2', label: 'No puede morir', duration: 'permanent' }],
  GOON:           [{ id: 'DRUNK', label: 'Borracho', duration: 'night' }],
  GODFATHER:      [{ id: 'DIES', label: 'Muere', duration: 'night' }],
  DEVILS_ADVOCATE:[{ id: 'SURVIVES', label: 'Sobrevive ejecución', duration: 'day' }, { id: 'CHOSEN', label: 'Elegido', duration: 'night' }],
  PUKKA:          [{ id: 'POISONED', label: 'Envenenado', duration: 'permanent' }],
  PO:             [{ id: 'ATK3', label: '3 ataques', duration: 'night' }],
};

export default {
  id: 'BAD_MOON_RISING',
  name: 'Bad Moon Rising',
  roles,
  firstNightOrder,
  otherNightOrder,
  reminders,
};
