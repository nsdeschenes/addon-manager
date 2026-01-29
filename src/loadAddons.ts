import fs from 'node:fs/promises';

import {cancel, tasks} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {searchForFile} from './utils/searchForFile';
import {saveAddons} from './config';
import {CONTENT_HISTORY_FILE_NAME, MANIFEST_FILE_NAME} from './constants';
import {ContentHistorySchema, ManifestSchema} from './schema';
import {wrapWithSpan} from './sentry';
import type {Addon} from './types';

interface AddonPaths {
  directory: string;
  manifestPath: string;
  contentHistoryPath: string;
}

export const loadAddons = wrapWithSpan(
  {spanName: 'load-addons', op: 'cli.command'},
  async function (addons: Addon[], communityPath: string | symbol) {
    const foundAddonsPaths: AddonPaths[] = [];

    await tasks([
      {
        title: 'Checking Community Path is Accessible',
        task: wrapWithSpan(
          {spanName: 'check-community-path-accessible', op: 'cli.task'},
          async () => {
            const directoryAccessible = await fs
              .access(String(communityPath))
              .then(() => true)
              .catch(() => false);

            if (!directoryAccessible) {
              cancel('Directory is not accessible');
              process.exit(1);
            }

            return 'Directory is accessible';
          }
        ),
      },
      {
        title: 'Finding Addons',
        task: wrapWithSpan({spanName: 'find-addons', op: 'cli.task'}, async () => {
          const paths = await fs.readdir(String(communityPath));

          for (const path of paths) {
            const directory = `${String(communityPath)}/${path}`;

            const manifestPath = await searchForFile({
              path: directory,
              fileName: MANIFEST_FILE_NAME,
            });

            const contentHistoryPath = await searchForFile({
              path: directory,
              fileName: CONTENT_HISTORY_FILE_NAME,
            });

            if (!manifestPath || !contentHistoryPath) {
              continue;
            }

            foundAddonsPaths.push({
              directory,
              manifestPath,
              contentHistoryPath,
            });
          }

          return 'Found addons in your community directory';
        }),
      },
      {
        title: 'Loading Addons',
        task: wrapWithSpan({spanName: 'load-addons', op: 'cli.task'}, async () => {
          const errors: string[] = [];
          const newAddons: Addon[] = [];

          for (const addon of foundAddonsPaths) {
            const manifest = await fs.readFile(addon.manifestPath, 'utf-8');
            const manifestJson = ManifestSchema.safeParse(JSON.parse(manifest));

            if (!manifestJson.success) {
              errors.push(
                `${addon.directory} - Manifest is invalid: ${manifestJson.error.message}`
              );
              continue;
            }

            const contentHistory = await fs.readFile(addon.contentHistoryPath, 'utf-8');
            const contentHistoryJson = ContentHistorySchema.safeParse(
              JSON.parse(contentHistory)
            );

            if (!contentHistoryJson.success) {
              errors.push(
                `${addon.directory} - Content history is invalid: ${contentHistoryJson.error.message}`
              );
              continue;
            }

            const packageSize = await fs.stat(addon.directory).then(stat => stat.size);

            Sentry.metrics.distribution('addon_size', packageSize, {unit: 'byte'});

            newAddons.push({
              title: manifestJson.data.title,
              creator: manifestJson.data.creator,
              size: packageSize,
              packageName: contentHistoryJson.data['package-name'],
              packageVersion: manifestJson.data.package_version,
              minimumGameVersion: manifestJson.data.minimum_game_version,
              releaseNotes: manifestJson.data.release_notes,
              items: contentHistoryJson.data.items,
            });
          }

          addons = newAddons;

          return 'Loaded addon data from your community directory';
        }),
      },
    ]);

    // Save addons to cache after loading
    await saveAddons(addons);
  }
);
