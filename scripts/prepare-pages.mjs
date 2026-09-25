import { mkdir, readFile, writeFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const html = await readFile(new URL("index.html", dist), "utf8");
const brand = "gustavonline";
const origin = "https://gustavonline.com";
const routes = [
  { path: "newsletter", title: `Newsletter | ${brand}`, description: "Notes from the work. A newsletter by Gustav Anderson." },
  { path: "newsletter/thank-you", title: `Newsletter signup | ${brand}`, description: "Your newsletter signup.", noindex: true },
  
];
for (const route of routes) {
  const dir = new URL(`${route.path}/`, dist);
  await mkdir(dir, {recursive:true});
  const url = `${origin}/${route.path}/`;
  let page = html.replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${route.description}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${route.title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${route.description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${url}$2`);
  if (!page.includes('rel="canonical"')) page = page.replace("</head>", `<link rel="canonical" href="${url}">\n</head>`);
  if (route.noindex) page = page.replace(/<meta name="robots"[^>]*>/, "")
    .replace("</head>", '<meta name="robots" content="noindex, follow">\n</head>');
  await writeFile(new URL("index.html", dir), page);
}
await writeFile(new URL(".nojekyll", dist), "");
console.log(`Prepared ${routes.length} direct routes for ${brand}.`);
