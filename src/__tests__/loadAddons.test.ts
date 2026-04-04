import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {Database} from 'bun:sqlite';
import {afterEach, beforeEach, describe, expect, mock, spyOn, test} from 'bun:test';

import {loadAddonsFromCache} from '../db/addonRepository';
import {closeDb, getDb} from '../db/index';

// Mock @clack/prompts: run tasks directly, suppress UI
mock.module('@clack/prompts', () => ({
  tasks: async (items: Array<{title: string; task: () => Promise<string>}>) => {
    for (const item of items) {
      await item.task();
    }
  },
  spinner: () => ({start: () => {}, stop: () => {}, message: () => {}}),
}));

const VALID_MANIFEST = JSON.stringify({
  dependencies: [],
  content_type: 'SCENERY',
  title: 'Test Airport',
  manufacturer: 'Test Corp',
  creator: 'Test Creator',
  package_version: '1.0.0',
  minimum_game_version: '1.0.0',
});

const VALID_CONTENT_HISTORY = JSON.stringify({
  'package-name': 'test-airport',
  items: [{type: 'airport', content: 'KJFK', revision: 1}],
});

const INVALID_MANIFEST = JSON.stringify({title: 'Missing Required Fields'});

const INVALID_CONTENT_HISTORY = JSON.stringify({'wrong-key': 'value'});

async function createAddon(
  communityPath: string,
  name: string,
  manifest: string,
  contentHistory: string
) {
  const dir = join(communityPath, name);
  await fs.mkdir(dir, {recursive: true});
  await fs.writeFile(join(dir, 'manifest.json'), manifest);
  await fs.writeFile(join(dir, 'ContentHistory.json'), contentHistory);
  return dir;
}

describe('loadAddons', async () => {
  const {loadAddons} = await import('../loadAddons');

  let communityPath: string;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    const sqlite = new Database(':memory:');
    getDb(sqlite);
    communityPath = await fs.mkdtemp(join(tmpdir(), 'addon-test-'));
    exitSpy = spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
  });

  afterEach(async () => {
    closeDb();
    exitSpy.mockRestore();
    await fs.rm(communityPath, {recursive: true, force: true});
  });

  test('loads a valid addon and saves it to the database', async () => {
    await createAddon(
      communityPath,
      'test-airport',
      VALID_MANIFEST,
      VALID_CONTENT_HISTORY
    );

    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toHaveLength(1);
    expect(cached![0]!.title).toBe('Test Airport');
    expect(cached![0]!.creator).toBe('Test Creator');
    expect(cached![0]!.packageName).toBe('test-airport');
    expect(cached![0]!.packageVersion).toBe('1.0.0');
    expect(cached![0]!.items).toHaveLength(1);
    expect(cached![0]!.items[0]!.content).toBe('KJFK');
  });

  test('loads multiple valid addons', async () => {
    const manifest2 = JSON.stringify({
      dependencies: [],
      content_type: 'SCENERY',
      title: 'Second Airport',
      manufacturer: 'Corp',
      creator: 'Creator B',
      package_version: '2.0.0',
      minimum_game_version: '1.0.0',
    });
    const history2 = JSON.stringify({
      'package-name': 'second-airport',
      items: [{type: 'airport', content: 'EGLL', revision: 1}],
    });

    await createAddon(communityPath, 'addon-a', VALID_MANIFEST, VALID_CONTENT_HISTORY);
    await createAddon(communityPath, 'addon-b', manifest2, history2);

    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toHaveLength(2);
    const names = cached!.map(a => a.packageName);
    expect(names).toContain('test-airport');
    expect(names).toContain('second-airport');
  });

  test('skips addon with invalid manifest schema', async () => {
    await createAddon(
      communityPath,
      'bad-manifest',
      INVALID_MANIFEST,
      VALID_CONTENT_HISTORY
    );

    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toBeNull(); // nothing was saved
  });

  test('skips addon with invalid ContentHistory schema', async () => {
    await createAddon(
      communityPath,
      'bad-history',
      VALID_MANIFEST,
      INVALID_CONTENT_HISTORY
    );

    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toBeNull();
  });

  test('skips directory with no manifest.json', async () => {
    const dir = join(communityPath, 'no-manifest');
    await fs.mkdir(dir, {recursive: true});
    // Only ContentHistory, no manifest
    await fs.writeFile(join(dir, 'ContentHistory.json'), VALID_CONTENT_HISTORY);

    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toBeNull();
  });

  test('handles empty community directory', async () => {
    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toBeNull();
  });

  test('loads valid addons and skips invalid ones in mixed directory', async () => {
    await createAddon(communityPath, 'valid', VALID_MANIFEST, VALID_CONTENT_HISTORY);
    await createAddon(communityPath, 'invalid', INVALID_MANIFEST, VALID_CONTENT_HISTORY);

    await loadAddons(communityPath);

    const cached = await loadAddonsFromCache();
    expect(cached).toHaveLength(1);
    expect(cached![0]!.packageName).toBe('test-airport');
  });

  test('exits when community path does not exist', async () => {
    await expect(loadAddons('/definitely/does/not/exist')).rejects.toThrow(
      'process.exit called'
    );
  });
});
