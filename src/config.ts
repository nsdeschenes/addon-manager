import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

import {cancel} from '@clack/prompts';
import * as Sentry from '@sentry/bun';
import {z} from 'zod';

import {toYaml} from './utils/jsonToYaml';

const ConfigSchema = z.object({
  communityPath: z.string(),
  sentryDsn: z.string().optional(),
  tracesSampleRate: z.number().min(0).max(1).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_DIR = join(homedir(), '.addon-manager');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');

export async function readConfig(initial?: boolean): Promise<Config | null> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = Bun.YAML.parse(content);
    const validated = ConfigSchema.safeParse(parsed);

    if (!validated.success) {
      Sentry.logger.warn('Invalid config file format');
      if (initial) {
        cancel('Invalid config file format');
      }
      return null;
    }

    Sentry.logger.info('Config read successfully');
    return validated.data;
  } catch (error) {
    if (error instanceof Error && ('code' in error ? error.code === 'ENOENT' : false)) {
      // File doesn't exist, which is fine
      Sentry.logger.warn('Config file not found (ENOENT)');
      return null;
    }

    // Other errors (permission, invalid JSON, etc.)
    if (error instanceof SyntaxError) {
      Sentry.logger.error('Config file contains invalid JSON');
      cancel(`Config file contains invalid JSON: ${error.message}`);
    } else {
      Sentry.logger.error('Config read failure');
      cancel(`Error reading config file: ${error}`);
    }
    return null;
  }
}

export async function writeConfig(config: Config): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(CONFIG_DIR, {recursive: true});

    // Write config file
    await fs.writeFile(CONFIG_FILE, toYaml(config), 'utf-8');
    Sentry.logger.info('Config written successfully');
  } catch (error) {
    Sentry.logger.error('Config write failure');
    cancel(`Error writing config file: ${error}`);
    // Don't throw - graceful degradation
  }
}
