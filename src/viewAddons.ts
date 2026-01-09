import { autocomplete } from "@clack/prompts";
import type { Addon } from "./types";

export async function viewAddons(addons: Addon[]) {
  const addon = await autocomplete({
    message: "Select addons to view",
    options: addons.map((addon) => ({
      value: addon.packageName,
      label: addon.title,
    })),
    maxItems: 10,
  });

  return addon;
}
