import {Database} from 'bun:sqlite';
import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test';

import {closeDb, getDb} from '../db/index';

// Mock clack to suppress spinner output
mock.module('@clack/prompts', () => ({
  spinner: () => ({start: () => {}, stop: () => {}, message: () => {}}),
}));

const {parseAirportsCsv, loadAirports} = await import('../loadAirports');

const HEADER =
  'ident,type,name,latitude_deg,longitude_deg,elevation_ft,iso_country,municipality,gps_code,iata_code';

describe('parseAirportsCsv', () => {
  test('returns empty array for empty string', () => {
    expect(parseAirportsCsv('')).toEqual([]);
  });

  test('returns empty array for header only', () => {
    expect(parseAirportsCsv(HEADER)).toEqual([]);
  });

  test('parses a single valid row', () => {
    const csv = `${HEADER}\nKJFK,large_airport,John F Kennedy International Airport,40.6398,-73.7789,13,US,New York,KJFK,JFK`;
    const [airport] = parseAirportsCsv(csv);
    expect(airport).toMatchObject({
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
    });
  });

  test('parses quoted fields containing commas', () => {
    const csv = `${HEADER}\nKLAX,large_airport,"Los Angeles, International",33.9425,-118.4081,125,US,Los Angeles,KLAX,LAX`;
    const [airport] = parseAirportsCsv(csv);
    expect(airport?.name).toBe('Los Angeles, International');
    expect(airport?.ident).toBe('KLAX');
  });

  test('skips rows with missing ident', () => {
    const csv = `${HEADER}\n,large_airport,Some Airport,40.0,-74.0,100,US,City,,`;
    expect(parseAirportsCsv(csv)).toHaveLength(0);
  });

  test('skips rows with missing name', () => {
    const csv = `${HEADER}\nKXXX,large_airport,,40.0,-74.0,100,US,City,KXXX,`;
    expect(parseAirportsCsv(csv)).toHaveLength(0);
  });

  test('skips blank lines', () => {
    const csv = `${HEADER}\nKJFK,large_airport,JFK,40.6398,-73.7789,13,US,New York,KJFK,JFK\n\nKLAX,large_airport,LAX,33.9425,-118.4081,125,US,Los Angeles,KLAX,LAX`;
    expect(parseAirportsCsv(csv)).toHaveLength(2);
  });

  test('rounds elevation to integer', () => {
    const csv = `${HEADER}\nKXXX,small_airport,Test,40.0,-74.0,13.7,US,City,KXXX,`;
    const [airport] = parseAirportsCsv(csv);
    expect(airport?.elevationFt).toBe(14);
  });

  test('maps null for empty optional fields', () => {
    const csv = `${HEADER}\nZZZZ,heliport,Test Heli,,,,,,,`;
    const [airport] = parseAirportsCsv(csv);
    expect(airport?.latitudeDeg).toBeNull();
    expect(airport?.longitudeDeg).toBeNull();
    expect(airport?.elevationFt).toBeNull();
    expect(airport?.isoCountry).toBeNull();
    expect(airport?.municipality).toBeNull();
    expect(airport?.icaoCode).toBeNull();
    expect(airport?.iataCode).toBeNull();
  });

  test('parses multiple valid rows', () => {
    const rows = [
      'KJFK,large_airport,JFK,40.6398,-73.7789,13,US,New York,KJFK,JFK',
      'EGLL,large_airport,Heathrow,51.4775,-0.4614,83,GB,London,EGLL,LHR',
      'YSSY,large_airport,Sydney,,-33.9461,151.1772,21,AU,Sydney,YSSY,SYD',
    ];
    const csv = `${HEADER}\n${rows.join('\n')}`;
    expect(parseAirportsCsv(csv)).toHaveLength(3);
  });

  test('handles large batch without error', () => {
    const rows = Array.from(
      {length: 1500},
      (_, i) =>
        `ZZ${String(i).padStart(4, '0')},small_airport,Airport ${i},40.0,-74.0,100,US,City,,`
    );
    const csv = `${HEADER}\n${rows.join('\n')}`;
    expect(parseAirportsCsv(csv)).toHaveLength(1500);
  });
});

describe('loadAirports', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    getDb(sqlite);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    closeDb();
    globalThis.fetch = originalFetch;
  });

  test('returns true and saves airports on successful fetch', async () => {
    const csv = `${HEADER}\nKJFK,large_airport,JFK,40.6398,-73.7789,13,US,New York,KJFK,JFK`;
    globalThis.fetch = mock(async () => ({
      ok: true,
      text: async () => csv,
    })) as unknown as typeof globalThis.fetch;

    const result = await loadAirports();
    expect(result).toBe(true);
  });

  test('returns false when fetch response is not ok', async () => {
    globalThis.fetch = mock(async () => ({
      ok: false,
      status: 404,
      text: async () => '',
    })) as unknown as typeof globalThis.fetch;

    const result = await loadAirports();
    expect(result).toBe(false);
  });

  test('returns false when fetch throws', async () => {
    globalThis.fetch = mock(async () => {
      throw new Error('Network error');
    }) as unknown as typeof globalThis.fetch;

    const result = await loadAirports();
    expect(result).toBe(false);
  });
});
