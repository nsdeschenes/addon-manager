import {int, integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

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
