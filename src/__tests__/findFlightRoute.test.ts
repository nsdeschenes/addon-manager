import {Database} from 'bun:sqlite';
import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';

import {saveAirports} from '../db/airportRepository';
import {closeDb, getDb} from '../db/index';
import type {Addon, Airport} from '../types';

// Mutable state for controlling mock behaviour per test
let mockDeparture: string | symbol = 'KJFK';
let mockIsCancel = false;
let mockAiText = 'Some grounded flight data';
let mockAiOutput: unknown[] | undefined = [
  {
    icao: 'EGLL',
    airline: 'British Airways',
    callsign: 'BAW123',
    aircraft: 'Boeing 777-300ER',
    reason: 'Popular transatlantic route',
  },
];
let lastBoxContent = '';
let lastBoxTitle = '';

mock.module('@clack/prompts', () => ({
  autocomplete: async (_opts: unknown) => mockDeparture,
  isCancel: (_v: unknown) => mockIsCancel,
  box: (content: string, title: string) => {
    lastBoxContent = content;
    lastBoxTitle = title;
  },
  tasks: async (items: Array<{title: string; task: () => Promise<string>}>) => {
    for (const item of items) {
      await item.task();
    }
  },
  spinner: () => ({start: () => {}, stop: () => {}, message: () => {}}),
}));

mock.module('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: () => {
    const fn = (_model: string) => `mock-model-${_model}`;
    (fn as unknown as {tools: {googleSearch: () => object}}).tools = {
      googleSearch: () => ({}),
    };
    return fn;
  },
}));

mock.module('ai', () => ({
  generateText: async (opts: {output?: unknown}) => {
    if (opts.output !== undefined) {
      return {output: mockAiOutput};
    }
    return {text: mockAiText};
  },
  Output: {
    array: (schema: unknown) => schema,
  },
}));

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

describe('findFlightRoute', async () => {
  const {findFlightRoute} = await import('../findFlightRoute');

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    getDb(sqlite);
    lastBoxContent = '';
    lastBoxTitle = '';
    mockDeparture = 'KJFK';
    mockIsCancel = false;
    mockAiText = 'Some grounded flight data';
    mockAiOutput = [
      {
        icao: 'EGLL',
        airline: 'British Airways',
        callsign: 'BAW123',
        aircraft: 'Boeing 777-300ER',
        reason: 'Popular transatlantic route',
      },
    ];
  });

  afterEach(() => {
    closeDb();
  });

  test('displays flight routes when AI returns results', async () => {
    await saveAirports([
      makeAirport({ident: 'KJFK', icaoCode: 'KJFK'}),
      makeAirport({
        ident: 'EGLL',
        icaoCode: 'EGLL',
        name: 'Heathrow Airport',
        municipality: 'London',
        isoCountry: 'GB',
        iataCode: 'LHR',
      }),
    ]);

    const addons = [
      makeAddon({
        items: [
          {type: 'airport', content: 'KJFK', revision: 1},
          {type: 'airport', content: 'EGLL', revision: 1},
        ],
      }),
    ];

    await findFlightRoute(addons, 'test-api-key');

    expect(lastBoxContent).toContain('British Airways');
    expect(lastBoxContent).toContain('BAW123');
    expect(lastBoxContent).toContain('Boeing 777-300ER');
    expect(lastBoxContent).toContain('Popular transatlantic route');
    expect(lastBoxTitle).toContain('KJFK');
  });

  test('enriches destination label with airport info from DB', async () => {
    await saveAirports([
      makeAirport({ident: 'KJFK', icaoCode: 'KJFK'}),
      makeAirport({
        ident: 'EGLL',
        icaoCode: 'EGLL',
        name: 'Heathrow Airport',
        municipality: 'London',
        isoCountry: 'GB',
        iataCode: 'LHR',
      }),
    ]);

    const addons = [
      makeAddon({
        items: [
          {type: 'airport', content: 'KJFK', revision: 1},
          {type: 'airport', content: 'EGLL', revision: 1},
        ],
      }),
    ];

    await findFlightRoute(addons, 'test-api-key');

    // Destination label should be enriched
    expect(lastBoxContent).toContain('Heathrow Airport');
  });

  test('shows no-results box when AI returns empty output', async () => {
    mockAiOutput = [];

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await findFlightRoute(addons, 'test-api-key');

    expect(lastBoxContent).toContain('No matching installed airports found');
    expect(lastBoxTitle).toContain('KJFK');
  });

  test('shows no-results box when AI returns null output', async () => {
    mockAiOutput = undefined;

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await findFlightRoute(addons, 'test-api-key');

    expect(lastBoxContent).toContain('No matching installed airports found');
  });

  test('returns early when user cancels departure selection', async () => {
    mockIsCancel = true;

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await findFlightRoute(addons, 'test-api-key');

    // Neither box nor tasks should have been triggered
    expect(lastBoxContent).toBe('');
  });

  test('route result includes all fields when present', async () => {
    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await findFlightRoute(addons, 'test-api-key');

    expect(lastBoxContent).toContain('Airline:   British Airways');
    expect(lastBoxContent).toContain('Callsign:  BAW123');
    expect(lastBoxContent).toContain('Aircraft:  Boeing 777-300ER');
    expect(lastBoxContent).toContain('Route:     Popular transatlantic route');
  });

  test('route result omits optional fields when empty', async () => {
    mockAiOutput = [
      {
        icao: 'EGLL',
        airline: 'British Airways',
        callsign: '',
        aircraft: '',
        reason: '',
      },
    ];

    const addons = [
      makeAddon({items: [{type: 'airport', content: 'KJFK', revision: 1}]}),
    ];

    await findFlightRoute(addons, 'test-api-key');

    expect(lastBoxContent).toContain('Airline:   British Airways');
    expect(lastBoxContent).not.toContain('Callsign:');
    expect(lastBoxContent).not.toContain('Aircraft:');
    expect(lastBoxContent).not.toContain('Route:');
  });
});
