import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
let resources = 0;
async function requireFile(path) {
  if (!(await stat(path)).isFile())
    throw new Error(`Recurso não é arquivo: ${path}`);
  resources++;
}
const html = await readFile("index.html", "utf8");
for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (ref.startsWith("data:")) continue;
  if (!ref.startsWith("/")) throw new Error(`Recurso inesperado: ${ref}`);
  await requireFile(resolve(root, `.${ref}`));
}
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!file.endsWith(".js")) continue;
    const syntax = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    if (syntax.status !== 0) throw new Error(syntax.stderr);
    const source = await readFile(file, "utf8");
    for (const [, ref] of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
      if (!ref.startsWith(".")) throw new Error(`Import não local: ${ref}`);
      await requireFile(resolve(dirname(file), ref));
    }
  }
}
await walk(resolve(root, "js"));
for (const [source, target] of [
  ["dist/dexie.mjs", "dexie.mjs"],
  ["dist/dexie.mjs.map", "dexie.mjs.map"],
  ["LICENSE", "DEXIE-LICENSE"],
]) {
  const installed = await readFile(`node_modules/dexie/${source}`);
  const distributed = await readFile(`vendor/${target}`);
  if (!installed.equals(distributed))
    throw new Error(`Artefato diverge: ${target}`);
}
process.stdout.write(
  `${resources} referências estáticas locais existentes; módulos JS com sintaxe válida; vendor idêntico à instalação.\n`,
);
