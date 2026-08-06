const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig, updateConfig } = require('./configStore');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// ── Accesos a config efectiva (defaults + overrides de server/config.json) ──
function guildId()      { return getConfig().guildId; }
function nightCategory(){ return getConfig().nightCategoryId; }
function boctRole()     { return getConfig().boctRoleId; }
function narratorIds()  { return [...getConfig().narratorUserIds]; }
function effectiveChannels() { return getConfig().channels; }

function channelId(key) { return effectiveChannels()[key]; }

// Mapas inversos dinámicos (el bot puede recibir la config cambiada en caliente).
function channelIdToKey() {
  return Object.fromEntries(Object.entries(effectiveChannels()).map(([k, v]) => [v, k]));
}

// Narradores: los únicos que pueden VER las habitaciones de noche.
// Lista dinámica: el narrador principal por defecto, ampliable desde la UI.
function getNarratorIds() {
  return narratorIds();
}

async function setNarratorIds(ids) {
  const clean = [...new Set((ids || []).filter(id => typeof id === 'string' && /^\d{5,}$/.test(id)))];
  updateConfig({ narratorUserIds: clean }, 'setNarratorIds');
  await refreshNightRoomPerms();
  return getNarratorIds();
}

// Reaplica permisos de todas las habitaciones de noche al cambiar narradores.
async function refreshNightRoomPerms() {
  if (!isReady || !guild) return;
  const rooms = guild.channels.cache.filter(c =>
    c.parentId === nightCategory() && c.type === ChannelType.GuildVoice
  );
  for (const channel of rooms.values()) {
    await ensureRoomPerms(channel, roomOwners.get(channel.name.toLowerCase()));
  }
}

let client = null;
let isReady = false;
let guild = null;
let membersCache = null;
let membersCacheTime = 0;
const CACHE_TTL = 3 * 60 * 1000;

let voiceStateCallback = null;

function setVoiceStateCallback(cb) {
  voiceStateCallback = cb;
}

function mapMember(m) {
  return {
    id: m.user.id,
    tag: m.user.tag,
    username: m.user.username,
    displayName: m.displayName,
    avatar: m.user.displayAvatarURL({ size: 64 }),
    roles: [...m.roles.cache.keys()],
  };
}

function initBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once('clientReady', async () => {
    console.log(`[Discord Bot] Conectado como ${client.user.tag}`);
    isReady = true;
    const gid = guildId();
    guild = client.guilds.cache.get(gid);
    if (!guild) guild = await client.guilds.fetch(gid).catch(() => null);
    _fetchAndCacheMembers().catch(() => {});
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    if (!voiceStateCallback) return;
    if (newState.member?.user?.bot) return;
    if (oldState.channelId === newState.channelId) return;
    const userId = newState.member?.user?.id;
    if (!userId) return;
    const newChannelKey = newState.channelId ? (channelIdToKey()[newState.channelId] || null) : null;
    voiceStateCallback(userId, newChannelKey);
  });

  client.on('error', err => console.error('[Discord Bot] Error:', err.message));

  client.login(DISCORD_TOKEN).catch(err => {
    console.error('[Discord Bot] Login fallido:', err.message);
  });

  return client;
}

async function _fetchAndCacheMembers() {
  if (!guild) return [];
  const members = await guild.members.fetch({ limit: 1000 });
  const result = members.filter(m => !m.user.bot).map(mapMember).sort((a, b) => a.displayName.localeCompare(b.displayName));
  membersCache = result;
  membersCacheTime = Date.now();
  console.log(`[Discord] Miembros cacheados: ${result.length}`);
  return result;
}

async function getGuildMembers(force = false) {
  if (!isReady || !client) return [];
  try {
    const now = Date.now();
    if (!force && membersCache && now - membersCacheTime < CACHE_TTL) {
      if (now - membersCacheTime > CACHE_TTL / 2) _fetchAndCacheMembers().catch(() => {});
      return membersCache;
    }
    return await _fetchAndCacheMembers();
  } catch (err) {
    console.error('[Discord] getGuildMembers error:', err.message);
    return membersCache || [];
  }
}

async function moveUserToChannel(discordUserId, channelKey, channelLimits = {}) {
  if (!isReady || !guild) return { ok: false, error: 'Bot no conectado' };
  const channelId = effectiveChannels()[channelKey];
  if (!channelId) return { ok: false, error: `Canal ${channelKey} desconocido` };

  try {
    const member = guild.members.cache.get(discordUserId) || await guild.members.fetch(discordUserId);
    if (!member.voice?.channelId) return { ok: false, error: 'El jugador no está en un canal de voz' };

    const limit = channelLimits[channelKey];
    if (limit) {
      const targetChannel = guild.channels.cache.get(channelId);
      const currentCount = targetChannel?.members?.size || 0;
      if (currentCount >= limit) {
        return { ok: false, error: `Canal ${channelKey} lleno (${currentCount}/${limit})` };
      }
    }

    await member.voice.setChannel(channelId);
    return { ok: true };
  } catch (err) {
    console.error('[Discord] moveUser error:', err.message);
    return { ok: false, error: err.message };
  }
}


// Cache nombre-de-sala → channelId para no re-buscar cada noche.
const nightRoomCache = new Map();
// Cache nombre-de-sala → dueño (userId) para reaplicar permisos sin perderle.
const roomOwners = new Map();

function sanitizeRoomName(name) {
  // Discord recorta nombres largos; mantener legible.
  return String(name).trim().slice(0, 90) || 'jugador';
}

// Busca el canal de voz del jugador dentro de la categoría de noche; si no
// existe lo CREA (nunca se borra: se reutiliza entre partidas).
// Solo el narrador puede VER la habitación; @everyone tiene "Ver canal" desactivado.
// El DUEÑO (el jugador que la usa esa noche) sí ve y entra (punto 3).
function roomPermissionOverwrites(ownerId) {
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...narratorIds().map(id => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] })),
  ];
  if (ownerId) overwrites.push({ id: ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] });
  return overwrites;
}

async function ensureRoomPerms(channel, ownerId) {
  try {
    await channel.permissionOverwrites.set(roomPermissionOverwrites(ownerId));
  } catch (err) {
    console.error('[Discord] ensureRoomPerms error:', err.message);
  }
}

async function ensurePlayerRoom(playerName, ownerId) {
  if (!isReady || !guild) return null;
  const wanted = sanitizeRoomName(playerName);
  const key = wanted.toLowerCase();
  // Cache
  const cachedId = nightRoomCache.get(key);
  if (cachedId && guild.channels.cache.get(cachedId)) {
    if (ownerId) roomOwners.set(key, ownerId);
    return cachedId;
  }
  try {
    // Buscar por nombre dentro de la categoría
    const existing = guild.channels.cache.find(c =>
      c.parentId === nightCategory() &&
      c.type === ChannelType.GuildVoice &&
      c.name.toLowerCase() === key
    );
    if (existing) {
      nightRoomCache.set(key, existing.id);
      if (ownerId) roomOwners.set(key, ownerId);
      ensureRoomPerms(existing, ownerId).catch(() => {});
      return existing.id;
    }
    // Crear (con permisos: solo el narrador y el dueño ven el canal)
    const created = await guild.channels.create({
      name: wanted,
      type: ChannelType.GuildVoice,
      parent: nightCategory(),
      permissionOverwrites: roomPermissionOverwrites(ownerId),
    });
    nightRoomCache.set(key, created.id);
    if (ownerId) roomOwners.set(key, ownerId);
    return created.id;
  } catch (err) {
    console.error('[Discord] ensurePlayerRoom error:', err.message);
    return null;
  }
}

// Teletransporta a un usuario a su propia habitación de noche (la crea si falta).
async function moveUserToOwnRoom(discordUserId, playerName) {
  if (!isReady || !guild) return { ok: false, error: 'Bot no conectado' };
  try {
    const roomId = await ensurePlayerRoom(playerName, discordUserId);
    if (!roomId) return { ok: false, error: 'No se pudo crear la sala' };
    const member = guild.members.cache.get(discordUserId) || await guild.members.fetch(discordUserId);
    if (!member.voice?.channelId) return { ok: false, error: 'El jugador no está en un canal de voz' };
    await member.voice.setChannel(roomId);
    return { ok: true };
  } catch (err) {
    console.error('[Discord] moveUserToOwnRoom error:', err.message);
    return { ok: false, error: err.message };
  }
}

async function setPlazaChannelPermission(allow) {
  if (!isReady || !guild) return { ok: false, error: 'Bot no conectado' };
  try {
    const channel = guild.channels.cache.get(channelId('PLAZA'));
    if (!channel) return { ok: false, error: 'Canal PLAZA no encontrado' };
    const boctRoleId = boctRole();
    const role = guild.roles.cache.get(boctRoleId) || await guild.roles.fetch(boctRoleId);
    if (!role) return { ok: false, error: 'Rol BOCT no encontrado' };
    if (allow) {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { [PermissionFlagsBits.Speak]: null });
      await channel.permissionOverwrites.edit(role, { [PermissionFlagsBits.Speak]: null });
    } else {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { [PermissionFlagsBits.Speak]: false });
      await channel.permissionOverwrites.edit(role, { [PermissionFlagsBits.Speak]: true });
    }
    return { ok: true };
  } catch (err) {
    console.error('[Discord] setPlazaChannelPermission error:', err.message);
    return { ok: false, error: err.message };
  }
}

// Renombra los canales de voz REALES de Discord según los nombres de la
// campaña activa (por configuración). Se reutilizan los canales ya existentes,
// solo se les cambia el nombre. `names` = mapa key → nombre (PLAZA, MERCADO…).
async function renameLocationChannels(names = {}) {
  if (!isReady || !guild) return { ok: false, error: 'Bot no conectado' };
  const out = [];
  for (const [key, name] of Object.entries(names)) {
    if (!name) continue;
    const cid = effectiveChannels()[key];
    if (!cid) continue;
    const channel = guild.channels.cache.get(cid);
    if (!channel) continue;
    if (channel.name === name) continue;
    try {
      await channel.setName(name);
      out.push(key);
    } catch (err) {
      console.error(`[Discord] renameLocationChannel ${key}:`, err.message);
    }
  }
  if (out.length) console.log('[Discord] Canales renombrados:', out.join(', '));
  return { ok: true, renamed: out };
}

async function sendDM(discordUserId, message) {
  if (!isReady || !client) return false;
  try {
    const user = client.users.cache.get(discordUserId) || await client.users.fetch(discordUserId);
    await user.send(message);
    return true;
  } catch (err) {
    console.error('[Discord] sendDM error:', err.message);
    return false;
  }
}

function getBotStatus() {
  return { connected: isReady, tag: client?.user?.tag || null };
}

// Vista completa de la config del bot (para el panel /admin).
function getBotConfig() {
  const cfg = getConfig();
  return {
    guildId: cfg.guildId,
    nightCategoryId: cfg.nightCategoryId,
    boctRoleId: cfg.boctRoleId,
    narratorUserIds: narratorIds(),
    adminUserIds: cfg.adminUserIds || [],
    channels: cfg.channels,
    locationNames: cfg.locationNames,
  };
}

module.exports = {
  initBot, getGuildMembers, moveUserToChannel, moveUserToOwnRoom, ensurePlayerRoom,
  sendDM, getBotStatus, getBotConfig, renameLocationChannels,
  getNarratorIds, setNarratorIds, setVoiceStateCallback, setPlazaChannelPermission,
  setChannelIds: (channels, actor) => updateConfig({ channels }, actor),
  setGuildId: (id, actor) => updateConfig({ guildId: String(id).trim() }, actor),
  setNightCategoryId: (id, actor) => updateConfig({ nightCategoryId: String(id).trim() }, actor),
  setBoctRoleId: (id, actor) => updateConfig({ boctRoleId: String(id).trim() }, actor),
  setAdminUserIds: (ids, actor) => {
    const clean = [...new Set((ids || []).filter(id => typeof id === 'string' && /^\d{5,}$/.test(id)))];
    updateConfig({ adminUserIds: clean }, actor);
  },
};
