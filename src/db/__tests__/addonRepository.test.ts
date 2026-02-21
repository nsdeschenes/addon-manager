import {Database} from 'bun:sqlite';
import {beforeEach, describe, expect, test} from 'bun:test';

import type {Addon} from '../../types';
import {loadAddonsFromCache, saveAddons} from '../addonRepository';
import {getDb, resetDb} from '../index';

function makeAddon(overrides: Partial<Addon> = {}): Addon {
  return {
    title: 'Test Addon',
    creator: 'Test Creator',
    size: 1024,
    packageName: 'test-addon',
    packageVersion: '1.0.0',
    minimumGameVersion: '1.0.0',
    items: [
      {type: 'airport', content: 'KJFK', revision: 1},
      {type: 'scenery', content: 'NYC Pack', revision: 2},
    ],
    ...overrides,
  };
}

describe('addonRepository', () => {
  beforeEach(() => {
    resetDb();
    const sqlite = new Database(':memory:');
    getDb(sqlite);
  });

  test('empty DB returns null', () => {
    const result = loadAddonsFromCache();
    expect(result).toBeNull();
  });

  test('saveAddons writes and loadAddonsFromCache reads back correctly', async () => {
    const addons = [
      makeAddon({packageName: 'addon-a', title: 'Addon A'}),
      makeAddon({packageName: 'addon-b', title: 'Addon B', items: []}),
    ];

    await saveAddons(addons);
    const loaded = loadAddonsFromCache();

    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(2);
    expect(loaded![0]!.title).toBe('Addon A');
    expect(loaded![0]!.packageName).toBe('addon-a');
    expect(loaded![0]!.items).toHaveLength(2);
    expect(loaded![1]!.title).toBe('Addon B');
    expect(loaded![1]!.items).toHaveLength(0);
  });

  test('saving twice replaces first set', async () => {
    await saveAddons([makeAddon({packageName: 'first'})]);
    await saveAddons([
      makeAddon({packageName: 'second-a'}),
      makeAddon({packageName: 'second-b'}),
    ]);

    const loaded = loadAddonsFromCache();
    expect(loaded).toHaveLength(2);
    expect(loaded![0]!.packageName).toBe('second-a');
    expect(loaded![1]!.packageName).toBe('second-b');
  });

  test('addon items cascade with parent addon deletion', async () => {
    await saveAddons([
      makeAddon({
        packageName: 'cascade-test',
        items: [{type: 'a', content: 'b', revision: 1}],
      }),
    ]);

    // Verify items exist
    let loaded = loadAddonsFromCache();
    expect(loaded![0]!.items).toHaveLength(1);

    // Save empty set (deletes all addons)
    await saveAddons([]);
    loaded = loadAddonsFromCache();
    expect(loaded).toBeNull();
  });
});
