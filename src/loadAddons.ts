import fs from "node:fs/promises";
import { cancel, tasks } from "@clack/prompts";

import type { Addon } from "./types";
import { CONTENT_HISTORY_FILE_NAME, MANIFEST_FILE_NAME } from "./constants";
import { searchForFile } from "./searchForFile";

interface AddonPaths {
  manifestPath: string;
  contentHistoryPath: string;
  packageSize: number;
}

export async function loadAddons(
  addons: Addon[],
  communityPath: string | symbol
) {
  const foundAddonsPaths: AddonPaths[] = [];

  await tasks([
    {
      title: "Checking Community Path is Accessible",
      task: async () => {
        const directoryAccessible = await fs
        .access(String(communityPath))
        .then(() => true)
        .catch(() => false);

        if (!directoryAccessible) {
          cancel("Directory is not accessible");
          process.exit(1);
        }

        return "Directory is accessible";
      },
    },
    {
      title: "Finding Addons",
      task: async () => {
        const paths = await fs.readdir(String(communityPath));

        for (const path of paths) {
          const directory = `${String(communityPath)}/${path}`;

          const packageSize = await fs
            .stat(directory)
            .then((stat) => stat.size);

          const manifestPath = await searchForFile({
            path: String(communityPath),
            fileName: MANIFEST_FILE_NAME,
          });

          const contentHistoryPath = await searchForFile({
            path: String(communityPath),
            fileName: CONTENT_HISTORY_FILE_NAME,
          });

          if (!manifestPath || !contentHistoryPath) {
            continue;
          }

          foundAddonsPaths.push({
            manifestPath,
            contentHistoryPath,
            packageSize,
          });
        }

        return "Found addons in your community directory";
      },
    },
    {
      title: "Loading Addons",
      task: async () => {
        console.log(foundAddonsPaths);
        return "Loaded addon data from your community directory";
      },
    },
  ]);
}
