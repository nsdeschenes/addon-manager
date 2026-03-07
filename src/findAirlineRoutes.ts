import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {autocomplete, box, cancel, isCancel, tasks} from '@clack/prompts';
import * as Sentry from '@sentry/bun';
import {generateText, Output} from 'ai';
import {z} from 'zod';

import {getAirportsByIcaoCodes} from './db/airportRepository';
import {wrapWithSpan} from './sentry';
import type {Addon, Airport} from './types';

export const findAirlineRoutes = wrapWithSpan(
  {spanName: 'find-airline-routes', op: 'cli.command'},
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
      cancel('No departure airport selected');
      return;
    }

    Sentry.logger.info(Sentry.logger.fmt`Departure airport selected: ${departure}`);

    const arrival = await autocomplete({
      message: 'Select arrival airport',
      options: icaoCodes
        .filter(icao => icao !== departure)
        .map(icao => ({
          value: icao,
          label: formatLabel(icao),
        })),
      maxItems: 10,
    });

    if (isCancel(arrival)) {
      cancel('No arrival airport selected');
      return;
    }

    Sentry.logger.info(Sentry.logger.fmt`Arrival airport selected: ${arrival}`);

    const googleAI = createGoogleGenerativeAI({apiKey});
    const departureLabel = formatLabel(departure as string);
    const arrivalLabel = formatLabel(arrival as string);

    const flightSchema = z.object({
      icao: z.string().describe('ICAO code of the destination airport'),
      airline: z.string().describe('Full airline name e.g. British Airways'),
      callsign: z
        .string()
        .describe(
          'Full ATC callsign: ICAO airline code + flight number, optional Heavy/Super, dash, telephony name + flight number + Heavy/Super. e.g. "BAW396 Heavy - SPEEDBIRD 396 HEAVY" or "DLH123 - LUFTHANSA 123"'
        ),
      aircraft: z.string().describe('Aircraft type e.g. Boeing 737-800'),
      reason: z
        .string()
        .describe('Why this is a popular or interesting route, maximum 20 words'),
    });

    let groundedText = '';
    let results: z.infer<typeof flightSchema>[] | undefined;

    try {
      await tasks([
        {
          title: 'Searching for real-world airline route data',
          task: wrapWithSpan(
            {spanName: 'find-airline-routes-search', op: 'cli.task'},
            async () => {
              const {text} = await generateText({
                model: googleAI('gemini-2.5-flash'),
                tools: {googleSearch: googleAI.tools.googleSearch({})},
                experimental_telemetry: {
                  isEnabled: true,
                  functionId: 'find-airline-routes-search',
                },
                prompt: `I am a flight simulator pilot. Using real-world flight data, find all airline routes between ${departureLabel} and ${arrivalLabel}.

List every real-world scheduled airline route operating between ${departure} and ${arrival} (in both directions). For each route include: destination airport ICAO code (${arrival}), airline name, full ATC callsign (ICAO airline 3-letter code + flight number, add "Heavy" or "Super" if the aircraft requires it, then a dash, then the ICAO telephony name + flight number + Heavy/Super — e.g. "BAW396 Heavy - SPEEDBIRD 396 HEAVY" or "DLH123 - LUFTHANSA 123"), aircraft type, and why it's a notable route.`,
              });

              groundedText = text;
              return 'Search complete';
            }
          ),
        },
        {
          title: 'Structuring results',
          task: wrapWithSpan(
            {spanName: 'find-airline-routes-structure', op: 'cli.task'},
            async () => {
              const {output} = await generateText({
                model: googleAI('gemini-2.5-flash'),
                output: Output.array({element: flightSchema}),
                experimental_telemetry: {
                  isEnabled: true,
                  functionId: 'find-airline-routes-structure',
                },
                prompt: `Extract the airline route information from the following text and return it as structured data:\n\n${groundedText}`,
              });

              results = output ?? [];
              Sentry.logger.info('Airline route search completed');
              return 'Structuring complete';
            }
          ),
        },
      ]);
    } catch (error) {
      Sentry.logger.error('Airline route search failed');
      cancel(
        `Failed to fetch airline routes: ${error instanceof Error ? error.message : String(error)}`
      );
      return;
    }

    if (!results || results.length === 0) {
      box(
        `No airline routes found between ${departure} and ${arrival}.`,
        `Airline Routes: ${departure} → ${arrival}`
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

    box(resultLines.join('\n\n'), `Airline Routes: ${departureLabel} → ${arrivalLabel}`);
  }
);
