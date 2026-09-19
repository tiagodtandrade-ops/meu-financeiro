import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
const roots = ["js", "scripts", "tests"];
const problems = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p);
    else if (extname(p) === ".js") {
      const s = await readFile(p, "utf8");
      if (/console\.log\s*\(/.test(s))
        problems.push(`${p}: console.log não permitido`);
      if (/\.innerHTML\s*=/.test(s))
        problems.push(`${p}: atribuição a innerHTML não permitida`);
    }
  }
}
for (const root of roots) await walk(root);
if (problems.length) {
  process.stderr.write(problems.join("\n") + "\n");
  process.exit(1);
}
process.stdout.write("Lint de invariantes: OK\n");
