import {index, int, integer, real, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const addons = sqliteTable('addons', {
  id: int().primaryKey({autoIncrement: true}),
  title: text().notNull(),
  creator: text().notNull(),
  size: integer().notNull(),
  packageName: text('package_name').notNull().unique(),
  packageVersion: text('package_version').notNull(),
  minimumGameVersion: text('minimum_game_version').notNull(),
});

export const addonItems = sqliteTable('addon_items', {
  id: int().primaryKey({autoIncrement: true}),
  addonId: integer('addon_id')
    .notNull()
    .references(() => addons.id, {onDelete: 'cascade'}),
  type: text().notNull(),
  content: text().notNull(),
  revision: integer().notNull(),
});

export const airports = sqliteTable(
  'airports',
  {
    id: int().primaryKey({autoIncrement: true}),
    ident: text().notNull().unique(),
    type: text(),
    name: text().notNull(),
    latitudeDeg: real('latitude_deg'),
    longitudeDeg: real('longitude_deg'),
    elevationFt: integer('elevation_ft'),
    isoCountry: text('iso_country'),
    municipality: text(),
    icaoCode: text('icao_code'),
    iataCode: text('iata_code'),
  },
  table => [index('idx_airports_icao_code').on(table.icaoCode)]
);
