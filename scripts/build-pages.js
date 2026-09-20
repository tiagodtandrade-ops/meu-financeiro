import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
const out = "site";
await mkdir(out, { recursive: true });
for (const dir of ["css", "js", "vendor"]) {
  await cp(dir, `${out}/${dir}`, { recursive: true });
}
const html = (await readFile("index.html", "utf8"))
  .replaceAll('href="/', 'href="./')
  .replaceAll('src="/', 'src="./');
await writeFile(`${out}/index.html`, html);
await writeFile(`${out}/404.html`, html.replace("<head>", '<head>\n    <base href="/meu-financeiro/" />'));
await writeFile(`${out}/.nojekyll`, "");
