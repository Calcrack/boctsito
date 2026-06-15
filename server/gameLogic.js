const { v4: uuidv4 } = require('uuid');
const { ROLES, getDistribution, getRolesByType, getCampaign, DEFAULT_CAMPAIGN } = require('./roles');

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

const PASSIVE_INFO_ROLES = new Set(['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK','EMPATH','UNDERTAKER','SPY']);
const FIRST_NIGHT_ONLY_ROLES = new Set(['WASHERWOMAN','LIBRARIAN','INVESTIGATOR','COOK']);

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
      const rolesPool = ((game.narratorRolesForImp?.length > 0) ? game.narratorRolesForImp : (game.rolesNotInPlay || [])).filter(id => id !== 'DRUNK');
      const notInPlay3  = shuffle(rolesPool).slice(0, 3).map(id => ROLES[id]?.name || id);
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
  if (!player || !player.alive) return;

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
  }
}

function generateCurrentPassiveInfo(game) {
  const currentId = game.nightQueue[game.nightQueueIndex];
  if (!currentId) return;
  const player = game.players.find(p => p.id === currentId);
  if (!player?.alive) return;
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
      p.alive && (p.role === roleId || (p.role === 'DRUNK' && p.drunkAs === roleId))
    );
    for (const player of matched) queue.push(player.id);
  }
  return queue;
}

function resolveNightQueue(game) {
  for (const playerId of game.nightQueue) {
    const player = game.players.find(p => p.id === playerId);
    if (!player?.alive) continue;
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
    if (next?.alive) break;
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
      if (targets[0] && !actor?.poisoned) {
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
          const minion = game.players.find(p => p.type === 'minion' && p.alive);
          if (minion) {
            minion.role = 'IMP'; minion.type = 'demon';
          }
        }
      } else if (target.role === 'SOLDIER' && !target.poisoned) {
        // blocked
      } else if (target.protected) {
        // blocked
      } else if (target.role === 'MAYOR' && !target.poisoned) {
        const pool = game.players.filter(p => p.alive && p.id !== target.id && p.type !== 'demon');
        if (pool.length > 0) {
          const redirectTarget = pool[Math.floor(Math.random() * pool.length)];
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
        // pool vacío (solo Alcalde + Demonio vivos) → Alcalde sobrevive
      } else {
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
        checkScarletWoman(game, actor);
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
    case 'KILL': {
      for (const t of targets) {
        if (!t || !t.alive) continue;
        if (t.protected || t.safeTonight) continue;
        t.alive = false;
        clearBearerDeathTokens(t);
        game.nightDeaths.push(t.id);
        placeToken(t, { type: 'DIES', roleId: artRole || 'IMP', label: 'Muere', expiry: ['AT_DAWN'], sourceRole: artRole, sourcePlayerId: actorId }, game);
        checkScarletWoman(game, actor);
      }
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
  return game;
}

function checkScarletWoman(game, killer) {
  if (!killer || killer.type !== 'demon' || killer.alive) return;
  const scarlet = game.players.find(p => p.role === 'SCARLET_WOMAN' && p.alive);
  const liveCount = game.players.filter(p => p.alive).length;
  if (scarlet && liveCount >= 5) {
    scarlet.role = 'IMP'; scarlet.type = 'demon';
  }
}

function nominate(game, nominatorId, nomineeId) {
  if (game.phase !== 'nominations') throw new Error('Las nominaciones no están abiertas');
  if (game.activeNomination) throw new Error('Ya hay una nominación activa — resuélvela primero');

  const nominator = game.players.find(p => p.id === nominatorId);
  const nominee   = game.players.find(p => p.id === nomineeId);
  if (!nominator?.alive) throw new Error('Solo jugadores vivos pueden nominar');
  if (!nominee?.alive)   throw new Error('El nominado debe estar vivo');

  const alreadyNominated = game.nominations.some(n => n.nominatorId === nominatorId);
  if (alreadyNominated) throw new Error('Ya has nominado a alguien hoy');

  if (nominee.role === 'VIRGIN' && !nominee.virginUsed) {
    // FIX: La Virgen gasta su poder en la PRIMERA nominación, sin importar quién la nomine
    nominee.virginUsed = true;
    
    // Solo mata si es Aldeano y no está envenenada
    if (nominator.type === 'townfolk' && !nominee.poisoned) {
      nominator.alive = false;
      checkWinCondition(game);
      return { virginTrigger: true, executed: nominator };
    }
    // Si no es Aldeano o está envenenada, el poder se gasta sin efecto
  }

  const nomination = {
    id: uuidv4(),
    nominatorId, nomineeId,
    nominatorName: nominator.name,
    nomineeName: nominee.name,
    nomineeAvatar: nominee.avatar || null,
    nominatorAvatar: nominator.avatar || null,
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
  const nominee = game.players.find(p => p.id === winner.nomineeId);
  if (!nominee) return { executed: null, gameOver: false, tie: false };

  winner.executed = true;
  game.executedToday = nominee.id;
  nominee.alive = false;
  clearBearerDeathTokens(nominee);
  // Ficha "Murió hoy" para el Enterrador: dura el día y se lee esa noche.
  placeToken(nominee, { type: 'EXECUTED_TODAY', roleId: 'UNDERTAKER', label: 'Murió hoy', expiry: ['ONE_DAY'] }, game);

  if (nominee.role === 'SAINT' && !nominee.poisoned) {
    game.winner = 'evil'; game.phase = 'game_over';
    game.winReason = 'Santo ejecutado';
    return { executed: nominee, gameOver: true, winner: 'evil', tie: false };
  }

  if (nominee.type === 'demon') {
    const scarlet   = game.players.find(p => p.role === 'SCARLET_WOMAN' && p.alive);
    const liveCount = game.players.filter(p => p.alive).length;
    if (scarlet && liveCount >= 5) {
      scarlet.role = 'IMP'; scarlet.type = 'demon';
    } else {
      game.winner = 'good'; game.phase = 'game_over';
      game.winReason = 'Demonio ejecutado';
      return { executed: nominee, gameOver: true, winner: 'good', tie: false };
    }
  }

  checkWinCondition(game);
  return { executed: nominee, gameOver: game.phase === 'game_over', winner: game.winner, tie: false };
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
    target.alive = false;
    game.nightDeaths.push(target.id);
    const scarlet   = game.players.find(p => p.role === 'SCARLET_WOMAN' && p.alive);
    const liveCount = game.players.filter(p => p.alive).length;
    if (scarlet && liveCount >= 5) {
      scarlet.role = 'IMP'; scarlet.type = 'demon';
      return { hit: true, gameOver: false };
    }
    game.winner = 'good'; game.phase = 'game_over';
    game.winReason = 'Cazador mató al Demonio';
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
  game.pendingNightAfterNomination = false;
  game.autoVotes = { skipDay: [], skipNom: [], extend: [] };
  game.players.forEach(p => { p.discordChannel = null; });
  // AMANECER: limpia solo fichas AT_DAWN (protección Monje, marca "Muere").
  // El veneno (UNTIL_NEXT_DUSK) PERSISTE durante el día. Manuales intactas.
  clearExpiringTokens(game, 'dawn');
  syncStatusFlags(game);
  checkWinCondition(game);
  return game;
}

function startNight(game) {
  game.phase = game.nightNumber === 0 ? 'first_night' : 'night';
  game.nightNumber++;
  // ANOCHECER: limpia fichas UNTIL_NEXT_DUSK / ONE_DAY (veneno previo, etc.)
  // ANTES de que actúen los roles, para que el Envenenador re-aplique limpio.
  clearExpiringTokens(game, 'dusk');
  game.players.forEach(p => { p.safeTonight = false; });
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
  const living = game.players.filter(p => p.alive);
  const demons  = living.filter(p => p.type === 'demon');

  if (demons.length === 0) {
    game.winner = 'good'; game.phase = 'game_over';
    game.winReason = 'Sin Demonios vivos';
    return true;
  }
  if (living.length <= 2) {
    game.winner = 'evil'; game.phase = 'game_over';
    game.winReason = 'Solo 2 jugadores vivos';
    return true;
  }
  return false;
}

function mayorWin(game) {
  const living = game.players.filter(p => p.alive);
  const mayor  = game.players.find(p => p.role === 'MAYOR' && p.alive);
  if (mayor && living.length === 3) {
    game.winner = 'good'; game.phase = 'game_over';
    game.winReason = 'Alcalde — 3 vivos sin ejecución';
    return true;
  }
  return false;
}

function killPlayer(game, playerId, reason) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('Jugador no encontrado');
  player.alive = false;
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

function getPublicState(game, viewerId, isNarrator) {
  const { players, phase, dayNumber, nightNumber, nominations, activeNomination, winner, smokeScreenPlayerId } = game;

  const viewer = players.find(p => p.id === viewerId);
  const viewerIsSpy = !isNarrator && viewer?.role === 'SPY' && ['first_night','night'].includes(phase);
  const currentNightActor = game.nightQueue?.[game.nightQueueIndex] || null;

  const nightTargets = new Set(
    Object.values(game.nightSubmissions || {}).flatMap(s => s.targetIds || [])
  );

  const publicPlayers = players.map(p => {
    const isMe        = p.id === viewerId;
    const canSeeRole  = isNarrator || isMe || phase === 'game_over' || !!winner || viewerIsSpy;
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
      alive: p.alive,
      discordChannel: p.discordChannel || null,
      deadVoteNominationId: p.deadVoteNominationId,
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
      impShotUsed: (isMe && p.type === 'demon') || isNarrator ? p.impShotUsed : false,
      pendingRavenkeeper: isNarrator ? p.pendingRavenkeeper : (isMe ? p.pendingRavenkeeper : false),
      isNightTarget: nightTargets.has(p.id),
      bluffRole: (isMe || isNarrator) ? p.bluffRole : null,
      statuses: isNarrator ? (p.statuses || []) : undefined,
      tokens: isNarrator ? (p.tokens || []) : undefined,
    };
  });

  const aliveQueue = (game.nightQueue || []).filter(pid => {
    const p = players.find(x => x.id === pid);
    return p?.alive;
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
    campaignSetupNotes: isNarrator ? (activeCampaign.setupNotes || []) : undefined,
    campaignWarnings: isNarrator ? (activeCampaign.warnings || []) : undefined,
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
    narratorDrunkAs: isNarrator ? game.narratorDrunkAs : undefined,
    narratorRolesForImp: isNarrator ? (game.narratorRolesForImp || []) : undefined,
  };
}

module.exports = {
  createGame, getGame, addPlayer, removePlayer,
  distributeRoles, generateNightInfo,
  nominate, vote, resolveVote, executeNominationWinner, slayerAction,
  applyNightAction, advanceNightQueue,
  resolveNightQueue, generatePassiveNightInfo,
  startDay, startNight, openNominations,
  checkWinCondition, mayorWin,
  killPlayer, revivePlayer,
  addDeferred, assignBelievedRoles,
  getPublicState,
};