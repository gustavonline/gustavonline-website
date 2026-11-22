import { mkdir, readFile, writeFile } from "node:fs/promises";

const dist = new URL("../dist/", import.meta.url);
const source = await readFile(new URL("index.html", dist), "utf8");
const origin = "https://gustavonline.com";
const socialPreview = `${origin}/assets/social-preview.png`;
const pages = [
  {
    path: "",
    title: "gustavonline | Gustav Anderson",
    description: "I help you organize your data and context so AI can do useful work. Projects, notes and experiments by Gustav Anderson.",
    body: `<section><h1>Gustav Anderson</h1><p>Founder</p><h2>See what I’m building. Take what’s useful.</h2><p>I work with data, AI and software and share what I learn along the way.</p><h2>Current work</h2><ul><li><a href="https://onlinesourdough.com/">onlinesourdough</a> — my online menu for building tools and workflows with AI in your business.</li><li><a href="https://arcitai.com/">Arc’IT AI</a> — data and AI solutions built around your team.</li><li><a href="/newsletter/">Newsletter</a> — ideas and lessons from my projects.</li></ul><h2>Find me</h2><ul><li><a href="https://www.youtube.com/@gustavonline">YouTube</a></li><li><a href="https://www.linkedin.com/in/gustavandersonn/">LinkedIn</a></li><li><a href="https://x.com/_gustavonline">X</a></li><li><a href="https://github.com/gustavonline">GitHub</a></li></ul></section>`,
  },
  {
    path: "newsletter",
    title: "Newsletter | gustavonline",
    description: "Notes and ideas from putting data, AI and software to work. By Gustav Anderson.",
    body: `<section><h1>Notes from the work</h1><p>A newsletter by Gustav Anderson. Get ideas and lessons from my projects with data, AI and software. Take what fits the work you’re doing.</p><p><a href="/">Back to Gustav Anderson’s work</a></p><p>Explore <a href="https://onlinesourdough.com/">onlinesourdough</a> and <a href="https://arcitai.com/">Arc’IT AI</a>.</p></section>`,
  },
  {
    path: "newsletter/thank-you",
    title: "Newsletter signup | gustavonline",
    description: "Your newsletter signup with Gustav Anderson.",
    noindex: true,
    body: `<section><h1>Notes from the work</h1><p>Your newsletter signup is ready. Return to <a href="/">gustavonline</a> or visit <a href="/newsletter/">the newsletter page</a>.</p></section>`,
  },
];

for (const page of pages) {
  const url = `${origin}/${page.path ? `${page.path}/` : ""}`;
  const html = withPage(source, page, url);
  if (page.path) {
    const directory = new URL(`${page.path}/`, dist);
    await mkdir(directory, { recursive: true });
    await writeFile(new URL("index.html", directory), html);
  } else {
    await writeFile(new URL("index.html", dist), html);
  }
}

await writeFile(new URL(".nojekyll", dist), "");
console.log(`Prepared ${pages.length} direct routes for gustavonline.`);

function withPage(html, page, url) {
  let result = html
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<main id="seo-prerender"[^>]*>[\s\S]*?<\/main>/, `<main id="seo-prerender" aria-label="Site content">${page.body}</main>`);

  result = replaceMeta(result, "name", "description", page.description);
  result = replaceMeta(result, "property", "og:title", page.title);
  result = replaceMeta(result, "property", "og:description", page.description);
  result = replaceMeta(result, "property", "og:url", url);
  result = replaceMeta(result, "name", "twitter:title", page.title);
  result = replaceMeta(result, "name", "twitter:description", page.description);
  result = replaceMeta(result, "property", "og:image", socialPreview);
  result = replaceMeta(result, "name", "twitter:image", socialPreview);
  result = result.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeAttribute(url)}" />`);
  result = result.replace(/\s*<meta name="robots"[^>]*>/, "");
  if (page.noindex) result = result.replace("</head>", '<meta name="robots" content="noindex, follow">\n</head>');
  result = result.replace(/<script id="seo-jsonld"[\s\S]*?<\/script>/, "");
  return result.replace("</head>", `<script id="seo-jsonld" type="application/ld+json">${jsonLd(url, page)}</script>\n</head>`);
}

function replaceMeta(html, attribute, name, content) {
  const escaped = escapeRegExp(name);
  const pattern = new RegExp(`<meta\\s+${attribute}="${escaped}"[^>]*>`, "i");
  const tag = `<meta ${attribute}="${name}" content="${escapeAttribute(content)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `${tag}\n</head>`);
}

function jsonLd(url, page) {
  const personId = `${origin}/#person`;
  const onlinesourdoughId = "https://onlinesourdough.com/#organization";
  const arcitId = "https://arcitai.com/#organization";
  const graph = [
    {
      "@type": "Person", "@id": personId, name: "Gustav Anderson",
      alternateName: ["gustavonline", "Gustav Online"], url: `${origin}/`,
      email: "hello@gustavonline.com", jobTitle: "Founder",
      sameAs: ["https://www.youtube.com/@gustavonline", "https://www.linkedin.com/in/gustavandersonn/", "https://x.com/_gustavonline", "https://github.com/gustavonline", "https://onlinesourdough.com/", "https://arcitai.com/"],
      worksFor: [{ "@id": onlinesourdoughId }, { "@id": arcitId }],
    },
    {
      "@type": "Organization", "@id": onlinesourdoughId, name: "onlinesourdough",
      url: "https://onlinesourdough.com/", founder: { "@id": personId }, sameAs: ["https://github.com/onlinesourdough"],
    },
    {
      "@type": "Organization", "@id": arcitId, name: "Arc’IT AI",
      url: "https://arcitai.com/", founder: { "@id": personId }, sameAs: ["https://github.com/arcitai"],
    },
    { "@type": "WebSite", "@id": `${origin}/#website`, name: "gustavonline", url: `${origin}/`, publisher: { "@id": personId } },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: page.title, description: page.description, isPartOf: { "@id": `${origin}/#website` }, about: { "@id": personId } },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c");
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
