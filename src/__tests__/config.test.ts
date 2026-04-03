import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';

mock.module('@clack/prompts', () => ({
  cancel: () => {},
}));

let testDir: string;
let configFile: string;

beforeEach(async () => {
  testDir = await fs.mkdtemp(join(tmpdir(), 'addon-config-test-'));
  configFile = join(testDir, 'config.yaml');
});

afterEach(async () => {
  await fs.rm(testDir, {recursive: true, force: true});
});

describe('readConfig', async () => {
  const {readConfig} = await import('../config');

  test('returns null when config file does not exist', async () => {
    const result = await readConfig(undefined, {configFile});
    expect(result).toBeNull();
  });

  test('parses valid YAML config with required field only', async () => {
    await fs.writeFile(configFile, 'communityPath: /sim/community\n');
    const result = await readConfig(undefined, {configFile});
    expect(result).toEqual({communityPath: '/sim/community'});
  });

  test('parses valid YAML config with all optional fields', async () => {
    await fs.writeFile(
      configFile,
      [
        'communityPath: /sim/community',
        'sentryDsn: "https://abc@sentry.io/123"',
        'tracesSampleRate: 0.5',
      ].join('\n') + '\n'
    );
    const result = await readConfig(undefined, {configFile});
    expect(result).toEqual({
      communityPath: '/sim/community',
      sentryDsn: 'https://abc@sentry.io/123',
      tracesSampleRate: 0.5,
    });
  });

  test('returns null for YAML that fails schema validation', async () => {
    await fs.writeFile(configFile, 'sentryDsn: "https://abc@sentry.io/123"\n');
    const result = await readConfig(undefined, {configFile});
    expect(result).toBeNull();
  });

  test('returns null with initial=true when schema validation fails', async () => {
    await fs.writeFile(configFile, 'sentryDsn: "only-optional"\n');
    const result = await readConfig(true, {configFile});
    expect(result).toBeNull();
  });

  test('returns null when file content is empty string', async () => {
    await fs.writeFile(configFile, '');
    const result = await readConfig(undefined, {configFile});
    expect(result).toBeNull();
  });
});

describe('writeConfig', async () => {
  const {readConfig, writeConfig} = await import('../config');

  test('writes config as YAML to the config file', async () => {
    await writeConfig(
      {communityPath: '/sim/community'},
      {configDir: testDir, configFile}
    );
    const written = await fs.readFile(configFile, 'utf-8');
    expect(written).toContain('communityPath:');
    expect(written).toContain('/sim/community');
  });

  test('written YAML can be read back by readConfig', async () => {
    const config = {communityPath: '/test/path', tracesSampleRate: 0.1};
    await writeConfig(config, {configDir: testDir, configFile});
    const result = await readConfig(undefined, {configFile});
    expect(result).toEqual(config);
  });

  test('writes optional sentryDsn field when present', async () => {
    await writeConfig(
      {communityPath: '/path', sentryDsn: 'https://dsn@sentry.io/1'},
      {configDir: testDir, configFile}
    );
    const written = await fs.readFile(configFile, 'utf-8');
    expect(written).toContain('sentryDsn:');
    expect(written).toContain('https://dsn@sentry.io/1');
  });

  test('creates config directory if it does not exist', async () => {
    const nestedDir = join(testDir, 'nested', 'config');
    const nestedFile = join(nestedDir, 'config.yaml');
    await writeConfig(
      {communityPath: '/path'},
      {configDir: nestedDir, configFile: nestedFile}
    );
    const written = await fs.readFile(nestedFile, 'utf-8');
    expect(written).toContain('communityPath:');
  });
});

describe('ConfigSchema validation', async () => {
  const {readConfig} = await import('../config');

  test('rejects tracesSampleRate above 1', async () => {
    await fs.writeFile(configFile, 'communityPath: /path\ntracesSampleRate: 1.5\n');
    const result = await readConfig(undefined, {configFile});
    expect(result).toBeNull();
  });

  test('rejects tracesSampleRate below 0', async () => {
    await fs.writeFile(configFile, 'communityPath: /path\ntracesSampleRate: -0.1\n');
    const result = await readConfig(undefined, {configFile});
    expect(result).toBeNull();
  });

  test('accepts tracesSampleRate of 0', async () => {
    await fs.writeFile(configFile, 'communityPath: /path\ntracesSampleRate: 0\n');
    const result = await readConfig(undefined, {configFile});
    expect(result?.tracesSampleRate).toBe(0);
  });

  test('accepts tracesSampleRate of 1', async () => {
    await fs.writeFile(configFile, 'communityPath: /path\ntracesSampleRate: 1\n');
    const result = await readConfig(undefined, {configFile});
    expect(result?.tracesSampleRate).toBe(1);
  });

  test('accepts config without optional fields', async () => {
    await fs.writeFile(configFile, 'communityPath: /path\n');
    const result = await readConfig(undefined, {configFile});
    expect(result).toEqual({communityPath: '/path'});
  });
});
