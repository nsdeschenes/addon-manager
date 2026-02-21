import {autocomplete, box, cancel, isCancel} from '@clack/prompts';
import * as Sentry from '@sentry/bun';

import {getAirportsByIcaoCodes} from './db/airportRepository';
import {renderAddon} from './utils/renderAddon';
import {wrapWithSpan} from './sentry';
import type {Addon, Airport} from './types';

export const viewAirports = wrapWithSpan(
  {spanName: 'view-airports', op: 'cli.command'},
  async function (addons: Addon[]) {
    const icaoCodes = addons.flatMap(addon =>
      addon.items.filter(item => /airport/i.test(item.type)).map(item => item.content)
    );

    Sentry.logger.info(Sentry.logger.fmt`Airports found: ${icaoCodes.length}`);
    Sentry.metrics.count('airports_found', icaoCodes.length);
    Sentry.metrics.gauge('total_airports', icaoCodes.length);

    // Enrich with airport data from the database
    const airportData = await getAirportsByIcaoCodes(icaoCodes);
    const airportMap = new Map<string, Airport>();
    for (const airport of airportData) {
      if (airport.icaoCode) {
        airportMap.set(airport.icaoCode, airport);
      }
    }

    Sentry.logger.info(
      Sentry.logger
        .fmt`Airport enrichment: ${airportMap.size}/${icaoCodes.length} matched`
    );

    const formatLabel = (icao: string): string => {
      const info = airportMap.get(icao);
      if (!info) return icao;
      const parts = [icao, '—', info.name];
      if (info.municipality) parts.push(`(${info.municipality})`);
      if (info.isoCountry) parts.push(`[${info.isoCountry}]`);
      return parts.join(' ');
    };

    const airport = await autocomplete({
      message: 'Select airports to view',
      options: icaoCodes.map(icao => ({
        value: icao,
        label: formatLabel(icao),
      })),
      maxItems: 10,
    });

    if (isCancel(airport)) {
      cancel('No airport selected');
      return '';
    }

    const selectedAddon = addons.find(a =>
      a.items.some(item => item.content === airport)
    )!;

    Sentry.logger.info(Sentry.logger.fmt`Airport selected: ${airport}`);

    const airportInfo = airportMap.get(airport as string);
    const titleParts = [selectedAddon.title, '-', selectedAddon.packageName];
    if (airportInfo) {
      titleParts.push('-', airportInfo.name);
    }

    box(renderAddon(selectedAddon), titleParts.join(' '));
  }
);
