const fs = require("fs");
const path = require("path");

const usePostgres = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const runningOnVercel = Boolean(process.env.VERCEL);

let sqliteDb = null;
let pgPool = null;

function toPostgresParams(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

if (usePostgres) {
  const { Pool } = require("pg");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL
  });
} else if (!runningOnVercel) {
  const sqlite3 = require("sqlite3").verbose();
  const dataDir = path.join(__dirname, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "game.sqlite");
  sqliteDb = new sqlite3.Database(dbPath);
}

function noDatabaseConfiguredError() {
  return new Error("No hay base de datos configurada. En Vercel define DATABASE_URL o POSTGRES_URL.");
}

function run(sql, params = []) {
  if (usePostgres) {
    return pgPool.query(toPostgresParams(sql), params);
  }
  if (!sqliteDb) {
    return Promise.reject(noDatabaseConfiguredError());
  }
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  if (usePostgres) {
    return pgPool.query(toPostgresParams(sql), params).then((result) => result.rows[0]);
  }
  if (!sqliteDb) {
    return Promise.reject(noDatabaseConfiguredError());
  }
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  if (usePostgres) {
    return pgPool.query(toPostgresParams(sql), params).then((result) => result.rows);
  }
  if (!sqliteDb) {
    return Promise.reject(noDatabaseConfiguredError());
  }
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function initDb() {
  if (runningOnVercel && !usePostgres) {
    throw noDatabaseConfiguredError();
  }

  await run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS scores (
      id ${usePostgres ? "SERIAL" : "INTEGER PRIMARY KEY AUTOINCREMENT"},
      game_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      points INTEGER NOT NULL,
      money INTEGER NOT NULL,
      owned_count INTEGER NOT NULL,
      saved_at TIMESTAMP NOT NULL
    )
  `);
}

module.exports = {
  all,
  get,
  initDb,
  run
};
