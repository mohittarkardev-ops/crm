import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const tsCandidate = path.join(root, `${rel}.ts`);
    if (fs.existsSync(tsCandidate)) {
      return nextResolve(pathToFileURL(tsCandidate).href, context);
    }
    const indexCandidate = path.join(root, rel, "index.ts");
    if (fs.existsSync(indexCandidate)) {
      return nextResolve(pathToFileURL(indexCandidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}
