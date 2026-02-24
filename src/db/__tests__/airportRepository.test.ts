import {Database} from 'bun:sqlite';
import {afterEach, beforeEach, describe, expect, test} from 'bun:test';

import type {Airport} from '../../types';
import {getAirportsByIcaoCodes, hasAirportData, saveAirports} from '../airportRepository';
import {closeDb, getDb} from '../index';

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

describe('airportRepository', () => {
  beforeEach(() => {
    const sqlite = new Database(':memory:');
    getDb(sqlite);
  });

  afterEach(() => {
    closeDb();
  });

  describe('hasAirportData', () => {
    test('returns false on empty DB', async () => {
      expect(await hasAirportData()).toBe(false);
    });

    test('returns true after airports are saved', async () => {
      await saveAirports([makeAirport()]);
      expect(await hasAirportData()).toBe(true);
    });
  });

  describe('saveAirports', () => {
    test('saves airports and replaces existing data on second call', async () => {
      await saveAirports([makeAirport({ident: 'KJFK', icaoCode: 'KJFK'})]);
      await saveAirports([
        makeAirport({ident: 'EGLL', icaoCode: 'EGLL', name: 'Heathrow', iataCode: 'LHR'}),
        makeAirport({ident: 'YSSY', icaoCode: 'YSSY', name: 'Sydney', iataCode: 'SYD'}),
      ]);

      const results = await getAirportsByIcaoCodes(['EGLL', 'YSSY', 'KJFK']);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.icaoCode)).toEqual(expect.arrayContaining(['EGLL', 'YSSY']));
    });

    test('saves airports with nullable fields', async () => {
      await saveAirports([
        makeAirport({
          ident: 'ZZZZ',
          icaoCode: null,
          iataCode: null,
          type: null,
          latitudeDeg: null,
          longitudeDeg: null,
          elevationFt: null,
          isoCountry: null,
          municipality: null,
        }),
      ]);
      expect(await hasAirportData()).toBe(true);
    });

    test('handles large batches without hitting SQLite variable limit', async () => {
      const airports = Array.from({length: 1200}, (_, i) =>
        makeAirport({ident: `ZZ${String(i).padStart(4, '0')}`, icaoCode: null})
      );
      await saveAirports(airports);
      expect(await hasAirportData()).toBe(true);
    });
  });

  describe('getAirportsByIcaoCodes', () => {
    test('returns empty array when codes list is empty', async () => {
      await saveAirports([makeAirport()]);
      expect(await getAirportsByIcaoCodes([])).toEqual([]);
    });

    test('returns matching airports by ICAO code', async () => {
      await saveAirports([
        makeAirport({ident: 'KJFK', icaoCode: 'KJFK', name: 'JFK'}),
        makeAirport({ident: 'KLAX', icaoCode: 'KLAX', name: 'LAX', iataCode: 'LAX'}),
        makeAirport({ident: 'KORD', icaoCode: 'KORD', name: 'ORD', iataCode: 'ORD'}),
      ]);

      const results = await getAirportsByIcaoCodes(['KJFK', 'KLAX']);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.icaoCode)).toEqual(expect.arrayContaining(['KJFK', 'KLAX']));
    });

    test('returns only matched airports when some codes have no match', async () => {
      await saveAirports([makeAirport({ident: 'KJFK', icaoCode: 'KJFK'})]);

      const results = await getAirportsByIcaoCodes(['KJFK', 'ZZZZ']);
      expect(results).toHaveLength(1);
      expect(results[0]?.icaoCode).toBe('KJFK');
    });

    test('returns empty array when no codes match', async () => {
      await saveAirports([makeAirport({ident: 'KJFK', icaoCode: 'KJFK'})]);
      expect(await getAirportsByIcaoCodes(['ZZZZ'])).toHaveLength(0);
    });

    test('maps all Airport fields correctly', async () => {
      const airport = makeAirport();
      await saveAirports([airport]);

      const [result] = await getAirportsByIcaoCodes(['KJFK']);
      expect(result).toMatchObject({
        ident: airport.ident,
        type: airport.type,
        name: airport.name,
        latitudeDeg: airport.latitudeDeg,
        longitudeDeg: airport.longitudeDeg,
        elevationFt: airport.elevationFt,
        isoCountry: airport.isoCountry,
        municipality: airport.municipality,
        icaoCode: airport.icaoCode,
        iataCode: airport.iataCode,
      });
    });
  });
});
