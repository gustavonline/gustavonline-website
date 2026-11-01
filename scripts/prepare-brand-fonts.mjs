// Switzer permits own-site self-hosting, but not public font redistribution.
// Fetch the unmodified official file into the ignored runtime asset directory.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const target = new URL("../public/assets/fonts/switzer-variable.woff2", import.meta.url);
const source = "https://cdn.fontshare.com/wf/HJHZ26OECMTXRH7JXPFC7EVIHDSLT2RA/LJRNLR7WCPF3PY3SZ7B2LHNUTQMFNCHL/4MCJYGQDIOOXHWSIIB2OYNDBEALJSOGN.woff2";
const expected = "d1bf801ffb1a6096def70a7c532255722ad87d948b13a8a586e342f7091f8ee4";
const checksum = (bytes) => createHash("sha256").update(bytes).digest("hex");
let bytes;
try {
  bytes = await readFile(target);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (bytes && checksum(bytes) !== expected) throw new Error("Unexpected cached Switzer file.");
if (!bytes) {
  const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Switzer download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
  if (checksum(bytes) !== expected) throw new Error("Unexpected Switzer download; review the upstream file before changing the pin.");
  await mkdir(new URL("../public/assets/fonts/", import.meta.url), { recursive: true });
  await writeFile(target, bytes);
}
console.log("Verified own-site Switzer font.");
