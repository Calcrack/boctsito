// ── Persistencia JSON: partidas, eventos ────────────────────────────
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');
let store = { games: {}, events: [] };

function initDB() {
  return new Promise((resolve) => {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        store = JSON.parse(data);
      } else {
        store = { games: {}, events: [] };
        fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
      }
      resolve();
    } catch (e) {
      console.error('[DB] Error init:', e.message);
      store = { games: {}, events: [] };
      resolve();
    }
  });
}

function saveGame(gameId, game) {
  return new Promise((resolve) => {
    try {
      store.games[gameId] = { data: game, updatedAt: Date.now() };
      fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
      resolve();
    } catch (e) {
      console.error('[DB] Error save:', e.message);
      resolve();
    }
  });
}

function loadGame(gameId) {
  return new Promise((resolve) => {
    try {
      const entry = store.games[gameId];
      resolve(entry ? entry.data : null);
    } catch (e) {
      console.error('[DB] Error load:', e.message);
      resolve(null);
    }
  });
}

function logGameEvent(gameId, type, payload) {
  return new Promise((resolve) => {
    try {
      const event = { id: store.events.length + 1, gameId, type, payload, createdAt: Date.now() };
      store.events.push(event);
      fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2));
      resolve(event.id);
    } catch (e) {
      console.error('[DB] Error log:', e.message);
      resolve(null);
    }
  });
}

function closeDB() {
  return Promise.resolve();
}

module.exports = { initDB, saveGame, loadGame, logGameEvent, closeDB };
