import {autocomplete, box, cancel, isCancel} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {renderAddon} from './utils/renderAddon';
import {wrapWithSpan} from './sentry';
import type {Addon} from './types';

export const viewAddons = wrapWithSpan(
  {spanName: 'view-addons', op: 'cli.command'},
  async function (addons: Addon[]) {
    const addon = await autocomplete({
      message: 'Select addons to view',
      options: addons.map(addon => ({
        value: addon.packageName,
        label: `${addon.packageName}: v${addon.packageVersion}`,
      })),
      maxItems: 10,
    });

    if (isCancel(addon)) {
      cancel('No addon selected');
      return '';
    }

    const selectedAddon = addons.find(a => a.packageName === addon)!;

    Sentry.logger.info(Sentry.logger.fmt`Addon selected: ${selectedAddon.packageName}`);
    box(renderAddon(selectedAddon), selectedAddon.packageName);

    return addon;
  }
);
