#!/usr/bin/env node
// Starts the Shinjuku wallet's MCP server for Hermes.
//
// mcp.json passes one argument, the exact wallet version (X.Y.Z): the launcher reads the version only from there. The
// README and the skill name the same version (0.3.218) in their setup lines; a pin moves all three together.
//
// The wallet must already be on this computer, put there by its setup: `npm install -g shinjuku@0.3.218` then
// `shinjuku setup` (the README form; on Windows `npm.cmd` and `shinjuku.cmd`, because Windows PowerShell refuses npm's
// own command files by default), or `npx -y shinjuku@0.3.218 setup`. That npm download goes straight to npm's
// registry, before setup asks whether to use Tor (docs/mcp/TOR.md, "What setup does with Tor"). This launcher never
// downloads anything and never runs npm or npx: it finds that exact installed copy of the wallet package
// (shinjuku-shield, also the dependency of the shinjuku package) and starts its own command file with this Node.
// The wallet then does its own networking, over Tor when the user chose Tor in setup.
//
// Where it looks, in order: npm's global folder (npm install -g), then npx's cache (<cache>/_npx/*/node_modules).
// The default folders come first; `npm root -g` and `npm config get cache` (local reads, no network) run only when
// the defaults have no copy, for a user whose npm config moved them.
//
// When no copy of that version is found (setup was not run on this computer), the launcher answers as a small MCP
// server with one tool and server instructions that give the user the setup lines. It pays and reads nothing.
//
// The wallet child gets stdin through a pipe from this process, never the launcher's own stdin handle: when Hermes
// closes the connection or ends this launcher (even a hard kill on Windows), the pipe closes, the wallet's MCP
// server sees the end of its input and stops. No cmd.exe or npm layer sits between them.
//
// The working folder is never the plugin folder. Hermes starts a plugin's server in its plugin folder when mcp.json
// names no cwd (hermes_cli/agent_plugins.py _translate_stdio), and on Windows a folder that a running process uses as
// its working folder cannot be moved or deleted: `hermes plugins update shinjuku` then failed with WinError 32 while the
// wallet ran. mcp.json gives cwd ${PLUGIN_DATA}; this launcher also moves itself (and so the wallet it starts) to
// PLUGIN_DATA, else the user's home folder, for a host or an older mcp.json that starts it in the plugin folder.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const version = process.argv[2] ?? "";
if (!VERSION.test(version)) {
  process.stderr.write(`shinjuku plugin: mcp.json must pass the wallet version as X.Y.Z (got "${version}")\n`);
  process.exit(2);
}
const WALLET_PACKAGE = "shinjuku-shield";
const COMMAND_PACKAGE = "shinjuku";
const WINDOWS = process.platform === "win32";
// The lines the user types, for this computer. On Windows they name the .cmd files (npm.cmd, npx.cmd, shinjuku.cmd):
// Windows PowerShell refuses npm's other command files by default, and the .cmd forms work in PowerShell and in
// Command Prompt alike.
const NPM_WORD = WINDOWS ? "npm.cmd" : "npm";
const NPX_WORD = WINDOWS ? "npx.cmd" : "npx";
const SHINJUKU_WORD = WINDOWS ? "shinjuku.cmd" : "shinjuku";
const WHERE_TO_TYPE = WINDOWS ? "in PowerShell or Command Prompt (Windows)" : "in a terminal (Linux)";
const INSTALL_LINE = `${NPM_WORD} install -g --no-audit --no-fund ${COMMAND_PACKAGE}@${version}`;
const SETUP_LINE = `${SHINJUKU_WORD} setup`;
const NPX_SETUP_LINE = `${NPX_WORD} -y ${COMMAND_PACKAGE}@${version} setup`;

// A variable that reached us as its own unexpanded placeholder (an optional variable the user did not set) is absent.
// The wallet reads this exact value to word its update texts for a plugin install ("hermes plugins update shinjuku").
const env = { ...process.env, SHINJUKU_WALLET_LAUNCHER: "hermes-plugin" };
for (const [key, value] of Object.entries(env)) if (/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(value ?? "")) delete env[key];

// Out of the plugin folder (see above), before anything else runs. A failed move keeps the folder Hermes gave.
for (const folder of [env.PLUGIN_DATA, homedir()]) {
  try {
    if (folder && existsSync(folder)) { process.chdir(folder); break; }
  } catch { /* the next one */ }
}

/** The wallet's command file in a shinjuku-shield folder when its package.json is exactly this version, else undefined. */
function walletAt(folder) {
  try {
    const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
    if (manifest.name !== WALLET_PACKAGE || manifest.version !== version) return undefined;
    const bin = typeof manifest.bin === "object" && manifest.bin ? manifest.bin["shinjuku-wallet"] : undefined;
    const file = join(folder, typeof bin === "string" ? bin : "shinjuku-wallet.mjs");
    return existsSync(file) ? file : undefined;
  } catch {
    return undefined;
  }
}

/** In npm's global node_modules: shinjuku (with shinjuku-shield inside it) or shinjuku-shield installed by itself. */
function inGlobalRoot(root) {
  if (!root) return undefined;
  return walletAt(join(root, COMMAND_PACKAGE, "node_modules", WALLET_PACKAGE)) ?? walletAt(join(root, WALLET_PACKAGE));
}

/** In npx's cache: any <cache>/_npx/<hash>/node_modules/shinjuku-shield of this version (from shinjuku@ or shinjuku-shield@). */
function inNpxCache(cache) {
  if (!cache) return undefined;
  let entries;
  try { entries = readdirSync(join(cache, "_npx")); } catch { return undefined; }
  for (const entry of entries) {
    const found = walletAt(join(cache, "_npx", entry, "node_modules", WALLET_PACKAGE));
    if (found) return found;
  }
  return undefined;
}

/** npm's global node_modules from the prefix npm would use with no config file (Windows: <prefix>\node_modules). */
function defaultGlobalRoot() {
  const prefix = env.npm_config_prefix || env.NPM_CONFIG_PREFIX;
  if (WINDOWS) return join(prefix || join(env.APPDATA || join(homedir(), "AppData", "Roaming"), "npm"), "node_modules");
  return join(prefix || "/usr/local", "lib", "node_modules");
}

function defaultNpmCache() {
  const configured = env.npm_config_cache || env.NPM_CONFIG_CACHE;
  if (configured) return configured;
  if (WINDOWS) return join(env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "npm-cache");
  return join(homedir(), ".npm");
}

/** One npm setting read from npm itself (local config files, no network); undefined when npm does not answer. */
function npmSays(...words) {
  const run = WINDOWS
    ? spawnSync(env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm", ...words], { env, encoding: "utf8", windowsHide: true, timeout: 15_000 })
    : spawnSync("npm", words, { env, encoding: "utf8", timeout: 15_000 });
  const answer = run.status === 0 ? run.stdout.trim() : "";
  // npm masks any part of its output that looks like a secret with *** (a path segment like a long id), which
  // leaves no real folder: treat that answer as none.
  return answer && !answer.includes("***") ? answer : undefined;
}

function findWallet() {
  return inGlobalRoot(defaultGlobalRoot()) ?? inNpxCache(defaultNpmCache())
    ?? inGlobalRoot(npmSays("root", "-g")) ?? inNpxCache(npmSays("config", "get", "cache"));
}

function startWallet(walletFile) {
  const child = spawn(process.execPath, [walletFile, "mcp"], { stdio: ["pipe", "inherit", "inherit"], env, cwd: process.cwd(), windowsHide: true });
  process.stdin.pipe(child.stdin);
  child.stdin.on("error", () => {}); // the wallet ended first; its exit below ends this launcher
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => {
    process.stderr.write(`shinjuku plugin: could not start the wallet (${error.message})\n`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

const MAC = process.platform === "darwin";
const NOT_READY = MAC
  ? "The Shinjuku private wallet does not run on a Mac yet: its proof programs run on Windows and Linux only. Nothing was paid or read. "
    + "Tell the user: Shinjuku works in Hermes on Windows or Linux."
  : "The Shinjuku private wallet is not set up on this computer yet, so it cannot pay or read anything yet. Nothing was paid. "
    + `Tell the user to do this once, ${WHERE_TO_TYPE}, and to type the lines exactly as they are here:\n`
    + `1. Install the wallet:\n   ${INSTALL_LINE}\n`
    + `2. Set it up:\n   ${SETUP_LINE}\n`
    + "   Setup asks whether to use Tor (yes is the default: then the sites and services the wallet reaches do not see "
    + "your IP address), creates your private wallet and asks you to save its backup. The install in step 1 goes "
    + "directly to npm, before that question.\n"
    + `   (One line instead of steps 1 and 2: ${NPX_SETUP_LINE})\n`
    + "3. Back in Hermes, type /reload-mcp (in the Hermes desktop app: press Ctrl+K, choose Restart gateway, then Restart all; your other Hermes bots reconnect too), then ask again.";

/** MCP revisions this small server answers in; a client asking for another gets the newest one listed here. */
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

/** A minimal MCP server (JSON-RPC, one message per line) that only says how to set up. */
function serveSetupNeeded() {
  const tool = {
    name: "setup_wallet_first",
    title: "Set up the Shinjuku wallet first",
    description: `Use this for any wallet, payment, balance or private page request: the Shinjuku wallet is not set up on this computer yet. It answers what to tell the user (install with ${INSTALL_LINE}, then ${SETUP_LINE}). It pays and reads nothing.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  };
  const send = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    if (!line.trim()) return;
    let request;
    try { request = JSON.parse(line); } catch {
      send({ id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }
    if (!request || typeof request !== "object" || Array.isArray(request) || typeof request.method !== "string") {
      send({ id: request?.id ?? null, error: { code: -32600, message: "Invalid Request" } });
      return;
    }
    if (request.id === undefined || request.id === null) return; // a notification
    const { id, method, params } = request;
    if (method === "initialize") {
      const asked = params?.protocolVersion;
      send({ id, result: {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "shinjuku", title: "Shinjuku private wallet (not set up yet)", version },
        instructions: NOT_READY,
      } });
    } else if (method === "tools/list") {
      send({ id, result: { tools: [tool] } });
    } else if (method === "tools/call") {
      send({ id, result: { content: [{ type: "text", text: NOT_READY }], isError: params?.name !== tool.name } });
    } else if (method === "ping") {
      send({ id, result: {} });
    } else {
      send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  });
  lines.on("close", () => process.exit(0));
}

const walletFile = MAC ? undefined : findWallet();
if (walletFile) startWallet(walletFile);
else serveSetupNeeded();
