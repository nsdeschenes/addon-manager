import { intro, outro, select, isCancel, cancel } from "@clack/prompts";
import { loadAddons } from "./loadAddons";
import type { Addon } from "./types";
import { viewAddons } from "./viewAddons";
import { updateCommunityPath } from "./updateCommunityPath";
import { viewAirports } from "./viewAirports";
import { readConfig, loadAddonsFromCache } from "./config";

let communityPath: string | symbol;
let addons: Addon[] = [];

async function main() {
  intro("Welcome to Addon Manager ✈️");

  // Load config on startup
  const config = await readConfig();
  if (config?.communityPath) {
    communityPath = config.communityPath;
  }

  if (communityPath === undefined) {
    communityPath = await updateCommunityPath();
  }

  // Load addons from cache on startup
  const cachedAddons = await loadAddonsFromCache();
  if (cachedAddons) {
    addons = cachedAddons;
  }

  let running = true;
  while (running) {
    const selectedOption = await select({
      message: "What would you like to do?",
      options: [
        {
          value: "view-addons",
          label: "View Addons",
          hint: "View all addons",
          disabled: addons.length === 0,
        },
        {
          value: "view-airports",
          label: "View Airports",
          hint: "View all airports",
          disabled: addons.length === 0,
        },
        {
          value: "load-addons",
          label: "Load Addons",
          hint: "Load addon data from your community directory",
          disabled: communityPath === undefined,
        },
        {
          value: "update-community-path",
          label: "Update Community Path",
          hint: "Update the path to your community directory",
        },
        {
          value: "exit",
          label: "Exit",
          hint: "Exit the program",
        },
      ],
    });

    switch (selectedOption) {
      case "view-addons":
        await viewAddons(addons);
        break;
      case "view-airports":
        await viewAirports(addons);
        break;
      case "load-addons":
        await loadAddons(addons, communityPath);
        break;
      case "update-community-path":
        communityPath = await updateCommunityPath(
          typeof communityPath === "string" ? communityPath : undefined
        );
        break;
      case "exit":
        running = false;
        break;
      default:
        if (isCancel(selectedOption)) {
          cancel("No option selected");
          running = false;
          break;
        }

        throw new Error(`Invalid option: ${String(selectedOption)}`);
    }
  }

  outro("Thank you for using Addon Manager, and have a safe flight ✈️");
}

main().catch(console.error);
