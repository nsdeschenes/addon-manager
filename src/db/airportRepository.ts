import * as Sentry from '@sentry/bun';
import {inArray, sql} from 'drizzle-orm';

import {wrapWithSpan} from '../sentry';
import type {Airport} from '../types';

import {getDb} from './index';
import {airports} from './schema';

export const saveAirports = wrapWithSpan(
  {spanName: 'save-airports', op: 'db.transaction'},
  function (newAirports: Airport[]): void {
    try {
      const db = getDb();

      db.transaction(tx => {
        tx.delete(airports).run();

        // Insert in batches to avoid SQLite variable limit
        const batchSize = 500;
        for (let i = 0; i < newAirports.length; i += batchSize) {
          const batch = newAirports.slice(i, i + batchSize);
          tx.insert(airports)
            .values(
              batch.map(a => ({
                ident: a.ident,
                type: a.type,
                name: a.name,
                latitudeDeg: a.latitudeDeg,
                longitudeDeg: a.longitudeDeg,
                elevationFt: a.elevationFt,
                isoCountry: a.isoCountry,
                municipality: a.municipality,
                icaoCode: a.icaoCode,
                iataCode: a.iataCode,
              }))
            )
            .run();
        }
      });

      Sentry.logger.info(
        Sentry.logger.fmt`Airport data saved, ${newAirports.length} airports`
      );
      Sentry.metrics.gauge('cached_airports', newAirports.length);
    } catch (error) {
      Sentry.logger.error('Airport data save failure');
      Sentry.captureException(error);
    }
  }
);

export const hasAirportData = wrapWithSpan(
  {spanName: 'has-airport-data', op: 'db.query'},
  function (): boolean {
    const db = getDb();
    const result = db.select({count: sql<number>`count(*)`}).from(airports).get();
    return (result?.count ?? 0) > 0;
  }
);

export const getAirportsByIcaoCodes = wrapWithSpan(
  {spanName: 'get-airports-by-icao', op: 'db.query'},
  function (codes: string[]): Airport[] {
    if (codes.length === 0) return [];

    const db = getDb();
    const results = db
      .select()
      .from(airports)
      .where(inArray(airports.icaoCode, codes))
      .all();

    Sentry.logger.info(
      Sentry.logger.fmt`Airport lookup: ${results.length}/${codes.length} matched`
    );

    return results.map(r => ({
      id: r.id,
      ident: r.ident,
      type: r.type,
      name: r.name,
      latitudeDeg: r.latitudeDeg,
      longitudeDeg: r.longitudeDeg,
      elevationFt: r.elevationFt,
      isoCountry: r.isoCountry,
      municipality: r.municipality,
      icaoCode: r.icaoCode,
      iataCode: r.iataCode,
    }));
  }
);
