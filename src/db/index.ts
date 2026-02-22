import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

import * as Sentry from '@sentry/bun';
import {Database} from 'bun:sqlite';
import {drizzle} from 'drizzle-orm/bun-sqlite';

import {wrapWithSpan} from '../sentry';
import type {Addon} from '../types';

import * as schema from './schema';

const CONFIG_DIR = join(homedir(), '.addon-manager');
const DB_PATH = join(CONFIG_DIR, 'addons.db');
const LEGACY_ADDONS_FILE = join(CONFIG_DIR, 'addons.json');

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database | null = null;

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
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS airports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ident TEXT NOT NULL UNIQUE,
      type TEXT,
      name TEXT NOT NULL,
      latitude_deg REAL,
      longitude_deg REAL,
      elevation_ft INTEGER,
      iso_country TEXT,
      municipality TEXT,
      icao_code TEXT,
      iata_code TEXT
    )
  `);
  sqlite.run(`
    CREATE INDEX IF NOT EXISTS idx_airports_icao_code ON airports(icao_code)
  `);
}

export function getDb(sqliteDb?: Database) {
  if (db) return db;

  return Sentry.startSpan({name: 'db-init', op: 'db.init'}, () => {
    sqlite = sqliteDb ?? new Database(DB_PATH, {create: true});
    sqlite.run('PRAGMA journal_mode = WAL');
    sqlite.run('PRAGMA foreign_keys = ON');
    createTables(sqlite);

    Sentry.logger.info(
      Sentry.logger.fmt`SQLite database initialized at ${sqliteDb ? ':memory:' : DB_PATH}`
    );

    db = drizzle(sqlite, {schema});
    return db;
  });
}

/** Close the database connection and clean up resources */
export function closeDb() {
  if (sqlite) {
    Sentry.logger.info('Closing SQLite database');
    sqlite.run('PRAGMA wal_checkpoint(TRUNCATE)');
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

/**
 * One-time migration: if addons.json exists, import into SQLite and delete the file.
 */
export const migrateFromJson = wrapWithSpan(
  {spanName: 'migrate-json-to-sqlite', op: 'db.migration'},
  async function () {
    try {
      const content = await fs.readFile(LEGACY_ADDONS_FILE, 'utf-8');
      const addons: Addon[] = JSON.parse(content);

      if (Array.isArray(addons) && addons.length > 0) {
        const {saveAddons} = await import('./addonRepository');
        await saveAddons(addons);
        Sentry.logger.info(
          Sentry.logger.fmt`Migrated ${addons.length} addons from JSON to SQLite`
        );
        Sentry.metrics.count('json_migration_addons', addons.length);
      }

      await fs.unlink(LEGACY_ADDONS_FILE);
      Sentry.logger.info('Deleted legacy addons.json');
      Sentry.metrics.count('json_migration_completed');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // No JSON file to migrate — expected case
        Sentry.logger.trace('No legacy addons.json found, skipping migration');
        return;
      }
      Sentry.logger.warn('JSON migration failed, skipping');
      Sentry.captureException(error);
      Sentry.metrics.count('json_migration_failed');
    }
  }
);
