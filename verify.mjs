#!/usr/bin/env node
// verify.mjs - check one published release of the Shinjuku Shield wallet.
// Usage: node verify.mjs [version] [--readme <path>]
// Needs Node.js 22 or later. It uses only built-in modules and reads public URLs.
// It does not run any downloaded file. It does not check the Sigstore signature
// of the npm provenance; `npm audit signatures` checks that.
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const PKG = "shinjuku-shield";
const OTHERS = ["shinjuku", "shinjuku-shielded"]; // the command package and the older name
const WALLET = "package/shinjuku-wallet.mjs";
const REGISTRY = "https://registry.npmjs.org";
const SITE = "https://shinjukustaition.com";
const REPO = "https://github.com/ShinjukuStaition/shinjuku-shield";
const WORKFLOW = ".github/workflows/publish.yml";
const SLSA = "https://slsa.dev/provenance/v1";

let failures = 0;
let passes = 0;
const skipped = [];
const ok = (msg) => { passes++; console.log(`OK   ${msg}`); };
const fail = (msg) => { failures++; console.log(`FAIL ${msg}`); };
const info = (msg) => console.log(`INFO ${msg}`);
const skip = (msg) => { skipped.push(msg); console.log(`SKIP ${msg}`); };
const check = (cond, okMsg, failMsg) => (cond ? ok(okMsg) : fail(failMsg));

// ---- arguments ----
const args = process.argv.slice(2);
let version = null;
let readmePath = new URL("./README.md", import.meta.url);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--readme" && args[i + 1]) readmePath = args[++i];
  else if (/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(args[i]) && !version) version = args[i];
  else usage(`unknown argument: ${args[i]}`);
}
function usage(msg) {
  console.error(`${msg}\nUsage: node verify.mjs [version] [--readme <path>]`);
  process.exit(2);
}
if (Number(process.versions.node.split(".")[0]) < 22) usage("This script needs Node.js 22 or later.");

// ---- network helpers: 30 s timeout; the website may not redirect ----
async function get(url, { site = false } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: site ? "error" : "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}
// Size limits: a JSON document up to 8 MB, a tarball up to 64 MB, an unpacked tarball up to 128 MB
// (0.3.186: a 2.3 MB tarball, 9.4 MB unpacked).
const MAX_JSON = 8 * 2 ** 20;
const MAX_TARBALL = 64 * 2 ** 20;
const MAX_UNPACKED = 128 * 2 ** 20;
async function readCapped(res, limit, url) {
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > limit) throw new Error(`${url} is larger than ${limit} bytes`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
const readJson = async (res, url) => JSON.parse((await readCapped(res, MAX_JSON, url)).toString("utf8"));
const getJson = async (url, opts) => readJson(await get(url, opts), url);
const getBytes = async (url, opts) => readCapped(await get(url, opts), MAX_TARBALL, url);
const sha = (alg, buf) => createHash(alg).update(buf).digest("hex");

// ---- a strict ustar reader: returns { "package/x": Buffer }; it throws on any record it does not expect ----
function readTar(buf) {
  const files = {};
  const seen = new Set(); // every record name (a folder without its last "/"), for duplicates
  for (let off = 0; ; ) {
    if (off + 512 > buf.length) throw new Error("tar: the archive ends without its end blocks");
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) {
      // The end: two zero blocks, and only zero padding after them.
      if (off + 1024 > buf.length || !buf.subarray(off).every((b) => b === 0)) throw new Error(`tar: the end at byte ${off} is not two zero blocks followed only by zeros`);
      return files;
    }
    const field = (a, b) => h.subarray(a, b).toString("latin1").split("\0")[0].trim();
    // The header checksum: the sum of all header bytes, with the checksum field read as spaces.
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : h[i];
    const stored = field(148, 156);
    if (!/^[0-7]{1,7}$/.test(stored) || parseInt(stored, 8) !== sum) throw new Error(`tar: bad header checksum at byte ${off}`);
    const sizeText = field(124, 136);
    if (!/^[0-7]{1,11}$/.test(sizeText)) throw new Error(`tar: bad size field at byte ${off}`);
    const size = parseInt(sizeText, 8);
    const end = off + 512 + size;
    if (!Number.isSafeInteger(size) || end > buf.length) throw new Error(`tar: a record at byte ${off} runs past the archive`);
    const prefix = field(345, 500);
    const name = (prefix ? `${prefix}/` : "") + field(0, 100);
    const type = h[156] === 0 ? "0" : String.fromCharCode(h[156]);
    if (type !== "0" && type !== "5") throw new Error(`tar: unsupported record type ${JSON.stringify(type)} at byte ${off}`);
    const key = type === "5" ? name.replace(/\/$/, "") : name;
    const parts = key.split("/");
    if (parts[0] !== "package" || parts.length < 2 || parts.some((s) => s === "" || s === "." || s === "..") || key.includes("\\")
      || seen.has(key)) throw new Error(`tar: unexpected record name ${JSON.stringify(name)} at byte ${off}`);
    seen.add(key);
    if (type === "0") files[key] = buf.subarray(off + 512, end);
    off += 512 + Math.ceil(size / 512) * 512;
  }
}

// Find the Releases table row the same way publish.yml does: split on "|",
// the third field holds `sha8`, the fourth the sha256, the fifth the bytes.
function readmeRows(text, sha8) {
  return text.split("\n").filter((l) => l.startsWith("|")).map((l) => l.split("|"))
    .filter((f) => (f[2] ?? "").includes(`\`${sha8}\``))
    .map((f) => ({ sha256: (f[3].match(/[0-9a-f]{64}/) || [""])[0], bytes: Number(f[4].replace(/[^0-9]/g, "")) }));
}

// Every package.json field that makes npm install something besides `dependencies` (optional, peer, bundled, dev and
// any other *dependencies* field, and overrides). None of our packages may have one.
const extraDependencyFields = (pkg) => Object.keys(pkg).filter((k) => (/dependenc/i.test(k) && k !== "dependencies") || k === "overrides");

async function step(name, fn) {
  try { await fn(); } catch (e) { fail(`${name}: ${e.message}`); }
}

/**
 * One npm package at this version: its registry document, its tarball (checked against the registry sha512) and its
 * npm provenance (the SLSA statement's subject must be this exact tarball, built by this repository's publish.yml).
 * Returns { meta, files } (files: the tarball's files), or null when npm has no such package version.
 */
async function npmPackage(name) {
  const res = await fetch(`${REGISTRY}/${name}/${version}`, { signal: AbortSignal.timeout(30_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for the registry document`);
  const meta = await readJson(res, `the ${name}@${version} registry document`);
  const tgz = await getBytes(meta.dist.tarball);
  const [alg, b64] = String(meta.dist.integrity).split("-");
  // Nothing is unpacked or read from a tarball that does not match its registry sha512.
  if (alg !== "sha512" || createHash("sha512").update(tgz).digest("base64") !== b64) {
    throw new Error("the tarball does not match dist.integrity; nothing in it was read");
  }
  ok(`${name}@${version}: tarball matches its registry sha512 (${tgz.length} bytes)`);

  const att = await getJson(`${REGISTRY}/-/npm/v1/attestations/${name}@${version}`);
  const slsa = att.attestations?.find((a) => a.predicateType === SLSA);
  if (!slsa) fail(`${name}@${version}: no SLSA provenance attestation on npm`);
  else {
    const st = JSON.parse(Buffer.from(slsa.bundle.dsseEnvelope.payload, "base64").toString("utf8"));
    const subject = st.subject?.[0] ?? {};
    const wf = st.predicate?.buildDefinition?.externalParameters?.workflow ?? {};
    const commit = st.predicate?.buildDefinition?.resolvedDependencies?.[0]?.digest?.gitCommit;
    check(subject.name === `pkg:npm/${name}@${version}` && subject.digest?.sha512 === sha("sha512", tgz)
      && wf.repository === REPO && wf.path === WORKFLOW,
      `${name}@${version}: provenance names this tarball, built by ${wf.repository} ${wf.path} (${wf.ref}) at commit ${commit}`,
      `${name}@${version}: provenance names ${subject.name} (sha512 ${String(subject.digest?.sha512).slice(0, 16)}...) built by `
        + `${wf.repository} ${wf.path}; expected pkg:npm/${name}@${version} (sha512 ${sha("sha512", tgz).slice(0, 16)}...) built by ${REPO} ${WORKFLOW}`);
  }
  return { meta, files: readTar(gunzipSync(tgz, { maxOutputLength: MAX_UNPACKED })) };
}

// ---- 1. the wallet package: registry, tarball, provenance, the wallet file ----
let wallet, walletSha, sha8;
try {
  if (!version) {
    version = (await getJson(`${REGISTRY}/${PKG}/latest`)).version;
    info(`npm "latest" of ${PKG} is ${version}`);
  }
  console.log(`Checking ${PKG}@${version}`);
  const main = await npmPackage(PKG);
  if (!main) throw new Error(`npm has no ${PKG}@${version}`);
  wallet = main.files[WALLET];
  const pkgJson = JSON.parse(main.files["package/package.json"]?.toString("utf8") ?? "null");
  if (!wallet || !pkgJson) throw new Error(`the tarball has no ${WALLET} or package/package.json`);
  const extra = extraDependencyFields(pkgJson);
  check(extra.length === 0 && !pkgJson.dependencies, `${PKG}@${version}: its package.json installs no other package`,
    `${PKG}@${version}: its package.json has ${[...(pkgJson.dependencies ? ["dependencies"] : []), ...extra].join(", ")}`);
  walletSha = sha("sha256", wallet);
  sha8 = walletSha.slice(0, 8);
  info(`wallet file sha256 ${walletSha}, ${wallet.length} bytes`);
  check(walletSha === pkgJson.shinjukuSha256, "wallet sha256 equals shinjukuSha256 in the tarball's package.json",
    `wallet sha256 differs from shinjukuSha256 ${pkgJson.shinjukuSha256}`);
  check(sha8 === pkgJson.shinjukuRelease, `wallet release is ${sha8} (shinjukuRelease)`,
    `wallet sha256 starts with ${sha8}, but shinjukuRelease is ${pkgJson.shinjukuRelease}`);
  info("This script does not check the Sigstore signature of the provenance.");
  info(`To check it, run "npm audit signatures" in a folder where ${PKG}@${version} is installed.`);
} catch (e) {
  fail(`${PKG}: ${e.message}`);
  console.log("Stopped: the other checks need the wallet file.");
  process.exit(1);
}

// ---- 2. the Releases table in README.md ----
await step("README", async () => {
  const rows = readmeRows(readFileSync(readmePath, "utf8"), sha8);
  if (rows.length === 0) return fail(`README has no row for ${sha8}: update your copy of the repo (git pull)`);
  if (rows.length > 1) return fail(`README has ${rows.length} rows for ${sha8}, expected 1`);
  check(rows[0].sha256 === walletSha && rows[0].bytes === wallet.length,
    `README Releases row ${sha8} has the same sha256 and bytes`,
    `README Releases row ${sha8} differs: sha256 ${rows[0].sha256}, bytes ${rows[0].bytes}`);
});

// ---- 3. the website ----
await step("website", async () => {
  const m = await getJson(`${SITE}/wallet/${sha8}/manifest.json`, { site: true });
  check(m.sha256 === walletSha && Number(m.bytes) === wallet.length,
    `website manifest for ${sha8} has the same sha256 and bytes (source commit ${m.sourceCommit})`,
    `website manifest differs: sha256 ${m.sha256}, bytes ${m.bytes}`);
});
await step("website release", async () => {
  const r = await getJson(`${SITE}/api/wallet/release`, { site: true });
  info(r?.wallet?.sha256 === walletSha
    ? `${sha8} is the current stable release on the website`
    : `${sha8} is not the current stable release on the website (that is ${String(r?.wallet?.sha256).slice(0, 8)})`);
});

// ---- 4. the other packages at this version: each tarball and its provenance, then what it holds ----
// A package with dependencies is a small pointer: its own package.json (in the tarball) must name only
// shinjuku-shield at this exact version, and it must hold no wallet file. A package without dependencies is an
// older full copy: its wallet file must have the same sha256.
for (const name of OTHERS) {
  await step(name, async () => {
    const pkg = await npmPackage(name);
    if (!pkg) return skip(`${name}@${version} is not on npm`);
    const own = JSON.parse(pkg.files["package/package.json"]?.toString("utf8") ?? "null");
    if (!own) return fail(`${name}@${version}: the tarball has no package/package.json`);
    const extra = extraDependencyFields(own);
    if (extra.length > 0) return fail(`${name}@${version}: its package.json has ${extra.join(", ")}`);
    if (own.dependencies) {
      const deps = JSON.stringify(own.dependencies);
      check(deps === JSON.stringify({ [PKG]: version }) && !pkg.files[WALLET],
        `${name}@${version}: a pointer package; it depends only on ${PKG}@${version} and holds no wallet file`,
        `${name}@${version}: dependencies ${deps}${pkg.files[WALLET] ? " and a wallet file of its own" : ""}`);
    } else {
      const copy = pkg.files[WALLET];
      check(Boolean(copy) && sha("sha256", copy) === walletSha,
        `${name}@${version}: a full copy; its wallet file has the same sha256`,
        `${name}@${version}: no dependencies and ${copy ? `a wallet file with sha256 ${sha("sha256", copy)}` : "no wallet file"}`);
    }
  });
}

if (failures > 0) console.log(`${failures} check(s) failed, ${passes} passed${skipped.length ? `, ${skipped.length} skipped` : ""}.`);
else if (skipped.length > 0) console.log(`No check failed: ${passes} passed, ${skipped.length} skipped (see SKIP above).`);
else console.log(`All ${passes} checks passed.`);
process.exit(failures === 0 ? 0 : 1);
