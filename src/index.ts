import { intro, outro, select } from "@clack/prompts";
import { loadAddons } from "./loadAddons";
import type { Addon } from "./types";
import { viewAddons } from "./viewAddons";
import { updateCommunityPath } from "./updateCommunityPath";

let communityPath: string | symbol;
const addons: Addon[] = [];

async function main() {
  intro("Welcome to Addon Manager ✈️");

  if (communityPath === undefined) {
  communityPath = await updateCommunityPath();
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
      case "load-addons":
        await loadAddons(addons, communityPath);
        break;
      case "update-community-path":
        communityPath = await updateCommunityPath();
        break;
      case "exit":
        running = false;
        break;
      default:
        throw new Error(`Invalid option: ${String(selectedOption)}`);
    }
  }

  outro("Thank you for using Addon Manager, and have a safe flight ✈️");
}

main().catch(console.error);
