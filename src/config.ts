import fs from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { cancel } from "@clack/prompts";
import { toYaml } from "./utils/jsonToYaml";

const ConfigSchema = z.object({
  communityPath: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_DIR = join(homedir(), ".addon-manager");
const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");

export async function readConfig(initial?: boolean): Promise<Config | null> {
  try {
    const content = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = Bun.YAML.parse(content);
    const validated = ConfigSchema.safeParse(parsed);

    if (!validated.success) {
      if (initial) {
        cancel("Invalid config file format");
      }
      return null;
    }

    return validated.data;
  } catch (error) {
    if (
      error instanceof Error &&
      ("code" in error ? error.code === "ENOENT" : false)
    ) {
      // File doesn't exist, which is fine
      return null;
    }

    // Other errors (permission, invalid JSON, etc.)
    if (error instanceof SyntaxError) {
      cancel(`Config file contains invalid JSON: ${error.message}`);
    } else {
      cancel(`Error reading config file: ${error}`);
    }
    return null;
  }
}

export async function writeConfig(config: Config): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Write config file
    await fs.writeFile(CONFIG_FILE, toYaml(config), "utf-8");
  } catch (error) {
    cancel(`Error writing config file: ${error}`);
    // Don't throw - graceful degradation
  }
}
