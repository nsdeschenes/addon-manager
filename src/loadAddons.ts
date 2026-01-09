import { tasks } from "@clack/prompts";
import type { Addon } from "./types";

export async function loadAddons(
  communityPath: string | symbol,
  addons: Addon[]
) {
  await tasks([
    {
      title: "Finding Addons",
      task: async () => {
        return "Found addons in your community directory";
      },
    },
    {
      title: "Loading Addons",
      task: async () => {
        return "Loaded addon data from your community directory";
      },
    },
  ]);
}
