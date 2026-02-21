import {spinner} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {saveAirports} from './db/airportRepository';
import {wrapWithSpan} from './sentry';
import type {Airport} from './types';

const AIRPORTS_CSV_URL =
  'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv';

function parseAirportsCsv(csv: string): Airport[] {
  const lines = csv.split('\n');
  const header = lines[0];
  if (!header) return [];

  const columns = header.split(',').map(c => c.replace(/"/g, '').trim());

  const colIndex = (name: string) => columns.indexOf(name);
  const iIdent = colIndex('ident');
  const iType = colIndex('type');
  const iName = colIndex('name');
  const iLat = colIndex('latitude_deg');
  const iLon = colIndex('longitude_deg');
  const iElev = colIndex('elevation_ft');
  const iCountry = colIndex('iso_country');
  const iMunicipality = colIndex('municipality');
  const iIcao = colIndex('gps_code');
  const iIata = colIndex('iata_code');

  const airports: Airport[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    // Parse CSV fields respecting quoted values
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);

    const get = (idx: number) => {
      const val = fields[idx]?.trim() ?? '';
      return val === '' ? null : val;
    };
    const getNum = (idx: number): number | null => {
      const val = get(idx);
      if (val === null) return null;
      const n = Number(val);
      return Number.isNaN(n) ? null : n;
    };

    const ident = get(iIdent);
    const name = get(iName);
    if (!ident || !name) continue;

    airports.push({
      ident,
      type: get(iType),
      name,
      latitudeDeg: getNum(iLat),
      longitudeDeg: getNum(iLon),
      elevationFt: getNum(iElev) !== null ? Math.round(getNum(iElev)!) : null,
      isoCountry: get(iCountry),
      municipality: get(iMunicipality),
      icaoCode: get(iIcao),
      iataCode: get(iIata),
    });
  }

  return airports;
}

export const loadAirports = wrapWithSpan(
  {spanName: 'load-airports', op: 'cli.command'},
  async function (): Promise<boolean> {
    const s = spinner();

    try {
      s.start('Downloading airport data...');

      const startTime = Date.now();
      const response = await fetch(AIRPORTS_CSV_URL);
      if (!response.ok) {
        s.stop('Failed to download airport data');
        Sentry.logger.error(
          Sentry.logger.fmt`Airport CSV fetch failed: ${response.status}`
        );
        return false;
      }

      const csv = await response.text();
      const downloadMs = Date.now() - startTime;
      Sentry.logger.info(Sentry.logger.fmt`Airport CSV downloaded in ${downloadMs}ms`);
      Sentry.metrics.distribution('airport_download_ms', downloadMs, {unit: 'millisecond'});

      s.message('Parsing airport data...');
      const airports = parseAirportsCsv(csv);
      Sentry.logger.info(Sentry.logger.fmt`Parsed ${airports.length} airports from CSV`);
      Sentry.metrics.gauge('airport_csv_count', airports.length);

      s.message('Saving airport data...');
      await saveAirports(airports);

      s.stop(`Loaded ${airports.length} airports`);
      return true;
    } catch (error) {
      s.stop('Failed to load airport data');
      Sentry.logger.error('Airport load failure');
      Sentry.captureException(error);
      return false;
    }
  }
);
