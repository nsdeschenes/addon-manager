import {cancel, isCancel, select} from '@clack/prompts';

import {wrapWithSpan} from './sentry';
import {updateCommunityPath} from './updateCommunityPath';
import {updateSentryDsn} from './updateSentryDsn';

interface SettingsState {
  communityPath: string | symbol;
  sentryDsn: string | undefined;
}

export const settings = wrapWithSpan(
  {spanName: 'settings', op: 'cli.command'},
  async function (
    communityPath: string | symbol,
    sentryDsn: string | undefined
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

      switch (selectedOption) {
        case 'update-community-path':
          communityPath = await updateCommunityPath(
            typeof communityPath === 'string' ? communityPath : undefined
          );
          break;
        case 'update-sentry-dsn':
          sentryDsn = (await updateSentryDsn(sentryDsn)) || undefined;
          break;
        case 'back':
          inSettings = false;
          break;
      }
    }

    return {communityPath, sentryDsn};
  }
);
