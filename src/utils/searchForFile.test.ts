import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { searchForFile } from "./searchForFile";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `searchForFile-test-${Date.now()}-${Math.random()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("finds file in root directory", async () => {
  const fileName = "test.txt";
  const filePath = join(testDir, fileName);
  await writeFile(filePath, "content");

  const result = await searchForFile({
    path: testDir,
    fileName,
  });

  expect(result).toBe(filePath);
});

test("finds file in subdirectory", async () => {
  const fileName = "test.txt";
  const subDir = join(testDir, "subdir");
  await mkdir(subDir, { recursive: true });
  const filePath = join(subDir, fileName);
  await writeFile(filePath, "content");

  const result = await searchForFile({
    path: testDir,
    fileName,
  });

  expect(result).toBe(filePath);
});

test("finds file in nested subdirectory", async () => {
  const fileName = "test.txt";
  const nestedDir = join(testDir, "level1", "level2", "level3");
  await mkdir(nestedDir, { recursive: true });
  const filePath = join(nestedDir, fileName);
  await writeFile(filePath, "content");

  const result = await searchForFile({
    path: testDir,
    fileName,
  });

  expect(result).toBe(filePath);
});

test("returns null when file not found", async () => {
  const result = await searchForFile({
    path: testDir,
    fileName: "nonexistent.txt",
  });

  expect(result).toBeNull();
});

test("returns null for empty directory", async () => {
  const result = await searchForFile({
    path: testDir,
    fileName: "any.txt",
  });

  expect(result).toBeNull();
});

test("searches through multiple subdirectories", async () => {
  const fileName = "target.txt";
  const dir1 = join(testDir, "dir1");
  const dir2 = join(testDir, "dir2");
  await mkdir(dir1, { recursive: true });
  await mkdir(dir2, { recursive: true });

  const filePath = join(dir2, fileName);
  await writeFile(filePath, "content");

  const result = await searchForFile({
    path: testDir,
    fileName,
  });

  expect(result).toBe(filePath);
});

test("handles case-sensitive filename matching", async () => {
  const fileName = "Test.txt";
  const filePath = join(testDir, fileName);
  await writeFile(filePath, "content");

  const result1 = await searchForFile({
    path: testDir,
    fileName: "test.txt",
  });
  expect(result1).toBeNull();

  const result2 = await searchForFile({
    path: testDir,
    fileName,
  });
  expect(result2).toBe(filePath);
});

test("handles files with special characters in name", async () => {
  const fileName = "file-name_123.txt";
  const filePath = join(testDir, fileName);
  await writeFile(filePath, "content");

  const result = await searchForFile({
    path: testDir,
    fileName,
  });

  expect(result).toBe(filePath);
});
