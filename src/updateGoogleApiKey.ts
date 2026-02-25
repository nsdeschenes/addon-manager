import {cancel, isCancel, password} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {wrapWithSpan} from './sentry';

const SECRETS_SERVICE = 'addon-manager';
const SECRETS_NAME = 'google-api-key';

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

    if (trimmed) {
      await Bun.secrets.set({
        service: SECRETS_SERVICE,
        name: SECRETS_NAME,
        value: trimmed,
      });
    } else {
      await Bun.secrets.delete({service: SECRETS_SERVICE, name: SECRETS_NAME});
    }

    Sentry.logger.info(
      Sentry.logger.fmt`Google API key updated: ${trimmed ? 'set' : 'cleared'}`
    );
    return trimmed;
  }
);

export async function getGoogleApiKey(): Promise<string | null> {
  return Bun.secrets.get({service: SECRETS_SERVICE, name: SECRETS_NAME});
}
