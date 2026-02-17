/**
 * Inspired by Sentry CLI telemetry setup.
 * See: https://github.com/getsentry/cli/blob/main/src/lib/telemetry.ts
 */

import * as Sentry from '@sentry/bun';

export async function withTelemetry<T>(
  sentryDsn: string | undefined,
  callback: () => T | Promise<T>
): Promise<T> {
  const client = initSentry(sentryDsn);
  if (!client?.getOptions().enabled) {
    Sentry.logger.info('Sentry telemetry disabled');
    return callback();
  }

  Sentry.logger.info('Sentry telemetry enabled');

  Sentry.startSession();
  Sentry.captureSession();

  try {
    return await Sentry.startSpan({name: 'addon-manager', op: 'cli.command'}, async () =>
      callback()
    );
  } catch (e) {
    Sentry.logger.error('Unhandled exception captured');
    Sentry.captureException(e);
    const session = Sentry.getCurrentScope().getSession();
    if (session) {
      session.status = 'crashed';
    }
    throw e;
  } finally {
    Sentry.endSession();
    // Flush with a timeout to ensure events are sent before process exits
    try {
      await client.flush(3000);
    } catch {
      // Ignore flush errors - telemetry should never block CLI
    }
  }
}

/**
 * Wraps a function in a Sentry span only (no session). Use for sub-operations when already inside withTelemetry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function wrapWithSpan<T extends (...args: any[]) => any>(
  {
    spanName,
    op = 'function',
    attributes = {},
  }: {
    spanName: string;
    op?: string;
    attributes?: Record<string, string | number | boolean>;
  },
  fn: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>) => {
    const defaultAttributes = {
      arch: process.arch,
      platform: process.platform,
      'runtime.version': process.version,
    };

    return Sentry.startSpan(
      {name: spanName, op, attributes: {...defaultAttributes, ...attributes}},
      async () => await fn(...args)
    );
  };
}

function initSentry(dsn: string | undefined) {
  const version = '0.0.0-dev';
  const environment = 'development';
  const enabled = !!dsn;

  const client = Sentry.init({
    dsn: dsn ?? '',
    enabled,
    environment,
    release: version,
    sendDefaultPii: false,
    defaultIntegrations: false,
    tracesSampleRate: environment === 'development' ? 1 : 0.1,
    sampleRate: 1,
    tracePropagationTargets: [],

    enableLogs: true,
    enableMetrics: true,

    beforeSendTransaction: tx => {
      tx.server_name = undefined;
      return tx;
    },

    beforeSend: event => {
      // Replace home directory with ~ in stack traces to remove PII
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      for (const exception of event.exception?.values ?? []) {
        if (!exception.stacktrace?.frames) {
          continue;
        }
        for (const frame of exception.stacktrace.frames) {
          if (frame.filename && homeDir) {
            frame.filename = frame.filename.replace(homeDir, '~');
          }
        }
      }
      event.server_name = undefined;
      return event;
    },
  });

  if (client?.getOptions().enabled) {
    Sentry.setTag('arch', process.arch);
    Sentry.setTag('platform', process.platform);
    Sentry.setTag('runtime.version', process.version);
  }

  return client;
}

export function setCommandName(command: string): void {
  const span = Sentry.getActiveSpan();
  if (span) {
    span.updateName(command);
  }
  Sentry.setTag('command', command);
}
