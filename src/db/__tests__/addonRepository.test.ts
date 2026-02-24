import assert from 'assert';

import {Database} from 'bun:sqlite';
import {afterEach, beforeEach, describe, expect, test} from 'bun:test';

import type {Addon} from '../../types';
import {loadAddonsFromCache, saveAddons} from '../addonRepository';
import {closeDb, getDb} from '../index';

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
    const sqlite = new Database(':memory:');
    getDb(sqlite);
  });

  afterEach(() => {
    closeDb();
  });

  test('empty DB returns null', async () => {
    const result = await loadAddonsFromCache();
    expect(result).toBeNull();
  });

  test('saveAddons writes and loadAddonsFromCache reads back correctly', async () => {
    const addons = [
      makeAddon({packageName: 'addon-a', title: 'Addon A'}),
      makeAddon({packageName: 'addon-b', title: 'Addon B', items: []}),
    ];

    await saveAddons(addons);
    const loaded = await loadAddonsFromCache();

    expect(loaded).not.toBeNull();
    expect(loaded).toHaveLength(2);
    assert(loaded);

    const addonA = loaded.at(0);
    assert(addonA);
    expect(addonA.title).toBe('Addon A');
    expect(addonA.packageName).toBe('addon-a');
    expect(addonA.items).toHaveLength(2);

    const addonB = loaded.at(1);
    assert(addonB);
    expect(addonB.title).toBe('Addon B');
    expect(addonB.items).toHaveLength(0);
  });

  test('saving twice replaces first set', async () => {
    await saveAddons([makeAddon({packageName: 'first'})]);
    await saveAddons([
      makeAddon({packageName: 'second-a'}),
      makeAddon({packageName: 'second-b'}),
    ]);

    const loaded = await loadAddonsFromCache();
    expect(loaded).toHaveLength(2);
    assert(loaded);

    const addonA = loaded.at(0);
    assert(addonA);
    expect(addonA.packageName).toBe('second-a');

    const addonB = loaded.at(1);
    assert(addonB);
    expect(addonB.packageName).toBe('second-b');
  });

  test('addon items cascade with parent addon deletion', async () => {
    await saveAddons([
      makeAddon({
        packageName: 'cascade-test',
        items: [{type: 'a', content: 'b', revision: 1}],
      }),
    ]);

    // Verify items exist
    let loaded = await loadAddonsFromCache();
    assert(loaded);

    const addon = loaded.at(0);
    assert(addon);
    expect(addon.items).toHaveLength(1);

    // Save empty set (deletes all addons)
    await saveAddons([]);
    loaded = await loadAddonsFromCache();
    expect(loaded).toBeNull();
  });
});
