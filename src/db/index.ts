import {Database} from 'bun:sqlite';
import {homedir} from 'node:os';
import {join} from 'node:path';

import {drizzle} from 'drizzle-orm/bun-sqlite';

import * as schema from './schema';

const CONFIG_DIR = join(homedir(), '.addon-manager');
const DB_PATH = join(CONFIG_DIR, 'addons.db');

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createTables(sqlite: Database) {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      creator TEXT NOT NULL,
      size INTEGER NOT NULL,
      package_name TEXT NOT NULL UNIQUE,
      package_version TEXT NOT NULL,
      minimum_game_version TEXT NOT NULL
    )
  `);
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS addon_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      addon_id INTEGER NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      revision INTEGER NOT NULL
    )
  `);
}

export function getDb(sqliteDb?: Database) {
  if (db) return db;

  const sqlite = sqliteDb ?? new Database(DB_PATH, {create: true});
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  createTables(sqlite);

  db = drizzle(sqlite, {schema});
  return db;
}

/** Reset the singleton — used by tests */
export function resetDb() {
  db = null;
}
