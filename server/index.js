const express = require('express');
const { createServer } = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const {
  createGame, getGame, addPlayer, removePlayer, replacePlayer,
  distributeRoles, nominate, vote, resolveVote, executeNominationWinner, slayerAction,
  applyNightAction, advanceNightQueue,
  startDay, startNight, openNominations,
  mayorWin, killPlayer, revivePlayer, addDeferred, getPublicState,
  checkWinCondition, resolveDemonDeath, roshamboThrow, psychopathDayKill,
  barberSwap, closeBarberStep, applyWish,
  assignBelievedRoles, applySetup, regenDemonNightInfo,
  placeToken, syncStatusFlags, resolveChoice,
  placeManualToken, removePlayerToken,
} = require('./gameLogic');
const { computeRequiredDecisions, suggestDecision, isSetupComplete, isDecisionResolved } = require('./setup');
const { renderCampaignSheet } = require('./campaignSheet');
const { initBot, getGuildMembers, moveUserToChannel, moveUserToOwnRoom, getNarratorIds, setNarratorIds, sendDM, getBotStatus, getBotConfig, setVoiceStateCallback, setPlazaChannelPermission, setChannelIds, setGuildId, setNightCategoryId, setBoctRoleId, setAdminUserIds, renameLocationChannels, ensurePlayerRoom, deletePlayerRoom, deleteAllNightRooms, setReadyCallback, setNarratorRoleId, syncNarratorsFromRole } = require('./discordBot');
const { initConfigStore, getConfig, setLocationNames, getCampaignLocationNames, setCampaignLocationNames, verifyAdminPassword, setAdminPassword } = require('./configStore');
const { ROLES, BASE_DISTRIBUTION, getRolesByType, getCampaign, CAMPAIGNS, DEFAULT_CAMPAIGN } = require('./roles');
const { registerCampaign, listCampaigns } = require('./campaigns');
const { buildCampaign, healCampaign, loadCustomCampaigns, saveCustomCampaign, deleteCustomCampaign } = require('./campaignImport');
const { WISH_CATALOG } = require('./wishes');
const { loadRankings, initRankings, recordGameStart, recordGameWin, deleteRankingEntry, updateRankingEntry } = require('./rankings');
const { initDB, saveGame, loadGame, logGameEvent } = require('./persistence');

// Las campañas personalizadas se cargan de forma asíncrona en startup().

const SAVE_PATH = path.join(__dirname, 'game-save.json');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// ── Single persistent game ─────────────────────────────────────────
const MAIN_GAME_ID = 'main';
const mainGame = createGame('narrator', MAIN_GAME_ID);

// ── Session store ──────────────────────────────────────────────────
const sessions = new Map();

// ── Auto-mode timers ───────────────────────────────────────────────
const autoTimers = new Map();
const AUTO_DAY_MS = 5 * 60 * 1000;
const AUTO_NOM_MS = 7 * 60 * 1000;

function setAutoTimer(gameId, callback, ms) {
  const existing = autoTimers.get(gameId);
  if (existing) clearTimeout(existing);
  const id = setTimeout(callback, ms);
  autoTimers.set(gameId, id);
  return id;
}

function shuffleLocal(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function autoSelectRoles(playerCount, campaignId) {
  const campaign = getCampaign(campaignId);
  const baseDist = campaign.distribution[playerCount];
  if (!baseDist) throw new Error('Número de jugadores no soportado (5-15)');

  const allRoles    = Object.values(campaign.roles);
  const tfPool      = allRoles.filter(r => r.type === 'townfolk').map(r => r.id);
  const outPool     = allRoles.filter(r => r.type === 'outsider').map(r => r.id);
  const minionPool  = allRoles.filter(r => r.type === 'minion').map(r => r.id);
  const demonPool   = allRoles.filter(r => r.type === 'demon').map(r => r.id);

  // Barón (solo si la campaña lo tiene): 35% si caben +2 forasteros.
  const hasBaronRole = minionPool.includes('BARON');
  const canBaron  = hasBaronRole && baseDist.outsiders + 2 <= outPool.length;
  const useBaron  = canBaron && Math.random() < 0.35;
  const dist      = { ...baseDist };

  if (useBaron) {
    dist.outsiders = Math.min(dist.outsiders + 2, playerCount - dist.demons - dist.minions);
    dist.townfolk  = playerCount - dist.outsiders - dist.minions - dist.demons;
  }

  const townfolk  = shuffleLocal(tfPool).slice(0, dist.townfolk);
  const outsiders = shuffleLocal(outPool).slice(0, dist.outsiders);
  let   minions;
  if (useBaron) {
    const rest = shuffleLocal(minionPool.filter(id => id !== 'BARON')).slice(0, dist.minions - 1);
    minions = ['BARON', ...rest];
  } else {
    minions = shuffleLocal(minionPool).slice(0, dist.minions);
  }
  const demons = shuffleLocal(demonPool).slice(0, dist.demons || 1);

  return [...townfolk, ...outsiders, ...minions, ...demons];
}

// ── Montaje (wizard) helpers ───────────────────────────────────────
function ensureSetup(game) {
  if (!game.setup) game.setup = { locked: false, seatOrder: [], assignments: {}, decisions: [] };
  const ids = new Set(game.players.map(p => p.id));
  // Mantén seatOrder coherente con los jugadores actuales (altas/bajas).
  game.setup.seatOrder = (game.setup.seatOrder || []).filter(id => ids.has(id));
  for (const p of game.players) if (!game.setup.seatOrder.includes(p.id)) game.setup.seatOrder.push(p.id);
  for (const seatId of Object.keys(game.setup.assignments || {})) if (!ids.has(seatId)) delete game.setup.assignments[seatId];
  return game.setup;
}
function recomputeSetup(game) {
  ensureSetup(game);
  game.setup.decisions = computeRequiredDecisions(game);
}

// ── WebSocket helpers ──────────────────────────────────────────────
function sendTo(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

// Presencia: 'online' si su sesión responde al latido, 'away' si no responde
// desde hace más de un ciclo, ausente del mapa = desconectado.
const AWAY_AFTER_MS = 70000;
function computePresence() {
  const presence = {};
  const now = Date.now();
  sessions.forEach((s) => {
    if (!s.gameId || !s.playerId) return;
    const stale = s.lastSeen && (now - s.lastSeen) > AWAY_AFTER_MS;
    // Una sesión viva gana sobre otra marcada como ausente (varias pestañas).
    if (presence[s.playerId] === 'online') return;
    presence[s.playerId] = stale ? 'away' : 'online';
  });
  return presence;
}

function broadcastGame() {
  const game = getGame(MAIN_GAME_ID);
  if (!game) return;
  const hasNarrator = [...sessions.values()].some(s => s.gameId && s.isNarrator);
  const presence = computePresence();
  sessions.forEach((session) => {
    if (!session.gameId) return;
    const state = getPublicState(game, session.playerId, session.isNarrator, presence);
    state.hasNarrator = hasNarrator;
    // Config pública: nombres de emplazamientos + ids de canal (nada secreto:
    // los nombres ya se mostraban hardcodeados en el cliente, y los ids hacen
    // que la UI siga funcionando si se recablean canales en /admin).
    const cfg = getConfig();
    state.config = {
      locationNames: cfg.locationNames || {},
      channels: cfg.channels || {},
      boctRoleId: cfg.boctRoleId || null,
      narratorRoleId: cfg.narratorRoleId || null,
    };
    sendTo(session.ws, 'GAME_STATE', state);
  });
  // Auto-save sin bloquear
  saveGame(MAIN_GAME_ID, game).catch(err => console.error('[DB] Save error:', err.message));
}

function broadcastToAll(type, payload) {
  sessions.forEach(session => {
    if (session.gameId) sendTo(session.ws, type, payload);
  });
}

// Mensaje privado a un jugador concreto (todas sus pestañas abiertas).
function sendToPlayer(playerId, type, payload) {
  sessions.forEach(session => {
    if (session.gameId && session.playerId === playerId) sendTo(session.ws, type, payload);
  });
}

// ── Teletransporte de voz ──────────────────────────────────────────
// Noche: cada jugador vivo a su propia habitación (canal con su nombre).
function teleportToNightRooms(game) {
  game.players.forEach(p => {
    if (p.alive && p.discordId) moveUserToOwnRoom(p.discordId, p.name).catch(() => {});
  });
}
// Amanecer: todos de vuelta a la Plaza (incluidos los narradores).
function teleportAllToPlaza(game) {
  game.players.forEach(p => {
    p.discordChannel = null;
    if (p.discordId) moveUserToChannel(p.discordId, 'PLAZA', game.channelLimits || {}).catch(() => {});
  });
  teleportNarratorsTo('PLAZA');
}
// Mueve a todos los narradores a un canal (sin límites de aforo).
function teleportNarratorsTo(channelKey) {
  getNarratorIds().forEach(id => moveUserToChannel(id, channelKey, {}).catch(() => {}));
}

// ── WebSocket connection ───────────────────────────────────────────
// ── WS keepalive ───────────────────────────────────────────────────
setInterval(() => {
  let presenceChanged = false;
  const now = Date.now();
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  });
  // Marca como ausentes las sesiones que llevan un ciclo sin responder.
  sessions.forEach(s => {
    if (s.playerId && s.lastSeen && (now - s.lastSeen) > AWAY_AFTER_MS && !s.markedAway) {
      s.markedAway = true;
      presenceChanged = true;
    }
  });
  if (presenceChanged) broadcastGame();
}, 30000);

wss.on('connection', (ws) => {
  const socketId = uuidv4();
  sessions.set(socketId, { ws, socketId, gameId: null, playerId: null, isNarrator: false, lastSeen: Date.now() });
  sendTo(ws, 'CONNECTED', { socketId });

  // Cada pong renueva la presencia; si estaba ausente, avisa al narrador.
  ws.on('pong', () => {
    const s = sessions.get(socketId);
    if (!s) return;
    s.lastSeen = Date.now();
    if (s.markedAway) { s.markedAway = false; broadcastGame(); }
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const { type, payload = {} } = msg;
    const session = sessions.get(socketId);
    if (!session) return;
    session.lastSeen = Date.now();
    session.markedAway = false;
    try {
      handleMessage(type, payload, session);
    } catch (err) {
      sendTo(ws, 'ERROR', { message: err.message });
    }
  });

  // Al cerrar, refresca para que el narrador vea la desconexión sin recargar.
  ws.on('close', () => {
    const wasInGame = sessions.get(socketId)?.gameId;
    sessions.delete(socketId);
    if (wasInGame) broadcastGame();
  });
});

function handleMessage(type, payload, session) {
  const { ws } = session;

  switch (type) {

    case 'NARRATOR_LOGIN': {
      const { password } = payload;
      if (password !== '0806') throw new Error('Contraseña incorrecta');
      session.isNarrator = true;
      session.gameId = MAIN_GAME_ID;
      session.playerId = null;
      sendTo(ws, 'NARRATOR_OK', { gameId: MAIN_GAME_ID });
      broadcastGame();
      break;
    }

    case 'GET_PLAYER_LIST': {
      const game = getGame(MAIN_GAME_ID);
      const joinedIds = new Set([...sessions.values()].filter(s => s.playerId).map(s => s.playerId));
      const players = game
        ? game.players.filter(p => !joinedIds.has(p.id)).map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
        : [];
      sendTo(ws, 'PLAYER_LIST', { players });
      break;
    }

    case 'PLAYER_JOIN': {
      const { playerName } = payload;
      const game = getGame(MAIN_GAME_ID);
      if (!game) throw new Error('No hay partida activa');
      const player = game.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
      if (!player) throw new Error('Jugador no encontrado. Pide al narrador que te agregue.');
      // Kick any stale sessions for this player (handles page refresh / duplicate tab)
      [...sessions.values()]
        .filter(s => s.playerId === player.id && s.socketId !== session.socketId)
        .forEach(s => {
          sendTo(s.ws, 'KICKED_SESSION', { reason: 'duplicate_login' });
          s.playerId = null; s.gameId = null;
        });
      session.gameId = MAIN_GAME_ID;
      session.playerId = player.id;
      session.isNarrator = false;
      sendTo(ws, 'PLAYER_OK', { playerId: player.id, playerName: player.name });
      broadcastGame();
      const joinedIds = new Set([...sessions.values()].filter(s => s.playerId).map(s => s.playerId));
      const available = game.players.filter(p => !joinedIds.has(p.id)).map(p => ({ id: p.id, name: p.name, avatar: p.avatar }));
      sessions.forEach(s => { if (!s.gameId) sendTo(s.ws, 'PLAYER_LIST', { players: available }); });
      break;
    }

    case 'RESET_GAME': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      game.phase = 'lobby';
      game.dayNumber = 0;
      game.nightNumber = 0;
      game.nominations = [];
      game.activeNomination = null;
      game.executedToday = null;
      game.executionAttemptToday = false;
      game.mastermindPending = false;
      game.mastermindDay = null;
      game.mastermindDone = false;
      game.minstrelPending = null;
      game.evilTwinPair = null;
      game.nightDeaths = [];
      game.nightActions = {};
      game.winner = null;
      game.winReason = null;
      game.recluseRegistersAs = null;
      game.spyRegistersAs = null;
      game.mayorKillTarget = null;
      game.autoMode = false;
      game.autoPhaseInfo = null;
      game.pendingNightAfterNomination = false;
      game.nightReadyPlayers = [];
      game.autoVotes = { skipDay: [], skipNom: [], extend: [], skipNight: [] };
      const t0 = autoTimers.get(MAIN_GAME_ID);
      if (t0) { clearTimeout(t0); autoTimers.delete(MAIN_GAME_ID); }
      game.players.forEach(p => {
        p.role = null; p.alignment = null; p.type = null;
        p.alive = true; p.poisoned = false; p.protected = false; p.safeTonight = false;
        p.hasVotedDead = false; p.showRole = false; p.nightInfo = null;
        p.accusations = []; p.slayerUsed = false; p.virginUsed = false;
        p.butlerMaster = null; p.bluffRole = null; p.impShotUsed = false;
        p.statuses = []; p.tokens = []; p.believedRole = null; p.drunkAs = null;
        p.foolUsed = false; p.zombuulFirstDied = false; p.zombuulReallyDead = false;
        p.golemUsed = false; p.vigormortisAlive = false;
      });
      game.deferredEffects = [];
      game.statusLog = [];
      game.setup = { locked: false, seatOrder: game.players.map(p => p.id), assignments: {}, decisions: [] };
      game.setupResolved = null;
      game.narratorDrunkAs = null;
      game.narratorRolesForImp = [];
      game.smokeScreenPlayerId = null;
      setPlazaChannelPermission(true).catch(() => {});
      broadcastGame();
      break;
    }

    case 'ADD_PLAYER': {
      if (!session.isNarrator) throw new Error('Solo el narrador puede agregar jugadores');
      const game = getGame(MAIN_GAME_ID);
      const { name, discordId, discordTag, avatar } = payload;
      const player = addPlayer(game, { name, discordId, discordTag, avatar });
      ensureSetup(game);
      broadcastGame();
      sendTo(ws, 'PLAYER_ADDED', { player });
      sessions.forEach(s => sendTo(s.ws, 'PLAYER_LIST', {
        players: game.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
      }));
      // Crear su habitación de noche ya, en vez de todas juntas al empezar
      // la partida. Así solo hay canales para los jugadores actuales.
      ensurePlayerRoom(name, discordId || null).catch(() => {});
      break;
    }

    case 'REMOVE_PLAYER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const removed = game.players.find(p => p.id === payload.playerId);
      removePlayer(game, payload.playerId);
      ensureSetup(game);
      broadcastGame();
      sessions.forEach(s => sendTo(s.ws, 'PLAYER_LIST', {
        players: game.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
      }));
      // Al quitar al jugador se elimina su habitación (no se acumulan canales).
      if (removed?.name) deletePlayerRoom(removed.name).catch(() => {});
      break;
    }

    case 'UPDATE_PLAYER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const player = game.players.find(p => p.id === payload.playerId);
      if (player) {
        if (payload.discordId !== undefined) player.discordId = payload.discordId;
        if (payload.discordTag !== undefined) player.discordTag = payload.discordTag;
        if (payload.avatar !== undefined) player.avatar = payload.avatar;
        // Renombrar sin tocar nada más (para el nombre completo usa REPLACE_PLAYER,
        // que además propaga el cambio a las nominaciones y cierra su sesión).
        if (typeof payload.name === 'string' && payload.name.trim()) {
          player.name = payload.name.trim().slice(0, 40);
        }
      }
      broadcastGame();
      break;
    }

    case 'SET_CAMPAIGN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      if (game.phase !== 'lobby') throw new Error('Solo se puede cambiar de campaña en el lobby');
      const cid = payload.campaignId;
      if (!CAMPAIGNS[cid]) throw new Error('Campaña desconocida');
      game.campaignId = cid;
      // Ya no hay editor global de emplazamientos: cada campaña lleva su propio
      // nombre. Al elegirla aplicamos sus nombres a la config (para la web) y
      // renombramos los canales de voz REALES de Discord.
      const campaignNames = getCampaignLocationNames(cid);
      setLocationNames(campaignNames, currentActorId(session));
      renameLocationChannels(campaignNames).catch(e => console.error('[Discord] rename error:', e.message));
      // Los roles de la campaña anterior ya no aplican: limpia el montaje.
      game.setup = { locked: false, seatOrder: game.players.map(p => p.id), assignments: {}, decisions: [] };
      game.setupResolved = null;
      game.narratorDrunkAs = null; game.narratorRolesForImp = []; game.smokeScreenPlayerId = null;
      broadcastGame();
      break;
    }

    // ── Campañas personalizadas ──────────────────────────────────────
    case 'IMPORT_CAMPAIGN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      let campaign;
      try {
        campaign = buildCampaign(payload.json, payload.name || 'Campaña personalizada');
      } catch (e) {
        sendTo(ws, 'IMPORT_RESULT', { ok: false, error: e.message });
        break;
      }
      registerCampaign(campaign);
      if (payload.locationNames && typeof payload.locationNames === 'object') {
        setCampaignLocationNames(campaign.id, payload.locationNames, currentActorId(session));
      }
      saveCustomCampaign(campaign).catch(e => console.error('[Campaigns] save error:', e.message));
      sendTo(ws, 'IMPORT_RESULT', {
        ok: true, id: campaign.id, name: campaign.name,
        roleCount: Object.keys(campaign.roles).length,
        warnings: campaign.warnings, setupNotes: campaign.setupNotes,
      });
      sendTo(ws, 'CAMPAIGN_LIST', { campaigns: listCampaigns() });
      break;
    }

    case 'GET_CAMPAIGNS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      sendTo(ws, 'CAMPAIGN_LIST', { campaigns: listCampaigns() });
      break;
    }

    case 'DELETE_CAMPAIGN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const cid = payload.campaignId;
      if (cid && CAMPAIGNS[cid] && CAMPAIGNS[cid].isCustom) {
        delete CAMPAIGNS[cid];
        deleteCustomCampaign(cid).catch(e => console.error('[Campaigns] delete error:', e.message));
        const game = getGame(MAIN_GAME_ID);
        if (game.campaignId === cid) game.campaignId = DEFAULT_CAMPAIGN;
      }
      sendTo(ws, 'CAMPAIGN_LIST', { campaigns: listCampaigns() });
      broadcastGame();
      break;
    }

    case 'EDIT_CAMPAIGN': {
      // Punto 7: editar una campaña ya importada (cambiar su JSON/reparto o su
      // nombre) y, desde el nuevo flujo, sus NOMBRES DE EMPLAZAMIENTO. Mantiene
      // el MISMO id para no romper la partida activa. Las campañas oficiales
      // solo dejan editar los nombres (JSON y nombre quedan bloqueados).
      if (!session.isNarrator) throw new Error('No autorizado');
      const eid = payload.campaignId;
      const existing = CAMPAIGNS[eid];
      if (!existing) {
        sendTo(ws, 'IMPORT_RESULT', { ok: false, error: 'Campaña no encontrada' });
        break;
      }
      // Nombres de emplazamientos: editables en cualquier campaña (oficial o
      // personalizada). Si es la campaña activa, se reaplican en caliente.
      if (payload.locationNames && typeof payload.locationNames === 'object') {
        setCampaignLocationNames(eid, payload.locationNames, currentActorId(session));
        if (getGame(MAIN_GAME_ID).campaignId === eid) {
          const activeNames = getCampaignLocationNames(eid);
          setLocationNames(activeNames, currentActorId(session));
          renameLocationChannels(activeNames).catch(e => console.error('[Discord] rename error:', e.message));
        }
      }
      if (!existing.isCustom) {
        sendTo(ws, 'IMPORT_RESULT', { ok: true, id: eid, name: existing.name });
        sendTo(ws, 'CAMPAIGN_LIST', { campaigns: listCampaigns() });
        broadcastGame();
        break;
      }
      let updated;
      try {
        // Si no trae JSON nuevo, reconstruye desde los roles actuales y solo
        // aplica el nuevo nombre.
        const source = (typeof payload.json === 'string' && payload.json.trim())
          ? payload.json.trim()
          : Object.keys(existing.roles).map(id => existing.roles[id].unknown ? existing.roles[id].name || id : id);
        const built = buildCampaign(source, existing.name);
        updated = {
          ...built,
          id: eid,
          name: (typeof payload.name === 'string' && payload.name.trim()) ? payload.name.trim() : (built.name || existing.name),
        };
      } catch (err) {
        sendTo(ws, 'IMPORT_RESULT', { ok: false, error: err.message });
        break;
      }
      CAMPAIGNS[eid] = updated;
      saveCustomCampaign(updated).catch(e => console.error('[Campaigns] save error:', e.message));
      const game = getGame(MAIN_GAME_ID);
      if (game.campaignId === eid) {
        // El reparto cambió: limpia el montaje para re-resolverlo.
        game.setup = { locked: false, seatOrder: game.players.map(p => p.id), assignments: {}, decisions: [] };
        game.setupResolved = null;
        game.narratorDrunkAs = null; game.narratorRolesForImp = []; game.smokeScreenPlayerId = null;
      }
      sendTo(ws, 'IMPORT_RESULT', {
        ok: true, id: eid, name: updated.name,
        roleCount: Object.keys(updated.roles).length,
        warnings: updated.warnings, setupNotes: updated.setupNotes,
      });
      sendTo(ws, 'CAMPAIGN_LIST', { campaigns: listCampaigns() });
      broadcastGame();
      break;
    }

    case 'DISTRIBUTE_ROLES': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const { selectedRoles } = payload;
      distributeRoles(game, selectedRoles);
      game.phase = 'role_reveal';
      broadcastGame();
      break;
    }

    case 'REVEAL_ROLE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const player = game.players.find(p => p.id === payload.playerId);
      if (player) {
        game.players.forEach(p => p.showRole = false);
        player.showRole = true;
        broadcastGame();
      }
      break;
    }

    case 'HIDE_ROLE': {
      const game = getGame(MAIN_GAME_ID);
      game.players.forEach(p => p.showRole = false);
      broadcastGame();
      break;
    }

    case 'ACKNOWLEDGE_ROLE': {
      const game = getGame(MAIN_GAME_ID);
      const player = game.players.find(p => p.id === session.playerId);
      if (player) player.showRole = false;
      broadcastGame();
      break;
    }

    case 'START_NIGHT': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      // Auto Mayor win: 3 vivos, sin ejecución hoy, Alcalde vivo
      const livingNow = game.players.filter(p => p.alive);
      const mayorNow  = game.players.find(p => p.role === 'MAYOR' && p.alive && !p.poisoned);
      if (mayorNow && livingNow.length === 3 && !game.executedToday && !game.executionAttemptToday) {
        mayorWin(game);
        broadcastGame();
        broadcastToAll('BROADCAST_EVENT', { title: '🏛️ Victoria del Alcalde', message: 'Quedan 3 jugadores vivos sin ejecución. ¡El bien gana!', type: 'info' });
        recordGameWin(game, 'good');
        broadcastToAll('GAME_OVER', { winner: 'good' });
        break;
      }
      const isFirstNight = game.nightNumber === 0;
      startNight(game);
      if (isFirstNight) recordGameStart(game);
      // El anochecer puede terminar la partida (Vórtice, día extra de la Mente Maestra).
      if (game.phase === 'game_over' && game.winner) {
        broadcastGame();
        broadcastToAll('BROADCAST_EVENT', { title: '🏁 Fin de la partida', message: game.winReason || 'La partida ha terminado', type: 'info' });
        recordGameWin(game, game.winner);
        broadcastToAll('GAME_OVER', { winner: game.winner });
        break;
      }
      teleportToNightRooms(game);
      setPlazaChannelPermission(false).catch(() => {});
      broadcastGame();
      broadcastToAll('NOTIFICATION', { message: `🌙 Noche ${game.nightNumber} ha comenzado`, type: 'night' });
      // Solo en modo automático la noche vacía avanza sola; en manual la dirige el narrador.
      if (game.autoMode && game.nightQueue.length === 0) {
        setTimeout(() => triggerAutoDawn(game), 5000);
      }
      break;
    }

    case 'AUTO_MODE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const roles = autoSelectRoles(game.players.length, game.campaignId);
      distributeRoles(game, roles);
      game.autoMode = true;
      startNight(game);
      recordGameStart(game);
      teleportToNightRooms(game);
      setPlazaChannelPermission(false).catch(() => {});
      broadcastGame();
      broadcastToAll('NOTIFICATION', { message: '🤖 Modo automático activado — Primera Noche comenzando...', type: 'night' });
      if (game.nightQueue.length === 0) {
        setAutoTimer(MAIN_GAME_ID, () => triggerAutoDawn(game), 5000);
      }
      break;
    }

    case 'SET_AUTO_TIMINGS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      if (payload.dayMs !== undefined) game.autoDayMs = Math.max(60000, Math.min(1800000, payload.dayMs));
      if (payload.nomMs !== undefined) game.autoNomMs = Math.max(60000, Math.min(1800000, payload.nomMs));
      broadcastGame();
      break;
    }

    case 'STOP_AUTO_MODE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      game.autoMode = false;
      game.autoPhaseInfo = null;
      const tStop = autoTimers.get(MAIN_GAME_ID);
      if (tStop) { clearTimeout(tStop); autoTimers.delete(MAIN_GAME_ID); }
      broadcastGame();
      break;
    }

    case 'START_DAY': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      startDay(game);
      teleportAllToPlaza(game);
      setPlazaChannelPermission(true).catch(() => {});
      broadcastGame();
      const deaths = payload.nightDeaths || [];
      const msg = deaths.length > 0
        ? `☀️ Día ${game.dayNumber}. Murió: ${deaths.join(', ')}.`
        : `☀️ Día ${game.dayNumber}. Nadie murió esta noche.`;
      broadcastToAll('NOTIFICATION', { message: msg, type: 'day' });
      break;
    }

    case 'OPEN_NOMINATIONS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      openNominations(game);
      broadcastGame();
      broadcastToAll('NOTIFICATION', { message: '⚖️ Las nominaciones están abiertas', type: 'info' });
      break;
    }

    case 'MAYOR_WIN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      mayorWin(game);
      broadcastGame();
      break;
    }

    case 'NOMINATE': {
      const game = requireGame(session);
      const result = nominate(game, session.playerId, payload.nomineeId);
      broadcastGame();
      if (result.virginTrigger) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🛡️ ¡Virgen!',
          message: `${result.executed.name} nominó a la Virgen y fue ejecutado/a inmediatamente.`,
          type: 'execution',
        });
      } else if (result.golemTrigger) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🗿 ¡Gólem!',
          message: `${result.killed.name} murió al ser nominado por el Gólem.`,
          type: 'execution',
        });
      } else {
        const nom = result.nomination;
        broadcastToAll('NOTIFICATION', { message: `⚖️ ${nom.nominatorName} nomina a ${nom.nomineeName}`, type: 'nomination' });
      }
      if (game.phase === 'game_over' && game.winner) {
        recordGameWin(game, game.winner);
        broadcastToAll('GAME_OVER', { winner: game.winner });
      }
      break;
    }

    case 'VOTE': {
      const game = requireGame(session);
      const nomination = vote(game, session.playerId, payload.nominationId, payload.inFavor);

      const living = game.players.filter(p => p.alive);
      const eligibleDead = game.players.filter(p => !p.alive && p.deadVoteNominationId === null);
      const ghostDeclines = nomination.ghostDeclines || [];
      const allVoted = [...living, ...eligibleDead].every(p =>
        nomination.votes.includes(p.id) || nomination.against.includes(p.id) || ghostDeclines.includes(p.id)
      );

      const voter = game.players.find(p => p.id === session.playerId);
      if (voter) {
        const voteLabel = payload.inFavor ? '✅ a favor' : '❌ en contra';
        broadcastToAll('NOTIFICATION', { message: `🗳️ ${voter.name} vota ${voteLabel} de ${nomination.nomineeName}`, type: 'vote' });
      }

      // El avance de turno horario lo hace vote() en gameLogic.

      // Con narrador, la votación la cierra él (RESOLVE_VOTE). Solo auto-resuelve sin narrador.
      if (allVoted && !nomination.resolved && game.autoMode) {
        const result = resolveVote(game, nomination.id);
        broadcastGame();
        const msg = result.meetsThreshold
          ? `🗳️ ${result.nomineeName}: ${result.tally} votos — ✓ alcanza el umbral`
          : `🗳️ ${result.nomineeName}: ${result.tally} votos — ✗ no alcanza`;
        broadcastToAll('NOTIFICATION', { message: msg, type: 'info' });
        if (game.pendingNightAfterNomination && !game.activeNomination) {
          game.pendingNightAfterNomination = false;
          setTimeout(() => scheduleAutoNight(game), 1500);
        }
      } else {
        broadcastGame();
      }
      break;
    }

    // ── Fase de argumentos: el narrador da la palabra al acusador / acusado ──
    case 'SET_ARG_SPEAKER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const nom = game.nominations.find(n => n.id === payload.nominationId);
      if (nom && !nom.resolved) {
        const who = payload.who === 'nominee' ? 'nominee' : 'nominator';
        nom.argSpeaker = who;
        const speakerId = who === 'nominee' ? nom.nomineeId : nom.nominatorId;
        const seconds = Math.max(10, Math.min(600, payload.seconds || 60));
        nom.argueTimer = { playerId: speakerId, endsAt: Date.now() + seconds * 1000, seconds };
        const sp = game.players.find(p => p.id === speakerId);
        broadcastToAll('NOTIFICATION', { message: `🗣 Argumentos de ${sp?.name || '?'} (${seconds}s)`, type: 'info' });
      }
      broadcastGame();
      break;
    }

    // ── Abrir la votación tras los argumentos (empieza por el nominador) ──
    case 'OPEN_VOTING': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const nom = game.nominations.find(n => n.id === payload.nominationId);
      if (nom && !nom.resolved) {
        nom.stage = 'voting';
        nom.argSpeaker = null;
        nom.voteTurnIndex = 0;
        nom.argueTimer = null;
        broadcastToAll('NOTIFICATION', { message: '🗳️ Votación abierta — empieza el nominador', type: 'vote' });
      }
      broadcastGame();
      break;
    }

    case 'RESOLVE_VOTE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const result = resolveVote(game, payload.nominationId);
      broadcastGame();
      const msg = result.meetsThreshold
        ? `🗳️ ${result.nomineeName}: ${result.tally} votos — ✓ alcanza el umbral`
        : `🗳️ ${result.nomineeName}: ${result.tally} votos — ✗ no alcanza`;
      broadcastToAll('NOTIFICATION', { message: msg, type: 'info' });
      if (game.pendingNightAfterNomination && !game.activeNomination) {
        game.pendingNightAfterNomination = false;
        setTimeout(() => scheduleAutoNight(game), 1500);
      }
      break;
    }

    case 'FINALIZE_NOMINATIONS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const result = executeNominationWinner(game);
      broadcastGame();
      if (result.tie) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '⚖️ Empate',
          message: 'Hay un empate en votos. Nadie es ejecutado.',
          type: 'warning',
        });
      } else if (result.vizierSurvived) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '👑 El Visir sobrevive',
          message: `${result.executed.name} es el Visir y no puede morir durante el día.`,
          type: 'warning',
        });
      } else if (result.narratorExecuted) {
        if (result.gameOver) {
          broadcastToAll('BROADCAST_EVENT', {
            title: '🎙 ¡El Narrador ha sido ejecutado!',
            message: 'El Ateo estaba en juego — el pueblo acertó. Gana el bando bueno.',
            type: 'execution',
          });
          recordGameWin(game, result.winner);
          broadcastToAll('GAME_OVER', { winner: result.winner });
        } else {
          broadcastToAll('BROADCAST_EVENT', {
            title: '🎙 El pueblo ejecutó al Narrador',
            message: 'Pero el Narrador no puede morir… la ejecución del día se ha gastado.',
            type: 'warning',
          });
        }
      } else if (result.executed) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '💀 Ejecución',
          message: `${result.executed.name} fue ejecutado con ${game.nominations.find(n => n.executed)?.tally || '?'} votos.`,
          type: 'execution',
        });
        if (result.gameOver) { recordGameWin(game, result.winner); broadcastToAll('GAME_OVER', { winner: result.winner }); }
      } else {
        broadcastToAll('NOTIFICATION', { message: '🌙 Nominaciones cerradas sin ejecución', type: 'info' });
      }
      break;
    }

    case 'NIGHT_ACTION': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      if (payload.actionType === 'SEND_INFO') {
        const actor = game.players.find(p => p.id === payload.actorId);
        if (actor) actor.nightInfo = payload.info || '';
      } else {
        applyNightAction(game, payload.actionType, payload.actorId, payload.targetIds || []);
      }
      broadcastGame();
      break;
    }

    case 'PLAYER_NIGHT_ACTION': {
      const game = requireGame(session);
      const player = game.players.find(p => p.id === session.playerId);
      if (!player) throw new Error('Jugador no encontrado');
      const { action, targetIds } = payload;

      const allowed = ['BUTLER_MASTER', 'FORTUNE_TELLER', 'RAVENKEEPER_INFO', 'POISONER_ACTION', 'IMP_KILL', 'MONK_PROTECT', 'INFO_ACKNOWLEDGE'];
      if (!allowed.includes(action)) throw new Error('Acción no permitida como jugador');

      if (action === 'RAVENKEEPER_INFO') {
        if (!player.pendingRavenkeeper) throw new Error('No tienes esta acción pendiente');
        applyNightAction(game, 'RAVENKEEPER_INFO', session.playerId, targetIds || []);
        if (game.nightWaitingForRavenkeeper) {
          game.nightWaitingForRavenkeeper = false;
        }
        broadcastGame();
        // Don't auto-dawn yet — wait for Ravenkeeper to acknowledge (NIGHT_READY)
        break;
      }

      const result = advanceNightQueue(game, session.playerId, action, targetIds || []);
      broadcastGame();

      if (result.done) {
        if (!tryAutoAdvanceDawn(game)) {
          broadcastToAll('NOTIFICATION', { message: '✅ Todas las acciones nocturnas completadas', type: 'info' });
        } else {
          broadcastGame();
        }
      } else if (result.needsRavenkeeper) {
        broadcastToAll('NOTIFICATION', { message: '🦅 Esperando al Criacuervos...', type: 'info' });
      }
      break;
    }

    case 'SLAYER_ACTION': {
      // Solo el narrador ejecuta el disparo del Exterminador (cuando el jugador se lo pide).
      if (!session.isNarrator) throw new Error('El disparo del Exterminador lo ejecuta el narrador — pídeselo');
      const game = requireGame(session);
      const slayerId = payload.slayerId;
      const slayer = game.players.find(p => p.id === slayerId);
      const targetName = game.players.find(p => p.id === payload.targetId)?.name || '?';
      const result = slayerAction(game, slayerId, payload.targetId);
      broadcastGame();
      if (result.poisoned) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🏹 Exterminador disparó',
          message: `${slayer?.name} disparó a ${targetName}... No hubo efecto.`,
          type: 'warning',
        });
      } else if (result.hit) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🏹 ¡Exterminador acertó!',
          message: `${slayer?.name} disparó a ${targetName}. ¡Era el Demonio! ${targetName} muere.`,
          type: 'execution',
        });
        if (result.gameOver) { recordGameWin(game, 'good'); broadcastToAll('GAME_OVER', { winner: 'good' }); }
      } else {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🏹 Exterminador falló',
          message: `${slayer?.name} disparó a ${targetName}. No era el Demonio.`,
          type: 'warning',
        });
      }
      break;
    }

    case 'SET_BLUFF_ROLE': {
      const game = requireGame(session);
      const player = game.players.find(p => p.id === session.playerId);
      if (!player || player.alignment !== 'evil') throw new Error('Solo jugadores malvados pueden elegir rol de farol');
      player.bluffRole = payload.roleId || null;
      broadcastGame();
      break;
    }

    case 'ACCUSE': {
      const game = requireGame(session);
      const target = game.players.find(p => p.id === payload.targetId);
      const accuser = game.players.find(p => p.id === session.playerId);
      if (target && accuser) {
        if (!Array.isArray(target.accusations)) target.accusations = [];
        // Una sospecha por acusador (reemplaza la suya previa).
        target.accusations = target.accusations.filter(a => a.accuserId !== session.playerId);
        if (payload.accusedRole) {
          target.accusations.push({ roleId: payload.accusedRole, accuserId: session.playerId, accuserName: accuser.name, atDay: game.dayNumber });
        }
        broadcastGame();
      }
      break;
    }

    // ── Asistente: pendientes diferidos (Po, Pukka, etc.) ──
    case 'ADD_DEFERRED': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      addDeferred(game, {
        label: payload.label,
        dueNight: payload.dueNight ?? (game.nightNumber + 1),
        sourcePlayerId: payload.sourcePlayerId || null,
        severity: payload.severity || 'warn',
        role: payload.role || null,
      });
      broadcastGame();
      break;
    }

    case 'RESOLVE_DEFERRED': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const d = (game.deferredEffects || []).find(x => x.id === payload.id);
      if (d) d.resolved = true;
      broadcastGame();
      break;
    }

    case 'KILL_PLAYER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      killPlayer(game, payload.playerId, payload.reason || 'manual');
      if (game.phase === 'game_over' && game.winner) {
        recordGameWin(game, game.winner);
        broadcastToAll('GAME_OVER', { winner: game.winner });
      }
      broadcastGame();
      break;
    }

    case 'DECLARE_WINNER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const { winner, reason } = payload;
      if (winner !== 'good' && winner !== 'evil') throw new Error('winner debe ser good o evil');
      game.winner = winner;
      game.phase = 'game_over';
      game.winReason = reason || (winner === 'good' ? 'El Bien declara victoria' : 'El Mal declara victoria');
      recordGameWin(game, winner);
      broadcastToAll('GAME_OVER', { winner });
      broadcastGame();
      break;
    }

    case 'REVIVE_PLAYER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      revivePlayer(game, payload.playerId);
      broadcastGame();
      break;
    }

    case 'SET_PHASE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      game.phase = payload.phase;
      broadcastGame();
      break;
    }

    case 'SET_SMOKE_SCREEN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      game.smokeScreenPlayerId = payload.playerId || null;
      broadcastGame();
      break;
    }

    case 'SET_RECLUSE_REGISTERS_AS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      game.recluseRegistersAs = payload.value || null;
      broadcastGame();
      break;
    }

    case 'SET_SPY_REGISTERS_AS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      game.spyRegistersAs = payload.value || null;
      broadcastGame();
      break;
    }

    case 'SET_MAYOR_KILL_TARGET': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      game.mayorKillTarget = payload.playerId || null;
      broadcastGame();
      break;
    }

    case 'MOVE_TO_CHANNEL': {
      const game = requireGame(session);
      const channelLimits = game.channelLimits || {};
      if (session.isNarrator) {
        if (payload.moveAll) {
          const dest = payload.channel || 'PLAZA';
          game.players.forEach(p => {
            p.discordChannel = payload.channel || null;
            if (p.discordId) {
              moveUserToChannel(p.discordId, dest, channelLimits).catch(() => {});
            }
          });
          // Los narradores acompañan al grupo cuando se mueve a todos.
          teleportNarratorsTo(dest);
        } else if (payload.targetPlayerId) {
          const target = game.players.find(p => p.id === payload.targetPlayerId);
          if (!target) throw new Error('Jugador no encontrado');
          target.discordChannel = payload.channel || null;
          if (target.discordId) moveUserToChannel(target.discordId, payload.channel || 'PLAZA', channelLimits).catch(() => {});
        }
        broadcastGame();
        break;
      }
      const player = game.players.find(p => p.id === session.playerId);
      if (!player) throw new Error('Jugador no encontrado');
      // Check channel capacity from game state
      if (payload.channel) {
        const limit = channelLimits[payload.channel];
        if (limit) {
          const count = game.players.filter(p => p.discordChannel === payload.channel && p.id !== player.id).length;
          if (count >= limit) { sendTo(ws, 'CHANNEL_FULL', { channel: payload.channel, limit }); break; }
        }
      }
      player.discordChannel = payload.channel || null;
      broadcastGame();
      if (player.discordId) {
        moveUserToChannel(player.discordId, payload.channel || 'PLAZA', channelLimits).then(result => {
          sendTo(ws, 'CHANNEL_MOVED', result);
          if (!result.ok) {
            // Revert game state if Discord move failed
            player.discordChannel = null;
            broadcastGame();
          }
        });
      }
      break;
    }

    case 'GET_DISCORD_MEMBERS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      getGuildMembers().then(members => {
        sendTo(ws, 'DISCORD_MEMBERS', { members });
        // El fetch dispara la sincronización por rol de narrador: si entraron
        // narradores nuevos, el picker debe verlos ya.
        if (getConfig().narratorRoleId) {
          syncNarratorsFromRole().then(synced => {
            if (synced) {
              const g = getGame(MAIN_GAME_ID);
              g.narratorDiscordIds = getBotConfig().narratorUserIds;
              broadcastGame();
            }
          }).catch(() => {});
        }
      });
      break;
    }

    case 'REFRESH_DISCORD_MEMBERS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      getGuildMembers(true).then(members => {
        sendTo(ws, 'DISCORD_MEMBERS', { members });
        if (getConfig().narratorRoleId) {
          syncNarratorsFromRole().then(synced => {
            if (synced) {
              const g = getGame(MAIN_GAME_ID);
              g.narratorDiscordIds = getBotConfig().narratorUserIds;
              broadcastGame();
            }
          }).catch(() => {});
        }
      });
      break;
    }

    case 'TOGGLE_STATUS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const p = game.players.find(x => x.id === payload.playerId);
      if (p) {
        if (!Array.isArray(p.statuses)) p.statuses = [];
        const s = payload.status;
        const i = p.statuses.indexOf(s);
        if (i >= 0) p.statuses.splice(i, 1); else p.statuses.push(s);
      }
      broadcastGame();
      break;
    }

    case 'CLEAR_STATUSES': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const p = game.players.find(x => x.id === payload.playerId);
      if (p) { p.statuses = []; p.tokens = []; }
      broadcastGame();
      break;
    }

    // ── Fichas/tokens del grimorio (arte de rol sobre el jugador afectado) ──
    case 'ADD_TOKEN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      // El motor comparte identidad con las fichas automáticas: colocar a mano
      // la misma ficha que ya puso el motor no la duplica.
      placeManualToken(game, payload.playerId, payload.token, !!payload.toggle);
      broadcastGame();
      break;
    }

    // Contadores que el narrador lleva a mano (Yaggababble: veces que dijo su
    // frase hoy). Viven en el servidor para sobrevivir al cierre del panel y
    // para que la noche pueda leer lo contado durante el DÍA.
    case 'SET_COUNTER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const ALLOWED = { yaggaSaidToday: 5 };
      const max = ALLOWED[payload.key];
      if (max === undefined) throw new Error('Contador desconocido');
      if (!game.counters) game.counters = {};
      game.counters[payload.key] = Math.max(0, Math.min(max, Number(payload.value) || 0));
      broadcastGame();
      break;
    }

    case 'REMOVE_TOKEN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      // Acepta `uid` (nuevo) o `instanceId` (partidas ya en curso).
      removePlayerToken(game, payload.playerId, payload.uid || payload.instanceId);
      broadcastGame();
      break;
    }

    // ── Nominación fijada por el narrador (nominador + nominado) ──
    case 'NOMINATE_AS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      // Comodidad: si aún es de día, abre nominaciones automáticamente.
      if (game.phase === 'day') openNominations(game);
      const result = nominate(game, payload.nominatorId, payload.nomineeId);
      broadcastGame();
      if (result.virginTrigger) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🛡️ ¡Virgen!',
          message: `${result.executed.name} nominó a la Virgen y fue ejecutado/a inmediatamente.`,
          type: 'execution',
        });
      } else if (result.golemTrigger) {
        broadcastToAll('BROADCAST_EVENT', {
          title: '🗿 ¡Gólem!',
          message: `${result.killed.name} murió al ser nominado por el Gólem.`,
          type: 'execution',
        });
      } else {
        const nom = result.nomination;
        broadcastToAll('NOTIFICATION', { message: `⚖️ ${nom.nominatorName} nomina a ${nom.nomineeName}`, type: 'nomination' });
      }
      if (game.phase === 'game_over' && game.winner) {
        recordGameWin(game, game.winner);
        broadcastToAll('GAME_OVER', { winner: game.winner });
      }
      break;
    }

    // ── Voto emitido por el narrador en nombre de un jugador ──
    case 'VOTE_AS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const nomination = vote(game, payload.playerId, payload.nominationId, payload.inFavor);
      const voter = game.players.find(p => p.id === payload.playerId);
      broadcastGame();
      broadcastToAll('NOTIFICATION', {
        message: `🗳️ ${voter?.name || '?'} vota ${payload.inFavor ? '✅ a favor' : '❌ en contra'} de ${nomination.nomineeName} (por el narrador)`,
        type: 'vote',
      });
      break;
    }

    // ── Expulsar la SESIÓN de un jugador (libera su asiento para re-unirse) ──
    case 'KICK_PLAYER_SESSION': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const target = game?.players.find(p => p.id === payload.playerId);
      const kicked = kickPlayerSession(game, payload.playerId);
      sendTo(ws, 'NOTIFICATION', {
        message: kicked > 0
          ? `🔌 Sesión de ${target?.name || '?'} expulsada (${kicked}). Ya puede volver a unirse.`
          : `🔌 ${target?.name || '?'} no tenía sesión activa — su asiento ya está libre.`,
        type: 'info',
      });
      broadcastGame();
      break;
    }

    // ── Ceder el asiento a otra persona ──────────────────────────────
    // El asiento conserva personaje, fichas, vivo/muerto y votos: solo cambia
    // quién lo ocupa. REMOVE_PLAYER + ADD_PLAYER no vale porque borra el
    // asiento y vuelve a lanzar el montaje.
    case 'REPLACE_PLAYER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const before = game.players.find(p => p.id === payload.playerId)?.name;
      const p = replacePlayer(game, payload.playerId, {
        name: payload.newName ?? payload.name,
        discordId: payload.discordId,
        discordTag: payload.discordTag,
        avatar: payload.avatar,
      });
      kickPlayerSession(game, payload.playerId);
      sendTo(ws, 'NOTIFICATION', {
        message: `🔄 ${before} → ${p.name}. Conserva su personaje y sus fichas; ya puede entrar con ese nombre.`,
        type: 'info',
      });
      broadcastGame();
      break;
    }

    // ── Avanzar el turno de voto (sentido horario) ──
    case 'ADVANCE_VOTE_TURN': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const nom = game.nominations.find(n => n.id === payload.nominationId);
      if (nom && !nom.resolved) {
        const max = Array.isArray(nom.voteOrder) ? nom.voteOrder.length : 0;
        if (typeof payload.turnIndex === 'number') nom.voteTurnIndex = Math.max(0, Math.min(max, payload.turnIndex));
        else nom.voteTurnIndex = Math.min(max, (nom.voteTurnIndex || 0) + 1);
        nom.argueTimer = null;
      }
      broadcastGame();
      break;
    }

    // ── Temporizador de argumentos por jugador ──
    case 'START_ARGUE_TIMER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const nom = game.nominations.find(n => n.id === payload.nominationId);
      if (nom && !nom.resolved) {
        const seconds = Math.max(5, Math.min(600, payload.seconds || 30));
        nom.argueTimer = { playerId: payload.playerId, endsAt: Date.now() + seconds * 1000, seconds };
      }
      broadcastGame();
      break;
    }

    case 'STOP_ARGUE_TIMER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const nom = game.nominations.find(n => n.id === payload.nominationId);
      if (nom) nom.argueTimer = null;
      broadcastGame();
      break;
    }

    case 'MOVE_NARRATOR_TO_ROOM': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const p = game.players.find(x => x.id === payload.playerId);
      if (!p) throw new Error('Jugador no encontrado');
      Promise.all(getNarratorIds().map(id => moveUserToOwnRoom(id, p.name)))
        .then(results => {
          const ok = results.some(r => r.ok);
          const error = ok ? undefined : (results[0]?.error || 'No se pudo mover');
          sendTo(ws, 'NARRATOR_MOVED', { playerId: p.id, name: p.name, ok, error });
        })
        .catch(() => {});
      break;
    }

    case 'SET_NARRATORS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const ids = Array.isArray(payload.discordIds) ? payload.discordIds : [];
      setNarratorIds(ids)
        .then(applied => {
          game.narratorDiscordIds = applied;
          broadcastGame();
        })
        .catch(err => sendTo(ws, 'ERROR', { message: err.message }));
      break;
    }

    case 'AUTH_ADMIN': {
      // Contraseña del panel Admin: SOLO quien la tenga puede leer y modificar
      // la config del bot (GET_CONFIG / SET_CONFIG). Verificación por hash.
      if (!session.isNarrator) throw new Error('No autorizado');
      if (!verifyAdminPassword(payload.password)) throw new Error('Contraseña incorrecta');
      session.isConfigAdmin = true;
      sendTo(ws, 'ADMIN_AUTH_OK', { ok: true });
      break;
    }

    case 'GET_CONFIG': {
      // Config completa del bot (solo narrador que haya pasado la contraseña
      // de admin, o un admin listado en adminUserIds).
      if (!isConfigAdmin(session)) throw new Error('No autorizado');
      sendTo(ws, 'CONFIG', { config: getBotConfig() });
      break;
    }

    case 'SET_CONFIG': {
      // Guarda IDs de Discord recableables (punto 9 / Q8): guild, categoría de
      // noche, rol de partida, canales y narradores. Solo narrador/admin.
      if (!isConfigAdmin(session)) throw new Error('No autorizado');
      const actor = currentActorId(session);
      const p = payload || {};
      try {
        if (typeof p.guildId === 'string' && p.guildId.trim()) setGuildId(p.guildId, actor);
        if (typeof p.nightCategoryId === 'string' && p.nightCategoryId.trim()) setNightCategoryId(p.nightCategoryId, actor);
        if (typeof p.boctRoleId === 'string' && p.boctRoleId.trim()) setBoctRoleId(p.boctRoleId, actor);
        if (p.channels && typeof p.channels === 'object') setChannelIds(p.channels, actor);
        if (Array.isArray(p.narratorUserIds)) {
          setNarratorIds(p.narratorUserIds).then(() => broadcastGame()).catch(() => {});
        }
        if (typeof p.narratorRoleId === 'string' && p.narratorRoleId.trim()) {
          setNarratorRoleId(p.narratorRoleId, actor);
          // Quien tenga el rol pasa a narrador automáticamente.
          syncNarratorsFromRole().then(synced => {
            if (synced) {
              const g = getGame(MAIN_GAME_ID);
              g.narratorDiscordIds = getBotConfig().narratorUserIds;
              broadcastGame();
            }
          }).catch(() => {});
        }
        if (Array.isArray(p.adminUserIds)) setAdminUserIds(p.adminUserIds, actor);
        if (typeof p.adminPassword === 'string' && p.adminPassword.trim()) {
          setAdminPassword(p.adminPassword.trim(), actor);
        }
        const cfg = getBotConfig();
        const game = getGame(MAIN_GAME_ID);
        game.narratorDiscordIds = cfg.narratorUserIds;
        sendTo(ws, 'CONFIG_SAVED', { config: cfg });
        broadcastGame();
      } catch (err) {
        sendTo(ws, 'ERROR', { message: err.message });
      }
      break;
    }

    case 'SET_LOCATION_NAMES': {
      // Nombres de los emplazamientos editables (puntos 2 y 6): se guardan en
      // config y la mesa/canales de la web los usan en vez de los hardcodeados.
      if (!session.isNarrator) throw new Error('No autorizado');
      setLocationNames(payload.names || {}, currentActorId(session));
      broadcastGame();
      sendTo(ws, 'CONFIG_SAVED', { config: getBotConfig() });
      break;
    }

    case 'TEST_ADD_PLAYERS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const count = Math.max(1, Math.min(15 - game.players.length, payload.count || 5));
      const base = game.players.length;
      for (let i = 0; i < count; i++) addPlayer(game, { name: `Prueba ${base + i + 1}` });
      broadcastGame();
      sessions.forEach(s => sendTo(s.ws, 'PLAYER_LIST', {
        players: game.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
      }));
      break;
    }

    case 'TEST_DISTRIBUTE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      if (game.players.length < 5) throw new Error('Necesitas al menos 5 jugadores');
      const roles = autoSelectRoles(game.players.length, game.campaignId);
      distributeRoles(game, roles);
      game.phase = 'role_reveal';
      broadcastGame();
      break;
    }

    case 'PING':
      sendTo(ws, 'PONG', {});
      break;

    case 'ASSIGN_ROLES_MANUAL': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const { assignments } = payload; // [{ playerId, roleId }]
      assignments.forEach(({ playerId, roleId }) => {
        const player = game.players.find(p => p.id === playerId);
        const role = ROLES[roleId];
        if (player && role) {
          player.role = role.id;
          player.alignment = role.alignment;
          player.type = role.type;
          player.alive = true;
          player.poisoned = false;
          player.protected = false;
          if (role.id === 'DRUNK') {
            const fakeTownfolk = getRolesByType('townfolk', game.campaignId).filter(r => r.id !== 'DRUNK');
            player.drunkAs = fakeTownfolk[Math.floor(Math.random() * fakeTownfolk.length)].id;
          }
        }
      });
      const rolesInPlay = new Set(game.players.map(p => p.role));
      const allGoodRoles = [...getRolesByType('townfolk', game.campaignId), ...getRolesByType('outsider', game.campaignId)];
      game.rolesNotInPlay = allGoodRoles.filter(r => !rolesInPlay.has(r.id)).map(r => r.id);
      assignBelievedRoles(game);
      game.phase = 'role_reveal';
      broadcastGame();
      break;
    }

    // ── Cambio de rol a media partida ──────────────────────────────
    // A diferencia de ASSIGN_ROLES_MANUAL, no toca vida, fichas ni fase.
    // mode: 'real' (por defecto) | 'believed' (solo lo que el jugador cree) | 'both'
    // El Narrador cambia una decisión que la regla le deja a él (qué Esbirro
    // hereda el Diablillo, quién muere en lugar del Alcalde…).
    case 'RESOLVE_CHOICE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const { choiceId, pickedId } = payload;
      const choice = resolveChoice(game, choiceId, pickedId);
      broadcastGame(game);
      return { ok: true, choice: choice.id };
    }

    case 'SET_PLAYER_ROLE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const { playerId, roleId, notify = true, mode = 'real' } = payload;
      const player = game.players.find(p => p.id === playerId);
      const role = ROLES[roleId];
      if (!player) throw new Error('Jugador no encontrado');
      if (!role) throw new Error('Personaje no encontrado');

      const previousName = ROLES[player.role]?.name || player.role;

      if (mode === 'believed') {
        // Cerenovus / Marioneta / Lunático: solo cambia lo que el jugador cree ser.
        player.believedRole = role.id;
      } else {
        player.role = role.id;
        player.type = role.type;
        player.alignment = role.alignment;
        // El Borracho necesita un Aldeano falso que no esté en juego.
        if (role.id === 'DRUNK') {
          const fakeTownfolk = getRolesByType('townfolk', game.campaignId).filter(r => r.id !== 'DRUNK');
          player.drunkAs = fakeTownfolk.length
            ? fakeTownfolk[Math.floor(Math.random() * fakeTownfolk.length)].id
            : null;
        } else {
          player.drunkAs = null;
        }
        if (mode === 'both') player.believedRole = role.id;
        else if (player.believedRole === role.id) player.believedRole = null;
      }

      // Los faroles del Demonio no deben ofrecer un personaje que ya está en juego.
      const rolesInPlay = new Set(game.players.map(p => p.role));
      const allGoodRoles = [...getRolesByType('townfolk', game.campaignId), ...getRolesByType('outsider', game.campaignId)];
      game.rolesNotInPlay = allGoodRoles.filter(r => !rolesInPlay.has(r.id)).map(r => r.id);

      syncStatusFlags(game);
      addDeferred(game, {
        label: `🎭 ${player.name}: ${previousName} → ${role.name}${mode === 'believed' ? ' (solo rol creído)' : ''}${notify ? '' : ' — sin avisar'}`,
        dueNight: game.nightNumber, sourcePlayerId: player.id, severity: 'info',
      });

      if (notify) {
        sendToPlayer(playerId, 'NOTIFICATION', {
          message: `🎭 Tu personaje ha cambiado: ahora eres ${role.name}`,
          type: 'info',
        });
        sendToPlayer(playerId, 'ROLE_CHANGED', { roleId: role.id, roleName: role.name });
      }

      // El cambio puede dejar la partida sin Demonios o crear uno nuevo.
      if (mode !== 'believed') checkWinCondition(game);
      broadcastGame();
      break;
    }

    case 'REORDER_PLAYERS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const { playerIds } = payload;
      const reordered = playerIds.map(id => game.players.find(p => p.id === id)).filter(Boolean);
      const missing = game.players.filter(p => !playerIds.includes(p.id));
      game.players = [...reordered, ...missing];
      broadcastGame();
      break;
    }

    case 'SAVE_GAME': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      fs.writeFileSync(SAVE_PATH, JSON.stringify(game), 'utf8');
      sendTo(ws, 'SAVE_OK', { timestamp: Date.now() });
      break;
    }

    case 'LOAD_GAME': {
      if (!session.isNarrator) throw new Error('No autorizado');
      if (!fs.existsSync(SAVE_PATH)) throw new Error('No hay partida guardada');
      const saved = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8'));
      const current = getGame(MAIN_GAME_ID);
      Object.assign(current, saved);
      broadcastGame();
      sendTo(ws, 'LOAD_OK', { timestamp: saved.createdAt });
      break;
    }

    case 'SET_CHANNEL_LIMIT': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      const { channel, limit } = payload;
      if (!game.channelLimits) game.channelLimits = {};
      if (limit === null || limit === undefined || limit === 0) {
        delete game.channelLimits[channel];
      } else {
        game.channelLimits[channel] = limit;
      }
      broadcastGame();
      break;
    }

    case 'SET_DRUNK_AS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      game.narratorDrunkAs = payload.roleId || null;
      broadcastGame();
      break;
    }

    case 'SET_ROLES_FOR_IMP': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      game.narratorRolesForImp = payload.roleIds || [];
      broadcastGame();
      break;
    }

    // ── Asistente de montaje (Addendum 2) ─────────────────────────────
    case 'SETUP_SET_SEAT_ORDER': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      ensureSetup(game);
      const order = payload.seatOrder || [];
      game.setup.seatOrder = order;
      // Reordena los jugadores para que coincidan con el círculo elegido.
      const reordered = order.map(id => game.players.find(p => p.id === id)).filter(Boolean);
      const missing = game.players.filter(p => !order.includes(p.id));
      game.players = [...reordered, ...missing];
      recomputeSetup(game);
      broadcastGame();
      break;
    }

    case 'SETUP_SET_ASSIGNMENTS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      ensureSetup(game);
      game.setup.assignments = payload.assignments || {};
      recomputeSetup(game);
      broadcastGame();
      break;
    }

    case 'SETUP_ASSIGN_ROLE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      ensureSetup(game);
      const { seatId, roleId } = payload;
      if (roleId) game.setup.assignments[seatId] = roleId;
      else delete game.setup.assignments[seatId];
      recomputeSetup(game);
      broadcastGame();
      break;
    }

    case 'SETUP_SET_DECISION': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      ensureSetup(game);
      const { id, patch } = payload;
      const d = (game.setup.decisions || []).find(x => x.id === id);
      if (d) Object.assign(d, patch || {});
      broadcastGame();
      break;
    }

    case 'SETUP_SUGGEST': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      ensureSetup(game);
      const ds = game.setup.decisions || [];
      if (payload.id) {
        const i = ds.findIndex(x => x.id === payload.id);
        if (i >= 0) ds[i] = suggestDecision(ds[i], game);
      } else {
        game.setup.decisions = ds.map(d => isDecisionResolved(d) ? d : suggestDecision(d, game));
      }
      broadcastGame();
      break;
    }

    case 'SETUP_LOCK': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      ensureSetup(game);
      recomputeSetup(game);
      const assignedCount = Object.keys(game.setup.assignments).length;
      if (assignedCount < game.players.length) throw new Error('Faltan asientos por asignar un rol');
      if (!isSetupComplete(game.setup.decisions)) throw new Error('Faltan decisiones de montaje por resolver');
      const assignedRoles = Object.values(game.setup.assignments);
      if (assignedRoles.includes('ATHEIST')) {
        const campaign = getCampaign(game.campaignId);
        const evilAssigned = assignedRoles.filter(rid => campaign.roles[rid]?.alignment === 'evil');
        if (evilAssigned.length > 0) throw new Error('Con Ateo: no puede haber roles malvados asignados');
      }
      applySetup(game);
      // Maestro de Acertijos: aplicar borrachera permanente al jugador elegido en setup
      const pmDec = (game.setup.decisions || []).find(d => d.kind === 'puzzlemasterDrunk');
      if (pmDec?.chosen) {
        const drunkPlayer = game.players.find(p => p.id === pmDec.chosen || p.seatId === pmDec.chosen);
        if (drunkPlayer) {
          placeToken(drunkPlayer, {
            type: 'DRUNK_NIGHT', roleId: 'PUZZLEMASTER', label: 'Borracho (Maestro)',
            expiry: [], sourceRole: 'PUZZLEMASTER', sourcePlayerId: null,
          }, game);
          syncStatusFlags(game);
        }
      }
      broadcastGame();
      break;
    }

    case 'NIGHT_NARRATOR_ACTION': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = getGame(MAIN_GAME_ID);
      if (!game || !['first_night', 'night'].includes(game.phase)) break;
      const { actorId, nightInfo, bluffs, redHerringSeatId, actionType, targetIds } = payload;
      if (nightInfo !== undefined && actorId) {
        const actor = game.players.find(p => p.id === actorId);
        if (actor) actor.nightInfo = nightInfo || null;
      }
      if (bluffs !== undefined) {
        game.narratorRolesForImp = Array.isArray(bluffs) ? bluffs : [];
        regenDemonNightInfo(game);
      }
      if (redHerringSeatId !== undefined) {
        game.smokeScreenPlayerId = redHerringSeatId || null;
      }
      // `actorId` puede ser null: son las acciones de estado que el narrador
      // aplica por su cuenta desde el panel del jugador (envenenar, proteger,
      // limpiar). La ficha se atribuye entonces al NARRADOR.
      const NARRATOR_SELF_ACTIONS = new Set(['POISON', 'MAKE_DRUNK', 'SAFE', 'CLEAR_STATUS']);
      if (actionType && Array.isArray(targetIds) && (actorId || NARRATOR_SELF_ACTIONS.has(actionType))) {
        applyNightAction(game, actionType, actorId || null, targetIds);
      }
      // Maestro de Acertijos: revelar Demonio si adivinó correctamente
      if (actionType === 'PUZZLEMASTER_REVEAL' && actorId) {
        const pm = game.players.find(p => p.id === actorId);
        const demon = game.players.find(p => p.type === 'demon' && p.alive);
        if (pm && demon && !pm.poisoned) {
          pm.nightInfo = `🧩 Maestro\nEl Demonio es: ${demon.name}.`;
        }
      }
      broadcastGame();
      break;
    }

    case 'MOVE_TO_SECRET': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const { targetPlayerId } = payload;
      const target = game.players.find(p => p.id === targetPlayerId);
      if (!target) throw new Error('Jugador no encontrado');
      if (target.discordId) {
        moveUserToChannel(target.discordId, 'CONFESIONARIO').then(result => {
          sendTo(ws, 'SECRET_MOVED', { playerId: targetPlayerId, name: target.name, ...result });
        }).catch(() => {});
      }
      break;
    }

    case 'CAST_AUTO_VOTE': {
      const game = requireGame(session);
      const { voteType } = payload;
      if (!['skipDay', 'skipNom', 'extend', 'skipNight'].includes(voteType)) break;
      const voter = game.players.find(p => p.id === session.playerId);
      if (!voter) throw new Error('Jugador no encontrado');
      if (!game.autoVotes) game.autoVotes = { skipDay: [], skipNom: [], extend: [], skipNight: [] };
      if (!game.autoVotes[voteType]) game.autoVotes[voteType] = [];
      const arr = game.autoVotes[voteType];
      const idx = arr.indexOf(session.playerId);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(session.playerId);
      const total = game.players.length;
      const threshold = Math.ceil(total * 0.8);
      broadcastGame();
      if (arr.length >= threshold) {
        if (voteType === 'skipDay' && game.phase === 'day') {
          game.autoVotes.skipDay = [];
          const t = autoTimers.get(MAIN_GAME_ID);
          if (t) { clearTimeout(t); autoTimers.delete(MAIN_GAME_ID); }
          teleportAllToPlaza(game);
          openNominations(game);
          const nomMin = Math.round((game.autoNomMs || AUTO_NOM_MS) / 60000);
          broadcastToAll('NOTIFICATION', { message: `⚡ 80% de acuerdo — nominaciones abiertas (${nomMin} min)`, type: 'info' });
          scheduleAutoNominations(game);
          broadcastGame();
        } else if (voteType === 'skipNom' && ['nominations', 'voting'].includes(game.phase)) {
          game.autoVotes.skipNom = [];
          const t = autoTimers.get(MAIN_GAME_ID);
          if (t) { clearTimeout(t); autoTimers.delete(MAIN_GAME_ID); }
          if (game.activeNomination) {
            // Votación en curso — esperar a que termine antes de pasar a la noche
            game.pendingNightAfterNomination = true;
            broadcastToAll('NOTIFICATION', { message: '⚡ 80% de acuerdo — esperando fin de la votación para pasar a la noche', type: 'night' });
            broadcastGame();
          } else {
            broadcastToAll('NOTIFICATION', { message: '⚡ 80% de acuerdo — pasando a la noche', type: 'night' });
            scheduleAutoNight(game);
            broadcastGame();
          }
        } else if (voteType === 'extend' && ['nominations', 'voting'].includes(game.phase)) {
          game.autoVotes.extend = [];
          const EXTEND_MS = 90 * 1000;
          if (game.autoPhaseInfo) game.autoPhaseInfo.endsAt = (game.autoPhaseInfo.endsAt || Date.now()) + EXTEND_MS;
          const t = autoTimers.get(MAIN_GAME_ID);
          if (t) clearTimeout(t);
          const remaining = game.autoPhaseInfo ? Math.max(EXTEND_MS, game.autoPhaseInfo.endsAt - Date.now()) : EXTEND_MS;
          const newId = setTimeout(() => {
            if (!game.autoMode) return;
            if (game.activeNomination) { game.pendingNightAfterNomination = true; broadcastGame(); return; }
            scheduleAutoNight(game);
          }, remaining);
          autoTimers.set(MAIN_GAME_ID, newId);
          broadcastToAll('NOTIFICATION', { message: '⚡ 80% de acuerdo — +1:30 de nominaciones', type: 'info' });
          broadcastGame();
        } else if (voteType === 'skipNight' && ['first_night', 'night'].includes(game.phase)) {
          game.autoVotes.skipNight = [];
          broadcastToAll('NOTIFICATION', { message: '⚡ 80% de acuerdo — saltando al día', type: 'day' });
          triggerAutoDawn(game);
          broadcastGame();
        }
      }
      break;
    }

    case 'IMP_DAY_SHOT': {
      // Solo el narrador ejecuta el disparo fingido (el jugador se lo pide en persona).
      if (!session.isNarrator) throw new Error('El disparo fingido lo ejecuta el narrador — pídeselo');
      const game = requireGame(session);
      const shooter = game.players.find(p => p.id === payload.shooterId);
      const target  = game.players.find(p => p.id === payload.targetId);
      if (!shooter || shooter.alignment !== 'evil') throw new Error('Solo jugadores malvados pueden fingir el disparo');
      if (!shooter.alive) throw new Error('El tirador debe estar vivo');
      if (shooter.impShotUsed) throw new Error('Ese jugador ya usó su disparo fingido esta partida');
      if (!['day', 'nominations', 'voting'].includes(game.phase)) throw new Error('Solo se puede usar de día');
      shooter.impShotUsed = true;
      broadcastGame();
      broadcastToAll('BROADCAST_EVENT', {
        title: '🏹 Exterminador disparó',
        message: `${shooter.name} disparó a ${target?.name || '?'}. No era el Demonio.`,
        type: 'warning',
      });
      break;
    }

    // ── Hechicero: el jugador pide su deseo en privado ─────────────
    case 'WISH_REQUEST': {
      const game = requireGame(session);
      const wizard = game.players.find(p => p.role === 'WIZARD');
      // El narrador puede escribirlo en su nombre si el deseo se dijo en voz alta.
      if (!session.isNarrator) {
        if (!wizard || wizard.id !== session.playerId) throw new Error('No eres el Hechicero');
        if (!wizard.alive) throw new Error('Estás muerto');
      }
      if (game.wish && !['denied_retry'].includes(game.wish.status)) {
        throw new Error('Ya has pedido tu deseo');
      }
      const text = String(payload.text || '').slice(0, 2000);
      if (!text.trim()) throw new Error('El deseo no puede estar vacío');
      game.wish = {
        text, status: 'pending', effects: [], price: '', clue: '',
        announced: false, priceRevealed: false, askedAt: Date.now(),
      };
      addDeferred(game, {
        label: `🧙 El Hechicero pide un deseo: «${text}» — atiéndelo en privado antes de decidir.`,
        dueNight: game.nightNumber, sourcePlayerId: wizard?.id, severity: 'warn', role: 'WIZARD',
      });
      if (wizard) sendToPlayer(wizard.id, 'NOTIFICATION', { message: '🧙 Tu deseo ha llegado al Narrador', type: 'info' });
      broadcastGame();
      break;
    }

    // El narrador concede, deniega para que pida otro, o deniega en firme.
    case 'WISH_RESOLVE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      if (!game.wish) throw new Error('No hay ningún deseo pendiente');
      const { decision } = payload; // 'grant' | 'retry' | 'deny'
      const wizard = game.players.find(p => p.role === 'WIZARD');
      if (decision === 'retry') {
        game.wish.status = 'denied_retry';
        if (wizard) sendToPlayer(wizard.id, 'NOTIFICATION', { message: '🧙 Ese deseo no puede concederse — pide otro', type: 'info' });
      } else if (decision === 'deny') {
        game.wish.status = 'denied';
        if (wizard) sendToPlayer(wizard.id, 'NOTIFICATION', { message: '🧙 Ya no te quedan deseos', type: 'info' });
      } else {
        game.wish.status = 'granted';
        if (wizard) sendToPlayer(wizard.id, 'NOTIFICATION', { message: '🧙 Tus deseos son órdenes', type: 'info' });
      }
      broadcastGame();
      break;
    }

    // Aplica un efecto del catálogo o uno libre. Se pueden encadenar varios.
    case 'WISH_APPLY': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      if (!game.wish) throw new Error('No hay ningún deseo');
      const { apply, targetId, targetId2, roleId, winner, note } = payload;
      const summary = applyWish(game, apply, { targetId, targetId2, roleId, winner });
      game.wish.status = 'granted';
      game.wish.effects = [...(game.wish.effects || []), { apply, summary, note: note || '' }];
      addDeferred(game, {
        label: `🧙 Deseo concedido: ${summary}`,
        dueNight: game.nightNumber, severity: 'info', role: 'WIZARD',
      });
      broadcastGame();
      break;
    }

    // Precio y pista: el narrador los edita y decide cuánto se hace público.
    case 'WISH_SET_TERMS': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      if (!game.wish) throw new Error('No hay ningún deseo');
      if (payload.price !== undefined) game.wish.price = String(payload.price).slice(0, 1000);
      if (payload.clue !== undefined) game.wish.clue = String(payload.clue).slice(0, 1000);
      if (payload.priceRevealed !== undefined) game.wish.priceRevealed = !!payload.priceRevealed;
      broadcastGame();
      break;
    }

    // Anuncia públicamente (con pista o sin ella). Nunca ocurre por su cuenta.
    case 'WISH_ANNOUNCE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      if (!game.wish) throw new Error('No hay ningún deseo');
      const withClue = !!payload.withClue;
      game.wish.announced = true;
      if (!withClue) game.wish.clue = '';
      broadcastToAll('NOTIFICATION', {
        message: withClue && game.wish.clue
          ? `🧙 El Hechicero ha pedido un deseo: «${game.wish.clue}»`
          : '🧙 El Hechicero ha pedido un deseo',
        type: 'info',
      });
      broadcastGame();
      break;
    }

    // ── Barbero: el Demonio intercambia los personajes de 2 jugadores ──
    case 'BARBER_SWAP': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const { aId, bId } = payload;
      const { a, b } = barberSwap(game, aId, bId);
      // Cada afectado se entera de su nuevo personaje; nadie más.
      [a, b].forEach(p => {
        const roleName = ROLES[p.role]?.name || p.role;
        sendToPlayer(p.id, 'NOTIFICATION', { message: `💈 Tu personaje ha cambiado: ahora eres ${roleName}`, type: 'info' });
        sendToPlayer(p.id, 'ROLE_CHANGED', { roleId: p.role, roleName });
      });
      broadcastGame();
      break;
    }

    case 'BARBER_DECLINE': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      closeBarberStep(game);
      addDeferred(game, {
        label: '💈 Barbero: el Demonio declinó el intercambio.',
        dueNight: game.nightNumber, severity: 'info', role: 'BARBER',
      });
      broadcastGame();
      break;
    }

    // ── Psicópata: asesinato diurno público ────────────────────────
    // Solo el narrador lo ejecuta, cuando el Psicópata lo anuncia en voz alta.
    case 'PSYCHOPATH_DAY_KILL': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const game = requireGame(session);
      const { psychopathId, targetId } = payload;
      const res = psychopathDayKill(game, psychopathId, targetId);
      const psychoName = game.players.find(p => p.id === psychopathId)?.name || '?';
      broadcastToAll('NOTIFICATION', {
        message: res.blocked
          ? `🔪 ${psychoName} se declara PSICÓPATA y ataca a ${res.target.name}… pero no muere`
          : `🔪 ${psychoName} se declara PSICÓPATA y mata a ${res.target.name}`,
        type: 'error',
      });
      broadcastGame();
      break;
    }

    // ── Psicópata: piedra-papel-tijera tras ser ejecutado ──────────
    // Tiran el Psicópata y su nominador. El narrador puede tirar por el rival
    // si es él mismo (autonominación) o si el jugador está desconectado.
    case 'ROSHAMBO_THROW': {
      const game = requireGame(session);
      const rs = game.pendingRoshambo;
      if (!rs) throw new Error('No hay ningún Roshambo pendiente');
      const { choice } = payload;
      // Por defecto tira quien envía; el narrador puede tirar en nombre de otro.
      let whoId = session.playerId;
      if (session.isNarrator) whoId = payload.whoId || rs.opponentId;
      const result = roshamboThrow(game, whoId, choice);
      if (result.result) {
        const psychoName = game.players.find(p => p.id === rs.psychopathId)?.name || '?';
        broadcastToAll('NOTIFICATION', {
          message: result.result === 'opponent'
            ? `🎲 ${psychoName} pierde el piedra-papel-tijera y muere`
            : `🎲 ${psychoName} ${result.result === 'tie' ? 'empata' : 'gana'} el piedra-papel-tijera y sobrevive`,
          type: result.result === 'opponent' ? 'error' : 'info',
        });
      }
      broadcastGame();
      break;
    }

    case 'NIGHT_READY': {
      const game = getGame(MAIN_GAME_ID);
      if (!game || !session.playerId) break;
      if (!['first_night', 'night'].includes(game.phase)) break;
      if (!game.nightReadyPlayers) game.nightReadyPlayers = [];
      if (!game.nightReadyPlayers.includes(session.playerId))
        game.nightReadyPlayers.push(session.playerId);
      broadcastGame();
      if (tryAutoAdvanceDawn(game)) broadcastGame();
      break;
    }

    case 'GHOST_DECLINE_VOTE': {
      const game = getGame(MAIN_GAME_ID);
      if (!game || !session.playerId) break;
      const { nominationId } = payload;
      const nom = game.nominations.find(n => n.id === nominationId);
      if (!nom || nom.resolved) break;
      const player = game.players.find(p => p.id === session.playerId);
      if (!player || player.alive) break;
      if (!nom.ghostDeclines) nom.ghostDeclines = [];
      if (!nom.ghostDeclines.includes(session.playerId))
        nom.ghostDeclines.push(session.playerId);

      // Avanza turno igual que vote() hace
      if (Array.isArray(nom.voteOrder)) {
        const idx = nom.voteOrder.indexOf(session.playerId);
        if (idx >= 0 && idx >= (nom.voteTurnIndex || 0)) {
          nom.voteTurnIndex = idx + 1;
          nom.argueTimer = null;
        }
      }

      // Auto-resolve if all eligible (living + eligible dead) have now voted or declined
      if (!nom.resolved) {
        const living2 = game.players.filter(p => p.alive);
        const eligDead2 = game.players.filter(p => !p.alive && p.deadVoteNominationId === null);
        const declines2 = nom.ghostDeclines || [];
        const allDone = [...living2, ...eligDead2].every(p =>
          nom.votes.includes(p.id) || nom.against.includes(p.id) || declines2.includes(p.id)
        );
        if (allDone) {
          const result = resolveVote(game, nom.id);
          broadcastGame();
          const msg = result.meetsThreshold
            ? `🗳️ ${result.nomineeName}: ${result.tally} votos — ✓ alcanza el umbral`
            : `🗳️ ${result.nomineeName}: ${result.tally} votos — ✗ no alcanza`;
          broadcastToAll('NOTIFICATION', { message: msg, type: 'info' });
          break;
        }
      }
      broadcastGame();
      break;
    }

    case 'GET_RANKINGS': {
      sendTo(ws, 'RANKINGS', loadRankings());
      break;
    }

    case 'DELETE_RANKING': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const { key } = payload;
      deleteRankingEntry(key);
      sendTo(ws, 'RANKINGS', loadRankings());
      break;
    }

    case 'UPDATE_RANKING': {
      if (!session.isNarrator) throw new Error('No autorizado');
      const { key: rKey, updates } = payload;
      const updated = updateRankingEntry(rKey, updates);
      sendTo(ws, 'RANKINGS', updated);
      break;
    }

    default:
      sendTo(ws, 'ERROR', { message: `Tipo desconocido: ${type}` });
  }
}

function tryAutoAdvanceDawn(game) {
  if (!game.autoMode) return false;
  if (!['first_night', 'night'].includes(game.phase)) return false;
  if (game.nightWaitingForRavenkeeper) return false;
  const alive = game.players.filter(p => p.alive);
  if (alive.length === 0) return false;
  const allReady = alive.every(p => (game.nightReadyPlayers || []).includes(p.id));
  if (!allReady) return false;
  triggerAutoDawn(game);
  return true;
}

function triggerAutoDawn(game) {
  if (!['first_night', 'night'].includes(game.phase)) return;
  const deaths = game.nightDeaths.map(id => game.players.find(p => p.id === id)?.name).filter(Boolean);
  startDay(game);
  teleportAllToPlaza(game);
  setPlazaChannelPermission(true).catch(() => {});
  broadcastGame();
  if (game.phase === 'game_over') {
    recordGameWin(game, game.winner);
    broadcastToAll('GAME_OVER', { winner: game.winner });
    return;
  }
  const msg = deaths.length > 0
    ? `☀️ Día ${game.dayNumber}. Murió: ${deaths.join(', ')}.`
    : `☀️ Día ${game.dayNumber}. Nadie murió esta noche.`;
  broadcastToAll('NOTIFICATION', { message: msg, type: 'day' });
  if (game.autoMode) scheduleAutoDay(game);
}

function scheduleAutoDay(game) {
  const dayMs = game.autoDayMs || AUTO_DAY_MS;
  game.autoPhaseInfo = { phase: 'day_discussion', endsAt: Date.now() + dayMs };
  broadcastGame();
  setAutoTimer(MAIN_GAME_ID, () => {
    if (!game.autoMode || game.phase !== 'day') return;
    // Mover todos a la Plaza (narradores incluidos)
    teleportAllToPlaza(game);
    openNominations(game);
    const nomMin = Math.round((game.autoNomMs || AUTO_NOM_MS) / 60000);
    broadcastToAll('NOTIFICATION', { message: `🏛️ Todos a la Plaza — nominaciones abiertas (${nomMin} min)`, type: 'info' });
    scheduleAutoNominations(game);
    broadcastGame();
  }, dayMs);
}

function scheduleAutoNominations(game) {
  const nomMs = game.autoNomMs || AUTO_NOM_MS;
  game.autoPhaseInfo = { phase: 'nominations', endsAt: Date.now() + nomMs };
  broadcastGame();
  setAutoTimer(MAIN_GAME_ID, () => {
    if (!game.autoMode) return;
    if (game.activeNomination) {
      // Nominación activa — esperar a que termine antes de pasar de noche
      game.pendingNightAfterNomination = true;
      broadcastGame();
      return;
    }
    scheduleAutoNight(game);
  }, nomMs);
}

function scheduleAutoNight(game) {
  game.autoPhaseInfo = null;

  // Ejecutar ganador de nominaciones (si hay)
  const result = executeNominationWinner(game);

  if (result.tie) {
    broadcastToAll('BROADCAST_EVENT', { title: '⚖️ Empate', message: 'Empate en votos. Nadie es ejecutado.', type: 'warning' });
  } else if (result.vizierSurvived) {
    broadcastToAll('BROADCAST_EVENT', { title: '👑 El Visir sobrevive', message: `${result.executed.name} es el Visir y no puede morir durante el día.`, type: 'warning' });
  } else if (result.narratorExecuted) {
    if (result.gameOver) {
      broadcastToAll('BROADCAST_EVENT', { title: '🎙 ¡El Narrador ha sido ejecutado!', message: 'El Ateo estaba en juego — el pueblo acertó. Gana el bando bueno.', type: 'execution' });
      broadcastGame();
      recordGameWin(game, result.winner);
      broadcastToAll('GAME_OVER', { winner: result.winner });
      return;
    }
    broadcastToAll('BROADCAST_EVENT', { title: '🎙 El pueblo ejecutó al Narrador', message: 'Pero el Narrador no puede morir… la ejecución del día se ha gastado.', type: 'warning' });
  } else if (result.executed) {
    broadcastToAll('BROADCAST_EVENT', {
      title: '💀 Ejecución',
      message: `${result.executed.name} fue ejecutado.`,
      type: 'execution',
    });
    if (result.gameOver) {
      broadcastGame();
      recordGameWin(game, result.winner);
      broadcastToAll('GAME_OVER', { winner: result.winner });
      return;
    }
  }

  if (game.phase === 'game_over') { broadcastGame(); return; }

  // Victoria del Alcalde: 3 vivos sin ejecución
  const livingAuto = game.players.filter(p => p.alive);
  const mayorAuto  = game.players.find(p => p.role === 'MAYOR' && p.alive && !p.poisoned);
  if (mayorAuto && livingAuto.length === 3 && !game.executedToday && !game.executionAttemptToday) {
    mayorWin(game);
    broadcastGame();
    broadcastToAll('BROADCAST_EVENT', { title: '🏛️ Victoria del Alcalde', message: 'Quedan 3 jugadores vivos sin ejecución. ¡El bien gana!', type: 'info' });
    recordGameWin(game, 'good');
    broadcastToAll('GAME_OVER', { winner: 'good' });
    return;
  }

  broadcastGame();

  setAutoTimer(MAIN_GAME_ID, () => {
    if (!game.autoMode || game.phase === 'game_over') return;
    startNight(game);
    // El anochecer puede terminar la partida (Vórtice, día extra de la Mente Maestra).
    if (game.phase === 'game_over' && game.winner) {
      broadcastGame();
      broadcastToAll('BROADCAST_EVENT', { title: '🏁 Fin de la partida', message: game.winReason || 'La partida ha terminado', type: 'info' });
      recordGameWin(game, game.winner);
      broadcastToAll('GAME_OVER', { winner: game.winner });
      return;
    }
    teleportToNightRooms(game);
    setPlazaChannelPermission(false).catch(() => {});
    broadcastGame();
    broadcastToAll('NOTIFICATION', { message: `🌙 Noche ${game.nightNumber} ha comenzado`, type: 'night' });
    if (game.nightQueue.length === 0) {
      setAutoTimer(MAIN_GAME_ID, () => triggerAutoDawn(game), 5000);
    }
  }, 3000);
}

function requireGame(session) {
  if (!session.gameId) throw new Error('No estás en la partida');
  const game = getGame(MAIN_GAME_ID);
  if (!game) throw new Error('Partida no encontrada');
  return game;
}

// ¿Puede tocar la config del bot? Solo tras pasar la contraseña de admin
// (session.isConfigAdmin), o un jugador cuyo Discord figure en adminUserIds
// (Q6: la lista blanca, no un rol genérico). Ser narrador ya NO basta.
function isConfigAdmin(session) {
  if (session.isConfigAdmin) return true;
  const adminIds = (getConfig().adminUserIds || []);
  if (!adminIds.length) return false;
  const game = getGame(MAIN_GAME_ID);
  const player = game && session.playerId ? game.players.find(p => p.id === session.playerId) : null;
  return !!player && adminIds.includes(player.discordId);
}

// Id del actor para la auditoría de cambios (discordId del narrador/admin).
function currentActorId(session) {
  const game = getGame(MAIN_GAME_ID);
  const player = game && session.playerId ? game.players.find(p => p.id === session.playerId) : null;
  return (player && player.discordId) || (session.playerId) || null;
}

// Libera la SESIÓN de un asiento (no el asiento). Devuelve cuántas cerró.
// La usan KICK_PLAYER_SESSION y REPLACE_PLAYER.
function kickPlayerSession(game, playerId) {
  let kicked = 0;
  [...sessions.values()]
    .filter(s => s.playerId === playerId)
    .forEach(s => {
      sendTo(s.ws, 'KICKED_SESSION', { reason: 'narrator_kick' });
      s.playerId = null; s.gameId = null;
      kicked++;
    });
  // Reenvía la lista de asientos libres a quienes están en la pantalla de login.
  if (game) {
    const joinedIds = new Set([...sessions.values()].filter(s => s.playerId).map(s => s.playerId));
    const available = game.players.filter(p => !joinedIds.has(p.id)).map(p => ({ id: p.id, name: p.name, avatar: p.avatar }));
    sessions.forEach(s => { if (!s.gameId) sendTo(s.ws, 'PLAYER_LIST', { players: available }); });
  }
  return kicked;
}

// ── REST API ───────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, discord: getBotStatus() }));
app.get('/api/roles', (req, res) => res.json(ROLES));
app.get('/api/rankings', (req, res) => res.json(loadRankings()));
// Catálogo de deseos del Hechicero (lo consume el panel del narrador).
app.get('/api/wishes', (req, res) => res.json(WISH_CATALOG));
app.get('/api/players', (req, res) => {
  const game = getGame(MAIN_GAME_ID);
  res.json(game ? game.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) : []);
});

// Hoja de campaña: la abren los jugadores en una pestaña nueva. Va ANTES del
// catch-all de la SPA (más abajo), que si no se la tragaría.
// ?campaign=<id> fuerza un guion; sin él, el de la partida en curso.
app.get('/hoja-campana', (req, res) => {
  const cid = req.query.campaign || getGame(req.query.game || MAIN_GAME_ID)?.campaignId;
  const campaign = cid ? CAMPAIGNS[cid] : null;
  if (!campaign) return res.status(404).type('html').send('<p>Campaña no encontrada.</p>');
  res.type('html').send(renderCampaignSheet(campaign));
});

// ── Serve frontend build (for tunnel / production) ─────────────────
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function startup() {
  // Config del bot (IDs de Discord, nombres de emplazamientos) persistente.
  await initConfigStore();

  // Init BD
  try {
    await initDB();
    console.log('[DB] Inicializada');
    const saved = await loadGame(MAIN_GAME_ID);
    if (saved) {
      Object.assign(mainGame, saved);
      console.log('[DB] Partida restaurada');
    }
  } catch (e) {
    console.error('[DB] Error:', e.message, e.stack);
  }

  // Restaurar narradores: la config persistente manda; el estado guardado de la
  // partida es respaldo para partidas viejas (Q8: los narradores viven en config).
  const cfgNarrators = (getConfig().narratorUserIds || []);
  const savedNarrators = (Array.isArray(mainGame.narratorDiscordIds) && mainGame.narratorDiscordIds.length)
    ? mainGame.narratorDiscordIds : null;
  const desired = cfgNarrators.length ? cfgNarrators : savedNarrators;
  if (desired && desired.length) {
    setNarratorIds(desired)
      .then(applied => { mainGame.narratorDiscordIds = applied; })
      .catch(() => {});
  } else {
    mainGame.narratorDiscordIds = getNarratorIds();
  }

  // Cargar campañas personalizadas (MongoDB si MONGODB_URI está definido, si no, archivo local)
  try {
    const custom = await loadCustomCampaigns();
    // Re-resuelve los roles que se guardaron como stub porque aún no existían
    // (Hechicero, Señor de Typhon, Princesa…) y los que cambiaron de tipo.
    for (const [id, c] of Object.entries(custom)) {
      const healed = healCampaign(c);
      registerCampaign(healed);
      if (healed !== c) {
        custom[id] = healed;
        saveCustomCampaign(healed).catch(e => console.error('[Campaigns] reguardado:', e.message));
      }
    }
    const n = Object.keys(custom).length;
    if (n) console.log(`✓ ${n} campaña(s) personalizada(s) cargada(s)`);
  } catch (e) { console.error('[Campaigns] Error al cargar:', e.message); }

  server.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT}`);
    console.log(`[Server] WebSocket: ws://localhost:${PORT}`);
    initRankings();
    initBot();

    // Al reconectar, si no hay jugadores en la partida se limpian las
    // habitaciones de noche sobrantes (evita canales huérfanos de partidas
    // anteriores tras reinicios). Si hay jugadores, se recrean las suyas.
    setReadyCallback(async () => {
      const game = getGame(MAIN_GAME_ID);
      if (!game || game.players.length === 0) {
        await deleteAllNightRooms();
        return;
      }
      for (const p of game.players) {
        if (p.name) ensurePlayerRoom(p.name, p.discordId || null).catch(() => {});
      }
    });

    // Sync Discord voice state → game state
    setVoiceStateCallback((discordUserId, channelKey) => {
      const game = getGame(MAIN_GAME_ID);
      if (!game) return;
      const player = game.players.find(p => p.discordId === discordUserId);
      if (!player) return;
      const newChannel = (channelKey && channelKey !== 'PLAZA' && channelKey !== 'CONFESIONARIO') ? channelKey : null;
      if (player.discordChannel !== newChannel) {
        player.discordChannel = newChannel;
        broadcastGame();
      }
    });

    // Auto-tunnel when TUNNEL env var is set
    if (process.env.TUNNEL) {
      startTunnel(PORT);
    }
  });
}

startup().catch(err => {
  console.error('[Startup] Fatal error:', err);
  process.exit(1);
});

async function startTunnel(port) {
  const { spawn } = require('child_process');
  const sep = '='.repeat(50);

  // Try cloudflared first (best WebSocket support)
  const cf = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let urlPrinted = false;
  let fallbackStarted = false;
  const printUrl = (data) => {
    if (urlPrinted) return;
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      urlPrinted = true;
      console.log('\n' + sep);
      console.log('🌐 URL PÚBLICA PARA JUGADORES:');
      console.log(`   ${match[0]}`);
      console.log(sep);
      console.log('Comparte esta URL con tus amigos.');
      console.log('Expira cuando cierres el servidor.\n');
    }
  };

  cf.stdout.on('data', printUrl);
  cf.stderr.on('data', printUrl);

  const useFallback = () => {
    if (fallbackStarted) return;
    fallbackStarted = true;
    console.log('[Tunnel] cloudflared no encontrado, usando localtunnel...');
    startLocaltunnel(port);
  };

  cf.on('error', useFallback);

  cf.on('close', (code) => {
    if (!urlPrinted) useFallback();
    else console.log('[Tunnel] cloudflared cerrado');
  });
}

async function startLocaltunnel(port) {
  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port });
    const sep = '='.repeat(50);
    console.log('\n' + sep);
    console.log('🌐 URL PÚBLICA PARA JUGADORES:');
    console.log(`   ${tunnel.url}`);
    console.log(sep);
    console.log('Comparte esta URL con tus amigos.');
    console.log('Expira cuando cierres el servidor.\n');
    tunnel.on('close', () => console.log('[Tunnel] Cerrado'));
    tunnel.on('error', err => console.error('[Tunnel] Error:', err.message));
  } catch (err) {
    console.error('[Tunnel] No se pudo iniciar el túnel:', err.message);
  }
}
