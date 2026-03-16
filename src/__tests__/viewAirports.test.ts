import {Database} from 'bun:sqlite';
import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';

import {saveAirports} from '../db/airportRepository';
import {closeDb, getDb} from '../db/index';
import type {Addon, Airport} from '../types';

let lastBoxContent = '';
let mockSelectedAirport = 'KJFK';
let mockIsCancel = false;

mock.module('@clack/prompts', () => ({
  autocomplete: async (_opts: unknown) => mockSelectedAirport,
  box: (content: string, _title: string) => {
    lastBoxContent = content;
  },
  cancel: () => {},
  isCancel: (_v: unknown) => mockIsCancel,
  spinner: () => ({
    start: () => {},
    stop: () => {},
    message: () => {},
    cancel: () => {},
    error: () => {},
  }),
}));

const {extractIcaoCodes, formatAirportLabel, viewAirports} =
  await import('../viewAirports');

function makeAddon(overrides: Partial<Addon> = {}): Addon {
  return {
    title: 'Test Addon',
    creator: 'Creator',
    size: 1024,
    packageName: 'test-addon',
    packageVersion: '1.0.0',
    minimumGameVersion: '1.0.0',
    items: [],
    ...overrides,
  };
}

function makeAirport(overrides: Partial<Airport> = {}): Airport {
  return {
    ident: 'KJFK',
    type: 'large_airport',
    name: 'John F Kennedy International Airport',
    latitudeDeg: 40.6398,
    longitudeDeg: -73.7789,
    elevationFt: 13,
    isoCountry: 'US',
    municipality: 'New York',
    icaoCode: 'KJFK',
    iataCode: 'JFK',
    ...overrides,
  };
}

describe('extractIcaoCodes', () => {
  test('returns empty array for addon with no items', () => {
    expect(extractIcaoCodes([makeAddon()])).toEqual([]);
  });

  test('extracts ICAO codes from airport items', () => {
    const addon = makeAddon({
      items: [
        {type: 'airport', content: 'KJFK', revision: 1},
        {type: 'airport', content: 'KLAX', revision: 1},
      ],
    });
    expect(extractIcaoCodes([addon])).toEqual(['KJFK', 'KLAX']);
  });

  test('filters out non-airport item types', () => {
    const addon = makeAddon({
      items: [
        {type: 'airport', content: 'KJFK', revision: 1},
        {type: 'scenery', content: 'NYC Pack', revision: 1},
        {type: 'model', content: 'plane.bgl', revision: 1},
      ],
    });
    expect(extractIcaoCodes([addon])).toEqual(['KJFK']);
  });

  test('matches airport type case-insensitively', () => {
    const addon = makeAddon({
      items: [
        {type: 'Airport', content: 'KJFK', revision: 1},
        {type: 'AIRPORT', content: 'KLAX', revision: 1},
      ],
    });
    expect(extractIcaoCodes([addon])).toEqual(['KJFK', 'KLAX']);
  });

  test('combines codes from multiple addons', () => {
    const addonA = makeAddon({
      packageName: 'a',
      items: [{type: 'airport', content: 'KJFK', revision: 1}],
    });
    const addonB = makeAddon({
      packageName: 'b',
      items: [{type: 'airport', content: 'EGLL', revision: 1}],
    });
    expect(extractIcaoCodes([addonA, addonB])).toEqual(['KJFK', 'EGLL']);
  });
});

describe('formatAirportLabel', () => {
  test('returns ICAO alone when not in map', () => {
    const map = new Map<string, Airport>();
    expect(formatAirportLabel('KJFK', map)).toBe('KJFK');
  });

  test('formats full label with name, municipality, and country', () => {
    const map = new Map([['KJFK', makeAirport()]]);
    expect(formatAirportLabel('KJFK', map)).toBe(
      'KJFK — John F Kennedy International Airport (New York) [US]'
    );
  });

  test('omits municipality when null', () => {
    const map = new Map([['KJFK', makeAirport({municipality: null})]]);
    expect(formatAirportLabel('KJFK', map)).toBe(
      'KJFK — John F Kennedy International Airport [US]'
    );
  });

  test('omits country when null', () => {
    const map = new Map([['KJFK', makeAirport({isoCountry: null})]]);
    expect(formatAirportLabel('KJFK', map)).toBe(
      'KJFK — John F Kennedy International Airport (New York)'
    );
  });

  test('returns name only when municipality and country are null', () => {
    const map = new Map([['KJFK', makeAirport({municipality: null, isoCountry: null})]]);
    expect(formatAirportLabel('KJFK', map)).toBe(
      'KJFK — John F Kennedy International Airport'
    );
  });
});

describe('viewAirports enrichment', () => {
  beforeEach(() => {
    const sqlite = new Database(':memory:');
    getDb(sqlite);
    lastBoxContent = '';
    mockSelectedAirport = 'KJFK';
    mockIsCancel = false;
  });

  afterEach(() => {
    closeDb();
  });

  test('enriches airport labels from DB when available', async () => {
    await saveAirports([makeAirport()]);

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await viewAirports(addons);

    expect(lastBoxContent).toContain('John F Kennedy International Airport');
    expect(lastBoxContent).toContain('KJFK');
    expect(lastBoxContent).toContain('New York');
    expect(lastBoxContent).toContain('US');
  });

  test('shows airport details box after selection', async () => {
    await saveAirports([makeAirport()]);

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await viewAirports(addons);

    expect(lastBoxContent).toContain('Airport Details:');
    expect(lastBoxContent).toContain('Name: John F Kennedy International Airport');
    expect(lastBoxContent).toContain('ICAO: KJFK');
    expect(lastBoxContent).toContain('IATA: JFK');
    expect(lastBoxContent).toContain('Elevation: 13 ft');
  });

  test('shows box without airport details when ICAO not in DB', async () => {
    // No airports saved to DB
    const addons = [
      makeAddon({items: [{type: 'airport', content: 'ZZZZ', revision: 1}]}),
    ];
    mockSelectedAirport = 'ZZZZ';

    await viewAirports(addons);

    // Box should still be shown (just no airport info section)
    expect(lastBoxContent).not.toContain('Airport Details:');
  });

  test('returns early when user cancels airport selection', async () => {
    mockIsCancel = true;

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await viewAirports(addons);

    // box should not have been called
    expect(lastBoxContent).toBe('');
  });
});
