import { autocomplete, box } from "@clack/prompts";
import type { Addon } from "./types";
import { renderAddon } from "./utils/renderAddon";

export async function viewAddons(addons: Addon[]) {
  const addon = await autocomplete({
    message: "Select addons to view",
    options: addons.map((addon) => ({
      value: addon.packageName,
      label: addon.packageName,
    })),
    maxItems: 10,
  });

  const selectedAddon = addons.find((a) => a.packageName === addon)!;

  box(renderAddon(selectedAddon), selectedAddon.packageName);

  return addon;
}
