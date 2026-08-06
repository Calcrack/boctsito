const path = require('path');
const fs = require('fs');
const https = require('https');

const RANKINGS_PATH = path.join(__dirname, 'rankings.json');

const GITHUB_TOKEN     = process.env.GITHUB_TOKEN;
const GITHUB_REPO      = process.env.GITHUB_REPO;
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'server/rankings.json';
const GITHUB_BRANCH    = process.env.GITHUB_BRANCH    || 'rankings-data';

let _sha   = null;
let _cache = null;

function loadRankings() {
  if (_cache !== null) return _cache;
  try {
    if (!fs.existsSync(RANKINGS_PATH)) { _cache = {}; return _cache; }
    _cache = JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
    return _cache;
  } catch { _cache = {}; return _cache; }
}

async function _ensureBranch() {
  const check = await _ghRequest('GET', `/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, null);
  if (check.status === 200) return true;
  if (check.status !== 404) return false;
  // Branch doesn't exist — create from main
  const main = await _ghRequest('GET', `/repos/${GITHUB_REPO}/git/refs/heads/main`, null);
  if (main.status !== 200) return false;
  const create = await _ghRequest('POST', `/repos/${GITHUB_REPO}/git/refs`, {
    ref: `refs/heads/${GITHUB_BRANCH}`,
    sha: main.body.object.sha,
  });
  if (create.status === 201) {
    console.log(`[Rankings] Branch '${GITHUB_BRANCH}' creado`);
    return true;
  }
  console.error('[Rankings] No se pudo crear branch:', create.status);
  return false;
}

async function initRankings() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log('[Rankings] Sin config GitHub — usando archivo local');
    loadRankings();
    return;
  }
  try {
    await _ensureBranch();
    const apiPath = `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
    console.log(`[Rankings] Cargando desde GitHub (branch: ${GITHUB_BRANCH})`);
    const res = await _ghRequest('GET', apiPath, null);
    if (res.status === 404) {
      console.log('[Rankings] Archivo no encontrado — empezando vacío');
      _cache = {};
      return;
    }
    if (res.status !== 200 || !res.body.content) {
      console.error('[Rankings] GitHub GET falló:', res.status, JSON.stringify(res.body).slice(0, 200));
      loadRankings();
      return;
    }
    _sha = res.body.sha;
    const data = JSON.parse(Buffer.from(res.body.content, 'base64').toString('utf8'));
    _cache = data;
    fs.writeFileSync(RANKINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[Rankings] ${Object.keys(data).length} jugadores cargados`);
  } catch (err) {
    console.error('[Rankings] initRankings error:', err.message);
    loadRankings();
  }
}

function saveRankings(data) {
  _cache = data;
  try { fs.writeFileSync(RANKINGS_PATH, JSON.stringify(data, null, 2), 'utf8'); } catch {}
  _pushToGithub(data).catch(err => console.error('[GitHub] Push error:', err.message));
}

function _ghRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'boct-game',
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function _pushToGithub(data) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return;

  const apiPath = `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');

  if (!_sha) {
    const get = await _ghRequest('GET', `${apiPath}?ref=${GITHUB_BRANCH}`, null);
    if (get.status === 200) _sha = get.body.sha;
    else if (get.status !== 404) {
      console.error('[GitHub] GET sha falló:', get.status);
      return;
    }
  }

  const body = { message: 'chore: update rankings', content, branch: GITHUB_BRANCH };
  if (_sha) body.sha = _sha;

  const put = await _ghRequest('PUT', apiPath, body);
  if (put.status === 200 || put.status === 201) {
    _sha = put.body.content?.sha;
    console.log(`[GitHub] Rankings sincronizados (${Object.keys(data).length} jugadores)`);
  } else if (put.status === 409) {
    console.warn('[GitHub] Conflicto SHA, reintentando...');
    _sha = null;
    const get2 = await _ghRequest('GET', `${apiPath}?ref=${GITHUB_BRANCH}`, null);
    if (get2.status === 200) {
      _sha = get2.body.sha;
      const body2 = { message: 'chore: update rankings', content, sha: _sha, branch: GITHUB_BRANCH };
      const put2 = await _ghRequest('PUT', apiPath, body2);
      if (put2.status === 200 || put2.status === 201) {
        _sha = put2.body.content?.sha;
        console.log('[GitHub] Rankings sincronizados (reintento OK)');
      } else {
        console.error('[GitHub] Push falló en reintento:', put2.status, JSON.stringify(put2.body).slice(0, 300));
        _sha = null;
      }
    }
  } else {
    console.error('[GitHub] Push falló:', put.status, JSON.stringify(put.body).slice(0, 300));
    _sha = null;
  }
}

function recordGameStart(game) {
  if (!game) return;
  const data = loadRankings();
  game.players.forEach(p => {
    if (!p.name) return;
    const key = p.discordId || p.name;
    if (!data[key]) data[key] = { discordId: p.discordId || null, name: p.name, avatar: p.avatar || null, wins_as_good: 0, wins_as_demon: 0, total_games: 0 };
    data[key].name = p.name;
    if (p.avatar) data[key].avatar = p.avatar;
    if (p.discordId) data[key].discordId = p.discordId;
  });
  saveRankings(data);
}

function recordGameWin(game, winner) {
  if (!winner || !game) return;
  const data = loadRankings();
  game.players.forEach(p => {
    if (!p.name) return;
    const key = p.discordId || p.name;
    if (!data[key]) data[key] = { discordId: p.discordId || null, name: p.name, avatar: p.avatar || null, wins_as_good: 0, wins_as_demon: 0, total_games: 0 };
    data[key].name = p.name;
    if (p.avatar) data[key].avatar = p.avatar;
    if (p.discordId) data[key].discordId = p.discordId;
    data[key].total_games++;
    const isWinner = (winner === 'good' && p.alignment === 'good') || (winner === 'evil' && p.alignment === 'evil');
    if (isWinner) {
      if (winner === 'evil') data[key].wins_as_demon++;
      else data[key].wins_as_good++;
    }
  });
  saveRankings(data);
}

function deleteRankingEntry(key) {
  const data = loadRankings();
  delete data[key];
  saveRankings(data);
}

function updateRankingEntry(key, updates) {
  const data = loadRankings();
  if (!data[key]) return data;
  const e = data[key];
  if (updates.wins_as_good !== undefined) e.wins_as_good = Math.max(0, parseInt(updates.wins_as_good) || 0);
  if (updates.wins_as_demon !== undefined) e.wins_as_demon = Math.max(0, parseInt(updates.wins_as_demon) || 0);
  if (updates.total_games !== undefined) e.total_games = Math.max(0, parseInt(updates.total_games) || 0);
  saveRankings(data);
  return data;
}

module.exports = { loadRankings, initRankings, recordGameStart, recordGameWin, deleteRankingEntry, updateRankingEntry };
