import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

import {cancel} from '@clack/prompts';
import * as Sentry from '@sentry/bun';
import {z} from 'zod';

import {toYaml} from './utils/jsonToYaml';
import type {Addon} from './types';

const ConfigSchema = z.object({
  communityPath: z.string(),
  sentryDsn: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_DIR = join(homedir(), '.addon-manager');
const CONFIG_FILE = join(CONFIG_DIR, 'config.yaml');
const ADDONS_FILE = join(CONFIG_DIR, 'addons.json');

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

const AddonItemSchema = z.object({
  type: z.string(),
  content: z.string(),
  revision: z.number(),
});

const AddonSchema = z.object({
  title: z.string(),
  creator: z.string(),
  size: z.number(),
  packageName: z.string(),
  packageVersion: z.string(),
  minimumGameVersion: z.string(),
  items: z.array(AddonItemSchema),
});

export async function saveAddons(addons: Addon[]): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(CONFIG_DIR, {recursive: true});

    // Write addons file as JSON (explicitly truncate with 'w' flag)
    await fs.writeFile(ADDONS_FILE, JSON.stringify(addons), {
      encoding: 'utf-8',
      flag: 'w',
    });
    Sentry.logger.info(Sentry.logger.fmt`Addon cache saved, ${addons.length} addons`);
  } catch (error) {
    Sentry.logger.error('Addon cache save failure');
    cancel(`Error writing addons file: ${error}`);
    // Don't throw - graceful degradation
  }
}

export async function loadAddonsFromCache(): Promise<Addon[] | null> {
  try {
    const content = await fs.readFile(ADDONS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = z.array(AddonSchema).safeParse(parsed);

    if (!validated.success) {
      Sentry.logger.warn('Invalid addon cache format');
      return null;
    }

    Sentry.logger.info(
      Sentry.logger.fmt`Addon cache loaded, ${validated.data.length} addons`
    );
    return validated.data;
  } catch (error) {
    if (error instanceof Error && ('code' in error ? error.code === 'ENOENT' : false)) {
      // File doesn't exist, which is fine
      return null;
    }

    // Other errors (permission, invalid JSON, etc.)
    return null;
  }
}
