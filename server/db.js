const { MongoClient } = require('mongodb');
let db = null;

async function getDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!db) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db('boctsito');
  }
  return db;
}

module.exports = { getDB };
