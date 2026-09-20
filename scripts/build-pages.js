import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
const out = "site";
const revision = process.env.GITHUB_SHA || "local";
await mkdir(out, { recursive: true });
for (const dir of ["css", "js", "vendor"]) {
  await cp(dir, `${out}/${dir}`, { recursive: true });
}
const app = await readFile(`${out}/js/app.js`, "utf8");
await writeFile(
  `${out}/js/app.js`,
  app.replace('from "./router.js"', `from "./router.js?rev=${revision}"`),
);
const html = (await readFile("index.html", "utf8"))
  .replaceAll('href="/', 'href="./')
  .replaceAll('src="/', 'src="./')
  .replace('src="./js/app.js"', `src="./js/app.js?rev=${revision}"`);
await writeFile(`${out}/index.html`, html);
await writeFile(`${out}/404.html`, html.replace("<head>", '<head>\n    <base href="/meu-financeiro/" />'));
await writeFile(`${out}/.nojekyll`, "");
