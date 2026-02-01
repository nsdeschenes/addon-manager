import {expect, test} from 'bun:test';

import type {Addon} from '../types';

import {renderAddon} from './renderAddon';

test('renders addon with all fields', () => {
  const addon: Addon = {
    title: 'Test Airport',
    creator: 'Test Creator',
    size: 1_500_000,
    packageName: 'test-airport',
    packageVersion: '1.0.0',
    minimumGameVersion: '1.0.0',
    items: [
      {type: 'Scenery', content: 'airport.bgl', revision: 1},
      {type: 'Model', content: 'model.bgl', revision: 1},
    ],
  };

  const result = renderAddon(addon);

  expect(result).toContain('Title: Test Airport');
  expect(result).toContain('Creator: Test Creator');
  expect(result).toContain('Size: 1.5MB');
  expect(result).toContain('Package Name: test-airport');
  expect(result).toContain('Package Version: 1.0.0');
  expect(result).toContain('Minimum Game Version: 1.0.0');
  expect(result).toContain('  - Scenery: airport.bgl');
  expect(result).toContain('  - Model: model.bgl');
});

test('renders addon with empty items array', () => {
  const addon: Addon = {
    title: 'Empty Addon',
    creator: 'Creator',
    size: 0,
    packageName: 'empty',
    packageVersion: '1.0.0',
    minimumGameVersion: '1.0.0',
    items: [],
  };

  const result = renderAddon(addon);

  expect(result).toContain('Title: Empty Addon');
  expect(result).toContain('Items:');
  const itemsIndex = result.indexOf('Items:');
  const itemsSection = result.slice(itemsIndex);
  expect(itemsSection).not.toContain('  - Scenery:');
  expect(itemsSection).not.toContain('  - Model:');
});

test('renders addon with multiple items', () => {
  const addon: Addon = {
    title: 'Multi Item Addon',
    creator: 'Creator',
    size: 5_000_000,
    packageName: 'multi',
    packageVersion: '2.0.0',
    minimumGameVersion: '1.5.0',
    items: [
      {type: 'Scenery', content: 'scenery1.bgl', revision: 1},
      {type: 'Scenery', content: 'scenery2.bgl', revision: 1},
      {type: 'Model', content: 'model1.bgl', revision: 1},
      {type: 'Texture', content: 'texture.dds', revision: 1},
    ],
  };

  const result = renderAddon(addon);

  expect(result).toContain('  - Scenery: scenery1.bgl');
  expect(result).toContain('  - Scenery: scenery2.bgl');
  expect(result).toContain('  - Model: model1.bgl');
  expect(result).toContain('  - Texture: texture.dds');
  const itemsIndex = result.indexOf('Items:');
  const itemsSection = result.slice(itemsIndex);
  const itemLines = itemsSection.split('\n').filter(line => line.trim().startsWith('-'));
  expect(itemLines).toHaveLength(4);
});

test('handles different size formats', () => {
  const testCases = [
    {size: 500, expected: '500B'},
    {size: 1_500, expected: '1.5kB'},
    {size: 1_000_000, expected: '1MB'},
    {size: 1_500_000_000, expected: '1.5GB'},
  ];

  testCases.forEach(({size, expected}) => {
    const addon: Addon = {
      title: 'Size Test',
      creator: 'Creator',
      size,
      packageName: 'test',
      packageVersion: '1.0.0',
      minimumGameVersion: '1.0.0',
      items: [],
    };

    const result = renderAddon(addon);
    expect(result).toContain(`Size: ${expected}`);
  });
});

test('handles special characters in strings', () => {
  const addon: Addon = {
    title: 'Test & Airport (v2)',
    creator: "Creator's Name",
    size: 1_000,
    packageName: 'test-airport_v2',
    packageVersion: '1.0.0-beta',
    minimumGameVersion: '1.0.0',
    items: [{type: 'Scenery', content: 'airport (main).bgl', revision: 1}],
  };

  const result = renderAddon(addon);

  expect(result).toContain('Title: Test & Airport (v2)');
  expect(result).toContain("Creator: Creator's Name");
  expect(result).toContain('Package Name: test-airport_v2');
  expect(result).toContain('Package Version: 1.0.0-beta');
  expect(result).toContain('  - Scenery: airport (main).bgl');
});

test('renders correct format structure', () => {
  const addon: Addon = {
    title: 'Test',
    creator: 'Creator',
    size: 1_000,
    packageName: 'test',
    packageVersion: '1.0.0',
    minimumGameVersion: '1.0.0',
    items: [{type: 'Scenery', content: 'test.bgl', revision: 1}],
  };

  const result = renderAddon(addon);
  const lines = result.trim().split('\n');

  expect(lines).toHaveLength(8);
  expect(lines[0]).toBe('Title: Test');
  expect(lines[1]).toBe('Creator: Creator');
  expect(lines[2]).toBe('Size: 1kB');
  expect(lines[3]).toBe('Package Name: test');
  expect(lines[4]).toBe('Package Version: 1.0.0');
  expect(lines[5]).toBe('Minimum Game Version: 1.0.0');
  expect(lines[6]).toBe('Items:');
  expect(lines[7]).toBe('  - Scenery: test.bgl');
});
