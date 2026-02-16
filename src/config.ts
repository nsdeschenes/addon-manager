import fs from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

import {cancel} from '@clack/prompts';
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
      if (initial) {
        cancel('Invalid config file format');
      }
      return null;
    }

    return validated.data;
  } catch (error) {
    if (error instanceof Error && ('code' in error ? error.code === 'ENOENT' : false)) {
      // File doesn't exist, which is fine
      return null;
    }

    // Other errors (permission, invalid JSON, etc.)
    if (error instanceof SyntaxError) {
      cancel(`Config file contains invalid JSON: ${error.message}`);
    } else {
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
  } catch (error) {
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
  } catch (error) {
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
      return null;
    }

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
