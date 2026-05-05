export const ALL_ROLES = [
  // ── Aldeanos ──────────────────────────────────────────────────────
  { id: 'WASHERWOMAN',   name: 'Lavandera',       alignment: 'good', type: 'townfolk',  img: '/assets/roles/lavandera.png',       ability: 'Primera noche: ves 2 jugadores; uno de ellos es un Aldeano específico (se te dice cuál rol).' },
  { id: 'LIBRARIAN',     name: 'Bibliotecario',   alignment: 'good', type: 'townfolk',  img: '/assets/roles/bibliotecario.png',   ability: 'Primera noche: ves 2 jugadores; uno de ellos es un Forastero específico (se te dice cuál rol).' },
  { id: 'INVESTIGATOR',  name: 'Investigador',    alignment: 'good', type: 'townfolk',  img: '/assets/roles/investigador.png',    ability: 'Primera noche: ves 2 jugadores; uno de ellos es un Esbirro específico (se te dice cuál rol).' },
  { id: 'COOK',          name: 'Cocinero',        alignment: 'good', type: 'townfolk',  img: '/assets/roles/cocinero.png',        ability: 'Primera noche: sabes cuántas parejas de jugadores malvados son vecinos.' },
  { id: 'EMPATH',        name: 'Empática',        alignment: 'good', type: 'townfolk',  img: '/assets/roles/empatica.png',        ability: 'Cada noche: sabes cuántos de tus 2 vecinos vivos son malvados (0, 1 o 2).' },
  { id: 'FORTUNE_TELLER',name: 'Adivina',         alignment: 'good', type: 'townfolk',  img: '/assets/roles/adivina.png',         ability: 'Cada noche: elige 2 jugadores. Sabes si alguno es el Demonio (la Cortina de Humo puede engañarte).' },
  { id: 'UNDERTAKER',    name: 'Enterrador',      alignment: 'good', type: 'townfolk',  img: '/assets/roles/enterrador.png',      ability: 'Cada noche (si hubo ejecución): sabes el rol del ejecutado ese día.' },
  { id: 'MONK',          name: 'Monje',           alignment: 'good', type: 'townfolk',  img: '/assets/roles/monje.png',           ability: 'Cada noche: elige 1 jugador (no tú). Está protegido del Demonio esta noche.' },
  { id: 'RAVENKEEPER',   name: 'Criacuervos',     alignment: 'good', type: 'townfolk',  img: '/assets/roles/criacuervos.png',     ability: 'Si mueres de noche: elige 1 jugador y descubres su rol.' },
  { id: 'VIRGIN',        name: 'Virgen',          alignment: 'good', type: 'townfolk',  img: '/assets/roles/virgen.png',          ability: 'La primera vez que un Aldeano te nomina, ese Aldeano es ejecutado inmediatamente.' },
  { id: 'SLAYER',        name: 'Cazador',         alignment: 'good', type: 'townfolk',  img: '/assets/roles/cazador.png',         ability: 'Una vez por partida (de día): elige 1 jugador. Si es el Demonio, muere.' },
  { id: 'SOLDIER',       name: 'Soldado',         alignment: 'good', type: 'townfolk',  img: '/assets/roles/soldado.png',         ability: 'No puedes morir por ataques del Demonio.' },
  { id: 'MAYOR',         name: 'Alcalde',         alignment: 'good', type: 'townfolk',  img: '/assets/roles/alcalde.png',         ability: 'Si quedan 3 jugadores vivos y no hay ejecución ese día, el Bien gana.' },
  // ── Forasteros ────────────────────────────────────────────────────
  { id: 'BUTLER',        name: 'Mayordomo',       alignment: 'good', type: 'outsider',  img: '/assets/roles/mayordomo.png',       ability: 'Cada noche: elige 1 Amo. Solo puedes votar si tu Amo vota primero.' },
  { id: 'DRUNK',         name: 'Borracho',        alignment: 'good', type: 'outsider',  img: '/assets/roles/borracho.png',        ability: 'No sabes que eres el Borracho. Tu información siempre es falsa.' },
  { id: 'RECLUSE',       name: 'Recluso',         alignment: 'good', type: 'outsider',  img: '/assets/roles/recluso.png',         ability: 'Puedes ser percibido como malvado o como Esbirro/Demonio.' },
  { id: 'SAINT',         name: 'Santo',           alignment: 'good', type: 'outsider',  img: '/assets/roles/santo.png',           ability: 'Si eres ejecutado, el equipo del Bien pierde.' },
  // ── Esbirros ──────────────────────────────────────────────────────
  { id: 'POISONER',      name: 'Envenenador',     alignment: 'evil', type: 'minion',    img: '/assets/roles/envenenador.png',     ability: 'Cada noche: envenena a 1 jugador. Su habilidad da información falsa esa noche.' },
  { id: 'SPY',           name: 'Espía',           alignment: 'evil', type: 'minion',    img: '/assets/roles/espia.png',           ability: 'Cada noche: ves el Grimorio completo. Puedes ser percibido como Bueno.' },
  { id: 'SCARLET_WOMAN', name: 'Dama Escarlata',  alignment: 'evil', type: 'minion',    img: '/assets/roles/dama-escarlata.png',  ability: 'Si el Demonio muere con 5+ jugadores vivos, te conviertes en el nuevo Demonio.' },
  { id: 'BARON',         name: 'Barón',           alignment: 'evil', type: 'minion',    img: '/assets/roles/baron.png',           ability: 'Hay 2 Forasteros adicionales en la partida.' },
  // ── Demonios ──────────────────────────────────────────────────────
  { id: 'IMP',           name: 'Diablillo',       alignment: 'evil', type: 'demon',     img: '/assets/roles/diablillo.png',       ability: 'Cada noche: elige 1 jugador que muere. Si te eliges a ti mismo, un Esbirro se convierte en Diablillo.' },
];

export const ROLE_BY_ID = Object.fromEntries(ALL_ROLES.map(r => [r.id, r]));
export const ROLE_NAMES  = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.name]));
export const ROLE_TYPES  = Object.fromEntries(ALL_ROLES.map(r => [r.id, r.type]));
