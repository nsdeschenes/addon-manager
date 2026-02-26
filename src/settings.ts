import {cancel, isCancel, select} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {wrapWithSpan} from './sentry';
import {updateCommunityPath} from './updateCommunityPath';
import {updateGoogleApiKey} from './updateGoogleApiKey';
import {updateSentryDsn} from './updateSentryDsn';

interface SettingsState {
  communityPath: string | symbol;
  sentryDsn: string | undefined;
  googleApiKey: string | undefined;
}

export const settings = wrapWithSpan(
  {spanName: 'settings', op: 'cli.command'},
  async function (
    communityPath: string | symbol,
    sentryDsn: string | undefined,
    googleApiKey: string | undefined
  ): Promise<SettingsState> {
    let inSettings = true;

    while (inSettings) {
      const selectedOption = await select({
        message: 'Settings',
        options: [
          {
            value: 'update-community-path',
            label: 'Update Community Path',
            hint: 'Update the path to your community directory',
          },
          {
            value: 'update-sentry-dsn',
            label: 'Update Sentry DSN',
            hint: 'Configure Sentry DSN for error telemetry',
          },
          {
            value: 'update-google-api-key',
            label: 'Set Google AI Key',
            hint: 'API key for flight route search',
          },
          {
            value: 'back',
            label: 'Back',
            hint: 'Return to main menu',
          },
        ],
      });

      if (isCancel(selectedOption)) {
        cancel('Returning to main menu.');
        break;
      }

      Sentry.logger.info(Sentry.logger.fmt`Settings option selected: ${selectedOption}`);

      switch (selectedOption) {
        case 'update-community-path':
          communityPath = await updateCommunityPath(
            typeof communityPath === 'string' ? communityPath : undefined
          );
          break;
        case 'update-sentry-dsn':
          sentryDsn = (await updateSentryDsn(sentryDsn)) || undefined;
          break;
        case 'update-google-api-key':
          googleApiKey = (await updateGoogleApiKey(googleApiKey)) || undefined;
          break;
        case 'back':
          inSettings = false;
          break;
      }
    }

    return {communityPath, sentryDsn, googleApiKey};
  }
);
