import { cancel, isCancel, text } from "@clack/prompts";
import fs from "node:fs/promises";
import { writeConfig } from "./config";

export async function updateCommunityPath(
  defaultValue?: string
): Promise<string> {
  const defaultPlaceholder = `Currently set to: ${defaultValue}`;
  const communityPath = await text({
    message: "Enter the path to your community directory",
    placeholder: defaultValue
      ? defaultPlaceholder
      : "C:/Users/YourUsername/Documents/My Community",
    validate: (value) => {
      const input = String(value ?? "").trim();

      if (!input) return "Community path is required";

      return undefined;
    },
  });

  if (isCancel(communityPath)) {
    cancel("Community path update cancelled. Existing value will be kept.");
    return defaultValue ?? "";
  }

  try {
    const stats = await fs.stat(communityPath);

    if (!stats.isDirectory()) {
      return "Path must be an existing directory";
    }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return "Directory does not exist";
    }

    return "Unable to access directory";
  }

  // Save to config after successful input
  await writeConfig({ communityPath: String(communityPath) });

  return String(communityPath);
}
