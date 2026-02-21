import * as Sentry from '@sentry/bun';
import {eq} from 'drizzle-orm';

import type {Addon} from '../types';

import {getDb} from './index';
import {addonItems, addons} from './schema';

export async function saveAddons(newAddons: Addon[]): Promise<void> {
  return Sentry.startSpan({name: 'save-addons', op: 'db.transaction'}, () => {
    try {
      const db = getDb();

      let totalItems = 0;

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
            totalItems += addon.items.length;
          }
        }
      });

      Sentry.logger.info(
        Sentry.logger
          .fmt`Addon cache saved, ${newAddons.length} addons, ${totalItems} items`
      );
      Sentry.metrics.gauge('cached_addons', newAddons.length);
      Sentry.metrics.gauge('cached_addon_items', totalItems);
    } catch (error) {
      Sentry.logger.error('Addon cache save failure');
      Sentry.captureException(error);
    }
  });
}

export function loadAddonsFromCache(): Addon[] | null {
  return Sentry.startSpan({name: 'load-addons-from-cache', op: 'db.query'}, () => {
    try {
      const db = getDb();

      const allAddons = db.select().from(addons).all();

      if (allAddons.length === 0) {
        Sentry.logger.info('Addon cache empty');
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
      Sentry.metrics.gauge('cached_addons', result.length);
      return result;
    } catch (error) {
      Sentry.logger.error('Addon cache load failure');
      Sentry.captureException(error);
      return null;
    }
  });
}
