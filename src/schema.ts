import {z} from 'zod';

export const ContentHistorySchema = z.object({
  'package-name': z.string(),
  items: z.array(
    z.object({
      type: z.string(),
      content: z.string(),
      revision: z.number(),
    })
  ),
});

export const ManifestSchema = z.object({
  dependencies: z.array(z.string()),
  content_type: z.string(),
  title: z.string(),
  manufacturer: z.string(),
  creator: z.string(),
  package_version: z.string(),
  minimum_game_version: z.string(),
  release_notes: z
    .object({
      neutral: z.object({
        LastUpdate: z.string(),
        OlderHistory: z.string(),
      }),
    })
    .optional(),
});
