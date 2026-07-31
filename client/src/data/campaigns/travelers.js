// ── Viajeros (suplemento — no son campaña, no tienen distribución) ──
export const roles = [
  { id: 'APPRENTICE', name: 'Aprendiz', alignment: 'good', type: 'traveler', img: null,
    ability: 'En tu primera noche ganas la habilidad de 1 Aldeano (si eres bueno) o 1 Esbirro (si eres malo).',
    night: { passive: true } },
  { id: 'BARISTA', name: 'Barista', alignment: 'good', type: 'traveler', img: null,
    ability: 'Cada noche, hasta el crepúsculo, 1) un jugador está sobrio, sano y recibe información verdadera, o 2) su habilidad funciona 2 veces. El jugador sabe cuál de las dos.',
    night: { action: 'BARISTA', targets: 1 } },
  { id: 'BONE_COLLECTOR', name: 'Coleccionista de Huesos', alignment: 'good', type: 'traveler', img: null,
    ability: 'Una vez por partida, por la noche, elige 1 jugador muerto: vuelve a ganar su habilidad hasta el crepúsculo.',
    night: { action: 'BONE_COLLECTOR', targets: 1 } },
  { id: 'BISHOP', name: 'Obispo', alignment: 'good', type: 'traveler', img: null,
    ability: 'Sólo puede nominar el Narrador. Debe nominar al menos a 1 jugador del alineamiento contrario al Obispo cada día.' },
  { id: 'BUTCHER', name: 'Carnicero', alignment: 'good', type: 'traveler', img: null,
    ability: 'Cada día, después de la primera ejecución, puedes nominar otra vez.' },
  { id: 'DEVIANT', name: 'Pervertido', alignment: 'good', type: 'traveler', img: null,
    ability: 'Si has sido gracioso hoy no puedes ser exiliado.' },
  { id: 'HARLOT', name: 'Meretriz', alignment: 'good', type: 'traveler', img: null,
    ability: 'Cada noche* elige 1 jugador vivo: si accede, descubres su personaje, pero ambos podéis morir.',
    night: { action: 'HARLOT', targets: 1 } },
  { id: 'JUDGE', name: 'Juez', alignment: 'good', type: 'traveler', img: null,
    ability: 'Una vez por partida, si otro jugador ha nominado, puedes forzar la ejecución o impedirla.' },
  { id: 'MATRON', name: 'Institutriz', alignment: 'good', type: 'traveler', img: null,
    ability: 'Cada día puedes elegir hasta 3 parejas de jugadores para que cambien sus asientos. Los jugadores no pueden levantarse para hablar en privado.' },
  { id: 'VOUDON', name: 'Voudon', alignment: 'good', type: 'traveler', img: null,
    ability: 'Solo tú y los muertos podéis votar. No necesitan ficha de votación para hacerlo. No es necesaria una mayoría para ejecutar.' },
];

export default { id: 'TRAVELERS', name: 'Viajeros', roles };
