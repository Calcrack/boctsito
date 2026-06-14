// ── Trouble Brewing (campaña base) ─────────────────────────────────
// Datos de LÓGICA del servidor. El arte/controles de UI viven en client/src/data/campaigns.

const roles = {
  WASHERWOMAN: {
    id: 'WASHERWOMAN', name: 'Lavandera', alignment: 'good', type: 'townfolk',
    ability: 'Primera noche: ves 2 jugadores, uno de los cuales es un Aldeano específico.',
    firstNight: true, otherNights: false,
  },
  LIBRARIAN: {
    id: 'LIBRARIAN', name: 'Bibliotecario', alignment: 'good', type: 'townfolk',
    ability: 'Primera noche: ves 2 jugadores, uno de los cuales es un Forastero específico.',
    firstNight: true, otherNights: false,
  },
  INVESTIGATOR: {
    id: 'INVESTIGATOR', name: 'Investigador', alignment: 'good', type: 'townfolk',
    ability: 'Primera noche: ves 2 jugadores, uno de los cuales es un Esbirro específico.',
    firstNight: true, otherNights: false,
  },
  COOK: {
    id: 'COOK', name: 'Cocinero', alignment: 'good', type: 'townfolk',
    ability: 'Primera noche: sabes cuántas parejas de jugadores malvados son vecinos.',
    firstNight: true, otherNights: false,
  },
  EMPATH: {
    id: 'EMPATH', name: 'Empática', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: sabes cuántos de tus 2 vecinos vivos son malvados (0, 1 o 2).',
    firstNight: true, otherNights: true,
  },
  FORTUNE_TELLER: {
    id: 'FORTUNE_TELLER', name: 'Adivina', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: elige 2 jugadores y sabes si alguno es el Demonio.',
    firstNight: true, otherNights: true,
  },
  UNDERTAKER: {
    id: 'UNDERTAKER', name: 'Enterrador', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche (tras ejecución): sabes el rol del jugador ejecutado ese día.',
    firstNight: false, otherNights: true,
  },
  MONK: {
    id: 'MONK', name: 'Monje', alignment: 'good', type: 'townfolk',
    ability: 'Cada noche: elige 1 jugador (no tú mismo). Está protegido del Demonio esta noche.',
    firstNight: false, otherNights: true,
  },
  RAVENKEEPER: {
    id: 'RAVENKEEPER', name: 'Criacuervos', alignment: 'good', type: 'townfolk',
    ability: 'Si mueres de noche: elige 1 jugador y descubres su rol.',
    firstNight: false, otherNights: false,
  },
  VIRGIN: {
    id: 'VIRGIN', name: 'Virgen', alignment: 'good', type: 'townfolk',
    ability: 'La primera vez que un Aldeano te nomina, ese Aldeano es ejecutado inmediatamente.',
    firstNight: false, otherNights: false,
  },
  SLAYER: {
    id: 'SLAYER', name: 'Cazador', alignment: 'good', type: 'townfolk',
    ability: 'Una vez por partida, durante el día: elige 1 jugador. Si es el Demonio, muere.',
    firstNight: false, otherNights: false,
  },
  SOLDIER: {
    id: 'SOLDIER', name: 'Soldado', alignment: 'good', type: 'townfolk',
    ability: 'No puedes morir por ataques del Demonio.',
    firstNight: false, otherNights: false,
  },
  MAYOR: {
    id: 'MAYOR', name: 'Alcalde', alignment: 'good', type: 'townfolk',
    ability: 'Si solo quedan 3 jugadores vivos y no hay ejecución ese día, el equipo del Bien gana.',
    firstNight: false, otherNights: false,
  },
  BUTLER: {
    id: 'BUTLER', name: 'Mayordomo', alignment: 'good', type: 'outsider',
    ability: 'Cada noche: elige 1 jugador como tu Amo. Solo puedes votar si tu Amo también vota.',
    firstNight: true, otherNights: true,
  },
  DRUNK: {
    id: 'DRUNK', name: 'Borracho', alignment: 'good', type: 'outsider',
    ability: 'No sabes que eres el Borracho. Crees ser un Aldeano, pero tu información es falsa.',
    firstNight: false, otherNights: false,
  },
  RECLUSE: {
    id: 'RECLUSE', name: 'Recluso', alignment: 'good', type: 'outsider',
    ability: 'Puedes ser percibido como malvado y/o como Esbirro o Demonio, incluso si eres Bueno.',
    firstNight: false, otherNights: false,
  },
  SAINT: {
    id: 'SAINT', name: 'Santo', alignment: 'good', type: 'outsider',
    ability: 'Si eres ejecutado, el equipo del Bien pierde.',
    firstNight: false, otherNights: false,
  },
  POISONER: {
    id: 'POISONER', name: 'Envenenador', alignment: 'evil', type: 'minion',
    ability: 'Cada noche: elige 1 jugador para envenenar. Su habilidad no funciona esa noche.',
    firstNight: true, otherNights: true,
  },
  SPY: {
    id: 'SPY', name: 'Espía', alignment: 'evil', type: 'minion',
    ability: 'Cada noche: ves el Grimorio completo. Puedes ser percibido como Bueno.',
    firstNight: true, otherNights: true,
  },
  SCARLET_WOMAN: {
    id: 'SCARLET_WOMAN', name: 'Dama Escarlata', alignment: 'evil', type: 'minion',
    ability: 'Si hay 5+ jugadores vivos y el Demonio muere, te conviertes en el nuevo Demonio.',
    firstNight: false, otherNights: false,
  },
  BARON: {
    id: 'BARON', name: 'Barón', alignment: 'evil', type: 'minion',
    ability: 'Hay 2 Forasteros adicionales en la partida en lugar de 2 Aldeanos.',
    firstNight: false, otherNights: false,
  },
  IMP: {
    id: 'IMP', name: 'Diablillo', alignment: 'evil', type: 'demon',
    ability: 'Cada noche: elige 1 jugador que muere. Si te eliges a ti mismo, un Esbirro vivo se convierte en Diablillo.',
    firstNight: false, otherNights: true,
  },
};

const BASE_DISTRIBUTION = {
  5:  { townfolk: 3, outsiders: 0, minions: 1, demons: 1 },
  6:  { townfolk: 3, outsiders: 1, minions: 1, demons: 1 },
  7:  { townfolk: 5, outsiders: 0, minions: 1, demons: 1 },
  8:  { townfolk: 5, outsiders: 1, minions: 1, demons: 1 },
  9:  { townfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  10: { townfolk: 7, outsiders: 0, minions: 2, demons: 1 },
  11: { townfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  12: { townfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  13: { townfolk: 9, outsiders: 0, minions: 3, demons: 1 },
  14: { townfolk: 9, outsiders: 1, minions: 3, demons: 1 },
  15: { townfolk: 9, outsiders: 2, minions: 3, demons: 1 },
};

// Cola interactiva del motor (NO cambiar — preserva el comportamiento auto/jugador de TB).
const queueFirst  = ['POISONER', 'WASHERWOMAN', 'LIBRARIAN', 'INVESTIGATOR', 'COOK', 'EMPATH', 'FORTUNE_TELLER', 'BUTLER', 'SPY'];
const queueOther  = ['POISONER', 'MONK', 'IMP', 'UNDERTAKER', 'EMPATH', 'FORTUNE_TELLER', 'BUTLER', 'SPY'];

module.exports = {
  id: 'TROUBLE_BREWING',
  name: 'Trouble Brewing',
  roles,
  distribution: BASE_DISTRIBUTION,
  outsiderModifiers: { BARON: 2 }, // +2 forasteros (a costa de aldeanos)
  queueFirst,
  queueOther,
};
