import {cancel, intro, isCancel, outro, select} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {loadAddonsFromCache} from './db/addonRepository';
import {migrateFromJson} from './db/index';
import {readConfig} from './config';
import {loadAddons} from './loadAddons';
import {withTelemetry} from './sentry';
import {settings} from './settings';
import type {Addon} from './types';
import {updateCommunityPath} from './updateCommunityPath';
import {viewAddons} from './viewAddons';
import {viewAirports} from './viewAirports';

let communityPath: string | symbol;
let sentryDsn: string | undefined;
let addons: Addon[] = [];

async function main() {
  intro('Welcome to Addon Manager ✈️');

  // Load config on startup
  const config = await readConfig();
  if (config?.communityPath) {
    communityPath = config.communityPath;
  }
  sentryDsn = config?.sentryDsn;

  Sentry.logger.info(
    Sentry.logger
      .fmt`Config loaded, community path ${config?.communityPath ? 'set' : 'unset'}`
  );

  if (communityPath === undefined) {
    communityPath = await updateCommunityPath();
  }

  // Migrate legacy JSON cache to SQLite (one-time, no-op if already migrated)
  await migrateFromJson();

  // Load addons from cache on startup
  const cachedAddons = await loadAddonsFromCache();
  if (cachedAddons) {
    addons = cachedAddons;
    Sentry.logger.info(
      Sentry.logger.fmt`Addon cache hit, ${cachedAddons.length} addons loaded`
    );
    Sentry.metrics.count('cache_hit');
  } else {
    Sentry.logger.info('Addon cache miss');
    Sentry.metrics.count('cache_miss');
  }

  let running = true;
  while (running) {
    const selectedOption = await select({
      message: 'What would you like to do?',
      options: [
        {
          value: 'view-addons',
          label: 'View Addons',
          hint: 'View all addons',
          disabled: addons.length === 0,
        },
        {
          value: 'view-airports',
          label: 'View Airports',
          hint: 'View all airports',
          disabled: addons.length === 0,
        },
        {
          value: 'load-addons',
          label: 'Load Addons',
          hint: 'Load addon data from your community directory',
          disabled: communityPath === undefined,
        },
        {
          value: 'settings',
          label: 'Settings',
          hint: 'Update application configuration',
        },
        {
          value: 'exit',
          label: 'Exit',
          hint: 'Exit the program',
        },
      ],
    });

    if (typeof selectedOption === 'string') {
      Sentry.logger.info(Sentry.logger.fmt`Command selected: ${selectedOption}`);
      Sentry.metrics.count('command_selected', 1, {
        attributes: {command: selectedOption},
      });
    }

    switch (selectedOption) {
      case 'view-addons':
        await viewAddons(addons);
        break;
      case 'view-airports':
        await viewAirports(addons);
        break;
      case 'load-addons':
        addons = await loadAddons(communityPath);
        break;
      case 'settings':
        ({communityPath, sentryDsn} = await settings(communityPath, sentryDsn));
        break;
      case 'exit':
        running = false;
        break;
      default:
        if (isCancel(selectedOption)) {
          Sentry.logger.warn('Main menu cancelled');
          cancel('No option selected');
          running = false;
          break;
        }

        throw new Error(`Invalid option: ${String(selectedOption)}`);
    }
  }

  Sentry.logger.info('App exiting');
  outro('Thank you for using Addon Manager, and have a safe flight ✈️');
}

// Read config early to get DSN for telemetry init
readConfig().then(config => {
  withTelemetry(config?.sentryDsn, async () => {
    await main();
  }).catch(console.error);
});
