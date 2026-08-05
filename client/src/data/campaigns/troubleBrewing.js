// ── Trouble Brewing (cliente / UI) ─────────────────────────────────
// night: metadatos de acción concreta del motor (TB conserva su automatización).
export const roles = [
  // Aldeanos
  { id: 'WASHERWOMAN', name: 'Lavandera', alignment: 'good', type: 'townfolk', img: '/assets/roles/lavandera.png',
    ability: 'Empiezas conociendo que 1 de 2 jugadores es un Aldeano particular.', night: { passive: true } },
  { id: 'LIBRARIAN', name: 'Bibliotecario', alignment: 'good', type: 'townfolk', img: '/assets/roles/bibliotecario.png',
    ability: 'Empiezas conociendo que 1 de 2 jugadores es un Forastero particular (o que hay 0 en juego).', night: { passive: true } },
  { id: 'INVESTIGATOR', name: 'Investigador', alignment: 'good', type: 'townfolk', img: '/assets/roles/investigador.png',
    ability: 'Empiezas conociendo que 1 de 2 jugadores es un Esbirro particular.', night: { passive: true } },
  { id: 'COOK', name: 'Cocinero', alignment: 'good', type: 'townfolk', img: '/assets/roles/cocinero.png',
    ability: 'Empiezas sabiendo cuántas parejas de jugadores malos hay.', night: { passive: true } },
  { id: 'EMPATH', name: 'Empático', alignment: 'good', type: 'townfolk', img: '/assets/roles/empatica.png',
    ability: 'Cada noche sabes cuántos de tus vecinos vivos son malos.', night: { passive: true } },
  { id: 'FORTUNE_TELLER', name: 'Pitonisa', alignment: 'good', type: 'townfolk', img: '/assets/roles/adivina.png',
    ability: 'Cada noche elige 2 jugadores: sabes si alguno es el Demonio. Hay 1 jugador bueno que aparece como Demonio para ti.', night: { action: 'FORTUNE_TELLER', targets: 2 } },
  { id: 'UNDERTAKER', name: 'Enterrador', alignment: 'good', type: 'townfolk', img: '/assets/roles/enterrador.png',
    ability: 'Cada noche* descubres qué personaje ha muerto por ejecución hoy.', night: { passive: true } },
  { id: 'MONK', name: 'Monje', alignment: 'good', type: 'townfolk', img: '/assets/roles/monje.png',
    ability: 'Cada noche* elige 1 jugador (no a ti): está a salvo del Demonio esta noche.', night: { action: 'MONK_PROTECT', targets: 1 } },
  { id: 'RAVENKEEPER', name: 'Criacuervos', alignment: 'good', type: 'townfolk', img: '/assets/roles/criacuervos.png',
    ability: 'Si mueres por la noche, te despiertan para que elijas 1 jugador: descubres su personaje.', night: { action: 'RAVENKEEPER_INFO', targets: 1, onlyIfPending: true } },
  { id: 'VIRGIN', name: 'Virgen', alignment: 'good', type: 'townfolk', img: '/assets/roles/virgen.png',
    ability: 'La primera vez que te nominen, si quien nomina es Aldeano, es ejecutado inmediatamente.' },
  { id: 'SLAYER', name: 'Exterminador', alignment: 'good', type: 'townfolk', img: '/assets/roles/cazador.png',
    ability: 'Una vez por partida, durante el día, elige públicamente 1 jugador: si es el Demonio, muere.' },
  { id: 'SOLDIER', name: 'Soldado', alignment: 'good', type: 'townfolk', img: '/assets/roles/soldado.png',
    ability: 'Estás a salvo del Demonio.' },
  { id: 'MAYOR', name: 'Alcalde', alignment: 'good', type: 'townfolk', img: '/assets/roles/alcalde.png',
    ability: 'Si sólo quedan 3 jugadores vivos y no hay ejecución, tu bando gana. Si mueres por la noche, en vez de eso puede morir otro jugador.' },
  // Forasteros
  { id: 'BUTLER', name: 'Mayordomo', alignment: 'good', type: 'outsider', img: '/assets/roles/mayordomo.png',
    ability: 'Cada noche elige 1 jugador (no a ti): mañana sólo puedes votar si ese jugador está votando.', night: { action: 'BUTLER_MASTER', targets: 1 } },
  { id: 'DRUNK', name: 'Borracho', alignment: 'good', type: 'outsider', img: '/assets/roles/borracho.png',
    ability: 'No sabes que eres el Borracho. Crees que eres un Aldeano, pero no lo eres.' },
  { id: 'RECLUSE', name: 'Recluso', alignment: 'good', type: 'outsider', img: '/assets/roles/recluso.png',
    ability: 'Puedes aparecer como malo y como Esbirro o Demonio, aunque estés muerto.' },
  { id: 'SAINT', name: 'Santo', alignment: 'good', type: 'outsider', img: '/assets/roles/santo.png',
    ability: 'Si mueres por ejecución, tu equipo pierde.' },
  // Esbirros
  { id: 'POISONER', name: 'Envenenador', alignment: 'evil', type: 'minion', img: '/assets/roles/envenenador.png',
    ability: 'Cada noche elige 1 jugador: está envenenado esta noche y el día de mañana.', night: { action: 'POISONER_ACTION', targets: 1, evil: true } },
  { id: 'SPY', name: 'Espía', alignment: 'evil', type: 'minion', img: '/assets/roles/espia.png',
    ability: 'Cada noche ves el Grimorio. Puedes aparecer como bueno y como Aldeano o Forastero, aunque estés muerto.', night: { passive: true, evil: true } },
  { id: 'SCARLET_WOMAN', name: 'Mujer Escarlata', alignment: 'evil', type: 'minion', img: '/assets/roles/dama-escarlata.png',
    ability: 'Si hay 5 o más jugadores vivos y el Demonio muere, te conviertes en el Demonio. (No cuentan los viajeros)' },
  { id: 'BARON', name: 'Barón', alignment: 'evil', type: 'minion', img: '/assets/roles/baron.png',
    ability: 'Hay Forasteros extra en juego. [+2 Forasteros]' },
  // Demonios
  { id: 'IMP', name: 'Diablillo', alignment: 'evil', type: 'demon', img: '/assets/roles/diablillo.png',
    ability: 'Cada noche* elige 1 jugador: muere. Si te matas de esta forma, un Esbirro se convierte en el Diablillo.', night: { action: 'IMP_KILL', targets: 1, evil: true } },
];

export const firstNightOrder = ['EVIL_INFO', 'POISONER', 'WASHERWOMAN', 'LIBRARIAN', 'INVESTIGATOR', 'COOK', 'EMPATH', 'FORTUNE_TELLER', 'BUTLER', 'SPY'];
export const otherNightOrder = ['POISONER', 'MONK', 'SCARLET_WOMAN', 'IMP', 'RAVENKEEPER', 'FORTUNE_TELLER', 'EMPATH', 'UNDERTAKER', 'BUTLER', 'SPY'];

// ── Fichas recordatorias (reminder tokens) por rol dueño ───────────────
// duration: 'permanent' (perdura) | 'night' (se quita al amanecer) | 'oneShot' (un uso)
// El arte mostrado sobre el jugador es el del rol dueño (role.img).
export const reminders = {
  WASHERWOMAN:  [{ id: 'TOWNSFOLK', label: 'Aldeano', duration: 'permanent' }, { id: 'WRONG', label: 'Incorrecto', duration: 'permanent' }],
  LIBRARIAN:    [{ id: 'OUTSIDER', label: 'Forastero', duration: 'permanent' }, { id: 'WRONG', label: 'Incorrecto', duration: 'permanent' }],
  INVESTIGATOR: [{ id: 'MINION', label: 'Esbirro', duration: 'permanent' }, { id: 'WRONG', label: 'Incorrecto', duration: 'permanent' }],
  FORTUNE_TELLER: [{ id: 'RED_HERRING', label: 'Cortina de humo', duration: 'permanent' }],
  UNDERTAKER:   [{ id: 'EXECUTED', label: 'Muerto hoy', duration: 'night' }],
  MONK:         [{ id: 'SAFE', label: 'A salvo', duration: 'night' }],
  SOLDIER:      [{ id: 'SAFE', label: 'A salvo', duration: 'permanent' }],
  VIRGIN:       [{ id: 'NO_ABILITY', label: 'Sin habilidad', duration: 'oneShot' }],
  SLAYER:       [{ id: 'NO_ABILITY', label: 'Sin habilidad', duration: 'oneShot' }],
  BUTLER:       [{ id: 'MASTER', label: 'Es el Amo', duration: 'permanent' }],
  DRUNK:        [{ id: 'IS_DRUNK', label: 'Es el Borracho', duration: 'permanent' }],
  RECLUSE:      [{ id: 'REGISTERS_EVIL', label: 'Registra como malvado', duration: 'permanent' }],
  POISONER:     [{ id: 'POISONED', label: 'Envenenado', duration: 'night' }],
  IMP:          [{ id: 'DIES', label: 'Muere', duration: 'night' }],
};

export default {
  id: 'TROUBLE_BREWING',
  name: 'Trouble Brewing',
  roles,
  firstNightOrder,
  otherNightOrder,
  reminders,
};
