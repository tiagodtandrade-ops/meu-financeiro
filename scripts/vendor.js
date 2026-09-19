import { mkdir, copyFile, readFile } from "node:fs/promises";
const pkg = JSON.parse(
  await readFile("node_modules/dexie/package.json", "utf8"),
);
if (!pkg.version.startsWith("4.")) throw new Error("Dexie 4.x obrigatório.");
await mkdir("vendor", { recursive: true });
for (const [source, destination] of [
  ["dist/dexie.mjs", "dexie.mjs"],
  ["dist/dexie.mjs.map", "dexie.mjs.map"],
  ["LICENSE", "DEXIE-LICENSE"],
]) {
  await copyFile(`node_modules/dexie/${source}`, `vendor/${destination}`);
}
process.stdout.write(
  `Dexie ${pkg.version} distribuído localmente em vendor/.\n`,
);
