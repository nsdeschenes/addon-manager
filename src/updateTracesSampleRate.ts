import {cancel, isCancel, text} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {readConfig, writeConfig} from './config';
import {wrapWithSpan} from './sentry';

export const updateTracesSampleRate = wrapWithSpan(
  {spanName: 'update-traces-sample-rate', op: 'cli.command'},
  async function (defaultValue?: number): Promise<number | undefined> {
    const input = await text({
      message: 'Enter traces sample rate (0–1, leave empty to clear)',
      placeholder:
        defaultValue !== undefined ? `Currently set to: ${defaultValue}` : '0.1',
    });

    if (isCancel(input)) {
      Sentry.logger.warn('Traces sample rate update cancelled');
      cancel('Traces sample rate update cancelled. Existing value will be kept.');
      return defaultValue;
    }

    const trimmed = String(input).trim();

    if (trimmed === '') {
      const existing = await readConfig();
      await writeConfig({
        communityPath: existing?.communityPath ?? '',
        sentryDsn: existing?.sentryDsn,
        tracesSampleRate: undefined,
      });
      Sentry.logger.info('Traces sample rate cleared');
      return undefined;
    }

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      cancel('Invalid value. Must be a number between 0 and 1.');
      return defaultValue;
    }

    const existing = await readConfig();
    await writeConfig({
      communityPath: existing?.communityPath ?? '',
      sentryDsn: existing?.sentryDsn,
      tracesSampleRate: parsed,
    });

    Sentry.logger.info(Sentry.logger.fmt`Traces sample rate updated: ${parsed}`);
    return parsed;
  }
);
