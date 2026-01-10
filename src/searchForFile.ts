import fs from "node:fs/promises";

interface SearchForFileOpts {
  path: string;
  fileName: string;
}

// Queue-based search for a file within each subdirectory
export async function searchForFile({
  path,
  fileName,
}: SearchForFileOpts): Promise<string | null> {
  const queue: string[] = [path];

  while (queue.length > 0) {
    const currentPath = queue.pop();
    if (!currentPath) continue;

    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = `${currentPath}/${entry.name}`;
      if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }

      if (entry.isDirectory()) {
        queue.push(fullPath);
      }
    }
  }

  return null;
}
