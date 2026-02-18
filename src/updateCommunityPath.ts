import fs from 'node:fs/promises';

import {cancel, isCancel, text} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {readConfig, writeConfig} from './config';
import {wrapWithSpan} from './sentry';

export const updateCommunityPath = wrapWithSpan(
  {spanName: 'update-community-path', op: 'cli.command'},
  async function (defaultValue?: string): Promise<string> {
    const defaultPlaceholder = `Currently set to: ${defaultValue}`;
    const communityPath = await text({
      message: 'Enter the path to your community directory',
      placeholder: defaultValue
        ? defaultPlaceholder
        : 'C:/Users/YourUsername/Documents/My Community',
      validate: value => {
        const input = String(value ?? '').trim();

        if (!input) return 'Community path is required';

        return undefined;
      },
    });

    if (isCancel(communityPath)) {
      Sentry.logger.warn('Community path update cancelled');
      cancel('Community path update cancelled. Existing value will be kept.');
      return defaultValue ?? '';
    }

    try {
      const stats = await fs.stat(communityPath);

      if (!stats.isDirectory()) {
        Sentry.logger.warn('Invalid path: not a directory');
        return 'Path must be an existing directory';
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as {code?: string}).code === 'ENOENT'
      ) {
        Sentry.logger.warn('Invalid path: directory does not exist');
        return 'Directory does not exist';
      }

      Sentry.logger.warn('Invalid path: unable to access directory');
      return 'Unable to access directory';
    }

    // Read existing config to preserve other fields, then save
    const existing = await readConfig();
    await writeConfig({...existing, communityPath: String(communityPath)});

    Sentry.logger.info('Community path updated successfully');
    return String(communityPath);
  }
);
