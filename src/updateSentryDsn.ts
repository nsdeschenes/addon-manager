import {cancel, isCancel, text} from '@clack/prompts';

import {readConfig, writeConfig} from './config';
import {wrapWithSpan} from './sentry';

export const updateSentryDsn = wrapWithSpan(
  {spanName: 'update-sentry-dsn', op: 'cli.command'},
  async function (defaultValue?: string): Promise<string> {
    const dsn = await text({
      message: 'Enter your Sentry DSN (leave empty to disable telemetry)',
      placeholder: defaultValue ? `Currently set to: ${defaultValue}` : 'https://examplePublicKey@o0.ingest.sentry.io/0',
      defaultValue: defaultValue ?? '',
    });

    if (isCancel(dsn)) {
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

    return trimmed;
  }
);
