import * as Sentry from '@sentry/bun';
import {eq} from 'drizzle-orm';

import type {Addon} from '../types';

import {getDb} from './index';
import {addonItems, addons} from './schema';

export async function saveAddons(newAddons: Addon[]): Promise<void> {
  try {
    const db = getDb();

    db.transaction(tx => {
      // Clear existing data
      tx.delete(addonItems).run();
      tx.delete(addons).run();

      // Insert new addons and their items
      for (const addon of newAddons) {
        const [inserted] = tx
          .insert(addons)
          .values({
            title: addon.title,
            creator: addon.creator,
            size: addon.size,
            packageName: addon.packageName,
            packageVersion: addon.packageVersion,
            minimumGameVersion: addon.minimumGameVersion,
          })
          .returning({id: addons.id})
          .all();

        if (inserted && addon.items.length > 0) {
          tx.insert(addonItems)
            .values(
              addon.items.map(item => ({
                addonId: inserted.id,
                type: item.type,
                content: item.content,
                revision: item.revision,
              }))
            )
            .run();
        }
      }
    });

    Sentry.logger.info(Sentry.logger.fmt`Addon cache saved, ${newAddons.length} addons`);
  } catch (error) {
    Sentry.logger.error('Addon cache save failure');
    console.error(`Error saving addons to database: ${error}`);
  }
}

export function loadAddonsFromCache(): Addon[] | null {
  try {
    const db = getDb();

    const allAddons = db.select().from(addons).all();

    if (allAddons.length === 0) {
      return null;
    }

    const result: Addon[] = allAddons.map(addon => {
      const items = db
        .select()
        .from(addonItems)
        .where(eq(addonItems.addonId, addon.id))
        .all();

      return {
        title: addon.title,
        creator: addon.creator,
        size: addon.size,
        packageName: addon.packageName,
        packageVersion: addon.packageVersion,
        minimumGameVersion: addon.minimumGameVersion,
        items: items.map(item => ({
          type: item.type,
          content: item.content,
          revision: item.revision,
        })),
      };
    });

    Sentry.logger.info(Sentry.logger.fmt`Addon cache loaded, ${result.length} addons`);
    return result;
  } catch (error) {
    Sentry.logger.error('Addon cache load failure');
    console.error(`Error loading addons from database: ${error}`);
    return null;
  }
}
