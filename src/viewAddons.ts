import { autocomplete, box } from "@clack/prompts";
import type { Addon } from "./types";
import { formatSizeToString } from "./utils/formatSizeToString";

const addonContent = (addon: Addon) =>
  `
Title: ${addon.title}
Creator: ${addon.creator}
Size: ${formatSizeToString(addon.size)}
Package Name: ${addon.packageName}
Package Version: ${addon.packageVersion}
Minimum Game Version: ${addon.minimumGameVersion}
Release Notes:
  - Last Update: ${addon.releaseNotes.neutral.LastUpdate}
  - Older History: ${addon.releaseNotes.neutral.OlderHistory}
Items:
${addon.items.map((item) => `  - ${item.type}: ${item.content}`).join("\n")}
`;

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

  box(addonContent(selectedAddon), selectedAddon.packageName);

  return addon;
}
