const path = require('path');
const fs = require('fs');
const https = require('https');

const RANKINGS_PATH = path.join(__dirname, 'rankings.json');

const GITHUB_TOKEN     = process.env.GITHUB_TOKEN;
const GITHUB_REPO      = process.env.GITHUB_REPO;       // "owner/repo"
const GITHUB_FILE_PATH = process.env.GITHUB_FILE_PATH || 'server/rankings.json';

let _sha = null;

function loadRankings() {
  try {
    if (!fs.existsSync(RANKINGS_PATH)) return {};
    return JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch { return {}; }
}

function saveRankings(data) {
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
    const get = await _ghRequest('GET', apiPath, null);
    if (get.status === 200) _sha = get.body.sha;
  }

  const body = { message: 'chore: update rankings', content };
  if (_sha) body.sha = _sha;

  const put = await _ghRequest('PUT', apiPath, body);
  if (put.status === 200 || put.status === 201) {
    _sha = put.body.content?.sha;
    console.log('[GitHub] Rankings sincronizados');
  } else {
    console.error('[GitHub] Push falló:', put.status, JSON.stringify(put.body).slice(0, 200));
    _sha = null; // forzar re-fetch SHA la próxima vez
  }
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
      if (p.type === 'demon') data[key].wins_as_demon++;
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

module.exports = { loadRankings, recordGameWin, deleteRankingEntry };
