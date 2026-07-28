const { v4: uuidv4 } = require('uuid');
const {
  ROLES, getDistribution, getRolesByType, getCampaign, DEFAULT_CAMPAIGN,
  ALL_OUTSIDER_MODIFIERS, ALL_MINION_MODIFIERS,
} = require('./roles');
const SETUP = require('./setup');
const ROLE_INFO = require('./roleInfo');
const HINTS = require('./narratorHints');

// ── In-memory store ────────────────────────────────────────────────
const games = new Map();

function createGame(narratorId, gameId) {
  const id = gameId || uuidv4();
  const game = {
    id, narratorId,
    campaignId: DEFAULT_CAMPAIGN,
    phase: 'lobby',
    dayNumber: 0, nightNumber: 0,
    players: [],
    nominations: [],
    activeNomination: null,
    executedToday: null,
    nightDeaths: [],
    nightActions: {},
    winner: null,
    winReason: null,
    smokeScreenPlayerId: null,
    rolesNotInPlay: [],
    narratorDrunkAs: null,
    narratorRolesForImp: [],
    channelLimits: {},
    narratorDiscordIds: [],
    nightQueue: [],
    nightQueueIndex: 0,
    nightSubmissions: {},
    nightWaitingForRavenkeeper: false,
    recluseRegistersAs: null,
    spyRegistersAs: null,
    mayorKillTarget: null,
    createdAt: Date.now(),
    autoMode: false,
    autoPhaseInfo: null,
    autoDayMs: 5 * 60 * 1000,
    autoNomMs: 7 * 60 * 1000,
    autoVotes: { skipDay: [], skipNom: [], extend: [], skipNight: [] },
    pendingNightAfterNomination: false,
    nightReadyPlayers: [],
    statusLog: [],
    deferredEffects: [],
    pukkaLastPoisoned: null,
    shabalothLastKilled: [],
    grandmotherGrandchild: null,
    executionAttemptToday: false,   // hubo ejecución hoy (aunque el ejecutado no muriera)
    mastermindPending: false,       // Demonio muerto con Mente Maestra viva: día extra por empezar
    mastermindDay: null,            // dayNumber del día extra en curso
    mastermindDone: false,          // día extra ya resuelto (no se repite)
    minstrelPending: null,          // id del Juglar cuya borrachera colectiva se aplica al anochecer
    // ── Montaje (Addendum 2): el Narrador decide TODO antes de empezar ──
    setup: { locked: false, seatOrder: [], assignments: {}, decisions: [] },
    setupResolved: null,
  };
  games.set(id, game);
  return game;
}

function getGame(id) { return games.get(id); }

function addPlayer(game, { name, discordId, discordTag, avatar }) {
  const existing = game.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.discordId = discordId || existing.discordId;
    if (avatar) existing.avatar = avatar;
    return existing;
  }
  const player = {
    id: uuidv4(), name,
    discordId: discordId || null,
    discordTag: discordTag || null,
    avatar: avatar || null,
    role: null, alignment: null, type: null,
    alive: true,
    poisoned: false,
    protected: false,
    safeTonight: false,
    deadVoteNominationId: null,
    butlerMaster: null,
    slayerUsed: false, virginUsed: false,
    showRole: false,
    nightInfo: null,
    accusations: [],
    drunkAs: null,
    believedRole: null,   // capa 2: rol que CREE ser (Marioneta/Lunático/Borracho)
    pendingRavenkeeper: false,
    bluffRole: null,
    discordChannel: null,
    impShotUsed: false,
    statuses: [],
    tokens: [],
    foolUsed: false,
    zombuulFirstDied: false,
    zombuulReallyDead: false,
    golemUsed: false,
    vigormortisAlive: false,
  };
  game.players.push(player);
  return player;
}

function removePlayer(game, playerId) {
  game.players = game.players.filter(p => p.id !== playerId);
}

// ── Role Distribution ──────────────────────────────────────────────
function distributeRoles(game, selectedRoleIds) {
  const n = game.players.length;
  if (n < 5 || n > 15) throw new Error('Se requieren entre 5 y 15 jugadores');

  const dist = getDistribution(n, selectedRoleIds, game.campaignId);
  const available = {
    townfolk: selectedRoleIds.filter(id => ROLES[id]?.type === 'townfolk'),
    outsiders: selectedRoleIds.filter(id => ROLES[id]?.type === 'outsider'),
    minions: selectedRoleIds.filter(id => ROLES[id]?.type === 'minion'),
    demons: selectedRoleIds.filter(id => ROLES[id]?.type === 'demon'),
  };

  if (available.townfolk.length < dist.townfolk) throw new Error(`Necesitas ${dist.townfolk} Aldeano(s), tienes ${available.townfolk.length}`);
  if (available.outsiders.length < dist.outsiders) throw new Error(`Necesitas ${dist.outsiders} Forastero(s) seleccionado(s)`);
  if (available.minions.length < dist.minions) throw new Error(`Necesitas ${dist.minions} Esbirro(s) seleccionado(s)`);
  if (available.demons.length < dist.demons) throw new Error(`Necesitas ${dist.demons} Demonio(s) seleccionado(s)`);

  const chosen = [
    ...shuffle(available.townfolk).slice(0, dist.townfolk),
    ...shuffle(available.outsiders).slice(0, dist.outsiders),
    ...shuffle(available.minions).slice(0, dist.minions),
    ...shuffle(available.demons).slice(0, dist.demons),
  ];

  const shuffledRoles = shuffle(chosen);
  const shuffledPlayers = shuffle([...game.players]);

  shuffledPlayers.forEach((player, i) => {
    const role = ROLES[shuffledRoles[i]];
    player.role = role.id;
    player.alignment = role.alignment;
    player.type = role.type;
    if (role.id === 'DRUNK') {
      if (game.narratorDrunkAs) {
        player.drunkAs = game.narratorDrunkAs;
      } else {
        const fakeTownfolk = getRolesByType('townfolk', game.campaignId).filter(r => r.id !== 'DRUNK');
        player.drunkAs = fakeTownfolk[Math.floor(Math.random() * fakeTownfolk.length)].id;
      }
    }
  });

  const rolesInPlay = new Set(game.players.map(p => p.role));
  const allGoodRoles = [...getRolesByType('townfolk', game.campaignId), ...getRolesByType('outsider', game.campaignId)];
  game.rolesNotInPlay = allGoodRoles.filter(r => !rolesInPlay.has(r.id)).map(r => r.id);

  assignBelievedRoles(game);
  return game;
}

// ── Misperception (capa 2: percibido ≠ real) ───────────────────────
// Un rol con `misperception` hace que el jugador CREA ser otro personaje
// (Borracho→Aldeano, Marioneta→rol bueno, Lunático→Demonio). Toda su
// información se enruta por believedRole; su verdadero rol jamás llega a
// la vista de ese jugador. `believes`: 'unusedTownfolk'|'unusedGood'|'demon'.
function isNoWakeMisperception(p) {
  const m = p && ROLES[p.role]?.misperception;
  return !!m && m.wakesWithEvil === false;
}

function assignBelievedRoles(game) {
  const inPlay = new Set(game.players.map(p => p.role));
  const goodPool = [...getRolesByType('townfolk', game.campaignId), ...getRolesByType('outsider', game.campaignId)]
    .filter(r => !inPlay.has(r.id) && !r.misperception);
  const tfPool = goodPool.filter(r => r.type === 'townfolk');
  const demonsInCampaign = getRolesByType('demon', game.campaignId);
  const demonsInPlay = game.players.filter(p => p.type === 'demon');
  const pick = arr => (arr.length ? arr[Math.floor(Math.random() * arr.length)].id : null);

  for (const p of game.players) p.believedRole = null;

  for (const p of game.players) {
    const m = ROLES[p.role]?.misperception;
    if (!m) continue;
    // El Borracho conserva su mecánica existente (drunkAs ya asignado arriba).
    if (p.role === 'DRUNK') { p.believedRole = p.drunkAs || null; continue; }
    if (m.believes === 'demon') {
      const inPlayDemon = demonsInPlay.find(d => d.id !== p.id)?.role;
      p.believedRole = inPlayDemon || (demonsInCampaign[0]?.id) || null;
    } else if (m.believes === 'unusedTownfolk') {
      p.believedRole = pick(tfPool.length ? tfPool : goodPool);
    } else { // 'unusedGood'
      p.believedRole = pick(goodPool);
    }
  }
  return game;
}

// ── Aplicar el montaje (SETUP_LOCK): el Narrador ya decidió TODO ───────
// Vuelca las decisiones del wizard en los campos deterministas del motor
// (believedRole, smokeScreenPlayerId, narratorRolesForImp, registros…) y
// pre-rellena la info de la 1ª noche. CERO azar en la ruta del Narrador.
function applySetup(game) {
  const setup = game.setup || {};
  const decisions = setup.decisions || [];
  const assignments = setup.assignments || {};

  // 1) Roles reales por asiento
  for (const [seatId, roleId] of Object.entries(assignments)) {
    const player = game.players.find(p => p.id === seatId);
    const role = ROLES[roleId];
    if (!player || !role) continue;
    player.role = role.id; player.alignment = role.alignment; player.type = role.type;
    player.alive = true; player.poisoned = false; player.protected = false; player.safeTonight = false;
    player.believedRole = null; player.drunkAs = null; player.tokens = [];
    player.nightInfo = null;
    player.slayerUsed = false; player.virginUsed = false; player.impShotUsed = false;
    player.butlerMaster = null; player.bluffRole = null; player.statuses = [];
    player.borrowedAbility = null; // Alquimista / Rata de Laboratorio
  }
  const inPlay = new Set(game.players.map(p => p.role));
  const allGood = [...getRolesByType('townfolk', game.campaignId), ...getRolesByType('outsider', game.campaignId)];
  game.rolesNotInPlay = allGood.filter(r => !inPlay.has(r.id)).map(r => r.id);

  // 2) Decisiones → campos deterministas (solo lo que pertenece a la preparación)
  game.smokeScreenPlayerId = null;
  for (const d of decisions) {
    const seatP = game.players.find(p => p.id === d.seat);
    switch (d.kind) {
      case 'identidadFalsa':
        if (!seatP) break;
        if (d.role === 'lunatic') {
          seatP.believedRole = d.lunatic?.perceivedDemon || null;
        } else {
          seatP.believedRole = d.chosenGoodRole || null;
          if (seatP.role === 'DRUNK') { seatP.drunkAs = d.chosenGoodRole || null; game.narratorDrunkAs = d.chosenGoodRole || null; }
        }
        break;
      case 'registroInicial':
        if (seatP?.role === 'SPY') game.spyRegistersAs = d.registersAs === 'good' ? 'good' : null;
        if (seatP?.role === 'RECLUSE') game.recluseRegistersAs = (d.registersAs === 'minion' || d.registersAs === 'demon') ? d.registersAs : null;
        break;
      case 'otroSecreto':
        // Gemela Malvada: guarda la pareja (gemela ↔ gemelo bueno) para el fin de partida.
        if (d.secret === 'evilTwin' && seatP && d.targetSeat) {
          game.evilTwinPair = { evilId: seatP.id, goodId: d.targetSeat };
        }
        break;
      // Alquimista: lleva la habilidad de un Esbirro. Sin ficha, la decisión
      // quedaba sólo en el panel nocturno y no se veía en el grimorio.
      case 'alchemistAbility': {
        if (!seatP || !d.chosen) break;
        const m = ROLES[d.chosen];
        seatP.borrowedAbility = d.chosen;
        placeToken(seatP, {
          type: 'ALCHEMIST_ABILITY', roleId: 'ALCHEMIST',
          label: `Habilidad de ${m?.name || d.chosen}`,
          expiry: ['PERMANENT'], sourceRole: 'ALCHEMIST', sourcePlayerId: seatP.id,
        }, game);
        break;
      }
      // Rata de Laboratorio: el Demonio INICIAL también recibe la habilidad
      // buena elegida. Antes sólo la heredaban los Demonios sucesores.
      case 'boffinAbility': {
        if (!d.chosen) break;
        const demon = game.players.find(p => p.type === 'demon');
        if (!demon) break;
        const g = ROLES[d.chosen];
        demon.borrowedAbility = d.chosen;
        placeToken(demon, {
          type: 'BOFFIN_ABILITY', roleId: 'BOFFIN',
          label: `Habilidad de ${g?.name || d.chosen}`,
          expiry: ['PERMANENT'], sourceRole: 'BOFFIN',
          sourcePlayerId: game.players.find(p => p.role === 'BOFFIN')?.id || null,
        }, game);
        break;
      }
      // forasteros / outsiderModifierChoice / summonerSetup: son confirmaciones
      // de composición, no escriben estado. summonerSetup además es una nota.
      default: break;
    }
  }

  game.setup.locked = true;
  game.phase = 'role_reveal';
  return game;
}

// Regenera el nightInfo del Demonio cuando el Narrador fija sus bluffs durante la noche.
function regenDemonNightInfo(game) {
  const players = game.players;
  const wakingMinions = players.filter(p => p.type === 'minion' && !isNoWakeMisperception(p));
  const hiddenMinions = players.filter(p => p.type === 'minion' && isNoWakeMisperception(p));
  const demons = players.filter(p => p.type === 'demon');
  demons.forEach(d => {
    const minionNames = wakingMinions.map(x => `${x.name} (${ROLES[x.role]?.name})`);
    const rolesPool = (game.narratorRolesForImp || []).filter(id => id !== 'DRUNK');
    const notInPlay3 = rolesPool.slice(0, 3).map(id => ROLES[id]?.name || id);
    const knownMario = hiddenMinions.filter(p => ROLES[p.role]?.misperception?.demonKnows).map(p => p.name);
    const lines = [
      `👹 Eres el Demonio (${ROLES[d.role]?.name}).`,
      minionNames.length ? `Tus Esbirros: ${minionNames.join(', ')}.` : 'Sin Esbirros.',
    ];
    if (knownMario.length) lines.push(`🎭 Marioneta (cree ser bueno): ${knownMario.join(', ')}.`);
    lines.push(notInPlay3.length
      ? `Roles del Bien no en juego:\n${notInPlay3.map((r, i) => `\t${i + 1}. ${r}`).join('\n')}`
      : '(Elige los bluffs durante la noche)');
    d.nightInfo = lines.join('\n');
  });
}

// Roles cuya informacion la calcula la pagina sola (sin eleccion del Narrador).
// A los clasicos de Trouble Brewing se suman los generadores de `roleInfo.js`.
const PASSIVE_INFO_ROLES = new Set([
  'WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','UNDERTAKER','SPY',
  ...ROLE_INFO.AUTO_INFO_ROLES,
]);
const FIRST_NIGHT_ONLY_ROLES = new Set(['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK']);

// ── Fin de partida: punto único de declaración de ganador ────────────
// El Hereje invierte el resultado («quien gana, pierde»), esté vivo o muerto,
// salvo que esté borracho o envenenado cuando la partida termina.
function endGame(game, winner, reason) {
  let final = winner;
  let why = reason;
  const heretic = game.players.find(p => p.role === 'HERETIC');
  if (heretic && !heretic.poisoned && !heretic.drunkAs) {
    final = winner === 'good' ? 'evil' : 'good';
    why = `${reason} — pero el Hereje invierte el resultado: ganan los ${final === 'evil' ? 'malvados' : 'buenos'}`;
  }
  game.winner = final;
  game.phase = 'game_over';
  game.winReason = why;
  return final;
}

// ¿Este jugador despierta esta noche? Vivo, o Esbirro conservado por Vigormortis.
function wakesTonight(p) { return !!p && (p.alive || p.vigormortisAlive); }

// ── Reglas de día ligadas al Demonio (Leviatán, Motín) ───────────────
// Se evalúan al amanecer, antes de comprobar las condiciones normales.
function applyDemonDayRules(game) {
  if (game.phase === 'game_over') return;
  if (game.players.some(p => p.role === 'ATHEIST')) return;

  // Leviatán: después del día 5 ganan los malvados.
  const leviathan = game.players.find(p => p.role === 'LEVIATHAN' && p.alive && !p.poisoned);
  if (leviathan && game.dayNumber > 5) {
    endGame(game, 'evil', '🐉 Leviatán: se acabó el día 5 sin que ganaran los buenos — ganan los malvados');
    return;
  }

  // Motín: en el día 3 los Esbirros vivos se convierten en Motín.
  const riot = game.players.find(p => p.role === 'RIOT' && p.alive && !p.poisoned);
  if (riot && game.dayNumber >= 3 && !game.riotConverted) {
    game.riotConverted = true;
    const converted = [];
    for (const p of game.players) {
      if (!p.alive || p.type !== 'minion') continue;
      p.role = 'RIOT'; p.type = 'demon'; p.alignment = 'evil';
      converted.push(p.name);
      p.nightInfo = '🔥 Motín\nAhora eres Motín. Los nominados mueren de inmediato.';
    }
    addDeferred(game, {
      label: `🔥 Motín — día 3: ${converted.length ? `${converted.join(', ')} pasan a ser Motín. ` : ''}A partir de ahora TODO nominado muere de inmediato, sin votación.`,
      dueNight: game.nightNumber, severity: 'warn', role: 'RIOT',
    });
  }
}

// ¿Está activo el día del Motín? (día 3 en adelante, con Motín sano)
function riotDayActive(game) {
  if (game.players.some(p => p.role === 'ATHEIST')) return false;
  const riot = game.players.find(p => p.role === 'RIOT' && p.alive && !p.poisoned);
  return !!riot && game.dayNumber >= 3;
}

// Legión: la ejecución falla si TODOS los que votaron eran malvados.
function legionVetoesExecution(game, nomination) {
  const legion = game.players.find(p => p.role === 'LEGION' && p.alive && !p.poisoned);
  if (!legion) return false;
  const voters = (nomination.votes || []).map(id => game.players.find(p => p.id === id)).filter(Boolean);
  if (voters.length === 0) return false;
  return voters.every(v => v.alignment === 'evil');
}

function getInteractiveRolesForPhase(game) {
  const campaign = getCampaign(game.campaignId);
  return game.phase === 'first_night' ? campaign.queueFirst : campaign.queueOther;
}

function generateNightInfo(game) {
  const isFirstNight = game.nightNumber === 1;
  const { players } = game;

  players.forEach(p => {
    // p.poisoned ya NO se resetea aquí: lo gestiona el motor de fichas (anochecer).
    p.pendingRavenkeeper = false;
    const roleCheck = p.role === 'DRUNK' ? p.drunkAs : p.role;
    if (isFirstNight || !FIRST_NIGHT_ONLY_ROLES.has(roleCheck)) {
      p.nightInfo = null;
    }
  });
  game.nightDeaths = [];

  if (isFirstNight) {
    // La Marioneta (misperception sin despertar) NO despierta con el mal y los
    // demás Esbirros NO la conocen; el Demonio SÍ sabe quién es.
    const wakingMinions = players.filter(p => p.type === 'minion' && !isNoWakeMisperception(p));
    const hiddenMinions = players.filter(p => p.type === 'minion' && isNoWakeMisperception(p));
    const demons  = players.filter(p => p.type === 'demon');
    wakingMinions.forEach(m => {
      const otherMinions = wakingMinions.filter(x => x.id !== m.id).map(x => x.name);
      const demonNames   = demons.map(x => x.name);
      m.nightInfo = [
        `⚔️ Eres ${ROLES[m.role]?.name}.`,
        otherMinions.length ? `Compañeros Esbirros: ${otherMinions.join(', ')}.` : 'No hay otros Esbirros.',
        `Demonio: ${demonNames.join(', ')}.`,
      ].join('\n');
    });
    demons.forEach(d => {
      const minionNames = wakingMinions.map(x => `${x.name} (${ROLES[x.role]?.name})`);
      const narratorSetBluffs = game.narratorRolesForImp?.length > 0;
      const rolesPool = (narratorSetBluffs ? game.narratorRolesForImp : (game.rolesNotInPlay || [])).filter(id => id !== 'DRUNK');
      // Narrador decidió los bluffs en el montaje → respeta su orden (sin azar). Auto → baraja.
      const notInPlay3  = (narratorSetBluffs ? rolesPool : shuffle(rolesPool)).slice(0, 3).map(id => ROLES[id]?.name || id);
      const knownMarionettes = hiddenMinions.filter(p => ROLES[p.role]?.misperception?.demonKnows).map(p => p.name);
      const lines = [
        `👹 Eres el Demonio (${ROLES[d.role]?.name}).`,
        minionNames.length ? `Tus Esbirros: ${minionNames.join(', ')}.` : 'Sin Esbirros.',
      ];
      if (knownMarionettes.length) lines.push(`🎭 Marioneta (cree ser bueno): ${knownMarionettes.join(', ')}.`);
      lines.push(`Roles del Bien no en juego:\n${notInPlay3.map((r, i) => `\t${i + 1}. ${r}`).join('\n')}`);
      d.nightInfo = lines.join('\n');
    });
  }
  return game;
}

function generatePassiveNightInfo(game) {
  const isFirstNight = game.nightNumber === 1;
  const { players } = game;
  const living = players.filter(p => p.alive);
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  const interactiveRoles = getInteractiveRolesForPhase(game);

  if (isFirstNight) {
    players.filter(p => p.role === 'WASHERWOMAN' && p.alive).forEach(p => {
      const target = rand(living.filter(x => x.type === 'townfolk' && x.id !== p.id));
      if (!target) return;
      const decoy = rand(living.filter(x => x.id !== target.id && x.id !== p.id));
      const pair  = shuffle([target, decoy]);
      if (p.poisoned) {
        const fakeTf = ['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER','UNDERTAKER','MONK','RAVENKEEPER','VIRGIN','SLAYER','SOLDIER','MAYOR'];
        const [a, b] = shuffle([...living.filter(x => x.id !== p.id)]).slice(0,2);
        if (a && b) {
          const fakeRole = rand(fakeTf.filter(r => r !== ROLES[a.role]?.id));
          p.nightInfo = `🧺 Lavandera\nEntre ${a.name} y ${b.name} hay un/una ${ROLES[fakeRole]?.name || fakeRole}.`;
        }
      } else {
        p.nightInfo = `🧺 Lavandera\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[target.role]?.name}.`;
      }
    });

    players.filter(p => p.role === 'LIBRARIAN' && p.alive).forEach(p => {
      const target = rand(living.filter(x => x.type === 'outsider' && x.id !== p.id));
      if (!target) { p.nightInfo = '📚 Bibliotecario\nNo hay Forasteros en la partida.'; return; }
      const decoy = rand(living.filter(x => x.id !== target.id && x.id !== p.id));
      const pair  = shuffle([target, decoy]);
      if (p.poisoned) {
        const fakeOuts = ['BUTLER','RECLUSE','SAINT'];
        const [a, b] = shuffle([...living.filter(x => x.id !== p.id)]).slice(0,2);
        if (a && b) {
          const fakeRole = rand(fakeOuts.filter(r => r !== ROLES[a.role]?.id));
          p.nightInfo = `📚 Bibliotecario\nEntre ${a.name} y ${b.name} hay un/una ${ROLES[fakeRole]?.name || fakeRole}.`;
        }
      } else {
        p.nightInfo = `📚 Bibliotecario\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[target.role]?.name}.`;
      }
    });

    players.filter(p => p.role === 'INVESTIGATOR' && p.alive).forEach(p => {
      const target = rand(living.filter(x => x.type === 'minion' && x.id !== p.id));
      if (!target) { p.nightInfo = '🔍 Investigador\nNo hay Esbirros vivos en la partida.'; return; }
      const decoy = rand(living.filter(x => x.id !== target.id && x.id !== p.id));
      const pair  = shuffle([target, decoy]);
      if (p.poisoned) {
        const fakeMins = ['POISONER','SPY','SCARLET_WOMAN','BARON'];
        const [a, b] = shuffle([...living.filter(x => x.id !== p.id)]).slice(0,2);
        if (a && b) {
          const fakeRole = rand(fakeMins);
          p.nightInfo = `🔍 Investigador\nEntre ${a.name} y ${b.name} hay un/una ${ROLES[fakeRole]?.name || fakeRole}.`;
        }
      } else {
        p.nightInfo = `🔍 Investigador\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[target.role]?.name}.`;
      }
    });

    players.filter(p => p.role === 'COOK' && p.alive).forEach(p => {
      const real = countEvilNeighborPairs(players);
      p.nightInfo = p.poisoned
        ? `🍳 Cocinero\nHay ${falsifyCount(real, 0, Math.min(3, Math.floor(players.length/2)))} pareja(s) de vecinos malvados.`
        : `🍳 Cocinero\nHay ${real} pareja(s) de vecinos malvados.`;
    });
  }

  if (isFirstNight) {
    players.filter(p => p.role === 'EMPATH' && p.alive).forEach(p => {
      const real = countEvilNeighbors(p, players);
      p.nightInfo = p.poisoned
        ? `💞 Empático\nTienes ${falsifyCount(real, 0, 2)} vecino(s) malvado(s) vivos.`
        : `💞 Empático\nTienes ${real} vecino(s) malvado(s) vivos.`;
    });
  }

  if (game.executedToday) {
    players.filter(p => p.role === 'UNDERTAKER' && p.alive).forEach(p => {
      const executed = game.players.find(x => x.id === game.executedToday);
      if (!executed) return;
      if (p.poisoned) {
        const fakeTf = ['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER','MONK','RAVENKEEPER','VIRGIN','SLAYER','SOLDIER','MAYOR'];
        p.nightInfo = `⚰️ Sepulturero\nEl ejecutado (${executed.name}) era: ${ROLES[rand(fakeTf)]?.name}.`;
      } else {
        p.nightInfo = `⚰️ Sepulturero\nEl ejecutado (${executed.name}) era: ${ROLES[executed.role]?.name}.`;
      }
    });
  }

  players.filter(p => p.role === 'SPY' && p.alive).forEach(p => {
    const grimoire = game.players.map(pl =>
      `${pl.name}: ${ROLES[pl.role]?.name || '?'} (${pl.alive ? 'vivo' : 'muerto'}${pl.poisoned ? ' 🤢' : ''}${pl.protected ? ' 🛡' : ''})`
    );
    p.nightInfo = '🕵️ GRIMORIO:\n' + grimoire.join('\n');
  });

  players.filter(p => p.role === 'DRUNK' && p.alive && !interactiveRoles.includes(p.drunkAs)).forEach(p => {
    const info = generateDrunkInfo(p, living, rand, game);
    if (info) p.nightInfo = info;
  });

  return game;
}

function generateSingleRoleInfo(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  if (!wakesTonight(player)) return;

  const isFirstNight = game.nightNumber === 1;
  const living = game.players.filter(p => p.alive);
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  if (player.role === 'DRUNK') {
    const info = generateDrunkInfo(player, living, rand, game);
    if (info) player.nightInfo = info;
    return;
  }

  switch (player.role) {
    case 'WASHERWOMAN': {
      if (!isFirstNight) return;
      const fakeTfRoles = ['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER','UNDERTAKER','MONK','RAVENKEEPER','VIRGIN','SLAYER','SOLDIER','MAYOR'];
      let townPool = living.filter(x => x.type === 'townfolk' && x.id !== player.id);
      const spyInPool = living.find(x => x.role === 'SPY' && x.id !== player.id);
      if (spyInPool && game.spyRegistersAs === 'good') townPool = [...townPool, spyInPool];
      const target = rand(townPool);
      if (!target) return;
      const decoy = rand(living.filter(x => x.id !== target.id && x.id !== player.id));
      const pair = shuffle([target, decoy]);
      if (player.poisoned) {
        const [a, b] = shuffle([...living.filter(x => x.id !== player.id)]).slice(0, 2);
        if (a && b) player.nightInfo = `🧺 Lavandera\nEntre ${a.name} y ${b.name} hay un/una ${ROLES[rand(fakeTfRoles.filter(r => r !== ROLES[a.role]?.id))]?.name}.`;
      } else {
        const displayRole = (target.role === 'SPY') ? rand(fakeTfRoles) : target.role;
        player.nightInfo = `🧺 Lavandera\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[displayRole]?.name}.`;
      }
      break;
    }
    case 'LIBRARIAN': {
      if (!isFirstNight) return;
      const target = rand(living.filter(x => x.type === 'outsider' && x.id !== player.id));
      if (!target) { player.nightInfo = '📚 Bibliotecario\nNo hay Forasteros en la partida.'; return; }
      const decoy = rand(living.filter(x => x.id !== target.id && x.id !== player.id));
      const pair = shuffle([target, decoy]);
      if (player.poisoned) {
        const fakeOuts = ['BUTLER','RECLUSE','SAINT'];
        const [a, b] = shuffle([...living.filter(x => x.id !== player.id)]).slice(0, 2);
        if (a && b) player.nightInfo = `📚 Bibliotecario\nEntre ${a.name} y ${b.name} hay un/una ${ROLES[rand(fakeOuts.filter(r => r !== ROLES[a.role]?.id))]?.name}.`;
      } else {
        player.nightInfo = `📚 Bibliotecario\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[target.role]?.name}.`;
      }
      break;
    }
    case 'INVESTIGATOR': {
      if (!isFirstNight) return;
      
      // FIX: Incluir esbirros reales en la lista de roles fake
      const realMinions = living.filter(x => x.type === 'minion' && x.id !== player.id);
      const realMinionRoles = [...new Set(realMinions.map(m => m.role))];
      let fakeMins = ['POISONER','SPY','SCARLET_WOMAN','BARON'];
      
      // Si hay esbirros reales, asegurar que estén en la lista
      realMinionRoles.forEach(role => {
        if (!fakeMins.includes(role)) fakeMins.push(role);
      });
      
      let minionPool = living.filter(x => x.type === 'minion' && x.id !== player.id);
      const recluseInPool = living.find(x => x.role === 'RECLUSE' && x.id !== player.id);
      if (recluseInPool && game.recluseRegistersAs === 'minion') minionPool = [...minionPool, recluseInPool];
      const target = rand(minionPool);
      if (!target) { player.nightInfo = '🔍 Investigador\nNo hay Esbirros vivos en la partida.'; return; }
      const decoy = rand(living.filter(x => x.id !== target.id && x.id !== player.id));
      const pair = shuffle([target, decoy]);
      
      if (player.poisoned) {
        // FIX: Cuando está envenenado, elegir un esbirro real (si existe) o jugador random
        const allMinions = living.filter(x => x.type === 'minion' && x.id !== player.id);
        const fakeTarget = allMinions.length > 0 ? rand(allMinions) : rand(living.filter(x => x.id !== player.id));
        const fakeDecoy = rand(living.filter(x => x.id !== player.id && x.id !== fakeTarget.id));
        const fakePair = shuffle([fakeTarget, fakeDecoy]);
        
        if (fakePair[0] && fakePair[1]) {
          const fakeRole = rand(fakeMins);
          player.nightInfo = `🔍 Investigador\nEntre ${fakePair[0].name} y ${fakePair[1].name} hay un/una ${ROLES[fakeRole]?.name}.`;
        }
      } else {
        const displayRole = (target.role === 'RECLUSE') ? rand(fakeMins) : target.role;
        player.nightInfo = `🔍 Investigador\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[displayRole]?.name}.`;
      }
      break;
    }
    case 'EMPATH': {
      // FIX: Ya no solo primera noche - funciona cada noche
      const real = countEvilNeighbors(player, game.players, game);
      player.nightInfo = player.poisoned
        ? `💞 Empático\nTienes ${falsifyCount(real, 0, 2)} vecino(s) malvado(s) vivos.`
        : `💞 Empático\nTienes ${real} vecino(s) malvado(s) vivos.`;
      break;
    }
    case 'COOK': {
      if (!isFirstNight) return;
      const real = countEvilNeighborPairs(game.players, game);
      player.nightInfo = player.poisoned
        ? `🍳 Cocinero\nHay ${falsifyCount(real, 0, Math.min(3, Math.floor(game.players.length / 2)))} pareja(s) de vecinos malvados.`
        : `🍳 Cocinero\nHay ${real} pareja(s) de vecinos malvados.`;
      break;
    }
    case 'UNDERTAKER': {
      if (!game.executedToday) return;
      const executed = game.players.find(x => x.id === game.executedToday);
      if (!executed) return;
      const fakeTf = ['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER','MONK','RAVENKEEPER','VIRGIN','SLAYER','SOLDIER','MAYOR'];
      const fakeEvil = ['POISONER','SPY','SCARLET_WOMAN','BARON','IMP'];
      const rand2 = arr => arr[Math.floor(Math.random() * arr.length)];
      if (player.poisoned) {
        player.nightInfo = `⚰️ Sepulturero\nEl ejecutado (${executed.name}) era: ${ROLES[rand2(fakeTf)]?.name}.`;
      } else {
        let displayRole = executed.role;
        if (executed.role === 'RECLUSE' && game.recluseRegistersAs === 'demon') displayRole = 'IMP';
        else if (executed.role === 'RECLUSE' && game.recluseRegistersAs === 'minion') displayRole = rand2(['POISONER','SPY','SCARLET_WOMAN','BARON']);
        if (executed.role === 'SPY' && game.spyRegistersAs === 'good') displayRole = rand2(fakeTf);
        player.nightInfo = `⚰️ Sepulturero\nEl ejecutado (${executed.name}) era: ${ROLES[displayRole]?.name}.`;
      }
      break;
    }
    case 'SPY': {
      const grimoire = game.players.map(pl =>
        `${pl.name}: ${ROLES[pl.role]?.name || '?'} (${pl.alive ? 'vivo' : 'muerto'}${pl.poisoned ? ' 🤢' : ''}${pl.protected ? ' 🛡' : ''})`
      );
      player.nightInfo = '🕵️ GRIMORIO:\n' + grimoire.join('\n');
      break;
    }
    // Resto del compendio: generadores declarativos de `roleInfo.js`.
    default: {
      const auto = ROLE_INFO.autoInfo(game, player);
      if (auto) player.nightInfo = auto;
      break;
    }
  }
}

function generateCurrentPassiveInfo(game) {
  const currentId = game.nightQueue[game.nightQueueIndex];
  if (!currentId) return;
  const player = game.players.find(p => p.id === currentId);
  if (!wakesTonight(player)) return;
  const roleToCheck = player.role === 'DRUNK' ? player.drunkAs : player.role;
  if (PASSIVE_INFO_ROLES.has(roleToCheck)) {
    generateSingleRoleInfo(game, currentId);
  }
}

function buildNightQueue(game) {
  const order = getInteractiveRolesForPhase(game);
  const queue = [];
  for (const roleId of order) {
    if (roleId === 'UNDERTAKER' && !game.executedToday) continue;
    const matched = game.players.filter(p =>
      // Vigormortis: los Esbirros que mató conservan su habilidad y siguen despertando.
      (p.alive || p.vigormortisAlive) &&
      (p.role === roleId || (p.role === 'DRUNK' && p.drunkAs === roleId))
    );
    for (const player of matched) queue.push(player.id);
  }
  return queue;
}

function resolveNightQueue(game) {
  for (const playerId of game.nightQueue) {
    const player = game.players.find(p => p.id === playerId);
    if (!wakesTonight(player)) continue;
    const sub = game.nightSubmissions[playerId];
    if (!sub) continue;
    if (player.role === 'DRUNK') {
      const info = generateDrunkInteractiveInfo(player, sub.action, sub.targetIds, game);
      if (info) player.nightInfo = info;
    } else {
      applyNightAction(game, sub.action, playerId, sub.targetIds);
    }
  }
}

function generateDrunkInteractiveInfo(player, action, targetIds, game) {
  const targets = (targetIds || []).map(id => game.players.find(p => p.id === id)).filter(Boolean);
  const fakeResult = Math.random() > 0.5 ? '✅ SÍ' : '❌ NO';
  switch (action) {
    case 'FORTUNE_TELLER':
      return targets.length >= 2
        ? `🔮 Adivina\nEntre ${targets[0].name} y ${targets[1].name}: ${fakeResult} hay Demonio.`
        : `🔮 Adivina\n${fakeResult} hay Demonio.`;
    case 'MONK_PROTECT':
      return targets[0] ? `🛡️ Monje\nProtegiste a ${targets[0].name} esta noche.` : null;
    case 'BUTLER_MASTER':
      return targets[0] ? `🤵 Mayordomo\nTu Amo esta noche es ${targets[0].name}.` : null;
    case 'POISONER_ACTION':
      return targets[0] ? `🧪 Envenenador\nEnvenenaste a ${targets[0].name} esta noche.` : null;
    case 'IMP_KILL':
      return targets[0] ? `👹 Diablillo\nAtacaste a ${targets[0].name} esta noche.` : null;
    default:
      return null;
  }
}

function advanceNightQueue(game, playerId, action, targetIds) {
  const currentActorId = game.nightQueue[game.nightQueueIndex];
  if (currentActorId !== playerId) throw new Error('No es tu turno todavía');

  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('Jugador no encontrado');

  if (action !== 'INFO_ACKNOWLEDGE') {
    if (player.role === 'DRUNK') {
      const info = generateDrunkInteractiveInfo(player, action, targetIds || [], game);
      if (info) player.nightInfo = info;
    } else {
      applyNightAction(game, action, playerId, targetIds || []);
    }
  }

  let idx = game.nightQueueIndex + 1;
  while (idx < game.nightQueue.length) {
    const next = game.players.find(p => p.id === game.nightQueue[idx]);
    if (wakesTonight(next)) break;
    idx++;
  }
  game.nightQueueIndex = idx;

  generateCurrentPassiveInfo(game);

  const done = game.nightQueueIndex >= game.nightQueue.length;
  const hasPendingRavenkeeper = game.players.some(p => p.pendingRavenkeeper);

  if (done && hasPendingRavenkeeper) {
    game.nightWaitingForRavenkeeper = true;
    return { done: false, needsRavenkeeper: true };
  }
  return { done };
}

function falsifyCount(real, min, max) {
  const options = [];
  for (let i = min; i <= max; i++) if (i !== real) options.push(i);
  return options.length ? options[Math.floor(Math.random() * options.length)] : (real === min ? min + 1 : min);
}

function generateDrunkInfo(p, living, rand, game) {
  const others = living.filter(x => x.id !== p.id);
  if (others.length < 2) return '(No hay suficientes jugadores para generar información)';

  const pickTwo = () => shuffle([...others]).slice(0, 2);

  const fakeTownfolkRoles = ['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER','UNDERTAKER','MONK','RAVENKEEPER','VIRGIN','SLAYER','SOLDIER','MAYOR'];
  const fakeOutsiderRoles = ['BUTLER','RECLUSE','SAINT'];
  const fakeMinionRoles   = ['POISONER','SPY','SCARLET_WOMAN','BARON'];

  switch (p.drunkAs) {
    case 'EMPATH': {
      const real = countEvilNeighbors(p, game.players, game);
      return `💞 Empático\nTienes ${falsifyCount(real, 0, 2)} vecino(s) malvado(s) vivos.`;
    }
    case 'WASHERWOMAN': {
      const [a, b] = pickTwo();
      const fakeRole = rand(fakeTownfolkRoles.filter(r => r !== ROLES[a.role]?.id));
      const pair = shuffle([a, b]);
      return `🧺 Lavandera\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[fakeRole]?.name || fakeRole}.`;
    }
    case 'LIBRARIAN': {
      const nonOutsiders = others.filter(x => x.type !== 'outsider');
      const candidates   = nonOutsiders.length >= 2 ? nonOutsiders : others;
      const [a, b]       = shuffle([...candidates]).slice(0, 2);
      const fakeRole     = rand(fakeOutsiderRoles.filter(r => r !== ROLES[a.role]?.id));
      const pair = shuffle([a, b]);
      return `📚 Bibliotecario\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[fakeRole]?.name || fakeRole}.`;
    }
    case 'INVESTIGATOR': {
      const nonMinions = others.filter(x => x.type !== 'minion');
      const candidates = nonMinions.length >= 2 ? nonMinions : others;
      const [a, b]     = shuffle([...candidates]).slice(0, 2);
      const fakeRole   = rand(fakeMinionRoles);
      const pair = shuffle([a, b]);
      return `🔍 Investigador\nEntre ${pair[0].name} y ${pair[1].name} hay un/una ${ROLES[fakeRole]?.name || fakeRole}.`;
    }
    case 'COOK': {
      const real = countEvilNeighborPairs(game.players, game);
      return `🍳 Cocinero\nHay ${falsifyCount(real, 0, Math.min(3, Math.floor(game.players.length / 2)))} pareja(s) de vecinos malvados.`;
    }
    case 'FORTUNE_TELLER': {
      const [a, b] = pickTwo();
      const pair = shuffle([a, b]);
      const fakeResult = Math.random() > 0.5 ? '✅ SÍ hay Demonio' : '❌ NO hay Demonio';
      return `🔮 Adivina\nEntre ${pair[0].name} y ${pair[1].name}: ${fakeResult}.`;
    }
    case 'UNDERTAKER': {
      const target = rand(others);
      if (!target) return null;
      const fakeRole = rand(fakeTownfolkRoles.filter(r => r !== target.role));
      return `⚰️ Sepulturero\nEl ejecutado (${target.name}) era: ${ROLES[fakeRole]?.name || fakeRole}.`;
    }
    case 'MONK': {
      const target = rand(others);
      return target ? `🛡️ Monje\nProtegiste a ${target.name} esta noche.` : null;
    }
    case 'RAVENKEEPER': {
      const target = rand(others);
      if (!target) return null;
      const fakeRole = rand(fakeTownfolkRoles.filter(r => r !== target.role));
      return `🦅 Criacuervos\nEl rol de ${target.name} es: ${ROLES[fakeRole]?.name || fakeRole}.`;
    }
    case 'BUTLER': {
      const target = rand(others);
      return target ? `🤵 Mayordomo: tu Amo esta noche es ${target.name}.` : null;
    }
    case 'POISONER': {
      const target = rand(others);
      return target ? `🧪 Envenenador: envenenaste a ${target.name} esta noche.` : null;
    }
    case 'IMP': {
      const target = rand(others);
      return target ? `👹 Diablillo: atacaste a ${target.name} esta noche.` : null;
    }
    case 'SPY': {
      const fakeGrimoire = shuffle([...others]).slice(0, Math.min(4, others.length)).map(pl => {
        const fakeRole = rand([...fakeTownfolkRoles, ...fakeMinionRoles]);
        return `${pl.name}: ${ROLES[fakeRole]?.name || fakeRole}`;
      });
      return `🕵️ GRIMORIO (falso):\n${fakeGrimoire.join('\n')}`;
    }
    case 'SCARLET_WOMAN':
      return `🩸 Dama Escarlata: el Demonio sigue vivo.`;
    default:
      return null;
  }
}

function isEvilForInfo(p, game) {
  if (p.alignment === 'evil') return true;
  if (p.role === 'RECLUSE' && game?.recluseRegistersAs) return true;
  return false;
}

function isEvilNeighbor(p, game = null) {
  if (p.role === 'SPY') return false;    // Espía siempre registra como bueno
  // FIX: Recluso registra como malo aleatoriamente (50% de probabilidad)
  if (p.role === 'RECLUSE') {
    return game?.recluseRegistersAsEvil ?? Math.random() < 0.5;
  }
  return p.alignment === 'evil';
}

function countEvilNeighbors(player, allPlayers, game = null) {
  const idx = allPlayers.findIndex(p => p.id === player.id);
  if (idx === -1) return 0;
  
  // FIX: Buscar vecinos VIVOS más cercanos (no solo vecinos directos)
  const livingPlayers = allPlayers.filter(p => p.alive);
  const livingIdx = livingPlayers.findIndex(p => p.id === player.id);
  
  if (livingIdx === -1 || livingPlayers.length <= 1) return 0;
  
  // Encontrar vecinos vivos en el círculo de jugadores vivos
  const left = livingPlayers[(livingIdx - 1 + livingPlayers.length) % livingPlayers.length];
  const right = livingPlayers[(livingIdx + 1) % livingPlayers.length];
  
  // Contar cuántos vecinos vivos son malvados (pasar game para Recluso)
  return [left, right].filter(p => p && p.id !== player.id && isEvilNeighbor(p, game)).length;
}

function countEvilNeighborPairs(living, game = null) {
  let pairs = 0;
  for (let i = 0; i < living.length; i++) {
    const curr = living[i];
    const next = living[(i + 1) % living.length];
    if (isEvilForInfo(curr, game) && isEvilForInfo(next, game)) pairs++;
  }
  return pairs;
}

// ── Motor de fichas con ciclo de vida (BotC reminder tokens) ──────────
// Caducidades (expiry): 'PERMANENT' | 'UNTIL_NEXT_DUSK' | 'AT_DAWN'
//                       'ONE_DAY' | 'ON_REPLACE' | 'ON_BEARER_DEATH'
const DUSK_EXPIRY = new Set(['UNTIL_NEXT_DUSK', 'ONE_DAY']);

// Coloca una ficha sobre el portador. Aplica ON_REPLACE (una por fuente,
// incluso si la fuente la tenía sobre OTRO jugador). Registra en el log.
function placeToken(target, opts, game = null) {
  if (!target) return;
  const { type, roleId, label, expiry = ['PERMANENT'], sourceRole = null, sourcePlayerId = null, manual = false } = opts;
  if (!Array.isArray(target.tokens)) target.tokens = [];

  if (expiry.includes('ON_REPLACE') && sourcePlayerId) {
    // La misma fuente solo mantiene 1 ficha de este tipo: quítala de cualquier portador.
    const players = game ? game.players : [target];
    for (const p of players) {
      if (Array.isArray(p.tokens)) p.tokens = p.tokens.filter(t => !(t.type === type && t.sourcePlayerId === sourcePlayerId));
    }
  }

  const temp = !manual && !expiry.includes('PERMANENT');
  const instanceId = `${type}:${sourcePlayerId || roleId || 'x'}:${manual ? 'm' : 'a'}`;
  if (!target.tokens.some(t => t.instanceId === instanceId)) {
    target.tokens.push({
      instanceId, type, tokenId: type,
      roleId: roleId || sourceRole || null,
      label, expiry, sourceRole, sourcePlayerId, manual, temp,
      nightApplied: game?.nightNumber ?? null,
      dayApplied: game?.dayNumber ?? null,
    });
    if (game) logStatus(game, `🟡 ${label} → ${target.name}${sourceRole ? ` (por ${ROLES[sourceRole]?.name || sourceRole})` : ''}`);
  }
}

// Limpia fichas que caducan en este momento de fase. Nunca toca las manuales.
function clearExpiringTokens(game, when) {
  for (const p of game.players) {
    if (!Array.isArray(p.tokens) || p.tokens.length === 0) continue;
    const before = p.tokens.length;
    p.tokens = p.tokens.filter(t => {
      if (t.manual) return true;
      const exp = t.expiry || [];
      if (when === 'dawn') return !exp.includes('AT_DAWN');
      if (when === 'dusk') return !exp.some(e => DUSK_EXPIRY.has(e));
      return true;
    });
    if (p.tokens.length !== before) logStatus(game, `🧹 ${when === 'dawn' ? 'Amanecer' : 'Anochecer'}: fichas caducadas de ${p.name}`);
  }
}

// Al morir el portador: quita fichas con ON_BEARER_DEATH (salvo manuales).
function clearBearerDeathTokens(player) {
  if (!Array.isArray(player.tokens)) return;
  player.tokens = player.tokens.filter(t => t.manual || !(t.expiry || []).includes('ON_BEARER_DEATH'));
}

// Recalcula banderas derivadas que el resto del motor consulta.
function syncStatusFlags(game) {
  for (const p of game.players) {
    const toks = p.tokens || [];
    p.poisoned  = toks.some(t => t.type === 'POISONED' || t.type === 'DRUNK_NIGHT');
    p.protected = toks.some(t => t.type === 'PROTECTED');
  }
}

// ── Asistente: efectos diferidos / condicionales (data-driven) ────────
// Cada demonio declara su regla; añadir uno nuevo = añadir un dato, no código.
const DEFERRED_RULES = {
  PO:         { trigger: 'noKill', dueOffset: 1, label: '⚠ El Po no mató anoche → esta noche debe elegir 3 jugadores.' },
  PUKKA:      { trigger: 'poison', dueOffset: 1, label: '⚠ El jugador envenenado por el Pukka muere esta noche; el veneno pasa a otro.' },
  SHABALOTH:  { trigger: 'kill2',  dueOffset: 1, label: '🔁 El Shabaloth puede regurgitar (revivir) a uno de los que mató anoche.' },
  ZOMBUUL:    { trigger: 'cond',   dueOffset: 0, label: 'ℹ El Zombuul solo mata de noche si NADIE murió durante el día.' },
  GODFATHER:  { trigger: 'outsiderDied', dueOffset: 0, label: '🎯 Si murió un Forastero hoy, el Padrino elige un jugador esta noche: muere.' },
};

function deferredOptionsFor(game) {
  // Reglas de los demonios/esbirros presentes, para ofrecer el botón correcto.
  const out = [];
  const seen = new Set();
  for (const p of game.players) {
    const rule = DEFERRED_RULES[p.role];
    if (rule && !seen.has(p.role)) {
      seen.add(p.role);
      out.push({ role: p.role, roleName: ROLES[p.role]?.name || p.role, sourcePlayerId: p.id, ...rule });
    }
  }
  return out;
}

function addDeferred(game, { label, dueNight, sourcePlayerId, severity = 'warn', role = null }) {
  if (!Array.isArray(game.deferredEffects)) game.deferredEffects = [];
  game.deferredEffects.push({ id: uuidv4(), label, dueNight, sourcePlayerId, severity, role, createdNight: game.nightNumber, resolved: false });
  logStatus(game, `🗓 Pendiente registrado: ${label}`);
}

function isActorEffective(actor) {
  if (!actor) return false;
  if (actor.poisoned) return false;
  if (actor.drunkAs) return false;
  return true;
}

function checkFoolProtection(game, target, actorId, artRole) {
  if (target.role === 'FOOL' && !target.foolUsed && !target.poisoned) {
    target.foolUsed = true;
    addDeferred(game, {
      label: `🃏 ${target.name} (Tonto) sobrevivió su primera muerte esta noche`,
      dueNight: game.nightNumber,
      sourcePlayerId: actorId,
      severity: 'info',
      role: 'FOOL',
    });
    return true;
  }
  return false;
}

// Consejos proactivos según el estado actual de la partida.
function computeAdvice(game) {
  const advice = [];
  const alive = game.players.filter(p => p.alive);
  const isNight = ['first_night', 'night'].includes(game.phase);

  // Pendientes diferidos que vencen ahora.
  for (const d of (game.deferredEffects || [])) {
    if (!d.resolved && d.dueNight <= game.nightNumber) {
      let txt = d.label;
      // Po: si debía matar 3 pero hay menos vivos, ajusta el aviso.
      if (d.role === 'PO' && txt.includes('3') && alive.length < 3) {
        txt = `⚠ El Po debía matar 3, pero solo quedan ${alive.length} vivos → mata a quién pueda.`;
      }
      advice.push({ severity: d.severity || 'warn', text: txt, deferredId: d.id });
    }
  }

  // Envenenados hoy → info falsa.
  for (const p of game.players) {
    if (p.alive && p.poisoned) advice.push({ severity: 'warn', text: `🧪 ${p.name} está envenenado: cualquier información que dé o reciba debe ser FALSA.` });
  }

  // Misperception (Marioneta/Lunático/Borracho): su habilidad no funciona → info falsa.
  for (const p of game.players) {
    if (!p.alive) continue;
    const m = ROLES[p.role]?.misperception;
    if (!m) continue;
    const believedName = ROLES[p.believedRole]?.name || 'un rol bueno';
    advice.push({ severity: 'info', text: `🎭 ${p.name} es ${ROLES[p.role]?.name} pero CREE ser ${believedName}. Su habilidad no funciona: dale información FALSA coherente con ${believedName}.` });
    if (m.wakesWithEvil === false && isNight && game.nightNumber === 1) {
      advice.push({ severity: 'warn', text: `🎭 ${ROLES[p.role]?.name} (${p.name}) NO despierta con el mal y los Esbirros no la conocen; el Demonio sí. Colócala vecina del Demonio.` });
    }
  }

  // 3 vivos → aviso victoria del mal.
  if (alive.length === 3) advice.push({ severity: 'info', text: 'Quedan 3 jugadores vivos: si baja a 2, gana el Mal (los viajeros no cuentan).' });

  // Espía despierto esta noche.
  if (isNight && game.players.some(p => p.alive && p.role === 'SPY')) {
    advice.push({ severity: 'info', text: '🕵️ El Espía ve el Grimorio esta noche: recuerda mostrarle tu pantalla.' });
  }

  // Fichas que se limpian al próximo anochecer (veneno).
  if (!isNight) {
    for (const p of game.players) {
      const t = (p.tokens || []).find(x => (x.expiry || []).includes('UNTIL_NEXT_DUSK'));
      if (t) advice.push({ severity: 'info', text: `⏳ La ficha "${t.label}" de ${p.name} se limpia al anochecer.` });
    }
  }

  return advice;
}

// Log de auditoría de estados.
function logStatus(game, message) {
  if (!Array.isArray(game.statusLog)) game.statusLog = [];
  game.statusLog.push({ t: Date.now(), night: game.nightNumber, day: game.dayNumber, message });
  if (game.statusLog.length > 200) game.statusLog.shift();
}

function applyNightAction(game, actionType, actorId, targetIds) {
  const actor   = game.players.find(p => p.id === actorId);
  const targets = targetIds.map(id => game.players.find(p => p.id === id)).filter(Boolean);
  // Rol cuyo arte se muestra en la ficha (el del actor; fallback por tipo de acción).
  const artRole = actor?.role || null;

  switch (actionType) {
    case 'POISON':
    case 'POISONER_ACTION':
      if (targets[0]) {
        // Veneno: dura esta noche y el día siguiente; se limpia al próximo anochecer.
        // Una sola persona envenenada por este Envenenador a la vez (ON_REPLACE).
        placeToken(targets[0], {
          type: 'POISONED', roleId: artRole || 'POISONER', label: 'Envenenado',
          expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: artRole || 'POISONER', sourcePlayerId: actorId,
        }, game);
      }
      break;

    case 'PROTECT':
    case 'MONK_PROTECT':
      if (targets[0] && isActorEffective(actor)) {
        // Protección del Monje: solo esta noche; se limpia al amanecer.
        placeToken(targets[0], {
          type: 'PROTECTED', roleId: artRole || 'MONK', label: 'A salvo',
          expiry: ['AT_DAWN', 'ON_REPLACE'], sourceRole: artRole || 'MONK', sourcePlayerId: actorId,
        }, game);
      }
      break;

    case 'IMP_KILL': {
      // FIX: Si el demonio está envenenado, no puede matar
      if (actor?.poisoned) {
        break;
      }
      
      const target = targets[0];
      if (!target) break;
      if (target.id === actorId) {
        // FIX: Si el demonio está protegido, no puede matarse a sí mismo
        if (target.protected) {
          // blocked
        } else {
          target.alive = false;
          clearBearerDeathTokens(target);
          game.nightDeaths.push(target.id);
          placeToken(target, { type: 'DIES', roleId: artRole || 'IMP', label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole || 'IMP', sourcePlayerId: actorId }, game);
          // Salto de estrella: lo resuelve la cadena de sucesión.
          target.starPass = true;
          resolveDemonDeath(game, target);
        }
      } else if (target.role === 'SOLDIER' && !target.poisoned) {
        // blocked
      } else if (isDeathBlocked(game, target)) {
        // blocked: Sangijuela con anfitrión vivo, o vecino de la Dama del Té
      } else if (target.protected) {
        // blocked
      } else if (target.role === 'MAYOR' && !target.poisoned) {
        const pool = game.players.filter(p => p.alive && p.id !== target.id && p.type !== 'demon');
        if (pool.length > 0) {
          const redirectTarget = pool[Math.floor(Math.random() * pool.length)];
          if (!checkFoolProtection(game, redirectTarget, actorId, artRole)) {
            redirectTarget.alive = false;
            clearBearerDeathTokens(redirectTarget);
            game.nightDeaths.push(redirectTarget.id);
            placeToken(redirectTarget, { type: 'DIES', roleId: artRole || 'IMP', label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole || 'IMP', sourcePlayerId: actorId }, game);
            const isRealRaven = redirectTarget.role === 'RAVENKEEPER' && !redirectTarget.poisoned;
            const isDrunkRaven = redirectTarget.role === 'DRUNK' && redirectTarget.drunkAs === 'RAVENKEEPER';
            if (isRealRaven || isDrunkRaven) {
              redirectTarget.pendingRavenkeeper = true;
              redirectTarget.nightInfo = '🦅 Criacuervos\nMoriste esta noche.\nEl narrador te pedirá que elijas un jugador.';
              game.nightReadyPlayers = (game.nightReadyPlayers || []).filter(id => id !== redirectTarget.id);
            }
            checkScarletWoman(game, actor);
          }
        }
        // pool vacío (solo Alcalde + Demonio vivos) → Alcalde sobrevive
      } else {
        if (!checkFoolProtection(game, target, actorId, artRole)) {
          target.alive = false;
          clearBearerDeathTokens(target);
          game.nightDeaths.push(target.id);
          placeToken(target, { type: 'DIES', roleId: artRole || 'IMP', label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole || 'IMP', sourcePlayerId: actorId }, game);
          const isRealRaven = target.role === 'RAVENKEEPER' && !target.poisoned;
          const isDrunkRaven = target.role === 'DRUNK' && target.drunkAs === 'RAVENKEEPER';
          if (isRealRaven || isDrunkRaven) {
            target.pendingRavenkeeper = true;
            target.nightInfo = '🦅 Criacuervos\nMoriste esta noche.\nEl narrador te pedirá que elijas un jugador.';
            game.nightReadyPlayers = (game.nightReadyPlayers || []).filter(id => id !== target.id);
          }
          ROLE_INFO.onDemonKill(game, target, addDeferred);
          checkLleechHostDeath(game, target);
          checkScarletWoman(game, actor);
        }
      }
      break;
    }

    case 'RAVENKEEPER_INFO':
      if (actor && targets[0]) {
        const fakeRK = ['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','FORTUNE_TELLER','MONK','VIRGIN','SLAYER','SOLDIER','MAYOR'];
        const rand2 = arr => arr[Math.floor(Math.random() * arr.length)];
        if (actor.role === 'DRUNK' || actor.poisoned) {
          const fakeRole = rand2(fakeRK.filter(r => r !== targets[0].role));
          actor.nightInfo = `🦅 Criacuervos\nEl rol de ${targets[0].name} es: ${ROLES[fakeRole]?.name || fakeRole}.`;
        } else {
          actor.nightInfo = `🦅 Criacuervos\nEl rol de ${targets[0].name} es: ${ROLES[targets[0].role]?.name || targets[0].role}.`;
        }
        actor.pendingRavenkeeper = false;
      }
      break;

    case 'UNDERTAKER_INFO':
      if (actor && game.executedToday) {
        const executed = game.players.find(p => p.id === game.executedToday);
        if (executed) actor.nightInfo = `⚰️ Sepulturero\nEl ejecutado (${executed.name}) era: ${ROLES[executed.role]?.name}.`;
      }
      break;

    case 'BUTLER_MASTER':
      if (actor && targets[0]) {
        actor.butlerMaster = targets[0].id;
        // Amo: persiste hasta que el Mayordomo elija otro (ON_REPLACE por fuente).
        placeToken(targets[0], {
          type: 'MASTER', roleId: 'BUTLER', label: 'Es el Amo',
          expiry: ['ON_REPLACE'], sourceRole: 'BUTLER', sourcePlayerId: actorId,
        }, game);
      }
      break;

    case 'FORTUNE_TELLER': {
      if (!actor || targets.length < 2) break;
      if (actor.poisoned) {
        actor.nightInfo = `🔮 Adivina\nEntre ${targets.map(t=>t.name).join(' y ')}: ${Math.random() > 0.5 ? '✅ SÍ hay Demonio' : '❌ NO hay Demonio'}.`;
      } else {
        const isDemon = targets.some(t =>
          t.type === 'demon' || t.id === game.smokeScreenPlayerId
        );
        actor.nightInfo = `🔮 Adivina\nEntre ${targets.map(t=>t.name).join(' y ')}: ${isDemon ? '✅ SÍ hay Demonio' : '❌ NO hay Demonio'}.`;
      }
      break;
    }

    case 'EMPATH': {
      if (!actor) break;
      const count = actor.poisoned ? Math.floor(Math.random() * 3) : countEvilNeighbors(actor, game.players, game);
      actor.nightInfo = `💞 Empático\nTienes ${count} vecino(s) malvado(s) vivos.`;
      break;
    }

    case 'SPY_INFO': {
      if (!actor) break;
      const grimoire = game.players.map(p =>
        `${p.name}: ${ROLES[p.role]?.name || '?'} (${p.alive ? 'vivo' : 'muerto'}${p.poisoned ? ' 🤢' : ''}${p.protected ? ' 🛡' : ''})`
      );
      actor.nightInfo = '🕵️ GRIMORIO:\n' + grimoire.join('\n');
      break;
    }

    // ── Acciones genéricas para campañas con narrador (BMR / S&V) ──────
    // Rutas directas al bloque KILL (sin lógica extra)
    case 'VORTOX_KILL':
    case 'KAZALI_KILL':
    case 'LLEECH_KILL':
    case 'OJO_KILL':
    case 'LEGION_KILL':
    case 'GODFATHER_KILL':
    case 'NO_DASHII_KILL': // vecinos envenenados los gestiona el narrador
      // fall-through: idéntico a KILL
    case 'SHABALOTH_KILL': {
      if (actionType === 'SHABALOTH_KILL') game.shabalothLastKilled = targetIds;
      // fall-through
    }
    case 'KILL': {
      for (const t of targets) {
        if (!t || !t.alive) continue;
        if (t.protected || t.safeTonight) continue;
        if (isDeathBlocked(game, t)) continue;
        if (checkFoolProtection(game, t, actorId, artRole)) continue;
        if (zombuulFakeDeath(game, t)) continue;
        t.alive = false;
        clearBearerDeathTokens(t);
        game.nightDeaths.push(t.id);
        placeToken(t, { type: 'DIES', roleId: artRole || 'IMP', label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole, sourcePlayerId: actorId }, game);
        ROLE_INFO.onDemonKill(game, t, addDeferred);
        checkGrandmotherDeath(game, t, actorId, artRole);
        checkLleechHostDeath(game, t);
        checkScarletWoman(game, actor);
      }
      break;
    }

    case 'ASSASSIN_KILL': {
      // Ignora toda protección (incluida la muerte fingida del Zombuul)
      for (const t of targets) {
        if (!t || !t.alive) continue;
        if (t.role === 'ZOMBUUL') t.zombuulReallyDead = true;
        t.alive = false;
        clearBearerDeathTokens(t);
        game.nightDeaths.push(t.id);
        placeToken(t, { type: 'DIES', roleId: artRole || 'ASSASSIN', label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole, sourcePlayerId: actorId }, game);
        checkGrandmotherDeath(game, t, actorId, artRole);
        checkScarletWoman(game, actor);
      }
      break;
    }

    case 'FANG_GU_KILL': {
      const t = targets[0]; if (!t || !t.alive) break;
      if (t.type === 'outsider' && !t.poisoned && !t.protected && !t.safeTonight) {
        const oldRole = actor.role;
        t.role = oldRole; t.type = 'demon'; t.alignment = 'evil';
        actor.alive = false; game.nightDeaths.push(actor.id);
        addDeferred(game, { label: `🌿 Fang Gu saltó a ${t.name} — nuevo Fang Gu (malvado)`, dueNight: game.nightNumber, severity: 'warn', role: 'FANG_GU' });
      } else {
        if (!t.protected && !t.safeTonight && !checkFoolProtection(game, t, actorId, artRole)) {
          t.alive = false; clearBearerDeathTokens(t); game.nightDeaths.push(t.id);
          placeToken(t, { type: 'DIES', roleId: artRole, label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole, sourcePlayerId: actorId }, game);
          checkGrandmotherDeath(game, t, actorId, artRole);
          checkScarletWoman(game, actor);
        }
      }
      break;
    }

    case 'VIGORMORTIS_KILL': {
      const t = targets[0]; if (!t || !t.alive) break;
      if (!t.protected && !t.safeTonight && !checkFoolProtection(game, t, actorId, artRole)) {
        t.alive = false; clearBearerDeathTokens(t); game.nightDeaths.push(t.id);
        placeToken(t, { type: 'DIES', roleId: artRole, label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole, sourcePlayerId: actorId }, game);
        if (t.type === 'minion') { t.vigormortisAlive = true; vigormortisPoisonNeighbor(game, t, actorId); }
        ROLE_INFO.onDemonKill(game, t, addDeferred);
        checkGrandmotherDeath(game, t, actorId, artRole);
        checkLleechHostDeath(game, t);
        checkScarletWoman(game, actor);
      }
      break;
    }

    case 'ZOMBUUL_KILL': {
      const t = targets[0]; if (!t) break;
      if (!t.alive || t.protected || t.safeTonight) break;
      if (checkFoolProtection(game, t, actorId, artRole)) break;
      if (t.id === actorId && !actor.zombuulFirstDied) {
        actor.zombuulFirstDied = true;
        addDeferred(game, { label: `🧟 Zombuul aparenta estar muerto — ¡sigue vivo!`, dueNight: game.nightNumber, severity: 'warn', role: 'ZOMBUUL' });
        break;
      }
      t.alive = false; clearBearerDeathTokens(t); game.nightDeaths.push(t.id);
      placeToken(t, { type: 'DIES', roleId: artRole, label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole, sourcePlayerId: actorId }, game);
      checkGrandmotherDeath(game, t, actorId, artRole);
      checkScarletWoman(game, actor);
      break;
    }

    case 'PUKKA_POISON': {
      // Matar al envenenado de la noche anterior
      if (game.pukkaLastPoisoned) {
        const prev = game.players.find(p => p.id === game.pukkaLastPoisoned);
        if (prev?.alive && !prev.protected && !prev.safeTonight) {
          prev.alive = false; clearBearerDeathTokens(prev); game.nightDeaths.push(prev.id);
          placeToken(prev, { type: 'DIES', roleId: 'PUKKA', label: 'Muere (Pukka)', expiry: ['AT_DAWN'], sourceRole: 'PUKKA', sourcePlayerId: actorId }, game);
          checkGrandmotherDeath(game, prev, actorId, 'PUKKA');
        }
      }
      // Envenenar al nuevo objetivo
      if (targets[0]) {
        placeToken(targets[0], { type: 'POISONED', roleId: 'PUKKA', label: 'Envenenado (Pukka)', expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: 'PUKKA', sourcePlayerId: actorId }, game);
        game.pukkaLastPoisoned = targets[0].id;
      }
      break;
    }

    case 'INNKEEPER_PROTECT': {
      // targetIds: [prot1, prot2, drunkId]
      const [ip1, ip2, iDrunk] = targets;
      for (const t of [ip1, ip2]) {
        if (t) {
          t.safeTonight = true;
          placeToken(t, { type: 'SAFE_TONIGHT', roleId: 'INNKEEPER', label: 'A salvo', expiry: ['AT_DAWN', 'ON_REPLACE'], sourceRole: 'INNKEEPER', sourcePlayerId: actorId }, game);
        }
      }
      if (iDrunk) placeToken(iDrunk, { type: 'DRUNK_NIGHT', roleId: 'INNKEEPER', label: 'Borracho', expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: 'INNKEEPER', sourcePlayerId: actorId }, game);
      break;
    }

    case 'SAILOR_DRUNK': {
      if (actor) { actor.safeTonight = true; }
      if (targets[0]) placeToken(targets[0], { type: 'DRUNK_NIGHT', roleId: 'SAILOR', label: 'Borracho', expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: 'SAILOR', sourcePlayerId: actorId }, game);
      break;
    }

    case 'DEVILS_ADVOCATE_PROTECT': {
      if (targets[0] && isActorEffective(actor)) placeToken(targets[0], {
        type: 'SURVIVES_EXECUTION', roleId: 'DEVILS_ADVOCATE', label: 'Sobrevive ejecución',
        expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: 'DEVILS_ADVOCATE', sourcePlayerId: actorId,
      }, game);
      break;
    }

    case 'WITCH_CURSE': {
      if (targets[0] && isActorEffective(actor)) placeToken(targets[0], {
        type: 'WITCH_CURSED', roleId: 'WITCH', label: 'Maldito',
        expiry: ['ON_REPLACE'], sourceRole: 'WITCH', sourcePlayerId: actorId,
      }, game);
      break;
    }

    case 'GRANDMOTHER_INFO': {
      if (actor && targets[0]) {
        game.grandmotherGrandchild = targets[0].id;
        const t = targets[0];
        actor.nightInfo = actor.poisoned
          ? `👵 Abuela\nJugador bueno: (FALSO — envenenada).`
          : `👵 Abuela\nNieto: ${t.name} (${ROLES[t.role]?.name || t.role}).`;
      }
      break;
    }

    case 'PROFESSOR_REVIVE': {
      if (!actor || !targets[0]) break;
      const prTarget = targets[0];
      if (!prTarget.alive && !actor.poisoned && prTarget.type === 'townfolk') {
        prTarget.alive = true; prTarget.deadVoteNominationId = null;
        game.nightDeaths = game.nightDeaths.filter(id => id !== prTarget.id);
        addDeferred(game, { label: `🎓 Profesor revivió a ${prTarget.name}`, dueNight: game.nightNumber, severity: 'info', role: 'PROFESSOR' });
      }
      break;
    }

    case 'EXORCIST_CHOOSE': {
      if (targets[0] && isActorEffective(actor)) {
        placeToken(targets[0], { type: 'EXORCISED', roleId: 'EXORCIST', label: 'Exorcizado', expiry: ['AT_DAWN', 'ON_REPLACE'], sourceRole: 'EXORCIST', sourcePlayerId: actorId }, game);
        if (targets[0].type === 'demon') targets[0].safeTonight = true;
      }
      break;
    }

    case 'ACROBAT_CHECK': {
      if (!actor || !targets[0] || !isActorEffective(actor)) break;
      const acrobatTarget = targets[0];
      const tDrunk = acrobatTarget.poisoned || (acrobatTarget.tokens || []).some(tk => ['DRUNK_NIGHT', 'DRUNK'].includes(tk.type));
      if (tDrunk) {
        actor.alive = false; clearBearerDeathTokens(actor); game.nightDeaths.push(actor.id);
        placeToken(actor, { type: 'DIES', roleId: 'ACROBAT', label: 'Muere (Acróbata)', expiry: ['AT_DAWN'], sourceRole: 'ACROBAT', sourcePlayerId: actor.id }, game);
      }
      break;
    }

    case 'FEARMONGER': {
      // Marca al objetivo del miedo. Si el propio Fearmonger lo nomina y ejecuta,
      // el equipo del ejecutado pierde (se resuelve en executeNominationWinner).
      if (targets[0]) {
        placeToken(targets[0], {
          type: 'FEARMONGER_MARK', roleId: 'FEARMONGER', label: 'Objetivo del miedo',
          expiry: ['ON_REPLACE'], sourceRole: 'FEARMONGER', sourcePlayerId: actorId,
        }, game);
        addDeferred(game, {
          label: '😨 Anuncia al amanecer: "El Sembrador de Miedo ha elegido a un jugador."',
          dueNight: game.nightNumber, sourcePlayerId: actorId, severity: 'info', role: 'FEARMONGER',
        });
      }
      break;
    }

    // ── Soñador: 1 personaje bueno + 1 malvado, uno de ellos el real ────
    case 'DREAMER_INFO': {
      if (!actor || !targets[0]) break;
      const t = targets[0];
      const campaign = getCampaign(game.campaignId);
      const poolOf = align => Object.values(campaign.roles)
        .filter(r => r.alignment === align && r.id !== t.role && !r.misperception)
        .map(r => r.id);
      const pickOne = arr => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
      const realIsGood = t.alignment === 'good';
      // Borracho/envenenado: los DOS personajes son falsos.
      const impaired = !isActorEffective(actor);
      const goodId = (!impaired && realIsGood) ? t.role : pickOne(poolOf('good'));
      const evilId = (!impaired && !realIsGood) ? t.role : pickOne(poolOf('evil'));
      actor.nightInfo = `💭 Soñador\n${t.name} es ${ROLES[goodId]?.name || '?'} o ${ROLES[evilId]?.name || '?'}.`;
      break;
    }

    // ── Costurera: ¿son los 2 elegidos de la misma alineación? ───────────
    case 'SEAMSTRESS_INFO': {
      if (!actor || targets.length < 2) break;
      const same = targets[0].alignment === targets[1].alignment;
      const shown = isActorEffective(actor) ? same : !same;
      actor.seamstressUsed = true;
      actor.nightInfo = `🧵 Costurera\n${targets[0].name} y ${targets[1].name} ${shown ? 'SON' : 'NO son'} de la misma alineación.`;
      break;
    }

    // ── Sirvienta: cuántos de los 2 despertaron esta noche ───────────────
    case 'CHAMBERMAID_INFO': {
      if (!actor || targets.length < 2) break;
      const queue = new Set(game.nightQueue || []);
      const real = targets.filter(t => queue.has(t.id)).length;
      const shown = isActorEffective(actor) ? real : falsifyCount(real, 0, 2);
      actor.nightInfo = `🧹 Sirvienta\n${shown} de esos 2 jugadores despertaron esta noche por su habilidad.`;
      break;
    }

    // ── Matón: el primero que lo elija se emborracha; él cambia de bando ──
    case 'GOON_TRIGGER': {
      if (!actor || !targets[0]) break;
      if (actor.goonNight === game.nightNumber) break; // solo el PRIMERO
      actor.goonNight = game.nightNumber;
      placeToken(targets[0], {
        type: 'DRUNK_NIGHT', roleId: 'GOON', label: 'Borracho (Matón)',
        expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: 'GOON', sourcePlayerId: actorId,
      }, game);
      actor.alignment = targets[0].alignment;
      addDeferred(game, {
        label: `👊 Matón: ${targets[0].name} fue el primero en elegirlo — queda borracho y el Matón pasa a ser ${actor.alignment === 'evil' ? 'MALVADO' : 'BUENO'}.`,
        dueNight: game.nightNumber, sourcePlayerId: actorId, severity: 'warn', role: 'GOON',
      });
      break;
    }

    case 'LLEECH_HOST': {
      if (!targets[0]) break;
      game.lleechHostId = targets[0].id;
      placeToken(targets[0], {
        type: 'POISONED', roleId: 'LLEECH', label: 'Anfitrión de la Sangijuela (envenenado)',
        expiry: ['PERMANENT'], sourceRole: 'LLEECH', sourcePlayerId: actorId,
      }, game);
      addDeferred(game, {
        label: `🩸 Sangijuela: ${targets[0].name} es el anfitrión — envenenado de forma permanente. Si muere, la Sangijuela muere con él.`,
        dueNight: game.nightNumber, sourcePlayerId: actorId, severity: 'warn', role: 'LLEECH',
      });
      break;
    }

    case 'MAKE_DRUNK':
      // Borracho de una noche (≈ envenenado): se limpia al próximo anochecer.
      for (const t of targets) if (t) placeToken(t, {
        type: 'DRUNK_NIGHT', roleId: artRole, label: 'Borracho',
        expiry: ['UNTIL_NEXT_DUSK', 'ON_REPLACE'], sourceRole: artRole, sourcePlayerId: actorId,
      }, game);
      break;

    case 'SAFE':
      for (const t of targets) if (t) { t.safeTonight = true; placeToken(t, {
        type: 'SAFE_TONIGHT', roleId: artRole, label: 'A salvo',
        expiry: ['AT_DAWN', 'ON_REPLACE'], sourceRole: artRole, sourcePlayerId: actorId,
      }, game); }
      break;

    case 'REVIVE':
      for (const t of targets) {
        if (!t) continue;
        t.alive = true;
        t.deadVoteNominationId = null;
        game.nightDeaths = game.nightDeaths.filter(id => id !== t.id);
      }
      break;

    case 'CLEAR_STATUS':
      for (const t of targets) { if (t) { t.safeTonight = false; t.tokens = (t.tokens || []).filter(x => x.manual); } }
      break;
  }
  syncStatusFlags(game);
  syncBarberState(game);
  return game;
}

// ── Barbero ──────────────────────────────────────────────────────────
// Si el Barbero muere (de día o de noche), esa noche el Demonio puede
// intercambiar los personajes de 2 jugadores cualesquiera.
function syncBarberState(game) {
  const barber = game.players.find(p => p.role === 'BARBER');
  if (!barber) return;
  const alreadyOpen = (barber.tokens || []).some(t => t.type === 'BARBER_TONIGHT');
  if (barber.alive || barber.barberResolved || alreadyOpen) return;
  // Si ya estaba muerto ANTES de convertirse en Barbero, no hay intercambio.
  if (barber.becameBarberAfterDeath) { barber.barberResolved = true; return; }
  if (barber.poisoned) { barber.barberResolved = true; return; }

  placeToken(barber, {
    type: 'BARBER_TONIGHT', roleId: 'BARBER', label: 'Corte de pelo esta noche',
    expiry: ['PERMANENT'], sourceRole: 'BARBER', sourcePlayerId: barber.id,
  }, game);
  addDeferred(game, {
    label: '💈 El Barbero ha muerto: esta noche el Demonio puede intercambiar los personajes de 2 jugadores (o declinar). No cierres la noche sin resolverlo.',
    dueNight: game.nightNumber, sourcePlayerId: barber.id, severity: 'warn', role: 'BARBER',
  });
}

// Intercambia los personajes de dos jugadores conservando su alineación.
// Si el intercambio mueve al Demonio, la partida NO termina: hay Demonio nuevo.
function barberSwap(game, aId, bId) {
  const a = game.players.find(p => p.id === aId);
  const b = game.players.find(p => p.id === bId);
  if (!a || !b || a.id === b.id) throw new Error('Elige dos jugadores distintos');

  const aRole = a.role, aType = a.type;
  a.role = b.role; a.type = b.type;
  b.role = aRole;  b.type = aType;
  // La alineación NO cambia: un bueno que recibe un personaje malvado sigue siendo bueno.
  a.drunkAs = null; b.drunkAs = null;
  a.believedRole = null; b.believedRole = null;

  closeBarberStep(game);
  syncStatusFlags(game);
  // El Demonio puede haber cambiado de asiento (o de bando): recalcula sin terminar la partida a lo tonto.
  checkWinCondition(game);
  addDeferred(game, {
    label: `💈 Barbero: ${a.name} y ${b.name} intercambian personaje (${ROLES[b.role]?.name || b.role} ↔ ${ROLES[a.role]?.name || a.role}). Las alineaciones NO cambian.`,
    dueNight: game.nightNumber, severity: 'warn', role: 'BARBER',
  });
  return { a, b };
}

function closeBarberStep(game) {
  const barber = game.players.find(p => (p.tokens || []).some(t => t.type === 'BARBER_TONIGHT'));
  if (barber) {
    barber.tokens = (barber.tokens || []).filter(t => t.type !== 'BARBER_TONIGHT');
    barber.barberResolved = true;
  }
  // Si el Barbero cambió de personaje en el propio intercambio, cierra por bandera global.
  game.players.forEach(p => { if (p.role === 'BARBER' && !p.alive) p.barberResolved = true; });
}

function checkGrandmotherDeath(game, killed, actorId, artRole) {
  if (!game.grandmotherGrandchild || killed.id !== game.grandmotherGrandchild) return;
  const gm = game.players.find(p => p.role === 'GRANDMOTHER' && p.alive && !p.poisoned);
  if (!gm) return;
  gm.alive = false; clearBearerDeathTokens(gm); game.nightDeaths.push(gm.id);
  placeToken(gm, { type: 'DIES', roleId: 'GRANDMOTHER', label: 'Muere con nieto', expiry: ['AT_DAWN'], sourceRole: 'GRANDMOTHER', sourcePlayerId: actorId }, game);
  addDeferred(game, { label: `👵 La Abuela murió junto a su nieto ${killed.name}`, dueNight: game.nightNumber, severity: 'info', role: 'GRANDMOTHER' });
}

// ── Sangijuela (Lleech) ──────────────────────────────────────────────
// Mientras su anfitrión viva, la Sangijuela no puede morir. Si el anfitrión
// muere, la Sangijuela muere con él.
function lleechHostAlive(game) {
  const hostId = game.lleechHostId || null;
  if (!hostId) return false;
  const host = game.players.find(p => p.id === hostId);
  return !!host && host.alive;
}
function isLleechImmune(game, target) {
  return target.role === 'LLEECH' && !target.poisoned && lleechHostAlive(game);
}
// El anfitrión acaba de morir: arrastra a la Sangijuela.
function checkLleechHostDeath(game, dead) {
  if (!game.lleechHostId || dead.id !== game.lleechHostId) return;
  const lleech = game.players.find(p => p.role === 'LLEECH' && p.alive);
  if (!lleech) return;
  lleech.alive = false;
  clearBearerDeathTokens(lleech);
  game.nightDeaths.push(lleech.id);
  placeToken(lleech, { type: 'DIES', roleId: 'LLEECH', label: 'Muere con su anfitrión', expiry: ['AT_DAWN'], sourceRole: 'LLEECH' }, game);
  addDeferred(game, {
    label: `🩸 El anfitrión de la Sangijuela (${dead.name}) ha muerto — la Sangijuela muere con él.`,
    dueNight: game.nightNumber, sourcePlayerId: lleech.id, severity: 'warn', role: 'LLEECH',
  });
  resolveDemonDeath(game, lleech);
}

// ── Dama del Té ──────────────────────────────────────────────────────
// Si sus dos vecinos VIVOS son buenos, esos vecinos no pueden morir.
function teaLadyProtects(game, target) {
  const tl = game.players.find(p => p.role === 'TEA_LADY' && p.alive && !p.poisoned && !p.drunkAs);
  if (!tl) return false;
  const alive = game.players.filter(p => p.alive);
  const i = alive.findIndex(p => p.id === tl.id);
  if (i === -1 || alive.length < 3) return false;
  const left  = alive[(i - 1 + alive.length) % alive.length];
  const right = alive[(i + 1) % alive.length];
  if (left.alignment !== 'good' || right.alignment !== 'good') return false;
  return target.id === left.id || target.id === right.id;
}

// ¿Alguna regla pasiva impide esta muerte? (Sangijuela, Dama del Té)
function isDeathBlocked(game, target) {
  if (isLleechImmune(game, target)) {
    addDeferred(game, {
      label: '🩸 La Sangijuela no puede morir mientras viva su anfitrión.',
      dueNight: game.nightNumber, sourcePlayerId: target.id, severity: 'info', role: 'LLEECH',
    });
    return true;
  }
  if (teaLadyProtects(game, target)) {
    addDeferred(game, {
      label: `🫖 Dama del Té: ${target.name} es su vecino bueno — no puede morir.`,
      dueNight: game.nightNumber, sourcePlayerId: target.id, severity: 'info', role: 'TEA_LADY',
    });
    return true;
  }
  return false;
}

// ── Vigormortis: el Esbirro muerto envenena a un Aldeano vecino ──────
function vigormortisPoisonNeighbor(game, deadMinion, actorId) {
  const seats = game.players;
  const i = seats.findIndex(p => p.id === deadMinion.id);
  if (i === -1) return;
  const n = seats.length;
  const victim = [seats[(i - 1 + n) % n], seats[(i + 1) % n]]
    .find(p => p && p.alive && p.type === 'townfolk');
  if (!victim) return;
  placeToken(victim, {
    type: 'POISONED', roleId: 'VIGORMORTIS', label: 'Envenenado (Vigormortis)',
    expiry: ['PERMANENT'], sourceRole: 'VIGORMORTIS', sourcePlayerId: actorId,
  }, game);
  addDeferred(game, {
    label: `🧟 Vigormortis: ${deadMinion.name} conserva su habilidad y envenena a su vecino Aldeano ${victim.name}.`,
    dueNight: game.nightNumber, sourcePlayerId: deadMinion.id, severity: 'warn', role: 'VIGORMORTIS',
  });
}

// ── Sucesión del Demonio ─────────────────────────────────────────────
// Un Demonio acaba de morir. Resuelve, EN ESTE ORDEN, quién ocupa su lugar.
// Devuelve true si la partida debe continuar (hay sucesor o se aplaza el final).
//   1. ¿Ya queda otro Demonio vivo? (Legión, Fang Gu ya transferido, dos Demonios…)
//   2. Sucesor propio del Demonio muerto (Pequeña Monsta, Diablillo autoatacado…)
//   3. Dama Escarlata → hereda EL MISMO personaje del Demonio muerto
//   4. Rata de Laboratorio → el nuevo Demonio hereda una habilidad buena
//   5. Mente Maestra → día extra sin anuncio
function resolveDemonDeath(game, deadDemon) {
  if (!deadDemon || deadDemon.type !== 'demon' || deadDemon.alive) return false;

  // 1. Otro Demonio sigue vivo: nada que suceder.
  const otherDemon = game.players.find(p => p.id !== deadDemon.id && countsAsLivingDemon(p));
  if (otherDemon) return true;

  // 2. Sucesor propio del personaje.
  if (promoteOwnSuccessor(game, deadDemon)) return true;

  // 3. Dama Escarlata: hereda el personaje exacto, no un Diablillo fijo.
  const scarlet = game.players.find(p => p.role === 'SCARLET_WOMAN' && p.alive && isActorEffective(p));
  const liveCount = game.players.filter(p => p.alive).length;
  if (scarlet && liveCount >= 5) {
    scarlet.role = deadDemon.role;
    scarlet.type = 'demon';
    scarlet.alignment = 'evil';
    const demonName = ROLES[deadDemon.role]?.name || deadDemon.role;
    addDeferred(game, {
      label: `🔴 Dama Escarlata: ${scarlet.name} se convierte en ${demonName}. NO anuncies la muerte del Demonio — despiértala esta noche.`,
      dueNight: game.nightNumber, sourcePlayerId: scarlet.id, severity: 'warn', role: 'SCARLET_WOMAN',
    });
    // 4. Rata de Laboratorio: el Demonio nuevo también hereda una habilidad buena.
    grantBoffinAbility(game, scarlet);
    return true;
  }

  // 5. Mente Maestra: la partida no termina, se juega 1 día más en secreto.
  if (tryMastermindDefer(game)) return true;

  return false;
}

// Sucesores propios de cada personaje de Demonio.
function promoteOwnSuccessor(game, deadDemon) {
  switch (deadDemon.role) {
    // Diablillo: si se atacó a sí mismo, un Esbirro vivo pasa a ser Diablillo.
    case 'IMP': {
      if (!deadDemon.starPass) return false;
      const minion = game.players.find(p => p.type === 'minion' && p.alive);
      if (!minion) return false;
      deadDemon.starPass = false;
      minion.role = 'IMP'; minion.type = 'demon'; minion.alignment = 'evil';
      addDeferred(game, {
        label: `😈 Salto de estrella: ${minion.name} es el nuevo Diablillo. La partida continúa.`,
        dueNight: game.nightNumber, sourcePlayerId: minion.id, severity: 'warn', role: 'IMP',
      });
      grantBoffinAbility(game, minion);
      return true;
    }
    // Pequeña Monsta: la ficha pasa al siguiente Esbirro vivo que la cuide.
    case 'LIL_MONSTA': {
      const keeper = game.players.find(p => p.type === 'minion' && p.alive);
      if (!keeper) return false;
      placeToken(keeper, {
        type: 'LIL_MONSTA_KEEPER', roleId: 'LIL_MONSTA', label: 'Cuida a la Pequeña Monsta',
        expiry: ['PERMANENT', 'ON_REPLACE'], sourceRole: 'LIL_MONSTA',
      }, game);
      addDeferred(game, {
        label: `👶 Pequeña Monsta: ${keeper.name} pasa a cuidarla y cuenta como Demonio. NO anuncies victoria.`,
        dueNight: game.nightNumber, sourcePlayerId: keeper.id, severity: 'warn', role: 'LIL_MONSTA',
      });
      return true;
    }
    // Legión: mientras quede otro Legión vivo la partida sigue (ya cubierto en el paso 1).
    case 'LEGION':
      return game.players.some(p => p.role === 'LEGION' && p.alive);
    // Sangijuela, Kazali, Ojo, Motín, Al-Hadikhia, Vigormortis, Fang Gu:
    // no tienen sucesor automático — pasan a Dama Escarlata / Mente Maestra.
    default:
      return false;
  }
}

// Rata de Laboratorio: todo Demonio nuevo hereda también una habilidad buena.
function grantBoffinAbility(game, newDemon) {
  const boffin = game.players.find(p => p.role === 'BOFFIN');
  if (!boffin || !newDemon) return;
  placeToken(newDemon, {
    type: 'BOFFIN_ABILITY', roleId: 'BOFFIN', label: 'Habilidad de Rata de Laboratorio',
    expiry: ['PERMANENT'], sourceRole: 'BOFFIN', sourcePlayerId: boffin.id,
  }, game);
  addDeferred(game, {
    label: `🐀 Rata de Laboratorio: ${newDemon.name} (Demonio nuevo) también tiene una habilidad buena. Puedes darle una distinta a la anterior.`,
    dueNight: game.nightNumber, sourcePlayerId: newDemon.id, severity: 'warn', role: 'BOFFIN',
  });
}

// Compatibilidad: los ataques nocturnos llaman aquí cuando el atacante murió.
function checkScarletWoman(game, killer) {
  resolveDemonDeath(game, killer);
}

// ── Mente Maestra ────────────────────────────────────────────────────
function livingSoberMastermind(game) {
  return game.players.find(p => p.role === 'MASTERMIND' && p.alive && !p.poisoned && !p.drunkAs) || null;
}

// El Demonio acaba de morir sin sucesor: si hay Mente Maestra viva y sobria,
// la partida NO termina — se juega 1 día más en secreto. Devuelve true si aplazó.
function tryMastermindDefer(game) {
  if (game.mastermindDone || game.mastermindPending || game.mastermindDay != null) {
    return game.mastermindPending || game.mastermindDay != null;
  }
  const mm = livingSoberMastermind(game);
  if (!mm) return false;
  game.mastermindPending = true;
  addDeferred(game, {
    label: '🧩 Mente Maestra: el Demonio ha muerto — NO anuncies la victoria. Se juega 1 día más: si mañana ejecutan a alguien, su equipo pierde; si nadie es ejecutado, ganan los buenos.',
    dueNight: game.nightNumber, sourcePlayerId: mm.id, severity: 'warn', role: 'MASTERMIND',
  });
  return true;
}

// Durante el día extra: cualquier ejecución (muera o no el ejecutado) decide la partida.
function checkMastermindExtraDayExecution(game, executedPlayer) {
  if (game.mastermindDay == null || game.mastermindDone) return false;
  game.mastermindDone = true;
  const evilExecuted = executedPlayer.alignment === 'evil' || ['minion', 'demon'].includes(executedPlayer.type);
  endGame(game, evilExecuted ? 'good' : 'evil', evilExecuted
    ? '🧩 Día extra (Mente Maestra): ejecutado un malvado — ganan los buenos'
    : '🧩 Día extra (Mente Maestra): ejecutado un bueno — ganan los malos');
  return true;
}

// ── Zombuul: la primera muerte es fingida (sigue vivo en secreto) ────
function zombuulFakeDeath(game, target) {
  if (target.role !== 'ZOMBUUL' || target.zombuulFirstDied || target.poisoned) return false;
  target.zombuulFirstDied = true;
  target.alive = false; // registra como muerto para todos
  clearBearerDeathTokens(target);
  game.nightDeaths.push(target.id);
  placeToken(target, { type: 'DIES', roleId: 'ZOMBUUL', label: 'Aparenta morir', expiry: ['AT_DAWN'], sourceRole: 'ZOMBUUL' }, game);
  addDeferred(game, {
    label: '🧟 El Zombuul aparenta estar muerto — ¡sigue vivo en secreto! Sigue despertándolo si nadie murió de día. Su segunda muerte es la real.',
    dueNight: game.nightNumber, sourcePlayerId: target.id, severity: 'warn', role: 'ZOMBUUL',
  });
  return true;
}

// ¿Cuenta este jugador como Demonio vivo para el fin de partida?
function countsAsLivingDemon(p) {
  // Pequeña Monsta: el Esbirro que la cuida cuenta como Demonio aunque sea Esbirro.
  if (p.alive && (p.tokens || []).some(t => t.type === 'LIL_MONSTA_KEEPER')) return true;
  if (p.type !== 'demon') return false;
  if (p.alive) return true;
  // Zombuul: su primera muerte es fingida.
  return p.role === 'ZOMBUUL' && p.zombuulFirstDied && !p.zombuulReallyDead;
}

function nominate(game, nominatorId, nomineeId) {
  if (game.phase !== 'nominations') throw new Error('Las nominaciones no están abiertas');
  if (game.activeNomination) throw new Error('Ya hay una nominación activa — resuélvela primero');

  const nominator = game.players.find(p => p.id === nominatorId);
  // El Narrador siempre es nominable (haya o no Ateo en juego).
  const isNarratorNominee = nomineeId === 'NARRATOR';
  const nominee = isNarratorNominee ? null : game.players.find(p => p.id === nomineeId);
  if (!nominator?.alive) throw new Error('Solo jugadores vivos pueden nominar');
  if (!isNarratorNominee && !nominee?.alive) throw new Error('El nominado debe estar vivo');

  const alreadyNominated = game.nominations.some(n => n.nominatorId === nominatorId);
  if (alreadyNominated) throw new Error('Ya has nominado a alguien hoy');

  // Motín (día 3 en adelante): el nominado muere de inmediato, sin votación.
  // Antes de morir puede nominar a su vez, así que el día NO se cierra aquí.
  if (!isNarratorNominee && riotDayActive(game)) {
    game.nominations.push({
      id: uuidv4(), nominatorId, nomineeId,
      nominatorName: nominator.name, nomineeName: nominee.name,
      nomineeAvatar: nominee.avatar || null, nominatorAvatar: nominator.avatar || null,
      isNarratorNominee: false, votes: [], against: [], ghostDeclines: [],
      resolved: true, tally: 0, executed: true, riotKill: true,
      stage: 'resolved', voteOrder: [], voteTurnIndex: 0,
    });
    nominee.alive = false;
    clearBearerDeathTokens(nominee);
    game.executionAttemptToday = true;
    addDeferred(game, {
      label: `🔥 Motín: ${nominee.name} muere al ser nominado. Puede nominar a su vez antes de morir.`,
      dueNight: game.nightNumber, sourcePlayerId: nominee.id, severity: 'warn', role: 'RIOT',
    });
    if (nominee.type === 'demon') resolveDemonDeath(game, nominee);
    checkWinCondition(game);
    return { riotKill: true, killed: nominee };
  }

  // Bruja: si el nominador está maldito y la Bruja está sana → muere al nominar
  // (con 3 o menos jugadores vivos la Bruja pierde su habilidad)
  const witchCurse = (nominator.tokens || []).find(t => t.type === 'WITCH_CURSED');
  if (witchCurse) {
    nominator.tokens = nominator.tokens.filter(t => t !== witchCurse);
    const witch = game.players.find(p => p.role === 'WITCH' && p.alive);
    const livingForWitch = game.players.filter(p => p.alive).length;
    if (isActorEffective(witch) && livingForWitch > 3) {
      nominator.alive = false;
      clearBearerDeathTokens(nominator);
      addDeferred(game, { label: `🧙‍♀️ ${nominator.name} murió por la Bruja al nominar`, dueNight: game.nightNumber, severity: 'warn', role: 'WITCH' });
      checkWinCondition(game);
    }
  }

  // Gólem: solo puede nominar una vez; si el nominado no es el Demonio, muere.
  if (nominator.role === 'GOLEM') {
    if (nominator.golemUsed) throw new Error('El Gólem solo puede nominar una vez por partida');
    nominator.golemUsed = true;
    if (!isNarratorNominee && nominee.type !== 'demon' && !nominator.poisoned) {
      nominee.alive = false;
      clearBearerDeathTokens(nominee);
      addDeferred(game, { label: `🗿 ${nominee.name} murió al ser nominado por el Gólem (no era el Demonio)`, dueNight: game.nightNumber, severity: 'warn', role: 'GOLEM' });
      checkWinCondition(game);
      return { golemTrigger: true, killed: nominee };
    }
  }

  if (!isNarratorNominee && nominee.role === 'VIRGIN' && !nominee.virginUsed) {
    // FIX: La Virgen gasta su poder en la PRIMERA nominación, sin importar quién la nomine
    nominee.virginUsed = true;

    // Solo mata si es Aldeano y no está envenenada
    if (nominator.type === 'townfolk' && !nominee.poisoned) {
      nominator.alive = false;
      game.executionAttemptToday = true; // cuenta como ejecución del día
      // Día extra de la Mente Maestra: esta ejecución decide la partida.
      if (!game.players.some(p => p.role === 'ATHEIST')) {
        checkMastermindExtraDayExecution(game, nominator);
      }
      if (game.phase !== 'game_over') checkWinCondition(game);
      return { virginTrigger: true, executed: nominator };
    }
    // Si no es Aldeano o está envenenada, el poder se gasta sin efecto
  }

  const nomination = {
    id: uuidv4(),
    nominatorId, nomineeId,
    nominatorName: nominator.name,
    nomineeName: isNarratorNominee ? '🎙 Narrador' : nominee.name,
    nomineeAvatar: isNarratorNominee ? null : (nominee.avatar || null),
    nominatorAvatar: nominator.avatar || null,
    isNarratorNominee,
    votes: [], against: [], ghostDeclines: [],
    resolved: false, tally: 0, executed: false,
    stage: 'arguments',            // 'arguments' → 'voting'
    argSpeaker: null,              // 'nominator' | 'nominee' (quién argumenta)
    voteOrder: buildVoteOrder(game, nominatorId),
    voteTurnIndex: 0,
    argueTimer: null,
  };
  game.nominations.push(nomination);
  game.activeNomination = nomination.id;
  game.phase = 'voting';
  return { nomination };
}

// Orden de voto en sentido horario empezando por QUIEN NOMINÓ y recorriendo
// la rueda hasta volver a él. Solo incluye a quienes pueden votar
// (vivos, o muertos con su voto fantasma intacto). El nominador es el primero.
function buildVoteOrder(game, nominatorId) {
  const players = game.players;
  const startIdx = players.findIndex(p => p.id === nominatorId);
  if (startIdx === -1) return [];
  const order = [];
  for (let step = 0; step < players.length; step++) {
    const p = players[(startIdx + step) % players.length];
    const canVote = p.alive || (!p.alive && !p.deadVoteNominationId);
    if (canVote) order.push(p.id);
  }
  return order;
}

function vote(game, voterId, nominationId, inFavor) {
  const nomination = game.nominations.find(n => n.id === nominationId);
  if (!nomination || nomination.resolved) throw new Error('Nominación no válida o ya resuelta');

  // La votación debe estar abierta (tras la fase de argumentos).
  if (nomination.stage && nomination.stage !== 'voting') throw new Error('La votación aún no está abierta');

  // Solo puede votar quien tiene el turno (orden horario desde el nominador).
  if (Array.isArray(nomination.voteOrder) && nomination.voteOrder.length > 0) {
    const turnId = nomination.voteOrder[nomination.voteTurnIndex || 0];
    if (turnId && turnId !== voterId) throw new Error('No es tu turno de votar');
  }

  const voter = game.players.find(p => p.id === voterId);
  if (!voter) throw new Error('Jugador no encontrado');

  if (!voter.alive) {
    if (!inFavor) throw new Error('Los jugadores muertos solo pueden votar a favor (matar)');
    // FIX: Solo pueden votar si no han usado su voto único ya
    if (voter.deadVoteNominationId) {
      throw new Error('Los jugadores muertos solo pueden votar una vez en toda la partida');
    }
    voter.deadVoteNominationId = nominationId;
  }

  const hasVotedFor     = nomination.votes.includes(voterId);
  const hasVotedAgainst = nomination.against.includes(voterId);
  if (hasVotedFor || hasVotedAgainst) throw new Error('Ya has votado y no puedes cambiarlo');

  if (voter.alive && voter.role === 'BUTLER' && inFavor && !voter.poisoned) {
    const master = game.players.find(p => p.id === voter.butlerMaster);
    if (master && !nomination.votes.includes(master.id)) {
      throw new Error('El Mayordomo solo puede votar A FAVOR si su Amo ya ha votado');
    }
  }

  if (inFavor) nomination.votes.push(voterId);
  else nomination.against.push(voterId);

  // Avanza el turno en sentido horario y limpia el temporizador de palabra.
  if (Array.isArray(nomination.voteOrder)) {
    const idx = nomination.voteOrder.indexOf(voterId);
    if (idx >= 0 && idx >= (nomination.voteTurnIndex || 0)) {
      nomination.voteTurnIndex = idx + 1;
      nomination.argueTimer = null;
    }
  }

  return nomination;
}

function resolveVote(game, nominationId) {
  const nomination = game.nominations.find(n => n.id === nominationId);
  if (!nomination) throw new Error('Nominación no encontrada');

  const living   = game.players.filter(p => p.alive).length;
  const required = Math.ceil(living / 2);
  const total    = nomination.votes.length;

  nomination.resolved = true;
  nomination.tally    = total;
  nomination.meetsThreshold = total >= required;
  game.activeNomination = null;
  game.phase = 'nominations';

  return { tally: total, meetsThreshold: total >= required, nomineeName: nomination.nomineeName };
}

function executeNominationWinner(game) {
  const candidates = game.nominations.filter(n => n.resolved && n.meetsThreshold && !n.executed);
  if (candidates.length === 0) return { executed: null, gameOver: false, tie: false, noWinner: true };

  const maxTally = Math.max(...candidates.map(n => n.tally));
  const tied = candidates.filter(n => n.tally === maxTally);

  if (tied.length > 1) {
    tied.forEach(n => { n.tieSkipped = true; });
    return { executed: null, gameOver: false, tie: true };
  }

  const winner = tied[0];

  // Legión: la ejecución falla si TODOS los que votaron eran malvados.
  if (legionVetoesExecution(game, winner)) {
    winner.executed = true;
    game.executionAttemptToday = true;
    addDeferred(game, {
      label: `⚔️ Legión: solo votaron malvados — la ejecución de ${winner.nomineeName} FALLA y nadie muere.`,
      dueNight: game.nightNumber, severity: 'warn', role: 'LEGION',
    });
    return { executed: null, gameOver: false, tie: false, legionVeto: true, nomineeName: winner.nomineeName };
  }

  // Ejecución del Narrador: con Ateo (sano) en juego gana el bando bueno;
  // sin Ateo el Narrador no muere pero la ejecución del día se gasta.
  if (winner.nomineeId === 'NARRATOR') {
    winner.executed = true;
    game.executionAttemptToday = true;
    const atheist = game.players.find(p => p.role === 'ATHEIST');
    if (atheist && !atheist.poisoned) {
      endGame(game, 'good', 'El pueblo ejecutó al Narrador con el Ateo en juego: gana el bando bueno.');
      return { executed: { id: 'NARRATOR', name: 'Narrador' }, gameOver: true, winner: game.winner, tie: false, narratorExecuted: true };
    }
    return { executed: { id: 'NARRATOR', name: 'Narrador' }, gameOver: false, winner: null, tie: false, narratorExecuted: true };
  }

  const nominee = game.players.find(p => p.id === winner.nomineeId);
  if (!nominee) return { executed: null, gameOver: false, tie: false };

  winner.executed = true;
  game.executionAttemptToday = true;

  const atheistActive = game.players.some(p => p.role === 'ATHEIST');

  // Día extra de la Mente Maestra: cualquier ejecución (muera o no) decide la partida.
  if (!atheistActive && checkMastermindExtraDayExecution(game, nominee)) {
    // El ejecutado muere igualmente salvo que algo lo salve (da igual para el resultado).
    const daTok = (nominee.tokens || []).find(t => t.type === 'SURVIVES_EXECUTION');
    if (!daTok && nominee.role !== 'VIZIER') {
      nominee.alive = false;
      clearBearerDeathTokens(nominee);
      game.executedToday = nominee.id;
    }
    return { executed: nominee, gameOver: true, winner: game.winner, tie: false };
  }

  // Abogado del Diablo: si tiene token SURVIVES_EXECUTION → no muere
  const daToken = (nominee.tokens || []).find(t => t.type === 'SURVIVES_EXECUTION');
  if (daToken) {
    nominee.tokens = nominee.tokens.filter(t => t !== daToken);
    syncStatusFlags(game);
    addDeferred(game, { label: `⚖️ ${nominee.name} sobrevivió la ejecución (Abogado del Diablo)`, dueNight: game.nightNumber, severity: 'warn', role: 'DEVILS_ADVOCATE' });
    return { executed: nominee, gameOver: false, winner: null, tie: false, savedByDA: true };
  }

  // Visir: no puede morir durante el día (salvo envenenado).
  if (nominee.role === 'VIZIER' && !nominee.poisoned) {
    addDeferred(game, { label: `👑 ${nominee.name} (Visir) no puede morir durante el día — sobrevive la ejecución`, dueNight: game.nightNumber, severity: 'warn', role: 'VIZIER' });
    return { executed: nominee, gameOver: false, winner: null, tie: false, vizierSurvived: true };
  }

  // Zombuul: su primera "muerte" es fingida — sigue vivo en secreto.
  if (!atheistActive && nominee.role === 'ZOMBUUL' && !nominee.zombuulFirstDied && !nominee.poisoned) {
    nominee.zombuulFirstDied = true;
    nominee.alive = false;
    clearBearerDeathTokens(nominee);
    game.executedToday = nominee.id;
    placeToken(nominee, { type: 'EXECUTED_TODAY', roleId: 'UNDERTAKER', label: 'Murió hoy', expiry: ['ONE_DAY'] }, game);
    addDeferred(game, {
      label: '🧟 El Zombuul fue ejecutado y aparenta estar muerto — ¡sigue vivo en secreto! La Mente Maestra NO se activa. Su segunda muerte es la real.',
      dueNight: game.nightNumber, sourcePlayerId: nominee.id, severity: 'warn', role: 'ZOMBUUL',
    });
    return { executed: nominee, gameOver: false, winner: null, tie: false };
  }

  // Psicópata: la ejecución NO lo mata directamente. Juega piedra-papel-tijera
  // contra quien lo nominó (o contra el Narrador si se autonominó). Solo muere si pierde.
  // El día se gasta igualmente: no se puede nominar ni ejecutar a nadie más hoy.
  if (!atheistActive && nominee.role === 'PSYCHOPATH' && !nominee.poisoned && nominee.alive) {
    game.pendingRoshambo = {
      psychopathId: nominee.id,
      opponentId: winner.nominatorId === nominee.id ? 'NARRATOR' : winner.nominatorId,
      throws: {},
      result: null,
    };
    const opponentName = winner.nominatorId === nominee.id
      ? 'el Narrador'
      : (game.players.find(p => p.id === winner.nominatorId)?.name || '?');
    addDeferred(game, {
      label: `🎲 Psicópata ejecutado: juega piedra-papel-tijera contra ${opponentName}. Solo muere si PIERDE. El día está gastado.`,
      dueNight: game.nightNumber, sourcePlayerId: nominee.id, severity: 'warn', role: 'PSYCHOPATH',
    });
    return { executed: nominee, gameOver: false, winner: null, tie: false, roshambo: true };
  }

  nominee.alive = false;
  clearBearerDeathTokens(nominee);
  game.executedToday = nominee.id;
  // El Canibal hereda del ULTIMO ejecutado de toda la partida, no solo de hoy.
  game.lastExecutedId = nominee.id;
  game.lastExecutedRole = nominee.role;
  game.lastExecutedWasEvil = nominee.alignment === 'evil';
  if (nominee.role === 'ZOMBUUL') nominee.zombuulReallyDead = true;

  // Leviatán: al segundo jugador bueno ejecutado ganan los malvados.
  if (!atheistActive && nominee.alignment === 'good') {
    const leviathan = game.players.find(p => p.role === 'LEVIATHAN' && p.alive && !p.poisoned);
    if (leviathan) {
      game.leviathanGoodExecutions = (game.leviathanGoodExecutions || 0) + 1;
      if (game.leviathanGoodExecutions >= 2) {
        endGame(game, 'evil', '🐉 Leviatán: se ejecutó al segundo jugador bueno — ganan los malvados');
        return { executed: nominee, gameOver: true, winner: game.winner, tie: false };
      }
    }
  }
  // Ficha "Murió hoy" para el Enterrador: dura el día y se lee esa noche.
  placeToken(nominee, { type: 'EXECUTED_TODAY', roleId: 'UNDERTAKER', label: 'Murió hoy', expiry: ['ONE_DAY'] }, game);
  // Barbero ejecutado: esta noche el Demonio puede intercambiar dos personajes.
  syncBarberState(game);

  // Juglar: si el ejecutado es un Esbirro, todos los demás se emborrachan al anochecer.
  const minstrel = game.players.find(p => p.role === 'MINSTREL' && p.alive && !p.poisoned && !p.drunkAs);
  if (nominee.type === 'minion' && minstrel) {
    game.minstrelPending = minstrel.id;
    addDeferred(game, { label: `🎻 Juglar: ${nominee.name} (Esbirro) fue ejecutado — TODOS los demás estarán borrachos hasta el próximo anochecer (se aplica al empezar la noche)`, dueNight: game.nightNumber, severity: 'warn', role: 'MINSTREL' });
  }

  // Avisos al narrador para habilidades de decisión humana.
  if (nominee.role === 'BOOMDANDY' && !nominee.poisoned) {
    addDeferred(game, { label: '💥 ¡Pólvora ejecutada! Todos excepto 3 jugadores mueren — resuélvelo manualmente (dedos apuntando).', dueNight: game.nightNumber, severity: 'warn', role: 'BOOMDANDY' });
  }
  if (nominee.role === 'GOBLIN' && !nominee.poisoned) {
    addDeferred(game, { label: '👺 Goblin ejecutado: si reclamó PÚBLICAMENTE ser el Goblin al ser nominado, los malvados ganan (decláralo tú).', dueNight: game.nightNumber, severity: 'warn', role: 'GOBLIN' });
  }
  const pacifist = game.players.find(p => p.role === 'PACIFIST' && p.alive && !p.poisoned && !p.drunkAs);
  if (pacifist && nominee.alignment === 'good' && nominee.id !== pacifist.id) {
    addDeferred(game, { label: `🕊️ Pacifista en juego: puedes decidir que ${nominee.name} (bueno ejecutado) NO muera — usa Revivir si lo salvas.`, dueNight: game.nightNumber, severity: 'info', role: 'PACIFIST' });
  }

  if (!atheistActive && nominee.role === 'SAINT' && !nominee.poisoned) {
    endGame(game, 'evil', 'Santo ejecutado');
    return { executed: nominee, gameOver: true, winner: game.winner, tie: false };
  }

  // Sembrador de Miedo: si el propio Fearmonger nominó y ejecutó a su marcado, el equipo del ejecutado pierde.
  if (!atheistActive) {
    const fmToken = (nominee.tokens || []).find(t => t.type === 'FEARMONGER_MARK');
    const fearmonger = fmToken ? game.players.find(p => p.id === fmToken.sourcePlayerId) : null;
    if (fearmonger && fearmonger.alive && !fearmonger.poisoned && winner.nominatorId === fearmonger.id) {
      const evilExecuted = nominee.alignment === 'evil';
      endGame(game, evilExecuted ? 'good' : 'evil', evilExecuted
        ? '😨 Sembrador de Miedo ejecutó a su objetivo malvado — su plan fracasa, ganan los buenos'
        : '😨 Sembrador de Miedo nominó y ejecutó a su objetivo — el equipo del ejecutado pierde');
      return { executed: nominee, gameOver: true, winner: game.winner, tie: false };
    }
  }

  // Gemela Malvada: si el gemelo bueno es ejecutado con la gemela viva y sana, gana el Mal.
  if (!atheistActive && nominee.alignment === 'good') {
    const twinPair = game.evilTwinPair || null; // { evilId, goodId }
    const evilTwin = game.players.find(p => p.role === 'EVIL_TWIN' && p.alive && !p.poisoned);
    if (evilTwin && twinPair && twinPair.goodId === nominee.id) {
      endGame(game, 'evil', '👯 El gemelo bueno fue ejecutado — gana el Mal (Gemela Malvada)');
      return { executed: nominee, gameOver: true, winner: game.winner, tie: false };
    }
  }

  if (!atheistActive && nominee.type === 'demon') {
    // Cadena completa de sucesión: la muerte del Demonio NO termina la partida por sí sola.
    if (resolveDemonDeath(game, nominee)) {
      return {
        executed: nominee, gameOver: false, winner: null, tie: false,
        demonSucceeded: true, mastermindDefer: game.mastermindPending || false,
      };
    }
    endGame(game, 'good', 'Demonio ejecutado');
    return { executed: nominee, gameOver: true, winner: game.winner, tie: false };
  }

  checkWinCondition(game);
  return { executed: nominee, gameOver: game.phase === 'game_over', winner: game.winner, tie: false };
}

// ── Hechicero: aplicación de un deseo ────────────────────────────────
// `apply` viene del catálogo (server/wishes.js) o de la pestaña libre.
// Devuelve el texto que se registra en el historial del deseo.
function applyWish(game, apply, opts = {}) {
  const wizard = game.players.find(p => p.role === 'WIZARD');
  const target = opts.targetId ? game.players.find(p => p.id === opts.targetId) : null;
  const target2 = opts.targetId2 ? game.players.find(p => p.id === opts.targetId2) : null;
  const role = opts.roleId ? ROLES[opts.roleId] : null;

  switch (apply) {
    case 'GRANT_GRIMOIRE':
      if (wizard) wizard.seesGrimoire = true;
      return 'El Hechicero ve el Grimorio.';

    case 'REVEAL_DEMON': {
      const demon = game.players.find(p => countsAsLivingDemon(p));
      if (wizard) wizard.nightInfo = `🧙 Deseo\nEl Demonio es: ${demon ? demon.name : 'nadie (no queda Demonio vivo)'}.`;
      return `Se le revela el Demonio: ${demon ? demon.name : '—'}.`;
    }

    case 'REVEAL_ALIGNMENT':
      if (wizard && target) wizard.nightInfo = `🧙 Deseo\n${target.name} es ${target.alignment === 'evil' ? 'MALVADO' : 'BUENO'}.`;
      return `Se le revela la alineación de ${target?.name || '?'}.`;

    case 'REVEAL_NOT_IN_PLAY': {
      const list = (game.rolesNotInPlay || []).slice(0, 3).map(r => ROLES[r]?.name || r);
      if (wizard) wizard.nightInfo = `🧙 Deseo\nNo están en juego: ${list.join(', ')}.`;
      return `Se le revelan 3 personajes ausentes: ${list.join(', ')}.`;
    }

    case 'REVEAL_NIGHT_INFO': {
      const all = game.players.filter(p => p.nightInfo).map(p => `${p.name}: ${p.nightInfo}`).join('\n');
      if (wizard) wizard.nightInfo = `🧙 Deseo\n${all || 'Nadie recibió información esta noche.'}`;
      return 'Se le entrega toda la información de la noche.';
    }

    case 'BECOME_DEMON': {
      const demon = game.players.find(p => countsAsLivingDemon(p));
      if (!wizard) return 'No hay Hechicero en juego.';
      const demonRole = demon ? demon.role : 'IMP';
      if (demon) { demon.alive = false; clearBearerDeathTokens(demon); }
      wizard.role = demonRole; wizard.type = 'demon'; wizard.alignment = 'evil';
      wizard.believedRole = null; wizard.drunkAs = null;
      // Hay Demonio vivo: la partida NO termina.
      checkWinCondition(game);
      return `El Hechicero se convierte en ${ROLES[demonRole]?.name || demonRole}; el Demonio anterior muere.`;
    }

    case 'SET_ROLE':
      if (target && role) {
        target.role = role.id; target.type = role.type; target.alignment = role.alignment;
        target.believedRole = null; target.drunkAs = null;
        checkWinCondition(game);
      }
      return `${target?.name || '?'} pasa a ser ${role?.name || '?'}.`;

    case 'SWAP_ROLES':
      if (target && target2) barberSwap(game, target.id, target2.id);
      return `${target?.name || '?'} y ${target2?.name || '?'} intercambian personaje.`;

    case 'STEAL_ABILITY':
      if (wizard && target) {
        wizard.role = target.role; wizard.type = target.type;
        // El Hechicero conserva SU alineación: roba la habilidad, no el bando.
        placeToken(target, {
          type: 'DRUNK_NIGHT', roleId: 'WIZARD', label: 'Habilidad robada',
          expiry: ['PERMANENT'], sourceRole: 'WIZARD', sourcePlayerId: wizard.id,
        }, game);
      }
      return `El Hechicero roba la habilidad de ${target?.name || '?'}, que queda borracho.`;

    case 'SET_ALIGNMENT_EVIL':
      if (target) target.alignment = 'evil';
      return `${target?.name || '?'} pasa a ser malvado.`;

    case 'SET_ALIGNMENT_GOOD':
      if (target) target.alignment = 'good';
      return `${target?.name || '?'} pasa a ser bueno.`;

    case 'KILL':
      if (target) killPlayer(game, target.id, 'deseo del Hechicero');
      return `${target?.name || '?'} muere.`;

    case 'REVIVE':
      if (target) revivePlayer(game, target.id);
      return `${target?.name || '?'} vuelve a estar vivo.`;

    case 'PROTECT_TONIGHT':
      if (target) placeToken(target, { type: 'SAFE_TONIGHT', roleId: 'WIZARD', label: 'A salvo (deseo)', expiry: ['AT_DAWN'], sourceRole: 'WIZARD' }, game);
      return `${target?.name || '?'} no puede morir esta noche.`;

    case 'PROTECT_FOREVER':
      if (target) placeToken(target, { type: 'SAFE_TONIGHT', roleId: 'WIZARD', label: 'Inmune al Demonio (deseo)', expiry: ['PERMANENT'], sourceRole: 'WIZARD' }, game);
      return `${target?.name || '?'} es inmune al Demonio el resto de la partida.`;

    case 'NO_DEATHS_TONIGHT':
      game.players.filter(p => p.alive).forEach(p => {
        placeToken(p, { type: 'SAFE_TONIGHT', roleId: 'WIZARD', label: 'A salvo (deseo)', expiry: ['AT_DAWN'], sourceRole: 'WIZARD' }, game);
      });
      return 'Nadie puede morir esta noche.';

    case 'DRUNK_ALL_GOOD':
      game.players.filter(p => p.alignment === 'good' && p.alive).forEach(p => {
        placeToken(p, { type: 'DRUNK_NIGHT', roleId: 'WIZARD', label: 'Borracho (deseo)', expiry: ['PERMANENT'], sourceRole: 'WIZARD' }, game);
      });
      return 'Todos los buenos quedan borrachos.';

    case 'POISON':
      if (target) placeToken(target, { type: 'POISONED', roleId: 'WIZARD', label: 'Envenenado (deseo)', expiry: ['UNTIL_NEXT_DUSK'], sourceRole: 'WIZARD' }, game);
      return `${target?.name || '?'} queda envenenado.`;

    case 'CURE':
      if (target) target.tokens = (target.tokens || []).filter(t => !['POISONED', 'DRUNK_NIGHT'].includes(t.type));
      return `${target?.name || '?'} queda sobrio y sano.`;

    case 'HIDE_FROM_DEMON':
      if (wizard) wizard.hiddenFromEvil = true;
      return 'El Hechicero no aparece en la información del Mal.';

    case 'DOUBLE_VOTE':
      if (target) target.voteWeight = 2;
      return `El voto de ${target?.name || '?'} cuenta doble.`;

    case 'RESTORE_GHOST_VOTE':
      if (target) target.deadVoteNominationId = null;
      return `${target?.name || '?'} recupera su voto fantasma.`;

    case 'RESTORE_ALL_GHOST_VOTES':
      game.players.forEach(p => { p.deadVoteNominationId = null; });
      return 'Todos los muertos recuperan su voto.';

    case 'DECLARE_WINNER':
      endGame(game, opts.winner === 'evil' ? 'evil' : 'good',
        `🧙 Deseo del Hechicero concedido: ganan los ${opts.winner === 'evil' ? 'malvados' : 'buenos'}`);
      return `Ganan los ${game.winner === 'evil' ? 'malvados' : 'buenos'}.`;

    default:
      return `Efecto libre aplicado por el narrador: ${apply}`;
  }
}

// ── Psicópata ────────────────────────────────────────────────────────
const ROSHAMBO_BEATS = { piedra: 'tijera', tijera: 'papel', papel: 'piedra' };

// Registra la tirada de uno de los dos contendientes. Nadie ve la del otro
// hasta que ambos han tirado.
function roshamboThrow(game, whoId, choice) {
  const rs = game.pendingRoshambo;
  if (!rs || rs.result) throw new Error('No hay ningún Roshambo pendiente');
  if (!ROSHAMBO_BEATS[choice]) throw new Error('Elección no válida');
  if (whoId !== rs.psychopathId && whoId !== rs.opponentId) throw new Error('No participas en este Roshambo');
  rs.throws[whoId] = choice;

  const psychoThrow = rs.throws[rs.psychopathId];
  const oppThrow    = rs.throws[rs.opponentId];
  if (!psychoThrow || !oppThrow) return rs;

  const psycho = game.players.find(p => p.id === rs.psychopathId);
  if (psychoThrow === oppThrow) rs.result = 'tie';
  else if (ROSHAMBO_BEATS[psychoThrow] === oppThrow) rs.result = 'psychopath';
  else rs.result = 'opponent';

  // El Psicópata solo muere si PIERDE. Empatar o ganar significa que vive.
  if (rs.result === 'opponent' && psycho) {
    psycho.alive = false;
    clearBearerDeathTokens(psycho);
    game.executedToday = psycho.id;
    placeToken(psycho, { type: 'EXECUTED_TODAY', roleId: 'UNDERTAKER', label: 'Murió hoy', expiry: ['ONE_DAY'] }, game);
    checkWinCondition(game);
  }
  addDeferred(game, {
    label: rs.result === 'opponent'
      ? `🎲 El Psicópata perdió el Roshambo (${psychoThrow} vs ${oppThrow}) — muere.`
      : `🎲 El Psicópata ${rs.result === 'tie' ? 'empató' : 'ganó'} el Roshambo (${psychoThrow} vs ${oppThrow}) — vive. El día está gastado igualmente.`,
    dueNight: game.nightNumber, sourcePlayerId: rs.psychopathId, severity: 'info', role: 'PSYCHOPATH',
  });
  return rs;
}

// Asesinato diurno público: una vez al día, antes de abrir nominaciones.
function psychopathDayKill(game, psychoId, targetId) {
  const psycho = game.players.find(p => p.id === psychoId);
  const target = game.players.find(p => p.id === targetId);
  if (!psycho || psycho.role !== 'PSYCHOPATH' || !psycho.alive) throw new Error('No es un Psicópata vivo');
  if (game.phase !== 'day') throw new Error('Solo durante el día, antes de las nominaciones');
  if (psycho.psychopathKillDay === game.dayNumber) throw new Error('El Psicópata ya ha matado hoy');
  if (!target || !target.alive) throw new Error('El objetivo debe estar vivo');

  // El uso se gasta aunque la víctima sobreviva (Marinero, Soldado, protegido…).
  psycho.psychopathKillDay = game.dayNumber;

  const immune = target.role === 'SAILOR' && !target.poisoned;
  if (immune || target.protected) {
    addDeferred(game, {
      label: `🔪 El Psicópata eligió a ${target.name}, pero no muere. Su uso de hoy se gasta igualmente.`,
      dueNight: game.nightNumber, sourcePlayerId: psychoId, severity: 'warn', role: 'PSYCHOPATH',
    });
    return { killed: null, target, blocked: true };
  }
  if (checkFoolProtection(game, target, psychoId, 'PSYCHOPATH')) {
    return { killed: null, target, blocked: true };
  }

  target.alive = false;
  clearBearerDeathTokens(target);
  addDeferred(game, {
    label: `🔪 El Psicópata mató a ${target.name} en público — queda expuesto ante todos.`,
    dueNight: game.nightNumber, sourcePlayerId: psychoId, severity: 'warn', role: 'PSYCHOPATH',
  });
  checkWinCondition(game);
  return { killed: target, target, blocked: false };
}

function slayerAction(game, slayerId, targetId) {
  const slayer = game.players.find(p => p.id === slayerId);
  const target = game.players.find(p => p.id === targetId);
  const isSlayer = slayer?.role === 'SLAYER' || (slayer?.role === 'DRUNK' && slayer?.drunkAs === 'SLAYER');
  if (!slayer || !isSlayer || slayer.slayerUsed || !slayer.alive) throw new Error('Acción no válida');
  slayer.slayerUsed = true;

  if (slayer.role === 'DRUNK') {
    return { hit: false, gameOver: false, poisoned: false };
  }

  if (slayer.poisoned) {
    return { hit: false, gameOver: false, poisoned: true };
  }

  if (target?.type === 'demon') {
    // Zombuul: la primera muerte es fingida.
    if (target.role === 'ZOMBUUL' && !target.zombuulFirstDied && !target.poisoned) {
      target.zombuulFirstDied = true;
      target.alive = false;
      addDeferred(game, {
        label: '🧟 El Cazador "mató" al Zombuul — aparenta estar muerto pero sigue vivo en secreto.',
        dueNight: game.nightNumber, sourcePlayerId: target.id, severity: 'warn', role: 'ZOMBUUL',
      });
      return { hit: true, gameOver: false };
    }
    if (target.role === 'ZOMBUUL') target.zombuulReallyDead = true;
    target.alive = false;
    game.nightDeaths.push(target.id);
    // Cadena COMPLETA de sucesión (Demonio propio → Dama Escarlata → Rata de
    // Laboratorio → Mente Maestra), igual que en una ejecución o muerte manual.
    if (!game.players.some(p => p.role === 'ATHEIST') && resolveDemonDeath(game, target)) {
      return { hit: true, gameOver: false, demonSucceeded: true, mastermindDefer: game.mastermindPending || false };
    }
    endGame(game, 'good', 'Cazador mató al Demonio');
    return { hit: true, gameOver: true };
  }
  return { hit: false, gameOver: false };
}

function startDay(game) {
  game.phase = 'day';
  game.dayNumber++;
  game.nominations = [];
  game.activeNomination = null;
  game.executedToday = null;
  game.executionAttemptToday = false;
  // Mente Maestra: el día extra empieza el primer día tras la muerte del Demonio.
  if (game.mastermindPending && !game.mastermindDone) {
    game.mastermindPending = false;
    game.mastermindDay = game.dayNumber;
    addDeferred(game, {
      label: `🧩 HOY es el día extra de la Mente Maestra (día ${game.dayNumber}). Si ejecutan a alguien, su equipo pierde. Si nadie es ejecutado, al anochecer ganan los buenos.`,
      dueNight: game.nightNumber, severity: 'warn', role: 'MASTERMIND',
    });
  }
  game.pendingNightAfterNomination = false;
  game.autoVotes = { skipDay: [], skipNom: [], extend: [] };
  game.players.forEach(p => { p.discordChannel = null; });
  // AMANECER: limpia solo fichas AT_DAWN (protección Monje, marca "Muere").
  // El veneno (UNTIL_NEXT_DUSK) PERSISTE durante el día. Manuales intactas.
  clearExpiringTokens(game, 'dawn');
  syncStatusFlags(game);
  // Leviatán (día > 5) y Motín (día 3) se resuelven al amanecer.
  applyDemonDayRules(game);
  checkWinCondition(game);
  return game;
}

function startNight(game) {
  // El Roshambo pendiente se descarta al anochecer: el día ya está gastado.
  game.pendingRoshambo = null;
  // Barbero muerto durante el día: abre el paso del Demonio para esta noche.
  syncBarberState(game);
  const hasAtheist = game.players.some(p => p.role === 'ATHEIST');
  // Mente Maestra: si el día extra terminó sin ejecución, ganan los buenos.
  if (!hasAtheist && game.mastermindDay != null && !game.mastermindDone && game.phase !== 'game_over') {
    game.mastermindDone = true;
    if (!game.executionAttemptToday) {
      endGame(game, 'good', '🧩 Mente Maestra: nadie fue ejecutado en el día extra — ganan los buenos');
      return game;
    }
    // Hubo ejecución pero no terminó la partida (empate resuelto sin muerte, etc.):
    // el Demonio sigue muerto → ganan los buenos.
    endGame(game, 'good', '🧩 Mente Maestra: el día extra terminó — el Demonio está muerto, ganan los buenos');
    return game;
  }
  // F5: Vórtice — cada día sin ejecución el Mal gana (solo noches ≥2)
  if (!hasAtheist && game.nightNumber > 0 && game.phase !== 'game_over') {
    const vortox = game.players.find(p => p.alive && p.role === 'VORTOX' && !p.poisoned);
    if (vortox && !game.executionAttemptToday && !game.executedToday) {
      endGame(game, 'evil', '☠ Vórtice: día sin ejecución');
      return game;
    }
  }
  game.phase = game.nightNumber === 0 ? 'first_night' : 'night';
  game.nightNumber++;
  // Instantánea del día: de noche los jugadores ven la ruleta congelada tal
  // como quedó de día — muertes y movimientos nocturnos se revelan al amanecer.
  game.daySnapshot = game.players.map(p => ({
    id: p.id,
    alive: p.alive,
    discordChannel: p.discordChannel || null,
    deadVoteNominationId: p.deadVoteNominationId,
  }));
  // ANOCHECER: limpia fichas UNTIL_NEXT_DUSK / ONE_DAY (veneno previo, etc.)
  // ANTES de que actúen los roles, para que el Envenenador re-aplique limpio.
  clearExpiringTokens(game, 'dusk');
  game.players.forEach(p => { p.safeTonight = false; });
  // Juglar: un Esbirro fue ejecutado hoy → todos los demás (salvo Viajeros)
  // quedan borrachos esta noche y el día de mañana (caduca al próximo anochecer).
  if (game.minstrelPending) {
    const minstrelId = game.minstrelPending;
    game.minstrelPending = null;
    for (const p of game.players) {
      if (!p.alive || p.id === minstrelId || p.type === 'traveler') continue;
      placeToken(p, {
        type: 'DRUNK_NIGHT', roleId: 'MINSTREL', label: 'Borracho (Juglar)',
        expiry: ['UNTIL_NEXT_DUSK'], sourceRole: 'MINSTREL', sourcePlayerId: minstrelId,
      }, game);
    }
  }
  syncStatusFlags(game);
  game.players.filter(p => p.alive && p.role === 'BUTLER').forEach(p => { p.butlerMaster = null; });
  
  // FIX: Determinar si el Recluso registra como malvado esta noche (50% probabilidad)
  game.recluseRegistersAsEvil = Math.random() < 0.5;
  
  game.autoVotes = { skipDay: [], skipNom: [], extend: [] };
  game.pendingNightAfterNomination = false;
  generateNightInfo(game);
  game.nightQueue = buildNightQueue(game);
  game.nightQueueIndex = 0;
  game.nightSubmissions = {};
  game.nightWaitingForRavenkeeper = false;
  game.nightReadyPlayers = [];
  // Drunk whose drunkAs isn't in the queue gets fake info immediately
  const drunkInQueue = new Set(game.nightQueue.filter(id => {
    const p = game.players.find(x => x.id === id);
    return p?.role === 'DRUNK';
  }));
  const _living = game.players.filter(p => p.alive);
  const _rand = arr => arr[Math.floor(Math.random() * arr.length)];
  game.players.filter(p => p.role === 'DRUNK' && p.alive && !drunkInQueue.has(p.id)).forEach(p => {
    const isFirstNight = game.phase === 'first_night';
    // Solo roles pasivos dan info automática; roles activos pasan por la cola
    if (!PASSIVE_INFO_ROLES.has(p.drunkAs)) return;
    // Roles de solo primera noche: no info en noches posteriores
    if (!isFirstNight && FIRST_NIGHT_ONLY_ROLES.has(p.drunkAs)) return;
    // Sepulturero solo cuando hubo ejecución
    if (p.drunkAs === 'UNDERTAKER' && !game.executedToday) return;
    const info = generateDrunkInfo(p, _living, _rand, game);
    if (info) p.nightInfo = info;
  });
  // Modo manual (con narrador): genera toda la info pasiva por adelantado
  // para que el narrador la vea y la transmita. En auto se genera por cola.
  if (!game.autoMode) {
    game.players.filter(p => p.alive).forEach(p => generateSingleRoleInfo(game, p.id));
  }
  generateCurrentPassiveInfo(game);
  return game;
}

function openNominations(game) {
  if (game.phase !== 'day') throw new Error('Solo se pueden abrir nominaciones durante el día');
  game.phase = 'nominations';
  game.autoVotes = { skipDay: [], skipNom: [], extend: [] };
  return game;
}

function checkWinCondition(game) {
  if (game.phase === 'game_over') return true;
  if (game.players.some(p => p.role === 'ATHEIST')) return false;
  const living = game.players.filter(p => p.alive);
  // El Zombuul aparentemente muerto cuenta como Demonio vivo.
  const demons = game.players.filter(countsAsLivingDemon);

  if (demons.length === 0) {
    // Cadena de sucesión completa: Demonio propio → Dama Escarlata → Boffin → Mente Maestra.
    // Solo si nada de eso aplica gana el Bien.
    const lastDeadDemon = game.players.filter(p => p.type === 'demon' && !p.alive).pop();
    if (lastDeadDemon && resolveDemonDeath(game, lastDeadDemon)) return false;
    if (tryMastermindDefer(game)) return false;
    endGame(game, 'good', 'Sin Demonios vivos');
    return true;
  }
  if (living.length <= 2) {
    // Durante el día extra de la Mente Maestra la regla de 2 vivos no aplica.
    if (game.mastermindPending || (game.mastermindDay != null && !game.mastermindDone)) return false;
    endGame(game, 'evil', 'Solo 2 jugadores vivos');
    return true;
  }
  return false;
}

function mayorWin(game) {
  const living = game.players.filter(p => p.alive);
  const mayor  = game.players.find(p => p.role === 'MAYOR' && p.alive);
  if (mayor && living.length === 3) {
    endGame(game, 'good', 'Alcalde — 3 vivos sin ejecución');
    return true;
  }
  return false;
}

function killPlayer(game, playerId, reason) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('Jugador no encontrado');
  // Zombuul: la primera muerte es fingida; matarlo de nuevo (ya "muerto") es la real.
  if (player.role === 'ZOMBUUL' && !player.zombuulReallyDead) {
    if (player.alive && !player.zombuulFirstDied && !player.poisoned) {
      player.zombuulFirstDied = true;
      player.alive = false;
      addDeferred(game, {
        label: '🧟 El Zombuul aparenta estar muerto — ¡sigue vivo en secreto! Mátalo otra vez para su muerte real.',
        dueNight: game.nightNumber, sourcePlayerId: player.id, severity: 'warn', role: 'ZOMBUUL',
      });
      checkWinCondition(game);
      return game;
    }
    if (player.zombuulFirstDied) player.zombuulReallyDead = true;
  }
  player.alive = false;
  syncBarberState(game);
  checkWinCondition(game);
  return game;
}

function revivePlayer(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  if (player) { player.alive = true; player.deadVoteNominationId = null; }
  return game;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// `presence` = { playerId: 'online' | 'away' }. Ausente del mapa = desconectado.
// Solo el narrador la recibe: los jugadores nunca saben quién está conectado.
function getPublicState(game, viewerId, isNarrator, presence = {}) {
  const { players, phase, dayNumber, nightNumber, nominations, activeNomination, winner, smokeScreenPlayerId } = game;

  const viewer = players.find(p => p.id === viewerId);
  const viewerIsSpy = !isNarrator && viewer?.role === 'SPY' && ['first_night','night'].includes(phase);
  const currentNightActor = game.nightQueue?.[game.nightQueueIndex] || null;

  const nightTargets = new Set(
    Object.values(game.nightSubmissions || {}).flatMap(s => s.targetIds || [])
  );

  // De noche los jugadores ven la ruleta congelada como quedó de día:
  // muertes/movimientos nocturnos no se muestran hasta el amanecer.
  const nightFreeze = !isNarrator && ['first_night', 'night'].includes(phase) && Array.isArray(game.daySnapshot)
    ? new Map(game.daySnapshot.map(s => [s.id, s]))
    : null;

  const publicPlayers = players.map(p => {
    const isMe        = p.id === viewerId;
    const frozen      = nightFreeze ? nightFreeze.get(p.id) : null;
    // El jugador NO ve su propio rol hasta que empieza la primera noche
    // (o cuando el narrador se lo revela explícitamente con REVEAL_ROLE).
    const meCanSeeOwnRole = isMe && (nightNumber >= 1 || p.showRole);
    const canSeeRole  = isNarrator || meCanSeeOwnRole || phase === 'game_over' || !!winner || viewerIsSpy;
    // Capa 2: el jugador ve su rol CREÍDO (Marioneta/Lunático/Borracho), nunca el real.
    const showSelfPerceived = isMe && !!p.believedRole && !winner;
    const perceivedDef = showSelfPerceived ? ROLES[p.believedRole] : null;
    const effectiveRole = showSelfPerceived ? p.believedRole : p.role;
    const displayRole = effectiveRole;

    const isMaster = players.some(x => x.role === 'BUTLER' && x.butlerMaster === p.id);

    return {
      id: p.id, name: p.name,
      discordId: p.discordId,
      avatar: p.avatar,
      alive: frozen ? frozen.alive : p.alive,
      discordChannel: frozen ? frozen.discordChannel : (p.discordChannel || null),
      deadVoteNominationId: frozen ? frozen.deadVoteNominationId : p.deadVoteNominationId,
      diedThisNight: frozen ? false : (game.nightDeaths || []).includes(p.id),
      poisoned:   isNarrator ? p.poisoned   : (isMe ? p.poisoned : false),
      protected:  isNarrator ? p.protected  : (isMe ? p.protected : false),
      isMaster:   isNarrator ? isMaster     : false,
      isSmokeScreen: (isNarrator || !!winner) ? p.id === smokeScreenPlayerId : false,
      role:        canSeeRole ? effectiveRole : null,
      drunkAs:     (isNarrator || !!winner) ? p.drunkAs : null,
      believedRole:(isNarrator || !!winner) ? (p.believedRole || null) : null,
      displayRole: canSeeRole ? displayRole   : null,
      type:        canSeeRole ? (perceivedDef ? perceivedDef.type : p.type) : null,
      alignment:   canSeeRole ? (perceivedDef ? perceivedDef.alignment : p.alignment) : null,
      showRole:    p.showRole,
      // Modo manual: SOLO el narrador ve la info de noche (la transmite por voz).
      // Modo automático: el jugador la ve en su panel.
      nightInfo:   isNarrator ? p.nightInfo : (game.autoMode && isMe ? p.nightInfo : null),
      // Sospechas: el narrador ve todas; un jugador solo la suya.
      accusations: isNarrator
        ? (p.accusations || [])
        : (p.accusations || []).filter(a => a.accuserId === viewerId),
      slayerUsed:  p.slayerUsed,
      foolUsed:        isNarrator ? (p.foolUsed || false) : undefined,
      zombuulFirstDied: isNarrator ? (p.zombuulFirstDied || false) : undefined,
      vigormortisAlive: isNarrator ? (p.vigormortisAlive || false) : undefined,
      impShotUsed: (isMe && p.type === 'demon') || isNarrator ? p.impShotUsed : false,
      pendingRavenkeeper: isNarrator ? p.pendingRavenkeeper : (isMe ? p.pendingRavenkeeper : false),
      // Congelado: de noche un jugador no debe ver a quién están eligiendo los demás.
      isNightTarget: frozen ? false : nightTargets.has(p.id),
      bluffRole: (isMe || isNarrator) ? p.bluffRole : null,
      statuses: isNarrator ? (p.statuses || []) : undefined,
      tokens: isNarrator ? (p.tokens || []) : undefined,
      // 'online' | 'away' | 'offline' — información exclusiva del narrador.
      presence: isNarrator ? (presence[p.id] || 'offline') : undefined,
    };
  });

  const aliveQueue = (game.nightQueue || []).filter(pid => {
    const p = players.find(x => x.id === pid);
    return wakesTonight(p);
  });
  const submittedCount = aliveQueue.filter(pid => game.nightSubmissions?.[pid]).length;

  const activeCampaign = getCampaign(game.campaignId);
  return {
    id: game.id, phase, dayNumber, nightNumber,
    campaignId: game.campaignId,
    campaignName: activeCampaign.name,
    campaignIsCustom: !!activeCampaign.isCustom,
    campaignRoles: Object.values(activeCampaign.roles || {}).map(r => ({
      id: r.id, name: r.name, type: r.type, alignment: r.alignment,
      ability: r.ability, image: r.image || null, homebrew: !!r.homebrew,
    })),
    // Catálogo COMPLETO (todas las campañas + viajeros + extras). El asistente
    // de montaje lo usa para que el Narrador pueda repartir cualquier personaje
    // del compendio, no sólo los de la campaña activa (p. ej. el Hechicero de
    // The Carousel en una partida de Trouble Brewing). Sólo al Narrador.
    allRoles: isNarrator ? Object.values(ROLES).map(r => ({
      id: r.id, name: r.name, type: r.type, alignment: r.alignment,
      ability: r.ability, image: r.image || null, homebrew: !!r.homebrew,
      // `setup` deja que el asistente aplique los modificadores de reparto
      // (Barón +2 Forasteros, Señor de Typhon +1 Esbirro…) aunque el personaje
      // venga de otra campaña. Sólo viaja al Narrador.
      setup: r.setup || undefined,
      misperception: r.misperception || undefined,
    })) : undefined,
    campaignSetupNotes: isNarrator ? (activeCampaign.setupNotes || []) : undefined,
    campaignWarnings: isNarrator ? (activeCampaign.warnings || []) : undefined,
    campaignDistribution: isNarrator ? (activeCampaign.distribution || {}) : undefined,
    // Merged con los globales: el asistente debe contar bien la composición
    // aunque el personaje repartido venga de otra campaña.
    campaignOutsiderModifiers: isNarrator ? { ...ALL_OUTSIDER_MODIFIERS, ...(activeCampaign.outsiderModifiers || {}) } : undefined,
    // Esbirros extra (Señor de Typhon +1): el asistente los suma a la composición.
    campaignMinionModifiers: isNarrator ? { ...ALL_MINION_MODIFIERS, ...(activeCampaign.minionModifiers || {}) } : undefined,
    players: publicPlayers,
    nominations: nominations.map(n => {
      const living = players.filter(p => p.alive);
      const eligibleDead = players.filter(p => !p.alive && !p.deadVoteNominationId);
      const eligible = [...living, ...eligibleDead];
      const votedOrDeclined = new Set([...n.votes, ...n.against, ...(n.ghostDeclines || [])]);
      const pendingVoterNames = eligible
        .filter(p => !votedOrDeclined.has(p.id))
        .map(p => p.name);
      return {
        ...n,
        votes:   n.votes.map(id => ({ id, name: players.find(x => x.id === id)?.name || '?', avatar: players.find(x => x.id === id)?.avatar || null })),
        against: n.against.map(id => ({ id, name: players.find(x => x.id === id)?.name || '?', avatar: players.find(x => x.id === id)?.avatar || null })),
        ghostDeclines: (n.ghostDeclines || []).length,
        myVote: viewerId
          ? (n.votes.includes(viewerId) ? 'for' : n.against.includes(viewerId) ? 'against' : null)
          : null,
        myGhostDeclined: viewerId ? (n.ghostDeclines || []).includes(viewerId) : false,
        pendingVoters: isNarrator ? pendingVoterNames : pendingVoterNames.length,
        allVoted: pendingVoterNames.length === 0,
      };
    }),
    activeNomination, winner,
    statusLog: isNarrator ? (game.statusLog || []) : undefined,
    advice: isNarrator ? computeAdvice(game) : undefined,
    // Guia del narrador: personajes que NO se automatizan a proposito.
    // Le decimos que le toca decidir ahora y con que control hacerlo.
    roleHints: isNarrator ? HINTS.computeRoleHints(game) : undefined,
    deferredEffects: isNarrator ? (game.deferredEffects || []).filter(d => !d.resolved) : undefined,
    deferredOptions: isNarrator ? deferredOptionsFor(game) : undefined,
    executedToday: game.executedToday,
    nightDeaths:   game.nightDeaths,
    smokeScreenPlayerId: isNarrator ? smokeScreenPlayerId : null,
    nightProgress: { total: aliveQueue.length, submitted: submittedCount },
    nightWaitingForRavenkeeper: game.nightWaitingForRavenkeeper,
    currentNightActor,
    viewerId, isNarrator,
    winReason: game.winReason,
    nightNotReady: (isNarrator && ['first_night', 'night'].includes(phase))
      ? players.filter(p => p.alive && !(game.nightReadyPlayers || []).includes(p.id))
          .map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
      : undefined,
    autoMode: game.autoMode,
    autoPhaseInfo: game.autoPhaseInfo,
    autoDayMs: game.autoDayMs,
    autoNomMs: game.autoNomMs,
    pendingNightAfterNomination: game.pendingNightAfterNomination || false,
    autoVotes: game.autoVotes ? {
      skipDay:   { count: (game.autoVotes.skipDay   || []).length, myVote: (game.autoVotes.skipDay   || []).includes(viewerId) },
      skipNom:   { count: (game.autoVotes.skipNom   || []).length, myVote: (game.autoVotes.skipNom   || []).includes(viewerId) },
      extend:    { count: (game.autoVotes.extend    || []).length, myVote: (game.autoVotes.extend    || []).includes(viewerId) },
      skipNight: { count: (game.autoVotes.skipNight || []).length, myVote: (game.autoVotes.skipNight || []).includes(viewerId) },
    } : null,
    nightReadyCount: (game.nightReadyPlayers || []).length,
    nightReadyTotal: players.filter(p => p.alive).length,
    iNightReady: viewerId ? (game.nightReadyPlayers || []).includes(viewerId) : false,
    isInNightQueue: viewerId ? (game.nightQueue || []).includes(viewerId) : false,
    recluseRegistersAs: isNarrator ? game.recluseRegistersAs : undefined,
    spyRegistersAs: isNarrator ? game.spyRegistersAs : undefined,
    mayorKillTarget: isNarrator ? game.mayorKillTarget : undefined,
    channelLimits: isNarrator ? (game.channelLimits || {}) : undefined,
    narratorDiscordIds: isNarrator ? (game.narratorDiscordIds || []) : undefined,
    narratorDrunkAs: isNarrator ? game.narratorDrunkAs : undefined,
    narratorRolesForImp: isNarrator ? (game.narratorRolesForImp || []) : undefined,
    setup: isNarrator ? (game.setup || { locked: false, seatOrder: [], assignments: {}, decisions: [] }) : undefined,
    // Hechicero: el texto del deseo SOLO lo ven el narrador y el propio Hechicero.
    // La pista pública, si el narrador la anuncia, la ve todo el mundo.
    wish: (() => {
      const w = game.wish;
      const wizard = players.find(p => p.role === 'WIZARD');
      const iAmWizard = !!wizard && wizard.id === viewerId;
      if (!w) {
        // Sin deseo aún: el Hechicero necesita saber que puede pedirlo.
        return (iAmWizard || isNarrator) ? { status: 'none', canAsk: iAmWizard } : null;
      }
      const base = { status: w.status, announced: !!w.announced, clue: w.announced ? w.clue : null };
      if (isNarrator) return { ...w, ...base, canAsk: false };
      if (iAmWizard) {
        return {
          ...base, text: w.text,
          canAsk: w.status === 'denied_retry',
          // El precio solo si el narrador decidió revelárselo.
          price: w.priceRevealed ? w.price : null,
        };
      }
      // Los demás jugadores solo ven la pista, y solo si fue anunciada.
      return w.announced ? { status: 'announced', clue: w.clue } : null;
    })(),
    // Barbero: paso pendiente del Demonio (solo el narrador lo ve).
    barberPending: isNarrator
      ? (() => {
          const barber = players.find(p => (p.tokens || []).some(t => t.type === 'BARBER_TONIGHT'));
          if (!barber) return null;
          const demon = players.find(p => countsAsLivingDemon(p));
          return {
            barberId: barber.id,
            barberName: barber.name,
            demonId: demon ? demon.id : null,
            demonName: demon ? demon.name : null,
            // Sin Demonio vivo el narrador elige en su nombre.
            narratorChooses: !demon,
          };
        })()
      : null,
    // Roshambo del Psicópata: cada uno solo ve su propia tirada hasta que ambos han tirado.
    roshambo: (() => {
      const rs = game.pendingRoshambo;
      if (!rs) return null;
      const bothThrown = !!(rs.throws[rs.psychopathId] && rs.throws[rs.opponentId]);
      const nameOf = id => id === 'NARRATOR' ? 'Narrador' : (players.find(p => p.id === id)?.name || '?');
      const reveal = bothThrown || isNarrator;
      return {
        psychopathId: rs.psychopathId,
        opponentId: rs.opponentId,
        psychopathName: nameOf(rs.psychopathId),
        opponentName: nameOf(rs.opponentId),
        result: rs.result,
        bothThrown,
        myThrow: viewerId ? (rs.throws[viewerId] || null) : null,
        iParticipate: viewerId === rs.psychopathId || viewerId === rs.opponentId,
        psychopathThrow: reveal ? (rs.throws[rs.psychopathId] || null) : null,
        opponentThrow:   reveal ? (rs.throws[rs.opponentId]   || null) : null,
        waitingFor: isNarrator
          ? [rs.psychopathId, rs.opponentId].filter(id => !rs.throws[id]).map(nameOf)
          : undefined,
      };
    })(),
  };
}

module.exports = {
  createGame, getGame, addPlayer, removePlayer,
  distributeRoles, generateNightInfo,
  nominate, vote, resolveVote, executeNominationWinner, slayerAction,
  roshamboThrow, psychopathDayKill, barberSwap, closeBarberStep, syncBarberState,
  applyWish,
  applyNightAction, advanceNightQueue, endGame,
  resolveNightQueue, generatePassiveNightInfo,
  startDay, startNight, openNominations,
  checkWinCondition, mayorWin, resolveDemonDeath,
  killPlayer, revivePlayer,
  addDeferred, assignBelievedRoles,
  applySetup, regenDemonNightInfo,
  getPublicState,
  placeToken, syncStatusFlags,
};