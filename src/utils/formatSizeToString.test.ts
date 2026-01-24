import {expect, test} from 'bun:test';

import {formatSizeToString} from './formatSizeToString';

test('formats bytes (< 1000)', () => {
  expect(formatSizeToString(0)).toBe('0B');
  expect(formatSizeToString(1)).toBe('1B');
  expect(formatSizeToString(500)).toBe('500B');
  expect(formatSizeToString(999)).toBe('999B');
});

test('formats kilobytes (1000 - 999999)', () => {
  expect(formatSizeToString(1_000)).toBe('1kB');
  expect(formatSizeToString(1_500)).toBe('1.5kB');
  expect(formatSizeToString(5_000)).toBe('5kB');
  expect(formatSizeToString(10_000)).toBe('10kB');
  expect(formatSizeToString(100_000)).toBe('100kB');
  expect(formatSizeToString(500_000)).toBe('500kB');
  expect(formatSizeToString(999_999)).toBe('1,000kB');
});

test('formats megabytes (1000000 - 999999999)', () => {
  expect(formatSizeToString(1_000_000)).toBe('1MB');
  expect(formatSizeToString(1_500_000)).toBe('1.5MB');
  expect(formatSizeToString(5_000_000)).toBe('5MB');
  expect(formatSizeToString(10_000_000)).toBe('10MB');
  expect(formatSizeToString(100_000_000)).toBe('100MB');
  expect(formatSizeToString(500_000_000)).toBe('500MB');
  expect(formatSizeToString(999_999_999)).toBe('1,000MB');
});

test('formats gigabytes (>= 1000000000)', () => {
  expect(formatSizeToString(1_000_000_000)).toBe('1GB');
  expect(formatSizeToString(1_500_000_000)).toBe('1.5GB');
  expect(formatSizeToString(5_000_000_000)).toBe('5GB');
  expect(formatSizeToString(10_000_000_000)).toBe('10GB');
  expect(formatSizeToString(100_000_000_000)).toBe('100GB');
  expect(formatSizeToString(1_000_000_000_000)).toBe('1,000GB');
});

test('handles fractional values correctly', () => {
  expect(formatSizeToString(1_234)).toBe('1.23kB');
  expect(formatSizeToString(1_234_567)).toBe('1.23MB');
  expect(formatSizeToString(1_234_567_890)).toBe('1.23GB');
});

test('handles boundary values', () => {
  // Just below KB threshold
  expect(formatSizeToString(999)).toBe('999B');
  // Exactly at KB threshold
  expect(formatSizeToString(1_000)).toBe('1kB');
  // Just below MB threshold
  expect(formatSizeToString(999_999)).toBe('1,000kB');
  // Exactly at MB threshold
  expect(formatSizeToString(1_000_000)).toBe('1MB');
  // Just below GB threshold
  expect(formatSizeToString(999_999_999)).toBe('1,000MB');
  // Exactly at GB threshold
  expect(formatSizeToString(1_000_000_000)).toBe('1GB');
});
