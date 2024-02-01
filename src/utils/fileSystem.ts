import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";

export function getParentDirectoryName(fileUrl: string): string {
  return dirname(fileURLToPath(fileUrl))
    .split("/")
    .reduceRight((acc, c, i, xs) => {
      if (i === xs.length - 1) {
        acc += c;
      }
      return acc;
    }, "");
}

export function writeOutputToFile(
  challengeDirName: string,
  fileName: string,
  content: string,
) {
  const outputDirPath = resolve("output", challengeDirName);
  mkdirSync(outputDirPath, { recursive: true });
  writeFileSync(join(outputDirPath, fileName), content);
}
