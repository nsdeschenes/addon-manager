import {defineRelations} from 'drizzle-orm';

import * as schema from './schema';

export const relations = defineRelations(schema, r => ({
  addons: {
    items: r.many.addonItems({
      from: r.addons.id,
      to: r.addonItems.addonId,
    }),
  },
  addonItems: {
    addon: r.one.addons({
      from: r.addonItems.addonId,
      to: r.addons.id,
    }),
  },
  airports: {},
}));
