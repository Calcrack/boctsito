const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_TOKEN = 'MTQ5NTg5MDM0NzMxNjg3MTQwMQ.Gm2Gke.j2yAr9-TPZNC8DQjtDPbLoqdMvgXoBYuWPXlBU';
const GUILD_ID = '1462151561575928034';

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

module.exports = { initBot, getGuildMembers, moveUserToChannel, sendDM, getBotStatus, CHANNELS, setVoiceStateCallback };
