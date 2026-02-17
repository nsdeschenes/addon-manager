import {cancel, isCancel, text} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {readConfig, writeConfig} from './config';
import {wrapWithSpan} from './sentry';

export const updateSentryDsn = wrapWithSpan(
  {spanName: 'update-sentry-dsn', op: 'cli.command'},
  async function (defaultValue?: string): Promise<string> {
    const dsn = await text({
      message: 'Enter your Sentry DSN (leave empty to disable telemetry)',
      placeholder: defaultValue
        ? `Currently set to: ${defaultValue}`
        : 'https://examplePublicKey@o0.ingest.sentry.io/0',
    });

    if (isCancel(dsn)) {
      Sentry.logger.warn('Sentry DSN update cancelled');
      cancel('Sentry DSN update cancelled. Existing value will be kept.');
      return defaultValue ?? '';
    }

    const trimmed = String(dsn).trim();

    // Read existing config to preserve other fields
    const existing = await readConfig();
    await writeConfig({
      communityPath: existing?.communityPath ?? '',
      sentryDsn: trimmed || undefined,
    });

    Sentry.logger.info(
      Sentry.logger.fmt`Sentry DSN updated: ${trimmed ? 'set' : 'cleared'}`
    );
    return trimmed;
  }
);
