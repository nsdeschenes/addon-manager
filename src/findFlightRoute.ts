import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {autocomplete, box, cancel, isCancel, spinner} from '@clack/prompts';
import * as Sentry from '@sentry/bun';
import {generateText} from 'ai';

import {getAirportsByIcaoCodes} from './db/airportRepository';
import {wrapWithSpan} from './sentry';
import type {Addon, Airport} from './types';

export const findFlightRoute = wrapWithSpan(
  {spanName: 'find-flight-route', op: 'cli.command'},
  async function (addons: Addon[], apiKey: string) {
    const icaoCodes = addons.flatMap(addon =>
      addon.items.filter(item => /airport/i.test(item.type)).map(item => item.content)
    );

    const airportData = await getAirportsByIcaoCodes(icaoCodes);
    const airportMap = new Map<string, Airport>();
    for (const airport of airportData) {
      if (airport.icaoCode) {
        airportMap.set(airport.icaoCode, airport);
      }
    }

    const formatLabel = (icao: string): string => {
      const info = airportMap.get(icao);
      if (!info) return icao;
      const parts = [icao, '—', info.name];
      if (info.municipality) parts.push(`(${info.municipality})`);
      if (info.isoCountry) parts.push(`[${info.isoCountry}]`);
      return parts.join(' ');
    };

    const departure = await autocomplete({
      message: 'Select departure airport',
      options: icaoCodes.map(icao => ({
        value: icao,
        label: formatLabel(icao),
      })),
      maxItems: 10,
    });

    if (isCancel(departure)) {
      cancel('No airport selected');
      return;
    }

    Sentry.logger.info(Sentry.logger.fmt`Departure airport selected: ${departure}`);

    const s = spinner();
    s.start('Searching for flight routes...');

    try {
      const googleAI = createGoogleGenerativeAI({apiKey});
      const installedList = icaoCodes.join(', ');
      const departureLabel = formatLabel(departure as string);

      const {text} = await generateText({
        model: googleAI('gemini-2.5-flash'),
        tools: {googleSearch: googleAI.tools.googleSearch({})},
        prompt: `I am a flight simulator pilot. I have addon scenery installed for these airports: ${installedList}.

My departure airport is ${departureLabel}.

Using real-world flight data, find the top 5 most popular or interesting real-world flights departing from ${departure}. Only include destinations from my installed airport list above.

For each flight, respond with exactly this format (one per line):
ICAO: <destination_icao> | AIRLINE: <airline name> | CALLSIGN: <ICAO callsign e.g. BAW123> | AIRCRAFT: <aircraft type e.g. Boeing 737-800> | REASON: <brief reason why this is a popular or interesting route>

Only include airports from the installed list. If fewer than 5 match, list only the ones that do.`,
      });

      s.stop('Routes found!');

      Sentry.logger.info('Flight route search completed');

      // Parse structured response lines
      const lines = text
        .split('\n')
        .filter(l => l.includes('ICAO:') && l.includes('AIRLINE:'));
      const results = lines
        .map(line => {
          const icaoMatch = line.match(/ICAO:\s*([A-Z0-9]{3,4})/i);
          const airlineMatch = line.match(/AIRLINE:\s*([^|]+)/i);
          const callsignMatch = line.match(/CALLSIGN:\s*([^|]+)/i);
          const aircraftMatch = line.match(/AIRCRAFT:\s*([^|]+)/i);
          const reasonMatch = line.match(/REASON:\s*(.+)/i);
          return {
            icao: icaoMatch?.[1]?.toUpperCase() ?? '',
            airline: airlineMatch?.[1]?.trim() ?? '',
            callsign: callsignMatch?.[1]?.trim() ?? '',
            aircraft: aircraftMatch?.[1]?.trim() ?? '',
            reason: reasonMatch?.[1]?.trim() ?? '',
          };
        })
        .filter(r => r.icao && r.airline);

      if (results.length === 0) {
        box(
          `No matching installed airports found as destinations from ${departure}.\n\nAI response:\n${text}`,
          `Flight Routes from ${departure}`
        );
        return;
      }

      const resultLines = results.map(({icao, airline, callsign, aircraft, reason}) => {
        const label = formatLabel(icao);
        const lines = [`${label}`, `  Airline:   ${airline}`];
        if (callsign) lines.push(`  Callsign:  ${callsign}`);
        if (aircraft) lines.push(`  Aircraft:  ${aircraft}`);
        if (reason) lines.push(`  Route:     ${reason}`);
        return lines.join('\n');
      });

      box(resultLines.join('\n\n'), `Flight Routes from ${departureLabel}`);
    } catch (error) {
      s.stop('Search failed');
      Sentry.logger.error('Flight route search failed');
      cancel(
        `Failed to fetch flight routes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
