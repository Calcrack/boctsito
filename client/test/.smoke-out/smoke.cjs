"use strict";
const React = require("react");
const server = require("react-dom/server");
const jsxRuntime = require("react/jsx-runtime");
const store = {};
globalThis.localStorage = {
  getItem: (k) => k in store ? store[k] : null,
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  }
};
globalThis.window = globalThis;
globalThis.document = {
  documentElement: { style: { setProperty() {
  }, removeProperty() {
  } } },
  body: {},
  activeElement: null,
  addEventListener() {
  },
  removeEventListener() {
  }
};
const ROLES = ["POISONER", "IMP", "MONK", "MAYOR", "SOLDIER", "EMPATH", "RECLUSE", "WIZARD"];
function mkGame(phase, extra = {}) {
  const players = ROLES.map((r, i) => ({
    id: "p" + i,
    name: "Jugador " + i,
    role: r,
    alive: i !== 6,
    type: ["minion", "demon", "townfolk", "townfolk", "townfolk", "townfolk", "outsider", "minion"][i],
    alignment: ["evil", "evil", "good", "good", "good", "good", "good", "evil"][i],
    tokens: [],
    accusations: [],
    poisoned: false,
    discordId: null,
    nightInfo: i === 0 ? "Envenenador: envenenaste a X." : null
  }));
  return {
    phase,
    dayNumber: 2,
    nightNumber: 2,
    campaignId: "TROUBLE_BREWING",
    players,
    nominations: [],
    activeNomination: null,
    nightDeaths: ["p6"],
    advice: [{ severity: "warn", text: "Aviso largo de prueba para comprobar que el texto no se corta." }],
    deferredEffects: [{ id: "d1", label: "El Barbero ha muerto: resuelve el intercambio." }],
    roleHints: [{ severity: "warn", playerId: "p7", playerName: "Jugador 7", roleId: "WIZARD", roleName: "Hechicero", alive: true, impaired: false, text: "Deseo pendiente.", needs: "Panel de deseos." }],
    statusLog: [{ t: Date.now(), night: 2, day: 2, message: "Envenenado → Jugador 3" }],
    campaignRoles: [],
    wish: { status: "pending", text: "quiero ser demonio" },
    ...extra
  };
}
const SCENARIOS = {
  lobby: mkGame("lobby"),
  role_reveal: mkGame("role_reveal"),
  first_night: mkGame("first_night", { nightNumber: 1 }),
  night: mkGame("night"),
  day: mkGame("day"),
  nominations: mkGame("nominations", {
    nominations: [{ id: "n1", nominatorId: "p2", nomineeId: "p3", nominatorName: "Jugador 2", nomineeName: "Jugador 3", votes: ["p2", "p3"], against: [], resolved: true, meetsThreshold: true, executed: false, tally: 2 }]
  }),
  voting: mkGame("voting", {
    activeNomination: "n1",
    nominations: [{ id: "n1", nominatorId: "p2", nomineeId: "p3", nominatorName: "Jugador 2", nomineeName: "Jugador 3", votes: [], against: [], resolved: false, stage: "voting", voteOrder: ["p2", "p3"], voteTurnIndex: 0, pendingVoters: ["p3"] }]
  })
};
let CURRENT = SCENARIOS.night;
function setScenario(k) {
  CURRENT = SCENARIOS[k];
}
function useGame() {
  return {
    state: {
      game: CURRENT,
      isNarrator: true,
      playerId: null,
      discordMembers: [],
      rankings: {},
      campaigns: [],
      importResult: null
    },
    send: () => {
    }
  };
}
const roles$4 = [
  // Aldeanos
  {
    id: "WASHERWOMAN",
    name: "Lavandera",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/lavandera.png",
    ability: "Empiezas conociendo que 1 de 2 jugadores es un Aldeano particular.",
    night: { passive: true }
  },
  {
    id: "LIBRARIAN",
    name: "Bibliotecario",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/bibliotecario.png",
    ability: "Empiezas conociendo que 1 de 2 jugadores es un Forastero particular (o que hay 0 en juego).",
    night: { passive: true }
  },
  {
    id: "INVESTIGATOR",
    name: "Investigador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/investigador.png",
    ability: "Empiezas conociendo que 1 de 2 jugadores es un Esbirro particular.",
    night: { passive: true }
  },
  {
    id: "COOK",
    name: "Cocinero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/cocinero.png",
    ability: "Empiezas sabiendo cuántas parejas de jugadores malos hay.",
    night: { passive: true }
  },
  {
    id: "EMPATH",
    name: "Empático",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/empatica.png",
    ability: "Cada noche sabes cuántos de tus vecinos vivos son malos.",
    night: { passive: true }
  },
  {
    id: "FORTUNE_TELLER",
    name: "Pitonisa",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/adivina.png",
    ability: "Cada noche elige 2 jugadores: sabes si alguno es el Demonio. Hay 1 jugador bueno que aparece como Demonio para ti.",
    night: { action: "FORTUNE_TELLER", targets: 2 }
  },
  {
    id: "UNDERTAKER",
    name: "Enterrador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/enterrador.png",
    ability: "Cada noche* descubres qué personaje ha muerto por ejecución hoy.",
    night: { passive: true }
  },
  {
    id: "MONK",
    name: "Monje",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/monje.png",
    ability: "Cada noche* elige 1 jugador (no a ti): está a salvo del Demonio esta noche.",
    night: { action: "MONK_PROTECT", targets: 1 }
  },
  {
    id: "RAVENKEEPER",
    name: "Guardián de Cuervos",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/criacuervos.png",
    ability: "Si mueres por la noche, te despiertan para que elijas 1 jugador: descubres su personaje.",
    night: { action: "RAVENKEEPER_INFO", targets: 1, onlyIfPending: true }
  },
  {
    id: "VIRGIN",
    name: "Virgen",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/virgen.png",
    ability: "La primera vez que te nominen, si quien nomina es Aldeano, es ejecutado inmediatamente."
  },
  {
    id: "SLAYER",
    name: "Exterminador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/cazador.png",
    ability: "Una vez por partida, durante el día, elige públicamente 1 jugador: si es el Demonio, muere."
  },
  {
    id: "SOLDIER",
    name: "Soldado",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/soldado.png",
    ability: "Estás a salvo del Demonio."
  },
  {
    id: "MAYOR",
    name: "Alcalde",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/alcalde.png",
    ability: "Si sólo quedan 3 jugadores vivos y no hay ejecución, tu bando gana. Si mueres por la noche, en vez de eso puede morir otro jugador."
  },
  // Forasteros
  {
    id: "BUTLER",
    name: "Mayordomo",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/mayordomo.png",
    ability: "Cada noche elige 1 jugador (no a ti): mañana sólo puedes votar si ese jugador está votando.",
    night: { action: "BUTLER_MASTER", targets: 1 }
  },
  {
    id: "DRUNK",
    name: "Borracho",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/borracho.png",
    ability: "No sabes que eres el Borracho. Crees que eres un Aldeano, pero no lo eres."
  },
  {
    id: "RECLUSE",
    name: "Recluso",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/recluso.png",
    ability: "Puedes aparecer como malo y como Esbirro o Demonio, aunque estés muerto."
  },
  {
    id: "SAINT",
    name: "Santo",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/santo.png",
    ability: "Si mueres por ejecución, tu equipo pierde."
  },
  // Esbirros
  {
    id: "POISONER",
    name: "Envenenador",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/envenenador.png",
    ability: "Cada noche elige 1 jugador: está envenenado esta noche y el día de mañana.",
    night: { action: "POISONER_ACTION", targets: 1, evil: true }
  },
  {
    id: "SPY",
    name: "Espía",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/espia.png",
    ability: "Cada noche ves el Grimorio. Puedes aparecer como bueno y como Aldeano o Forastero, aunque estés muerto.",
    night: { passive: true, evil: true }
  },
  {
    id: "SCARLET_WOMAN",
    name: "Mujer Escarlata",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/dama-escarlata.png",
    ability: "Si hay 5 o más jugadores vivos y el Demonio muere, te conviertes en el Demonio. (No cuentan los viajeros)"
  },
  {
    id: "BARON",
    name: "Barón",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/baron.png",
    ability: "Hay Forasteros extra en juego. [+2 Forasteros]"
  },
  // Demonios
  {
    id: "IMP",
    name: "Diablillo",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/diablillo.png",
    ability: "Cada noche* elige 1 jugador: muere. Si te matas de esta forma, un Esbirro se convierte en el Diablillo.",
    night: { action: "IMP_KILL", targets: 1, evil: true }
  }
];
const firstNightOrder$3 = ["EVIL_INFO", "POISONER", "WASHERWOMAN", "LIBRARIAN", "INVESTIGATOR", "COOK", "EMPATH", "FORTUNE_TELLER", "BUTLER", "SPY"];
const otherNightOrder$3 = ["POISONER", "MONK", "SCARLET_WOMAN", "IMP", "RAVENKEEPER", "FORTUNE_TELLER", "EMPATH", "UNDERTAKER", "BUTLER", "SPY"];
const reminders$3 = {
  WASHERWOMAN: [{ id: "TOWNSFOLK", label: "Aldeano", duration: "permanent" }, { id: "WRONG", label: "Incorrecto", duration: "permanent" }],
  LIBRARIAN: [{ id: "OUTSIDER", label: "Forastero", duration: "permanent" }, { id: "WRONG", label: "Incorrecto", duration: "permanent" }],
  INVESTIGATOR: [{ id: "MINION", label: "Esbirro", duration: "permanent" }, { id: "WRONG", label: "Incorrecto", duration: "permanent" }],
  FORTUNE_TELLER: [{ id: "RED_HERRING", label: "Cortina de humo", duration: "permanent" }],
  UNDERTAKER: [{ id: "EXECUTED", label: "Muerto hoy", duration: "night" }],
  MONK: [{ id: "SAFE", label: "A salvo", duration: "night" }],
  SOLDIER: [{ id: "SAFE", label: "A salvo", duration: "permanent" }],
  VIRGIN: [{ id: "NO_ABILITY", label: "Sin habilidad", duration: "oneShot" }],
  SLAYER: [{ id: "NO_ABILITY", label: "Sin habilidad", duration: "oneShot" }],
  BUTLER: [{ id: "MASTER", label: "Es el Amo", duration: "permanent" }],
  DRUNK: [{ id: "IS_DRUNK", label: "Es el Borracho", duration: "permanent" }],
  RECLUSE: [{ id: "REGISTERS_EVIL", label: "Registra como malvado", duration: "permanent" }],
  POISONER: [{ id: "POISONED", label: "Envenenado", duration: "night" }],
  IMP: [{ id: "DIES", label: "Muere", duration: "night" }]
};
const troubleBrewing = {
  id: "TROUBLE_BREWING",
  name: "Trouble Brewing",
  roles: roles$4,
  firstNightOrder: firstNightOrder$3,
  otherNightOrder: otherNightOrder$3,
  reminders: reminders$3
};
const roles$3 = [
  // Aldeanos
  {
    id: "GRANDMOTHER",
    name: "Abuela",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/grandmother.png",
    ability: "Empiezas conociendo 1 jugador bueno y su personaje. Si el Demonio le mata, tú también mueres.",
    controls: ["info"]
  },
  {
    id: "SAILOR",
    name: "Marinero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/sailor.png",
    ability: "No puedes morir. Cada noche elige 1 jugador vivo: tú o ese jugador estáis borrachos hasta el crepúsculo.",
    controls: ["drunk", "safe"]
  },
  {
    id: "CHAMBERMAID",
    name: "Sirvienta",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/chambermaid.png",
    ability: "Cada noche elige 2 jugadores vivos (no a ti). Descubres cuántos han despertado esta noche por su habilidad.",
    controls: ["info"]
  },
  {
    id: "EXORCIST",
    name: "Exorcista",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/exorcist.png",
    ability: "Cada noche* elige 1 jugador (diferente al de la noche anterior): si es el Demonio, éste sabe quién eres y no se despierta esta noche.",
    controls: ["info"]
  },
  {
    id: "INNKEEPER",
    name: "Posadero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/innkeeper.png",
    ability: "Cada noche* elige 2 jugadores: no pueden morir esta noche, pero 1 está borracho hasta el crepúsculo.",
    controls: ["safe", "drunk"]
  },
  {
    id: "GAMBLER",
    name: "Tahúr",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/gambler.png",
    ability: "Cada noche* elige 1 jugador e intenta adivinar su personaje: si fallas, mueres.",
    controls: ["kill", "info"]
  },
  {
    id: "GOSSIP",
    name: "Chismoso",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/gossip.png",
    ability: "Cada día puedes hacer una declaración pública. Esta noche, si fue cierta, 1 jugador muere.",
    controls: ["kill"]
  },
  {
    id: "COURTIER",
    name: "Cortesano",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/courtier.png",
    ability: "Una vez por partida, por la noche, elige 1 personaje: está borracho durante 3 días y 3 noches.",
    controls: ["drunk"]
  },
  {
    id: "PROFESSOR",
    name: "Profesor",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/professor.png",
    ability: "Una vez por partida, por la noche*, elige 1 jugador muerto. Si es Aldeano, resucita.",
    controls: ["revive"]
  },
  {
    id: "MINSTREL",
    name: "Juglar",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/minstrel.png",
    ability: "Cuando un Esbirro muera por ejecución, todos los jugadores (salvo viajeros) están borrachos hasta el crepúsculo de mañana.",
    controls: ["drunk"]
  },
  {
    id: "TEA_LADY",
    name: "Dama del Té",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/tealady.png",
    ability: "Si tus vecinos vivos son buenos, no pueden morir.",
    controls: ["safe"]
  },
  {
    id: "PACIFIST",
    name: "Pacifista",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/pacifist.png",
    ability: "Los jugadores buenos ejecutados pueden no morir.",
    controls: ["info"]
  },
  {
    id: "FOOL",
    name: "Bufón",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/fool.png",
    ability: "La primera vez que mueras, no mueres.",
    controls: ["info"]
  },
  // Forasteros
  {
    id: "GOON",
    name: "Matón",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/goon.png",
    ability: "Cada noche, el primer jugador que te elija por su habilidad está borracho hasta el crepúsculo. Te conviertes a su alineamiento.",
    controls: ["drunk", "info"]
  },
  {
    id: "LUNATIC",
    name: "Lunático",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/lunatic.png",
    ability: "Crees que eres un Demonio, pero no lo eres. El Demonio sabe quién eres y a quién eliges por la noche.",
    controls: ["info"]
  },
  {
    id: "TINKER",
    name: "Manitas",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/tinker.png",
    ability: "Puedes morir en cualquier momento.",
    controls: ["kill"]
  },
  {
    id: "MOONCHILD",
    name: "Niña de la Luna",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/moonchild.png",
    ability: "Cuando descubras que has muerto, elige públicamente 1 jugador vivo. Esta noche, si era bueno, muere.",
    controls: ["kill"]
  },
  // Esbirros
  {
    id: "GODFATHER",
    name: "Padrino",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/godfather.png",
    ability: "Empiezas conociendo qué Forasteros están en juego. Si 1 muere por el día, elige 1 jugador esta noche: muere. [-1 o +1 Forastero]",
    controls: ["info", "kill"]
  },
  {
    id: "DEVILS_ADVOCATE",
    name: "Abogado del Diablo",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/devilsadvocate.png",
    ability: "Cada noche elige 1 jugador vivo (diferente al de la noche anterior): si es ejecutado mañana, no muere.",
    controls: ["safe", "info"]
  },
  {
    id: "ASSASSIN",
    name: "Asesino",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/assassin.png",
    ability: "Una vez por partida, por la noche*, elige 1 jugador: muere, incluso si por otro motivo no pudiera.",
    controls: ["kill"]
  },
  {
    id: "MASTERMIND",
    name: "Mente Maestra",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/mastermind.png",
    ability: "Si el Demonio muere por ejecución (terminando la partida), juega 1 día más. Si 1 jugador es ejecutado ese día, su equipo pierde.",
    controls: ["info"]
  },
  // Demonios
  {
    id: "ZOMBUUL",
    name: "Zombuul",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/zombuul.png",
    ability: "Cada noche*, si nadie ha muerto durante el día, elige 1 jugador: muere. La primera vez que mueras, vives pero apareces como muerto.",
    controls: ["kill"]
  },
  {
    id: "PUKKA",
    name: "Pukka",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/pukka.png",
    ability: "Cada noche elige 1 jugador: está envenenado. El anterior jugador envenenado muere y después está sano.",
    controls: ["poison", "kill"]
  },
  {
    id: "SHABALOTH",
    name: "Shabaloth",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/shabaloth.png",
    ability: "Cada noche* elige 2 jugadores: mueren. 1 jugador muerto elegido la noche anterior puede ser regurgitado.",
    controls: ["kill", "revive"]
  },
  {
    id: "PO",
    name: "Po",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/po.png",
    ability: "Cada noche* puedes elegir 1 jugador: muere. Si tu última elección fue no elegir a nadie, elige a 3 jugadores esta noche.",
    controls: ["kill"]
  }
];
const firstNightOrder$2 = ["MINION_INFO", "LUNATIC", "DEMON_INFO", "PUKKA", "SAILOR", "COURTIER", "GODFATHER", "DEVILS_ADVOCATE", "GRANDMOTHER", "CHAMBERMAID"];
const otherNightOrder$2 = ["SAILOR", "COURTIER", "INNKEEPER", "DEVILS_ADVOCATE", "LUNATIC", "EXORCIST", "ZOMBUUL", "PUKKA", "SHABALOTH", "PO", "ASSASSIN", "GODFATHER", "GAMBLER", "GOSSIP", "PROFESSOR", "MINSTREL", "TEA_LADY", "PACIFIST", "FOOL", "MOONCHILD", "GRANDMOTHER", "CHAMBERMAID"];
const reminders$2 = {
  GRANDMOTHER: [{ id: "GRANDCHILD", label: "Nieto", duration: "permanent" }],
  SAILOR: [{ id: "DRUNK", label: "Borracho", duration: "night" }],
  INNKEEPER: [{ id: "SAFE1", label: "A salvo", duration: "night" }, { id: "SAFE2", label: "A salvo", duration: "night" }, { id: "DRUNK", label: "Borracho", duration: "night" }],
  COURTIER: [{ id: "CHOSEN", label: "Elegido", duration: "permanent" }, { id: "DRUNK1", label: "Borracho 1", duration: "permanent" }, { id: "DRUNK2", label: "Borracho 2", duration: "permanent" }, { id: "DRUNK3", label: "Borracho 3", duration: "permanent" }, { id: "NO_ABILITY", label: "Sin habilidad", duration: "oneShot" }],
  PROFESSOR: [{ id: "ALIVE", label: "Vivo", duration: "permanent" }, { id: "NO_ABILITY", label: "Sin habilidad", duration: "oneShot" }],
  MINSTREL: [{ id: "ALL_DRUNK", label: "Todos borrachos", duration: "day" }],
  TEA_LADY: [{ id: "CANT_DIE1", label: "No puede morir", duration: "permanent" }, { id: "CANT_DIE2", label: "No puede morir", duration: "permanent" }],
  GOON: [{ id: "DRUNK", label: "Borracho", duration: "night" }],
  GODFATHER: [{ id: "DIES", label: "Muere", duration: "night" }],
  DEVILS_ADVOCATE: [{ id: "SURVIVES", label: "Sobrevive ejecución", duration: "day" }, { id: "CHOSEN", label: "Elegido", duration: "night" }],
  PUKKA: [{ id: "POISONED", label: "Envenenado", duration: "permanent" }],
  PO: [{ id: "ATK3", label: "3 ataques", duration: "night" }]
};
const badMoonRising = {
  id: "BAD_MOON_RISING",
  name: "Bad Moon Rising",
  roles: roles$3,
  firstNightOrder: firstNightOrder$2,
  otherNightOrder: otherNightOrder$2,
  reminders: reminders$2
};
const roles$2 = [
  // Aldeanos
  {
    id: "CLOCKMAKER",
    name: "Relojero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/clockmaker.png",
    ability: "Empiezas sabiendo a cuántos pasos está el Demonio de su Esbirro más cercano.",
    controls: ["info"]
  },
  {
    id: "DREAMER",
    name: "Soñador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/dreamer.png",
    ability: "Cada noche elige 1 jugador (no a ti o viajeros): descubres 1 personaje bueno y 1 personaje malo, 1 de ellos es correcto.",
    controls: ["info"]
  },
  {
    id: "SNAKE_CHARMER",
    name: "Encantador de Serpientes",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/snakecharmer.png",
    ability: "Cada noche elige 1 jugador vivo: si es el Demonio intercambiáis personajes y alineamiento y después está envenenado.",
    controls: ["info", "poison"]
  },
  {
    id: "MATHEMATICIAN",
    name: "Matemático",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/mathematician.png",
    ability: "Cada noche sabes cuántas habilidades de personajes han funcionado anormalmente (desde el amanecer) por las habilidades de otros personajes.",
    controls: ["info"]
  },
  {
    id: "FLOWERGIRL",
    name: "Florista",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/flowergirl.png",
    ability: "Cada noche* descubres si el Demonio ha votado hoy.",
    controls: ["info"]
  },
  {
    id: "TOWN_CRIER",
    name: "Pregonero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/towncrier.png",
    ability: "Cada noche* descubres si 1 Esbirro ha nominado hoy.",
    controls: ["info"]
  },
  {
    id: "ORACLE",
    name: "Oráculo",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/oracle.png",
    ability: "Cada noche* sabes cuántos jugadores muertos son malos.",
    controls: ["info"]
  },
  {
    id: "SAVANT",
    name: "Erudito",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/savant.png",
    ability: "Cada día puedes visitar en privado al Narrador para que te diga 2 informaciones: 1 es cierta y 1 es falsa.",
    controls: ["info"]
  },
  {
    id: "SEAMSTRESS",
    name: "Costurera",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/seamstress.png",
    ability: "Una vez por partida, por la noche, elige 2 jugadores (no a ti): descubres si son del mismo alineamiento.",
    controls: ["info"]
  },
  {
    id: "PHILOSOPHER",
    name: "Filósofo",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/philosopher.png",
    ability: "Una vez por partida, por la noche, elige 1 personaje bueno: ganas su habilidad. Si el personaje está en juego, está borracho.",
    controls: ["drunk", "info"]
  },
  {
    id: "ARTIST",
    name: "Artista",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/artist.png",
    ability: "Una vez por partida, durante el día, hazle en privado al Narrador una pregunta de sí o no.",
    controls: ["info"]
  },
  {
    id: "JUGGLER",
    name: "Malabarista",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/juggler.png",
    ability: "En tu primer día declara públicamente el personaje de hasta 5 jugadores. Esta noche sabes cuántos has acertado.",
    controls: ["info"]
  },
  {
    id: "SAGE",
    name: "Sabio",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/sage.png",
    ability: "Si el Demonio te mata descubres que es 1 de 2 jugadores.",
    controls: ["info"]
  },
  // Forasteros
  {
    id: "MUTANT",
    name: "Mutante",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/mutant.png",
    ability: "Si estás loco sobre que eres un Forastero, puedes ser ejecutado.",
    controls: ["info"]
  },
  {
    id: "SWEETHEART",
    name: "Adorable",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/sweetheart.png",
    ability: "Cuando mueras, 1 jugador está borracho.",
    controls: ["drunk"]
  },
  {
    id: "BARBER",
    name: "Barbero",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/barber.png",
    ability: "Cuando mueras, el Demonio puede elegir 2 jugadores por la noche (no otro Demonio) para que intercambien personajes.",
    controls: ["info"]
  },
  {
    id: "KLUTZ",
    name: "Patoso",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/klutz.png",
    ability: "Cuando descubras que has muerto, elige públicamente 1 jugador vivo: si es malo, tu equipo pierde.",
    controls: ["info"]
  },
  // Esbirros
  // Espejo del servidor: la Gemela Malvada es Esbirro (malvada).
  {
    id: "EVIL_TWIN",
    name: "Gemela Malvada",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/eviltwin.png",
    ability: "Tú y 1 jugador del equipo contrario os conocéis. Si el jugador bueno es ejecutado, los malos ganan. Los buenos no pueden ganar si ambos vivís.",
    controls: ["info"]
  },
  {
    id: "WITCH",
    name: "Bruja",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/witch.png",
    ability: "Cada noche elige 1 jugador: si mañana nomina, muere. Si sólo hay 3 jugadores vivos pierdes esta habilidad.",
    controls: ["kill", "info"]
  },
  {
    id: "CERENOVUS",
    name: "Cerenovus",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/cerenovus.png",
    ability: "Cada noche, elige 1 jugador y 1 personaje bueno: mañana el jugador está loco sobre que es ese personaje o puede ser ejecutado.",
    controls: ["info"]
  },
  {
    id: "PIT_HAG",
    name: "Pit-Hag",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/pithag.png",
    ability: "Cada noche* elige 1 jugador y 1 personaje al que se convierte (si no está en juego). Si creas un Demonio, las muertes esta noche son arbitrarias.",
    controls: ["info", "kill"]
  },
  // Demonios
  {
    id: "FANG_GU",
    name: "Fang Gu",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/fanggu.png",
    ability: "Cada noche* elige 1 jugador: muere. El primer Forastero que mates se convierte en Fang Gu malo y, en vez de morir, mueres tú. [+1 Forastero]",
    controls: ["kill"]
  },
  {
    id: "NO_DASHII",
    name: "No Dashii",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/nodashii.png",
    ability: "Cada noche* elige 1 jugador: muere. Tus 2 vecinos Aldeanos están envenenados.",
    controls: ["kill", "poison"]
  },
  {
    id: "VORTOX",
    name: "Vortox",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/vortox.png",
    ability: "Cada noche* elige 1 jugador: muere. Las habilidades de los Aldeanos dan información falsa. Cada día, si nadie es ejecutado, ganan los malos.",
    controls: ["kill"]
  },
  {
    id: "VIGORMORTIS",
    name: "Vigormortis",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/vigormortis.png",
    ability: "Cada noche* elige 1 jugador: muere. Los Esbirros que mates mantienen su habilidad y 1 Aldeano vecino suyo está envenenado. [-1 Forastero]",
    controls: ["kill", "poison"]
  }
];
const firstNightOrder$1 = ["PHILOSOPHER", "MINION_INFO", "DEMON_INFO", "SNAKE_CHARMER", "EVIL_TWIN", "WITCH", "CERENOVUS", "CLOCKMAKER", "DREAMER", "SEAMSTRESS", "MATHEMATICIAN"];
const otherNightOrder$1 = ["PHILOSOPHER", "SNAKE_CHARMER", "WITCH", "CERENOVUS", "PIT_HAG", "FANG_GU", "NO_DASHII", "VORTOX", "VIGORMORTIS", "SWEETHEART", "SAGE", "BARBER", "JUGGLER", "DREAMER", "FLOWERGIRL", "TOWN_CRIER", "ORACLE", "SEAMSTRESS", "MATHEMATICIAN"];
const reminders$1 = {
  MATHEMATICIAN: [{ id: "ABNORMAL", label: "Habilidad anormal", duration: "night" }],
  SNAKE_CHARMER: [{ id: "POISONED", label: "Envenenado", duration: "permanent" }],
  PHILOSOPHER: [{ id: "IS_PHILOSOPHER", label: "Es el Filósofo", duration: "permanent" }, { id: "DRUNK", label: "Borracho", duration: "permanent" }],
  FLOWERGIRL: [{ id: "DEMON_VOTED", label: "Demonio votó", duration: "night" }, { id: "DEMON_NOT_VOTED", label: "Demonio no votó", duration: "night" }],
  TOWN_CRIER: [{ id: "MINION_NOM", label: "Esbirro nominó", duration: "night" }, { id: "MINION_NOT_NOM", label: "Esbirro no nominó", duration: "night" }],
  BARBER: [{ id: "HAIRCUT", label: "Corte de pelo hoy", duration: "day" }, { id: "ONCE", label: "Una vez", duration: "oneShot" }],
  SWEETHEART: [{ id: "CHARM", label: "Adorable (borracho)", duration: "permanent" }],
  CERENOVUS: [{ id: "MAD", label: "Maldito / Loco", duration: "day" }],
  EVIL_TWIN: [{ id: "TWIN", label: "Gemela", duration: "permanent" }],
  MUTANT: [{ id: "CONVINCED", label: "Convencido (loco)", duration: "permanent" }],
  NO_DASHII: [{ id: "POISONED1", label: "Envenenado", duration: "permanent" }, { id: "POISONED2", label: "Envenenado", duration: "permanent" }],
  VIGORMORTIS: [{ id: "WITH_ABILITY", label: "Con habilidad", duration: "permanent" }, { id: "POISONED", label: "Envenenado", duration: "permanent" }],
  VORTOX: [{ id: "DIES", label: "Muere", duration: "night" }]
};
const sectsViolets = {
  id: "SECTS_AND_VIOLETS",
  name: "Sects & Violets",
  roles: roles$2,
  firstNightOrder: firstNightOrder$1,
  otherNightOrder: otherNightOrder$1,
  reminders: reminders$1
};
const roles$1 = [
  // ── ALDEANOS ────────────────────────────────────────────────────────
  {
    id: "ACROBAT",
    name: "Acróbata",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/acrobat.png",
    ability: "Cada noche* elige 1 jugador: si está borracho o envenenado, o acaba estándolo esta noche, mueres.",
    night: { action: "ACROBAT", targets: 1 }
  },
  {
    id: "ALCHEMIST",
    name: "Alquimista",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/alchemist.png",
    ability: "Tienes la habilidad de un Esbirro. Cuando la uses, el Narrador puede pedirte que hagas otra elección.",
    night: { passive: true }
  },
  {
    id: "AMNESIAC",
    name: "Amnésico",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/amnesiac.png",
    ability: "No sabes cuál es tu habilidad. Cada día intenta adivinarla en privado y sabes lo cerca que estás."
  },
  {
    id: "ATHEIST",
    name: "Ateo",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/atheist.png",
    ability: "El Narrador puede romper las reglas. Si el Narrador es ejecutado, ganan los buenos, aunque estés muerto. [No hay malos]"
  },
  {
    id: "BALLOONIST",
    name: "Aeronauta",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/balloonist.png",
    ability: "Cada noche descubres 1 jugador de un tipo diferente al de la noche anterior. [+0 o +1 Forastero]",
    night: { passive: true }
  },
  {
    id: "BANSHEE",
    name: "Banshee",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/banshee.png",
    ability: "Si el Demonio te mata, todos los jugadores lo saben. A partir de ahora, puedes nominar 2 veces por día y votar 2 veces por nominación."
  },
  {
    id: "BOUNTY_HUNTER",
    name: "Cazarrecompensas",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/bounty-hunter.png",
    ability: "Empiezas conociendo 1 jugador malo. Si ese jugador muere, descubres 1 jugador malo esta noche. [1 Aldeano es malo]",
    night: { passive: true }
  },
  {
    id: "CANNIBAL",
    name: "Caníbal",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/cannibal.png",
    ability: "Tienes la habilidad del último jugador muerto ejecutado. Si es malo, estás envenenado hasta que 1 bueno muera ejecutado.",
    night: { passive: true }
  },
  {
    id: "CHOIRBOY",
    name: "Niño del Coro",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/choirboy.png",
    ability: "Si el Demonio mata al Rey, descubres qué jugador es el Demonio [+ Rey]"
  },
  {
    id: "CULT_LEADER",
    name: "Líder de Culto",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/cult-leader.png",
    ability: "Cada noche te conviertes al alineamiento de 1 vecino vivo. Si todos los jugadores buenos eligen unirse a tu culto, tu bando gana.",
    night: { passive: true }
  },
  {
    id: "ENGINEER",
    name: "Ingeniero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/engineer.png",
    ability: "Una vez por partida, por la noche, elige qué Esbirros o qué Demonio está en juego.",
    night: { action: "ENGINEER", targets: 1 }
  },
  {
    id: "FARMER",
    name: "Granjero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/farmer.png",
    ability: "Cuando mueres por la noche, 1 jugador vivo bueno se convierte en Granjero."
  },
  {
    id: "FISHERMAN",
    name: "Pescador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/fisherman.png",
    ability: "Una vez por partida, durante el día, puedes visitar al Narrador para que te aconseje sobre cómo debe ganar tu bando."
  },
  {
    id: "GENERAL",
    name: "General",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/general.png",
    ability: "Cada noche sabes qué alineamiento cree el Narrador que está ganando: bueno, malo o ninguno.",
    night: { passive: true }
  },
  {
    id: "HIGH_PRIESTESS",
    name: "Suma Sacerdotisa",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/high-priestess.png",
    ability: "Cada noche sabes con qué jugador cree el Narrador que deberías hablar más.",
    night: { passive: true }
  },
  {
    id: "HUNTSMAN",
    name: "Cazador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/huntsman.png",
    ability: "Una vez por partida, por la noche, elige 1 jugador vivo: si es la Damisela se convierte en 1 Aldeano que no esté en juego. [+ Damisela]",
    night: { action: "HUNTSMAN", targets: 1 }
  },
  {
    id: "KING",
    name: "Rey",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/king.png",
    ability: "Cada noche, si hay igual o más muertos que vivos, descubres 1 personaje vivo. El Demonio sabe que eres el Rey.",
    night: { passive: true }
  },
  {
    id: "KNIGHT",
    name: "Caballero",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/knight.png",
    ability: "Empiezas conociendo 2 jugadores que no son el Demonio.",
    night: { passive: true }
  },
  {
    id: "LYCANTHROPE",
    name: "Licántropo",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/lycanthrope.png",
    ability: "Cada noche* elige 1 jugador vivo: si es bueno, muere y el Demonio no mata esta noche. Un jugador bueno aparece como malo.",
    night: { action: "LYCANTHROPE_KILL", targets: 1 }
  },
  {
    id: "MAGICIAN",
    name: "Mago",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/magician.png",
    ability: "El Demonio piensa que eres un Esbirro. Los Esbirros piensan que eres un Demonio.",
    night: { passive: true }
  },
  {
    id: "NIGHTWATCHMAN",
    name: "Sereno",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/nightwatchman.png",
    ability: "Una vez por partida, por la noche, elige 1 jugador: descubre que eres Sereno.",
    night: { action: "NIGHTWATCHMAN", targets: 1 }
  },
  {
    id: "NOBLE",
    name: "Noble",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/noble.png",
    ability: "Empiezas conociendo 3 jugadores, 1 y solo 1 de ellos es malo.",
    night: { passive: true }
  },
  {
    id: "POPPY_GROWER",
    name: "Cultivador de Opio",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/poppy-grower.png",
    ability: "Los Esbirros y el Demonio no se conocen. Si mueres, se conocen esta noche.",
    night: { passive: true }
  },
  {
    id: "PREACHER",
    name: "Predicador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/preacher.png",
    ability: "Cada noche elige 1 jugador: si es Esbirro lo sabe. Los Esbirros elegidos no tienen habilidad.",
    night: { action: "PREACHER", targets: 1 }
  },
  {
    id: "SHUGENJA",
    name: "Shugenja",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/shugenja.png",
    ability: "Empiezas sabiendo si el jugador malo más cercano está a tu izquierda o tu derecha. Si es equidistante, la información es arbitraria.",
    night: { passive: true }
  },
  {
    id: "STEWARD",
    name: "Administrador",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/steward.png",
    ability: "Empiezas conociendo 1 jugador bueno.",
    night: { passive: true }
  },
  // ── FORASTEROS ──────────────────────────────────────────────────────
  {
    id: "DAMSEL",
    name: "Damisela",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/damsel.png",
    ability: "Los Esbirros saben que una Damisela está en juego. Si un Esbirro adivina quién eres (una vez por partida) tu equipo pierde."
  },
  {
    id: "GOLEM",
    name: "Gólem",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/golem.png",
    ability: "Sólo puedes nominar 1 vez. Cuando lo hagas, si el nominado no es el Demonio, muere."
  },
  {
    id: "HATTER",
    name: "Sombrerero",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/hatter.png",
    ability: "Si mueres hoy o esta noche, los Esbirros y el Demonio pueden elegir nuevos Esbirros y Demonios que ser."
  },
  {
    id: "HERETIC",
    name: "Hereje",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/heretic.png",
    ability: "Quien gane, pierde y quien pierda gana, aunque estés muerto."
  },
  {
    id: "PLAGUE_DOCTOR",
    name: "Doctor de Plaga",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/plague-doctor.png",
    ability: "Cuando mueres, el Narrador gana la habilidad de un Esbirro."
  },
  {
    id: "POLITICIAN",
    name: "Político",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/politician.png",
    ability: "Si eres el jugador más responsable de que tu equipo pierda, cambias de alineamiento y ganas, aunque estés muerto."
  },
  {
    id: "PUZZLEMASTER",
    name: "Maestro del Puzle",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/puzzlemaster.png",
    ability: "Un jugador está borracho, aunque estés muerto. Si adivinas quién es (una vez por partida), descubres quién es el Demonio, pero si fallas recibes información falsa."
  },
  {
    id: "SNITCH",
    name: "Soplón",
    alignment: "good",
    type: "outsider",
    img: "/assets/roles/carousel/snitch.png",
    ability: "Los Esbirros empiezan conociendo 3 faroles."
  },
  // ── ESBIRROS ────────────────────────────────────────────────────────
  {
    id: "BOFFIN",
    name: "Rata de Laboratorio",
    alignment: "evil",
    type: "minion",
    img: null,
    ability: "El Demonio (incluso borracho o envenenado) tiene la habilidad de un bueno que no esté en juego. Ambos sabéis cuál.",
    night: { passive: true, evil: true }
  },
  {
    id: "BOOMDANDY",
    name: "Boomdandy",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/boomdandy.png",
    ability: "Si eres ejecutado, todos los jugadores menos 3 mueren. Después de una cuenta atrás de 10 a 1, el jugador con más jugadores apuntándole muere.",
    night: { evil: true }
  },
  {
    id: "FEARMONGER",
    name: "Fearmonger",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/fearmonger.png",
    ability: "Cada noche elige 1 jugador: si le nominas y ejecutas, su equipo pierde. Todos los jugadores saben si has elegido a un nuevo jugador.",
    night: { action: "FEARMONGER", targets: 1, evil: true }
  },
  {
    id: "GOBLIN",
    name: "Goblin",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/goblin.png",
    ability: "Si públicamente declaras ser Goblin cuando te nominen y eres ejecutado ese día, tu equipo gana.",
    night: { evil: true }
  },
  {
    id: "HARPY",
    name: "Arpía",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/harpy.png",
    ability: "Cada noche elige 2 jugadores: mañana, el primer jugador está loco sobre que el segundo es malo o uno o ambos pueden morir.",
    night: { action: "HARPY", targets: 2, evil: true }
  },
  {
    id: "MARIONETTE",
    name: "Marioneta",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/marionette.png",
    ability: "Piensas que eres un personaje bueno, pero no lo eres. El Demonio sabe quién eres. [Estás adyacente al Demonio]",
    night: { passive: true, evil: true },
    misperception: { believes: "unusedGood", wakesWithEvil: false, demonKnows: true }
  },
  {
    id: "MEZEPHELES",
    name: "Mezepheles",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/mezepheles.png",
    ability: "Empiezas conociendo 1 palabra secreta. El primer jugador bueno en decirla se convierte en malo esta noche.",
    night: { action: "MEZEPHELES", targets: 1, evil: true }
  },
  {
    id: "ORGAN_GRINDER",
    name: "Organillero",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/organ-grinder.png",
    ability: "Todos los jugadores cierran los ojos al votar y su voto se cuenta en secreto. Cada noche decides si estás borracho hasta el crepúsculo o no.",
    night: { action: "ORGAN_GRINDER", targets: 1, evil: true }
  },
  {
    id: "PSYCHOPATH",
    name: "Psicópata",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/psychopath.png",
    ability: "Cada día, antes de las nominaciones, puedes elegir públicamente 1 jugador: muere. Si eres ejecutado, solo mueres si pierdes a piedra-papel-tijera.",
    night: { evil: true }
  },
  {
    id: "SUMMONER",
    name: "Invocador",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/summoner.png",
    ability: "Recibes 3 faroles. En la tercera noche elige 1 jugador: se vuelve malo y el Demonio que elijas. [No hay Demonio]",
    night: { action: "SUMMONER", targets: 1, evil: true }
  },
  {
    id: "VIZIER",
    name: "Visir",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/vizier.png",
    ability: "Todos los jugadores saben que eres el Visir. No puedes morir durante el día. Si algún bueno vota, puedes elegir ejecutar inmediatamente.",
    night: { evil: true }
  },
  {
    id: "WIDOW",
    name: "Viuda",
    alignment: "evil",
    type: "minion",
    img: "/assets/roles/carousel/widow.png",
    ability: "En tu primera noche ves el Grimorio y eliges 1 jugador: está envenenado. 1 jugador bueno sabe que el Viuda está en juego.",
    night: { action: "WIDOW", targets: 1, evil: true }
  },
  // Espejo del servidor: el Hechicero es Esbirro malvado.
  {
    id: "WIZARD",
    name: "Hechicero",
    alignment: "evil",
    type: "minion",
    img: null,
    ability: "Una vez por partida pídele en privado un deseo al Narrador: si se concede, tu deseo puede tener un precio y deja pistas de su naturaleza.",
    night: { passive: true }
  },
  // ── DEMONIOS ────────────────────────────────────────────────────────
  // Yaggababble es Demonio, no Esbirro.
  {
    id: "YAGGABABBLE",
    name: "Yaggababble",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/yaggababble.png",
    ability: "Empiezas conociendo 1 frase secreta. Cada vez que la digas públicamente hoy, 1 jugador puede morir.",
    night: { action: "YAGGABABBLE", targets: 1, evil: true }
  },
  {
    id: "AL_HADIKHIA",
    name: "Al-Hadikhia",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/al-hadikhia.png",
    ability: "Cada noche* puedes elegir a 3 jugadores (todos descubren quiénes son): cada uno elige en silencio si vive o muere, pero si todos viven, todos mueren.",
    night: { action: "AL_HADIKHIA_KILL", targets: 3, evil: true }
  },
  {
    id: "KAZALI",
    name: "Kazali",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/kazali.png",
    ability: "Cada noche* elige 1 jugador: muere. [Eliges los Esbirros en juego y qué jugadores son. -? a +? Forasteros]",
    night: { action: "KAZALI_KILL", targets: 1, evil: true }
  },
  {
    id: "LEGION",
    name: "Legión",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/legion.png",
    ability: "Cada noche* 1 jugador puede morir. Las ejecuciones fallan si sólo votan los malos. Apareces también como Esbirro. [La mayoría de jugadores son Legión]",
    night: { action: "LEGION_KILL", targets: 1, evil: true }
  },
  {
    id: "LEVIATHAN",
    name: "Leviatán",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/leviathan.png",
    ability: "Si más de 1 jugador bueno es ejecutado, los malos ganan. Todos los jugadores saben que estás en juego. Después del día 5, los malos ganan.",
    night: { evil: true }
  },
  {
    id: "LIL_MONSTA",
    name: "Lil’ Monsta",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/lil-monsta.png",
    ability: "Cada noche los Esbirros eligen quién cuida a Lil’ Monsta y «es el Demonio». Cada noche* 1 jugador puede morir. [+1 Esbirro]",
    night: { action: "LIL_MONSTA_ASSIGN", targets: 1, evil: true }
  },
  {
    id: "LLEECH",
    name: "Lleech",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/lleech.png",
    ability: "Cada noche* elige 1 jugador: muere. Empiezas eligiendo 1 jugador: está envenenado. Mueres si y sólo si ese jugador está muerto.",
    night: { action: "LLEECH_KILL", targets: 1, evil: true }
  },
  {
    id: "OJO",
    name: "Ojo",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/ojo.png",
    ability: "Cada noche* elige 1 personaje: muere. Si no está en juego, el Narrador decide quién muere.",
    night: { action: "OJO_KILL", targets: 1, evil: true }
  },
  {
    id: "RIOT",
    name: "Riot",
    alignment: "evil",
    type: "demon",
    img: "/assets/roles/carousel/riot.png",
    ability: "En día 3, los Esbirros se convierten en Riot y los nominados mueren pero pueden nominar a un jugador vivo inmediatamente. Esto debe pasar.",
    night: { evil: true }
  }
];
const firstNightOrder = [
  "EVIL_INFO",
  "POPPY_GROWER",
  "MAGICIAN",
  "PREACHER",
  // antes de los Esbirros: les quita la habilidad esta noche
  "ENGINEER",
  // antes que nadie: decide qué Esbirros / Demonio hay en juego
  "BOFFIN",
  // demon conoce su habilidad buena antes de actuar
  "KAZALI",
  "LEGION",
  "LIL_MONSTA",
  "LLEECH",
  "RIOT",
  "LEVIATHAN",
  // MARIONETTE excluida: pasiva, no despierta con el mal
  // Sin asterisco en su habilidad → estos Esbirros SÍ actúan la primera noche.
  "MEZEPHELES",
  "FEARMONGER",
  "HARPY",
  "ORGAN_GRINDER",
  "SUMMONER",
  "YAGGABABBLE",
  // La Viuda envenena ANTES que los personajes de información: si actuaba al
  // final, todos ellos ya habían recibido información verdadera.
  "WIDOW",
  "SHUGENJA",
  "STEWARD",
  "PUZZLEMASTER",
  "ALCHEMIST",
  "HUNTSMAN",
  // salva a la Damisela antes de que los Esbirros la busquen
  "BOUNTY_HUNTER",
  "CULT_LEADER",
  "NIGHTWATCHMAN",
  "KNIGHT",
  "NOBLE",
  "DAMSEL",
  "SNITCH",
  "BALLOONIST",
  "GENERAL",
  "HIGH_PRIESTESS",
  "KING"
];
const otherNightOrder = [
  "POPPY_GROWER",
  "PREACHER",
  // antes de esbirros: quita habilidad del esbirro elegido esa noche
  "LYCANTHROPE",
  // antes de demonios: si mata a bueno, bloquea ataque del demonio
  "ENGINEER",
  // antes de demonios: cambia qué roles están en juego antes de que actúen
  "HUNTSMAN",
  // antes de demonios: salva Damisela antes que actúe demonio (canónico)
  // Esbirros que inhabilitan: antes de los demonios y de la información.
  "MEZEPHELES",
  "FEARMONGER",
  "HARPY",
  "ORGAN_GRINDER",
  "SUMMONER",
  // Ataques demoníacos: después de todo lo que protege o inhabilita.
  "LLEECH",
  "KAZALI",
  "LEGION",
  "LIL_MONSTA",
  "OJO",
  "AL_HADIKHIA",
  "YAGGABABBLE",
  "ACROBAT",
  "CANNIBAL",
  "BOUNTY_HUNTER",
  "CULT_LEADER",
  "NIGHTWATCHMAN",
  "BALLOONIST",
  "GENERAL",
  "HIGH_PRIESTESS",
  "KING"
];
const reminders = {
  // Simplificado: solo roles con fichas complejas
  BOUNTY_HUNTER: [{ id: "EVIL", label: "Es malvado", duration: "permanent" }],
  KNIGHT: [{ id: "NOT_DEMON", label: "No es Demonio", duration: "permanent" }],
  NOBLE: [{ id: "EVIL", label: "Es malvado", duration: "permanent" }, { id: "GOOD", label: "Es bueno", duration: "permanent" }],
  DAMSEL: [{ id: "KNOWN", label: "Conocida", duration: "permanent" }],
  PUZZLEMASTER: [{ id: "DRUNK", label: "Borracho", duration: "permanent" }],
  SNITCH: [{ id: "BLUFF_1", label: "Bluff 1", duration: "permanent" }, { id: "BLUFF_2", label: "Bluff 2", duration: "permanent" }, { id: "BLUFF_3", label: "Bluff 3", duration: "permanent" }],
  STEWARD: [{ id: "EVIL_NEIGHBOR", label: "Vecino malvado", duration: "permanent" }],
  MEZEPHELES: [{ id: "TURNED_EVIL", label: "Se volvió malvado", duration: "permanent" }],
  PSYCHOPATH: [{ id: "KILLS", label: "Mata", duration: "permanent" }]
};
const carousel = {
  id: "CAROUSEL",
  name: "The Carousel",
  name_es: "El Carrusel",
  roles: roles$1,
  firstNightOrder,
  otherNightOrder,
  reminders
};
const roles = [
  {
    id: "APPRENTICE",
    name: "Aprendiz",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "En tu primera noche ganas la habilidad de 1 Aldeano (si eres bueno) o 1 Esbirro (si eres malo).",
    night: { passive: true }
  },
  {
    id: "BARISTA",
    name: "Barista",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Cada noche, hasta el crepúsculo, 1) un jugador está sobrio, sano y recibe información verdadera, o 2) su habilidad funciona 2 veces. El jugador sabe cuál de las dos.",
    night: { action: "BARISTA", targets: 1 }
  },
  {
    id: "BONE_COLLECTOR",
    name: "Coleccionista de Huesos",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Una vez por partida, por la noche, elige 1 jugador muerto: vuelve a ganar su habilidad hasta el crepúsculo.",
    night: { action: "BONE_COLLECTOR", targets: 1 }
  },
  {
    id: "BISHOP",
    name: "Obispo",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Sólo puede nominar el Narrador. Debe nominar al menos a 1 jugador del alineamiento contrario al Obispo cada día."
  },
  {
    id: "BUTCHER",
    name: "Carnicero",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Cada día, después de la primera ejecución, puedes nominar otra vez."
  },
  {
    id: "DEVIANT",
    name: "Pervertido",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Si has sido gracioso hoy no puedes ser exiliado."
  },
  {
    id: "HARLOT",
    name: "Meretriz",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Cada noche* elige 1 jugador vivo: si accede, descubres su personaje, pero ambos podéis morir.",
    night: { action: "HARLOT", targets: 1 }
  },
  {
    id: "JUDGE",
    name: "Juez",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Una vez por partida, si otro jugador ha nominado, puedes forzar la ejecución o impedirla."
  },
  {
    id: "MATRON",
    name: "Institutriz",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Cada día puedes elegir hasta 3 parejas de jugadores para que cambien sus asientos. Los jugadores no pueden levantarse para hablar en privado."
  },
  {
    id: "VOUDON",
    name: "Voudon",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Solo tú y los muertos podéis votar. No necesitan ficha de votación para hacerlo. No es necesaria una mayoría para ejecutar."
  }
];
const extraRoles = [
  {
    id: "ALSAAHIR",
    name: "Alsaahir",
    alignment: "good",
    type: "townfolk",
    img: null,
    ability: "Cada día, si adivinas públicamente qué jugadores son Esbirros y qué jugadores son Demonios, ganan los buenos.",
    night: { passive: true }
  },
  {
    id: "PIXIE",
    name: "Duendecillo",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/pixie.png",
    ability: "Empiezas conociendo 1 Aldeano en juego. Si estás loco sobre que eres ese personaje, ganas su habilidad cuando muera.",
    night: { passive: true }
  },
  {
    id: "PRINCESS",
    name: "Princesa",
    alignment: "good",
    type: "townfolk",
    img: null,
    ability: "En tu primer día, si nominas y ejecutas a un jugador, el Demonio no mata esta noche.",
    night: { passive: true }
  },
  {
    id: "VILLAGE_IDIOT",
    name: "Tonto del Pueblo",
    alignment: "good",
    type: "townfolk",
    img: "/assets/roles/carousel/village-idiot.png",
    ability: "Cada noche elige 1 jugador: descubres su alineamiento. [+0 a +2 Tontos del pueblo, uno extra está borracho]",
    night: { passive: true }
  },
  {
    id: "HERMIT",
    name: "Ermitaño",
    alignment: "good",
    type: "outsider",
    img: null,
    ability: "Tienes todas las habilidades de Forasteros. [-0 o -1 Forasteros]",
    night: { passive: true }
  },
  {
    id: "OGRE",
    name: "Ogro",
    alignment: "good",
    type: "outsider",
    img: null,
    ability: "En tu primera noche elige 1 jugador (no a ti): te conviertes a su alineamiento (no sabes cuál) incluso aunque estés borracho o envenenado.",
    night: { passive: true }
  },
  {
    id: "GNOME",
    name: "Gnomo",
    alignment: "evil",
    type: "minion",
    img: null,
    ability: "Todos los jugadores empiezan conociendo a un jugador de tu alineamiento. Puedes elegir matar a quien le nomine.",
    night: { passive: true }
  },
  {
    id: "WRAITH",
    name: "Espectro",
    alignment: "evil",
    type: "minion",
    img: null,
    ability: "Puedes abrir los ojos por la noche. Despiertas cuando otros jugadores malos lo hagan.",
    night: { passive: true }
  },
  {
    id: "LORD_OF_TYPHON",
    name: "Señor de Typhon",
    alignment: "evil",
    type: "demon",
    img: null,
    ability: "Cada noche* elige 1 jugador: muere. [Los personajes malos están en una línea. Tú estás en medio. +1 Esbirro. -? a +? Forasteros]",
    night: { passive: true }
  },
  {
    id: "FIDDLER",
    name: "Violinista",
    alignment: "evil",
    type: "demon",
    img: null,
    ability: "Una vez por partida, el Demonio elige en secreto 1 jugador del equipo contrario. Todos los jugadores deciden quién de los 2 gana.",
    night: { passive: true }
  },
  {
    id: "XAAN",
    name: "Xaan",
    alignment: "evil",
    type: "minion",
    img: null,
    ability: "En la noche X, todos los Aldeanos están envenenados hasta el crepúsculo. [X Forasteros]",
    night: { passive: true }
  },
  {
    id: "BEGGAR",
    name: "Mendigo",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Debes usar una ficha de votación para votar. Si 1 jugador muerto te da la suya, descubres su alineamiento. Estás sobrio y sano.",
    night: { passive: true }
  },
  {
    id: "BUREAUCRAT",
    name: "Burócrata",
    alignment: "evil",
    type: "traveler",
    img: null,
    ability: "Cada noche elige 1 jugador (no a ti): su voto cuenta como 3 votos mañana.",
    night: { passive: true }
  },
  {
    id: "THIEF",
    name: "Ladrón",
    alignment: "evil",
    type: "traveler",
    img: null,
    ability: "Cada noche elige 1 jugador (no a ti): su voto cuenta negativo mañana.",
    night: { passive: true }
  },
  {
    id: "GUNSLINGER",
    name: "Pistolero",
    alignment: "evil",
    type: "traveler",
    img: null,
    ability: "Cada día, después de que se haya contado la primera votación, puedes elegir 1 jugador que haya votado: muere.",
    night: { passive: true }
  },
  {
    id: "GANGSTER",
    name: "Gánster",
    alignment: "evil",
    type: "traveler",
    img: null,
    ability: "Una vez por día puedes matar a uno de tus vecinos vivos si el otro vecino vivo lo acepta.",
    night: { passive: true }
  },
  {
    id: "SCAPEGOAT",
    name: "Chivo Expiatorio",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Si 1 jugador de tu alineamiento es ejecutado, en vez de eso puedes ser ejecutado tú.",
    night: { passive: true }
  },
  {
    id: "DOOMSAYER",
    name: "Agorero",
    alignment: "good",
    type: "traveler",
    img: null,
    ability: "Si quedan 4 o más jugadores vivos, cada jugador vivo puede (una vez por partida) declarar públicamente que 1 jugador de su alineamiento muera.",
    night: { passive: true }
  },
  {
    id: "DUCHESS",
    name: "Duquesa",
    alignment: "evil",
    type: "traveler",
    img: null,
    ability: "Cada día, 3 jugadores pueden visitar al Narrador. Por la noche* cada visitante sabe cuántos son malos, pero 1 recibe información falsa.",
    night: { passive: true }
  },
  {
    id: "BIG_WIG",
    name: "Mandamás",
    alignment: "evil",
    type: "traveler",
    img: null,
    ability: "Cada nominado elige 1 jugador: hasta la votación, sólo puede hablar el elegido y está loco de que el nominado es bueno o puede morir.",
    night: { passive: true }
  },
  {
    id: "ANGEL",
    name: "Ángel",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Algo malo puede pasarle a quien sea más responsable de matar a un jugador novato.",
    night: { passive: true }
  },
  {
    id: "BOOTLEGGER",
    name: "Contrabandista",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Este guion tiene personajes o reglas caseras.",
    night: { passive: true }
  },
  {
    id: "BUDDHIST",
    name: "Budista",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "En los primeros 2 minutos del día, los jugadores veteranos no pueden hablar.",
    night: { passive: true }
  },
  {
    id: "CACKLEJACK",
    name: "Risistencia",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Cada día elige 1 jugador: un jugador diferente cambia de personaje esta noche.",
    night: { passive: true }
  },
  {
    id: "DEUS_EX_FIASCO",
    name: "Deus Ex Fiasco",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Al menos una vez por partida, el Narrador cometerá un error, lo corregirá y lo admitirá públicamente.",
    night: { passive: true }
  },
  {
    id: "DJINN",
    name: "Djinn",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Utiliza una regla especial.",
    night: { passive: true }
  },
  {
    id: "FERRYMAN",
    name: "Barquero",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "En el último día, todos los jugadores muertos recuperan su voto.",
    night: { passive: true }
  },
  {
    id: "FIBBIN",
    name: "Fibbin",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Una vez por partida, 1 jugador bueno puede recibir información incorrecta.",
    night: { passive: true }
  },
  {
    id: "GARDENER",
    name: "Jardinero",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "El Narrador puede asignar 1 o más personajes a jugadores específicos.",
    night: { passive: true }
  },
  {
    id: "GOD_OF_UG",
    name: "Dios de Ug",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Un gorro Ug. Si tú tener gorro ug, tú hablar un sonido cada vez pero votar doble. Si tú fallar, tú perder gorro Ug.",
    night: { passive: true }
  },
  {
    id: "HELLS_LIBRARIAN",
    name: "Bibliotecario del Infierno",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Algo malo puede pasarle a quien hable cuando el Narrador pida silencio.",
    night: { passive: true }
  },
  {
    id: "HINDU",
    name: "Hindú",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Los primeros 4 jugadores que mueran se reencarnan en Viajeros del mismo alineamiento.",
    night: { passive: true }
  },
  {
    id: "KNAVES",
    name: "Truhanes",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Hay 2 Narradores: uno miente y otro dice la verdad. Una vez por partida, en el crepúsculo, pueden cambiar.",
    night: { passive: true }
  },
  {
    id: "POPE",
    name: "Papa",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Hay personajes buenos duplicados en juego. Pueden ser faroles.",
    night: { passive: true }
  },
  {
    id: "REVOLUTIONARY",
    name: "Revolucionario",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "2 jugadores vecinos son del mismo alineamiento. Una vez por partida, uno de ellos aparecerá del alineamiento opuesto.",
    night: { passive: true }
  },
  {
    id: "SENTINEL",
    name: "Centinela",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Puede haber 1 Forastero más o menos.",
    night: { passive: true }
  },
  {
    id: "SPIRIT_OF_IVORY",
    name: "Espíritu de Marfil",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "No puede haber más de 1 jugador malo extra.",
    night: { passive: true }
  },
  {
    id: "STORM_CATCHER",
    name: "Atrapa Tormentas",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Nombra un personaje bueno. Si está en juego sólo puede morir por ejecución, pero los malos saben quién es.",
    night: { passive: true }
  },
  {
    id: "TOR",
    name: "Tor",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Los jugadores no saben su personaje o alineamiento. Lo descubren cuando mueren.",
    night: { passive: true }
  },
  {
    id: "TOYMAKER",
    name: "Juguetero",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "El Demonio puede decidir no atacar una noche y debe hacerlo al menos 1 vez por partida. Los malos reciben información inicial normal.",
    night: { passive: true }
  },
  {
    id: "VENTRILOQUIST",
    name: "Ventrílocuo",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Si un jugador está loco de ser un personaje nuevo durante su nominación, puede no morir si es ejecutado hoy.",
    night: { passive: true }
  },
  {
    id: "ZEALOT",
    name: "Fanático",
    alignment: "good",
    type: "outsider",
    img: null,
    ability: "Si hay 5 o más jugadores vivos, debes votar en todas las nominaciones.",
    night: { passive: true }
  },
  {
    id: "ZENOMANCER",
    name: "Zenomante",
    alignment: "good",
    type: "fabled",
    img: null,
    ability: "Uno o más jugadores tienen una misión. Cuando la completan aprenden información verdadera.",
    night: { passive: true }
  }
];
const CAMPAIGNS = {
  [troubleBrewing.id]: troubleBrewing,
  [badMoonRising.id]: badMoonRising,
  [sectsViolets.id]: sectsViolets,
  [carousel.id]: carousel
};
const CAMPAIGN_LIST = [troubleBrewing, badMoonRising, sectsViolets, carousel];
const HIDDEN_CAMPAIGN_IDS = ["CAROUSEL"];
const SELECTABLE_CAMPAIGNS = CAMPAIGN_LIST.filter((c) => !HIDDEN_CAMPAIGN_IDS.includes(c.id));
const DEFAULT_CAMPAIGN = troubleBrewing.id;
function getCampaign(id) {
  return CAMPAIGNS[id] || CAMPAIGNS[DEFAULT_CAMPAIGN];
}
const ALL_ROLES = (() => {
  const seen = {};
  const out = [];
  for (const c of CAMPAIGN_LIST) {
    for (const r of c.roles) {
      if (!seen[r.id]) {
        seen[r.id] = true;
        out.push(r);
      }
    }
  }
  for (const r of roles) {
    if (!seen[r.id]) {
      seen[r.id] = true;
      out.push(r);
    }
  }
  for (const r of extraRoles) {
    if (!seen[r.id]) {
      seen[r.id] = true;
      out.push(r);
    }
  }
  return out;
})();
function scriptRoles(game) {
  var _a;
  if (!game) return ALL_ROLES;
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const push = (srv, id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const local = ROLE_BY_ID[id];
    if (!local && !srv) return;
    out.push({
      ...local || {},
      id,
      name: (srv == null ? void 0 : srv.name) || (local == null ? void 0 : local.name) || id,
      type: (srv == null ? void 0 : srv.type) || (local == null ? void 0 : local.type),
      alignment: (srv == null ? void 0 : srv.alignment) || (local == null ? void 0 : local.alignment),
      ability: (srv == null ? void 0 : srv.ability) || (local == null ? void 0 : local.ability),
      img: (local == null ? void 0 : local.img) || (srv == null ? void 0 : srv.image) || null,
      homebrew: !!(srv == null ? void 0 : srv.homebrew)
    });
  };
  for (const r of game.campaignRoles || []) push(r, r.id);
  for (const roleId of Object.values(((_a = game.setup) == null ? void 0 : _a.assignments) || {})) push(null, roleId);
  return out.length ? out : ALL_ROLES;
}
const ROLE_BY_ID = Object.fromEntries(ALL_ROLES.map((r) => [r.id, r]));
Object.fromEntries(ALL_ROLES.map((r) => [r.id, r.name]));
Object.fromEntries(ALL_ROLES.map((r) => [r.id, r.type]));
const GENERIC_STATUSES = [
  "🍺 Borracho",
  "🧪 Envenenado",
  "🛡 Protegido",
  "✅ A salvo",
  "☠ Muerto",
  "👻 Parece muerto",
  "🌙 No despierta",
  "🎯 Atacado",
  "⭐ Marcado",
  "1️⃣ Habilidad usada"
];
const CAMPAIGN_STATUSES = {
  TROUBLE_BREWING: ["🤵 Es el Amo", "🟥 Registra como malvado"],
  BAD_MOON_RISING: ["⚓ Marinero", "🚫 No puede morir (Posadero)", "🤡 No-muerte usada", "🪦 Profesor usado"],
  SECTS_AND_VIOLETS: ["🐍 Encantado", "🤪 Loco", "🧠 Filósofo activo", "🔮 Info falsa (Vortox)"],
  CAROUSEL: ["🎪 Experimentales", "🎭 Rol dual", "⚡ Habilidad activa", "📋 Cambio de rol"]
};
function statusTokens(id) {
  return [...GENERIC_STATUSES, ...CAMPAIGN_STATUSES[id] || []];
}
function remindersForRolesInPlay(campaignId, roleIdsInPlay, game = null) {
  var _a;
  const campaign = getCampaign(campaignId);
  const map = campaign.reminders || {};
  const seenRoles = new Set(roleIdsInPlay);
  const out = [];
  const covered = /* @__PURE__ */ new Set();
  for (const roleId of Object.keys(map)) {
    if (!seenRoles.has(roleId)) continue;
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    covered.add(roleId);
    for (const t of map[roleId]) {
      out.push({
        tokenId: t.id,
        roleId,
        roleName: role.name,
        img: role.img,
        label: t.label,
        duration: t.duration || "permanent"
      });
    }
  }
  for (const srv of (game == null ? void 0 : game.campaignRoles) || []) {
    if (!seenRoles.has(srv.id) || covered.has(srv.id)) continue;
    if (!Array.isArray(srv.reminders) || !srv.reminders.length) continue;
    for (const label2 of srv.reminders) {
      out.push({
        tokenId: slugToken(label2),
        roleId: srv.id,
        roleName: srv.name,
        img: ((_a = ROLE_BY_ID[srv.id]) == null ? void 0 : _a.img) || srv.image || null,
        label: label2,
        duration: "permanent"
      });
    }
  }
  return out;
}
function slugToken(label2) {
  return String(label2).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}
const NIGHT = ["first_night", "night"];
const DAY = ["day", "nominations", "voting"];
const ABILITY_PANELS = {
  // ── Trouble Brewing ────────────────────────────────────────────────
  POISONER: {
    phases: NIGHT,
    targets: 1,
    action: "POISON",
    allowSelf: true,
    note: "Actúa el primero. El veneno dura esta noche y el día siguiente."
  },
  MONK: {
    phases: NIGHT,
    targets: 1,
    excludeSelf: true,
    action: "PROTECT",
    note: "No puede protegerse a sí mismo. Solo bloquea al Demonio, no otras muertes."
  },
  IMP: {
    phases: NIGHT,
    targets: 1,
    allowSelf: true,
    action: "IMP_KILL",
    note: "Si se elige a sí mismo, un Esbirro se convierte en Diablillo y la partida CONTINÚA."
  },
  FORTUNE_TELLER: {
    phases: NIGHT,
    targets: 2,
    action: "FORTUNE_TELLER",
    toggle: ["SÍ hay Demonio", "NO hay Demonio"],
    note: "Recuerda marcar el señuelo: un jugador bueno que le aparece como Demonio."
  },
  EMPATH: {
    phases: NIGHT,
    targets: 0,
    action: "EMPATH",
    number: [0, 2],
    note: "Cuenta los vecinos VIVOS, saltando muertos."
  },
  BUTLER: {
    phases: NIGHT,
    targets: 1,
    excludeSelf: true,
    action: "BUTLER_MASTER",
    note: "Mañana solo puede votar si su Amo vota."
  },
  RAVENKEEPER: {
    phases: NIGHT,
    targets: 1,
    action: "RAVENKEEPER_INFO",
    note: "Solo despierta si murió DE NOCHE. Aprende el personaje del elegido."
  },
  UNDERTAKER: {
    phases: NIGHT,
    targets: 0,
    action: "UNDERTAKER_INFO",
    note: "Solo si hoy hubo ejecución."
  },
  SPY: {
    phases: NIGHT,
    targets: 0,
    action: "SPY_INFO",
    note: "Ve el Grimorio. Puedes hacerle registrar como bueno y con personaje bueno."
  },
  SLAYER: {
    phases: DAY,
    targets: 1,
    excludeSelf: true,
    send: "SLAYER_ACTION",
    once: "slayerUsed",
    note: "Solo el narrador dispara, cuando el jugador lo pide en voz alta."
  },
  VIRGIN: {
    phases: DAY,
    targets: 0,
    note: "Se gasta con la PRIMERA nominación, la haga quien la haga. Solo mata si nomina un Aldeano."
  },
  MAYOR: {
    phases: "*",
    targets: 1,
    note: "Si el Demonio le ataca, puedes redirigir la muerte a otro. Con 3 vivos y sin ejecución, gana el Bien."
  },
  RECLUSE: {
    phases: "*",
    targets: 0,
    registersAs: true,
    note: "Decide si registra como malvado y con qué personaje."
  },
  SAINT: {
    phases: "*",
    targets: 0,
    note: "⚠ Si muere EJECUTADO, ganan los malvados. Envenenado, no."
  },
  SCARLET_WOMAN: {
    phases: "*",
    targets: 0,
    note: "Con 5+ vivos hereda EL MISMO personaje del Demonio muerto. La página lo hace sola."
  },
  // ── Bad Moon Rising ────────────────────────────────────────────────
  GRANDMOTHER: {
    phases: NIGHT,
    targets: 1,
    action: "GRANDMOTHER_INFO",
    note: "Marca al nieto. Si el Demonio lo mata, la Abuela muere también."
  },
  SAILOR: {
    phases: NIGHT,
    targets: 1,
    action: "SAILOR_DRUNK",
    note: "No puede morir. Elige si se emborracha él o el elegido."
  },
  CHAMBERMAID: {
    phases: NIGHT,
    targets: 2,
    number: [0, 2],
    action: "CHAMBERMAID_INFO",
    note: "Cuenta cuántos de los dos despertaron esta noche por su habilidad."
  },
  GOON: {
    phases: NIGHT,
    targets: 1,
    action: "GOON_TRIGGER",
    note: "Marca al PRIMERO que lo eligió esta noche: se emborracha y el Matón adopta su alineación."
  },
  EXORCIST: {
    phases: NIGHT,
    targets: 1,
    action: "EXORCIST_CHOOSE",
    excludePrevious: true,
    note: "No puede repetir objetivo. Si acierta, el Demonio no despierta ni mata."
  },
  INNKEEPER: {
    phases: NIGHT,
    targets: 2,
    action: "INNKEEPER_PROTECT",
    note: "Los dos quedan a salvo; elige cuál de ellos queda borracho."
  },
  GAMBLER: {
    phases: NIGHT,
    targets: 1,
    guessRole: true,
    note: "Si falla la conjetura, muere. Envenenado muere aunque acierte."
  },
  COURTIER: {
    phases: NIGHT,
    targets: 0,
    pickRole: true,
    once: "courtierUsed",
    note: "Nombra un PERSONAJE, no un jugador: 3 días y 3 noches borracho."
  },
  PROFESSOR: {
    phases: NIGHT,
    targets: 1,
    action: "PROFESSOR_REVIVE",
    deadOnly: true,
    once: "professorUsed",
    note: "Solo revive si el elegido es Aldeano. El uso se gasta igualmente."
  },
  DEVILS_ADVOCATE: {
    phases: NIGHT,
    targets: 1,
    action: "DEVILS_ADVOCATE_PROTECT",
    excludePrevious: true,
    note: "El elegido sobrevive a la ejecución de mañana. No puede repetir objetivo."
  },
  ASSASSIN: {
    phases: NIGHT,
    targets: 1,
    action: "ASSASSIN_KILL",
    once: "assassinUsed",
    note: "⚠ Este ataque IGNORA Monje, Soldado y Posadero."
  },
  GOSSIP: {
    phases: NIGHT,
    targets: 1,
    confirm: "¿Su afirmación pública de hoy era verdadera?",
    note: "Si era verdadera, elige quién muere esta noche."
  },
  PACIFIST: {
    phases: DAY,
    targets: 0,
    note: "Puedes decidir que un Aldeano ejecutado NO muera — usa Revivir si lo salvas."
  },
  FOOL: {
    phases: "*",
    targets: 0,
    note: "Su primera muerte se anula. Envenenado muere y el uso NO se gasta."
  },
  TINKER: {
    phases: "*",
    targets: 0,
    killButton: true,
    note: "Puede morir en cualquier momento: mátalo cuando quieras."
  },
  MOONCHILD: {
    phases: "*",
    targets: 1,
    note: "Al saber que murió elige en público: si es bueno, muere esta noche."
  },
  GODFATHER: {
    phases: NIGHT,
    targets: 1,
    action: "GODFATHER_KILL",
    note: "Solo actúa la noche siguiente a la muerte de un Forastero durante el día."
  },
  MASTERMIND: {
    phases: "*",
    targets: 0,
    note: "Si el Demonio muere, NO anuncies nada: se juega 1 día más. La página lo gestiona."
  },
  ZOMBUUL: {
    phases: NIGHT,
    targets: 1,
    action: "ZOMBUUL_KILL",
    note: "Solo ataca si hoy no murió nadie. Su primera muerte es fingida."
  },
  PUKKA: {
    phases: NIGHT,
    targets: 1,
    action: "PUKKA_POISON",
    note: "Envenena al nuevo; el envenenado de anoche muere."
  },
  SHABALOTH: {
    phases: NIGHT,
    targets: 2,
    action: "SHABALOTH_KILL",
    note: "Mata a dos. Puedes revivir a una víctima de anoche."
  },
  PO: {
    phases: NIGHT,
    targets: 1,
    allowNone: true,
    action: "KILL",
    note: "Si no elige a nadie, la próxima noche mata a 3."
  },
  // ── Sects & Violets ────────────────────────────────────────────────
  SNAKE_CHARMER: {
    phases: NIGHT,
    targets: 1,
    note: "Si acierta con el Demonio, intercambian personaje y alineación; el nuevo Aldeano queda envenenado."
  },
  PHILOSOPHER: {
    phases: NIGHT,
    targets: 0,
    pickRole: true,
    once: "philosopherUsed",
    note: "Nombra un personaje BUENO: gana su habilidad. Si está en juego, su portador queda borracho."
  },
  SEAMSTRESS: {
    phases: NIGHT,
    targets: 2,
    action: "SEAMSTRESS_INFO",
    toggle: ["Misma alineación", "Distinta alineación"],
    once: "seamstressUsed",
    note: "Una vez por partida. El botón calcula la respuesta; el toggle la fuerza a mano."
  },
  DREAMER: {
    phases: NIGHT,
    targets: 1,
    excludeSelf: true,
    action: "DREAMER_INFO",
    note: "Recibe 1 personaje bueno y 1 malvado; uno de los dos es el real."
  },
  ARTIST: {
    phases: DAY,
    targets: 0,
    freeText: "Respuesta",
    toggle: ["SÍ", "NO"],
    once: "artistUsed",
    privateRoom: true,
    note: 'Responde en privado a una pregunta de sí o no. También vale "no lo sé".'
  },
  SAVANT: {
    phases: DAY,
    targets: 0,
    twoTexts: ["Afirmación verdadera", "Afirmación falsa"],
    privateRoom: true,
    note: "Dale dos frases, una verdadera y otra falsa, sin decirle cuál es cuál."
  },
  JUGGLER: {
    phases: "*",
    targets: 0,
    number: [0, 5],
    note: "Anota sus conjeturas del primer día; esa noche recibe cuántas acertó."
  },
  SWEETHEART: {
    phases: "*",
    targets: 1,
    note: "Al morir, un jugador queda borracho el resto de la partida."
  },
  BARBER: {
    phases: "*",
    targets: 0,
    note: "Al morir, el Demonio puede intercambiar 2 personajes esta noche. Panel propio abajo."
  },
  KLUTZ: {
    phases: "*",
    targets: 1,
    note: "Al saber que murió elige en público: si es MALVADO, su equipo PIERDE."
  },
  MUTANT: {
    phases: "*",
    targets: 0,
    killButton: true,
    note: "Si habla de que es Forastero, puedes ejecutarlo cuando quieras."
  },
  WITCH: {
    phases: NIGHT,
    targets: 1,
    action: "WITCH_CURSE",
    note: "El maldito muere si nomina mañana. Con 3 o menos vivos, pierde la habilidad."
  },
  CERENOVUS: {
    phases: NIGHT,
    targets: 1,
    pickRole: true,
    madness: true,
    note: 'Impón la locura con "Cambiar rol → solo rol creído". Si no la cumple, puedes ejecutarlo.'
  },
  PIT_HAG: {
    phases: NIGHT,
    targets: 1,
    pickRole: true,
    anyRole: true,
    note: "Puede crear cualquier personaje. Si crea un Demonio, alguien muere esa noche."
  },
  FANG_GU: {
    phases: NIGHT,
    targets: 1,
    action: "FANG_GU_KILL",
    note: "El primer Forastero atacado se convierte en Fang Gu y el original muere. La partida CONTINÚA."
  },
  NO_DASHII: {
    phases: NIGHT,
    targets: 1,
    action: "NO_DASHII_KILL",
    note: "Sus dos Aldeanos vecinos vivos están siempre envenenados."
  },
  VORTOX: {
    phases: NIGHT,
    targets: 1,
    action: "VORTOX_KILL",
    note: "⚠ TODA la información de Aldeanos es falsa. Día sin ejecución = ganan los malvados."
  },
  VIGORMORTIS: {
    phases: NIGHT,
    targets: 1,
    action: "VIGORMORTIS_KILL",
    note: "Los Esbirros que mate conservan habilidad y envenenan a un Aldeano vecino."
  },
  // ── The Carousel ───────────────────────────────────────────────────
  ACROBAT: {
    phases: NIGHT,
    targets: 1,
    action: "ACROBAT_CHECK",
    note: "Si el elegido está o queda borracho/envenenado esta noche, el Acróbata muere."
  },
  ALCHEMIST: {
    phases: "*",
    targets: 0,
    pickRole: true,
    note: "Asígnale una habilidad de Esbirro. Puedes pedirle que elija diferente."
  },
  AMNESIAC: {
    phases: "*",
    targets: 0,
    privateRoom: true,
    setText: { action: "AMNESIAC_SET", label: "Habilidad secreta que le has asignado", button: "💾 Fijar habilidad" },
    scale: {
      action: "AMNESIAC_GUESS",
      label: "¿Cómo de cerca está su suposición de hoy?",
      options: [
        { value: "frio", label: "🧊 Frío" },
        { value: "templado", label: "🌡️ Templado" },
        { value: "caliente", label: "🔥 Caliente" },
        { value: "bingo", label: "🎯 ¡Bingo!" }
      ]
    },
    note: "Tú decides su habilidad. Cada día te pregunta en privado y le respondes frío / templado / caliente / bingo."
  },
  ATHEIST: {
    phases: "*",
    targets: 0,
    note: "⚠ Con Ateo en juego la página NUNCA termina la partida sola. Ganan los buenos si te ejecutan a ti."
  },
  BALLOONIST: {
    phases: NIGHT,
    targets: 1,
    note: "Cada noche un jugador de tipo DISTINTO al de anoche."
  },
  BOUNTY_HUNTER: {
    phases: NIGHT,
    targets: 1,
    note: "Conoce 1 malvado. Si ese muere, aprende otro esa noche."
  },
  CANNIBAL: {
    phases: "*",
    targets: 0,
    note: "Tiene la habilidad del último ejecutado. Si era malvado, queda envenenado."
  },
  CULT_LEADER: {
    phases: NIGHT,
    targets: 0,
    note: "Toma la alineación de un vecino vivo. Si todos los buenos son del culto, gana su equipo."
  },
  ENGINEER: {
    phases: NIGHT,
    targets: 0,
    pickRole: true,
    once: "engineerUsed",
    note: 'Elige qué Esbirros o qué Demonio quiere en juego: aplícalo con "Cambiar rol".'
  },
  FARMER: {
    phases: "*",
    targets: 1,
    note: "Si muere DE NOCHE, elige un jugador bueno vivo que pasa a ser Granjero."
  },
  FISHERMAN: {
    phases: DAY,
    targets: 0,
    freeText: "Consejo",
    once: "fishermanUsed",
    privateRoom: true,
    note: "Dale un consejo en privado. Envenenado, dale uno inútil."
  },
  GENERAL: {
    phases: NIGHT,
    targets: 0,
    scale: {
      action: "GENERAL_INFO",
      label: "¿Qué bando crees que va ganando?",
      options: [
        { value: "good", label: "😇 El Bien" },
        { value: "evil", label: "😈 El Mal" },
        { value: "tie", label: "⚖️ Empate" }
      ]
    },
    note: "Cada noche dile qué bando crees que va ganando. Es TU opinión, no un cálculo."
  },
  HIGH_PRIESTESS: {
    phases: NIGHT,
    targets: 1,
    action: "HIGH_PRIESTESS",
    note: "Señala libremente al jugador con quien creas que debería hablar. Es TU criterio."
  },
  HUNTSMAN: {
    phases: NIGHT,
    targets: 1,
    action: "HUNTSMAN",
    once: "huntsmanUsed",
    note: "Visítalo cada noche hasta que quiera intentarlo. Si acierta con la Damisela, ella pasa a ser un Aldeano que NO estaba en juego (la página lo aplica)."
  },
  KING: {
    phases: NIGHT,
    targets: 1,
    note: "Solo si los muertos igualan o superan a los vivos."
  },
  LYCANTHROPE: {
    phases: NIGHT,
    targets: 1,
    note: "Si el elegido es BUENO, muere y el Demonio no mata esta noche."
  },
  MAGICIAN: {
    phases: "*",
    targets: 0,
    note: "El Demonio lo ve como Esbirro; los Esbirros lo ven como Demonio. Señala en orden aleatorio."
  },
  NIGHTWATCHMAN: {
    phases: NIGHT,
    targets: 1,
    once: "nightwatchmanUsed",
    note: "El elegido aprende quién es el Sereno."
  },
  POPPY_GROWER: {
    phases: "*",
    targets: 0,
    note: "Mientras viva, los Esbirros y el Demonio NO se conocen. Al morir, se conocen esa noche."
  },
  PREACHER: {
    phases: NIGHT,
    targets: 1,
    action: "POISON",
    note: "Si el elegido es Esbirro, lo aprende y ese Esbirro pierde su habilidad."
  },
  BOFFIN: {
    phases: "*",
    targets: 0,
    pickRole: true,
    note: "El Demonio tiene además una habilidad buena que no está en juego. Todo Demonio NUEVO también."
  },
  WIZARD: {
    phases: "*",
    targets: 0,
    wishPanel: true,
    note: "Atiende su deseo EN PRIVADO. Nunca lo hagas público sin decidirlo tú."
  },
  DAMSEL: {
    phases: "*",
    targets: 1,
    action: "DAMSEL_GUESS",
    once: "damselGuessUsed",
    note: "De noche, con los Esbirros: señala a quién creen que es la Damisela. UN solo intento en toda la partida. Si aciertan (y ella está sana), ganan los malvados."
  },
  GOLEM: {
    phases: DAY,
    targets: 0,
    note: "Solo nomina una vez; si el nominado no es el Demonio, muere."
  },
  HATTER: {
    phases: "*",
    targets: 0,
    note: 'Al morir, los malvados eligen personajes nuevos: aplícalo con "Cambiar rol".'
  },
  HERETIC: {
    phases: "*",
    targets: 0,
    note: "⚠ Quien gana, pierde. Invierte el resultado antes de anunciarlo."
  },
  PLAGUE_DOCTOR: {
    phases: "*",
    targets: 0,
    pickRole: true,
    note: "Al morir, TÚ ganas una habilidad de Esbirro."
  },
  POLITICIAN: {
    phases: "*",
    targets: 0,
    action: "POLITICIAN_SWITCH",
    alignmentSwitch: true,
    note: "Si fue el más responsable de que su equipo pierda, cámbialo de bando con el botón: gana con el equipo nuevo."
  },
  PUZZLEMASTER: {
    phases: "*",
    targets: 1,
    privateRoom: true,
    note: "Marca al borracho en el montaje. Cuando venga a adivinar en privado: si acierta, dile quién es el Demonio."
  },
  SNITCH: {
    phases: "*",
    targets: 0,
    note: "Cada Esbirro recibe 3 faroles además de la info normal."
  },
  BOOMDANDY: {
    phases: "*",
    targets: 3,
    note: "Solo explota por EJECUCIÓN. Elige a los 3 supervivientes; el resto muere."
  },
  FEARMONGER: {
    phases: NIGHT,
    targets: 1,
    action: "FEARMONGER",
    note: "Anuncia en público que el objetivo cambió, sin decir quién es."
  },
  GOBLIN: {
    phases: DAY,
    targets: 0,
    confirm: "¿Reclamó en público ser el Goblin al ser nominado?",
    note: "Si reclamó y lo ejecutan, ganan los malvados."
  },
  HARPY: {
    phases: NIGHT,
    targets: 2,
    ordered: true,
    note: "El PRIMERO cree que el SEGUNDO es malvado. Si no actúa así, puedes ejecutarlo."
  },
  MARIONETTE: {
    phases: "*",
    targets: 0,
    note: "Se cree buena. Cuenta como malvada para toda la información."
  },
  MEZEPHELES: {
    phases: NIGHT,
    targets: 1,
    freeText: "Palabra secreta",
    note: "El PRIMER bueno que diga la palabra se vuelve malvado esa noche."
  },
  ORGAN_GRINDER: {
    phases: NIGHT,
    targets: 0,
    toggle: ["Borracho esta noche", "Sobrio esta noche"],
    note: "Mientras esté sano, las votaciones son a ciegas."
  },
  PSYCHOPATH: {
    phases: "*",
    targets: 1,
    psychopathPanel: true,
    note: "Mata en público 1 vez al día ANTES de nominaciones. Si lo ejecutan, juega piedra-papel-tijera."
  },
  SUMMONER: {
    phases: NIGHT,
    targets: 1,
    pickRole: true,
    demonOnly: true,
    note: "En la NOCHE 3 convierte al elegido en el Demonio que elijas."
  },
  VIZIER: {
    phases: DAY,
    targets: 0,
    executeButton: true,
    note: "No muere de día. Si nomina, puedes ejecutar sin votación."
  },
  WIDOW: {
    phases: NIGHT,
    targets: 1,
    action: "POISON",
    note: "Ve el Grimorio y envenena. Un bueno al azar sabe que hay una Viuda."
  },
  YAGGABABBLE: {
    phases: NIGHT,
    targets: 5,
    freeText: "Frase secreta",
    action: "YAGGABABBLE_KILL",
    counter: { key: "yaggaSaidToday", label: "Veces que dijo su frase hoy", max: 5 },
    note: "Lleva la cuenta durante el día. De noche elige tantas víctimas como veces la dijo."
  },
  AL_HADIKHIA: {
    phases: NIGHT,
    targets: 3,
    note: "Cada uno elige vivir o morir en silencio. Si los TRES eligen vivir, los tres mueren."
  },
  KAZALI: {
    phases: NIGHT,
    targets: 1,
    action: "KAZALI_KILL",
    note: "En el montaje él elige qué jugadores son Esbirros."
  },
  // Sin allowNone: el ataque es obligatorio y el patrón P3 de la guía exige
  // objetivo, así que la casilla solo generaba una contradicción.
  LEGION: {
    phases: NIGHT,
    targets: 1,
    action: "LEGION_KILL",
    note: "La mayoría de jugadores son Legión (asígnalos en el montaje). Las ejecuciones fallan si solo votaron malvados."
  },
  LEVIATHAN: {
    phases: "*",
    targets: 0,
    note: "No mata de noche. 2 buenos ejecutados o pasar del día 5 = ganan los malvados."
  },
  LIL_MONSTA: {
    phases: NIGHT,
    targets: 1,
    note: "Elige qué Esbirro la cuida: ese cuenta como Demonio."
  },
  LLEECH: {
    phases: NIGHT,
    targets: 1,
    action: "LLEECH_KILL",
    altAction: { action: "LLEECH_HOST", label: "🩸 Marcar anfitrión (1ª noche)" },
    note: "Elige anfitrión la primera noche: queda envenenado y si muere, la Lleech muere. Mientras el anfitrión viva, la Lleech es inmune."
  },
  OJO: {
    phases: NIGHT,
    targets: 0,
    pickRole: true,
    action: "OJO_KILL",
    note: "Nombra un PERSONAJE. Si no está en juego, eliges tú quién muere."
  },
  RIOT: {
    phases: "*",
    targets: 0,
    note: "En el día 3 los Esbirros pasan a ser Riot y los nominados mueren al instante."
  },
  // ── Viajeros ───────────────────────────────────────────────────────
  APPRENTICE: {
    phases: NIGHT,
    targets: 0,
    pickRole: true,
    note: "Gana la habilidad de un Aldeano o de un Esbirro según su alineación."
  },
  BARISTA: {
    phases: NIGHT,
    targets: 1,
    toggle: ["Sobrio y sano", "Habilidad doble"],
    note: "Dura esta noche y el día siguiente."
  },
  BONE_COLLECTOR: {
    phases: NIGHT,
    targets: 1,
    deadOnly: true,
    once: "boneCollectorUsed",
    note: "El muerto elegido actúa esta noche como si estuviera vivo."
  },
  BISHOP: {
    phases: DAY,
    targets: 0,
    note: "Solo tú puedes nominar, y debes nominar a un bueno y a un malvado cada día."
  },
  BUTCHER: {
    phases: DAY,
    targets: 0,
    note: "Tras la primera ejecución del día, vuelve a abrir nominaciones."
  },
  DEVIANT: {
    phases: "*",
    targets: 0,
    toggle: ["Protegido de expulsión", "Expulsable"],
    note: "Si es el más divertido, no puede ser expulsado."
  },
  HARLOT: {
    phases: NIGHT,
    targets: 1,
    confirm: "¿Mueren ambos?",
    note: "Aprende el personaje del elegido, pero ambos pueden morir."
  },
  JUDGE: {
    phases: DAY,
    targets: 0,
    toggle: ["Forzar ejecución", "Anular ejecución"],
    once: "judgeUsed",
    note: "Una vez por partida decide el resultado de la nominación actual."
  },
  MATRON: {
    phases: DAY,
    targets: 3,
    note: "Hasta 3 jugadores pueden hablar en privado: muévelos a una sala."
  },
  VOUDON: {
    phases: "*",
    targets: 0,
    note: "Solo votan el Voudon y los muertos. Los muertos no gastan voto fantasma."
  },
  // ── Roles extra (fuera de las campañas base) ───────────────────────
  ALSAAHIR: {
    phases: DAY,
    targets: 0,
    confirm: "¿Acertó el reparto exacto del Mal?",
    note: "Si adivina en público qué jugadores son Esbirros y cuáles Demonios, declara la victoria del Bien."
  },
  PIXIE: {
    phases: NIGHT,
    targets: 1,
    pickRole: true,
    madness: true,
    action: "PIXIE_INFO",
    note: "Conoce 1 Aldeano. Si está loco de ser ese personaje, hereda su habilidad cuando el original muera."
  },
  PRINCESS: {
    phases: DAY,
    targets: 0,
    confirm: "¿Nominó y ejecutaron a ese jugador en su primer día?",
    note: "Si se cumple, el Demonio NO mata esta noche."
  },
  VILLAGE_IDIOT: {
    phases: NIGHT,
    targets: 1,
    action: "VILLAGE_IDIOT_INFO",
    toggle: ["Es BUENO", "Es MALVADO"],
    note: "Puede haber hasta 3. Uno de ellos está borracho: a ese dale siempre información falsa."
  },
  HERMIT: {
    phases: NIGHT,
    targets: 1,
    note: "Tiene TODAS las habilidades de Forastero del guion: resuélvelas una por una."
  },
  OGRE: {
    phases: NIGHT,
    targets: 1,
    excludeSelf: true,
    action: "OGRE_ALIGN",
    note: "Toma la alineación del elegido. Cámbiala en SILENCIO: nunca debe saberlo."
  },
  GNOME: {
    phases: NIGHT,
    targets: 1,
    action: "GNOME_KNOWN",
    note: "Todos conocen a un jugador de su alineación. Puede matar a quien lo nomine."
  },
  WRAITH: {
    phases: NIGHT,
    targets: 0,
    note: "No tiene acción: solo observa. Despiértalo siempre que despiertes a otro malvado."
  },
  LORD_OF_TYPHON: {
    phases: NIGHT,
    targets: 1,
    action: "LORD_OF_TYPHON_KILL",
    note: "Los malvados van en línea con él en el centro. +1 Esbirro. Valida los asientos en el montaje."
  },
  FIDDLER: {
    phases: NIGHT,
    targets: 1,
    action: "FIDDLER_DUEL",
    once: "fiddlerUsed",
    note: "Elige un jugador del bando contrario: todos votan cuál de los 2 gana la partida."
  },
  // Xaan es Esbirro y NO mata: en la noche X envenena a todos los Aldeanos.
  XAAN: {
    phases: NIGHT,
    targets: 0,
    action: "XAAN_POISON",
    note: "En la noche X (= nº de Forasteros) envenena a TODOS los Aldeanos hasta el anochecer."
  },
  BEGGAR: {
    phases: "*",
    targets: 1,
    deadOnly: true,
    note: "Si un muerto le da su voto fantasma, aprende su alineación. Está sobrio y sano."
  },
  BUREAUCRAT: {
    phases: NIGHT,
    targets: 1,
    excludeSelf: true,
    action: "BUREAUCRAT_VOTE",
    note: "Mañana el voto del elegido cuenta por 3."
  },
  THIEF: {
    phases: NIGHT,
    targets: 1,
    excludeSelf: true,
    action: "THIEF_VOTE",
    note: "Mañana el voto del elegido cuenta en negativo."
  },
  GUNSLINGER: {
    phases: DAY,
    targets: 1,
    note: "Solo entre los que votaron en la primera votación del día."
  },
  GANGSTER: {
    phases: DAY,
    targets: 1,
    confirm: "¿El otro vecino vivo lo acepta?",
    note: "Solo vecinos vivos, y solo con el consentimiento del otro vecino. Una vez al día."
  },
  SCAPEGOAT: {
    phases: DAY,
    targets: 1,
    note: "Puede morir en lugar de un ejecutado de su misma alineación."
  },
  DOOMSAYER: {
    phases: DAY,
    targets: 1,
    note: "Con 4+ vivos. Un uso por JUGADOR, no por Agorero. El objetivo es de su propia alineación."
  },
  DUCHESS: {
    phases: NIGHT,
    targets: 3,
    number: [0, 3],
    note: "Marca a los 3 visitantes del día y a cuál de ellos le das el número falso."
  },
  BIG_WIG: {
    phases: DAY,
    targets: 1,
    note: "Solo habla el portavoz hasta la votación, y está loco de que el nominado es bueno."
  },
  ANGEL: {
    phases: "*",
    targets: 1,
    note: "Marca al jugador novato. Si alguien lo mata sin motivo, castígalo como veas."
  },
  BOOTLEGGER: {
    phases: "*",
    targets: 0,
    freeText: "Reglas caseras del guion",
    note: "Anuncia estas reglas a todos antes de empezar."
  },
  BUDDHIST: {
    phases: DAY,
    targets: 1,
    note: "Marca a los veteranos: no pueden hablar los primeros 2 minutos del día."
  },
  CACKLEJACK: {
    phases: NIGHT,
    targets: 1,
    pickRole: true,
    anyRole: true,
    note: "El que cambia de personaje es un jugador DISTINTO del elegido de día."
  },
  DEUS_EX_FIASCO: {
    phases: "*",
    targets: 0,
    note: "Recuerda cometer un error, corregirlo y admitirlo en público al menos una vez."
  },
  DJINN: {
    phases: "*",
    targets: 0,
    freeText: "Regla especial del Djinn",
    note: "Anúnciala a todos antes de empezar."
  },
  FERRYMAN: {
    phases: DAY,
    targets: 0,
    note: "En el último día, devuelve el voto fantasma a todos los muertos."
  },
  FIBBIN: {
    phases: "*",
    targets: 1,
    once: "fibbinUsed",
    note: "Una vez por partida puedes falsificar la información de un jugador bueno."
  },
  GARDENER: {
    phases: "*",
    targets: 0,
    note: "Puedes asignar personajes concretos desde el asistente de montaje."
  },
  GOD_OF_UG: {
    phases: "*",
    targets: 1,
    note: "Quien lleve el gorro Ug habla con un solo sonido y su voto cuenta doble."
  },
  HELLS_LIBRARIAN: {
    phases: "*",
    targets: 1,
    note: "Castiga a quien hable cuando pidas silencio."
  },
  HINDU: {
    phases: "*",
    targets: 1,
    note: "Los 4 primeros muertos se convierten en Viajeros de su misma alineación."
  },
  KNAVES: {
    phases: "*",
    targets: 0,
    note: "Dos narradores: uno miente. Podéis intercambiaros una vez, en el crepúsculo."
  },
  POPE: {
    phases: "*",
    targets: 0,
    note: "Se permiten personajes buenos duplicados; pueden usarse como faroles."
  },
  REVOLUTIONARY: {
    phases: "*",
    targets: 2,
    note: "Marca la pareja de vecinos de la misma alineación. Una vez, uno registra al revés."
  },
  SENTINEL: {
    phases: "*",
    targets: 0,
    note: "Modificador de reparto: ±1 Forastero, a tu criterio, en el montaje."
  },
  SPIRIT_OF_IVORY: {
    phases: "*",
    targets: 0,
    note: "Valida que el reparto no genere más de 1 malvado extra."
  },
  STORM_CATCHER: {
    phases: NIGHT,
    targets: 0,
    pickRole: true,
    note: "El personaje nombrado solo muere por ejecución, pero los malvados saben quién es."
  },
  TOR: {
    phases: "*",
    targets: 0,
    note: "No reveles los personajes al repartir: hazlo solo cuando cada jugador muera."
  },
  TOYMAKER: {
    phases: NIGHT,
    targets: 0,
    toggle: ["El Demonio ataca", "El Demonio NO ataca"],
    note: "Debe usar la noche sin ataque al menos una vez por partida."
  },
  VENTRILOQUIST: {
    phases: DAY,
    targets: 1,
    note: "Si estaba loco de ser un personaje nuevo al ser nominado, puede sobrevivir la ejecución."
  },
  ZEALOT: {
    phases: DAY,
    targets: 0,
    note: "Con 5+ vivos, ese jugador está obligado a votar en todas las nominaciones."
  },
  ZENOMANCER: {
    phases: NIGHT,
    targets: 1,
    freeText: "Misión / información verdadera",
    note: "Escribe la misión de cada jugador y dale información verdadera al cumplirla."
  }
};
function panelForRole(roleId, phase) {
  const cfg = ABILITY_PANELS[roleId];
  if (!cfg) return null;
  if (cfg.phases === "*") return cfg;
  return cfg.phases.includes(phase) ? cfg : null;
}
function StatusChips({ player, compact = false }) {
  const { state, send } = useGame();
  const { game } = state;
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState("");
  const statuses = player.statuses || [];
  const tokens = player.tokens || [];
  const genericTokens = statusTokens(game == null ? void 0 : game.campaignId);
  const rolesInPlay = ((game == null ? void 0 : game.players) || []).map((p) => p.role).filter(Boolean);
  const reminders2 = remindersForRolesInPlay(game == null ? void 0 : game.campaignId, rolesInPlay, game);
  const placedPairs = new Set(tokens.map((t) => `${t.tokenId || t.type}::${t.roleId}`));
  const toggleStatus = (s) => send("TOGGLE_STATUS", { playerId: player.id, status: s });
  const placeToken = (t) => send("ADD_TOKEN", { playerId: player.id, token: t, toggle: true });
  const removeToken = (uid) => send("REMOVE_TOKEN", { playerId: player.id, uid });
  const pairOf = (t) => `${t.tokenId}::${t.roleId}`;
  const fullLabel = (t) => `${t.label}${t.ordinalOf > 1 ? ` ${t.ordinal}/${t.ordinalOf}` : ""}`;
  const durColor = (d) => d === "night" ? "var(--moon)" : d === "oneShot" ? "var(--blood-hi)" : d === "day" ? "var(--gold)" : "var(--good)";
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }, children: [
    tokens.map((t) => {
      var _a;
      const img = t.img || ((_a = ROLE_BY_ID[t.roleId]) == null ? void 0 : _a.img);
      const dur = t.duration || (t.temp ? "night" : "permanent");
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => removeToken(t.uid || t.instanceId),
          title: `${fullLabel(t)}${t.manual ? " (manual)" : ""} — quitar`,
          style: { display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "var(--serif)", fontSize: compact ? 9 : 11, background: "rgba(0,0,0,0.3)", border: `1px solid ${durColor(dur)}`, color: "var(--bone-100)", borderRadius: 10, padding: "1px 6px 1px 2px", cursor: "pointer" },
          children: [
            img && /* @__PURE__ */ jsxRuntime.jsx("img", { src: img, alt: "", style: { width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }, onError: (e) => {
              e.target.remove();
            } }),
            fullLabel(t),
            " ✕"
          ]
        },
        t.uid || t.instanceId
      );
    }),
    statuses.map((s) => /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        onClick: () => toggleStatus(s),
        title: "Quitar",
        style: { fontFamily: "var(--serif)", fontSize: compact ? 9 : 11, background: "rgba(201,162,74,0.15)", border: "1px solid rgba(201,162,74,0.4)", color: "var(--gold-hot)", borderRadius: 3, padding: "1px 6px", cursor: "pointer" },
        children: [
          s,
          " ✕"
        ]
      },
      s
    )),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => setOpen((o) => !o),
          className: "btn-night",
          style: { fontSize: compact ? 9 : 10, padding: "1px 7px" },
          children: "+ ficha"
        }
      ),
      open && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { position: "absolute", zIndex: 50, top: "100%", left: 0, marginTop: 4, width: 240, background: "var(--ink-800)", border: "var(--hairline)", borderRadius: 4, padding: 8, boxShadow: "0 4px 18px rgba(0,0,0,0.6)" }, children: [
        reminders2.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--bone-400)", margin: "0 0 5px" }, children: "Fichas de rol" }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 180, overflowY: "auto", marginBottom: 8 }, children: reminders2.map((t) => {
            const on = placedPairs.has(pairOf(t));
            return /* @__PURE__ */ jsxRuntime.jsxs(
              "button",
              {
                onClick: () => placeToken(t),
                title: `${t.roleName}: ${t.label}${on ? " — ya colocada (pulsa para quitar)" : ""}`,
                className: "btn-night",
                style: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, padding: "2px 6px 2px 2px", borderColor: on ? durColor(t.duration) : void 0, color: on ? "var(--bone-50)" : void 0, background: on ? "rgba(201,162,74,0.18)" : void 0 },
                children: [
                  t.img && /* @__PURE__ */ jsxRuntime.jsx("img", { src: t.img, alt: "", style: { width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }, onError: (e) => {
                    e.target.remove();
                  } }),
                  on ? "✓ " : "",
                  t.label
                ]
              },
              `${t.roleId}:${t.tokenId}`
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--bone-400)", margin: "0 0 5px" }, children: "Estados" }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 140, overflowY: "auto" }, children: genericTokens.map((s) => {
          const sel = statuses.includes(s);
          return /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: () => toggleStatus(s),
              className: "btn-night",
              style: { fontSize: 9, borderColor: sel ? "var(--gold)" : void 0, color: sel ? "var(--gold-hot)" : void 0 },
              children: s
            },
            s
          );
        }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 4, marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "input",
            {
              value: custom,
              onChange: (e) => setCustom(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter" && custom.trim()) {
                  toggleStatus(custom.trim());
                  setCustom("");
                }
              },
              placeholder: "Personalizado…",
              style: { flex: 1, background: "var(--ink-700)", border: "var(--hairline-bone)", borderRadius: 2, padding: "3px 6px", fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-100)" }
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => {
            if (custom.trim()) {
              toggleStatus(custom.trim());
              setCustom("");
            }
          }, className: "btn-action primary", style: { fontSize: 10, padding: "3px 7px" }, children: "+" })
        ] }),
        (statuses.length > 0 || tokens.length > 0) && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => send("CLEAR_STATUSES", { playerId: player.id }),
            style: { marginTop: 6, width: "100%", fontFamily: "var(--mono)", fontSize: 9, background: "none", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--blood-hi)", padding: "3px", cursor: "pointer" },
            children: "Limpiar todo"
          }
        )
      ] })
    ] })
  ] });
}
const TYPE_COLOR = {
  townfolk: "var(--good)",
  outsider: "var(--moon)",
  minion: "var(--blood-hi)",
  demon: "var(--blood-hi)",
  traveler: "var(--gold)",
  fabled: "var(--gold)"
};
function RoleIcon({ role, size = 24, radius, className, style = {}, alt }) {
  const [failed, setFailed] = React.useState(false);
  if (!role) return null;
  const box = size == null ? { ...style } : {
    width: size,
    height: size,
    borderRadius: radius === void 0 ? Math.max(2, Math.round(size * 0.08)) : radius,
    flexShrink: 0,
    ...style
  };
  const src = role.img || role.image || null;
  if (src && !failed) {
    return /* @__PURE__ */ jsxRuntime.jsx(
      "img",
      {
        src,
        alt: alt ?? role.name ?? "",
        className,
        onError: () => setFailed(true),
        style: { objectFit: "cover", ...box }
      }
    );
  }
  const color = TYPE_COLOR[role.type] || "var(--bone-400)";
  return /* @__PURE__ */ jsxRuntime.jsx(
    "span",
    {
      className,
      title: role.name,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        border: `1px solid ${color}`,
        color,
        fontFamily: "var(--serif)",
        fontWeight: 600,
        fontSize: size == null ? "0.9em" : Math.max(9, Math.round(size * 0.5)),
        lineHeight: 1,
        userSelect: "none",
        overflow: "hidden",
        ...box
      },
      children: (role.name || "?").trim()[0].toUpperCase()
    }
  );
}
const label = { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 };
const hint = { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-300)", fontStyle: "italic", margin: "4px 0 0" };
const warn = { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", fontWeight: 600, margin: "4px 0 0" };
const input = { width: "100%", background: "var(--ink-700)", border: "var(--hairline)", borderRadius: 2, padding: "6px 8px", fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)" };
const TOKEN_EXPLAIN = {
  POISONED: "Su habilidad e información son FALSAS. Se limpia al próximo anochecer.",
  PROTECTED: "Protegido del Demonio esta noche. Se limpia al amanecer.",
  DRUNK_NIGHT: "Borracho: su habilidad no funciona.",
  DIES: "Marcado para morir esta noche.",
  MASTER: "Es el Amo del Mayordomo (solo vota si el Amo vota).",
  SAFE_TONIGHT: "No puede morir esta noche.",
  EXECUTED_TODAY: "Ejecutado hoy: el Enterrador aprende su personaje esta noche.",
  BARBER_TONIGHT: "El Barbero murió: esta noche el Demonio puede intercambiar 2 personajes.",
  BOFFIN_ABILITY: "Este Demonio tiene además una habilidad buena (Rata de Laboratorio).",
  LIL_MONSTA_KEEPER: "Cuida a la Lil’ Monsta: cuenta como Demonio vivo."
};
function expiryLabel(t) {
  const e = t.expiry || [];
  if (t.manual) return "manual (no caduca sola)";
  if (e.includes("PERMANENT")) return "permanente";
  if (e.includes("UNTIL_NEXT_DUSK")) return "hasta el próximo anochecer";
  if (e.includes("AT_DAWN")) return "se limpia al amanecer";
  if (e.includes("ONE_DAY")) return "dura el día de hoy";
  return t.temp ? "temporal" : "permanente";
}
const PRESENCE = {
  online: { dot: "●", text: "Conectado", color: "var(--good)" },
  away: { dot: "⏱", text: "Ausente", color: "var(--gold)" },
  offline: { dot: "○", text: "Desconectado", color: "var(--bone-500)" }
};
function InfoTab({ target, game }) {
  var _a;
  const role = target.role ? ROLE_BY_ID[target.role] : null;
  const believed = target.believedRole ? ROLE_BY_ID[target.believedRole] : null;
  const drunkAs = target.drunkAs ? ROLE_BY_ID[target.drunkAs] : null;
  const seat = game.players.findIndex((p) => p.id === target.id) + 1;
  const pres = PRESENCE[target.presence] || PRESENCE.offline;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    role && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "9px 12px", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(RoleIcon, { role, size: 42, radius: 4 }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600, color: "var(--bone-100)", margin: 0 }, children: role.name }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: role.alignment === "evil" ? "var(--blood-hi)" : "var(--good)", margin: "3px 0 0" }, children: role.type })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(Fact, { k: "Asiento", v: `#${seat}` }),
      /* @__PURE__ */ jsxRuntime.jsx(Fact, { k: "Estado", v: target.alive ? "● Vivo" : "☠ Muerto", color: target.alive ? "var(--good)" : "var(--blood-hi)" }),
      /* @__PURE__ */ jsxRuntime.jsx(Fact, { k: "Conexión", v: `${pres.dot} ${pres.text}`, color: pres.color }),
      /* @__PURE__ */ jsxRuntime.jsx(Fact, { k: "Voto fantasma", v: target.alive ? "—" : target.deadVoteNominationId ? "Gastado" : "Disponible" }),
      target.discordChannel && /* @__PURE__ */ jsxRuntime.jsx(Fact, { k: "Canal", v: target.discordChannel })
    ] }),
    (believed || drunkAs) && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(168,58,45,0.12)", border: "1px solid var(--blood-dim)", borderRadius: 4, padding: "8px 10px", marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", margin: 0 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Real:" }),
        " ",
        (role == null ? void 0 : role.name) || "?",
        " · ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Cree ser:" }),
        " ",
        (_a = believed || drunkAs) == null ? void 0 : _a.name
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: warn, children: target.role === "DRUNK" ? "Su habilidad NO funciona nunca." : target.role === "MARIONETTE" ? "Este jugador no sabe que es malvado." : "Este jugador no ve su personaje real." })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Fichas y estados" }),
    target.tokens && target.tokens.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }, children: target.tokens.map((t) => {
      var _a2;
      const tRole = t.img ? { img: t.img, name: t.label } : ROLE_BY_ID[t.roleId];
      const owner = (_a2 = ROLE_BY_ID[t.roleId]) == null ? void 0 : _a2.name;
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "6px 8px" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(RoleIcon, { role: tRole, size: 26, radius: "50%", alt: "" }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-50)", margin: 0, fontWeight: 600 }, children: [
            t.label,
            t.ordinalOf > 1 ? ` ${t.ordinal}/${t.ordinalOf}` : "",
            /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-500)" }, children: [
              " · ",
              expiryLabel(t),
              owner ? ` · ${owner}` : ""
            ] })
          ] }),
          TOKEN_EXPLAIN[t.type] && /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: TOKEN_EXPLAIN[t.type] })
        ] })
      ] }, t.uid || t.instanceId);
    }) }) : /* @__PURE__ */ jsxRuntime.jsx("p", { style: { ...hint, marginBottom: 8 }, children: "Sin fichas activas." }),
    /* @__PURE__ */ jsxRuntime.jsx(StatusChips, { player: target }),
    Array.isArray(target.accusations) && target.accusations.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { ...label, color: "var(--moon)" }, children: [
        "👁 Sospechas (",
        target.accusations.length,
        ")"
      ] }),
      target.accusations.map((a, i) => {
        const sr = ROLE_BY_ID[a.roleId];
        return /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-300)", margin: 0 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { color: "var(--bone-100)" }, children: a.accuserName }),
          " cree que es ",
          /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { color: "var(--gold-hot)" }, children: (sr == null ? void 0 : sr.name) || a.roleId })
        ] }, i);
      })
    ] })
  ] });
}
function Fact({ k, v, color }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: 3, padding: "5px 8px" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--bone-500)", margin: 0 }, children: k }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: color || "var(--bone-100)", margin: "2px 0 0" }, children: v })
  ] });
}
function ActionsTab({ target, send, onClose }) {
  const [confirmKill, setConfirmKill] = React.useState(false);
  const [replacing, setReplacing] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const killWarnings = [];
  if (target.protected) killWarnings.push("🛡 Protegido esta noche (Monje / Posadero / Marinero)");
  if (target.role === "SOLDIER" && !target.poisoned) killWarnings.push("⚔ Soldado: inmune a ataques del Demonio");
  if (target.role === "FOOL" && target.foolUsed === false && !target.poisoned) killWarnings.push("🃏 Bufón: primera muerte anulada (se consumirá)");
  if (target.role === "SAILOR" && !target.poisoned) killWarnings.push("⚓ Marinero: no puede morir");
  if (target.role === "VIZIER" && !target.poisoned) killWarnings.push("👑 Visir: no puede morir durante el día");
  if (target.type === "demon") killWarnings.push("👹 Es el Demonio: al morir se aplica la cadena de sucesión (Mujer Escarlata, Mente Maestra…)");
  const act = (type, payload) => send(type, payload);
  const nightAct = (actionType) => send("NIGHT_NARRATOR_ACTION", { actorId: null, actionType, targetIds: [target.id] });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Vida" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 12 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => act("REVEAL_ROLE", { playerId: target.id }), className: "btn-action primary", style: { flex: 1 }, children: "Revelar personaje" }),
      target.alive ? /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setConfirmKill(true), className: "btn-action danger", style: { flex: 1 }, children: "Matar jugador" }) : /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => {
        act("REVIVE_PLAYER", { playerId: target.id });
        onClose();
      }, className: "btn-action", style: { flex: 1 }, children: "Revivir jugador" })
    ] }),
    confirmKill && target.alive && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginBottom: 12, padding: "10px 12px", background: "rgba(168,58,45,0.12)", border: "1px solid var(--blood-dim)", borderRadius: 4 }, children: [
      killWarnings.map((w, i) => /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-200)", margin: "2px 0", fontStyle: "italic" }, children: w }, i)),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--blood-hi)", fontWeight: 600, margin: "8px 0" }, children: [
        "¿Confirmar muerte de ",
        target.name,
        "?"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => {
          act("KILL_PLAYER", { playerId: target.id });
          onClose();
        }, className: "btn-action danger", style: { flex: 1 }, children: "Confirmar muerte" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setConfirmKill(false), className: "btn-night", children: "Cancelar" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Estados" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => nightAct("POISON"), className: "btn-night", style: { fontSize: 10 }, children: "☠ Envenenar" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => nightAct("MAKE_DRUNK"), className: "btn-night", style: { fontSize: 10 }, children: "🍺 Emborrachar" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => nightAct("SAFE"), className: "btn-night", style: { fontSize: 10 }, children: "🛡 Proteger" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => nightAct("CLEAR_STATUS"), className: "btn-night", style: { fontSize: 10 }, children: "✨ Limpiar" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => act("CLEAR_STATUSES", { playerId: target.id }), className: "btn-night", style: { fontSize: 10 }, children: "🗑 Quitar fichas" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Sesión y voz" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => act("MOVE_TO_SECRET", { targetPlayerId: target.id }), className: "btn-night", style: { fontSize: 10 }, children: "🚪 Confesionario" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => act("MOVE_NARRATOR_TO_ROOM", { playerId: target.id }), className: "btn-night", style: { fontSize: 10 }, children: "🚶 Ir a su habitación" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { ...label, marginTop: 12 }, children: "Quién ocupa el asiento" }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { ...hint, marginTop: 0, marginBottom: 6 }, children: [
      "Conexión: ",
      /* @__PURE__ */ jsxRuntime.jsx("b", { style: { color: (PRESENCE[target.presence] || PRESENCE.offline).color }, children: (PRESENCE[target.presence] || PRESENCE.offline).text })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            if (confirm(`¿Desconectar a ${target.name}? Su asiento queda libre para volver a entrar; conserva personaje y fichas.`)) act("KICK_PLAYER_SESSION", { playerId: target.id });
          },
          className: "btn-night",
          style: { fontSize: 10, color: "var(--blood-hi)" },
          children: "⏏ Desconectar"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => setReplacing((r) => !r),
          className: "btn-night",
          style: { fontSize: 10, borderColor: replacing ? "var(--gold)" : void 0, color: replacing ? "var(--gold)" : void 0 },
          children: "🔄 Reemplazar jugador"
        }
      )
    ] }),
    replacing && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(0,0,0,0.25)", border: "var(--hairline)", borderRadius: 4, padding: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "input",
        {
          value: newName,
          onChange: (e) => setNewName(e.target.value),
          placeholder: "Nombre del sustituto",
          style: { ...input, marginBottom: 6 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: hint, children: [
        "El asiento conserva personaje, fichas, vivo/muerto y votos. Se cierra la sesión de ",
        target.name,
        " y el sustituto entra con el nombre nuevo."
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => {
            if (!newName.trim()) return;
            act("REPLACE_PLAYER", { playerId: target.id, newName: newName.trim(), discordId: null, discordTag: null, avatar: null });
            setNewName("");
            setReplacing(false);
            onClose();
          },
          disabled: !newName.trim(),
          className: "btn-action primary",
          style: { width: "100%", marginTop: 8, opacity: newName.trim() ? 1 : 0.4 },
          children: [
            "Ceder el asiento a ",
            newName.trim() || "…"
          ]
        }
      )
    ] })
  ] });
}
function RoleTab({ target, game, send, onClose }) {
  const [roleId, setRoleId] = React.useState(target.role || "");
  const [notify, setNotify] = React.useState(true);
  const [mode, setMode] = React.useState("real");
  const [all, setAll] = React.useState(false);
  const pool = React.useMemo(() => {
    const script = scriptRoles(game);
    if (!all) return script;
    const ids = new Set(script.map((r) => r.id));
    return [...script, ...ALL_ROLES.filter((r) => !ids.has(r.id))];
  }, [game, all]);
  const inScript = React.useMemo(() => new Set(scriptRoles(game).map((r) => r.id)), [game]);
  const chosen = pool.find((r) => r.id === roleId) || ROLE_BY_ID[roleId];
  const createsDemon = (chosen == null ? void 0 : chosen.type) === "demon" && target.type !== "demon";
  const removesDemon = target.type === "demon" && chosen && chosen.type !== "demon";
  const apply = () => {
    if (!roleId) return;
    send("SET_PLAYER_ROLE", { playerId: target.id, roleId, notify, mode });
    onClose();
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Cambiar personaje a media partida" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { value: roleId, onChange: (e) => setRoleId(e.target.value), style: { ...input, marginBottom: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Elige personaje —" }),
      pool.map((r) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: r.id, children: [
        inScript.has(r.id) ? "" : "✦ ",
        r.name,
        " (",
        r.type,
        ")"
      ] }, r.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8, cursor: "pointer" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("input", { type: "checkbox", checked: all, onChange: (e) => setAll(e.target.checked) }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--bone-400)" }, children: "Buscar en todo el compendio (✦ = fuera del guion)" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Qué se cambia" }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: [
      ["real", "Personaje real"],
      ["believed", "Solo rol creído"],
      ["both", "Ambos"]
    ].map(([v, t]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => setMode(v),
        className: "btn-night",
        style: { flex: 1, fontSize: 10, borderColor: mode === v ? "var(--gold)" : void 0, color: mode === v ? "var(--gold)" : void 0 },
        children: t
      },
      v
    )) }),
    mode === "believed" && /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Para Cerenovus, Marioneta y Lunático: el personaje real no se toca." }),
    /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, margin: "10px 0", cursor: "pointer" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("input", { type: "checkbox", checked: notify, onChange: (e) => setNotify(e.target.checked) }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)" }, children: "Avisar al jugador de su nuevo personaje" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: notify ? "Recibirá «Tu personaje ha cambiado». Nadie más se entera." : "Cambio silencioso: seguirá viendo su personaje anterior." }),
    (createsDemon || removesDemon) && /* @__PURE__ */ jsxRuntime.jsx("p", { style: warn, children: createsDemon ? "⚠ Esto crea un Demonio nuevo. La partida no terminará hasta que mueran todos." : "⚠ Esto puede dejar la partida sin Demonios vivos y disparar el final." }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: apply,
        disabled: !roleId,
        className: "btn-action primary",
        style: { width: "100%", marginTop: 12, opacity: roleId ? 1 : 0.4 },
        children: "Aplicar cambio de personaje"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "No toca su vida, sus fichas ni la fase de la partida." })
  ] });
}
function NarratorCounter({ cfg, game, send, compact = false }) {
  var _a;
  const value = ((_a = game.counters) == null ? void 0 : _a[cfg.key]) ?? 0;
  const max = cfg.max ?? 9;
  const set = (n) => send("SET_COUNTER", { key: cfg.key, value: Math.max(0, Math.min(max, n)) });
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: cfg.label }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { fontSize: 14, padding: "2px 10px" }, onClick: () => set(value - 1), children: "−" }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: compact ? 16 : 20, color: "var(--gold-hot)", minWidth: 28, textAlign: "center" }, children: value }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { fontSize: 14, padding: "2px 10px" }, onClick: () => set(value + 1), children: "+" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { fontSize: 10, padding: "2px 8px" }, onClick: () => set(0), children: "Reiniciar" }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { ...hint, margin: 0 }, children: value === 0 ? "no mata a nadie esta noche" : `esta noche elige ${value} víctima${value > 1 ? "s" : ""}` })
    ] })
  ] });
}
function AbilityTab({ target, game, send, onClose }) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const role = target.role ? ROLE_BY_ID[target.role] : null;
  const cfg = target.role ? panelForRole(target.role, game.phase) : null;
  const cfgAny = target.role ? ABILITY_PANELS[target.role] : null;
  const [targets, setTargets] = React.useState([]);
  const [text, setText] = React.useState("");
  const [pickedRole, setPickedRole] = React.useState("");
  const count = ((_c = game.counters) == null ? void 0 : _c[(_b = (_a = ABILITY_PANELS[target.role]) == null ? void 0 : _a.counter) == null ? void 0 : _b.key]) ?? 0;
  const living = game.players.filter((p) => p.alive && p.id !== target.id);
  const pool = (cfg == null ? void 0 : cfg.deadOnly) ? game.players.filter((p) => !p.alive) : (cfg == null ? void 0 : cfg.allowSelf) ? game.players.filter((p) => p.alive) : living;
  const toggleTarget = (id) => {
    setTargets((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= ((cfg == null ? void 0 : cfg.targets) || 1) ? [...prev.slice(1), id] : [...prev, id]);
  };
  const run = (actionType) => {
    send("NIGHT_NARRATOR_ACTION", { actorId: target.id, actionType, targetIds: targets });
    setTargets([]);
  };
  if (!role) return /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Este jugador aún no tiene personaje asignado." });
  const notActiveNow = !cfg && !!cfgAny;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: role.name }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-200)", margin: "0 0 10px" }, children: [
      "«",
      role.ability,
      "»"
    ] }),
    (target.poisoned || target.drunkAs || target.role === "DRUNK") && /* @__PURE__ */ jsxRuntime.jsx("p", { style: warn, children: "⚠ Borracho o envenenado: su habilidad NO funcionará y su información puede ser falsa. Ejecútala igual para que no lo note." }),
    (game.roleHints || []).filter((h) => h.playerId === target.id).map((h, i) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: {
      borderLeft: `2px solid ${h.severity === "danger" ? "var(--blood-hi)" : "var(--gold-hot)"}`,
      paddingLeft: 8,
      margin: "10px 0"
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { ...label, color: h.severity === "danger" ? "var(--blood-hi)" : "var(--gold-hot)" }, children: "🎙 Te toca decidir" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", margin: "0 0 3px" }, children: h.text }),
      h.needs && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { ...hint, margin: 0 }, children: [
        "▸ ",
        h.needs
      ] })
    ] }, "h" + i)),
    (cfg == null ? void 0 : cfg.note) && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { ...hint, borderLeft: "2px solid var(--gold)", paddingLeft: 8, margin: "10px 0" }, children: cfg.note }),
    (cfg == null ? void 0 : cfg.once) && target[cfg.once] && /* @__PURE__ */ jsxRuntime.jsx("p", { style: warn, children: "Ya usó su habilidad de una sola vez." }),
    notActiveNow && /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Su panel no aplica en esta fase, pero puedes usar las acciones universales." }),
    !cfg && !cfgAny && /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Habilidad pasiva o sin controles — nada que ejecutar aquí." }),
    cfg && cfg.targets > 0 && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: label, children: [
        "Objetivos (",
        targets.length,
        "/",
        cfg.targets,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, maxHeight: 140, overflowY: "auto" }, children: pool.map((p) => /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => toggleTarget(p.id),
          className: "btn-night",
          style: { fontSize: 10, borderColor: targets.includes(p.id) ? "var(--gold)" : void 0, color: targets.includes(p.id) ? "var(--gold)" : void 0 },
          children: [
            targets.includes(p.id) && cfg.ordered ? `${targets.indexOf(p.id) + 1}. ` : "",
            p.name
          ]
        },
        p.id
      )) })
    ] }),
    (cfg == null ? void 0 : cfg.pickRole) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Personaje" }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { value: pickedRole, onChange: (e) => setPickedRole(e.target.value), style: { ...input, marginBottom: 10 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Elige personaje —" }),
        scriptRoles(game).filter((r) => cfg.demonOnly ? r.type === "demon" : cfg.anyRole ? true : true).map((r) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: r.id, children: [
          r.name,
          " (",
          r.type,
          ")"
        ] }, r.id))
      ] }),
      targets.length > 0 && pickedRole && /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          className: "btn-action primary",
          style: { width: "100%", marginBottom: 10 },
          onClick: () => {
            send("SET_PLAYER_ROLE", { playerId: targets[0], roleId: pickedRole, notify: true, mode: cfg.madness ? "believed" : "real" });
            setTargets([]);
            setPickedRole("");
          },
          children: [
            "Aplicar «",
            (_d = ROLE_BY_ID[pickedRole]) == null ? void 0 : _d.name,
            "» a ",
            (_e = game.players.find((p) => p.id === targets[0])) == null ? void 0 : _e.name
          ]
        }
      )
    ] }),
    (cfg == null ? void 0 : cfg.privateRoom) && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-action primary",
          style: { flex: 1, fontSize: 11 },
          onClick: () => send("MOVE_TO_SECRET", { targetPlayerId: target.id }),
          children: "🚪 Llevarlo al confesionario"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-night",
          style: { flex: 1, fontSize: 11 },
          onClick: () => send("MOVE_NARRATOR_TO_ROOM", { playerId: target.id }),
          children: "🚶 Ir yo a su sala"
        }
      )
    ] }),
    (cfg == null ? void 0 : cfg.counter) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(NarratorCounter, { cfg: cfg.counter, game, send }),
      count > 0 && targets.length === count && /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          className: "btn-action danger",
          style: { width: "100%", marginBottom: 10 },
          onClick: () => run(cfg.action),
          children: [
            "💀 Matar a ",
            targets.map((id) => {
              var _a2;
              return (_a2 = game.players.find((p) => p.id === id)) == null ? void 0 : _a2.name;
            }).join(", ")
          ]
        }
      )
    ] }),
    (cfg == null ? void 0 : cfg.alignmentSwitch) && /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        className: "btn-action",
        style: { width: "100%", marginBottom: 10 },
        onClick: () => send("NIGHT_NARRATOR_ACTION", { actorId: target.id, actionType: cfg.action, targetIds: [] }),
        children: [
          "🔄 Cambiarlo de bando (ahora es ",
          target.alignment === "evil" ? "malvado" : "bueno",
          ")"
        ]
      }
    ),
    (cfg == null ? void 0 : cfg.setText) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: cfg.setText.label }),
      /* @__PURE__ */ jsxRuntime.jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 2, style: { ...input, marginBottom: 6, resize: "vertical" } }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-action",
          style: { width: "100%", marginBottom: 10 },
          onClick: () => send("NIGHT_NARRATOR_ACTION", { actorId: target.id, actionType: cfg.setText.action, targetIds: [text] }),
          children: cfg.setText.button
        }
      ),
      game.amnesiacAbility && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { ...hint, margin: "0 0 10px" }, children: [
        "Habilidad fijada: «",
        game.amnesiacAbility,
        "»"
      ] })
    ] }),
    (cfg == null ? void 0 : cfg.scale) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: cfg.scale.label }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }, children: cfg.scale.options.map((o) => /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-night",
          style: { flex: 1, fontSize: 11, minWidth: 78 },
          onClick: () => send("NIGHT_NARRATOR_ACTION", { actorId: target.id, actionType: cfg.scale.action, targetIds: [o.value] }),
          children: o.label
        },
        o.value
      )) })
    ] }),
    (cfg == null ? void 0 : cfg.toggle) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Respuesta" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: cfg.toggle.map((opt) => /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-night",
          style: { flex: 1, fontSize: 10 },
          onClick: () => send("NIGHT_NARRATOR_ACTION", { actorId: target.id, nightInfo: `${role.name}
${opt}` }),
          children: opt
        },
        opt
      )) })
    ] }),
    ((cfg == null ? void 0 : cfg.freeText) || (cfg == null ? void 0 : cfg.twoTexts)) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: cfg.freeText || cfg.twoTexts.join(" / ") }),
      /* @__PURE__ */ jsxRuntime.jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 3, style: { ...input, marginBottom: 8, resize: "vertical" } }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-action",
          style: { width: "100%", marginBottom: 10 },
          onClick: () => {
            send("NIGHT_NARRATOR_ACTION", { actorId: target.id, nightInfo: `${role.name}
${text}` });
            setText("");
          },
          children: "Enviárselo en privado"
        }
      )
    ] }),
    (cfg == null ? void 0 : cfg.confirm) && /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        className: "btn-night",
        style: { width: "100%", fontSize: 11, marginBottom: 10 },
        onClick: () => send("NIGHT_NARRATOR_ACTION", { actorId: target.id, nightInfo: `${role.name}
Confirmado por el narrador` }),
        children: [
          "✓ ",
          cfg.confirm
        ]
      }
    ),
    (cfg == null ? void 0 : cfg.action) && !cfg.counter && targets.length === cfg.targets && cfg.targets > 0 && /* @__PURE__ */ jsxRuntime.jsxs("button", { className: "btn-action primary", style: { width: "100%" }, onClick: () => run(cfg.action), children: [
      "Ejecutar habilidad de ",
      role.name
    ] }),
    (cfg == null ? void 0 : cfg.action) && cfg.targets === 0 && !cfg.scale && !cfg.alignmentSwitch && /* @__PURE__ */ jsxRuntime.jsxs("button", { className: "btn-action primary", style: { width: "100%" }, onClick: () => run(cfg.action), children: [
      "Generar información de ",
      role.name
    ] }),
    (cfg == null ? void 0 : cfg.altAction) && targets.length === 1 && /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        className: "btn-night",
        style: { width: "100%", marginTop: 6, fontSize: 11 },
        onClick: () => run(cfg.altAction.action),
        children: [
          cfg.altAction.label,
          " → ",
          (_f = game.players.find((p) => p.id === targets[0])) == null ? void 0 : _f.name
        ]
      }
    ),
    (cfg == null ? void 0 : cfg.allowNone) && /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        className: "btn-night",
        style: { width: "100%", marginTop: 6, fontSize: 11 },
        onClick: () => {
          send("NIGHT_NARRATOR_ACTION", { actorId: target.id, actionType: cfg.action, targetIds: [] });
          setTargets([]);
        },
        children: "No elegir a nadie"
      }
    ),
    (cfg == null ? void 0 : cfg.send) === "SLAYER_ACTION" && targets.length === 1 && /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        className: "btn-action primary",
        style: { width: "100%" },
        onClick: () => {
          send("SLAYER_ACTION", { slayerId: target.id, targetId: targets[0] });
          onClose();
        },
        children: [
          "🏹 Disparo del Exterminador → ",
          (_g = game.players.find((p) => p.id === targets[0])) == null ? void 0 : _g.name
        ]
      }
    ),
    (cfg == null ? void 0 : cfg.executeButton) && targets.length === 1 && /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        className: "btn-action danger",
        style: { width: "100%" },
        onClick: () => {
          send("KILL_PLAYER", { playerId: targets[0] });
          onClose();
        },
        children: [
          "👑 Ejecutar sin votación a ",
          (_h = game.players.find((p) => p.id === targets[0])) == null ? void 0 : _h.name
        ]
      }
    ),
    (cfg == null ? void 0 : cfg.killButton) && target.alive && /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        className: "btn-action danger",
        style: { width: "100%" },
        onClick: () => {
          send("KILL_PLAYER", { playerId: target.id });
          onClose();
        },
        children: [
          "Matar a ",
          target.name,
          " ahora"
        ]
      }
    ),
    (cfg == null ? void 0 : cfg.psychopathPanel) && /* @__PURE__ */ jsxRuntime.jsx(PsychopathPanel, { target, game, send }),
    (cfg == null ? void 0 : cfg.wishPanel) && /* @__PURE__ */ jsxRuntime.jsx(WishNarratorPanel, { game, send })
  ] });
}
function PsychopathPanel({ target, game, send }) {
  const [victim, setVictim] = React.useState("");
  const canKill = game.phase === "day" && target.alive;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 12, borderTop: "var(--hairline-bone)", paddingTop: 12 }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "🔪 Asesinato diurno" }),
    !canKill && /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Solo durante el día y ANTES de abrir nominaciones." }),
    canKill && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("select", { value: victim, onChange: (e) => setVictim(e.target.value), style: { ...input, marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Víctima anunciada en público —" }),
        game.players.filter((p) => p.alive && p.id !== target.id).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-action danger",
          style: { width: "100%" },
          disabled: !victim,
          onClick: () => {
            send("PSYCHOPATH_DAY_KILL", { psychopathId: target.id, targetId: victim });
            setVictim("");
          },
          children: "Matar en público"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Una vez al día. El Psicópata queda expuesto ante todos." })
    ] })
  ] });
}
function WishNarratorPanel({ game, send }) {
  const [catalog, setCatalog] = React.useState([]);
  const [entry, setEntry] = React.useState(null);
  const [targetId, setTargetId] = React.useState("");
  const [targetId2, setTargetId2] = React.useState("");
  const [roleId, setRoleId] = React.useState("");
  const [winner, setWinner] = React.useState("good");
  const [price, setPrice] = React.useState("");
  const [clue, setClue] = React.useState("");
  const [freeMode, setFreeMode] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/wishes").then((r) => r.json()).then(setCatalog).catch(() => setCatalog([]));
  }, []);
  const wish = game.wish;
  if (!wish || wish.status === "none") {
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 12, borderTop: "var(--hairline-bone)", paddingTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "🧙 Deseos" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "El Hechicero aún no ha pedido su deseo." })
    ] });
  }
  const pickEntry = (e) => {
    setEntry(e);
    setPrice(e.price || "");
    setClue(e.clue || "");
  };
  const applyEntry = () => {
    if (!entry) return;
    send("WISH_APPLY", { apply: entry.apply, targetId, targetId2, roleId, winner });
    send("WISH_SET_TERMS", { price, clue });
    setEntry(null);
    setTargetId("");
    setTargetId2("");
    setRoleId("");
  };
  const groups = [...new Set(catalog.map((c) => c.group))];
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 12, borderTop: "var(--hairline-bone)", paddingTop: 12 }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "🧙 Deseo del Hechicero" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(0,0,0,0.25)", borderRadius: 4, padding: "8px 10px", marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)", margin: 0 }, children: [
        "«",
        wish.text,
        "»"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: hint, children: [
        "Estado: ",
        { pending: "pendiente", granted: "concedido", denied_retry: "denegado, puede pedir otro", denied: "denegado en firme" }[wish.status] || wish.status
      ] })
    ] }),
    wish.status === "pending" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-night",
          style: { width: "100%", fontSize: 11, marginBottom: 8 },
          onClick: () => {
            var _a;
            return send("MOVE_NARRATOR_TO_ROOM", { playerId: (_a = game.players.find((p) => p.role === "WIZARD")) == null ? void 0 : _a.id });
          },
          children: "🚶 Ir a su habitación y hablarlo en privado"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-action primary", style: { flex: 1, fontSize: 11 }, onClick: () => send("WISH_RESOLVE", { decision: "grant" }), children: "Conceder" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 11 }, onClick: () => send("WISH_RESOLVE", { decision: "retry" }), children: "Que pida otro" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-action danger", style: { flex: 1, fontSize: 11 }, onClick: () => send("WISH_RESOLVE", { decision: "deny" }), children: "Denegar" })
      ] })
    ] }),
    wish.status === "granted" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10, borderColor: !freeMode ? "var(--gold)" : void 0 }, onClick: () => setFreeMode(false), children: "Catálogo" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10, borderColor: freeMode ? "var(--gold)" : void 0 }, onClick: () => setFreeMode(true), children: "Libre" })
      ] }),
      !freeMode && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs("select", { value: (entry == null ? void 0 : entry.id) || "", onChange: (e) => pickEntry(catalog.find((c) => c.id === e.target.value)), style: { ...input, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Elige un deseo del catálogo —" }),
          groups.map((g) => /* @__PURE__ */ jsxRuntime.jsx("optgroup", { label: g, children: catalog.filter((c) => c.group === g).map((c) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: c.id, children: c.label }, c.id)) }, g))
        ] }),
        (entry == null ? void 0 : entry.needs) === "player" && /* @__PURE__ */ jsxRuntime.jsxs("select", { value: targetId, onChange: (e) => setTargetId(e.target.value), style: { ...input, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Sobre qué jugador —" }),
          game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
        ] }),
        (entry == null ? void 0 : entry.needs) === "twoPlayers" && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("select", { value: targetId, onChange: (e) => setTargetId(e.target.value), style: input, children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Jugador A —" }),
            game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("select", { value: targetId2, onChange: (e) => setTargetId2(e.target.value), style: input, children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Jugador B —" }),
            game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
          ] })
        ] }),
        (entry == null ? void 0 : entry.needs) === "playerAndRole" && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("select", { value: targetId, onChange: (e) => setTargetId(e.target.value), style: input, children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Jugador —" }),
            game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("select", { value: roleId, onChange: (e) => setRoleId(e.target.value), style: input, children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Personaje —" }),
            scriptRoles(game).map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
          ] })
        ] }),
        (entry == null ? void 0 : entry.needs) === "winner" && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10, borderColor: winner === "good" ? "var(--gold)" : void 0 }, onClick: () => setWinner("good"), children: "Ganan los buenos" }),
          /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10, borderColor: winner === "evil" ? "var(--gold)" : void 0 }, onClick: () => setWinner("evil"), children: "Ganan los malos" })
        ] }),
        entry && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Precio (privado)" }),
          /* @__PURE__ */ jsxRuntime.jsx("textarea", { value: price, onChange: (e) => setPrice(e.target.value), rows: 2, style: { ...input, marginBottom: 6, resize: "vertical" } }),
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Pista pública" }),
          /* @__PURE__ */ jsxRuntime.jsx("textarea", { value: clue, onChange: (e) => setClue(e.target.value), rows: 2, style: { ...input, marginBottom: 8, resize: "vertical" } }),
          /* @__PURE__ */ jsxRuntime.jsxs("button", { className: "btn-action primary", style: { width: "100%" }, onClick: applyEntry, children: [
            "Conceder «",
            entry.label,
            "»"
          ] })
        ] })
      ] }),
      freeMode && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Usa las acciones universales del mini-panel de cada jugador para montar el deseo, y escribe aquí el precio y la pista." }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Precio (privado)" }),
        /* @__PURE__ */ jsxRuntime.jsx("textarea", { value: price, onChange: (e) => setPrice(e.target.value), rows: 2, style: { ...input, marginBottom: 6, resize: "vertical" } }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Pista pública" }),
        /* @__PURE__ */ jsxRuntime.jsx("textarea", { value: clue, onChange: (e) => setClue(e.target.value), rows: 2, style: { ...input, marginBottom: 8, resize: "vertical" } }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-action", style: { width: "100%" }, onClick: () => send("WISH_SET_TERMS", { price, clue }), children: "Guardar precio y pista" })
      ] }),
      (wish.effects || []).length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "Efectos aplicados" }),
        wish.effects.map((e, i) => /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-300)", margin: "2px 0" }, children: [
          "· ",
          e.summary
        ] }, i))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10 }, onClick: () => send("WISH_ANNOUNCE", { withClue: false }), children: "📢 Anunciar sin pista" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10 }, onClick: () => send("WISH_ANNOUNCE", { withClue: true }), children: "📢 Anunciar con pista" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 10 }, onClick: () => send("WISH_SET_TERMS", { priceRevealed: true }), children: "Revelarle el precio" })
      ] }),
      wish.announced && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: hint, children: [
        "Ya anunciado",
        wish.clue ? ` con la pista «${wish.clue}»` : " sin pista",
        "."
      ] })
    ] })
  ] });
}
function BarberPanel() {
  const { state, send } = useGame();
  const game = state.game;
  const pending = game == null ? void 0 : game.barberPending;
  const [a, setA] = React.useState("");
  const [b, setB] = React.useState("");
  if (!pending) return null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(168,58,45,0.12)", border: "1px solid var(--blood-dim)", borderRadius: 4, padding: "10px 12px", marginBottom: 10 }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "💈 Barbero — el Demonio puede intercambiar 2 personajes" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: pending.narratorChooses ? "No queda Demonio vivo: elige tú en su nombre, o declina." : `Pregunta a ${pending.demonName}: puede señalar a dos jugadores o negar con la cabeza.` }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, margin: "8px 0" }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("select", { value: a, onChange: (e) => setA(e.target.value), style: input, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Jugador A —" }),
        game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: p.id, children: [
          p.name,
          p.alive ? "" : " ☠"
        ] }, p.id))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { value: b, onChange: (e) => setB(e.target.value), style: input, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Jugador B —" }),
        game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: p.id, children: [
          p.name,
          p.alive ? "" : " ☠"
        ] }, p.id))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-action primary",
          style: { flex: 1, fontSize: 11 },
          disabled: !a || !b || a === b,
          onClick: () => {
            setA("");
            setB("");
          },
          children: "Intercambiar personajes"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { flex: 1, fontSize: 11 }, onClick: () => send("BARBER_DECLINE", {}), children: "El Demonio declina" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "Las alineaciones NO cambian. Ambos serán avisados de su nuevo personaje." })
  ] });
}
function RoshamboBox() {
  var _a;
  const { state, send } = useGame();
  const game = state.game;
  const rs = game == null ? void 0 : game.roshambo;
  if (!rs) return null;
  const isNarrator = !!game.isNarrator;
  const OPTIONS = [["piedra", "🪨"], ["papel", "📄"], ["tijera", "✂️"]];
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(168,58,45,0.15)", border: "1px solid var(--blood-dim)", borderRadius: 4, padding: "12px 14px", marginBottom: 12 }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: label, children: "🎲 Piedra · Papel · Tijera" }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 14, color: "var(--bone-100)", margin: "0 0 8px" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: rs.psychopathName }),
      " (Psicópata) contra ",
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: rs.opponentName })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: hint, children: "El Psicópata solo muere si PIERDE. Empatar o ganar significa que vive. El día está gastado igualmente." }),
    !rs.result && (rs.iParticipate || isNarrator) && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginTop: 10 }, children: OPTIONS.map(([v, emoji]) => /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          className: "btn-night",
          style: { flex: 1, fontSize: 13 },
          disabled: !isNarrator && !!rs.myThrow,
          onClick: () => send("ROSHAMBO_THROW", { choice: v }),
          children: [
            emoji,
            " ",
            v
          ]
        },
        v
      )) }),
      rs.myThrow && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: hint, children: [
        "Tu tirada: ",
        rs.myThrow,
        ". Esperando a la otra parte…"
      ] }),
      isNarrator && ((_a = rs.waitingFor) == null ? void 0 : _a.length) > 0 && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: hint, children: [
        "Faltan por tirar: ",
        rs.waitingFor.join(", "),
        ". Si alguien está desconectado, tira tú por él."
      ] })
    ] }),
    rs.bothThrown && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 15, color: "var(--gold-hot)", margin: "10px 0 0" }, children: [
      rs.psychopathName,
      ": ",
      rs.psychopathThrow,
      " · ",
      rs.opponentName,
      ": ",
      rs.opponentThrow,
      " →",
      " ",
      rs.result === "opponent" ? "el Psicópata MUERE" : rs.result === "tie" ? "empate: el Psicópata VIVE" : "el Psicópata gana y VIVE"
    ] })
  ] });
}
function NarratorTabs({ target, game, send, onClose }) {
  const [tab, setTab] = React.useState("info");
  const TABS = [["info", "Info"], ["actions", "Acciones"], ["role", "Rol"], ["ability", "Habilidad"]];
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 12 }, children: TABS.map(([id, t]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => setTab(id),
        className: "btn-night",
        style: { flex: 1, fontSize: 10, padding: "5px 0", borderColor: tab === id ? "var(--gold)" : void 0, color: tab === id ? "var(--gold)" : void 0 },
        children: t
      },
      id
    )) }),
    tab === "info" && /* @__PURE__ */ jsxRuntime.jsx(InfoTab, { target, game }),
    tab === "actions" && /* @__PURE__ */ jsxRuntime.jsx(ActionsTab, { target, send, onClose }),
    tab === "role" && /* @__PURE__ */ jsxRuntime.jsx(RoleTab, { target, game, send, onClose }),
    tab === "ability" && /* @__PURE__ */ jsxRuntime.jsx(AbilityTab, { target, game, send, onClose })
  ] });
}
const MASK = "🎭";
const TYPE_LABEL = {
  townfolk: "Aldeano",
  outsider: "Forastero",
  minion: "Esbirro",
  demon: "Demonio",
  traveler: "Viajero",
  fabled: "Fabulado"
};
function typeLabel(type) {
  return TYPE_LABEL[type] || type || "";
}
function formatIdentity(player) {
  const real = (player == null ? void 0 : player.role) ? ROLE_BY_ID[player.role] : null;
  const believedDef = (player == null ? void 0 : player.believedRole) ? ROLE_BY_ID[player.believedRole] : null;
  const hasFalse = !!believedDef && player.believedRole !== player.role;
  return {
    real,
    believed: hasFalse ? believedDef : null,
    hasFalse,
    realName: (real == null ? void 0 : real.name) || "?",
    realType: (real == null ? void 0 : real.type) || null,
    realTypeLabel: real ? typeLabel(real.type) : "",
    believedName: hasFalse ? believedDef.name : null,
    believedTypeLabel: hasFalse ? typeLabel(believedDef.type) : null,
    // Texto completo (paneles / revisión), sin truncar:
    // "Real: Marioneta (Esbirro) · Se cree: Enterrador (Aldeano)"
    fullLabel: hasFalse ? `Real: ${(real == null ? void 0 : real.name) || "?"} (${typeLabel(real == null ? void 0 : real.type)}) · Se cree: ${believedDef.name} (${typeLabel(believedDef.type)})` : `${(real == null ? void 0 : real.name) || "?"}${real ? ` (${typeLabel(real.type)})` : ""}`,
    // Tooltip universal:
    tooltip: hasFalse ? `Este jugador no conoce su rol real. Cree ser ${believedDef.name} (${typeLabel(believedDef.type)}) y recibe información falsa.` : ""
  };
}
const PHASES = {
  lobby: { label: "Montaje", icon: "🎬", blocks: ["setup"] },
  role_reveal: { label: "Reparto", icon: "🎭", blocks: ["reveal", "roster"] },
  first_night: { label: "Primera noche", icon: "🌙", blocks: ["guide", "nightSettings", "roster"] },
  night: { label: "Noche", icon: "🌙", blocks: ["guide", "nightSettings", "roster"] },
  day: { label: "Día", icon: "☀", blocks: ["day", "roster"] },
  nominations: { label: "Nominaciones", icon: "⚖", blocks: ["nominations", "roster"] },
  voting: { label: "Votación", icon: "🗳", blocks: ["nominations", "roster"] },
  game_over: { label: "Fin de la partida", icon: "🏁", blocks: [] }
};
function phaseInfo(game) {
  const base = PHASES[game == null ? void 0 : game.phase] || { label: (game == null ? void 0 : game.phase) || "—", icon: "·", blocks: [] };
  const n = (game == null ? void 0 : game.nightNumber) ?? 0;
  const d = (game == null ? void 0 : game.dayNumber) ?? 0;
  let label2 = base.label;
  if ((game == null ? void 0 : game.phase) === "night") label2 = `Noche ${n}`;
  if ((game == null ? void 0 : game.phase) === "day") label2 = `Día ${d}`;
  if ((game == null ? void 0 : game.phase) === "nominations") label2 = `Nominaciones · Día ${d}`;
  if ((game == null ? void 0 : game.phase) === "voting") label2 = `Votación · Día ${d}`;
  return { ...base, label: label2 };
}
function hasBlock(game, block) {
  var _a;
  return (((_a = PHASES[game == null ? void 0 : game.phase]) == null ? void 0 : _a.blocks) || []).includes(block);
}
function mainAction(game) {
  if (!game) return null;
  const { phase, players = [] } = game;
  if (phase === "lobby") {
    return {
      label: "🎬 Montar partida",
      note: players.length < 5 ? `${players.length} jugador(es) — hacen falta 5 para empezar` : `${players.length} jugadores listos`,
      tone: "primary",
      openWizard: true,
      disabled: players.length < 1
    };
  }
  if (phase === "role_reveal") {
    return {
      label: "🌙 Iniciar primera noche",
      note: `Reparto hecho · enséñale su personaje a cada uno de los ${players.length}`,
      tone: "primary",
      run: (send) => send("START_NIGHT", {})
    };
  }
  if (phase === "first_night" || phase === "night") {
    const deaths = (game.nightDeaths || []).map((id) => {
      var _a;
      return (_a = players.find((p) => p.id === id)) == null ? void 0 : _a.name;
    }).filter(Boolean);
    const readyCount = game.nightReadyCount || 0;
    const readyTotal = game.nightReadyTotal || 0;
    const allReady = readyTotal > 0 && readyCount >= readyTotal;
    const waiting = game.autoMode && !allReady;
    return {
      label: `☀ Amanecer → Día ${(game.dayNumber || 0) + 1}`,
      note: deaths.length ? `Mueren: ${deaths.join(", ")}` : "Nadie muere esta noche",
      tone: "primary",
      disabled: waiting,
      run: (send) => send("START_DAY", { nightDeaths: deaths }),
      secondary: waiting ? { label: "Forzar amanecer", run: (send) => send("START_DAY", { nightDeaths: deaths }) } : null
    };
  }
  if (phase === "day") {
    return {
      label: "⚖ Abrir nominaciones",
      note: "Fase de discusión libre",
      tone: "primary",
      run: (send) => send("OPEN_NOMINATIONS", {}),
      secondary: { label: "Saltar a la noche", run: (send) => send("START_NIGHT", {}) }
    };
  }
  if (phase === "voting") {
    const nom = (game.nominations || []).find((n) => n.id === game.activeNomination);
    if (nom && nom.stage === "arguments") {
      return {
        label: "🗳 Abrir votación",
        note: `${nom.nominatorName} acusa a ${nom.nomineeName}`,
        tone: "primary",
        run: (send) => send("OPEN_VOTING", { nominationId: nom.id })
      };
    }
    if (nom) {
      const pending = Array.isArray(nom.pendingVoters) ? nom.pendingVoters.length : 0;
      return {
        label: "✔ Cerrar votación",
        note: pending > 0 ? `${pending} sin votar` : "Todos han votado",
        tone: "danger",
        run: (send) => send("RESOLVE_VOTE", { nominationId: nom.id })
      };
    }
    return null;
  }
  if (phase === "nominations") {
    const eligible = (game.nominations || []).filter((n) => n.resolved && n.meetsThreshold && !n.executed && !n.tieSkipped);
    if (eligible.length > 0) {
      const maxTally = Math.max(...eligible.map((n) => n.tally));
      const tied = eligible.filter((n) => n.tally === maxTally);
      const sole = tied.length === 1 ? tied[0] : null;
      return {
        label: sole ? `☠ Ejecutar a ${sole.nomineeName}` : `Finalizar (empate a ${maxTally})`,
        note: `${eligible.length} nominación(es) con votos suficientes`,
        tone: "danger",
        run: (send) => send("FINALIZE_NOMINATIONS", {}),
        secondary: { label: "Noche sin ejecución", run: (send) => send("START_NIGHT", {}) }
      };
    }
    return {
      label: "🌙 Iniciar noche",
      note: "Sin nominaciones con votos suficientes",
      tone: "primary",
      run: (send) => send("START_NIGHT", {})
    };
  }
  return null;
}
const TYPING = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA", "SELECT"]);
const HOTKEYS = [
  { keys: "Espacio", what: "Acción principal (la del botón grande)" },
  { keys: "→ / ←", what: "Siguiente / anterior paso de la noche" },
  { keys: "1 … 9", what: "Ir directo a ese paso de la noche" },
  { keys: "B", what: "Buscar un jugador" },
  { keys: "Esc", what: "Cerrar lo que esté abierto" }
];
function useNarratorHotkeys({ onMain, onNext, onPrev, onGoTo, onSearch, onEscape, enabled = true }) {
  React.useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const el = document.activeElement;
      if (el && (TYPING.has(el.tagName) || el.isContentEditable)) {
        if (e.key === "Escape") el.blur();
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          onMain == null ? void 0 : onMain();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext == null ? void 0 : onNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onPrev == null ? void 0 : onPrev();
          break;
        case "Escape":
          onEscape == null ? void 0 : onEscape();
          break;
        case "b":
        case "B":
          e.preventDefault();
          onSearch == null ? void 0 : onSearch();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            onGoTo == null ? void 0 : onGoTo(Number(e.key) - 1);
          }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onMain, onNext, onPrev, onGoTo, onSearch, onEscape]);
}
const TYPES = [
  { k: "townfolk", label: "Aldeanos" },
  { k: "outsider", label: "Forasteros" },
  { k: "minion", label: "Esbirros" },
  { k: "demon", label: "Demonios" }
];
const EXTRA_TYPES = [
  { k: "traveler", label: "Viajeros" },
  { k: "fabled", label: "Fabulados" }
];
const STEPS = ["Saco", "Asientos", "Decisiones", "Revisar"];
function SetupWizard({ game, send, onClose }) {
  const setup = game.setup || { seatOrder: [], assignments: {}, decisions: [] };
  const players = game.players;
  const roleList = game.campaignRoles && game.campaignRoles.length ? game.campaignRoles : [];
  const assignments = setup.assignments || {};
  const decisions = setup.decisions || [];
  const catalog = React.useMemo(() => {
    const byId = /* @__PURE__ */ new Map();
    for (const r of ALL_ROLES) byId.set(r.id, r);
    for (const r of game.allRoles || []) byId.set(r.id, { ...byId.get(r.id) || {}, ...r });
    for (const r of roleList) byId.set(r.id, { ...byId.get(r.id) || {}, ...r });
    return [...byId.values()];
  }, [game.allRoles, roleList]);
  const roleInfo = React.useMemo(() => {
    const map = { ...ROLE_BY_ID };
    for (const r of catalog) map[r.id] = { ...ROLE_BY_ID[r.id] || {}, ...r };
    for (const r of roleList) map[r.id] = { ...map[r.id] || {}, ...r };
    return map;
  }, [catalog, roleList]);
  const campaignIds = React.useMemo(() => new Set(roleList.map((r) => r.id)), [roleList]);
  const [step, setStep] = React.useState(0);
  const [bag, setBag] = React.useState(() => new Set(Object.values(assignments)));
  const baseOrder = setup.seatOrder && setup.seatOrder.length ? setup.seatOrder : players.map((p) => p.id);
  const seatOrder = [...baseOrder, ...players.filter((p) => !baseOrder.includes(p.id)).map((p) => p.id)];
  const seats = seatOrder.map((id) => players.find((p) => p.id === id)).filter(Boolean);
  const dist = (game.campaignDistribution || {})[players.length] || null;
  const mods = game.campaignOutsiderModifiers || {};
  const minionMods = game.campaignMinionModifiers || {};
  const needed = React.useMemo(() => {
    if (!dist) return null;
    const d = { ...dist };
    for (const [rid, delta] of Object.entries(mods)) {
      if (bag.has(rid)) {
        d.outsiders = Math.max(0, Math.min(d.outsiders + delta, players.length - d.demons - d.minions));
        d.townfolk = players.length - d.outsiders - d.minions - d.demons;
      }
    }
    for (const [rid, delta] of Object.entries(minionMods)) {
      if (bag.has(rid)) {
        d.minions = Math.max(1, d.minions + delta);
        d.townfolk = Math.max(0, players.length - d.outsiders - d.minions - d.demons);
      }
    }
    return d;
  }, [dist, mods, minionMods, bag, players.length]);
  const allAssigned = seats.length > 0 && seats.every((s) => assignments[s.id]);
  const unresolved = decisions.filter((d) => !isResolved(d)).length;
  const toggleBag = (rid) => setBag((prev) => {
    var _a;
    const n = new Set(prev);
    if (n.has(rid)) {
      n.delete(rid);
    } else {
      n.add(rid);
      if (rid === "ATHEIST") {
        for (const id of [...n]) {
          if (((_a = roleInfo[id]) == null ? void 0 : _a.alignment) === "evil") n.delete(id);
        }
      }
    }
    return n;
  });
  const setSeatOrder = (order) => send("SETUP_SET_SEAT_ORDER", { seatOrder: order });
  const assignSeat = (seatId, roleId) => {
    const next = { ...assignments };
    if (roleId) next[seatId] = roleId;
    else delete next[seatId];
    send("SETUP_SET_ASSIGNMENTS", { assignments: next });
  };
  const setAssignments = (next) => send("SETUP_SET_ASSIGNMENTS", { assignments: next });
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "wizard-overlay", onClick: onClose, children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "wizard-card", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "wizard-head", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold-hot)", margin: 0 }, children: "🎬 Asistente de montaje" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onClose, className: "btn-night", style: { fontSize: 13, padding: "3px 10px" }, title: "Cerrar (volver al lobby)", children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginTop: 12 }, children: STEPS.map((s, i) => /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => setStep(i),
          className: "btn-night",
          style: { flex: 1, fontSize: 12, padding: "7px 4px", borderColor: step === i ? "var(--gold)" : void 0, color: step === i ? "var(--gold-hot)" : void 0 },
          children: [
            i + 1,
            ". ",
            s
          ]
        },
        s
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "wizard-body", children: [
      step === 0 && /* @__PURE__ */ jsxRuntime.jsx(
        BagStep,
        {
          roleList,
          catalog,
          campaignIds,
          roleInfo,
          bag,
          toggleBag,
          needed,
          playerCount: players.length
        }
      ),
      step === 1 && /* @__PURE__ */ jsxRuntime.jsx(
        SeatStep,
        {
          seats,
          assignments,
          bag,
          catalog,
          roleInfo,
          setSeatOrder,
          assignSeat,
          setAssignments
        }
      ),
      step === 2 && /* @__PURE__ */ jsxRuntime.jsx(DecisionsStep, { decisions, seats, assignments, roleList, catalog, roleInfo, send }),
      step === 3 && /* @__PURE__ */ jsxRuntime.jsx(
        ReviewStep,
        {
          seats,
          assignments,
          decisions,
          roleInfo,
          allAssigned,
          unresolved,
          send
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "wizard-nav", children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => setStep((s) => Math.max(0, s - 1)),
          disabled: step === 0,
          className: "btn-action",
          style: { flex: 1, opacity: step === 0 ? 0.35 : 1 },
          children: "← Atrás"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--bone-500)", whiteSpace: "nowrap" }, children: [
        step + 1,
        "/",
        STEPS.length
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => setStep((s) => Math.min(STEPS.length - 1, s + 1)),
          disabled: step === STEPS.length - 1,
          className: "btn-action primary",
          style: { flex: 1, opacity: step === STEPS.length - 1 ? 0.35 : 1 },
          children: "Siguiente →"
        }
      )
    ] })
  ] }) });
}
function BagStep({ roleList, catalog, campaignIds, roleInfo, bag, toggleBag, needed, playerCount }) {
  const [q, setQ] = React.useState("");
  const atheistInBag = bag.has("ATHEIST");
  const have = {
    townfolk: [...bag].filter((id) => {
      var _a;
      return ((_a = roleInfo[id]) == null ? void 0 : _a.type) === "townfolk";
    }).length,
    outsider: [...bag].filter((id) => {
      var _a;
      return ((_a = roleInfo[id]) == null ? void 0 : _a.type) === "outsider";
    }).length,
    minion: [...bag].filter((id) => {
      var _a;
      return ((_a = roleInfo[id]) == null ? void 0 : _a.type) === "minion";
    }).length,
    demon: [...bag].filter((id) => {
      var _a;
      return ((_a = roleInfo[id]) == null ? void 0 : _a.type) === "demon";
    }).length
  };
  const needMap = needed ? { townfolk: needed.townfolk, outsider: needed.outsiders, minion: needed.minions, demon: needed.demons } : null;
  const baseTypes = atheistInBag ? TYPES.filter((t) => t.k === "townfolk" || t.k === "outsider") : TYPES;
  const visibleTypes = [...baseTypes, ...EXTRA_TYPES];
  const needle = q.trim().toLowerCase();
  const pool = React.useMemo(() => {
    if (needle) {
      return catalog.filter((r) => r.name.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle));
    }
    return [...roleList, ...catalog.filter((r) => bag.has(r.id) && !campaignIds.has(r.id))];
  }, [needle, catalog, roleList, bag, campaignIds]);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-400)", fontStyle: "italic", margin: "0 0 8px" }, children: [
      "Elige qué personajes entran en el saco (",
      playerCount,
      " jugadores)."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "input",
        {
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "Buscar en los 181 personajes…",
          style: { flex: 1, fontSize: 11, background: "var(--ink-600)", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-100)", padding: "6px 8px" }
        }
      ),
      needle && /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setQ(""), className: "btn-night", style: { fontSize: 10, padding: "4px 9px" }, children: "✕" })
    ] }),
    needle && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--moon)", fontStyle: "italic", margin: "0 0 10px" }, children: "Buscando en todo el compendio. ✦ = fuera de la campaña activa." }),
    atheistInBag && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--gold)", background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.3)", borderRadius: 4, padding: "6px 10px", margin: "0 0 10px" }, children: "⚠ Ateo activo — solo aldeanos y forasteros permitidos." }),
    visibleTypes.map(({ k, label: label2 }) => {
      const items = pool.filter((r) => r.type === k);
      const isExtra = EXTRA_TYPES.some((t) => t.k === k);
      if (items.length === 0 && (isExtra || needle)) return null;
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginBottom: 10 }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 5 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--bone-400)" }, children: label2 }),
          needMap && needMap[k] != null && /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: have[k] === needMap[k] ? "var(--good)" : have[k] > needMap[k] ? "var(--gold)" : "var(--blood-hi)" }, children: [
            have[k],
            "/",
            needMap[k]
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: items.map((r) => {
          const foreign = campaignIds && !campaignIds.has(r.id);
          return /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              onClick: () => toggleBag(r.id),
              className: "btn-night",
              title: `${foreign ? "✦ Fuera de la campaña activa — " : ""}${r.ability || ""}`,
              style: { fontSize: 9, borderColor: bag.has(r.id) ? "var(--gold)" : void 0, color: bag.has(r.id) ? "var(--gold-hot)" : void 0, opacity: foreign && !bag.has(r.id) ? 0.75 : 1 },
              children: [
                foreign ? "✦ " : "",
                r.name
              ]
            },
            r.id
          );
        }) })
      ] }, k);
    }),
    needed === null && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-500)", fontStyle: "italic" }, children: "5–15 jugadores para ver la composición requerida." })
  ] });
}
function SeatStep({ seats, assignments, bag, catalog, roleInfo, setSeatOrder, assignSeat, setAssignments }) {
  const usedRoles = new Set(Object.values(assignments));
  const bagRoles = React.useMemo(
    () => catalog.filter((r) => bag.has(r.id)).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [catalog, bag]
  );
  const freeRoles = bagRoles.filter((r) => !usedRoles.has(r.id));
  const demonSeatIdx = seats.findIndex((s) => {
    var _a;
    return ((_a = roleInfo[assignments[s.id]]) == null ? void 0 : _a.type) === "demon";
  });
  const adjToDemon = /* @__PURE__ */ new Set();
  if (demonSeatIdx >= 0 && seats.length > 1) {
    adjToDemon.add(seats[(demonSeatIdx - 1 + seats.length) % seats.length].id);
    adjToDemon.add(seats[(demonSeatIdx + 1) % seats.length].id);
  }
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  const rowRefs = React.useRef([]);
  const indexAtY = (y) => {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return i;
    }
    return seats.length - 1;
  };
  const onHandleDown = (i) => (e) => {
    var _a, _b;
    e.preventDefault();
    (_b = (_a = e.currentTarget).setPointerCapture) == null ? void 0 : _b.call(_a, e.pointerId);
    setDragIdx(i);
    setOverIdx(i);
  };
  const onHandleMove = (e) => {
    if (dragIdx == null) return;
    setOverIdx(indexAtY(e.clientY));
  };
  const onHandleUp = () => {
    if (dragIdx != null && overIdx != null && overIdx !== dragIdx) {
      const order = seats.map((s) => s.id);
      const [moved] = order.splice(dragIdx, 1);
      order.splice(overIdx, 0, moved);
      setSeatOrder(order);
    }
    setDragIdx(null);
    setOverIdx(null);
  };
  const shuffleSeats = () => {
    const order = shuffled(seats.map((s) => s.id));
    setSeatOrder(order);
  };
  const randomizeRoles = () => {
    const pool = shuffled(bagRoles.map((r) => r.id));
    const next = {};
    seats.forEach((s, i) => {
      if (pool[i]) next[s.id] = pool[i];
    });
    setAssignments(next);
  };
  const shortfall = seats.length - bagRoles.length;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-400)", fontStyle: "italic", margin: "0 0 8px" }, children: [
      "Arrastra ",
      /* @__PURE__ */ jsxRuntime.jsx("b", { children: "⠿" }),
      " para reordenar la mesa. La Marioneta debe ser vecina del Demonio."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: randomizeRoles,
          className: "btn-action primary",
          disabled: shortfall > 0,
          style: { flex: 2, fontSize: 11, padding: "7px 0", opacity: shortfall > 0 ? 0.4 : 1 },
          title: "Reparte al azar los personajes del saco entre los asientos",
          children: "🎲 Repartir roles al azar"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: shuffleSeats,
          className: "btn-night",
          style: { flex: 1, fontSize: 11, padding: "7px 0" },
          title: "Baraja el orden de los asientos en la mesa",
          children: "🔀 Barajar mesa"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: shortfall > 0 ? "var(--blood-hi)" : "var(--bone-400)" }, children: [
        "Saco: ",
        bagRoles.length,
        " · Asientos: ",
        seats.length,
        shortfall > 0 && ` · faltan ${shortfall} en el saco`
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: freeRoles.length === 0 ? "var(--good)" : "var(--bone-400)" }, children: [
        freeRoles.length,
        " sin repartir"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, onPointerMove: onHandleMove, onPointerUp: onHandleUp, onPointerCancel: onHandleUp, children: seats.map((s, i) => {
      const roleId = assignments[s.id];
      const role = roleId ? roleInfo[roleId] : null;
      const badSeat = roleId === "MARIONETTE" && demonSeatIdx >= 0 && !adjToDemon.has(s.id);
      const evil = (role == null ? void 0 : role.alignment) === "evil";
      const isDragging = dragIdx === i;
      const isTarget = dragIdx != null && overIdx === i && !isDragging;
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          ref: (el) => {
            rowRefs.current[i] = el;
          },
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderRadius: 4,
            padding: "6px 7px",
            background: isDragging ? "rgba(201,162,74,0.12)" : "rgba(0,0,0,0.22)",
            borderLeft: `3px solid ${role ? evil ? "var(--blood-hi)" : "var(--good)" : "transparent"}`,
            border: badSeat ? "1px solid var(--blood-dim)" : "var(--hairline-bone)",
            borderTop: isTarget ? "2px solid var(--gold-hot)" : void 0,
            opacity: isDragging ? 0.55 : 1
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "span",
              {
                onPointerDown: onHandleDown(i),
                title: "Arrastra para mover este asiento",
                style: { cursor: "grab", touchAction: "none", color: "var(--bone-500)", fontSize: 15, lineHeight: 1, padding: "0 3px", userSelect: "none" },
                children: "⠿"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--bone-600)", width: 18, textAlign: "right" }, children: i + 1 }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontFamily: "var(--serif)", fontSize: 12.5, color: "var(--bone-100)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: s.name }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { fontFamily: "var(--mono)", fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.1em", color: role ? evil ? "var(--blood-hi)" : "var(--bone-500)" : "var(--bone-600)" }, children: [
                role ? `${role.name} · ${typeLabel(role.type)}` : "sin rol",
                adjToDemon.has(s.id) && " · vecino del Demonio"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(
              "select",
              {
                value: roleId || "",
                onChange: (e) => assignSeat(s.id, e.target.value || null),
                style: { fontSize: 10, background: "var(--ink-600)", border: "1px solid", borderColor: evil ? "var(--blood-dim)" : "var(--hairline-bone)", borderRadius: 2, color: role ? evil ? "var(--blood-hi)" : "var(--bone-200)" : "var(--bone-500)", padding: "4px 5px", maxWidth: 130 },
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— sin asignar —" }),
                  bagRoles.filter((r) => !usedRoles.has(r.id) || r.id === roleId).map((r) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: r.id, children: [
                    r.name,
                    " (",
                    typeLabel(r.type),
                    ")"
                  ] }, r.id))
                ]
              }
            )
          ]
        },
        s.id
      );
    }) }),
    shortfall > 0 && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", fontStyle: "italic", marginTop: 8 }, children: "El saco tiene menos personajes que asientos. Vuelve al paso 1 para añadirlos." })
  ] });
}
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function DecisionsStep({ decisions, seats, assignments, roleList, catalog, roleInfo, send }) {
  const scriptRoles2 = React.useMemo(() => {
    const byId = new Map(roleList.map((r) => [r.id, r]));
    for (const rid of Object.values(assignments)) {
      if (!rid || byId.has(rid)) continue;
      const def = (catalog || []).find((r) => r.id === rid) || roleInfo[rid];
      if (def) byId.set(rid, def);
    }
    return [...byId.values()];
  }, [roleList, catalog, assignments, roleInfo]);
  const goodNotInPlay = scriptRoles2.filter((r) => {
    var _a;
    return r.alignment === "good" && !Object.values(assignments).includes(r.id) && !((_a = roleInfo[r.id]) == null ? void 0 : _a.misperception);
  });
  const demonsInCampaign = scriptRoles2.filter((r) => r.type === "demon");
  const minionsInCampaign = scriptRoles2.filter((r) => r.type === "minion");
  const outsidersInPlay = seats.filter((s) => {
    var _a;
    return ((_a = roleInfo[assignments[s.id]]) == null ? void 0 : _a.type) === "outsider";
  }).map((s) => assignments[s.id]);
  const setDec = (id, patch) => send("SETUP_SET_DECISION", { id, patch });
  const suggest = (id) => send("SETUP_SUGGEST", { id });
  const nameOf = (id) => {
    var _a;
    return ((_a = seats.find((s) => s.id === id)) == null ? void 0 : _a.name) || "?";
  };
  if (decisions.length === 0) {
    return /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-400)", fontStyle: "italic" }, children: "Sin decisiones ocultas para esta composición. Asigna roles primero." });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-400)" }, children: [
        decisions.filter(isResolved).length,
        "/",
        decisions.length,
        " resueltas"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("SETUP_SUGGEST", {}), className: "btn-night", style: { fontSize: 9 }, children: "💡 Sugerir todo" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: decisions.map((d) => /* @__PURE__ */ jsxRuntime.jsx(
      DecisionCard,
      {
        d,
        goodNotInPlay,
        demonsInCampaign,
        minionsInCampaign,
        outsidersInPlay,
        seats,
        assignments,
        nameOf,
        setDec,
        suggest
      },
      d.id
    )) })
  ] });
}
function DecisionCard({ d, goodNotInPlay, demonsInCampaign, minionsInCampaign, outsidersInPlay, seats, assignments, nameOf, setDec, suggest }) {
  var _a, _b, _c;
  const resolved = isResolved(d);
  const sel = (value, onChange, opts, placeholder) => /* @__PURE__ */ jsxRuntime.jsxs(
    "select",
    {
      value: value || "",
      onChange: (e) => onChange(e.target.value || null),
      style: { fontSize: 11, background: "var(--ink-600)", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-100)", padding: "4px 6px", width: "100%" },
      children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: placeholder }),
        opts.map((o) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: o.v, children: o.l }, o.v))
      ]
    }
  );
  let control = null;
  switch (d.kind) {
    case "identidadFalsa":
      if (d.role === "lunatic") {
        control = /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          sel(
            (_a = d.lunatic) == null ? void 0 : _a.perceivedDemon,
            (v) => setDec(d.id, { lunatic: { ...d.lunatic || {}, perceivedDemon: v } }),
            demonsInCampaign.map((r) => ({ v: r.id, l: r.name })),
            "¿Qué Demonio cree ser?"
          ),
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-500)", margin: "4px 0 0" }, children: "Esbirros falsos y bluffs: se eligen durante la primera noche." })
        ] });
      } else {
        control = sel(
          d.chosenGoodRole,
          (v) => setDec(d.id, { chosenGoodRole: v }),
          goodNotInPlay.map((r) => ({ v: r.id, l: `${r.name} (${typeLabel(r.type)})` })),
          "¿Qué rol bueno cree ser?"
        );
      }
      break;
    case "registroInicial":
      control = sel(
        d.registersAs,
        (v) => setDec(d.id, { registersAs: v }),
        (d.options || []).map((o) => ({ v: o, l: o })),
        "Registro por defecto"
      );
      break;
    case "forasteros": {
      const chosen = d.chosen || [];
      control = /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 3 }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-400)", width: "100%" }, children: [
          "Esperados: ",
          d.expected
        ] }),
        outsidersInPlay.map((rid) => {
          var _a2;
          const on = chosen.includes(rid);
          return /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              className: "btn-night",
              style: { fontSize: 8, borderColor: on ? "var(--gold)" : void 0, color: on ? "var(--gold-hot)" : void 0 },
              onClick: () => setDec(d.id, { chosen: on ? chosen.filter((x) => x !== rid) : [...chosen, rid] }),
              children: ((_a2 = ROLE_BY_ID[rid]) == null ? void 0 : _a2.name) || rid
            },
            rid
          );
        })
      ] });
      break;
    }
    case "otroSecreto":
      if (d.secret === "evilTwin") {
        control = sel(
          d.targetSeat,
          (v) => setDec(d.id, { targetSeat: v }),
          seats.filter((s) => s.id !== d.seat).map((s) => ({ v: s.id, l: s.name })),
          "Gemela de alineación opuesta"
        );
      } else {
        control = /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)" }, children: d.secret });
      }
      break;
    case "legionSeats": {
      const picked = d.chosen || [];
      const toggle = (id) => setDec(d.id, {
        chosen: picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]
      });
      control = /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }, children: seats.map((s) => {
          const on = picked.includes(s.id);
          return /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              onClick: () => toggle(s.id),
              className: "btn-night",
              style: { fontSize: 10, borderColor: on ? "var(--blood-hi)" : void 0, color: on ? "var(--blood-hi)" : void 0 },
              children: [
                on ? "☠ " : "",
                s.name
              ]
            },
            s.id
          );
        }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--mono)", fontSize: 9, color: picked.length >= d.min ? "var(--good)" : "var(--blood-hi)", margin: 0 }, children: [
          picked.length,
          "/",
          seats.length,
          " marcados · mínimo ",
          d.min
        ] })
      ] });
      break;
    }
    case "puzzlemasterDrunk": {
      const puzPool = seats.filter((s) => s.id !== d.seat);
      control = sel(
        d.chosen,
        (v) => setDec(d.id, { chosen: v }),
        puzPool.map((s) => ({ v: s.id, l: s.name })),
        "¿Qué jugador está borracho?"
      );
      break;
    }
    case "alchemistAbility": {
      const mAbility = (_b = (minionsInCampaign || []).find((r) => r.id === d.chosen)) == null ? void 0 : _b.ability;
      const selEl = sel(
        d.chosen,
        (v) => setDec(d.id, { chosen: v }),
        (minionsInCampaign || []).map((r) => ({ v: r.id, l: r.name })),
        "¿Habilidad de qué Esbirro?"
      );
      control = /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        selEl,
        mAbility && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-400)", margin: "4px 0 0", fontStyle: "italic" }, children: mAbility })
      ] });
      break;
    }
    case "boffinAbility": {
      const bAbility = (_c = (goodNotInPlay || []).find((r) => r.id === d.chosen)) == null ? void 0 : _c.ability;
      control = /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        sel(
          d.chosen,
          (v) => setDec(d.id, { chosen: v }),
          (goodNotInPlay || []).map((r) => ({ v: r.id, l: r.name })),
          "¿Qué habilidad buena tendrá el Demonio?"
        ),
        bAbility && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-400)", margin: "4px 0 0", fontStyle: "italic" }, children: bAbility })
      ] });
      break;
    }
    case "outsiderModifierChoice": {
      const oBase = d.base ?? 0;
      const oPicked = d.chosenModifier;
      const oChosen = d.chosen || [];
      const oExpected = oPicked != null ? Math.max(0, oBase + oPicked) : null;
      control = /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginBottom: 6 }, children: (d.options || [-1, 1]).map((opt) => /* @__PURE__ */ jsxRuntime.jsxs(
          "button",
          {
            className: "btn-night",
            style: {
              flex: 1,
              fontSize: 12,
              padding: "6px 0",
              borderColor: oPicked === opt ? "var(--gold)" : void 0,
              color: oPicked === opt ? "var(--gold-hot)" : void 0
            },
            onClick: () => setDec(d.id, { chosenModifier: opt, expected: Math.max(0, oBase + opt), chosen: [] }),
            children: [
              opt > 0 ? `+${opt}` : opt,
              " Forastero"
            ]
          },
          opt
        )) }),
        oExpected != null && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 3 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-400)", width: "100%" }, children: [
            "Esperados: ",
            oExpected
          ] }),
          outsidersInPlay.map((rid) => {
            var _a2;
            const on = oChosen.includes(rid);
            return /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                className: "btn-night",
                style: { fontSize: 8, borderColor: on ? "var(--gold)" : void 0, color: on ? "var(--gold-hot)" : void 0 },
                onClick: () => setDec(d.id, { chosen: on ? oChosen.filter((x) => x !== rid) : [...oChosen, rid] }),
                children: ((_a2 = ROLE_BY_ID[rid]) == null ? void 0 : _a2.name) || rid
              },
              rid
            );
          })
        ] })
      ] });
      break;
    }
    case "summonerSetup":
      control = /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "4px 0", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "Quitar ficha de Demonio del saco → añadir 1 Aldeano. El Invocador recibe 3 bluffs en noche 1." });
      break;
    default:
      control = null;
  }
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { border: resolved ? "1px solid rgba(109,140,184,0.4)" : "1px solid var(--blood-dim)", borderRadius: 4, padding: "8px 10px", background: "rgba(0,0,0,0.18)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--serif)", fontSize: 13, color: resolved ? "var(--good)" : "var(--gold-hot)", flex: 1 }, children: [
        resolved ? "✓ " : "• ",
        titleFor(d)
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => suggest(d.id), className: "btn-night", style: { fontSize: 8 }, title: "Rellenar un default válido", children: "💡" })
    ] }),
    control,
    d.consequence && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 10.5, color: "var(--bone-500)", fontStyle: "italic", margin: "6px 0 0" }, children: [
      "↳ ",
      d.consequence
    ] })
  ] });
}
function ReviewStep({ seats, assignments, decisions, roleInfo, allAssigned, unresolved, send }) {
  const believedFor = (seatId) => {
    var _a;
    const d = decisions.find((x) => x.kind === "identidadFalsa" && x.seat === seatId);
    if (!d) return null;
    const rid = d.role === "lunatic" ? (_a = d.lunatic) == null ? void 0 : _a.perceivedDemon : d.chosenGoodRole;
    return rid ? roleInfo[rid] || ROLE_BY_ID[rid] : null;
  };
  const canLock = allAssigned && unresolved === 0;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-400)", fontStyle: "italic", margin: "0 0 8px" }, children: "Revisa el montaje. Al bloquear, la noche 1 queda pre-rellenada." }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 3, maxHeight: 280, overflowY: "auto", marginBottom: 10 }, children: seats.map((s, i) => {
      const role = roleInfo[assignments[s.id]] || ROLE_BY_ID[assignments[s.id]];
      const believed = believedFor(s.id);
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.2)", borderRadius: 3, padding: "5px 8px" }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-600)", width: 14 }, children: i + 1 }),
          /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", flex: 1 }, children: s.name }),
          /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, textTransform: "uppercase", color: role ? role.alignment === "evil" ? "var(--blood-hi)" : "var(--good)" : "var(--bone-600)" }, children: role ? `${role.name} (${typeLabel(role.type)})` : "— sin rol —" })
        ] }),
        believed && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "identity-false", style: { fontSize: 10, paddingLeft: 20 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mask", children: MASK }),
          " se cree ",
          believed.name,
          " (",
          typeLabel(believed.type),
          ")"
        ] })
      ] }, s.id);
    }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: allAssigned ? "var(--good)" : "var(--blood-hi)" }, children: [
        allAssigned ? "✓" : "✗",
        " Asientos"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: unresolved === 0 ? "var(--good)" : "var(--blood-hi)" }, children: [
        unresolved === 0 ? "✓" : `✗ ${unresolved}`,
        " Decisiones"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => send("SETUP_LOCK", {}),
        disabled: !canLock,
        className: "btn-action primary",
        style: { width: "100%", padding: "12px 0", opacity: canLock ? 1 : 0.4 },
        children: "🔒 Bloquear montaje → Reparto"
      }
    )
  ] });
}
function isResolved(d) {
  var _a;
  switch (d.kind) {
    case "identidadFalsa":
      return d.role === "lunatic" ? !!((_a = d.lunatic) == null ? void 0 : _a.perceivedDemon) : !!d.chosenGoodRole;
    case "forasteros":
      return Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case "registroInicial":
      return !!d.registersAs;
    case "otroSecreto":
      return d.secret !== "evilTwin" || !!d.targetSeat;
    case "legionSeats":
      return Array.isArray(d.chosen) && d.chosen.length >= d.min;
    case "puzzlemasterDrunk":
      return !!d.chosen;
    case "alchemistAbility":
      return !!d.chosen;
    case "boffinAbility":
      return !!d.chosen;
    case "outsiderModifierChoice":
      return d.chosenModifier != null && Array.isArray(d.chosen) && d.chosen.length === d.expected;
    case "summonerSetup":
      return true;
    default:
      return true;
  }
}
function titleFor(d) {
  switch (d.kind) {
    case "identidadFalsa":
      return `Identidad falsa de ${d.seatName}`;
    case "forasteros":
      return `Forasteros (${d.seatName})`;
    case "registroInicial":
      return `Registro de ${d.seatName}`;
    case "otroSecreto":
      return d.secret === "evilTwin" ? "Gemela Malvada" : d.secret;
    case "legionSeats":
      return `Legión — ¿qué asientos lo son?`;
    case "puzzlemasterDrunk":
      return `Maestro de Acertijos — jugador borracho`;
    case "alchemistAbility":
      return `Alquimista — habilidad de Esbirro`;
    case "boffinAbility":
      return `Rata de Laboratorio — habilidad del Demonio`;
    case "outsiderModifierChoice":
      return `${d.seatName} — ±1 Forastero`;
    case "summonerSetup":
      return `Invocador — preparación especial`;
    default:
      return d.kind;
  }
}
function Choice({ options, value, onPick }) {
  return /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: options.map((opt) => /* @__PURE__ */ jsxRuntime.jsx(
    "button",
    {
      onClick: () => onPick(opt.value),
      className: `nx-btn sm${value === opt.value ? " on" : ""}`,
      children: opt.label
    },
    String(opt.value)
  )) });
}
function Setting({ title, help, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginBottom: 12 }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-sub", style: { marginBottom: 2 }, children: title }),
    help && /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginBottom: 6 }, children: help }),
    children
  ] });
}
function NightSettings() {
  const { state, send } = useGame();
  const { game } = state;
  const [open, setOpen] = React.useState(false);
  if (!game) return null;
  const players = game.players || [];
  const hasFortuneTeller = players.some((p) => p.role === "FORTUNE_TELLER");
  const hasRecluse = players.some((p) => p.role === "RECLUSE" && p.alive);
  const hasSpy = players.some((p) => p.role === "SPY" && p.alive);
  const mayor = players.find((p) => p.role === "MAYOR" && p.alive);
  const count = [hasFortuneTeller, hasRecluse, hasSpy, !!mayor].filter(Boolean).length;
  if (count === 0) return null;
  const redHerring = players.find((p) => p.id === game.smokeScreenPlayerId);
  const mayorTarget = players.find((p) => p.id === game.mayorKillTarget);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head clickable", onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title", children: [
        "⚙ Ajustes de esta noche (",
        count,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", children: open ? "▲" : "▼" })
    ] }),
    open && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
      hasFortuneTeller && /* @__PURE__ */ jsxRuntime.jsx(
        Setting,
        {
          title: "Falso positivo de la Pitonisa",
          help: redHerring ? `Ahora: ${redHerring.name} le aparece como Demonio.` : "Un jugador bueno que siempre le sale como Demonio.",
          children: /* @__PURE__ */ jsxRuntime.jsx(
            Choice,
            {
              value: game.smokeScreenPlayerId || null,
              onPick: (v) => send("SET_SMOKE_SCREEN", { playerId: v }),
              options: [{ value: null, label: "Ninguno" }, ...players.map((p) => ({ value: p.id, label: p.name }))]
            }
          )
        }
      ),
      hasRecluse && /* @__PURE__ */ jsxRuntime.jsx(Setting, { title: "Recluso — cómo se registra", help: "Puede aparecer como malvado en cualquier información.", children: /* @__PURE__ */ jsxRuntime.jsx(
        Choice,
        {
          value: game.recluseRegistersAs || null,
          onPick: (v) => send("SET_RECLUSE_REGISTERS_AS", { value: v }),
          options: [
            { value: null, label: "Normal (bueno)" },
            { value: "minion", label: "Parece Esbirro" },
            { value: "demon", label: "Parece Demonio" }
          ]
        }
      ) }),
      hasSpy && /* @__PURE__ */ jsxRuntime.jsx(Setting, { title: "Espía — cómo se registra", help: "Puede aparecer como bueno en cualquier información.", children: /* @__PURE__ */ jsxRuntime.jsx(
        Choice,
        {
          value: game.spyRegistersAs || null,
          onPick: (v) => send("SET_SPY_REGISTERS_AS", { value: v }),
          options: [
            { value: null, label: "Normal (malvado)" },
            { value: "good", label: "Parece Bueno" }
          ]
        }
      ) }),
      mayor && /* @__PURE__ */ jsxRuntime.jsx(
        Setting,
        {
          title: "Alcalde — redirigir su muerte",
          help: mayorTarget ? `Si atacan al Alcalde, muere ${mayorTarget.name}.` : "Si el Demonio le ataca, puedes matar a otro en su lugar.",
          children: /* @__PURE__ */ jsxRuntime.jsx(
            Choice,
            {
              value: game.mayorKillTarget || null,
              onPick: (v) => send("SET_MAYOR_KILL_TARGET", { playerId: v }),
              options: [
                { value: null, label: "Sin redirección" },
                ...players.filter((p) => p.alive && p.role !== "MAYOR").map((p) => ({ value: p.id, label: p.name }))
              ]
            }
          )
        }
      )
    ] })
  ] });
}
const INFO_MARKERS = /* @__PURE__ */ new Set(["EVIL_INFO", "MINION_INFO", "DEMON_INFO"]);
const GLOBAL_FIRST_NIGHT_ORDER = [
  "STORM_CATCHER",
  "POPPY_GROWER",
  "MAGICIAN",
  "PREACHER",
  "ENGINEER",
  "KAZALI",
  "LEGION",
  "LIL_MONSTA",
  "RIOT",
  "LEVIATHAN",
  "YAGGABABBLE",
  "LLEECH",
  "LUNATIC",
  "MARIONETTE",
  "GNOME",
  "WRAITH",
  // Sin asterisco en su habilidad → también despiertan la primera noche.
  "MEZEPHELES",
  "FEARMONGER",
  "HARPY",
  "ORGAN_GRINDER",
  "WIDOW",
  "XAAN",
  "SUMMONER",
  "SHUGENJA",
  "STEWARD",
  "PHILOSOPHER",
  "BARISTA",
  "BUREAUCRAT",
  "THIEF",
  "SAILOR",
  "COURTIER",
  "GODFATHER",
  "DEVILS_ADVOCATE",
  "POISONER",
  "PUKKA",
  "SNAKE_CHARMER",
  "EVIL_TWIN",
  "WITCH",
  "CERENOVUS",
  "PUZZLEMASTER",
  "ALCHEMIST",
  "AMNESIAC",
  "APPRENTICE",
  "PIXIE",
  "CLOCKMAKER",
  "DREAMER",
  "SEAMSTRESS",
  "MATHEMATICIAN",
  "WASHERWOMAN",
  "LIBRARIAN",
  "INVESTIGATOR",
  "COOK",
  "EMPATH",
  "FORTUNE_TELLER",
  "VILLAGE_IDIOT",
  "BUTLER",
  "SPY",
  "OGRE",
  "HERMIT",
  "BOUNTY_HUNTER",
  "CULT_LEADER",
  "NIGHTWATCHMAN",
  "KNIGHT",
  "BOFFIN",
  "NOBLE",
  "DAMSEL",
  "SNITCH",
  "GRANDMOTHER",
  "CHAMBERMAID",
  "BALLOONIST",
  "GENERAL",
  "HIGH_PRIESTESS",
  "KING",
  "JUGGLER",
  "HUNTSMAN",
  "POLITICIAN",
  "FISHERMAN",
  "ARTIST",
  "SAVANT",
  "WIZARD"
];
const GLOBAL_OTHER_NIGHT_ORDER = [
  "TOYMAKER",
  "POPPY_GROWER",
  "LUNATIC",
  "HARLOT",
  "FIDDLER",
  "BARISTA",
  "BUREAUCRAT",
  "THIEF",
  "DUCHESS",
  "WIDOW",
  "MEZEPHELES",
  "FEARMONGER",
  "HARPY",
  "ORGAN_GRINDER",
  "SUMMONER",
  "XAAN",
  "WRAITH",
  "PHILOSOPHER",
  "SAILOR",
  "COURTIER",
  "INNKEEPER",
  "POISONER",
  "MONK",
  "DEVILS_ADVOCATE",
  "EXORCIST",
  "SNAKE_CHARMER",
  "WITCH",
  "CERENOVUS",
  "PIT_HAG",
  // Todos los ataques demoníacos van DESPUÉS de la protección: si no, la
  // Lleech o la Legión mataban antes de que el Monje o el Exorcista actuaran.
  "ZOMBUUL",
  "PUKKA",
  "SHABALOTH",
  "PO",
  "FANG_GU",
  "NO_DASHII",
  "VORTOX",
  "VIGORMORTIS",
  "LLEECH",
  "KAZALI",
  "LEGION",
  "LIL_MONSTA",
  "OJO",
  "AL_HADIKHIA",
  "LORD_OF_TYPHON",
  "YAGGABABBLE",
  "SCARLET_WOMAN",
  "IMP",
  "ASSASSIN",
  "GODFATHER",
  "GAMBLER",
  "PREACHER",
  "LYCANTHROPE",
  "HUNTSMAN",
  "ENGINEER",
  "ACROBAT",
  "CANNIBAL",
  "RAVENKEEPER",
  "UNDERTAKER",
  "EMPATH",
  "FORTUNE_TELLER",
  "VILLAGE_IDIOT",
  "BUTLER",
  "SWEETHEART",
  "SAGE",
  "BARBER",
  "DREAMER",
  "FLOWERGIRL",
  "TOWN_CRIER",
  "ORACLE",
  "SEAMSTRESS",
  "MATHEMATICIAN",
  "JUGGLER",
  "GOSSIP",
  "PROFESSOR",
  "BONE_COLLECTOR",
  "MINSTREL",
  "TEA_LADY",
  "PACIFIST",
  "FOOL",
  "MOONCHILD",
  "TINKER",
  "GRANDMOTHER",
  "CHAMBERMAID",
  "HERMIT",
  "SPY",
  "BOUNTY_HUNTER",
  "CULT_LEADER",
  "NIGHTWATCHMAN",
  "BALLOONIST",
  "GENERAL",
  "HIGH_PRIESTESS",
  "KING",
  "CACKLEJACK",
  "ZENOMANCER",
  "AMNESIAC",
  "DAMSEL",
  "POLITICIAN",
  "FISHERMAN",
  "ARTIST",
  "SAVANT",
  "WIZARD"
];
function PendingChoices({ game, send }) {
  const choices = game.pendingChoices || [];
  if (!choices.length) return null;
  return /* @__PURE__ */ jsxRuntime.jsx("div", { style: { padding: "10px 14px 0" }, children: choices.map((c) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: {
    background: "rgba(201,162,74,0.10)",
    border: "1px solid var(--gold)",
    borderRadius: 6,
    padding: "10px 12px",
    marginBottom: 8
  }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--gold-hot)", margin: "0 0 8px", lineHeight: 1.4 }, children: [
      "❓ ",
      c.prompt
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: c.options.map((o) => /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        onClick: () => send("RESOLVE_CHOICE", { choiceId: c.id, pickedId: o.id }),
        className: "nx-btn sm",
        style: c.picked === o.id ? { borderColor: "var(--gold)", color: "var(--gold-hot)" } : void 0,
        children: [
          c.picked === o.id ? "✓ " : "",
          o.label
        ]
      },
      o.id
    )) }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginTop: 6 }, children: "Se aplica al instante. Queda fijado al amanecer." })
  ] }, c.id)) });
}
const diedTonight = (p, game) => !p.alive && (game.nightDeaths || []).includes(p.id);
function buildSteps(game) {
  var _a;
  const campaign = getCampaign(game.campaignId);
  const isFirstNight = game.nightNumber <= 1;
  const players = game.players;
  const pendingRaven = players.find((p) => p.role === "RAVENKEEPER" && p.pendingRavenkeeper);
  const campaignOrder = (isFirstNight ? game.campaignFirstNightOrder || campaign.firstNightOrder : game.campaignOtherNightOrder || campaign.otherNightOrder) || [];
  const globalOrder = isFirstNight ? GLOBAL_FIRST_NIGHT_ORDER : GLOBAL_OTHER_NIGHT_ORDER;
  const playerRoleIds = new Set(
    players.flatMap((p) => [p.role, p.believedRole, p.drunkAs].filter(Boolean))
  );
  const campaignSet = new Set(campaignOrder.filter((id) => !INFO_MARKERS.has(id)));
  const globalPos = new Map(globalOrder.map((id, i) => [id, i]));
  const supplementSorted = [...new Set(
    [...playerRoleIds].filter(
      (id) => !campaignSet.has(id) && ROLE_BY_ID[id] && globalPos.has(id)
    )
  )].sort((a, b) => (globalPos.get(a) ?? 9999) - (globalPos.get(b) ?? 9999));
  const effectiveOrder = [...campaignOrder];
  for (const sid of supplementSorted) {
    const spos = globalPos.get(sid) ?? 9999;
    let insertAt = effectiveOrder.length;
    for (let i = 0; i < effectiveOrder.length; i++) {
      const eid = effectiveOrder[i];
      if (INFO_MARKERS.has(eid)) continue;
      if (spos < (globalPos.get(eid) ?? i * 1e3)) {
        insertAt = i;
        break;
      }
    }
    effectiveOrder.splice(insertAt, 0, sid);
  }
  const steps = [];
  let infoShown = false;
  const rolesInOrder = new Set(effectiveOrder.filter((id) => !INFO_MARKERS.has(id)));
  for (const roleId of effectiveOrder) {
    if (INFO_MARKERS.has(roleId)) {
      if (infoShown) continue;
      infoShown = true;
      steps.push({ type: "info" });
      continue;
    }
    const role = ROLE_BY_ID[roleId];
    if (!role) continue;
    const isPending = roleId === "RAVENKEEPER" && !!pendingRaven;
    const showWhen = (_a = NIGHT_ROLE_PATTERN[roleId]) == null ? void 0 : _a.showWhen;
    const actors = players.filter(
      (p) => (p.role === roleId || p.role === "DRUNK" && p.drunkAs === roleId || p.believedRole === roleId && !rolesInOrder.has(p.role)) && (showWhen ? showWhen(p, game) : isPending ? true : p.alive)
    );
    for (const actor of actors) steps.push({ type: "role", role, actor });
  }
  return steps;
}
const NIGHT_ROLE_PATTERN = {
  // ── TB ──────────────────────────────────────────────────────────────────
  WASHERWOMAN: { kind: "P2", targetType: "townfolk", emoji: "🧺" },
  LIBRARIAN: { kind: "P2", targetType: "outsider", emoji: "📚" },
  INVESTIGATOR: { kind: "P2", targetType: "minion", emoji: "🔍" },
  COOK: { kind: "P1", what: "evilPairs", emoji: "🍳", label: "pareja(s) de vecinos malvados" },
  EMPATH: { kind: "P1", what: "evilNeighbors", emoji: "💞", label: "vecino(s) malvado(s) vivos" },
  UNDERTAKER: { kind: "P1", what: "executedRole", emoji: "⚰️" },
  POISONER: { kind: "P3", effect: "POISONER_ACTION", emoji: "🧪", label: "Envenenar a", notSelf: false, autoToken: true },
  MONK: { kind: "P3", effect: "MONK_PROTECT", emoji: "🛡️", label: "Proteger a", notSelf: true, autoToken: true },
  IMP: { kind: "P3", effect: "IMP_KILL", emoji: "👹", label: "Atacar a", notSelf: false },
  BUTLER: { kind: "P3", effect: "BUTLER_MASTER", emoji: "🤵", label: "Amo de", notSelf: true, autoToken: true },
  FORTUNE_TELLER: { kind: "P4", emoji: "🔮" },
  SPY: {
    kind: "P_INFO",
    emoji: "🕵️",
    note: "Mostrar el Grimorio completo al Espía esta noche. También lo ve en su propia ruleta."
  },
  // Estos tres están en la cola de su campaña pero tienen firstNight/otherNights
  // en false, así que hasta ahora se quedaban sin patrón y la tarjeta salía
  // sin un solo control (el Criacuervos además bloqueaba el fin de la noche).
  RAVENKEEPER: {
    kind: "P3",
    effect: "RAVENKEEPER_INFO",
    emoji: "🦅",
    label: "Aprende el personaje de",
    notSelf: true,
    showWhen: (p) => !!p.pendingRavenkeeper,
    note: "Solo si murió ESTA noche. Descubre el personaje del jugador que elija."
  },
  SWEETHEART: {
    kind: "P3",
    effect: "SWEETHEART_DRUNK",
    emoji: "💐",
    label: "Queda borracho",
    notSelf: true,
    autoToken: true,
    showWhen: (p, g) => diedTonight(p, g),
    note: "Solo al morir la Adorable. El elegido queda borracho el RESTO de la partida."
  },
  SAGE: {
    kind: "P_INFO",
    emoji: "🧙",
    showWhen: (p, g) => diedTonight(p, g),
    note: "Solo si lo mató el Demonio. Muéstrale 2 jugadores: uno es el Demonio."
  },
  SCARLET_WOMAN: {
    kind: "P_INFO",
    emoji: "💄",
    note: "¿El Diablillo murió con ≥5 jugadores vivos? Si SÍ → esta jugadora se convierte automáticamente en el nuevo Diablillo."
  },
  // ── BMR demons ──────────────────────────────────────────────────────────
  PUKKA: { kind: "P_PUKKA", emoji: "🕸️" },
  ZOMBUUL: {
    kind: "P3",
    effect: "ZOMBUUL_KILL",
    emoji: "🧟",
    label: "Atacar a",
    notSelf: false,
    note: 'Solo actúa si nadie murió de día. Su 1ª "muerte" lo deja muerto-vivo (sigue activo).'
  },
  PO: { kind: "P_PO", emoji: "💀" },
  SHABALOTH: {
    kind: "P3x2",
    effect: "SHABALOTH_KILL",
    emoji: "👁️",
    note: "Elige 2 objetivos. Puede revivir a 1 muerto de la noche anterior."
  },
  // ── S&V demons ──────────────────────────────────────────────────────────
  FANG_GU: {
    kind: "P3",
    effect: "FANG_GU_KILL",
    emoji: "🌿",
    label: "Atacar a",
    notSelf: false,
    note: "1er Forastero que mata → ese Forastero se vuelve Fang Gu (malo); Fang Gu muere."
  },
  NO_DASHII: {
    kind: "P3",
    effect: "NO_DASHII_KILL",
    emoji: "🐲",
    label: "Atacar a",
    notSelf: false,
    note: "Sus 2 Aldeanos vecinos vivos están envenenados. Recalcular al morir alguien."
  },
  VORTOX: {
    kind: "P3",
    effect: "VORTOX_KILL",
    emoji: "🌀",
    label: "Atacar a",
    notSelf: false,
    note: "Toda info de Aldeanos es FALSA. Sin ejecución hoy → el Mal gana."
  },
  VIGORMORTIS: {
    kind: "P3",
    effect: "VIGORMORTIS_KILL",
    emoji: "🦴",
    label: "Atacar a",
    notSelf: false,
    note: "Esbirros que mata conservan habilidad y envenenan a 1 Aldeano vecino."
  },
  // ── Carousel demons ─────────────────────────────────────────────────────
  KAZALI: { kind: "P3", effect: "KAZALI_KILL", emoji: "👑", label: "Atacar a", notSelf: false },
  LLEECH: {
    kind: "P3",
    effect: "LLEECH_KILL",
    emoji: "🩸",
    label: "Atacar a",
    notSelf: false,
    note: "Muere si su anfitrión (primer jugador elegido) muere envenenado."
  },
  OJO: {
    kind: "P3",
    effect: "OJO_KILL",
    emoji: "👁️",
    label: "Elige personaje",
    notSelf: false,
    note: "Elige un personaje (no jugador): muere quien lo tenga. Si nadie, el Narrador elige."
  },
  LEGION: {
    kind: "P3",
    effect: "LEGION_KILL",
    emoji: "⚔️",
    label: "Atacar a",
    notSelf: false,
    note: "Ejecuciones fallan si solo votaron malignos. Mayoría de jugadores son Legión."
  },
  AL_HADIKHIA: { kind: "P_AL_HADIKHIA", emoji: "🏛️" },
  // ── BMR aldeanos ─────────────────────────────────────────────────────────
  LUNATIC: {
    kind: "P_INFO",
    emoji: "🌕",
    note: 'El Lunático cree ser el Demonio. Despiértalo; deja que "elija" su objetivo. Tú decides quién muere de verdad (o nadie). Dale la misma info que recibiría el Demonio real.'
  },
  MOONCHILD: { kind: "P_MOONCHILD", emoji: "🌙" },
  TINKER: {
    kind: "P_YESNO",
    emoji: "🔧",
    label: "¿Muere el Manitas esta noche?",
    yesLabel: "💀 Muere",
    noLabel: "✅ Vive esta noche"
  },
  GRANDMOTHER: { kind: "P3", effect: "GRANDMOTHER_INFO", emoji: "👵", label: "Nieto", notSelf: true, firstNightOnly: true },
  SAILOR: {
    kind: "P3",
    effect: "SAILOR_DRUNK",
    emoji: "⚓",
    label: "Emborrachar a",
    notSelf: true,
    autoToken: true,
    note: "Tú O el elegido quedáis borrachos (Narrador decide). Pierdes inmunidad si eres tú el borracho."
  },
  CHAMBERMAID: { kind: "P_CHAMBERMAID", emoji: "🛎️" },
  EXORCIST: {
    kind: "P3",
    effect: "EXORCIST_CHOOSE",
    emoji: "✝️",
    label: "Elegir a",
    notSelf: true,
    autoToken: true,
    excludeToken: "EXORCIST_LAST",
    note: "No puede repetir el objetivo de anoche (ya está fuera de la lista). Si es el Demonio: informarle quién eres + suprimir su ataque. Si no: nada (no dar señal)."
  },
  INNKEEPER: {
    kind: "P_INNKEEPER",
    emoji: "🏨",
    note: "Ambos quedan protegidos de toda muerte nocturna. Tú eliges cuál queda borracho."
  },
  GAMBLER: { kind: "P_GAMBLER", emoji: "🎲" },
  GOSSIP: { kind: "P_GOSSIP", emoji: "💬" },
  COURTIER: { kind: "P_COURTIER", emoji: "🎴" },
  PROFESSOR: {
    kind: "P3",
    effect: "PROFESSOR_REVIVE",
    emoji: "🎓",
    label: "Revivir a",
    notSelf: false,
    deadOnly: true,
    note: "Solo jugadores muertos. Si es Aldeano: revive. Si no: nada (sin señal). Una sola vez."
  },
  MINSTREL: {
    kind: "P_INFO",
    emoji: "🎻",
    note: "Si hoy murió ejecutado un Esbirro + Juglar sano: todos los vivos quedan borrachos hasta el crepúsculo."
  },
  TEA_LADY: {
    kind: "P_INFO",
    emoji: "🍵",
    note: "Recalcular vecinos vivos. Si ambos son buenos + Dama sana: no pueden morir (incluye ejecución)."
  },
  PACIFIST: {
    kind: "P_INFO",
    emoji: "🕊️",
    note: "Al ejecutar un bueno: el Narrador PUEDE decidir que no muera. No es automático."
  },
  FOOL: {
    kind: "P_INFO",
    emoji: "🃏",
    note: '1ª vez que el Bufón moriría (sano): no muere. Marcar "salvación usada"; después sí puede morir.'
  },
  // ── BMR esbirros ─────────────────────────────────────────────────────────
  GODFATHER: {
    kind: "P3",
    effect: "GODFATHER_KILL",
    emoji: "🎩",
    label: "Atacar a",
    notSelf: false,
    note: "Solo actúa si murió un Forastero de día. Primera noche: ver Forasteros en el paso de info del mal."
  },
  DEVILS_ADVOCATE: {
    kind: "P3",
    effect: "DEVILS_ADVOCATE_PROTECT",
    emoji: "⚖️",
    label: "Proteger ejecución a",
    notSelf: false,
    autoToken: true,
    note: 'No puede repetir al mismo jugador de anoche. Token "Sobrevive ejecución" hasta el crepúsculo siguiente.'
  },
  ASSASSIN: {
    kind: "P3",
    effect: "ASSASSIN_KILL",
    emoji: "🗡️",
    label: "Matar a",
    notSelf: false,
    note: 'Una sola vez. Ignora TODA protección (Soldado, Monje, Posadero…). Marcar "usado".'
  },
  // ── S&V aldeanos ─────────────────────────────────────────────────────────
  CLOCKMAKER: { kind: "P1", what: "distance", emoji: "⏰", label: "asiento(s) entre el Demonio y su Esbirro más cercano" },
  DREAMER: { kind: "P_DREAMER", emoji: "💭" },
  SNAKE_CHARMER: {
    kind: "P3",
    effect: "SNAKE_CHARMER",
    emoji: "🐍",
    label: "Elegir a",
    notSelf: true,
    autoToken: true,
    note: "Si es el Demonio: intercambian personaje + alineación. Encantador → Demonio (malo). Demonio → Encantador (envenenado). Si no: nada."
  },
  MATHEMATICIAN: { kind: "P1", what: "abnormal", emoji: "🧮", label: "habilidad(es) que funcionaron de forma anormal esta noche" },
  FLOWERGIRL: { kind: "P1", what: "yesno", emoji: "🌸", label: "¿Votó el Demonio hoy?" },
  TOWN_CRIER: { kind: "P1", what: "yesno", emoji: "📢", label: "¿Nominó algún Esbirro hoy?" },
  ORACLE: { kind: "P1", what: "deadEvil", emoji: "🔮", label: "jugador(es) muerto(s) malvado(s)" },
  SEAMSTRESS: {
    kind: "P4",
    emoji: "🧵",
    sameAlignment: true,
    note: "Responde SÍ si son del mismo bando, NO si son de bandos distintos."
  },
  PHILOSOPHER: { kind: "P_PHILOSOPHER", emoji: "📜" },
  JUGGLER: { kind: "P1", what: "abnormal", emoji: "🤹", label: "acierto(s) en las adivinanzas del día 1" },
  // ── S&V esbirros ─────────────────────────────────────────────────────────
  WITCH: {
    kind: "P3",
    effect: "WITCH_CURSE",
    emoji: "🧙‍♀️",
    label: "Maldecir a",
    notSelf: false,
    autoToken: true,
    note: "Si nomina mañana, muere inmediatamente. Con ≤3 vivos: habilidad desactivada."
  },
  CERENOVUS: { kind: "P_CERENOVUS", emoji: "🧠" },
  PIT_HAG: { kind: "P_PITHAG", emoji: "🪄" },
  // ── S&V forasteros con paso nocturno ────────────────────────────────────
  EVIL_TWIN: { kind: "P_EVIL_TWIN", emoji: "👯", firstNightOnly: true },
  BARBER: {
    kind: "P_INFO",
    emoji: "✂️",
    note: "Si el Barbero murió hoy o esta noche y el Demonio está sano: el Demonio puede intercambiar los personajes de 2 jugadores esta noche."
  },
  // ── Carousel aldeanos ────────────────────────────────────────────────────
  ACROBAT: {
    kind: "P3",
    effect: "ACROBAT_CHECK",
    emoji: "🤸",
    label: "Elegir a",
    notSelf: true,
    note: "Si el elegido está borracho/envenenado esta noche: el Acróbata muere."
  },
  ALCHEMIST: { kind: "P_ALCHEMIST", emoji: "⚗️" },
  BALLOONIST: {
    kind: "P_INFO",
    emoji: "🎈",
    note: "Mostrar 1 jugador del tipo que corresponda esta noche (rotando: Aldeano/Forastero/Esbirro/Demonio)."
  },
  BOUNTY_HUNTER: {
    kind: "P3",
    effect: "BOUNTY_HUNTER_REVEAL",
    emoji: "💰",
    label: "Revelar malvado a",
    evilOnly: true,
    note: "Primera noche: mostrar 1 jugador malvado. Al morir el revelado: esa noche mostrar otro malvado."
  },
  CANNIBAL: {
    kind: "P_INFO",
    emoji: "🍖",
    note: "Tiene la habilidad del último ejecutado bueno. Si era malo: info falsa esta noche."
  },
  CULT_LEADER: {
    kind: "P_INFO",
    emoji: "✨",
    note: "Cada noche: adopta la alineación de 1 vecino vivo. Narrador decide cuál vecino."
  },
  ENGINEER: { kind: "P_ENGINEER", emoji: "⚙️" },
  GENERAL: {
    kind: "P_PANEL",
    emoji: "🎖️",
    note: "Dile qué bando crees que va ganando. Es tu opinión: elígela abajo."
  },
  HIGH_PRIESTESS: { kind: "P3", effect: "HIGH_PRIESTESS", emoji: "🌙", label: "Jugador a mostrar", notSelf: false },
  HUNTSMAN: {
    kind: "P3",
    effect: "HUNTSMAN",
    emoji: "🏹",
    label: "Elegir a",
    notSelf: true,
    note: 'Una sola vez. Si es la Damisela: se transforma en 1 Aldeano (Narrador elige cuál). Marcar "usado".'
  },
  KING: {
    kind: "P_INFO",
    emoji: "♔",
    note: "Solo actúa si muertos ≥ vivos. Narrador elige qué personaje vivo mostrar al Rey."
  },
  LYCANTHROPE: {
    kind: "P3",
    effect: "LYCANTHROPE_KILL",
    emoji: "🐺",
    label: "Elegir a",
    notSelf: true,
    note: "Si es bueno: muere Y se suprime el ataque del Demonio esta noche. Si es malo: nada, Demonio ataca normalmente."
  },
  MAGICIAN: {
    kind: "P_INFO",
    emoji: "🎩",
    note: "Pasivo. El Demonio ve al Mago como Esbirro. Los Esbirros ven al Mago como Demonio (ajustado en info del mal)."
  },
  NIGHTWATCHMAN: {
    kind: "P3",
    effect: "NIGHTWATCHMAN",
    emoji: "🔦",
    label: "Elegir a",
    notSelf: true,
    note: 'Una sola vez. El elegido se despierta y aprende que eres el Sereno. Marcar "usado".'
  },
  NOBLE: { kind: "P_NOBLE", emoji: "🎭", firstNightOnly: true },
  POPPY_GROWER: {
    kind: "P_INFO",
    emoji: "🌺",
    note: "Pasivo. Info mutua del mal suprimida mientras viva. Al morir: activar sesión de info del mal esa misma noche."
  },
  PREACHER: {
    kind: "P3",
    effect: "PREACHER",
    emoji: "⛪",
    label: "Elegir a",
    notSelf: true,
    autoToken: true,
    note: "Si es Esbirro: responder SÍ + desactivar su habilidad mientras el Predicador viva."
  },
  // ── Carousel forasteros con paso nocturno ────────────────────────────────
  PUZZLEMASTER: { kind: "P_PUZZLEMASTER", emoji: "🧩" },
  // ── Roles que se resuelven hablando contigo: panel completo en la guía ──
  AMNESIAC: {
    kind: "P_PANEL",
    emoji: "🌫️",
    note: "Fija su habilidad secreta. Cada día te pregunta en privado: respóndele frío / templado / caliente / bingo."
  },
  FISHERMAN: {
    kind: "P_PANEL",
    emoji: "🎣",
    note: "Una vez por partida viene a pedirte consejo. Llévalo al confesionario y escríbeselo."
  },
  ARTIST: {
    kind: "P_PANEL",
    emoji: "🎨",
    note: "Una vez por partida te hace una pregunta de sí/no en privado."
  },
  SAVANT: {
    kind: "P_PANEL",
    emoji: "📖",
    note: "Cada día: dale dos afirmaciones, una verdadera y otra falsa."
  },
  POLITICIAN: {
    kind: "P_PANEL",
    emoji: "🎩",
    note: "Si fue el más responsable de que su equipo pierda, cámbialo de bando con el botón."
  },
  DAMSEL: {
    kind: "P_PANEL",
    emoji: "👗",
    note: "Con los Esbirros: pueden señalar UNA vez en toda la partida a quién creen que es la Damisela."
  },
  SNITCH: {
    kind: "P_INFO",
    emoji: "🤫",
    note: "Primera noche: además del Demonio, cada Esbirro recibe 3 bluffs propios."
  },
  LIL_MONSTA: { kind: "P_LIL_MONSTA", emoji: "👶" },
  RIOT: {
    kind: "P_INFO",
    emoji: "⚔️",
    note: "Recuerda: las nominaciones matan durante el día. La ejecución falla si solo votaron malvados. RIOT puede nominar."
  },
  // ── Carousel esbirros ────────────────────────────────────────────────────
  FEARMONGER: {
    kind: "P3",
    effect: "FEARMONGER",
    emoji: "😨",
    label: "Objetivo del miedo",
    notSelf: false,
    autoToken: true,
    note: "Si el Fearmonger nomina Y ejecuta a este mismo jugador: el Bien gana."
  },
  HARPY: {
    kind: "P3x2",
    effect: "HARPY",
    emoji: "🦅",
    note: 'Mañana el Jugador 1 "cree que" el Jugador 2 es malvado.'
  },
  MEZEPHELES: {
    kind: "P_INFO",
    emoji: "📝",
    note: "Primera noche: dar la palabra secreta. El primer bueno que la diga → cambia a malvado (solo la primera vez)."
  },
  ORGAN_GRINDER: {
    kind: "P_YESNO",
    emoji: "🎠",
    label: "¿Está borracho el Organillero esta noche?",
    yesLabel: "🍺 Sí, borracho",
    noLabel: "🧊 No, sobrio"
  },
  SUMMONER: { kind: "P_SUMMONER", emoji: "🌟" },
  WIDOW: {
    kind: "P3",
    effect: "WIDOW_POISON",
    emoji: "🕷️",
    label: "Envenenar permanente a",
    notSelf: false,
    autoToken: true,
    note: 'Primera noche. Ver Grimorio completo. El elegido queda envenenado permanentemente. Informar a 1 bueno al azar: "hay una Viuda".'
  },
  YAGGABABBLE: {
    kind: "P_PANEL",
    emoji: "🗣️",
    note: "Lleva la cuenta de cuántas veces dijo su frase hoy y elige una víctima por cada vez."
  },
  // ── Carousel aldeanos/esbirros faltantes ────────────────────────────────
  MASTERMIND: {
    kind: "P_INFO",
    emoji: "🧩",
    note: "Pasivo. Si el Demonio es ejecutado: el juego continúa 1 día extra. Si alguien bueno es ejecutado ese día → malos ganan. Si malo o nadie → buenos ganan."
  },
  ATHEIST: {
    kind: "P_INFO",
    emoji: "🙅",
    firstNightOnly: true,
    note: "Sin jugadores malos en partida. El Narrador PUEDE romper cualquier regla. Los buenos ganan si el Narrador es ejecutado."
  },
  KNIGHT: {
    kind: "P_INFO",
    emoji: "⚔️",
    firstNightOnly: true,
    note: "Primera noche: señalar al Caballero 2 jugadores marcados SABE (ninguno es el Demonio)."
  },
  BOFFIN: {
    kind: "P_INFO",
    emoji: "🔬",
    firstNightOnly: true,
    note: "Despertar a la Rata de Laboratorio Y al Demonio juntos (o por separado). Mostrar: ficha TÚ ERES → ficha Boffin → ficha del personaje bueno que el Demonio tendrá."
  },
  SHUGENJA: { kind: "P_SHUGENJA", emoji: "🔮", firstNightOnly: true },
  STEWARD: { kind: "P_STEWARD", emoji: "🤵", firstNightOnly: true },
  // ── Viajeros ─────────────────────────────────────────────────────────────
  APPRENTICE: { kind: "P_APPRENTICE", emoji: "🎓", firstNightOnly: true },
  BARISTA: { kind: "P_BARISTA", emoji: "☕" },
  BONE_COLLECTOR: {
    kind: "P3",
    effect: "BONE_COLLECT",
    emoji: "💀",
    label: "Revivir habilidad de",
    deadOnly: true,
    note: "One-shot. Elige 1 muerto → recupera habilidad hasta crepúsculo."
  },
  BISHOP: {
    kind: "P_INFO",
    emoji: "⛪",
    note: "Hoy el Narrador hace TODAS las nominaciones. Debe nominar ≥1 del bando contrario al Obispo."
  },
  BUTCHER: {
    kind: "P_INFO",
    emoji: "🔪",
    note: "Tras primera ejecución del día: el Carnicero puede nominar 1 jugador adicional."
  },
  DEVIANT: { kind: "P_INFO", emoji: "🎪", note: "Pasivo. Si alguien intenta exiliarlo sin causa, ese intento no cuenta." },
  HARLOT: { kind: "P_HARLOT", emoji: "🎀" },
  JUDGE: {
    kind: "P_INFO",
    emoji: "⚖️",
    note: "Una vez por partida: puede forzar ejecución adicional o cancelar la actual. Pide confirmación pública."
  },
  MATRON: {
    kind: "P_INFO",
    emoji: "🏫",
    note: "De día: puede intercambiar asientos de hasta 3 parejas. Los jugadores no pueden levantarse."
  },
  VOUDON: {
    kind: "P_INFO",
    emoji: "🧿",
    note: "Mientras viva: solo muertos + Voudon votan. No se necesita mayoría para ejecutar."
  },
  BUREAUCRAT: {
    kind: "P3",
    effect: "BUREAUCRAT_VOTE",
    emoji: "📋",
    label: "Voto triple para",
    notSelf: true,
    note: "Mañana el voto del elegido cuenta por 3. La ficha caduca al anochecer."
  },
  THIEF: {
    kind: "P3",
    effect: "THIEF_VOTE",
    emoji: "🕵️‍♂️",
    label: "Voto negativo para",
    notSelf: true,
    note: "Mañana el voto del elegido resta en vez de sumar. La ficha caduca al anochecer."
  },
  DUCHESS: {
    kind: "P_PANEL",
    emoji: "👒",
    note: "Marca a los 3 visitantes de hoy y dale a cada uno cuántos eran malvados. A UNO de ellos dale el número FALSO."
  },
  // ── Demonios y esbirros fuera de las campañas base ──────────────────────
  LORD_OF_TYPHON: {
    kind: "P3",
    effect: "LORD_OF_TYPHON_KILL",
    emoji: "🐍",
    label: "Atacar a",
    notSelf: false,
    note: "Los malvados van en línea con él en el centro. +1 Esbirro: valida los asientos en el montaje."
  },
  FIDDLER: {
    kind: "P3",
    effect: "FIDDLER_DUEL",
    emoji: "🎻",
    label: "Rival del duelo",
    notSelf: true,
    note: "Una sola vez por partida. Elige un jugador del bando contrario: mañana todos votan cuál de los 2 gana la partida."
  },
  LEVIATHAN: {
    kind: "P_INFO",
    emoji: "🐋",
    firstNightOnly: true,
    note: "No mata de noche. Anuncia cada día que el Leviatán está en juego. 2 buenos ejecutados, o pasar del día 5 → ganan los malvados."
  },
  MARIONETTE: {
    kind: "P_INFO",
    emoji: "🎎",
    firstNightOnly: true,
    note: "Se cree buena y NO despierta con el mal: solo el Demonio la conoce. Siéntala vecina del Demonio y dale info FALSA siempre."
  },
  GNOME: {
    kind: "P3",
    effect: "GNOME_KNOWN",
    emoji: "🧙‍♂️",
    label: "Jugador conocido por todos",
    notSelf: true,
    firstNightOnly: true,
    note: "Anuncia el nombre EN PÚBLICO: comparte alineación con el Gnomo. Si alguien lo nomina, el Gnomo puede matar al nominador."
  },
  WRAITH: {
    kind: "P_INFO",
    emoji: "👻",
    note: "No tiene acción: solo abre los ojos. Despiértalo siempre que despiertes a cualquier otro malvado."
  },
  XAAN: { kind: "P_XAAN", emoji: "🌑" },
  OGRE: {
    kind: "P3",
    effect: "OGRE_ALIGN",
    emoji: "👹",
    label: "Copiar alineación de",
    notSelf: true,
    firstNightOnly: true,
    note: "Cambia su alineación EN SILENCIO. Nunca debe saber cuál copió, ni siquiera si no cambió nada."
  },
  VILLAGE_IDIOT: {
    kind: "P3",
    effect: "VILLAGE_IDIOT_INFO",
    emoji: "🤪",
    label: "Descubrir alineación de",
    notSelf: true,
    note: "Puede haber hasta 3 Tontos del Pueblo y exactamente uno está borracho: a ese dale SIEMPRE la alineación contraria."
  },
  PIXIE: {
    kind: "P3",
    effect: "PIXIE_INFO",
    emoji: "🧚",
    label: "Aldeano que conoce",
    notSelf: true,
    typeFilter: "townfolk",
    firstNightOnly: true,
    note: "Impón la locura de ser ese personaje. Si la cumple, hereda su habilidad cuando el original muera."
  },
  HERMIT: {
    kind: "P_INFO",
    emoji: "🧘",
    note: "Tiene TODAS las habilidades de Forastero del guion: resuélvelas una por una en el orden en que actuarían."
  },
  // ── Fabulados con paso nocturno ─────────────────────────────────────────
  TOYMAKER: {
    kind: "P_YESNO",
    emoji: "🧸",
    label: "¿El Demonio ataca esta noche?",
    yesLabel: "⚔️ Sí, ataca",
    noLabel: "🚫 No ataca (Juguetero)",
    noEffect: "DEMON_NO_ATTACK",
    note: "Debe usar la noche sin ataque al menos 1 vez por partida."
  },
  STORM_CATCHER: {
    kind: "P_PANEL",
    emoji: "⛈️",
    firstNightOnly: true,
    note: "Nombra un personaje bueno: si está en juego, solo puede morir por ejecución, pero los malvados saben quién lo tiene."
  },
  CACKLEJACK: {
    kind: "P_PANEL",
    emoji: "🃏",
    note: 'El que cambia de personaje es un jugador DISTINTO del que eligió de día. Aplícalo con "Cambiar rol".'
  },
  ZENOMANCER: {
    kind: "P_PANEL",
    emoji: "🔭",
    note: "Escribe la misión de cada jugador. Al cumplirla, dale información verdadera."
  },
  // ── Hechicero: se resuelve en privado con el panel de deseos ────────────
  WIZARD: {
    kind: "P_PANEL",
    emoji: "🧙",
    note: "Si te ha pedido su deseo, atiéndelo AQUÍ y en privado. Puede tener precio: concédelo, niégalo o pídele otro."
  }
};
function calcEvilNeighbors(game, playerId) {
  const living = game.players.filter((p) => p.alive);
  const idx = living.findIndex((p) => p.id === playerId);
  if (idx === -1 || living.length <= 1) return 0;
  const n = living.length;
  const left = living[(idx - 1 + n) % n];
  const right = living[(idx + 1) % n];
  return ((left == null ? void 0 : left.alignment) === "evil" ? 1 : 0) + ((right == null ? void 0 : right.alignment) === "evil" ? 1 : 0);
}
function calcEvilPairs(game) {
  const living = game.players.filter((p) => p.alive);
  const n = living.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (living[i].alignment === "evil" && living[(i + 1) % n].alignment === "evil") count++;
  }
  return count;
}
function calcDeadEvil(game) {
  return game.players.filter((p) => !p.alive && p.alignment === "evil").length;
}
function calcMinDistance(game) {
  const living = game.players.filter((p) => p.alive);
  const n = living.length;
  const di = living.findIndex((p) => p.type === "demon");
  if (di === -1) return 0;
  const mis = living.map((p, i) => p.type === "minion" ? i : -1).filter((i) => i !== -1);
  if (!mis.length) return 0;
  return Math.min(...mis.map((mi) => Math.min(Math.abs(mi - di), n - Math.abs(mi - di))));
}
function stepDone(step, game) {
  if (step.type === "info") {
    const evils = game.players.filter((p) => p.type === "minion" || p.type === "demon");
    return evils.length > 0 && evils.every((p) => p.nightInfo);
  }
  return !!step.actor.nightInfo;
}
function NightWalkthrough({ onActiveActor, onProgress, controlsRef }) {
  var _a;
  const { state, send } = useGame();
  const { game } = state;
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    setIdx(0);
  }, [game == null ? void 0 : game.nightNumber]);
  const isNight = game && ["first_night", "night"].includes(game.phase);
  const steps = isNight ? buildSteps(game) : [];
  const total = steps.length;
  const current = Math.min(idx, Math.max(0, total - 1));
  const step = steps[current];
  React.useEffect(() => {
    if (!onActiveActor) return;
    onActiveActor((step == null ? void 0 : step.type) === "role" ? step.actor.id : null);
    return () => onActiveActor && onActiveActor(null);
  }, [step == null ? void 0 : step.type, (_a = step == null ? void 0 : step.actor) == null ? void 0 : _a.id, onActiveActor]);
  React.useEffect(() => {
    onProgress == null ? void 0 : onProgress({ current, total });
  }, [current, total, onProgress]);
  if (controlsRef) {
    controlsRef.current = {
      next: () => setIdx((i) => Math.min(total - 1, i + 1)),
      prev: () => setIdx((i) => Math.max(0, i - 1)),
      goTo: (n) => setIdx(Math.max(0, Math.min(total - 1, n)))
    };
  }
  if (!isNight) return null;
  const minions = game.players.filter((p) => {
    var _a2, _b;
    return p.type === "minion" && ((_b = (_a2 = ROLE_BY_ID[p.role]) == null ? void 0 : _a2.misperception) == null ? void 0 : _b.wakesWithEvil) !== false;
  });
  const demons = game.players.filter((p) => p.type === "demon");
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card accent", style: { display: "flex", flexDirection: "column", minHeight: 0 }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title", children: [
        "🌙 Guía de la noche ",
        game.nightNumber
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-mono", children: [
        "paso ",
        total ? current + 1 : 0,
        "/",
        total
      ] })
    ] }),
    total > 1 && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-steps", children: steps.map((s, i) => {
      var _a2;
      const done = stepDone(s, game);
      const evil = s.type === "role" && s.role.alignment === "evil";
      const emoji = s.type === "info" ? "😈" : ((_a2 = NIGHT_ROLE_PATTERN[s.role.id]) == null ? void 0 : _a2.emoji) || "·";
      const title = s.type === "info" ? "Info de Esbirros y Demonio" : `${s.role.name} — ${s.actor.name}`;
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          title,
          onClick: () => setIdx(i),
          className: `nx-step${i === current ? " now" : ""}${done ? " done" : ""}${evil ? " evil" : ""}`,
          children: [
            i + 1,
            emoji !== "·" ? ` ${emoji}` : "",
            done && i !== current ? " ✓" : ""
          ]
        },
        i
      );
    }) }),
    /* @__PURE__ */ jsxRuntime.jsx(PendingChoices, { game, send }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { padding: "14px", flex: 1, overflowY: "auto", minHeight: 0 }, children: !step ? /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { textAlign: "center" }, children: "No hay personajes que actúen esta noche." }) : step.type === "info" ? /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-title", style: { color: "var(--blood-hi)", marginBottom: 4 }, children: "Info de Esbirros y Demonio" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginBottom: 10 }, children: "Entra a la sala de cada uno y dale su información por voz." }),
      [...minions, ...demons].map((m) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "9px 11px", marginBottom: 7 }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-head-title evil", style: { flex: 1 }, children: [
            m.name,
            " · ",
            m.type === "demon" ? "👹 Demonio" : "😈 Esbirro"
          ] }),
          m.discordId && /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: () => send("MOVE_NARRATOR_TO_ROOM", { playerId: m.id }),
              className: "nx-btn sm primary",
              children: "🚪 Ir a su sala"
            }
          )
        ] }),
        m.nightInfo ? /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-sub", style: { whiteSpace: "pre-line" }, children: m.nightInfo }) : /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", children: "Info pendiente." })
      ] }, m.id)),
      game.nightNumber === 1 && /* @__PURE__ */ jsxRuntime.jsx(BluffsPanel, { game, send })
    ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(RoleStepView, { step, game, send }),
      /* @__PURE__ */ jsxRuntime.jsx(StepExtras, { actor: step.actor, role: step.role, game, send })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "10px 14px", borderTop: "1px solid rgba(232,225,209,0.1)" }, children: [
      (step == null ? void 0 : step.type) === "role" && step.actor.discordId && /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => send("MOVE_NARRATOR_TO_ROOM", { playerId: step.actor.id }),
          className: "nx-btn primary",
          style: { marginBottom: 8 },
          children: [
            "🚪 Ir a la habitación de ",
            step.actor.name
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-btn-row", children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setIdx(Math.max(0, current - 1)), disabled: current <= 0, className: "nx-btn", children: "◂ Anterior" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setIdx(Math.min(total - 1, current + 1)), disabled: current >= total - 1, className: "nx-btn primary", children: "Siguiente ▸" })
      ] })
    ] })
  ] });
}
const QUICK_TOKENS = [
  { tokenId: "POISONED", label: "🧪 Envenenado" },
  { tokenId: "DRUNK_NIGHT", label: "🍺 Borracho" },
  { tokenId: "PROTECTED", label: "🛡 Protegido" },
  { tokenId: "SAFE_TONIGHT", label: "✅ A salvo" },
  { tokenId: "NO_ABILITY", label: "🚫 Sin habilidad" },
  { tokenId: "MARKED", label: "⭐ Marcado" }
];
function StepExtras({ actor, role, game, send }) {
  const [open, setOpen] = React.useState(false);
  const [targetId, setTargetId] = React.useState(actor.id);
  const [text, setText] = React.useState("");
  const target = game.players.find((p) => p.id === targetId) || actor;
  const sendInfo = () => {
    if (!text.trim()) return;
    send("NIGHT_NARRATOR_ACTION", { actorId: target.id, nightInfo: text.trim() });
    setText("");
  };
  const placeToken = (t) => {
    send("ADD_TOKEN", { playerId: target.id, token: { tokenId: t.tokenId, roleId: role.id, label: t.label, duration: "permanent" } });
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", style: { marginTop: 12 }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head clickable", onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title", children: "✎ Mano del narrador" }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", children: open ? "▲" : "▼" })
    ] }),
    open && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginBottom: 6 }, children: "Sobre quién actúas:" }),
      /* @__PURE__ */ jsxRuntime.jsx("select", { className: "nx-select", value: targetId, onChange: (e) => setTargetId(e.target.value), children: game.players.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: p.id, children: [
        p.name,
        !p.alive ? " ☠" : ""
      ] }, p.id)) }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { margin: "12px 0 6px" }, children: "Ficha a mano (pulsa otra vez para quitarla):" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: QUICK_TOKENS.map((t) => /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn sm", onClick: () => placeToken(t), children: t.label }, t.tokenId)) }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { margin: "12px 0 6px" }, children: "Decirle algo por escrito:" }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "textarea",
        {
          className: "nx-textarea",
          rows: 2,
          value: text,
          onChange: (e) => setText(e.target.value),
          placeholder: `Información para ${target.name}…`
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs("button", { className: "nx-btn", style: { marginTop: 6 }, disabled: !text.trim(), onClick: sendInfo, children: [
        "Enviárselo a ",
        target.name
      ] })
    ] })
  ] });
}
function RoleStepView({ step, game, send }) {
  const { role, actor } = step;
  const trueDef = ROLE_BY_ID[actor.role] || role;
  const believedDef = actor.believedRole ? ROLE_BY_ID[actor.believedRole] : null;
  const isMisperc = !!believedDef && actor.believedRole !== actor.role;
  const shown = isMisperc ? believedDef : role;
  const evil = shown.alignment === "evil";
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(RoleIcon, { role: shown, size: 68, radius: "50%" }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontFamily: "var(--serif)", fontSize: 26, lineHeight: 1.15, color: evil ? "var(--blood-hi)" : "var(--bone-50)" }, children: shown.name }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { fontFamily: "var(--mono)", fontSize: 14, color: "var(--bone-200)" }, children: [
          "🗣 ",
          actor.name,
          actor.poisoned ? " · 🧪 envenenado" : "",
          !actor.alive ? " · ☠" : ""
        ] })
      ] })
    ] }),
    isMisperc && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(168,58,45,0.14)", border: "1px solid var(--blood-dim)", borderRadius: 4, padding: "8px 10px", marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "identity-false", style: { color: "var(--blood-hi)", marginBottom: 4 }, title: `${actor.name} no conoce su rol real. Cree ser ${shown.name} y recibe información falsa.`, children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mask", children: MASK }),
        " ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "Identidad falsa" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--blood-hi)", margin: 0, lineHeight: 1.5 }, children: [
        actor.name,
        " — Real: ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: trueDef.name }),
        " (",
        typeLabel(trueDef.type),
        ") · Se cree: ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: shown.name }),
        " (",
        typeLabel(shown.type),
        "). Su habilidad NO funciona — dale información ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "FALSA" }),
        "."
      ] })
    ] }),
    actor.poisoned && !isMisperc && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 4, padding: "8px 10px", marginBottom: 10 }, children: /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "#4ade80", margin: 0, lineHeight: 1.5 }, children: [
      "🧪 ",
      /* @__PURE__ */ jsxRuntime.jsxs("strong", { children: [
        actor.name,
        " está envenenado"
      ] }),
      ": su habilidad NO funciona — dale información ",
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "FALSA" }),
      "."
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 16, color: "var(--bone-200)", fontStyle: "italic", marginBottom: 10, lineHeight: 1.5 }, children: shown.ability }),
    actor.nightInfo ? /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(201,162,74,0.07)", border: "var(--hairline)", borderRadius: 4, padding: "8px 10px", marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 4 }, children: "Para decirle por voz" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 15, color: "var(--bone-100)", whiteSpace: "pre-line", margin: 0 }, children: actor.nightInfo })
    ] }) : /* @__PURE__ */ jsxRuntime.jsx("div", { style: { background: "rgba(0,0,0,0.25)", border: "var(--hairline-bone)", borderRadius: 4, padding: "7px 10px", marginBottom: 10 }, children: /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-500)", fontStyle: "italic", margin: 0 }, children: "Sin información previa — decide abajo y confirma." }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-500)", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Grimorio:" }),
      /* @__PURE__ */ jsxRuntime.jsx(StatusChips, { player: actor, compact: true })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(NarratorActionPanel, { actor, role: shown, trueRole: trueDef, game, send })
  ] });
}
function NarratorActionPanel({ actor, role, trueRole, game, send }) {
  const isMisperc = actor.believedRole && actor.believedRole !== actor.role;
  const p = NIGHT_ROLE_PATTERN[isMisperc ? role.id : trueRole.id];
  const generic = (note) => /* @__PURE__ */ jsxRuntime.jsx(GenericStepPanel, { actor, role, game, send, note });
  if (!p) return generic();
  const isFirstNight = game.nightNumber === 1;
  if (p.kind === "P2" && !isFirstNight) return generic("Este personaje solo actúa la primera noche.");
  if ((p.kind === "P3" || p.kind === "P3x2") && trueRole.id === "MONK" && isFirstNight) return generic("El Monje no protege la primera noche.");
  if (p.kind === "P1" && p.what === "executedRole" && !game.executedToday) return generic("Hoy no hubo ejecución: no hay nada que mostrar.");
  if (p.firstNightOnly && !isFirstNight) return generic("Este paso es solo de la primera noche.");
  const roleName = role.name;
  switch (p.kind) {
    case "P2":
      return /* @__PURE__ */ jsxRuntime.jsx(P2Panel, { actor, pattern: p, game, send, roleName });
    case "P1":
      return /* @__PURE__ */ jsxRuntime.jsx(P1Panel, { actor, pattern: p, game, send, roleName });
    case "P3":
      return /* @__PURE__ */ jsxRuntime.jsx(P3Panel, { actor, pattern: p, game, send, roleName });
    case "P3x2":
      return /* @__PURE__ */ jsxRuntime.jsx(P3x2Panel, { actor, pattern: p, game, send, roleName });
    case "P4":
      return /* @__PURE__ */ jsxRuntime.jsx(P4Panel, { actor, pattern: p, game, send, roleName });
    case "P_INFO":
      return /* @__PURE__ */ jsxRuntime.jsx(P_InfoPanel, { actor, pattern: p, game, send, roleName });
    case "P_DREAMER":
      return /* @__PURE__ */ jsxRuntime.jsx(DreamerPanel, { actor, pattern: p, game, send, roleName });
    case "P_CHAMBERMAID":
      return /* @__PURE__ */ jsxRuntime.jsx(ChambermaidPanel, { actor, pattern: p, game, send, roleName });
    case "P_PO":
      return /* @__PURE__ */ jsxRuntime.jsx(POPanel, { actor, pattern: p, game, send, roleName });
    case "P_PHILOSOPHER":
      return /* @__PURE__ */ jsxRuntime.jsx(PhilosopherPanel, { actor, pattern: p, game, send, roleName });
    case "P_YESNO":
      return /* @__PURE__ */ jsxRuntime.jsx(YesNoPanel, { actor, pattern: p, game, send, roleName });
    case "P_GAMBLER":
      return /* @__PURE__ */ jsxRuntime.jsx(GamblerPanel, { actor, pattern: p, game, send, roleName });
    case "P_GOSSIP":
      return /* @__PURE__ */ jsxRuntime.jsx(GossipPanel, { actor, pattern: p, game, send, roleName });
    case "P_COURTIER":
      return /* @__PURE__ */ jsxRuntime.jsx(CourtierPanel, { actor, pattern: p, game, send, roleName });
    case "P_MOONCHILD":
      return /* @__PURE__ */ jsxRuntime.jsx(MoonchildPanel, { actor, pattern: p, game, send, roleName });
    case "P_NOBLE":
      return /* @__PURE__ */ jsxRuntime.jsx(NoblePanel, { actor, pattern: p, game, send, roleName });
    case "P_PUKKA":
      return /* @__PURE__ */ jsxRuntime.jsx(PukkaPanel, { actor, pattern: p, game, send, roleName });
    case "P_INNKEEPER":
      return /* @__PURE__ */ jsxRuntime.jsx(InnkeeperPanel, { actor, game, send });
    case "P_PUZZLEMASTER":
      return /* @__PURE__ */ jsxRuntime.jsx(PuzzlemasterPanel, { actor, pattern: p, game, send, roleName });
    case "P_ALCHEMIST":
      return /* @__PURE__ */ jsxRuntime.jsx(AlchemistPanel, { actor, pattern: p, game, send, roleName });
    case "P_SHUGENJA":
      return /* @__PURE__ */ jsxRuntime.jsx(ShugenjaPanel, { actor, pattern: p, game, send, roleName });
    case "P_STEWARD":
      return /* @__PURE__ */ jsxRuntime.jsx(StewardPanel, { actor, pattern: p, game, send, roleName });
    case "P_CERENOVUS":
      return /* @__PURE__ */ jsxRuntime.jsx(CerenovusPanel, { actor, pattern: p, game, send, roleName });
    case "P_PITHAG":
      return /* @__PURE__ */ jsxRuntime.jsx(PitHagPanel, { actor, pattern: p, game, send, roleName });
    case "P_ENGINEER":
      return /* @__PURE__ */ jsxRuntime.jsx(EngineerPanel, { actor, pattern: p, game, send, roleName });
    case "P_AL_HADIKHIA":
      return /* @__PURE__ */ jsxRuntime.jsx(AlHadikhiaPanel, { actor, pattern: p, game, send, roleName });
    case "P_SUMMONER":
      return /* @__PURE__ */ jsxRuntime.jsx(SummonerPanel, { actor, pattern: p, game, send, roleName });
    case "P_LIL_MONSTA":
      return /* @__PURE__ */ jsxRuntime.jsx(LilMonstaPanel, { actor, pattern: p, game, send, roleName });
    case "P_BARISTA":
      return /* @__PURE__ */ jsxRuntime.jsx(BaristaPanel, { actor, pattern: p, game, send, roleName });
    case "P_HARLOT":
      return /* @__PURE__ */ jsxRuntime.jsx(HarlotPanel, { actor, pattern: p, game, send, roleName });
    case "P_APPRENTICE":
      return /* @__PURE__ */ jsxRuntime.jsx(ApprenticePanel, { actor, pattern: p, game, send, roleName });
    case "P_XAAN":
      return /* @__PURE__ */ jsxRuntime.jsx(XaanPanel, { actor, pattern: p, game, send, roleName });
    case "P_EVIL_TWIN":
      return /* @__PURE__ */ jsxRuntime.jsx(EvilTwinPanel, { actor, pattern: p, game, send, roleName });
    case "P_PANEL":
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
        p.note && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-200)", margin: "0 0 8px" }, children: p.note }),
        /* @__PURE__ */ jsxRuntime.jsx(AbilityTab, { target: actor, game, send, onClose: () => {
        } })
      ] });
    default:
      return generic();
  }
}
const panelStyle = { marginTop: 12, background: "color-mix(in srgb, var(--scene-accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--scene-accent) 30%, transparent)", borderRadius: 8, padding: "14px" };
const labelStyle = { fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--scene-accent)", margin: "0 0 10px" };
const selStyle = { fontSize: 15, fontFamily: "var(--serif)", background: "var(--ink-700)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--bone-100)", padding: "9px 10px", width: "100%", marginBottom: 6 };
const btnPrimary = { width: "100%", fontSize: 16, padding: "10px 0" };
const poisonNote = /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 14, color: "#4ade80", fontStyle: "italic", margin: "0 0 8px" }, children: "🧪 Envenenado: elige libremente (la info es FALSA)." });
function P2Panel({ actor, pattern, game, send, roleName }) {
  var _a, _b, _c;
  const [trueSeat, setTrueSeat] = React.useState("");
  const [decoySeat, setDecoySeat] = React.useState("");
  const [shownRole, setShownRole] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const living = game.players.filter((p) => p.alive && p.id !== actor.id);
  const isp = actor.poisoned;
  const validTrue = isp ? living : living.filter((p) => p.type === pattern.targetType);
  const validDecoy = living.filter((p) => p.id !== trueSeat);
  const roleChoices = (game.campaignRoles || []).filter((r) => r.type === pattern.targetType);
  const trueName = (_a = game.players.find((p) => p.id === trueSeat)) == null ? void 0 : _a.name;
  const decoyName = (_b = game.players.find((p) => p.id === decoySeat)) == null ? void 0 : _b.name;
  const can = trueSeat && decoySeat && trueSeat !== decoySeat && shownRole;
  const info = can ? `${pattern.emoji} ${roleName || ((_c = ROLE_BY_ID[actor.role]) == null ? void 0 : _c.name) || ""}
Entre ${trueName} y ${decoyName} hay un/una ${shownRole}.` : null;
  const confirm2 = () => {
    if (!info) return;
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: info });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "Decidir info (P2)" }),
    isp && poisonNote,
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: trueSeat, onChange: (e) => {
      setTrueSeat(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("option", { value: "", children: [
        "Jugador VERDADERO",
        !isp ? ` (${pattern.targetType})` : ""
      ] }),
      validTrue.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: decoySeat, onChange: (e) => {
      setDecoySeat(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador SEÑUELO" }),
      validDecoy.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: shownRole, onChange: (e) => {
      setShownRole(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Rol a mostrar" }),
      roleChoices.map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.name, children: r.name }, r.id))
    ] }),
    info && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-300)", fontStyle: "italic", margin: "4px 0" }, children: info }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: confirm2, disabled: !can, className: "btn-action primary", style: btnPrimary, children: "✓ Confirmar info" })
  ] });
}
function P1Panel({ actor, pattern, game, send, roleName }) {
  var _a, _b, _c, _d;
  const [val, setVal] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const name = roleName || ((_a = ROLE_BY_ID[actor.role]) == null ? void 0 : _a.name) || "";
  if (pattern.what === "executedRole") {
    const exec = game.players.find((p) => p.id === game.executedToday);
    if (!exec) return null;
    const execRoleName = ((_b = ROLE_BY_ID[exec.role]) == null ? void 0 : _b.name) || "?";
    const info = `${pattern.emoji} ${name}
El ejecutado (${exec.name}) era: ${execRoleName}.`;
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Confirmado" : name }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", margin: "0 0 6px" }, children: info }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: info });
            setOk(true);
          },
          className: "btn-action primary",
          style: btnPrimary,
          children: "✓ Confirmar"
        }
      )
    ] });
  }
  if (pattern.what === "opinion") {
    const options = [["good", "✅ Va ganando el Bien"], ["neutral", "⚖ Empate"], ["evil", "🔴 Va ganando el Mal"]];
    const label2 = ((_c = options.find(([v]) => v === val)) == null ? void 0 : _c[1]) || "";
    const infoStr2 = val ? `${pattern.emoji} ${name}
Opinión: ${label2}.` : null;
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "General — opinión del Narrador" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 6 }, children: options.map(([v, lbl]) => /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-night",
          onClick: () => {
            setVal(v);
            setOk(false);
          },
          style: { flex: 1, fontSize: 10, padding: "6px 2px", borderColor: val === v ? "var(--gold)" : void 0, color: val === v ? "var(--gold-hot)" : void 0 },
          children: lbl
        },
        v
      )) }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            if (infoStr2) {
              send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: infoStr2 });
              setOk(true);
            }
          },
          disabled: !infoStr2,
          className: "btn-action primary",
          style: { ...btnPrimary, opacity: infoStr2 ? 1 : 0.4 },
          children: "✓ Confirmar"
        }
      )
    ] });
  }
  if (pattern.what === "yesno") {
    const answer = val === "yes" ? "SÍ" : val === "no" ? "NO" : null;
    const infoStr2 = answer ? `${pattern.emoji} ${name}
${pattern.label} ${answer}.` : null;
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : pattern.label }),
      actor.poisoned && poisonNote,
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 6 }, children: [["yes", "✅ SÍ"], ["no", "❌ NO"]].map(([v, lbl]) => /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            setVal(v);
            setOk(false);
          },
          className: "btn-night",
          style: { flex: 1, fontSize: 13, padding: "6px 0", borderColor: val === v ? "var(--gold)" : void 0, color: val === v ? "var(--gold-hot)" : void 0 },
          children: lbl
        },
        v
      )) }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            if (infoStr2) {
              send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: infoStr2 });
              setOk(true);
            }
          },
          disabled: !infoStr2,
          className: "btn-action primary",
          style: { ...btnPrimary, opacity: infoStr2 ? 1 : 0.4 },
          children: "✓ Confirmar"
        }
      )
    ] });
  }
  const autoMap = {
    evilNeighbors: () => calcEvilNeighbors(game, actor.id),
    evilPairs: () => calcEvilPairs(game),
    deadEvil: () => calcDeadEvil(game),
    distance: () => calcMinDistance(game),
    abnormal: () => null
  };
  const auto = ((_d = autoMap[pattern.what]) == null ? void 0 : _d.call(autoMap)) ?? null;
  const maxV = pattern.what === "evilNeighbors" ? 2 : pattern.what === "distance" ? Math.max(8, game.players.filter((p) => p.alive).length - 1) : Math.min(6, Math.floor(game.players.length / 2) + 1);
  const infoStr = val !== "" ? `${pattern.emoji} ${name}
Tienes ${val} ${pattern.label}.` : null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "Decidir número" }),
    actor.poisoned && poisonNote,
    !actor.poisoned && auto != null && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)", margin: "0 0 4px" }, children: [
      "Auto: ",
      /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { color: "var(--good)" }, children: auto }),
      " ",
      pattern.label
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }, children: Array.from({ length: maxV + 1 }, (_, i) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          setVal(String(i));
          setOk(false);
        },
        className: "btn-night",
        style: { flex: "1 0 auto", minWidth: 32, fontSize: 14, padding: "5px 0", borderColor: String(i) === val ? "var(--gold)" : void 0, color: String(i) === val ? "var(--gold-hot)" : void 0 },
        children: i
      },
      i
    )) }),
    !actor.poisoned && val === "" && auto != null && /* @__PURE__ */ jsxRuntime.jsxs("button", { onClick: () => setVal(String(auto)), className: "btn-night", style: { width: "100%", fontSize: 10, padding: "4px 0", marginBottom: 4 }, children: [
      "Usar calculado (",
      auto,
      ")"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (infoStr) {
            send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: infoStr });
            setOk(true);
          }
        },
        disabled: !infoStr,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: infoStr ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function P3Panel({ actor, pattern, game, send, roleName }) {
  const [targetId, setTargetId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = pattern.deadOnly ? game.players.filter((p) => !p.alive) : game.players.filter(
    (p) => (p.alive || p.diedThisNight) && (pattern.notSelf ? p.id !== actor.id : true) && (pattern.evilOnly && !actor.poisoned ? p.alignment === "evil" : true) && // typeFilter: solo jugadores de ese tipo (Duendecillo → Aldeanos).
    // Envenenado/borracho: sin filtro, el narrador miente con libertad.
    (pattern.typeFilter && !actor.poisoned ? p.type === pattern.typeFilter : true) && // excludeToken: quien lleve esa ficha no puede volver a ser elegido
    // (Exorcista: no repite el objetivo de anoche).
    (pattern.excludeToken ? !(p.tokens || []).some((t) => t.type === pattern.excludeToken) : true)
  );
  const infoLabels = {
    POISONER_ACTION: (n) => `🧪 Envenenador
Envenenaste a ${n} esta noche.`,
    MONK_PROTECT: (n) => `🛡️ Monje
Protegiste a ${n} esta noche.`,
    IMP_KILL: (n) => `👹 Diablillo
Atacaste a ${n} esta noche.`,
    BUTLER_MASTER: (n) => `🤵 Mayordomo
Tu Amo esta noche es ${n}.`,
    GRANDMOTHER_INFO: (n) => {
      var _a;
      const gp = game.players.find((p) => p.id === targetId);
      const rn = ((_a = ROLE_BY_ID[gp == null ? void 0 : gp.role]) == null ? void 0 : _a.name) || "?";
      return `👵 Abuela
Tu nieto es ${n} (${rn}).`;
    },
    SAILOR_DRUNK: (n) => `⚓ Marinero
Emborrachaste a ${n} (o a ti mismo — Narrador decide cuál de los 2).`,
    EXORCIST_CHOOSE: (n) => `✝️ Exorcista
Elegiste a ${n} esta noche.`,
    GAMBLER_GUESS: (n) => `🎲 Tahúr
Apuesta de ${actor.name} por ${n}.`,
    PROFESSOR_REVIVE: (n) => `🎓 Profesor
Intentó revivir a ${n}.`,
    GODFATHER_KILL: (n) => `🎩 Padrino
Atacó a ${n} esta noche.`,
    DEVILS_ADVOCATE_PROTECT: (n) => `⚖️ Abogado del Diablo
Protegido de ejecución mañana: ${n}.`,
    ASSASSIN_KILL: (n) => `🗡️ Asesino
Mató a ${n} (ignorando todas las protecciones).`,
    SNAKE_CHARMER: (n) => `🐍 Encantador de Serpientes
Eligió a ${n} esta noche.`,
    WITCH_CURSE: (n) => `🧙‍♀️ Bruja
Maldijo a ${n} (si nomina mañana, muere).`,
    HUNTSMAN: (n) => `🏹 Cazador
Eligió a ${n} esta noche.`,
    LYCANTHROPE_KILL: (n) => `🐺 Licántropo
Eligió a ${n} esta noche.`,
    ACROBAT_CHECK: (n) => `🤸 Acróbata
Eligió a ${n} esta noche.`,
    FEARMONGER: (n) => `😨 Fearmonger
Objetivo: ${n}.`,
    WIDOW_POISON: (n) => `🕷️ Viuda
Envenenó permanentemente a ${n}.`,
    PREACHER: (n) => `⛪ Predicador
Eligió a ${n} esta noche.`,
    NIGHTWATCHMAN: (n) => `🔦 Sereno
Informó a ${n} de su identidad.`,
    HIGH_PRIESTESS: (n) => `🌙 Suma Sacerdotisa
Jugador a mostrar al Rey esta noche: ${n}.`,
    BOUNTY_HUNTER_REVEAL: (n) => `💰 Cazarrecompensas
Revela a ${n} como jugador malvado.`,
    LORD_OF_TYPHON_KILL: (n) => `🐍 Señor de Typhon
Atacó a ${n} esta noche.`,
    FIDDLER_DUEL: (n) => `🎻 Violinista
Duelo contra ${n}: mañana todos votan cuál de los 2 gana la partida.`,
    GNOME_KNOWN: (n) => `🧙‍♂️ Gnomo
Anuncia en público: ${n} es de la alineación del Gnomo.`,
    OGRE_ALIGN: (n) => `👹 Ogro
Copió la alineación de ${n} — NO se lo digas.`,
    BUREAUCRAT_VOTE: (n) => `📋 Burócrata
Mañana el voto de ${n} cuenta por 3.`,
    THIEF_VOTE: (n) => `🕵️‍♂️ Ladrón
Mañana el voto de ${n} cuenta en negativo.`,
    VILLAGE_IDIOT_INFO: (n) => {
      const t = game.players.find((p) => p.id === targetId);
      const real = (t == null ? void 0 : t.alignment) === "evil" ? "MALVADO" : "BUENO";
      const shown = actor.poisoned ? real === "MALVADO" ? "BUENO" : "MALVADO" : real;
      return `🤪 Tonto del Pueblo
${n} es ${shown}.`;
    },
    PIXIE_INFO: (n) => {
      var _a;
      const t = game.players.find((p) => p.id === targetId);
      return `🧚 Duendecillo
El Aldeano que conoces es: ${((_a = ROLE_BY_ID[t == null ? void 0 : t.role]) == null ? void 0 : _a.name) || "?"}.`;
    }
  };
  const confirm2 = () => {
    var _a;
    if (!targetId) return;
    const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
    const fallback = (n) => `${pattern.emoji} ${roleName || ""}
${pattern.label} ${n} esta noche.`;
    const nightInfo = (infoLabels[pattern.effect] || fallback)(tname);
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, actionType: pattern.effect, targetIds: [targetId], nightInfo });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Acción aplicada" : pattern.label || roleName }),
    pattern.note && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", fontStyle: "italic", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6, lineHeight: 1.4 }, children: [
      "⚠ ",
      pattern.note
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("option", { value: "", children: [
        pattern.label || "Elegir jugador",
        "…"
      ] }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: p.id, children: [
        p.name,
        pattern.deadOnly ? " ☠" : p.diedThisNight ? " ☠ (murió esta noche)" : ""
      ] }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        onClick: confirm2,
        disabled: !targetId,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId ? 1 : 0.4 },
        children: [
          pattern.emoji,
          " Aplicar"
        ]
      }
    )
  ] });
}
function P3x2Panel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const living = game.players.filter((p) => p.alive || p.diedThisNight);
  const can = t1 && t2 && t1 !== t2;
  const buildInfo = (n1, n2) => {
    if (pattern.effect === "INNKEEPER_PROTECT") return `🏨 Posadero
Protegidos: ${n1} y ${n2}. Decide cuál de los 2 queda borracho.`;
    if (pattern.effect === "HARPY") return `🦅 Arpía
Mañana ${n1} cree que ${n2} es malvado.`;
    return `${pattern.emoji} ${roleName}
Atacaste a ${n1} y ${n2} esta noche.`;
  };
  const confirm2 = () => {
    var _a, _b;
    if (!can) return;
    const n1 = (_a = game.players.find((p) => p.id === t1)) == null ? void 0 : _a.name;
    const n2 = (_b = game.players.find((p) => p.id === t2)) == null ? void 0 : _b.name;
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, actionType: pattern.effect, targetIds: [t1, t2], nightInfo: buildInfo(n1, n2) });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Acción aplicada" : `${roleName} — 2 objetivos` }),
    pattern.note && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", fontStyle: "italic", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6, lineHeight: 1.4 }, children: [
      "⚠ ",
      pattern.note
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t1, onChange: (e) => {
      setT1(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 1…" }),
      living.filter((p) => p.id !== t2).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t2, onChange: (e) => {
      setT2(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 2…" }),
      living.filter((p) => p.id !== t1).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs(
      "button",
      {
        onClick: confirm2,
        disabled: !can,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can ? 1 : 0.4 },
        children: [
          pattern.emoji,
          " Aplicar"
        ]
      }
    )
  ] });
}
function P4Panel({ actor, pattern, game, send, roleName }) {
  const isFirstNight = game.nightNumber === 1;
  const isSameAlign = !!pattern.sameAlignment;
  const [p1, setP1] = React.useState("");
  const [p2, setP2] = React.useState("");
  const [redHerring, setRedHerring] = React.useState(game.smokeScreenPlayerId || "");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const living = game.players.filter((p) => p.alive && p.id !== actor.id);
  const goodPl = game.players.filter((p) => p.alignment === "good");
  const p1d = game.players.find((p) => p.id === p1);
  const p2d = game.players.find((p) => p.id === p2);
  const rh = redHerring || game.smokeScreenPlayerId;
  const result = p1d && p2d && !actor.poisoned ? isSameAlign ? p1d.alignment === p2d.alignment ? "✅ Misma alineación" : "❌ Distinta alineación" : p1d.type === "demon" || p1d.id === rh || p2d.type === "demon" || p2d.id === rh ? "✅ SÍ hay Demonio" : "❌ NO hay Demonio" : null;
  const can = p1 && p2 && p1 !== p2;
  const label2 = roleName || (isSameAlign ? "Costurera" : "Pitonisa");
  const buildInfo = () => {
    const n1 = p1d == null ? void 0 : p1d.name, n2 = p2d == null ? void 0 : p2d.name;
    const res = actor.poisoned ? "(info FALSA — decide tú)" : result || "…";
    return isSameAlign ? `${pattern.emoji} ${label2}
¿${n1} y ${n2} son del mismo bando? ${res}.` : `🔮 ${label2}
Entre ${n1} y ${n2}: ${res}.`;
  };
  const confirm2 = () => {
    if (!can) return;
    const payload = { actorId: actor.id, nightInfo: buildInfo() };
    if (!isSameAlign && isFirstNight && redHerring) payload.redHerringSeatId = redHerring;
    send("NIGHT_NARRATOR_ACTION", payload);
    if (isSameAlign) {
      const role = ROLE_BY_ID[actor.role];
      send("ADD_TOKEN", { playerId: actor.id, token: { tokenId: "NO_ABILITY", roleId: actor.role, roleName: role == null ? void 0 : role.name, img: role == null ? void 0 : role.img, label: "Sin habilidad", duration: "oneShot" } });
    }
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : `${label2} — elegir 2 jugadores` }),
    pattern.note && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", fontStyle: "italic", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6, lineHeight: 1.4 }, children: [
      "⚠ ",
      pattern.note
    ] }),
    !isSameAlign && isFirstNight && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(0,0,0,0.2)", borderRadius: 4, padding: "6px 8px", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, color: "var(--bone-400)", textTransform: "uppercase", margin: "0 0 4px" }, children: "Falso positivo (solo 1ª noche)" }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { style: { ...selStyle, marginBottom: 0 }, value: redHerring, onChange: (e) => {
        setRedHerring(e.target.value);
        if (e.target.value) send("NIGHT_NARRATOR_ACTION", { redHerringSeatId: e.target.value });
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Sin falso positivo" }),
        goodPl.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: p1, onChange: (e) => {
      setP1(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 1" }),
      living.filter((p) => p.id !== p2).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: p2, onChange: (e) => {
      setP2(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 2" }),
      living.filter((p) => p.id !== p1).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    result && !actor.poisoned && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 14, color: result.startsWith("✅") ? "var(--blood-hi)" : "var(--good)", margin: "4px 0", textAlign: "center", fontWeight: 700 }, children: result }),
    actor.poisoned && poisonNote,
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !can,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function GenericStepPanel({ actor, role, game, send, note }) {
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const hint2 = (game.roleHints || []).find((h) => h.roleId === role.id && h.playerId === actor.id) || (game.roleHints || []).find((h) => h.roleId === role.id);
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `🎙 ${role.name}
[Narrador gestionó manualmente]` });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { ...panelStyle, borderColor: "rgba(201,162,74,0.18)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Anotado" : `${role.name} — sin automatismo` }),
    note && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-300)", margin: "0 0 6px", lineHeight: 1.5 }, children: note }),
    role.ability && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-200)", fontStyle: "italic", margin: "0 0 8px", lineHeight: 1.5 }, children: role.ability }),
    (hint2 == null ? void 0 : hint2.text) && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 8, lineHeight: 1.5 }, children: [
      "🎙 ",
      hint2.text
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-500)", fontStyle: "italic", margin: "0 0 8px" }, children: "Resuélvelo a mano (usa «+ ficha» arriba si necesitas marcar algo) y cierra el paso." }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: confirm2, className: "btn-action", style: { ...btnPrimary, opacity: ok ? 0.5 : 1 }, children: ok ? "✓ Anotado" : "✓ Confirmar paso" })
  ] });
}
function EvilTwinPanel({ actor, game, send }) {
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pair = game.evilTwinPair;
  const evil = game.players.find((p) => p.id === (pair == null ? void 0 : pair.evilId));
  const good = game.players.find((p) => p.id === (pair == null ? void 0 : pair.goodId));
  const goodRole = (good == null ? void 0 : good.role) ? ROLE_BY_ID[good.role] : null;
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      nightInfo: `👯 Gemela Malvada
Tu gemelo bueno es ${(good == null ? void 0 : good.name) || "?"}${goodRole ? ` (${goodRole.name})` : ""}.`
    });
    if (good) {
      send("NIGHT_NARRATOR_ACTION", {
        actorId: good.id,
        nightInfo: `👯 Gemelo bueno
Tu gemela malvada es ${(evil == null ? void 0 : evil.name) || "?"} (Gemela Malvada).`
      });
    }
    setOk(true);
  };
  if (!pair || !evil || !good) {
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { ...panelStyle, borderColor: "rgba(201,162,74,0.18)" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: "Gemela Malvada — falta emparejar" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--blood-hi)", margin: 0 }, children: "No hay pareja guardada. Vuelve al montaje y elige a su gemelo de alineación opuesta." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { ...panelStyle, borderColor: "rgba(201,162,74,0.18)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Gemelos presentados" : "Gemela Malvada — presentación mutua" }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)", margin: "0 0 8px", lineHeight: 1.6 }, children: [
      "Despierta a ",
      /* @__PURE__ */ jsxRuntime.jsx("b", { style: { color: "var(--blood-hi)" }, children: evil.name }),
      " y a",
      " ",
      /* @__PURE__ */ jsxRuntime.jsx("b", { style: { color: "var(--good)" }, children: good.name }),
      " a la vez y que se vean.",
      goodRole && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        " El gemelo bueno es ",
        /* @__PURE__ */ jsxRuntime.jsx("b", { children: goodRole.name }),
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 8, lineHeight: 1.5 }, children: [
      "Mientras los dos vivan, el Bien no puede ganar. Si ejecutan a ",
      good.name,
      ", ganan los malos."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: confirm2, className: "btn-action", style: { ...btnPrimary, opacity: ok ? 0.5 : 1 }, children: ok ? "✓ Presentados" : "✓ Presentarlos" })
  ] });
}
function P_InfoPanel({ actor, pattern, send, roleName }) {
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `${pattern.emoji} ${roleName}
[Narrador gestionó manualmente]` });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { ...panelStyle, borderColor: "rgba(201,162,74,0.18)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Anotado" : `${roleName} — recordatorio` }),
    pattern.note && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 8, lineHeight: 1.5 }, children: pattern.note }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: confirm2, className: "btn-action", style: { ...btnPrimary, opacity: ok ? 0.5 : 1 }, children: ok ? "✓ Anotado" : "✓ Confirmar paso" })
  ] });
}
function DreamerPanel({ actor, pattern, game, send, roleName }) {
  var _a;
  const [targetId, setTargetId] = React.useState("");
  const [decoyId, setDecoyId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const target = game.players.find((p) => p.id === targetId);
  const targetDef = target ? ROLE_BY_ID[target.role] : null;
  const oppositeAlign = (targetDef == null ? void 0 : targetDef.alignment) === "good" ? "evil" : "good";
  const decoyRoles = (game.campaignRoles || []).filter((r) => r.alignment === oppositeAlign && r.id !== (target == null ? void 0 : target.role));
  const buildInfo = () => {
    const decoyDef = ROLE_BY_ID[decoyId];
    return `💭 Soñador
${target == null ? void 0 : target.name} eligió a un jugador. Muéstrale: [${targetDef == null ? void 0 : targetDef.name}] y [${decoyDef == null ? void 0 : decoyDef.name}].`;
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "Soñador — objetivo y señuelo" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setDecoyId("");
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador elegido por el Soñador…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    targetDef && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-200)", margin: "4px 0 6px" }, children: [
        "Rol real: ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { children: targetDef.name }),
        " (",
        targetDef.alignment === "good" ? "bueno" : "malvado",
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: decoyId, onChange: (e) => {
        setDecoyId(e.target.value);
        setOk(false);
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("option", { value: "", children: [
          "Señuelo (",
          oppositeAlign === "good" ? "bueno" : "malvado",
          ")…"
        ] }),
        decoyRoles.map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
      ] })
    ] }),
    targetDef && decoyId && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--gold)", margin: "4px 0", fontStyle: "italic" }, children: [
      'Decir: "',
      targetDef.name,
      '" + "',
      (_a = ROLE_BY_ID[decoyId]) == null ? void 0 : _a.name,
      '"'
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (targetId && decoyId) {
            send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: buildInfo() });
            setOk(true);
          }
        },
        disabled: !targetId || !decoyId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && decoyId && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function ChambermaidPanel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");
  const [count, setCount] = React.useState(null);
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const can = t1 && t2 && t1 !== t2 && count !== null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "Doncella — 2 jugadores observados" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t1, onChange: (e) => {
      setT1(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 1…" }),
      pool.filter((p) => p.id !== t2).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t2, onChange: (e) => {
      setT2(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 2…" }),
      pool.filter((p) => p.id !== t1).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    t1 && t2 && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)", margin: "6px 0 4px" }, children: "¿Cuántos despertaron por su habilidad esta noche?" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 6 }, children: [0, 1, 2].map((n) => /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          className: "btn-night",
          onClick: () => {
            setCount(n);
            setOk(false);
          },
          style: { flex: 1, fontSize: 15, padding: "6px 0", borderColor: count === n ? "var(--gold)" : void 0, color: count === n ? "var(--gold-hot)" : void 0 },
          children: n
        },
        n
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => {
      var _a, _b;
      if (!can) return;
      const n1 = (_a = game.players.find((p) => p.id === t1)) == null ? void 0 : _a.name;
      const n2 = (_b = game.players.find((p) => p.id === t2)) == null ? void 0 : _b.name;
      send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `🛎️ Doncella
${n1} y ${n2}: despertaron ${count} de 2 por su habilidad.` });
      setOk(true);
    }, disabled: !can || ok, className: "btn-action primary", style: { ...btnPrimary, opacity: can && !ok ? 1 : 0.4 }, children: "✓ Confirmar" })
  ] });
}
function POPanel({ actor, pattern, game, send }) {
  const isTripleMode = localStorage.getItem("botc_po_skip_night") === String(game.nightNumber - 1);
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");
  const [t3, setT3] = React.useState("");
  const [targetId, setTargetId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const [skipped, setSkipped] = React.useState(false);
  const living = game.players.filter((p) => p.alive);
  if (isTripleMode) {
    const can = t1 && t2 && t3 && (/* @__PURE__ */ new Set([t1, t2, t3])).size === 3;
    const n = (id) => {
      var _a;
      return (_a = game.players.find((p) => p.id === id)) == null ? void 0 : _a.name;
    };
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { ...panelStyle, borderColor: "rgba(168,58,45,0.5)" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { ...labelStyle, color: "var(--blood-hi)" }, children: "⚠ PO — Ataque ×3 (saltó anoche)" }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t1, onChange: (e) => {
        setT1(e.target.value);
        setOk(false);
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Objetivo 1…" }),
        living.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t2, onChange: (e) => {
        setT2(e.target.value);
        setOk(false);
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Objetivo 2…" }),
        living.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t3, onChange: (e) => {
        setT3(e.target.value);
        setOk(false);
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Objetivo 3…" }),
        living.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            if (!can) return;
            send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, actionType: "PO_KILL", targetIds: [t1, t2, t3], nightInfo: `💀 PO atacó ×3: ${n(t1)}, ${n(t2)}, ${n(t3)}.` });
            setOk(true);
          },
          disabled: !can || ok,
          className: "btn-action primary",
          style: { ...btnPrimary, opacity: can && !ok ? 1 : 0.4 },
          children: ok ? "✓ Aplicado" : "💀 Atacar ×3"
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok || skipped ? "✓ Acción aplicada" : "💀 PO — Atacar o Saltar" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Elegir objetivo…" }),
      living.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          var _a;
          if (!targetId) return;
          const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, actionType: "PO_KILL", targetIds: [targetId], nightInfo: `💀 PO atacó a ${tname} esta noche.` });
          setOk(true);
        },
        disabled: !targetId || ok || skipped,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && !ok && !skipped ? 1 : 0.4 },
        children: "💀 Atacar"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          localStorage.setItem("botc_po_skip_night", String(game.nightNumber));
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: "⏭ PO saltó el ataque esta noche — próxima noche atacará ×3." });
          setSkipped(true);
        },
        disabled: ok || skipped,
        className: "btn-night",
        style: { width: "100%", fontSize: 11, marginTop: 4, opacity: ok || skipped ? 0.4 : 1 },
        children: skipped ? "⏭ Saltó el ataque (×3 próxima noche)" : "⏭ Saltar ataque (próxima noche ×3)"
      }
    )
  ] });
}
function PhilosopherPanel({ actor, pattern, game, send, roleName }) {
  const [roleId, setRoleId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const goodRoles = (game.campaignRoles || []).filter((r) => r.alignment === "good" && r.id !== actor.role);
  const chosenDef = roleId ? ROLE_BY_ID[roleId] : null;
  const playerWithRole = roleId ? game.players.find((p) => p.role === roleId && p.id !== actor.id) : null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Registrado (una vez)" : "Filósofo — elegir personaje bueno" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: roleId, onChange: (e) => {
      setRoleId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Personaje bueno elegido…" }),
      goodRoles.map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
    ] }),
    playerWithRole && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "#fbbf24", margin: "4px 0" }, children: [
      "⚠ ",
      playerWithRole.name,
      " ya tiene ese rol → queda borracho"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (!chosenDef) return;
          const note = playerWithRole ? `Marcar a ${playerWithRole.name} como borracho.` : "El personaje no está en juego.";
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `📜 Filósofo
Eligió: ${chosenDef.name}. ${note}` });
          setOk(true);
        },
        disabled: !roleId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: roleId && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function YesNoPanel({ actor, pattern, send, roleName }) {
  const [val, setVal] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const chosen = val === "yes" ? pattern.yesLabel || "SÍ" : val === "no" ? pattern.noLabel || "NO" : null;
  const info = chosen ? `${pattern.emoji} ${roleName}
${pattern.label}: ${chosen}.` : null;
  const effect = val === "yes" ? pattern.effect : val === "no" ? pattern.noEffect : null;
  const confirm2 = () => {
    if (!info) return;
    const payload = { actorId: actor.id, nightInfo: info };
    if (effect) {
      payload.actionType = effect;
      payload.targetIds = [];
    }
    send("NIGHT_NARRATOR_ACTION", payload);
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Anotado" : pattern.label }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 4, marginBottom: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            setVal("yes");
            setOk(false);
          },
          className: "btn-night",
          style: { flex: 1, fontSize: 12, borderColor: val === "yes" ? "var(--blood-hi)" : void 0, color: val === "yes" ? "var(--blood-hi)" : void 0 },
          children: pattern.yesLabel || "SÍ"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            setVal("no");
            setOk(false);
          },
          className: "btn-night",
          style: { flex: 1, fontSize: 12, borderColor: val === "no" ? "var(--good)" : void 0, color: val === "no" ? "var(--good)" : void 0 },
          children: pattern.noLabel || "NO"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !info,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: info ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function XaanPanel({ actor, pattern, game, send, roleName }) {
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const outsiders = game.players.filter((p) => p.type === "outsider").length;
  const townfolk = game.players.filter((p) => p.alive && p.type === "townfolk");
  const isNightX = game.nightNumber === outsiders;
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      actionType: "XAAN_POISON",
      targetIds: [],
      nightInfo: `${pattern.emoji} ${roleName}
Noche X: ${townfolk.length} Aldeano(s) envenenados hasta el anochecer.`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Aldeanos envenenados" : "Xaan — cuenta de noches" }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-200)", margin: "0 0 8px", lineHeight: 1.5 }, children: [
      "Forasteros en juego: ",
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: outsiders }),
      " → la noche X es la ",
      /* @__PURE__ */ jsxRuntime.jsxs("strong", { children: [
        "noche ",
        outsiders
      ] }),
      ". Vas por la ",
      /* @__PURE__ */ jsxRuntime.jsxs("strong", { children: [
        "noche ",
        game.nightNumber
      ] }),
      "."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, margin: "0 0 8px", color: isNightX ? "var(--blood-hi)" : "var(--bone-400)", fontStyle: isNightX ? "normal" : "italic" }, children: isNightX ? `⚠ ES la noche X: envenena a los ${townfolk.length} Aldeanos vivos hasta el anochecer.` : "Todavía no es la noche X: el Xaan no hace nada esta noche." }),
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: confirm2, className: "btn-action primary", style: { ...btnPrimary, opacity: ok ? 0.5 : 1 }, children: "🌑 Envenenar a todos los Aldeanos" })
  ] });
}
function GamblerPanel({ actor, pattern, game, send, roleName }) {
  const [targetId, setTargetId] = React.useState("");
  const [guessRoleId, setGuessRoleId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const rolesInPlay = [];
  const seen = /* @__PURE__ */ new Set();
  for (const pl of game.players) {
    const def = ROLE_BY_ID[pl.role];
    if (def && !seen.has(def.id)) {
      seen.add(def.id);
      rolesInPlay.push(def);
    }
  }
  for (const r of game.campaignRoles || []) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      rolesInPlay.push(r);
    }
  }
  const target = game.players.find((p) => p.id === targetId);
  const actorEffective = !actor.poisoned && !actor.drunkAs;
  const guessCorrect = target && guessRoleId && actorEffective && target.role === guessRoleId;
  const guessWrong = target && guessRoleId && (!actorEffective || target.role !== guessRoleId);
  const can = targetId && guessRoleId;
  const buildInfo = () => {
    var _a;
    const rname = ((_a = ROLE_BY_ID[guessRoleId]) == null ? void 0 : _a.name) || guessRoleId;
    return `🎲 Tahúr
${actor.name} apostó: ${target == null ? void 0 : target.name} es ${rname}. ${guessCorrect ? "CORRECTO — no muere." : "INCORRECTO — ¡muere esta noche!"}`;
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Resultado registrado" : "Tahúr — apuesta de esta noche" }),
    actor.poisoned && poisonNote,
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setGuessRoleId("");
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador apostado…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: guessRoleId, onChange: (e) => {
      setGuessRoleId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Personaje que adivina…" }),
      rolesInPlay.sort((a, b) => a.name.localeCompare(b.name)).map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
    ] }),
    can && /* @__PURE__ */ jsxRuntime.jsx("p", { style: {
      fontFamily: "var(--serif)",
      fontSize: 13,
      fontWeight: 700,
      textAlign: "center",
      margin: "4px 0",
      color: guessCorrect ? "var(--good)" : "var(--blood-hi)"
    }, children: guessCorrect ? "✅ CORRECTO — el Tahúr no muere" : "💀 INCORRECTO — el Tahúr muere esta noche" }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (!can) return;
          const payload = { actorId: actor.id, nightInfo: buildInfo() };
          if (guessWrong) {
            payload.actionType = "KILL";
            payload.targetIds = [actor.id];
          }
          send("NIGHT_NARRATOR_ACTION", payload);
          setOk(true);
        },
        disabled: !can || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function GossipPanel({ actor, pattern, game, send, roleName }) {
  const [triggered, setTriggered] = React.useState(null);
  const [targetId, setTargetId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const buildInfo = () => {
    var _a;
    if (!triggered) return null;
    if (triggered === "no") return `💬 Chismoso
Declaración pública no verdadera (o Chismoso envenenada). No hay muerte.`;
    const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
    return `💬 Chismoso
Declaración verdadera — muere ${tname} esta noche.`;
  };
  const can = triggered === "no" || triggered === "yes" && targetId;
  const info = buildInfo();
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Anotado" : "Chismoso — ¿se activa hoy?" }),
    actor.poisoned && poisonNote,
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 6px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "¿Algún jugador hizo una declaración pública verdadera hoy?" }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 6 }, children: [["yes", "✅ SÍ — se activa"], ["no", "❌ NO — sin efecto"]].map(([v, lbl]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          setTriggered(v);
          setTargetId("");
          setOk(false);
        },
        className: "btn-night",
        style: { flex: 1, fontSize: 11, borderColor: triggered === v ? "var(--gold)" : void 0, color: triggered === v ? "var(--gold-hot)" : void 0 },
        children: lbl
      },
      v
    )) }),
    triggered === "yes" && !actor.poisoned && /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "¿Quién muere esta noche?" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (!can || !info) return;
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: info });
          setOk(true);
        },
        disabled: !can || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function CourtierPanel({ actor, pattern, game, send, roleName }) {
  const [guessRoleId, setGuessRoleId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const rolesInPlay = [];
  const seen = /* @__PURE__ */ new Set();
  for (const pl of game.players) {
    const def = ROLE_BY_ID[pl.role];
    if (def && pl.id !== actor.id && !seen.has(def.id)) {
      seen.add(def.id);
      rolesInPlay.push(def);
    }
  }
  const targetPlayer = guessRoleId ? game.players.find((p) => p.role === guessRoleId) : null;
  const chosenDef = ROLE_BY_ID[guessRoleId];
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Registrado (una vez)" : "Cortesano — elegir personaje a borrachar" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 6px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "Una sola vez por partida. El personaje elegido queda borracho 3 noches + 3 días." }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: guessRoleId, onChange: (e) => {
      setGuessRoleId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Personaje elegido…" }),
      rolesInPlay.sort((a, b) => a.name.localeCompare(b.name)).map((r) => {
        var _a;
        return /* @__PURE__ */ jsxRuntime.jsxs("option", { value: r.id, children: [
          r.name,
          " (",
          ((_a = game.players.find((p) => p.role === r.id)) == null ? void 0 : _a.name) || "?",
          ")"
        ] }, r.id);
      })
    ] }),
    targetPlayer && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "#fbbf24", margin: "4px 0" }, children: [
      "⚠ ",
      targetPlayer.name,
      " (",
      chosenDef == null ? void 0 : chosenDef.name,
      ") queda borracho 3 noches + 3 días."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (!guessRoleId || !chosenDef) return;
          const tp = (targetPlayer == null ? void 0 : targetPlayer.name) || "(desconocido)";
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `🎴 Cortesano
Eligió: ${chosenDef.name} (${tp}). Borracho 3 noches + 3 días.` });
          setOk(true);
        },
        disabled: !guessRoleId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: guessRoleId && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function MoonchildPanel({ actor, pattern, game, send, roleName }) {
  const [died, setDied] = React.useState(null);
  const [targetId, setTargetId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const can = died === false || died === true && targetId;
  const buildInfo = () => {
    var _a;
    if (!died) return `🌙 Lunático
No murió esta noche — sin efecto.`;
    const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
    return `🌙 Lunático
Murió esta noche. Al amanecer muere: ${tname}.`;
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Anotado" : "Lunático — ¿murió esta noche?" }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 6 }, children: [[true, "💀 Sí murió"], [false, "✅ No murió"]].map(([v, lbl]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          setDied(v);
          setTargetId("");
          setOk(false);
        },
        className: "btn-night",
        style: { flex: 1, fontSize: 12, borderColor: died === v ? v ? "var(--blood-hi)" : "var(--good)" : void 0, color: died === v ? v ? "var(--blood-hi)" : "var(--good)" : void 0 },
        children: lbl
      },
      String(v)
    )) }),
    died === true && /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "¿Quién muere al amanecer?" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (!can) return;
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: buildInfo() });
          setOk(true);
        },
        disabled: !can || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function NoblePanel({ actor, pattern, game, send, roleName }) {
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");
  const [t3, setT3] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const selected = [t1, t2, t3].filter(Boolean);
  const can = t1 && t2 && t3 && (/* @__PURE__ */ new Set([t1, t2, t3])).size === 3;
  const evilCount = selected.filter((id) => {
    var _a;
    return ((_a = game.players.find((p) => p.id === id)) == null ? void 0 : _a.alignment) === "evil";
  }).length;
  const validCombo = actor.poisoned || evilCount === 1;
  const n = (id) => {
    var _a;
    return ((_a = game.players.find((p) => p.id === id)) == null ? void 0 : _a.name) || "?";
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "Noble — elegir 3 jugadores (1 malvado)" }),
    actor.poisoned && poisonNote,
    [["Jugador 1", t1, setT1, t2, t3], ["Jugador 2", t2, setT2, t1, t3], ["Jugador 3", t3, setT3, t1, t2]].map(([lbl, val, setter, ex1, ex2]) => /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: val, onChange: (e) => {
      setter(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("option", { value: "", children: [
        lbl,
        "…"
      ] }),
      pool.filter((p) => p.id !== ex1 && p.id !== ex2).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }, lbl)),
    can && !actor.poisoned && !validCombo && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "2px 0" }, children: [
      "⚠ Selección inválida: debe haber exactamente 1 malvado entre los 3 (",
      evilCount,
      " seleccionados)."
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          if (!can || !validCombo) return;
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `🎭 Noble
Mostrados: ${n(t1)}, ${n(t2)}, ${n(t3)}. Exactamente 1 es malvado real.` });
          setOk(true);
        },
        disabled: !can || !validCombo || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can && validCombo && !ok ? 1 : 0.4 },
        children: "✓ Confirmar"
      }
    )
  ] });
}
function PukkaPanel({ actor, pattern, game, send, roleName }) {
  const prevPoisoned = game.players.find(
    (p) => (p.tokens || []).some((t) => t.roleId === "PUKKA" && t.tokenId === "POISONED")
  );
  const [deathOk, setDeathOk] = React.useState(!prevPoisoned);
  const [targetId, setTargetId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive);
  const confirm2 = () => {
    var _a;
    if (!targetId) return;
    const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      actionType: "PUKKA_POISON",
      targetIds: [targetId],
      nightInfo: `🕸️ Pukka
Envenenado esta noche: ${tname}.`
    });
    const role = ROLE_BY_ID["PUKKA"];
    send("ADD_TOKEN", { playerId: targetId, token: {
      tokenId: "POISONED",
      roleId: "PUKKA",
      roleName: "Pukka",
      img: role == null ? void 0 : role.img,
      label: "Pukka: envenenado",
      duration: "permanent"
    } });
    if (prevPoisoned) {
      const old = prevPoisoned.tokens.find((t) => t.roleId === "PUKKA" && t.tokenId === "POISONED");
      if (old) send("REMOVE_TOKEN", { playerId: prevPoisoned.id, uid: old.uid || old.key });
    }
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Veneno aplicado" : "Pukka — acción de esta noche" }),
    prevPoisoned && !deathOk && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(168,58,45,0.2)", borderRadius: 4, padding: "8px", marginBottom: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--blood-hi)", margin: "0 0 6px" }, children: [
        "💀 Muere ahora: ",
        /* @__PURE__ */ jsxRuntime.jsx("b", { children: prevPoisoned.name }),
        " (envenenado anoche)"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => setDeathOk(true),
          className: "btn-action primary",
          style: { fontSize: 11, padding: "4px 12px" },
          children: "✓ Confirmado — elegir nuevo objetivo"
        }
      )
    ] }),
    deathOk && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 6px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "Elige quién quedará envenenado esta noche (muere la noche siguiente)." }),
      /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
        setTargetId(e.target.value);
        setOk(false);
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Nuevo objetivo…" }),
        pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: confirm2,
          disabled: !targetId || ok,
          className: "btn-action primary",
          style: { ...btnPrimary, opacity: targetId && !ok ? 1 : 0.4 },
          children: "🕸️ Envenenar"
        }
      )
    ] })
  ] });
}
function InnkeeperPanel({ actor, game, send }) {
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");
  const [drunk, setDrunk] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const living = game.players.filter((p) => p.alive);
  const canConfirm = t1 && t2 && t1 !== t2 && (drunk === t1 || drunk === t2);
  const onT1 = (v) => {
    setT1(v);
    if (drunk && drunk !== v && drunk !== t2) setDrunk("");
    setOk(false);
  };
  const onT2 = (v) => {
    setT2(v);
    if (drunk && drunk !== t1 && drunk !== v) setDrunk("");
    setOk(false);
  };
  const confirm2 = () => {
    var _a, _b, _c;
    if (!canConfirm) return;
    const n1 = (_a = game.players.find((p) => p.id === t1)) == null ? void 0 : _a.name;
    const n2 = (_b = game.players.find((p) => p.id === t2)) == null ? void 0 : _b.name;
    const dn = (_c = game.players.find((p) => p.id === drunk)) == null ? void 0 : _c.name;
    const nightInfo = `🏨 Posadero
Protegidos: ${n1} y ${n2}. ${dn} queda borracho.`;
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, actionType: "INNKEEPER_PROTECT", targetIds: [t1, t2, drunk], nightInfo });
    setOk(true);
  };
  const drunkOptions = [t1, t2].filter(Boolean).map((id) => {
    var _a;
    return { id, name: (_a = game.players.find((p) => p.id === id)) == null ? void 0 : _a.name };
  });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Aplicado" : "Posadero — 2 protegidos + 1 borracho" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t1, onChange: (e) => onT1(e.target.value), children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 1 (protegido)…" }),
      living.filter((p) => p.id !== t2).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: t2, onChange: (e) => onT2(e.target.value), children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador 2 (protegido)…" }),
      living.filter((p) => p.id !== t1).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    t1 && t2 && /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: drunk, onChange: (e) => {
      setDrunk(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "¿Cuál queda borracho?…" }),
      drunkOptions.map((o) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: o.id, children: o.name }, o.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "Ambos A salvo esta noche. Tú eliges cuál queda borracho hasta el crepúsculo." }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !canConfirm || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: canConfirm && !ok ? 1 : 0.4 },
        children: "🏨 Aplicar"
      }
    )
  ] });
}
function PuzzlemasterPanel({ actor, pattern, game, send, roleName }) {
  var _a;
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const dec = (((_a = game.setup) == null ? void 0 : _a.decisions) || []).find((d) => d.kind === "puzzlemasterDrunk");
  const drunkPlayer = (dec == null ? void 0 : dec.chosen) ? game.players.find((p) => p.id === dec.chosen) : null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Revisado" : "Maestro de Acertijos — info de setup" }),
    drunkPlayer ? /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-50)", margin: "0 0 8px" }, children: [
      "Jugador borracho: ",
      /* @__PURE__ */ jsxRuntime.jsx("b", { children: drunkPlayer.name })
    ] }) : /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "0 0 8px" }, children: "⚠ No se configuró jugador borracho en el setup." }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "De día: si adivina correctamente quién es el borracho (y está sano), revelarle quién es el Demonio." }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: "🧩 Maestro de Acertijos: revisado." });
          setOk(true);
        },
        disabled: ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: ok ? 0.4 : 1 },
        children: "✓ Revisado"
      }
    )
  ] });
}
function AlchemistPanel({ actor, pattern, game, send, roleName }) {
  var _a;
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const dec = (((_a = game.setup) == null ? void 0 : _a.decisions) || []).find((d) => d.kind === "alchemistAbility");
  const minionRole = (dec == null ? void 0 : dec.chosen) ? ROLE_BY_ID[dec.chosen] : null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Revisado" : "Alquimista — habilidad de Esbirro" }),
    minionRole ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-50)", margin: "0 0 4px" }, children: [
        "Habilidad: ",
        /* @__PURE__ */ jsxRuntime.jsx("b", { children: minionRole.name })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-300)", margin: "0 0 8px", borderLeft: "2px solid rgba(255,255,255,0.15)", paddingLeft: 6 }, children: minionRole.ability })
    ] }) : /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "0 0 8px" }, children: "⚠ No se configuró habilidad de Esbirro en el setup." }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "El Alquimista actúa como este Esbirro esta noche. El narrador puede pedirle que elija diferente." }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, nightInfo: `⚗️ Alquimista: actúa como ${(minionRole == null ? void 0 : minionRole.name) || "?"}.` });
          setOk(true);
        },
        disabled: ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: ok ? 0.4 : 1 },
        children: "✓ Revisado"
      }
    )
  ] });
}
function ShugenjaPanel({ actor, game, send }) {
  const [dir, setDir] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      nightInfo: `🔮 Shugenja
El jugador malo más cercano está en dirección ${dir === "cw" ? "↻ Horario" : "↺ Anti-horario"}.`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Dirección confirmada" : "Shugenja — primera noche" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "¿El jugador malo más cercano está en sentido horario o anti-horario desde el Shugenja?" }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginBottom: 8 }, children: [["cw", "↻ Horario"], ["ccw", "↺ Anti-horario"]].map(([v, l]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          setDir(v);
          setOk(false);
        },
        className: "btn-action",
        style: {
          flex: 1,
          fontSize: 13,
          padding: "10px 0",
          background: dir === v ? "rgba(201,162,74,0.2)" : "transparent",
          border: `1px solid ${dir === v ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 4
        },
        children: l
      },
      v
    )) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !dir || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: dir && !ok ? 1 : 0.4 },
        children: "🔮 Confirmar dirección"
      }
    )
  ] });
}
function StewardPanel({ actor, game, send }) {
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const knownPlayer = game.players.find((p) => (p.tokens || []).some((t) => t.roleId === "STEWARD" && t.tokenId === "SABE")) || game.players.find((p) => {
    var _a, _b, _c;
    return p.id === ((_c = (_b = (((_a = game.setup) == null ? void 0 : _a.decisions) || []).find((d) => d.kind === "stewardNeighbors")) == null ? void 0 : _b.chosen) == null ? void 0 : _c.seat);
  });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Info confirmada" : "Administrador — primera noche" }),
    knownPlayer ? /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)", margin: "0 0 8px" }, children: [
      "Señalar a: ",
      /* @__PURE__ */ jsxRuntime.jsx("strong", { children: knownPlayer.name }),
      " (es bueno, sin revelar su personaje)."
    ] }) : /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--blood-hi)", margin: "0 0 8px" }, children: "⚠ Marca un jugador bueno con token SABE en el Grimorio antes de la noche." }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          send("NIGHT_NARRATOR_ACTION", {
            actorId: actor.id,
            nightInfo: `🤵 Administrador
Jugador bueno señalado: ${(knownPlayer == null ? void 0 : knownPlayer.name) || "(sin marcar)"}.`
          });
          setOk(true);
        },
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: ok ? 0.4 : 1 },
        disabled: ok,
        children: "✓ Confirmar"
      }
    )
  ] });
}
function CerenovusPanel({ actor, game, send }) {
  var _a, _b;
  const [targetId, setTargetId] = React.useState("");
  const [charId, setCharId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const goodRoles = (game.campaignRoles || []).filter((r) => r.alignment === "good");
  const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
  const rname = (_b = goodRoles.find((r) => r.id === charId)) == null ? void 0 : _b.name;
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      targetIds: [targetId],
      nightInfo: `🧠 Cerenovus
Mañana, ${tname} está loco de ser ${rname}. Si no actúa como tal, puede ser ejecutado.`
    });
    send("ADD_TOKEN", { playerId: targetId, token: {
      tokenId: "LOCO",
      roleId: "CERENOVUS",
      roleName: "Cerenovus",
      label: `Loco: cree ser ${rname}`,
      duration: "night"
    } });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Locura aplicada" : "Cerenovus — jugador + personaje" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 6px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "Despertar al elegido: ficha ESTE PERSONAJE TE HA ELEGIDO → ficha Cerenovus → ficha del personaje." }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador a afectar…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: charId, onChange: (e) => {
      setCharId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: 'Personaje del que está "loco"…' }),
      goodRoles.map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !targetId || !charId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && charId && !ok ? 1 : 0.4 },
        children: "🧠 Confirmar locura"
      }
    )
  ] });
}
function PitHagPanel({ actor, game, send }) {
  var _a;
  const [targetId, setTargetId] = React.useState("");
  const [charId, setCharId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive);
  const allRoles = game.campaignRoles || [];
  const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
  const chosen = allRoles.find((r) => r.id === charId);
  const isDemon = (chosen == null ? void 0 : chosen.type) === "demon";
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      targetIds: [targetId],
      nightInfo: `🪄 Pit-Hag
${tname} se convierte en ${chosen == null ? void 0 : chosen.name}.${isDemon ? "\n⚠ ¡Nuevo Demonio creado! Puede que alguien muera." : ""}`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Transformación registrada" : "Pit-Hag — jugador + nuevo personaje" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)", margin: "0 0 6px", fontStyle: "italic" }, children: "Solo actúa noches 2+. Nuevo personaje NO debe estar ya en juego (excepto Demonio)." }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador a transformar…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: charId, onChange: (e) => {
      setCharId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Nuevo personaje…" }),
      ["townfolk", "outsider", "minion", "demon"].map((t) => /* @__PURE__ */ jsxRuntime.jsx("optgroup", { label: t === "townfolk" ? "Aldeanos" : t === "outsider" ? "Forasteros" : t === "minion" ? "Esbirros" : "Demonios", children: allRoles.filter((r) => r.type === t).map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id)) }, t))
    ] }),
    isDemon && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "2px 0" }, children: "⚠ Crea un 2º Demonio. Puede causar muertes o cambiar alineación." }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !targetId || !charId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && charId && !ok ? 1 : 0.4 },
        children: "🪄 Confirmar transformación"
      }
    )
  ] });
}
function EngineerPanel({ actor, game, send }) {
  const [choice, setChoice] = React.useState("");
  const [selectedRoles, setSelectedRoles] = React.useState([]);
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const used = (actor.tokens || []).some((t) => t.tokenId === "SIN_HABILIDAD" && t.roleId === "ENGINEER");
  const allRoles = game.campaignRoles || [];
  const minions = allRoles.filter((r) => r.type === "minion");
  const demons = allRoles.filter((r) => r.type === "demon");
  const pool = choice === "minions" ? minions : choice === "demon" ? demons : [];
  const currentMinions = game.players.filter((p) => p.type === "minion").length;
  const confirm2 = () => {
    const names = selectedRoles.map((id) => {
      var _a;
      return (_a = allRoles.find((r) => r.id === id)) == null ? void 0 : _a.name;
    }).join(", ");
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      nightInfo: `⚙️ Ingeniero
Cambia ${choice === "minions" ? "los Esbirros" : "el Demonio"} por: ${names}.
Avisar a cada jugador afectado en privado de su nuevo personaje.`
    });
    send("ADD_TOKEN", { playerId: actor.id, token: {
      tokenId: "SIN_HABILIDAD",
      roleId: "ENGINEER",
      roleName: "Ingeniero",
      label: "Sin habilidad (usada)",
      duration: "permanent"
    } });
    setOk(true);
  };
  if (used) return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: "Ingeniero — habilidad ya usada" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-500)", fontStyle: "italic" }, children: "Ya usó su habilidad esta partida." })
  ] });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Cambio aplicado" : "Ingeniero — una sola vez" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 8px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: "O elige cambiar TODOS los Esbirros, O el Demonio. No ambos." }),
    [["minions", `🎭 Cambiar Esbirros (${currentMinions})`], ["demon", "👹 Cambiar el Demonio"]].map(([v, l]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          setChoice(v);
          setSelectedRoles([]);
          setOk(false);
        },
        className: "btn-action",
        style: {
          width: "100%",
          marginBottom: 4,
          fontSize: 11,
          padding: "8px",
          background: choice === v ? "rgba(201,162,74,0.2)" : "transparent",
          border: `1px solid ${choice === v ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 4
        },
        children: l
      },
      v
    )),
    choice && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 4 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-400)", margin: "0 0 4px" }, children: choice === "minions" ? `Elegir ${currentMinions} Esbirro(s) nuevo(s):` : "Elegir nuevo Demonio:" }),
      pool.map((r) => /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", marginBottom: 2 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: choice === "demon" ? "radio" : "checkbox",
            checked: choice === "demon" ? selectedRoles[0] === r.id : selectedRoles.includes(r.id),
            onChange: (e) => {
              if (choice === "demon") setSelectedRoles(e.target.checked ? [r.id] : []);
              else setSelectedRoles((prev) => e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id));
              setOk(false);
            }
          }
        ),
        r.name
      ] }, r.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !selectedRoles.length || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, marginTop: 6, opacity: selectedRoles.length && !ok ? 1 : 0.4 },
        children: "⚙️ Confirmar cambio"
      }
    )
  ] });
}
function AlHadikhiaPanel({ actor, game, send }) {
  const [t1, setT1] = React.useState("");
  const [t2, setT2] = React.useState("");
  const [t3, setT3] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive);
  const n = (id) => {
    var _a;
    return ((_a = game.players.find((p) => p.id === id)) == null ? void 0 : _a.name) || "?";
  };
  const can = t1 && t2 && t3 && (/* @__PURE__ */ new Set([t1, t2, t3])).size === 3;
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      targetIds: [t1, t2, t3],
      nightInfo: `🏛️ Al-Hadikhia
Elegidos: ${n(t1)}, ${n(t2)}, ${n(t3)}.
⚠ SILENCIO: preguntar uno por uno "¿quieres vivir?" (asiente/niega). Si todos eligen vivir → todos mueren.`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Fase de silencio iniciada" : "Al-Hadikhia — elegir 3 jugadores" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "0 0 8px", borderLeft: "2px solid var(--blood-dim)", paddingLeft: 6 }, children: "⚠ SILENCIO absoluto mientras se pregunta a cada jugador. Nadie habla, ni por señas." }),
    [["Jugador 1", t1, setT1, t2, t3], ["Jugador 2", t2, setT2, t1, t3], ["Jugador 3", t3, setT3, t1, t2]].map(([lbl, val, setter, ex1, ex2]) => /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: val, onChange: (e) => {
      setter(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("option", { value: "", children: [
        lbl,
        "…"
      ] }),
      pool.filter((p) => p.id !== ex1 && p.id !== ex2).map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }, lbl)),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !can || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: can && !ok ? 1 : 0.4 },
        children: "🏛️ Iniciar fase de silencio"
      }
    )
  ] });
}
function SummonerPanel({ actor, game, send }) {
  var _a, _b;
  const nightNum = game.nightNumber;
  const [targetId, setTargetId] = React.useState("");
  const [demonId, setDemonId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive);
  const demons = (game.campaignRoles || []).filter((r) => r.type === "demon");
  if (nightNum < 3) return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: labelStyle, children: [
      "Invocador — noche ",
      nightNum
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", margin: 0 }, children: nightNum === 1 ? "Noche 1: mostrar 3 bluffs al Invocador en el paso de Info de Malos." : "Noche 2: el Invocador no actúa." })
  ] });
  const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
  const dname = (_b = demons.find((r) => r.id === demonId)) == null ? void 0 : _b.name;
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      targetIds: [targetId],
      nightInfo: `🌟 Invocador
${tname} se convierte en ${dname} (malo). Despertar en privado: ficha TÚ ERES → ficha ${dname} → pulgar abajo.`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Demonio invocado" : "Invocador — NOCHE 3" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "0 0 8px", borderLeft: "2px solid var(--blood-dim)", paddingLeft: 6 }, children: "⚠ El jugador elegido se vuelve ese Demonio malo. Actúa ESTA misma noche." }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador que se convierte…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: demonId, onChange: (e) => {
      setDemonId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Tipo de Demonio…" }),
      demons.map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !targetId || !demonId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && demonId && !ok ? 1 : 0.4 },
        children: "🌟 Invocar Demonio"
      }
    )
  ] });
}
function LilMonstaPanel({ actor, game, send }) {
  var _a;
  const [chosen, setChosen] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const minions = game.players.filter((p) => p.type === "minion" && p.alive);
  const nm = (_a = game.players.find((p) => p.id === chosen)) == null ? void 0 : _a.name;
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      actionType: "LIL_MONSTA_ASSIGN",
      targetIds: [chosen],
      nightInfo: `👶 Lil' Monsta
${nm} es el canguro esta noche — "es el Demonio".`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Canguro asignado" : "Lil' Monsta — esbirros eligen canguro" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)", margin: "0 0 6px", fontStyle: "italic" }, children: "Los Esbirros deciden en silencio. Si no hay unanimidad, el Narrador decide." }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: chosen, onChange: (e) => {
      setChosen(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "¿Quién cuida al Bebé esta noche?" }),
      minions.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !chosen || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: chosen && !ok ? 1 : 0.4 },
        children: "👶 Confirmar canguro"
      }
    )
  ] });
}
function BaristaPanel({ actor, game, send }) {
  var _a;
  const [targetId, setTargetId] = React.useState("");
  const [effect, setEffect] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive);
  const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
  const confirm2 = () => {
    const label2 = effect === "sober" ? "Sobrio y sano" : "Actúa dos veces";
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      targetIds: [targetId],
      nightInfo: `☕ Barista
${tname}: ${label2} hasta el crepúsculo. Despertar y mostrar: 1 dedo (sobrio) o 2 dedos (dos veces).`
    });
    send("ADD_TOKEN", { playerId: targetId, token: {
      tokenId: effect === "sober" ? "SOBRIO_Y_SANO" : "ACTUA_DOS_VECES",
      roleId: "BARISTA",
      roleName: "Barista",
      label: label2,
      duration: "night"
    } });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Efecto del Barista aplicado" : "Barista — cada noche" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador afectado…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    [["sober", "1️⃣ Sobrio y sano (info verdadera)"], ["twice", "2️⃣ Actúa dos veces esta noche"]].map(([v, l]) => /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: () => {
          setEffect(v);
          setOk(false);
        },
        className: "btn-action",
        style: {
          width: "100%",
          marginBottom: 4,
          fontSize: 11,
          padding: "8px",
          background: effect === v ? "rgba(201,162,74,0.2)" : "transparent",
          border: `1px solid ${effect === v ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 4
        },
        children: l
      },
      v
    )),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !targetId || !effect || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && effect && !ok ? 1 : 0.4 },
        children: "☕ Confirmar"
      }
    )
  ] });
}
function HarlotPanel({ actor, game, send }) {
  var _a;
  const [targetId, setTargetId] = React.useState("");
  const [consent, setConsent] = React.useState(null);
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const pool = game.players.filter((p) => p.alive && p.id !== actor.id);
  const tname = (_a = game.players.find((p) => p.id === targetId)) == null ? void 0 : _a.name;
  const confirm2 = () => {
    const infoText = consent ? `🎀 Meretriz
${tname} elige mostrarse → la Meretriz aprende su personaje. El Narrador PUEDE matar a ambos.` : `🎀 Meretriz
${tname} rechaza → la Meretriz no aprende nada.`;
    send("NIGHT_NARRATOR_ACTION", { actorId: actor.id, targetIds: [targetId], nightInfo: infoText });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Resultado registrado" : "Meretriz — cada noche" }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: targetId, onChange: (e) => {
      setTargetId(e.target.value);
      setConsent(null);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Jugador elegido…" }),
      pool.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
    ] }),
    targetId && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)", margin: "4px 0", fontStyle: "italic" }, children: [
        "Despertar a ",
        tname,
        ": ficha ESTE PERSONAJE TE HA ELEGIDO → ficha Meretriz. ¿Asiente?"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 6, marginBottom: 6 }, children: [[true, "✅ Sí, se muestra"], [false, "❌ No, rechaza"]].map(([v, l]) => /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: () => {
            setConsent(v);
            setOk(false);
          },
          className: "btn-action",
          style: {
            flex: 1,
            fontSize: 11,
            padding: "6px 0",
            background: consent === v ? "rgba(201,162,74,0.2)" : "transparent",
            border: `1px solid ${consent === v ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 4
          },
          children: l
        },
        String(v)
      )) }),
      consent === true && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", margin: "0 0 6px" }, children: "⚠ El Narrador puede matar a ambos esta noche. Decidir AHORA antes de confirmar." })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !targetId || consent === null || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: targetId && consent !== null && !ok ? 1 : 0.4 },
        children: "🎀 Confirmar"
      }
    )
  ] });
}
function ApprenticePanel({ actor, game, send }) {
  const [chosenId, setChosenId] = React.useState("");
  const [ok, setOk] = React.useState(actor.nightInfo != null);
  const isGood = actor.alignment === "good";
  const pool = (game.campaignRoles || []).filter((r) => isGood ? r.type === "townfolk" : r.type === "minion");
  const chosen = pool.find((r) => r.id === chosenId);
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", {
      actorId: actor.id,
      nightInfo: `🎓 Aprendiz
Gana habilidad de: ${chosen == null ? void 0 : chosen.name}.
Mostrar: ficha TÚ ERES → ficha ${chosen == null ? void 0 : chosen.name}. Reemplazar su ficha; marcar ES_EL_APRENDIZ.`
    });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: panelStyle, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: labelStyle, children: ok ? "✓ Habilidad asignada" : "Aprendiz — primera noche" }),
    /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", margin: "0 0 6px", borderLeft: "2px solid var(--gold)", paddingLeft: 6 }, children: [
      "Aprendiz ",
      isGood ? "bueno → habilidad de Aldeano" : "malo → habilidad de Esbirro"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("select", { style: selStyle, value: chosenId, onChange: (e) => {
      setChosenId(e.target.value);
      setOk(false);
    }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Elige habilidad a otorgar…" }),
      pool.map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
    ] }),
    chosen && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-400)", margin: "2px 0", fontStyle: "italic" }, children: chosen.ability }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: !chosenId || ok,
        className: "btn-action primary",
        style: { ...btnPrimary, opacity: chosenId && !ok ? 1 : 0.4 },
        children: "🎓 Confirmar habilidad"
      }
    )
  ] });
}
function BluffsPanel({ game, send }) {
  const notInPlay = game.rolesNotInPlay || [];
  const allRoles = game.campaignRoles || [];
  const [selected, setSelected] = React.useState(game.narratorRolesForImp || []);
  const [ok, setOk] = React.useState((game.narratorRolesForImp || []).length >= 3);
  const candidates = allRoles.filter((r) => notInPlay.includes(r.id) && r.alignment === "good");
  const toggle = (rid) => {
    setSelected((prev) => prev.includes(rid) ? prev.filter((x) => x !== rid) : prev.length < 3 ? [...prev, rid] : prev);
    setOk(false);
  };
  const confirm2 = () => {
    send("NIGHT_NARRATOR_ACTION", { bluffs: selected });
    setOk(true);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 10, background: "rgba(168,58,45,0.08)", border: "1px solid var(--blood-dim)", borderRadius: 6, padding: "10px 12px" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--blood-hi)", margin: "0 0 6px" }, children: ok ? "✓ Bluffs fijados" : `Bluffs del Demonio (${selected.length}/3)` }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }, children: candidates.map((r) => {
      const on = selected.includes(r.id);
      const full = selected.length >= 3 && !on;
      return /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          disabled: full,
          className: "btn-night",
          style: { fontSize: 9, opacity: full ? 0.35 : 1, borderColor: on ? "var(--blood-hi)" : void 0, color: on ? "var(--blood-hi)" : void 0 },
          onClick: () => toggle(r.id),
          children: r.name
        },
        r.id
      );
    }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: confirm2,
        disabled: selected.length < 3,
        className: "btn-action",
        style: { width: "100%", fontSize: 11, padding: "5px 0", opacity: selected.length >= 3 ? 1 : 0.4 },
        children: "✓ Confirmar bluffs"
      }
    )
  ] });
}
function PlayerChip({ name, avatar, size = "sm", color }) {
  const avatarSize = size === "lg" ? 26 : 20;
  const fontSize = size === "lg" ? 15 : 13;
  return /* @__PURE__ */ jsxRuntime.jsxs("span", { style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "rgba(201,162,74,0.12)",
    border: "1px solid rgba(201,162,74,0.25)",
    borderRadius: 4,
    padding: "1px 7px 1px 3px",
    verticalAlign: "middle"
  }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("span", { style: {
      width: avatarSize,
      height: avatarSize,
      borderRadius: "50%",
      background: "var(--ink-700)",
      border: "1px solid rgba(255,255,255,0.1)",
      overflow: "hidden",
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--serif)",
      fontSize: avatarSize * 0.5,
      color: "var(--bone-200)"
    }, children: avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: avatar, style: { width: "100%", height: "100%", objectFit: "cover" } }) : ((name == null ? void 0 : name[0]) || "?").toUpperCase() }),
    /* @__PURE__ */ jsxRuntime.jsx("span", { style: {
      fontFamily: "var(--serif)",
      fontSize,
      fontWeight: 600,
      color: color || "var(--bone-50)"
    }, children: name })
  ] });
}
function ActionModal({ target, onClose, isNarrator }) {
  var _a;
  const { state, send } = useGame();
  const { game, playerId } = state;
  const [accusedRole, setAccusedRole] = React.useState("");
  const [confirmKill, setConfirmKill] = React.useState(false);
  const [confirmSave, setConfirmSave] = React.useState(false);
  const [confirmNarratorKill, setConfirmNarratorKill] = React.useState(false);
  const [fakeShooterId, setFakeShooterId] = React.useState("");
  if (!game) return null;
  const { phase, nominations, activeNomination } = game;
  const me = game.players.find((p) => p.id === playerId);
  const activeNom = nominations.find((n) => n.id === activeNomination);
  const isNomineeInActiveVote = (activeNom == null ? void 0 : activeNom.nomineeId) === target.id;
  const deadCanStillVote = !(me == null ? void 0 : me.alive) && ((me == null ? void 0 : me.deadVoteNominationId) === null || (me == null ? void 0 : me.deadVoteNominationId) === activeNomination);
  const votingOpen = activeNom && (!activeNom.stage || activeNom.stage === "voting");
  const myTurn = Array.isArray(activeNom == null ? void 0 : activeNom.voteOrder) ? activeNom.voteOrder[activeNom.voteTurnIndex || 0] === playerId : true;
  const canVote = phase === "voting" && votingOpen && isNomineeInActiveVote && myTurn && ((me == null ? void 0 : me.alive) || deadCanStillVote);
  const myVoteOnThis = (activeNom == null ? void 0 : activeNom.myVote) === "for" ? "favor" : (activeNom == null ? void 0 : activeNom.myVote) === "against" ? "contra" : null;
  const canNominate = false;
  nominations.some((n) => n.nominatorId === playerId);
  const role = target.role ? ROLE_BY_ID[target.role] : null;
  (me == null ? void 0 : me.role) ? ROLE_BY_ID[me.role] : null;
  const slayerInGame = isNarrator ? game.players.find((p) => (p.role === "SLAYER" || p.drunkAs === "SLAYER") && p.alive && !p.slayerUsed) : null;
  const canNarratorSlayer = !!slayerInGame && target.alive && target.id !== slayerInGame.id && ["day", "nominations"].includes(phase);
  const isSelfEvil = target.id === playerId && (me == null ? void 0 : me.alignment) === "evil";
  const fakeShooters = isNarrator ? game.players.filter((p) => p.alignment === "evil" && p.alive && !p.impShotUsed && p.id !== target.id) : [];
  const canNarratorFakeShot = fakeShooters.length > 0 && target.alive && ["day", "nominations"].includes(phase);
  const handleVoteKill = () => {
    setConfirmKill(false);
    onClose();
  };
  const handleVoteSaveConfirm = () => {
    setConfirmSave(false);
    onClose();
  };
  const handleGhostDecline = () => {
    onClose();
  };
  const handleSuspect = () => {
    if (accusedRole) {
      send("ACCUSE", { targetId: target.id, accusedRole });
      onClose();
    }
  };
  const handleNarratorSlayer = () => {
    send("SLAYER_ACTION", { slayerId: slayerInGame.id, targetId: target.id });
    onClose();
  };
  const handleBluff = (roleId) => send("SET_BLUFF_ROLE", { roleId });
  const handleFakeShot = () => {
    if (!fakeShooterId) return;
    send("IMP_DAY_SHOT", { shooterId: fakeShooterId, targetId: target.id });
    onClose();
  };
  (() => {
    const w = [];
    if (target.protected) w.push("🛡 Protegido esta noche (Monje / Posadero / Marinero)");
    if (target.role === "SOLDIER" && !target.poisoned) w.push("⚔ Soldado: inmune a ataques del Demonio");
    if (target.role === "FOOL" && target.foolUsed === false && !target.poisoned) w.push("🃏 Tonto: primera muerte anulada (se consumirá)");
    return w;
  })();
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "modal-overlay", onClick: onClose, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "modal-card", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "modal-close", onClick: onClose, children: "✕" }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(PlayerChip, { name: target.name, avatar: target.avatar, size: "lg", color: target.alive ? "var(--bone-50)" : "var(--blood-hi)" }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginLeft: 4 }, children: /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: target.alive ? "var(--good)" : "var(--blood-hi)", margin: 0 }, children: [
          target.alive ? "● Vivo" : "☠ Muerto",
          isNarrator && role && ` · ${role.name}`
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
        isNarrator && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { borderBottom: "var(--hairline-bone)", paddingBottom: 12 }, children: /* @__PURE__ */ jsxRuntime.jsx(NarratorTabs, { target, game, send, onClose }) }),
        isSelfEvil && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { borderBottom: "var(--hairline-bone)", paddingBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--blood-hi)", marginBottom: 8 }, children: "Rol que finges ser" }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflowY: "auto" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => handleBluff(null), className: "btn-night", style: { fontSize: 9 }, children: "Ninguno" }),
            scriptRoles(game).filter((r) => r.alignment === "good").map((r) => /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                onClick: () => handleBluff(r.id),
                className: "btn-night",
                style: { fontSize: 9, borderColor: me.bluffRole === r.id ? "var(--blood-hi)" : void 0, color: me.bluffRole === r.id ? "var(--blood-hi)" : void 0 },
                children: r.name
              },
              r.id
            ))
          ] }),
          me.bluffRole && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--blood-hi)", fontStyle: "italic", marginTop: 6 }, children: [
            "Fingiendo ser: ",
            (_a = ALL_ROLES.find((r) => r.id === me.bluffRole)) == null ? void 0 : _a.name
          ] })
        ] }),
        !isNarrator && !isSelfEvil && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--bone-400)", marginBottom: 6 }, children: "Marcar sospecha (solo tú la verás)" }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(
              "select",
              {
                value: accusedRole,
                onChange: (e) => setAccusedRole(e.target.value),
                style: { flex: 1, background: "var(--ink-700)", border: "var(--hairline)", borderRadius: 2, padding: "6px 8px", fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)" },
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Creo que es... —" }),
                  scriptRoles(game).map((r) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: r.id, children: r.name }, r.id))
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: handleSuspect, disabled: !accusedRole, className: "btn-action", style: { opacity: accusedRole ? 1 : 0.4 }, children: "Sospecha" })
          ] }),
          (() => {
            var _a2;
            const mine = (target.accusations || [])[0];
            return mine ? /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", fontStyle: "italic", marginTop: 6 }, children: [
              "Tu sospecha: su personaje es ",
              (_a2 = ROLE_BY_ID[mine.roleId]) == null ? void 0 : _a2.name
            ] }) : null;
          })()
        ] }),
        !isNarrator && !isSelfEvil && canNominate,
        !isNarrator && !isSelfEvil && canNominate,
        !isNarrator && canVote && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 17, color: "var(--gold-hot)", textAlign: "center", marginBottom: 8 }, children: [
            "¿Ejecutar a ",
            activeNom == null ? void 0 : activeNom.nomineeName,
            "?"
          ] }),
          myVoteOnThis && /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 14, color: "var(--bone-400)", textAlign: "center", marginBottom: 8, fontStyle: "italic" }, children: [
            "Ya votaste: ",
            myVoteOnThis === "favor" ? "Matar" : "Salvar"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setConfirmKill(true), className: "btn-action danger", style: { flex: 1 }, children: "Matar" }),
            (me == null ? void 0 : me.alive) ? /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setConfirmSave(true), className: "btn-action", style: { flex: 1 }, children: "Salvar" }) : /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: handleGhostDecline, className: "btn-action", style: { flex: 1 }, children: "Abstenerme" })
          ] }),
          !(me == null ? void 0 : me.alive) && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--gold)", textAlign: "center", marginTop: 6, fontStyle: "italic" }, children: "Voto de muerto — solo una nominación en toda la partida" })
        ] }),
        isNarrator && canNarratorSlayer && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { borderBottom: "var(--hairline-bone)", paddingBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("button", { onClick: handleNarratorSlayer, className: "btn-action primary", style: { width: "100%" }, children: [
            "🏹 Disparo del Exterminador (",
            slayerInGame.name,
            ") → ",
            target.name
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-400)", fontStyle: "italic", marginTop: 4, textAlign: "center" }, children: [
            "Ejecuta el tiro único del Exterminador en nombre de ",
            slayerInGame.name,
            " — gasta su habilidad"
          ] })
        ] }),
        isNarrator && canNarratorFakeShot && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { borderBottom: "var(--hairline-bone)", paddingBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(
              "select",
              {
                value: fakeShooterId,
                onChange: (e) => setFakeShooterId(e.target.value),
                style: { flex: 1, background: "var(--ink-700)", border: "var(--hairline)", borderRadius: 2, padding: "6px 8px", fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)" },
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "— Malvado que finge... —" }),
                  fakeShooters.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, children: p.name }, p.id))
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsxs("button", { onClick: handleFakeShot, disabled: !fakeShooterId, className: "btn-action", style: { opacity: fakeShooterId ? 1 : 0.4 }, children: [
              "🏹 Disparo fingido → ",
              target.name
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-400)", fontStyle: "italic", marginTop: 4, textAlign: "center" }, children: "Anuncia el disparo fallido de un malvado que finge ser el Exterminador — una vez por jugador" })
        ] })
      ] })
    ] }),
    confirmKill && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "modal-overlay", style: { zIndex: 1100 }, onClick: () => setConfirmKill(false), children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "modal-card", onClick: (e) => e.stopPropagation(), style: { maxWidth: 340, textAlign: "center" }, children: [
      target.avatar && /* @__PURE__ */ jsxRuntime.jsx("img", { src: target.avatar, style: { width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--blood-hi)", boxShadow: "0 0 24px rgba(168,58,45,0.6)", marginBottom: 16 } }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 20, color: "var(--bone-50)", textAlign: "center", marginBottom: 8 }, children: [
        "¿Ejecutar a ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { color: "var(--blood-hi)" }, children: activeNom == null ? void 0 : activeNom.nomineeName }),
        "?"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-400)", textAlign: "center", marginBottom: 16, fontStyle: "italic" }, children: "Este voto no se puede cambiar." }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: handleVoteKill, className: "btn-action danger", style: { flex: 1 }, children: "Sí, matar" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setConfirmKill(false), className: "btn-action", style: { flex: 1 }, children: "Cancelar" })
      ] })
    ] }) }),
    confirmSave && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "modal-overlay", style: { zIndex: 1100 }, onClick: () => setConfirmSave(false), children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "modal-card", onClick: (e) => e.stopPropagation(), style: { maxWidth: 340, textAlign: "center" }, children: [
      target.avatar && /* @__PURE__ */ jsxRuntime.jsx("img", { src: target.avatar, style: { width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--good)", boxShadow: "0 0 24px rgba(109,140,184,0.5)", marginBottom: 16 } }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--serif)", fontSize: 20, color: "var(--bone-50)", textAlign: "center", marginBottom: 8 }, children: [
        "¿Salvar a ",
        /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { color: "var(--good)" }, children: activeNom == null ? void 0 : activeNom.nomineeName }),
        "?"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-400)", textAlign: "center", marginBottom: 16, fontStyle: "italic" }, children: "Este voto no se puede cambiar." }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: handleVoteSaveConfirm, className: "btn-action", style: { flex: 1 }, children: "Sí, salvar" }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setConfirmSave(false), className: "btn-action danger", style: { flex: 1 }, children: "Cancelar" })
      ] })
    ] }) })
  ] });
}
function getCirclePositions(count, radius) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * 2 * Math.PI / count - Math.PI / 2;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}
const CORNER_CHANNELS = {
  TABERNA: { top: "8px", left: "8px", label: "Taberna" },
  MERCADO: { top: "8px", right: "8px", label: "Mercado" },
  BOSQUE: { bottom: "8px", left: "8px", label: "Bosque" },
  CEMENTERIO: { bottom: "8px", right: "8px", label: "Cementerio" }
};
function CornerGroup({ channel, players, cornerCfg, isNarrator, seesGrimoire, playerId, onClick }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: {
    position: "absolute",
    ...Object.fromEntries(Object.entries(cornerCfg).filter(([k]) => k !== "label")),
    display: "flex",
    flexDirection: "column",
    alignItems: "right" in cornerCfg ? "flex-end" : "flex-start",
    gap: 4,
    zIndex: 10
  }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", opacity: 0.7 }, children: cornerCfg.label }),
    players.map((player) => {
      const isMe = player.id === playerId;
      const isDead = !player.alive;
      const cRole = (isNarrator || isMe || seesGrimoire) && player.role ? ROLE_BY_ID[player.role] : null;
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          onClick: () => isNarrator && onClick(player),
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            cursor: isNarrator ? "pointer" : "default",
            opacity: isDead ? 0.5 : 1
          },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
              width: 36,
              height: 36,
              borderRadius: "50%",
              overflow: "hidden",
              border: isMe ? "2px solid var(--good)" : isDead ? "1px solid var(--blood-dim)" : "1px solid var(--gold)",
              background: "var(--ink-700)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "var(--bone-100)",
              fontFamily: "var(--serif)"
            }, children: player.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: player.avatar, alt: player.name, style: { width: "100%", height: "100%", objectFit: "cover" } }) : player.name[0].toUpperCase() }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 9, color: "var(--bone-300)", maxWidth: 50, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: player.name }),
            cRole && /* @__PURE__ */ jsxRuntime.jsx("span", { style: {
              fontFamily: "var(--serif)",
              fontSize: 8,
              maxWidth: 56,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: cRole.alignment === "evil" ? "var(--blood-hi)" : "var(--good)"
            }, children: cRole.name })
          ]
        },
        player.id
      );
    })
  ] });
}
function Celestials({ isNight }) {
  const starsRef = React.useRef(
    Array.from({ length: 30 }, () => ({
      w: Math.random() * 2 + 1,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${(Math.random() * 3).toFixed(1)}s`,
      dur: `${(2 + Math.random() * 2).toFixed(1)}s`
    }))
  );
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "stars", children: starsRef.current.map((s, i) => /* @__PURE__ */ jsxRuntime.jsx("div", { className: "star", style: { width: s.w, height: s.w, top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.dur } }, i)) }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "celestial sun", style: { opacity: isNight ? 0 : 0.7 } }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "celestial moon", style: { opacity: isNight ? 0.7 : 0 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "crater c1" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "crater c2" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "crater c3" })
    ] })
  ] });
}
function Seat({ player, isMe, isNarrator, seesGrimoire, canAct, nominated, activeActor, voteTurn, seatSize, posX, posY, onClick }) {
  const role = player.role ? ROLE_BY_ID[player.role] : null;
  const isDead = !player.alive;
  const canSeeRoles = isNarrator || isMe || seesGrimoire;
  const sz = seatSize;
  isNarrator ? (player.tokens || []).length + (player.isMaster ? 1 : 0) + (player.isSmokeScreen ? 1 : 0) : 0;
  const suspicionCount = (player.accusations || []).length;
  const classes = [
    "seat",
    isMe ? "my-player" : "",
    nominated ? "nominated" : "",
    isDead ? "dead" : ""
  ].filter(Boolean).join(" ");
  const ring = activeActor ? "0 0 0 3px var(--gold-hot), 0 0 22px rgba(201,162,74,0.7)" : voteTurn ? "0 0 0 3px var(--good), 0 0 22px rgba(109,140,184,0.7)" : void 0;
  const isClickable = isNarrator || canAct && !isMe && player.alive || isMe && player.alignment === "evil" || isDead && !player.deadVoteNominationId;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "div",
    {
      className: classes,
      "data-gamepad": isClickable ? "" : void 0,
      style: { "--sz": `${sz}px`, left: `calc(50% + ${posX}px)`, top: `calc(50% + ${posY}px)`, ...ring ? { borderRadius: "50%", boxShadow: ring } : {} },
      onClick: () => isClickable && onClick(player),
      children: [
        player.handRaised && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "hand-raised", children: "✋" }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "medallion", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "medallion-inner", children: /* @__PURE__ */ jsxRuntime.jsx(
            "div",
            {
              className: "medallion-avatar",
              style: {
                background: isDead ? "var(--ink-800)" : player.alignment === "evil" && isNarrator ? "rgba(168,58,45,0.25)" : isMe ? "rgba(109,140,184,0.2)" : "var(--ink-700)"
              },
              children: player.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: player.avatar, alt: player.name, style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" } }) : player.name[0].toUpperCase()
            }
          ) }),
          isDead && /* @__PURE__ */ jsxRuntime.jsx(
            "img",
            {
              src: "/assets/ficha-muerto.png",
              alt: "",
              className: "death-shroud",
              onError: (e) => {
                e.target.style.display = "none";
              }
            }
          ),
          suspicionCount > 0 && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "seat-counters", children: /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "seat-counter suspicions", title: `${suspicionCount} sospecha(s) — clic para ver`, children: [
            "👁 ",
            suspicionCount
          ] }) }),
          isDead && !player.deadVoteNominationId && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "dead-vote-token", children: /* @__PURE__ */ jsxRuntime.jsx(
            "img",
            {
              src: "/assets/token-ultimo-voto.png",
              alt: "Voto disponible",
              onError: (e) => {
                e.target.style.display = "none";
              }
            }
          ) })
        ] }),
        isNarrator && (player.tokens || []).length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "seat-token-row", children: [
          (player.tokens || []).slice(0, 4).map((t) => {
            var _a;
            const tImg = t.img || ((_a = ROLE_BY_ID[t.roleId]) == null ? void 0 : _a.img);
            const typeClass = `type-${(t.type || "").toLowerCase()}`;
            const full = `${t.label}${t.ordinalOf > 1 ? ` ${t.ordinal}/${t.ordinalOf}` : ""}`;
            return /* @__PURE__ */ jsxRuntime.jsxs("span", { className: `seat-token-chip ${typeClass}`, title: full, children: [
              tImg && /* @__PURE__ */ jsxRuntime.jsx("img", { src: tImg, alt: "", onError: (e) => {
                e.target.remove();
              } }),
              /* @__PURE__ */ jsxRuntime.jsx("b", { children: t.short || t.label }),
              t.ordinalOf > 1 && /* @__PURE__ */ jsxRuntime.jsx("i", { children: t.ordinal })
            ] }, t.uid || t.key || t.instanceId);
          }),
          (player.tokens || []).length > 4 && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "seat-token-overflow", children: [
            "+",
            (player.tokens || []).length - 4
          ] })
        ] }),
        isNarrator && player.presence && player.presence !== "online" && /* @__PURE__ */ jsxRuntime.jsx(
          "span",
          {
            title: player.presence === "away" ? "Ausente (no responde)" : "Desconectado",
            style: {
              position: "absolute",
              top: 2,
              left: 2,
              fontSize: 11,
              lineHeight: 1,
              color: player.presence === "away" ? "var(--gold)" : "var(--bone-500)",
              textShadow: "0 0 4px #000",
              pointerEvents: "none"
            },
            children: player.presence === "away" ? "⏱" : "○"
          }
        ),
        role && canSeeRoles && /* @__PURE__ */ jsxRuntime.jsx("div", { className: `role-token-mini ${role.alignment}`, children: /* @__PURE__ */ jsxRuntime.jsx(RoleIcon, { role, size: null, style: { width: "100%", height: "100%" } }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "seat-nameplate", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "seat-name", children: player.name }),
          canSeeRoles && role && /* @__PURE__ */ jsxRuntime.jsx(
            "div",
            {
              className: "seat-role-label",
              style: { color: role.alignment === "evil" ? "var(--blood-hi)" : "var(--good)" },
              children: role.name
            }
          ),
          isNarrator && (() => {
            const id = formatIdentity(player);
            if (!id.hasFalse) return null;
            return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "identity-false", title: id.tooltip, children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mask", children: MASK }),
              " se cree ",
              id.believedName
            ] });
          })()
        ] })
      ]
    }
  );
}
function GameTable({ isNarrator = false, activeActorId = null }) {
  const { state } = useGame();
  const { game, playerId } = state;
  const [actionTarget, setActionTarget] = React.useState(null);
  const containerRef = React.useRef(null);
  const [containerDims, setContainerDims] = React.useState({ w: 480, h: 480 });
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  if (!game) return null;
  const { players, phase, nominations } = game;
  const canAct = isNarrator || ["day", "nominations", "voting"].includes(phase);
  const isNight = ["first_night", "night"].includes(phase);
  const seesGrimoire = !isNarrator && !!game.viewerSeesGrimoire;
  const cx = containerDims.w / 2;
  const cy = containerDims.h / 2;
  const circlePlayers = players.filter((p) => !CORNER_CHANNELS[p.discordChannel]);
  const n = circlePlayers.length || 1;
  const half = Math.min(containerDims.w, containerDims.h, 760) / 2;
  const plateH = 28;
  const arcK = 1.06 / (2 * Math.PI);
  const fit = (half - plateH) / (n * arcK + 0.5);
  const seatSize = Math.floor(Math.max(26, Math.min(80, fit)));
  const radius = Math.max(
    seatSize * n * arcK,
    // no se tocan entre sí
    Math.min(half - seatSize / 2 - plateH, half * 0.78)
    // no se salen del marco
  );
  const containerSize = radius * 2;
  const positions = getCirclePositions(n, radius);
  const phaseLabel = {
    lobby: "En espera",
    role_reveal: "Reparto",
    first_night: "Primera Noche",
    day: "Día",
    nominations: "Nominaciones",
    voting: "Votación",
    night: "Noche",
    game_over: "Fin de partida"
  }[phase] || phase;
  const nomineeIds = new Set(nominations.filter((n2) => !n2.resolved).map((n2) => n2.nomineeId));
  const activeNom = nominations.find((n2) => n2.id === game.activeNomination && !n2.resolved);
  const voteTurnId = activeNom && Array.isArray(activeNom.voteOrder) ? activeNom.voteOrder[activeNom.voteTurnIndex] || null : null;
  const cornerGroups = {};
  players.forEach((p) => {
    if (CORNER_CHANNELS[p.discordChannel]) {
      const ch = p.discordChannel;
      if (!cornerGroups[ch]) cornerGroups[ch] = [];
      cornerGroups[ch].push(p);
    }
  });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { ref: containerRef, className: "table-container", children: [
    /* @__PURE__ */ jsxRuntime.jsx(Celestials, { isNight }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "table-disc", style: { "--disc-size": `${Math.max(80, radius * 2 - seatSize - 12)}px` }, children: phase === "voting" && game.activeNomination ? (() => {
      var _a;
      const nom = nominations.find((n2) => n2.id === game.activeNomination);
      const nominee = nom ? players.find((p) => p.id === nom.nomineeId) || (nom.nomineeId === "NARRATOR" ? { name: nom.nomineeName || "🎙 Narrador", avatar: null } : null) : null;
      if (!nominee) return null;
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "table-center", style: { flexDirection: "column", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontSize: 11, fontFamily: "var(--mono)", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--blood-hi)", opacity: 0.8 }, children: "⚖️ Votación" }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
          width: Math.max(56, containerSize * 0.1),
          height: Math.max(56, containerSize * 0.1),
          borderRadius: "50%",
          border: "3px solid var(--blood-hi)",
          boxShadow: "0 0 18px rgba(168,58,45,0.6)",
          overflow: "hidden",
          background: "var(--ink-700)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--serif)",
          fontSize: 22,
          color: "var(--bone-100)"
        }, children: nominee.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: nominee.avatar, style: { width: "100%", height: "100%", objectFit: "cover" } }) : nominee.name[0] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--blood-hi)", fontWeight: 600 }, children: nominee.name }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--bone-400)" }, children: [
          ((_a = nom.votes) == null ? void 0 : _a.length) || 0,
          "/",
          Math.ceil(players.filter((p) => p.alive).length / 2)
        ] })
      ] });
    })() : /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "table-center", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "table-center-phase", children: isNight ? "Noche" : "Día" }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "table-center-day", style: { color: isNight ? "var(--moon)" : "var(--gold-hot)" }, children: phaseLabel }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "table-center-sub", children: [
        players.filter((p) => p.alive).length,
        "/",
        players.length,
        " vivos"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx("svg", { className: "nomination-svg", style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }, children: nominations.filter((nom) => !nom.resolved).map((nom) => {
      const fi = circlePlayers.findIndex((p) => p.id === nom.nominatorId);
      const ti = circlePlayers.findIndex((p) => p.id === nom.nomineeId);
      if (fi === -1 || ti === -1) return null;
      const fp = positions[fi];
      const tp = positions[ti];
      return /* @__PURE__ */ jsxRuntime.jsx(
        "line",
        {
          x1: cx + fp.x,
          y1: cy + fp.y,
          x2: cx + tp.x,
          y2: cy + tp.y,
          stroke: "var(--blood-hi)",
          strokeWidth: "1.5",
          strokeOpacity: "0.5",
          strokeDasharray: "5 3"
        },
        nom.id
      );
    }) }),
    circlePlayers.map((player, i) => /* @__PURE__ */ jsxRuntime.jsx(
      Seat,
      {
        player,
        isMe: player.id === playerId,
        isNarrator,
        seesGrimoire,
        canAct,
        nominated: nomineeIds.has(player.id),
        activeActor: isNarrator && player.id === activeActorId,
        voteTurn: player.id === voteTurnId,
        seatSize,
        posX: positions[i].x,
        posY: positions[i].y,
        onClick: setActionTarget
      },
      player.id
    )),
    Object.entries(cornerGroups).map(([channel, grpPlayers]) => /* @__PURE__ */ jsxRuntime.jsx(
      CornerGroup,
      {
        channel,
        players: grpPlayers,
        cornerCfg: CORNER_CHANNELS[channel],
        isNarrator,
        seesGrimoire,
        playerId,
        onClick: setActionTarget
      },
      channel
    )),
    actionTarget && /* @__PURE__ */ jsxRuntime.jsx(ActionModal, { target: actionTarget, onClose: () => setActionTarget(null), isNarrator })
  ] });
}
function SheetLink({ game, compact = false }) {
  if (!game) return null;
  return /* @__PURE__ */ jsxRuntime.jsx(
    "a",
    {
      href: `/hoja-campana?game=${encodeURIComponent(game.id)}`,
      target: "_blank",
      rel: "noopener noreferrer",
      title: `Todos los personajes de ${game.campaignName || "este guion"}, con su habilidad`,
      style: {
        textDecoration: "none",
        background: "none",
        border: "var(--hairline-bone)",
        borderRadius: 2,
        padding: compact ? "3px 8px" : "4px 10px",
        fontFamily: "var(--mono)",
        fontSize: compact ? 10 : 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--gold)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center"
      },
      children: "📜 Hoja de campaña"
    }
  );
}
function MiniAvatar({ player, size = 20 }) {
  var _a;
  return /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
    width: size,
    height: size,
    borderRadius: "50%",
    background: "var(--ink-700)",
    border: "var(--hairline)",
    overflow: "hidden",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--serif)",
    fontSize: Math.round(size * 0.5),
    color: "var(--bone-100)"
  }, children: (player == null ? void 0 : player.avatar) ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: player.avatar, style: { width: "100%", height: "100%", objectFit: "cover" } }) : (((_a = player == null ? void 0 : player.name) == null ? void 0 : _a[0]) || "?").toUpperCase() });
}
const MENU_TABS = [
  { id: "partida", label: "⚙ Partida" },
  { id: "discord", label: "💬 Discord" },
  { id: "ranking", label: "🏆 Rankings" },
  { id: "atajos", label: "⌨ Atajos" }
];
function PuzzlemasterDayPanel({ pm, alreadyUsed, send }) {
  const [moved, setMoved] = React.useState(false);
  const [guessed, setGuessed] = React.useState(null);
  const applyNoAbility = () => {
    send("ADD_TOKEN", { playerId: pm.id, token: { type: "NO_ABILITY", roleId: "PUZZLEMASTER", label: "Sin habilidad", expiry: [] } });
  };
  const onCorrect = () => {
    setGuessed("correct");
    applyNoAbility();
    send("NIGHT_NARRATOR_ACTION", { actorId: pm.id, actionType: "PUZZLEMASTER_REVEAL", targetIds: [] });
  };
  const onWrong = () => {
    setGuessed("wrong");
    applyNoAbility();
  };
  const s = { marginTop: 8, background: "rgba(201,162,74,0.06)", border: "1px solid rgba(201,162,74,0.25)", borderRadius: 6, padding: "10px 12px" };
  const lbl = { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", margin: "0 0 6px" };
  if (alreadyUsed) return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: s, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: lbl, children: "🧩 Maestro de Acertijos" }),
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-400)", margin: 0, fontStyle: "italic" }, children: "Habilidad ya usada." })
  ] });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: s, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { style: lbl, children: "🧩 Maestro de Acertijos — Acción de día" }),
    !moved ? /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        className: "btn-action primary",
        style: { width: "100%", fontSize: 13, padding: "7px 0" },
        onClick: () => {
          send("MOVE_NARRATOR_TO_ROOM", { playerId: pm.id });
          setMoved(true);
        },
        children: "🚪 Llevar a habitación"
      }
    ) : guessed ? /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: guessed === "correct" ? "#4ade80" : "var(--bone-400)", margin: 0 }, children: guessed === "correct" ? "✓ Adivinó correcto — resultado revelado." : "✗ Adivinó incorrecto — habilidad consumida." }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-action primary", style: { flex: 1, fontSize: 12, padding: "6px 0" }, onClick: onCorrect, children: "✓ Adivinó correcto" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-action danger", style: { flex: 1, fontSize: 12, padding: "6px 0" }, onClick: onWrong, children: "✗ Adivinó incorrecto" })
    ] })
  ] });
}
function NarratorPanel() {
  const { state, send } = useGame();
  const { game, discordMembers, rankings, campaigns: serverCampaigns, importResult } = state;
  const [activeNightActorId, setActiveNightActorId] = React.useState(null);
  const [newPlayerName, setNewPlayerName] = React.useState("");
  const [discordMap, setDiscordMap] = React.useState({});
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [menuTab, setMenuTab] = React.useState(null);
  const [nightStep, setNightStep] = React.useState({ current: 0, total: 0 });
  const [rosterTarget, setRosterTarget] = React.useState(null);
  const [uiScale, setUiScale] = React.useState(() => parseFloat(localStorage.getItem("boct_uiscale") || "1"));
  const changeScale = (d) => {
    const v = Math.max(0.8, Math.min(1.5, +(uiScale + d).toFixed(2)));
    setUiScale(v);
    localStorage.setItem("boct_uiscale", String(v));
  };
  const guideRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const onProgress = React.useCallback((info) => setNightStep(info), []);
  React.useEffect(() => {
    if ((game == null ? void 0 : game.phase) === "lobby") ;
  }, [(game == null ? void 0 : game.phase) === "lobby"]);
  React.useEffect(() => {
  }, [menuTab]);
  React.useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(uiScale));
    return () => document.documentElement.style.removeProperty("--ui-scale");
  }, [uiScale]);
  const act = mainAction(game);
  const runMain = React.useCallback(() => {
    var _a;
    if (!act || act.disabled) return;
    if (act.openWizard) {
      setWizardOpen(true);
      return;
    }
    (_a = act.run) == null ? void 0 : _a.call(act, send);
  }, [act, send]);
  useNarratorHotkeys({
    enabled: !wizardOpen && !menuTab && !rosterTarget,
    onMain: runMain,
    onNext: () => {
      var _a;
      return (_a = guideRef.current) == null ? void 0 : _a.next();
    },
    onPrev: () => {
      var _a;
      return (_a = guideRef.current) == null ? void 0 : _a.prev();
    },
    onGoTo: (n) => {
      var _a;
      return (_a = guideRef.current) == null ? void 0 : _a.goTo(n);
    },
    onSearch: () => {
      var _a;
      return (_a = searchRef.current) == null ? void 0 : _a.focus();
    },
    onEscape: () => {
      setMenuTab(null);
      setRosterTarget(null);
    }
  });
  if (!game) return /* @__PURE__ */ jsxRuntime.jsx("div", { style: { padding: 32, fontFamily: "var(--serif)", color: "var(--bone-400)" }, children: "Cargando..." });
  const { players, phase, nominations, activeNomination, nightDeaths } = game;
  const isNight = ["first_night", "night"].includes(phase);
  const ph = phaseInfo(game);
  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const discord = discordMap[newPlayerName] || {};
    send("ADD_PLAYER", { name: newPlayerName.trim(), discordId: discord.id, discordTag: discord.tag });
    setNewPlayerName("");
  };
  const alive = players.filter((p) => p.alive).length;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `app-shell ${isNight ? "is-night" : "is-day"}`, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "topbar", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-topbar-phase", children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontSize: 20 }, children: ph.icon }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-phase-name", children: ph.label }),
        isNight && nightStep.total > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-phase-step", children: [
          "paso ",
          nightStep.current + 1,
          "/",
          nightStep.total
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "topbar-center", children: act ? /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-main-slot", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: runMain,
              disabled: act.disabled,
              className: `nx-btn-main${act.tone === "danger" ? " danger" : ""}`,
              title: "Atajo: barra espaciadora",
              children: act.label
            }
          ),
          act.secondary && /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => act.secondary.run(send), className: "nx-btn sm", children: act.secondary.label })
        ] }),
        act.note && /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-main-note", children: act.note })
      ] }) : /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-main-note", children: "Resuelve la votación abierta para seguir." }) }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "topbar-right", children: [
        /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-count", children: [
          alive,
          "♥ ",
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "dead", children: [
            players.length - alive,
            "☠"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 2 }, title: "Tamaño de la interfaz", children: [
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => changeScale(-0.1), className: "nx-icon-btn", children: "A−" }),
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => changeScale(0.1), className: "nx-icon-btn", style: { fontSize: 17 }, children: "A+" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(SheetLink, { game, compact: true }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setMenuTab("partida"), className: "nx-btn sm", title: "Ajustes, Discord, rankings y atajos", children: "⋯" })
      ] })
    ] }),
    menuTab && /* @__PURE__ */ jsxRuntime.jsx(
      SettingsMenu,
      {
        tab: menuTab,
        setTab: setMenuTab,
        onClose: () => setMenuTab(null),
        game,
        send,
        rankings,
        discordMembers,
        players
      }
    ),
    rosterTarget && players.some((p) => p.id === rosterTarget) && /* @__PURE__ */ jsxRuntime.jsx(
      ActionModal,
      {
        target: players.find((p) => p.id === rosterTarget),
        isNarrator: true,
        onClose: () => setRosterTarget(null)
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("aside", { className: "left-panel", children: [
      hasBlock(game, "setup") && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { className: "panel-label", children: "Campaña" }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: (serverCampaigns && serverCampaigns.length ? serverCampaigns : SELECTABLE_CAMPAIGNS).map((c) => {
            const active = game.campaignId === c.id;
            const locked = phase !== "lobby";
            return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              /* @__PURE__ */ jsxRuntime.jsxs(
                "button",
                {
                  disabled: locked && !active,
                  onClick: () => {
                    if (!locked) send("SET_CAMPAIGN", { campaignId: c.id });
                  },
                  className: "btn-night",
                  style: {
                    flex: 1,
                    textAlign: "left",
                    padding: "8px 10px",
                    borderColor: active ? "var(--gold)" : void 0,
                    color: active ? "var(--gold-hot)" : void 0,
                    opacity: locked && !active ? 0.35 : 1,
                    cursor: locked ? "default" : "pointer"
                  },
                  children: [
                    active ? "◆ " : "",
                    c.name,
                    c.isCustom ? " ✦" : ""
                  ]
                }
              ),
              c.isCustom && !locked && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: () => {
                    if (confirm(`¿Eliminar campaña "${c.name}"?`)) send("DELETE_CAMPAIGN", { campaignId: c.id });
                  },
                  className: "btn-night",
                  style: { fontSize: 10, color: "var(--blood-hi)" },
                  title: "Eliminar",
                  children: "✕"
                }
              )
            ] }, c.id);
          }) }),
          phase !== "lobby" && /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 10, color: "var(--bone-500)", fontStyle: "italic", marginTop: 4 }, children: "Resetea la partida para cambiar de campaña." }),
          phase === "lobby" && /* @__PURE__ */ jsxRuntime.jsx(ImportCampaignBox, { send, importResult })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(DiscordMemberPicker, { discordMembers, players, send }),
        /* @__PURE__ */ jsxRuntime.jsx(NarratorsPicker, { game, discordMembers, send }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "panel-label", children: [
            "Jugadores ",
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "count", children: players.length })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "input",
              {
                value: newPlayerName,
                onChange: (e) => setNewPlayerName(e.target.value),
                onKeyDown: (e) => e.key === "Enter" && addPlayer(),
                placeholder: "Nombre del jugador",
                style: { flex: 1, background: "var(--ink-700)", border: "var(--hairline)", borderRadius: 2, padding: "6px 10px", fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)" }
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: addPlayer, className: "btn-action primary", style: { padding: "6px 12px" }, children: "+" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }, children: players.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", border: "var(--hairline-bone)", borderRadius: 3, padding: "6px 8px" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { width: 26, height: 26, borderRadius: "50%", background: "var(--ink-700)", border: "var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-100)", overflow: "hidden", flexShrink: 0 }, children: p.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: p.avatar, style: { width: "100%", height: "100%", objectFit: "cover" } }) : p.name[0] }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: p.name }),
            /* @__PURE__ */ jsxRuntime.jsxs("select", { value: p.discordId || "", onChange: (e) => {
              const m = discordMembers.find((m2) => m2.id === e.target.value);
              send("UPDATE_PLAYER", { playerId: p.id, discordId: m == null ? void 0 : m.id, discordTag: m == null ? void 0 : m.tag, avatar: m == null ? void 0 : m.avatar });
            }, style: { fontSize: 9, background: "var(--ink-600)", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-300)", padding: "2px 4px", maxWidth: 80 }, children: [
              /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Discord" }),
              discordMembers.map((m) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: m.id, children: m.displayName }, m.id))
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                onClick: () => send("KICK_PLAYER_SESSION", { playerId: p.id }),
                title: "Expulsar su sesión (libera el asiento para que pueda volver a unirse)",
                style: { color: "var(--moon)", fontSize: 11, background: "none", border: "none", cursor: "pointer", flexShrink: 0 },
                children: "🔌"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("REMOVE_PLAYER", { playerId: p.id }), style: { color: "var(--blood-hi)", fontSize: 11, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }, children: "✕" })
          ] }, p.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => setWizardOpen(true),
            className: "nx-btn primary",
            disabled: players.length < 1,
            style: { fontSize: 17, padding: "13px 0" },
            children: "🎬 Montar partida (asistente)"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-hint", children: [
          "El modo automático, los límites de canal y el resto de ajustes están en el menú ",
          /* @__PURE__ */ jsxRuntime.jsx("strong", { children: "⋯" }),
          " de arriba a la derecha."
        ] })
      ] }),
      hasBlock(game, "reveal") && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title", children: "🎭 Enseñar personaje" }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginBottom: 8 }, children: "Pulsa a cada jugador para mostrarle su personaje en su pantalla." }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }, children: players.map((p) => {
            const role = p.role ? ALL_ROLES.find((r) => r.id === p.role) : null;
            return /* @__PURE__ */ jsxRuntime.jsxs(
              "button",
              {
                onClick: () => send("REVEAL_ROLE", { playerId: p.id }),
                className: "nx-btn",
                style: { padding: "8px 6px", textAlign: "center" },
                children: [
                  /* @__PURE__ */ jsxRuntime.jsx("span", { style: { display: "block", fontSize: 15 }, children: p.name }),
                  /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", style: { fontSize: 11 }, children: (role == null ? void 0 : role.name) || "?" })
                ]
              },
              p.id
            );
          }) })
        ] })
      ] }),
      wizardOpen && phase === "lobby" && /* @__PURE__ */ jsxRuntime.jsx(SetupWizard, { game, send, onClose: () => setWizardOpen(false) }),
      !hasBlock(game, "setup") && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        game.autoMode && (game.autoPhaseInfo ? /* @__PURE__ */ jsxRuntime.jsx(AutoModeTimer, { autoPhaseInfo: game.autoPhaseInfo, send }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "8px 12px", background: "rgba(141,90,180,0.08)", borderRadius: 4, border: "1px solid rgba(141,90,180,0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-400)", fontStyle: "italic" }, children: "🤖 Esperando acciones nocturnas..." }),
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("STOP_AUTO_MODE", {}), className: "btn-night", style: { fontSize: 8 }, children: "Detener" })
        ] })),
        hasBlock(game, "guide") && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            NightWalkthrough,
            {
              onActiveActor: setActiveNightActorId,
              onProgress,
              controlsRef: guideRef
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(NightSettings, {})
        ] }),
        (hasBlock(game, "day") || hasBlock(game, "nominations")) && (() => {
          const pm = players.find((p) => p.role === "PUZZLEMASTER" && p.alive);
          if (!pm) return null;
          const alreadyUsed = (pm.tokens || []).some((t) => t.type === "NO_ABILITY");
          return /* @__PURE__ */ jsxRuntime.jsx(PuzzlemasterDayPanel, { pm, alreadyUsed, send }, pm.id);
        })(),
        (phase === "day" || phase === "nominations") && /* @__PURE__ */ jsxRuntime.jsx(ManualNominateCard, { game, send }),
        activeNomination && /* @__PURE__ */ jsxRuntime.jsx(ActiveNominationCard, { game, send }),
        nominations.length > 0 && !isNight && /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsx("p", { className: "panel-label", children: "Nominaciones de hoy" }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: nominations.map((n) => {
            const nominator = players.find((p) => p.id === n.nominatorId);
            const nominee = players.find((p) => p.id === n.nomineeId);
            const forCount = Array.isArray(n.votes) ? n.votes.length : 0;
            const agtCount = Array.isArray(n.against) ? n.against.length : 0;
            return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: {
              padding: "6px 10px",
              borderRadius: 3,
              background: n.executed ? "rgba(168,58,45,0.12)" : n.resolved ? "rgba(0,0,0,0.2)" : "rgba(201,162,74,0.08)",
              border: n.executed ? "1px solid var(--blood-dim)" : "var(--hairline-bone)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(MiniAvatar, { player: nominator, size: 22 }),
              /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: "var(--bone-500)" }, children: "→" }),
              /* @__PURE__ */ jsxRuntime.jsx(MiniAvatar, { player: nominee, size: 22 }),
              /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 12, color: n.executed ? "var(--blood-hi)" : "var(--bone-200)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: n.nomineeName }),
              /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--blood-hi)", background: "rgba(168,58,45,0.12)", borderRadius: 2, padding: "1px 5px" }, children: [
                "⚔",
                forCount
              ] }),
              /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--good)", background: "rgba(109,140,184,0.12)", borderRadius: 2, padding: "1px 5px" }, children: [
                "🛡",
                agtCount
              ] }),
              n.resolved && /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: n.executed ? "var(--blood-hi)" : "var(--bone-500)", flexShrink: 0 }, children: n.executed ? "☠" : "✕" })
            ] }, n.id);
          }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(RosterList, { players, send, searchRef, onOpen: setRosterTarget })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("main", { className: "stage", children: /* @__PURE__ */ jsxRuntime.jsx(GameTable, { isNarrator: true, activeActorId: activeNightActorId }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("aside", { className: "right-panel", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AlertsInline, { game, send }),
      /* @__PURE__ */ jsxRuntime.jsx(DayCounters, { game, send }),
      /* @__PURE__ */ jsxRuntime.jsx(BarberPanel, {}),
      /* @__PURE__ */ jsxRuntime.jsx(RoshamboBox, {}),
      /* @__PURE__ */ jsxRuntime.jsx(RoleHints, { game }),
      nightDeaths.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card danger", children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title evil", children: "☠ Muertes de esta noche" }) }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-body", style: { display: "flex", flexDirection: "column", gap: 6 }, children: nightDeaths.map((id) => {
          const p = players.find((pl) => pl.id === id);
          const role = (p == null ? void 0 : p.role) ? ROLE_BY_ID[p.role] : null;
          return p ? /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-avatar", children: p.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: p.avatar }) : p.name[0] }),
            /* @__PURE__ */ jsxRuntime.jsx(RoleIcon, { role, size: 20, radius: 4 }),
            /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-sub", children: [
              p.name,
              role ? ` · ${role.name}` : ""
            ] })
          ] }, id) : null;
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(SuspicionMap, { players }),
      /* @__PURE__ */ jsxRuntime.jsx(StatusLog, { log: game.statusLog })
    ] })
  ] });
}
function RosterList({ players, send, searchRef, onOpen }) {
  const [q, setQ] = React.useState("");
  const term = q.trim().toLowerCase();
  const shown = term ? players.filter((p) => p.name.toLowerCase().includes(term)) : players;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title", children: [
        "👥 Jugadores ",
        players.filter((p) => p.alive).length,
        "/",
        players.length
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "input",
        {
          ref: searchRef,
          className: "nx-input",
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "Buscar (B)",
          style: { width: 120, fontSize: 13, padding: "4px 8px" }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-body", style: { padding: 8 }, children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-list tall", children: [
      shown.map((p) => {
        const role = ALL_ROLES.find((r) => r.id === p.role);
        const ident = formatIdentity(p);
        return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `nx-row${p.alive ? "" : " dead"}`, onClick: () => onOpen(p.id), children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-seat-num", children: players.indexOf(p) + 1 }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-avatar", children: role ? /* @__PURE__ */ jsxRuntime.jsx(RoleIcon, { role, size: null, style: { width: "100%", height: "100%" } }) : p.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: p.avatar }) : p.name[0] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-row-name", children: p.name }),
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: `nx-row-role${(role == null ? void 0 : role.alignment) === "evil" ? " evil" : ""}`, children: (role == null ? void 0 : role.name) || "—" })
            ] }),
            ident.hasFalse && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "identity-false", style: { fontSize: 12 }, title: ident.tooltip, children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "mask", children: MASK }),
              " se cree ",
              ident.believedName
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(StatusChips, { player: p, compact: true })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              className: `nx-icon-btn ${p.alive ? "danger" : "good"}`,
              title: p.alive ? "Matar" : "Revivir",
              onClick: (e) => {
                e.stopPropagation();
                send(p.alive ? "KILL_PLAYER" : "REVIVE_PLAYER", { playerId: p.id });
              },
              children: p.alive ? "☠" : "♻"
            }
          )
        ] }, p.id);
      }),
      shown.length === 0 && /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { padding: 8 }, children: "Nadie con ese nombre." })
    ] }) })
  ] });
}
function StatusLog({ log }) {
  const [open, setOpen] = React.useState(false);
  const entries = Array.isArray(log) ? log.slice(-30).reverse() : [];
  if (entries.length === 0) return null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head clickable", onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title", children: [
        "📜 Registro (",
        entries.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", children: open ? "▲" : "▼" })
    ] }),
    open && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-body", style: { padding: 8 }, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-list short", children: entries.map((e, i) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8, padding: "3px 4px" }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-mono nx-muted", style: { flexShrink: 0 }, children: [
        "N",
        e.night
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-sub", style: { fontSize: 14 }, children: e.message })
    ] }, i)) }) })
  ] });
}
function SettingsMenu({ tab, setTab, onClose, game, send, rankings, discordMembers, players }) {
  const [confirmWin, setConfirmWin] = React.useState(null);
  const [confirmReset, setConfirmReset] = React.useState(false);
  return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-menu-card", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-menu-head", children: [
      MENU_TABS.map((t) => /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setTab(t.id), className: `nx-btn sm${tab === t.id ? " on" : ""}`, children: t.label }, t.id)),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: onClose, className: "nx-btn sm", children: "✕ Cerrar" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-menu-body", children: [
      tab === "partida" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(AutoModeBox, { game, send, players }),
        /* @__PURE__ */ jsxRuntime.jsx(ChannelLimitsControl, { game, send }),
        /* @__PURE__ */ jsxRuntime.jsx(ChannelControl, { players, send }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card danger", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title evil", children: "Terminar la partida a mano" }) }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-body", children: confirmWin ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-sub", style: { marginBottom: 8 }, children: [
              "¿Declarar la victoria del ",
              /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { color: confirmWin === "good" ? "var(--good)" : "var(--blood-hi)" }, children: confirmWin === "good" ? "Bien" : "Mal" }),
              "?"
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-btn-row", children: [
              /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn danger", onClick: () => {
                send("DECLARE_WINNER", { winner: confirmWin });
                setConfirmWin(null);
                onClose();
              }, children: "Sí, terminar" }),
              /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn", onClick: () => setConfirmWin(null), children: "Cancelar" })
            ] })
          ] }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-btn-row", children: [
            /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn good", onClick: () => setConfirmWin("good"), children: "✨ Gana el Bien" }),
            /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn danger", onClick: () => setConfirmWin("evil"), children: "⚔ Gana el Mal" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title", children: "Empezar de cero" }) }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
            /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginBottom: 8 }, children: "Borra la partida actual y vuelve al montaje. No se puede deshacer." }),
            confirmReset ? /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-btn-row", children: [
              /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn danger", onClick: () => {
                send("RESET_GAME", {});
                setConfirmReset(false);
                onClose();
              }, children: "Sí, resetear" }),
              /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn", onClick: () => setConfirmReset(false), children: "Cancelar" })
            ] }) : /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn", onClick: () => setConfirmReset(true), children: "Resetear partida" })
          ] })
        ] })
      ] }),
      tab === "discord" && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(NarratorsPicker, { game, discordMembers, send }),
        /* @__PURE__ */ jsxRuntime.jsx(DiscordMemberPicker, { discordMembers, players, send })
      ] }),
      tab === "ranking" && /* @__PURE__ */ jsxRuntime.jsx(RankingsManager, { rankings, send }),
      tab === "atajos" && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title", children: "⌨ Atajos de teclado" }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
          HOTKEYS.map((h) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-kbd", style: { minWidth: 84, textAlign: "center" }, children: h.keys }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-sub", children: h.what })
          ] }, h.keys)),
          /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", children: "Se desactivan solos mientras escribes en un campo de texto." })
        ] })
      ] })
    ] })
  ] }) });
}
function AutoModeBox({ game, send, players }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-head-title", children: "🤖 Partida sin narrador" }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", gap: 10, marginBottom: 10 }, children: [
        { label: "Día", key: "dayMs", val: game.autoDayMs ?? 3e5 },
        { label: "Nominaciones", key: "nomMs", val: game.autoNomMs ?? 42e4 }
      ].map(({ label: label2, key, val }) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { flex: 1, background: "rgba(0,0,0,0.25)", borderRadius: 6, padding: "8px 10px" }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-hint", style: { marginBottom: 4 }, children: [
          label2,
          " (minutos)"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              className: "nx-btn sm",
              disabled: val <= 6e4,
              onClick: () => send("SET_AUTO_TIMINGS", { [key]: val - 6e4 }),
              children: "−"
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", style: { fontSize: 18, color: "var(--gold-hot)", flex: 1, textAlign: "center" }, children: Math.round(val / 6e4) }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              className: "nx-btn sm",
              disabled: val >= 18e5,
              onClick: () => send("SET_AUTO_TIMINGS", { [key]: val + 6e4 }),
              children: "+"
            }
          )
        ] })
      ] }, key)) }),
      game.autoMode ? /* @__PURE__ */ jsxRuntime.jsx("button", { className: "nx-btn danger", onClick: () => send("STOP_AUTO_MODE", {}), children: "Detener el modo automático" }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginBottom: 8 }, children: "Reparte los personajes al azar y lleva los tiempos solo. Solo para jugar sin narrador." }),
        /* @__PURE__ */ jsxRuntime.jsxs(
          "button",
          {
            className: "nx-btn",
            disabled: players.length < 5,
            onClick: () => send("AUTO_MODE", {}),
            children: [
              "Iniciar modo automático",
              players.length < 5 ? " (hacen falta 5 jugadores)" : ""
            ]
          }
        )
      ] })
    ] })
  ] });
}
function ActiveNominationCard({ game, send }) {
  const nom = game.nominations.find((n) => n.id === game.activeNomination);
  if (!nom) return null;
  const nominatorPlayer = game.players.find((p) => p.id === nom.nominatorId);
  const nomineePlayer = game.players.find((p) => p.id === nom.nomineeId);
  const living = game.players.filter((p) => p.alive).length;
  const required = Math.ceil(living / 2);
  const forVoters = Array.isArray(nom.votes) ? nom.votes : [];
  const agstVoters = Array.isArray(nom.against) ? nom.against : [];
  const votes = forVoters.length;
  const pct = Math.min(100, votes / required * 100);
  const allVoted = nom.allVoted;
  const pendingVoters = nom.pendingVoters;
  const pendingCount = Array.isArray(pendingVoters) ? pendingVoters.length : 0;
  const order = Array.isArray(nom.voteOrder) ? nom.voteOrder : [];
  const turnIdx = nom.voteTurnIndex || 0;
  const turnId = order[turnIdx] || null;
  const turnPlayer = turnId ? game.players.find((p) => p.id === turnId) : null;
  const votedSet = /* @__PURE__ */ new Set([...forVoters.map((v) => typeof v === "object" ? v.id : v), ...agstVoters.map((v) => typeof v === "object" ? v.id : v)]);
  const inArguments = nom.stage === "arguments";
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(201,162,74,0.06)", border: "var(--hairline)", borderRadius: 4, padding: "12px 14px" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { className: "panel-label", style: { color: "var(--gold-hot)" }, children: inArguments ? "Argumentos" : "Votación (sentido horario)" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(MiniAvatar, { player: nominatorPlayer, size: 24 }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-200)" }, children: nom.nominatorName }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--bone-500)" }, children: "acusa a" }),
      /* @__PURE__ */ jsxRuntime.jsx(MiniAvatar, { player: nomineePlayer, size: 24 }),
      /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-50)" }, children: nom.nomineeName })
    ] }),
    inArguments ? /* @__PURE__ */ jsxRuntime.jsx(ArgumentsControls, { nom, send, nominatorPlayer, nomineePlayer }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
      turnPlayer ? /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { background: "rgba(109,140,184,0.1)", border: "1px solid rgba(109,140,184,0.35)", borderRadius: 4, padding: "8px 10px", marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--good)" }, children: [
            "Turno ",
            turnIdx + 1,
            "/",
            order.length
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(MiniAvatar, { player: turnPlayer, size: 22 }),
          /* @__PURE__ */ jsxRuntime.jsx("strong", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-50)", flex: 1 }, children: turnPlayer.name }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: () => send("ADVANCE_VOTE_TURN", { nominationId: nom.id }),
              className: "btn-night",
              style: { fontSize: 10, padding: "4px 8px" },
              title: "Saltar turno (no vota)",
              children: "Saltar →"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, marginTop: 6 }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              onClick: () => send("VOTE_AS", { playerId: turnPlayer.id, nominationId: nom.id, inFavor: true }),
              className: "btn-action danger",
              style: { flex: 1, fontSize: 11, padding: "5px 0" },
              title: `Votar A FAVOR por ${turnPlayer.name}`,
              children: [
                "⚔ A favor (por ",
                turnPlayer.name.slice(0, 10),
                ")"
              ]
            }
          ),
          turnPlayer.alive && /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: () => send("VOTE_AS", { playerId: turnPlayer.id, nominationId: nom.id, inFavor: false }),
              className: "btn-action",
              style: { flex: 1, fontSize: 11, padding: "5px 0", borderColor: "var(--good)", color: "var(--good)" },
              title: `Votar EN CONTRA por ${turnPlayer.name}`,
              children: "🛡 En contra"
            }
          )
        ] })
      ] }) : /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--good)", fontStyle: "italic", marginBottom: 8 }, children: "✓ Todos han pasado por su turno" }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--serif)", fontSize: 22, fontWeight: 600, color: "var(--gold-hot)" }, children: [
          votes,
          "/",
          required
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "vote-bar-track", style: { flex: 1, margin: 0 }, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "vote-bar-fill", style: { width: `${pct}%` } }) })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }, children: order.map((pid, i) => {
        const pl = game.players.find((p) => p.id === pid);
        if (!pl) return null;
        const votedFor = forVoters.some((v) => (typeof v === "object" ? v.id : v) === pid);
        const votedAgainst = agstVoters.some((v) => (typeof v === "object" ? v.id : v) === pid);
        const isTurn = i === turnIdx;
        const bg = votedFor ? "rgba(168,58,45,0.25)" : votedAgainst ? "rgba(109,140,184,0.25)" : "rgba(0,0,0,0.2)";
        return /* @__PURE__ */ jsxRuntime.jsxs(
          "span",
          {
            title: pl.name,
            style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-200)", background: bg, border: isTurn ? "1px solid var(--good)" : "var(--hairline-bone)", borderRadius: 2, padding: "2px 5px" },
            children: [
              i + 1,
              ".",
              pl.name.slice(0, 6),
              votedFor ? " ⚔" : votedAgainst ? " 🛡" : votedSet.has(pid) ? "" : " ·"
            ]
          },
          pid
        );
      }) }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("RESOLVE_VOTE", { nominationId: nom.id }), className: "btn-action danger", style: { width: "100%" }, children: allVoted ? "Cerrar votación" : `Cerrar (${pendingCount} sin votar)` })
    ] })
  ] });
}
function ArgumentsControls({ nom, send, nominatorPlayer, nomineePlayer }) {
  const [secs, setSecs] = React.useState(60);
  const timer = nom.argueTimer;
  const [remaining, setRemaining] = React.useState(0);
  React.useEffect(() => {
    if (!timer) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1e3)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer == null ? void 0 : timer.endsAt, timer == null ? void 0 : timer.playerId]);
  const speaker = nom.argSpeaker === "nominee" ? nomineePlayer : nom.argSpeaker === "nominator" ? nominatorPlayer : null;
  const urgent = remaining <= 10;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    speaker && timer && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { textAlign: "center", background: "rgba(201,162,74,0.08)", border: "1px solid rgba(201,162,74,0.3)", borderRadius: 6, padding: "8px", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold)", margin: "0 0 2px" }, children: [
        "🗣 Habla ",
        speaker.name
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { fontFamily: "var(--mono)", fontSize: 26, fontWeight: 700, color: urgent ? "var(--blood-hi)" : "var(--gold-hot)", margin: 0 }, children: [
        remaining,
        "s"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-400)" }, children: "Tiempo" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setSecs((s) => Math.max(15, s - 15)), className: "btn-night", style: { fontSize: 11, padding: "2px 8px" }, children: "−" }),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: "var(--gold-hot)", minWidth: 38, textAlign: "center" }, children: [
        secs,
        "s"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setSecs((s) => Math.min(300, s + 15)), className: "btn-night", style: { fontSize: 11, padding: "2px 8px" }, children: "+" })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => send("SET_ARG_SPEAKER", { nominationId: nom.id, who: "nominator", seconds: secs }),
          className: "btn-action",
          style: { width: "100%", borderColor: nom.argSpeaker === "nominator" ? "var(--gold)" : void 0 },
          children: [
            "🗣 Argumentos de ",
            (nominatorPlayer == null ? void 0 : nominatorPlayer.name) || "nominador"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsxs(
        "button",
        {
          onClick: () => send("SET_ARG_SPEAKER", { nominationId: nom.id, who: "nominee", seconds: secs }),
          className: "btn-action",
          style: { width: "100%", borderColor: nom.argSpeaker === "nominee" ? "var(--gold)" : void 0 },
          children: [
            "🗣 Argumentos de ",
            (nomineePlayer == null ? void 0 : nomineePlayer.name) || "nominado"
          ]
        }
      ),
      timer && /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("STOP_ARGUE_TIMER", { nominationId: nom.id }), className: "btn-night", style: { fontSize: 10 }, children: "■ Parar tiempo" }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("OPEN_VOTING", { nominationId: nom.id }), className: "btn-action primary", style: { width: "100%", marginTop: 4 }, children: "🗳️ Abrir votación" })
    ] })
  ] });
}
function ManualNominateCard({ game, send }) {
  const alive = game.players.filter((p) => p.alive);
  const alreadyNominated = new Set(game.nominations.map((n) => n.nominatorId));
  const [nominatorId, setNominatorId] = React.useState("");
  const [nomineeId, setNomineeId] = React.useState("");
  const busy = !!game.activeNomination;
  const submit = () => {
    if (!nominatorId || !nomineeId || nominatorId === nomineeId) return;
    send("NOMINATE_AS", { nominatorId, nomineeId });
    setNominatorId("");
    setNomineeId("");
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 4, border: "var(--hairline-bone)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { className: "panel-label", style: { margin: "0 0 8px" }, children: "Nueva nominación" }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(
        "select",
        {
          value: nominatorId,
          onChange: (e) => setNominatorId(e.target.value),
          style: { flex: 1, fontSize: 11, background: "var(--ink-600)", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-200)", padding: "5px 6px" },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Nomina…" }),
            alive.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("option", { value: p.id, disabled: alreadyNominated.has(p.id), children: [
              p.name,
              alreadyNominated.has(p.id) ? " (ya nominó)" : ""
            ] }, p.id))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--bone-500)" }, children: "→" }),
      /* @__PURE__ */ jsxRuntime.jsxs(
        "select",
        {
          value: nomineeId,
          onChange: (e) => setNomineeId(e.target.value),
          style: { flex: 1, fontSize: 11, background: "var(--ink-600)", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-200)", padding: "5px 6px" },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Nominado…" }),
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "NARRATOR", children: "🎙 Narrador" }),
            alive.map((p) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: p.id, disabled: p.id === nominatorId, children: p.name }, p.id))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        onClick: submit,
        disabled: busy || !nominatorId || !nomineeId || nominatorId === nomineeId,
        className: "btn-action primary",
        style: { width: "100%", marginTop: 8, opacity: busy || !nominatorId || !nomineeId || nominatorId === nomineeId ? 0.4 : 1 },
        children: busy ? "Resuelve la votación activa primero" : "⚖ Nominar"
      }
    )
  ] });
}
function AlertsInline({ game, send }) {
  const advice = (game.advice || []).filter((a) => a.severity === "warn" || a.severity === "danger");
  const deferred = game.deferredEffects || [];
  if (advice.length === 0 && deferred.length === 0) {
    return /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { padding: "4px 2px" }, children: "✓ Nada pendiente ahora mismo." });
  }
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card danger", children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title evil", children: [
      "⚠ Pendiente (",
      advice.length + deferred.length,
      ")"
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      deferred.map((d) => /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-alert danger", children: [
        /* @__PURE__ */ jsxRuntime.jsx("p", { children: d.label }),
        /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("RESOLVE_DEFERRED", { id: d.id }), className: "nx-btn sm", children: "✓ Hecho" })
      ] }, d.id)),
      advice.map((a, i) => /* @__PURE__ */ jsxRuntime.jsx("div", { className: `nx-alert${a.severity === "danger" ? " danger" : ""}`, children: /* @__PURE__ */ jsxRuntime.jsx("p", { children: a.text }) }, "a" + i))
    ] })
  ] });
}
function DayCounters({ game, send }) {
  var _a;
  const owners = (game.players || []).filter((p) => p.alive && p.role === "YAGGABABBLE");
  if (!owners.length) return null;
  const cfg = (_a = ABILITY_PANELS.YAGGABABBLE) == null ? void 0 : _a.counter;
  if (!cfg) return null;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-head", children: /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title", children: [
      "🗣 Yaggababble — ",
      owners.map((p) => p.name).join(", ")
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
      /* @__PURE__ */ jsxRuntime.jsx(NarratorCounter, { cfg, game, send, compact: true }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { margin: 0 }, children: "Súbelo cada vez que diga su frase secreta en público. Esta noche elegirá esa cantidad de víctimas." })
    ] })
  ] });
}
function RoleHints({ game }) {
  const hints = game.roleHints || [];
  const urgent = hints.filter((h) => h.severity === "warn" || h.severity === "danger");
  const [open, setOpen] = React.useState(urgent.length > 0);
  if (hints.length === 0) return null;
  const color = (s) => s === "danger" ? "var(--blood-hi)" : s === "warn" ? "var(--gold-hot)" : "var(--moon)";
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head clickable", onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: `nx-head-title${urgent.length ? "" : " good"}`, children: [
        "🎙 Decides tú (",
        hints.length,
        urgent.length ? ` · ${urgent.length} urgente${urgent.length > 1 ? "s" : ""}` : "",
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", children: open ? "▲" : "▼" })
    ] }),
    open && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-body", children: [
      /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-list", style: { maxHeight: "38vh", gap: 10 }, children: hints.map((h, i) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { borderLeft: `3px solid ${color(h.severity)}`, paddingLeft: 9 }, children: [
        /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-sub", style: { fontWeight: 600 }, children: [
          h.playerName,
          " ",
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "nx-muted", style: { fontWeight: 400 }, children: [
            "· ",
            h.roleName
          ] }),
          !h.alive && /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: "var(--blood-hi)" }, children: " ☠" }),
          h.impaired && /* @__PURE__ */ jsxRuntime.jsx("span", { style: { color: "var(--moon)" }, children: " 🧪 no funciona" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-sub", style: { color: "var(--bone-300)" }, children: h.text }),
        h.needs && /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-mono", style: { marginTop: 3 }, children: [
          "▸ ",
          h.needs
        ] })
      ] }, i)) }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: "nx-hint", style: { marginTop: 8 }, children: "Pulsa a ese jugador (en la mesa o en la lista) para abrir sus controles." })
    ] })
  ] });
}
function SuspicionMap({ players }) {
  const [open, setOpen] = React.useState(false);
  const withSusp = players.filter((p) => (p.accusations || []).length > 0);
  if (withSusp.length === 0) return null;
  const total = withSusp.reduce((n, p) => n + p.accusations.length, 0);
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "nx-card-head clickable", onClick: () => setOpen((o) => !o), children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-head-title", children: [
        "👁 Sospechas de los jugadores (",
        total,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "nx-mono", children: open ? "▲" : "▼" })
    ] }),
    open && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-card-body", children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "nx-list short", style: { gap: 8 }, children: withSusp.map((p) => /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-sub", style: { fontWeight: 600 }, children: [
        p.name,
        " ",
        /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { color: "var(--moon)" }, children: [
          "👁 ",
          p.accusations.length
        ] })
      ] }),
      p.accusations.map((a, i) => {
        const sr = ALL_ROLES.find((r) => r.id === a.roleId);
        return /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "nx-hint", style: { marginLeft: 10 }, children: [
          a.accuserName,
          " → ",
          (sr == null ? void 0 : sr.name) || a.roleId
        ] }, i);
      })
    ] }, p.id)) }) })
  ] });
}
function ImportCampaignBox({ send, importResult }) {
  const [open, setOpen] = React.useState(false);
  const [json, setJson] = React.useState("");
  const [name, setName] = React.useState("");
  const doImport = () => {
    if (!json.trim()) return;
    send("IMPORT_CAMPAIGN", { json: json.trim(), name: name.trim() || void 0 });
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 8 }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setOpen((o) => !o), className: "btn-night", style: { width: "100%", fontSize: 10 }, children: open ? "Cerrar" : "＋ Importar campaña (JSON)" }),
    open && /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { marginTop: 6, padding: "8px 10px", background: "rgba(0,0,0,0.25)", border: "var(--hairline-bone)", borderRadius: 4 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "input",
        {
          value: name,
          onChange: (e) => setName(e.target.value),
          placeholder: "Nombre (opcional)",
          style: { width: "100%", marginBottom: 6, background: "var(--ink-700)", border: "var(--hairline-bone)", borderRadius: 2, padding: "5px 7px", fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)" }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "textarea",
        {
          value: json,
          onChange: (e) => setJson(e.target.value),
          rows: 5,
          placeholder: 'Pega el script: [{"id":"_meta","name":"..."},"washerwoman",...]',
          style: { width: "100%", background: "var(--ink-700)", border: "var(--hairline-bone)", borderRadius: 2, padding: "6px 8px", fontFamily: "var(--mono)", fontSize: 10, color: "var(--bone-100)", resize: "vertical" }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: doImport, disabled: !json.trim(), className: "btn-action primary", style: { width: "100%", marginTop: 6, opacity: json.trim() ? 1 : 0.4 }, children: "Importar" }),
      importResult && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginTop: 8, fontSize: 11, fontFamily: "var(--serif)" }, children: importResult.ok ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { color: "var(--good)", margin: "0 0 4px" }, children: [
          "✓ ",
          importResult.name,
          " — ",
          importResult.roleCount,
          " roles"
        ] }),
        (importResult.warnings || []).map((w, i) => /* @__PURE__ */ jsxRuntime.jsx("p", { style: { color: "var(--gold)", margin: "2px 0", fontStyle: "italic" }, children: w }, i)),
        (importResult.setupNotes || []).map((s, i) => /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { color: "var(--bone-400)", margin: "2px 0" }, children: [
          "· ",
          s
        ] }, `s${i}`))
      ] }) : /* @__PURE__ */ jsxRuntime.jsxs("p", { style: { color: "var(--blood-hi)", margin: 0 }, children: [
        "✕ ",
        importResult.error
      ] }) })
    ] })
  ] });
}
function DiscordMemberPicker({ discordMembers, players, send }) {
  const GAME_ROLE_ID = "1499987378755076218";
  const [nicknames, setNicknames] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("boct_nicknames") || "{}");
    } catch {
      return {};
    }
  });
  const [editId, setEditId] = React.useState(null);
  const [editValue, setEditValue] = React.useState("");
  const gameMembers = discordMembers.filter((m) => {
    var _a;
    return (_a = m.roles) == null ? void 0 : _a.includes(GAME_ROLE_ID);
  });
  const addedIds = new Set(players.filter((p) => p.discordId).map((p) => p.discordId));
  const saveNickname = (id, nick) => {
    const trimmed = nick.trim();
    const updated = { ...nicknames };
    if (trimmed) updated[id] = trimmed;
    else delete updated[id];
    setNicknames(updated);
    localStorage.setItem("boct_nicknames", JSON.stringify(updated));
    setEditId(null);
  };
  const addMember = (m) => {
    const name = nicknames[m.id] || m.displayName;
    send("ADD_PLAYER", { name, discordId: m.id, discordTag: m.tag, avatar: m.avatar });
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "8px 10px", background: "rgba(88,101,242,0.07)", borderRadius: 4, border: "1px solid rgba(88,101,242,0.25)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "panel-label", style: { margin: 0, color: "rgba(88,101,242,0.9)" }, children: [
        "Miembros Discord (",
        gameMembers.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { className: "btn-night", style: { fontSize: 9 }, onClick: () => send("REFRESH_DISCORD_MEMBERS", {}), children: "🔄 Recargar" })
    ] }),
    gameMembers.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-500)", fontStyle: "italic" }, children: discordMembers.length === 0 ? "Conectando Discord..." : "Sin miembros con rol de partida." }) : /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 3, maxHeight: 260, overflowY: "auto" }, children: gameMembers.map((m) => {
      const nick = nicknames[m.id];
      const displayName = nick || m.displayName;
      const added = addedIds.has(m.id);
      const isEditing = editId === m.id;
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: added ? "rgba(109,140,184,0.1)" : "rgba(0,0,0,0.2)",
        border: added ? "1px solid rgba(109,140,184,0.25)" : "var(--hairline-bone)",
        borderRadius: 3,
        padding: "4px 6px"
      }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
          width: 26,
          height: 26,
          borderRadius: "50%",
          overflow: "hidden",
          background: "var(--ink-700)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "var(--bone-100)"
        }, children: m.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: m.avatar, style: { width: "100%", height: "100%", objectFit: "cover" } }) : displayName[0] }),
        isEditing ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            "input",
            {
              autoFocus: true,
              value: editValue,
              onChange: (e) => setEditValue(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") saveNickname(m.id, editValue);
                if (e.key === "Escape") setEditId(null);
              },
              placeholder: m.displayName,
              style: { flex: 1, background: "var(--ink-600)", border: "var(--hairline)", borderRadius: 2, padding: "3px 6px", fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-100)" }
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => saveNickname(m.id, editValue), className: "btn-night", style: { fontSize: 9, padding: "2px 6px" }, children: "✓" }),
          /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => setEditId(null), style: { background: "none", border: "none", color: "var(--bone-400)", cursor: "pointer", fontSize: 10, padding: "0 2px" }, children: "✕" })
        ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: {
              fontFamily: "var(--serif)",
              fontSize: 11,
              color: nick ? "var(--gold-hot)" : "var(--bone-100)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }, children: displayName }),
            nick && /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 8, color: "var(--bone-500)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: m.displayName })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: () => {
                setEditId(m.id);
                setEditValue(nick || "");
              },
              title: "Apodo",
              style: { background: "none", border: "var(--hairline-bone)", borderRadius: 2, color: nick ? "var(--gold)" : "var(--bone-500)", cursor: "pointer", fontSize: 9, padding: "2px 5px", flexShrink: 0 },
              children: "✏"
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: () => addMember(m),
              disabled: added,
              className: added ? "btn-night" : "btn-action primary",
              style: { fontSize: 10, padding: "3px 8px", flexShrink: 0, opacity: added ? 0.4 : 1 },
              children: added ? "✓" : "+"
            }
          )
        ] })
      ] }, m.id);
    }) })
  ] });
}
function NarratorsPicker({ game, discordMembers, send }) {
  const ids = Array.isArray(game.narratorDiscordIds) ? game.narratorDiscordIds : [];
  const [selectId, setSelectId] = React.useState("");
  const nameOf = (id) => {
    var _a;
    return ((_a = discordMembers.find((m) => m.id === id)) == null ? void 0 : _a.displayName) || id;
  };
  const addNarrator = () => {
    if (!selectId || ids.includes(selectId)) return;
    send("SET_NARRATORS", { discordIds: [...ids, selectId] });
    setSelectId("");
  };
  const removeNarrator = (id) => send("SET_NARRATORS", { discordIds: ids.filter((x) => x !== id) });
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "8px 10px", background: "rgba(201,162,74,0.06)", borderRadius: 4, border: "1px solid rgba(201,162,74,0.25)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "panel-label", style: { margin: "0 0 6px", color: "var(--gold-hot)" }, children: [
      "🎙 Narradores (",
      ids.length,
      ")"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }, children: [
      ids.length === 0 && /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-500)", fontStyle: "italic" }, children: "Narrador por defecto" }),
      ids.map((id) => /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--serif)", fontSize: 11, color: "var(--bone-100)", background: "rgba(0,0,0,0.25)", border: "var(--hairline-bone)", borderRadius: 3, padding: "2px 6px" }, children: [
        "🎙 ",
        nameOf(id),
        ids.length > 1 && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => removeNarrator(id),
            title: "Quitar narrador",
            style: { background: "none", border: "none", color: "var(--blood-hi)", cursor: "pointer", fontSize: 10, padding: 0 },
            children: "✕"
          }
        )
      ] }, id))
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs(
        "select",
        {
          value: selectId,
          onChange: (e) => setSelectId(e.target.value),
          style: { flex: 1, fontSize: 11, background: "var(--ink-600)", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-200)", padding: "4px 6px" },
          children: [
            /* @__PURE__ */ jsxRuntime.jsx("option", { value: "", children: "Agregar narrador…" }),
            discordMembers.filter((m) => !ids.includes(m.id)).map((m) => /* @__PURE__ */ jsxRuntime.jsx("option", { value: m.id, children: m.displayName }, m.id))
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          onClick: addNarrator,
          disabled: !selectId,
          className: "btn-action primary",
          style: { padding: "4px 10px", fontSize: 11, opacity: selectId ? 1 : 0.4 },
          children: "+"
        }
      )
    ] })
  ] });
}
function ChannelLimitsControl({ game, send }) {
  const CHANNELS = ["MERCADO", "TABERNA", "CEMENTERIO", "BOSQUE"];
  const LABELS = { MERCADO: "Mercado", TABERNA: "Taberna", CEMENTERIO: "Cementerio", BOSQUE: "Bosque" };
  const limits = game.channelLimits || {};
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "8px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 4, border: "var(--hairline-bone)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx("p", { className: "panel-label", style: { margin: "0 0 8px" }, children: "Límites de canales" }),
    /* @__PURE__ */ jsxRuntime.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: CHANNELS.map((ch) => /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-200)", flex: 1 }, children: LABELS[ch] }),
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 3, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => send("SET_CHANNEL_LIMIT", { channel: ch, limit: Math.max(0, (limits[ch] || 0) - 1) }),
            style: { background: "none", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-300)", cursor: "pointer", padding: "2px 6px", fontFamily: "var(--mono)", fontSize: 11 },
            children: "−"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: limits[ch] ? "var(--gold-hot)" : "var(--bone-500)", minWidth: 20, textAlign: "center" }, children: limits[ch] || "∞" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => send("SET_CHANNEL_LIMIT", { channel: ch, limit: (limits[ch] || 0) + 1 }),
            style: { background: "none", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-300)", cursor: "pointer", padding: "2px 6px", fontFamily: "var(--mono)", fontSize: 11 },
            children: "+"
          }
        ),
        limits[ch] > 0 && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => send("SET_CHANNEL_LIMIT", { channel: ch, limit: 0 }),
            style: { background: "none", border: "none", color: "var(--blood-hi)", cursor: "pointer", fontSize: 9, padding: "2px 4px" },
            children: "✕"
          }
        )
      ] })
    ] }, ch)) })
  ] });
}
function AutoModeTimer({ autoPhaseInfo, send }) {
  const [remaining, setRemaining] = React.useState(Math.max(0, Math.floor((autoPhaseInfo.endsAt - Date.now()) / 1e3)));
  React.useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((autoPhaseInfo.endsAt - Date.now()) / 1e3)));
    }, 1e3);
    return () => clearInterval(id);
  }, [autoPhaseInfo.endsAt]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label2 = autoPhaseInfo.phase === "day_discussion" ? "Tiempo libre (5 min)" : "Nominaciones (7 min)";
  const urgent = remaining < 60;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { padding: "8px 12px", background: "rgba(141,90,180,0.1)", borderRadius: 4, border: `1px solid rgba(141,90,180,${urgent ? "0.6" : "0.3"})`, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(141,90,180,0.8)", margin: "0 0 2px" }, children: "🤖 Modo automático" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-200)", margin: 0 }, children: label2 })
    ] }),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 18, fontWeight: 700, color: urgent ? "var(--blood-hi)" : "var(--gold-hot)" }, children: [
        mins,
        ":",
        secs.toString().padStart(2, "0")
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx("button", { onClick: () => send("STOP_AUTO_MODE", {}), className: "btn-night", style: { fontSize: 8 }, children: "Detener" })
    ] })
  ] });
}
function ChannelControl({ players, send }) {
  const [open, setOpen] = React.useState(false);
  const [secretFeedback, setSecretFeedback] = React.useState({});
  const outOfPlaza = players.filter((p) => p.discordChannel && p.discordChannel !== "PLAZA");
  const CHANNEL_LABELS = { PLAZA: "Plaza", MERCADO: "Mercado", TABERNA: "Taberna", CEMENTERIO: "Cementerio", BOSQUE: "Bosque" };
  const moveToSecret = (p) => {
    send("MOVE_TO_SECRET", { targetPlayerId: p.id });
    setSecretFeedback((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => setSecretFeedback((prev) => {
      const n = { ...prev };
      delete n[p.id];
      return n;
    }), 2e3);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { borderRadius: 4, border: "var(--hairline-bone)", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", cursor: "pointer", background: "rgba(0,0,0,0.15)" },
        onClick: () => setOpen(!open),
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 13, color: "var(--bone-100)" }, children: "Canales Discord" }),
            outOfPlaza.length > 0 && /* @__PURE__ */ jsxRuntime.jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)", background: "rgba(201,162,74,0.1)", padding: "2px 6px", borderRadius: 2 }, children: [
              outOfPlaza.length,
              " fuera"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  send("MOVE_TO_CHANNEL", { moveAll: true, channel: null });
                },
                className: "btn-night",
                style: { fontSize: 8 },
                children: "Todos → Plaza"
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-500)" }, children: open ? "▲" : "▼" })
          ] })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxRuntime.jsx("div", { style: { padding: "8px 10px", display: "flex", flexDirection: "column", gap: 3 }, children: players.map((p) => {
      const ch = p.discordChannel || "PLAZA";
      const inPlaza = !p.discordChannel || p.discordChannel === "PLAZA";
      return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 12, color: "var(--bone-100)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: p.name }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 8, color: "var(--bone-400)" }, children: CHANNEL_LABELS[ch] || ch }),
        /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => moveToSecret(p),
            title: "Mover a canal secreto (confesionario)",
            className: "btn-night",
            style: { fontSize: 9, padding: "2px 6px", borderColor: secretFeedback[p.id] ? "var(--good)" : void 0, color: secretFeedback[p.id] ? "var(--good)" : void 0 },
            children: secretFeedback[p.id] ? "✓" : "🔒"
          }
        ),
        !inPlaza && /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            onClick: () => send("MOVE_TO_CHANNEL", { targetPlayerId: p.id, channel: null }),
            className: "btn-night",
            style: { fontSize: 8, padding: "2px 6px" },
            children: "Plaza"
          }
        )
      ] }, p.id);
    }) })
  ] });
}
function RankingsManager({ rankings, send }) {
  const [editingKey, setEditingKey] = React.useState(null);
  const [editVals, setEditVals] = React.useState({});
  const rows = rankings ? Object.entries(rankings).sort((a, b) => b[1].wins_as_good + b[1].wins_as_demon - (a[1].wins_as_good + a[1].wins_as_demon)) : null;
  const startEdit = (key, r) => {
    setEditingKey(key);
    setEditVals({ wins_as_good: r.wins_as_good || 0, wins_as_demon: r.wins_as_demon || 0, total_games: r.total_games || 0 });
  };
  const saveEdit = () => {
    send("UPDATE_RANKING", { key: editingKey, updates: editVals });
    setEditingKey(null);
  };
  const numInput = (field, color) => /* @__PURE__ */ jsxRuntime.jsx(
    "input",
    {
      type: "number",
      min: "0",
      value: editVals[field],
      onChange: (e) => setEditVals((v) => ({ ...v, [field]: e.target.value })),
      style: {
        width: 44,
        background: "var(--ink-700)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 2,
        padding: "2px 4px",
        fontFamily: "var(--mono)",
        fontSize: 11,
        color,
        textAlign: "center"
      }
    }
  );
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntime.jsxs("p", { className: "panel-label", children: [
      "Rankings ",
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "count", children: rows ? rows.length : "…" })
    ] }),
    rows === null ? /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 14, color: "var(--bone-400)", fontStyle: "italic" }, children: "Cargando..." }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntime.jsx("p", { style: { fontFamily: "var(--serif)", fontSize: 14, color: "var(--bone-400)", fontStyle: "italic" }, children: "Sin partidas registradas." }) : /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 8, padding: "0 10px 4px", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { flex: 1 } }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--good)", minWidth: 44, textAlign: "center", letterSpacing: "0.05em" }, children: "ALDEA" }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--blood-hi)", minWidth: 44, textAlign: "center", letterSpacing: "0.05em" }, children: "DEMO" }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-200)", minWidth: 44, textAlign: "center", letterSpacing: "0.05em" }, children: "TOTAL" }),
        /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 9, color: "var(--bone-400)", minWidth: 44, textAlign: "center", letterSpacing: "0.05em" }, children: "JUGADAS" }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { style: { width: 56 } })
      ] }),
      rows.map(([key, r]) => {
        var _a;
        return /* @__PURE__ */ jsxRuntime.jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: editingKey === key ? "rgba(201,162,74,0.06)" : "rgba(0,0,0,0.2)",
          border: editingKey === key ? "1px solid rgba(201,162,74,0.3)" : "var(--hairline-bone)",
          borderRadius: 3,
          padding: "8px 10px"
        }, children: [
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: {
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--ink-700)",
            border: "var(--hairline)",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--serif)",
            fontSize: 13,
            color: "var(--bone-100)"
          }, children: r.avatar ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: r.avatar, style: { width: "100%", height: "100%", objectFit: "cover" } }) : (((_a = r.name) == null ? void 0 : _a[0]) || "?").toUpperCase() }),
          /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--serif)", fontSize: 14, color: "var(--bone-100)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.name }),
          editingKey === key ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            numInput("wins_as_good", "var(--good)"),
            numInput("wins_as_demon", "var(--blood-hi)"),
            /* @__PURE__ */ jsxRuntime.jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--bone-200)", minWidth: 44, textAlign: "center" }, children: (parseInt(editVals.wins_as_good) || 0) + (parseInt(editVals.wins_as_demon) || 0) }),
            numInput("total_games", "var(--bone-300)"),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: saveEdit,
                  style: { background: "rgba(201,162,74,0.2)", border: "1px solid rgba(201,162,74,0.4)", borderRadius: 2, color: "var(--gold)", fontFamily: "var(--mono)", fontSize: 10, cursor: "pointer", padding: "3px 7px" },
                  children: "✓"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: () => setEditingKey(null),
                  style: { background: "none", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-400)", fontFamily: "var(--mono)", fontSize: 10, cursor: "pointer", padding: "3px 7px" },
                  children: "✕"
                }
              )
            ] })
          ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { title: "Victorias aldeano", style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--good)", minWidth: 44, textAlign: "center" }, children: r.wins_as_good || 0 }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { title: "Victorias demonio", style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--blood-hi)", minWidth: 44, textAlign: "center" }, children: r.wins_as_demon || 0 }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { title: "Total victorias", style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--bone-200)", minWidth: 44, textAlign: "center" }, children: (r.wins_as_good || 0) + (r.wins_as_demon || 0) }),
            /* @__PURE__ */ jsxRuntime.jsx("span", { title: "Partidas jugadas", style: { fontFamily: "var(--mono)", fontSize: 11, color: "var(--bone-400)", minWidth: 44, textAlign: "center" }, children: r.total_games || 0 }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: () => startEdit(key, r),
                  style: { background: "none", border: "var(--hairline-bone)", borderRadius: 2, color: "var(--bone-400)", fontFamily: "var(--mono)", fontSize: 10, cursor: "pointer", padding: "3px 7px", opacity: 0.6 },
                  title: "Editar estadísticas",
                  onMouseEnter: (e) => e.currentTarget.style.opacity = 1,
                  onMouseLeave: (e) => e.currentTarget.style.opacity = 0.6,
                  children: "✎"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: () => send("DELETE_RANKING", { key }),
                  style: { color: "var(--blood-hi)", fontSize: 13, background: "none", border: "none", cursor: "pointer", flexShrink: 0, opacity: 0.6, padding: "2px 4px" },
                  title: "Eliminar del ranking",
                  onMouseEnter: (e) => e.currentTarget.style.opacity = 1,
                  onMouseLeave: (e) => e.currentTarget.style.opacity = 0.6,
                  children: "✕"
                }
              )
            ] })
          ] })
        ] }, key);
      })
    ] })
  ] });
}
const MUST = {
  lobby: ["Montaje", "Montar partida", "Campaña"],
  role_reveal: ["Reparto", "Enseñar personaje", "Iniciar primera noche"],
  first_night: ["Primera noche", "Guía de la noche", "Jugadores", "Amanecer"],
  night: ["Noche 2", "Guía de la noche", "paso", "Amanecer", "Pendiente", "Decides tú", "Registro"],
  day: ["Día 2", "Abrir nominaciones", "Nueva nominación"],
  nominations: ["Nominaciones", "Ejecutar a Jugador 3"],
  voting: ["Votación", "Cerrar votación"]
};
const MUST_NOT = ["Acciones de Noche", "first_night ·"];
const lines = [];
let fails = 0;
for (const key of Object.keys(SCENARIOS)) {
  setScenario(key);
  try {
    const html = server.renderToString(React.createElement(NarratorPanel));
    const missing = (MUST[key] || []).filter((m) => !html.includes(m));
    const forbidden = MUST_NOT.filter((m) => html.includes(m));
    if (missing.length || forbidden.length) {
      fails++;
      lines.push(`FALLA ${key.padEnd(12)} falta: [${missing.join(", ")}] sobra: [${forbidden.join(", ")}]`);
    } else {
      lines.push(`OK    ${key.padEnd(12)} ${html.length} bytes`);
    }
  } catch (e) {
    fails++;
    lines.push(`FALLA ${key.padEnd(12)} ${e.message}`);
  }
}
console.log(lines.join("\n"));
console.log(fails === 0 ? "\nTODAS LAS FASES RENDERIZAN" : `
${fails} FASES ROTAS`);
process.exitCode = fails === 0 ? 0 : 1;
