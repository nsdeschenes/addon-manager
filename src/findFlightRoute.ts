import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {autocomplete, box, cancel, isCancel, tasks} from '@clack/prompts';
import * as Sentry from '@sentry/bun';
import {generateText, Output} from 'ai';
import {z} from 'zod';

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

    const googleAI = createGoogleGenerativeAI({apiKey});
    const installedList = icaoCodes.join(', ');
    const departureLabel = formatLabel(departure as string);

    const flightSchema = z.object({
      icao: z.string().describe('ICAO code of the destination airport'),
      airline: z.string().describe('Full airline name e.g. British Airways'),
      callsign: z.string().describe('ICAO flight callsign e.g. BAW123'),
      aircraft: z.string().describe('Aircraft type e.g. Boeing 737-800'),
      reason: z.string().describe('Why this is a popular or interesting route'),
    });

    let groundedText = '';
    let results: z.infer<typeof flightSchema>[] | undefined;

    await tasks([
      {
        title: 'Searching for real-world flight data',
        task: wrapWithSpan(
          {spanName: 'find-flight-route-search', op: 'cli.task'},
          async () => {
            const {text} = await generateText({
              model: googleAI('gemini-2.5-flash'),
              tools: {googleSearch: googleAI.tools.googleSearch({})},
              prompt: `I am a flight simulator pilot. I have addon scenery installed for these airports: ${installedList}.

My departure airport is ${departureLabel}.

Using real-world flight data, find the top 5 most popular or interesting real-world flights departing from ${departure}. Only include destinations from my installed airport list above. If fewer than 5 match, list only the ones that do.

For each flight include: destination airport ICAO code, airline name, flight callsign, aircraft type, and why it's a popular or interesting route.`,
            });

            groundedText = text;
            return 'Search complete';
          }
        ),
      },
      {
        title: 'Structuring results',
        task: wrapWithSpan(
          {spanName: 'find-flight-route-structure', op: 'cli.task'},
          async () => {
            const {output} = await generateText({
              model: googleAI('gemini-2.5-flash'),
              output: Output.array({element: flightSchema}),
              prompt: `Extract the flight route information from the following text and return it as structured data:\n\n${groundedText}`,
            });

            results = output ?? [];
            Sentry.logger.info('Flight route search completed');
            return 'Structuring complete';
          }
        ),
      },
    ]);

    if (!results || results.length === 0) {
      box(
        `No matching installed airports found as destinations from ${departure}.`,
        `Flight Routes from ${departure}`
      );
      return;
    }

    const resultLines = results.map(({icao, airline, callsign, aircraft, reason}) => {
      const label = formatLabel(icao);
      const lines = [label, `  Airline:   ${airline}`];
      if (callsign) lines.push(`  Callsign:  ${callsign}`);
      if (aircraft) lines.push(`  Aircraft:  ${aircraft}`);
      if (reason) lines.push(`  Route:     ${reason}`);
      return lines.join('\n');
    });

    box(resultLines.join('\n\n'), `Flight Routes from ${departureLabel}`);
  }
);
