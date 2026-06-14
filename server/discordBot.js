const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = '1462151561575928034';

// Categoría donde viven las "habitaciones" de noche (1 canal de voz por jugador).
const NIGHT_CATEGORY_ID = '1515577274248859648';
// El narrador: único que puede VER las habitaciones de noche.
const NARRATOR_USER_ID = '723204863873384469';

const CHANNELS = {
  PLAZA:        '1467693963610951711',
  MERCADO:      '1467694466319257652',
  TABERNA:      '1467694502109122765',
  CEMENTERIO:   '1467694524137472050',
  BOSQUE:       '1467694546665214085',
  CONFESIONARIO:'1499969856160792676',
};

const CHANNEL_ID_TO_KEY = Object.fromEntries(Object.entries(CHANNELS).map(([k, v]) => [v, k]));

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
    guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
    _fetchAndCacheMembers().catch(() => {});
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    if (!voiceStateCallback) return;
    if (newState.member?.user?.bot) return;
    if (oldState.channelId === newState.channelId) return;
    const userId = newState.member?.user?.id;
    if (!userId) return;
    const newChannelKey = newState.channelId ? (CHANNEL_ID_TO_KEY[newState.channelId] || null) : null;
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
  const channelId = CHANNELS[channelKey];
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

function sanitizeRoomName(name) {
  // Discord recorta nombres largos; mantener legible.
  return String(name).trim().slice(0, 90) || 'jugador';
}

// Busca el canal de voz del jugador dentro de la categoría de noche; si no
// existe lo CREA (nunca se borra: se reutiliza entre partidas).
// Solo el narrador puede VER la habitación; @everyone tiene "Ver canal" desactivado.
function roomPermissionOverwrites() {
  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: NARRATOR_USER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
  ];
}

async function ensureRoomPerms(channel) {
  try {
    await channel.permissionOverwrites.set(roomPermissionOverwrites());
  } catch (err) {
    console.error('[Discord] ensureRoomPerms error:', err.message);
  }
}

async function ensurePlayerRoom(playerName) {
  if (!isReady || !guild) return null;
  const wanted = sanitizeRoomName(playerName);
  const key = wanted.toLowerCase();
  // Cache
  const cachedId = nightRoomCache.get(key);
  if (cachedId && guild.channels.cache.get(cachedId)) return cachedId;
  try {
    // Buscar por nombre dentro de la categoría
    const existing = guild.channels.cache.find(c =>
      c.parentId === NIGHT_CATEGORY_ID &&
      c.type === ChannelType.GuildVoice &&
      c.name.toLowerCase() === key
    );
    if (existing) {
      nightRoomCache.set(key, existing.id);
      ensureRoomPerms(existing).catch(() => {});
      return existing.id;
    }
    // Crear (con permisos: solo el narrador ve el canal)
    const created = await guild.channels.create({
      name: wanted,
      type: ChannelType.GuildVoice,
      parent: NIGHT_CATEGORY_ID,
      permissionOverwrites: roomPermissionOverwrites(),
    });
    nightRoomCache.set(key, created.id);
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
    const roomId = await ensurePlayerRoom(playerName);
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

const BOCT_ROLE_ID = '1499987378755076218';

async function setPlazaChannelPermission(allow) {
  if (!isReady || !guild) return { ok: false, error: 'Bot no conectado' };
  try {
    const channel = guild.channels.cache.get(CHANNELS.PLAZA);
    if (!channel) return { ok: false, error: 'Canal PLAZA no encontrado' };
    const boctRole = guild.roles.cache.get(BOCT_ROLE_ID) || await guild.roles.fetch(BOCT_ROLE_ID);
    if (!boctRole) return { ok: false, error: 'Rol BOCT no encontrado' };
    if (allow) {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { [PermissionFlagsBits.Speak]: null });
      await channel.permissionOverwrites.edit(boctRole, { [PermissionFlagsBits.Speak]: null });
    } else {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { [PermissionFlagsBits.Speak]: false });
      await channel.permissionOverwrites.edit(boctRole, { [PermissionFlagsBits.Speak]: true });
    }
    return { ok: true };
  } catch (err) {
    console.error('[Discord] setPlazaChannelPermission error:', err.message);
    return { ok: false, error: err.message };
  }
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

module.exports = { initBot, getGuildMembers, moveUserToChannel, moveUserToOwnRoom, ensurePlayerRoom, sendDM, getBotStatus, CHANNELS, NARRATOR_USER_ID, setVoiceStateCallback, setPlazaChannelPermission };
