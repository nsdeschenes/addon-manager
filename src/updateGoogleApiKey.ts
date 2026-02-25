import {cancel, isCancel, password} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {readConfig, writeConfig} from './config';
import {wrapWithSpan} from './sentry';

export const updateGoogleApiKey = wrapWithSpan(
  {spanName: 'update-google-api-key', op: 'cli.command'},
  async function (defaultValue?: string): Promise<string> {
    const apiKey = await password({
      message: 'Enter your Google AI API key (leave empty to clear)',
      mask: '*',
    });

    if (isCancel(apiKey)) {
      Sentry.logger.warn('Google API key update cancelled');
      cancel('Google API key update cancelled. Existing value will be kept.');
      return defaultValue ?? '';
    }

    const trimmed = String(apiKey).trim();

    const existing = await readConfig();
    await writeConfig({
      communityPath: existing?.communityPath ?? '',
      sentryDsn: existing?.sentryDsn,
      googleApiKey: trimmed || undefined,
    });

    Sentry.logger.info(
      Sentry.logger.fmt`Google API key updated: ${trimmed ? 'set' : 'cleared'}`
    );
    return trimmed;
  }
);
