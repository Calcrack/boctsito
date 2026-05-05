const path = require('path');
const fs = require('fs');

const RANKINGS_PATH = path.join(__dirname, 'rankings.json');

function loadRankings() {
  try {
    if (!fs.existsSync(RANKINGS_PATH)) return {};
    return JSON.parse(fs.readFileSync(RANKINGS_PATH, 'utf8'));
  } catch { return {}; }
}

function saveRankings(data) {
  try { fs.writeFileSync(RANKINGS_PATH, JSON.stringify(data, null, 2), 'utf8'); } catch {}
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
