import { autocomplete, box, cancel, isCancel } from "@clack/prompts";
import type { Addon } from "./types";
import { renderAddon } from "./utils/renderAddon";

export async function viewAirports(addons: Addon[]) {
  const airports = addons.flatMap((addon) =>
    addon.items
      .filter((item) => /airport/i.test(item.type))
      .map((item) => item.content),
  );

  const airport = await autocomplete({
    message: "Select airports to view",
    options: airports.map((airport) => ({
      value: airport,
      label: airport,
    })),
    maxItems: 10,
  });

  if (isCancel(airport)) {
    cancel("No airport selected");
    return "";
  }

  const selectedAddon = addons.find((a) =>
    a.items.some((item) => item.content === airport),
  )!;

  const title = `${selectedAddon.title} - ${selectedAddon.packageName}`;
  box(renderAddon(selectedAddon), title);
}
