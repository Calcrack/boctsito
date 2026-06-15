// ── Persistencia en SQLite: partidas, fichas, sospechas, pendientes ──
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'game.db');
let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS games (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS game_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          gameId TEXT NOT NULL,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          FOREIGN KEY(gameId) REFERENCES games(id)
        )`);
        resolve();
      });
    });
  });
}

function saveGame(gameId, game) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(game);
    const now = Date.now();
    db.run(
      `INSERT OR REPLACE INTO games (id, data, updatedAt) VALUES (?, ?, ?)`,
      [gameId, data, now],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function loadGame(gameId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT data FROM games WHERE id = ?`,
      [gameId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.data) : null);
      }
    );
  });
}

function logGameEvent(gameId, type, payload) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO game_events (gameId, type, payload, createdAt) VALUES (?, ?, ?, ?)`,
      [gameId, type, JSON.stringify(payload), Date.now()],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function closeDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    } else resolve();
  });
}

module.exports = { initDB, saveGame, loadGame, logGameEvent, closeDB };
