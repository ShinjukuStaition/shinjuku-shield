#!/usr/bin/env node
// Starts the Shinjuku wallet's MCP server for Hermes: the user's installed `shinjuku` package (the one its `shinjuku`
// command runs), as `shinjuku mcp`.
//
// No wallet version is named here, and the plugin never installs or updates the wallet. The user installs the wallet
// once in a terminal (Linux `npm install -g shinjuku`, then `shinjuku setup`; Windows `npm.cmd install -g shinjuku`, then
// `shinjuku.cmd setup`); the wallet's own update notice names its update step, the same install line.
//
// Where it looks: only npm's own global folders (prefixes). When the user set a prefix (npm_config_prefix, else the
// `prefix=` line of the user's npm settings file: ~/.npmrc or the file npm_config_userconfig names), only that one.
// Else, in this order: on Windows `%APPDATA%\npm` (the prefix of the Node.js installer's npm), then the prefix of the
// Node that runs this launcher (its own folder); on Linux and macOS the prefix of that Node (the folder above its bin),
// then `~/.local` (where the wallet's setup installs when npm's global folder is not writable), then /usr/local.
// No PATH folder is searched: a shared folder on PATH never supplies the wallet. Each prefix, the
// package folder and its entry file must be absolute real paths outside the plugin's own folders, and the entry must
// lie inside the package folder. The first prefix that holds the shinjuku package wins. It starts that package's own
// entry file with the Node that runs this launcher, with no shell and no npm command file, so no other `node` runs. It
// only reads folders, the npm settings file and package.json files: no npm run, no download, no network. When no installed package
// is found, it answers as a small MCP server with one read-only tool, setup_wallet_first, whose answer is the install
// step for the user.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const PLUGIN_VERSION = "0.2.1";
const WINDOWS = process.platform === "win32";
const MAC = process.platform === "darwin";
// The words the user types, for this computer: on Windows the .cmd forms (Windows PowerShell refuses npm's other
// command files by default, and the .cmd forms work in PowerShell and in Command Prompt alike).
const COMMAND = WINDOWS ? "shinjuku.cmd" : "shinjuku";
const NPM_WORD = WINDOWS ? "npm.cmd" : "npm";
const WHERE_TO_TYPE = WINDOWS ? "in PowerShell or Command Prompt" : "in a terminal";
const INSTALL_LINE = `${NPM_WORD} install -g shinjuku`;
const SETUP_LINE = `${COMMAND} setup`;
const RELOAD = "Back in Hermes, type /reload-mcp (in the Hermes desktop app: press Ctrl+K, choose Restart gateway; if Hermes then asks to restart the shared gateway, choose Restart all, which also "
  + "reconnects the other bots that share that gateway), then ask again.";

// A variable that reached us as its own unexpanded placeholder (an optional variable the user did not set) is absent.
// The wallet reads this exact value for its Hermes ways: the call wait Hermes keeps, and an update step that is the
// user's own install line.
const env = { ...process.env, SHINJUKU_WALLET_LAUNCHER: "hermes-plugin" };
for (const [key, value] of Object.entries(env)) if (/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(value ?? "")) delete env[key];
// What the wallet gets: no Node or OpenSSL execution override from Hermes's environment
// (NODE_OPTIONS can load code with --import or --require before the wallet runs; OPENSSL_CONF can load an engine;
// NODE_EXTRA_CA_CERTS and NODE_TLS_REJECT_UNAUTHORIZED change whom TLS trusts), and no npm setting except the two npm
// folders, which say where, never what (the wallet names its command folder from npm_config_prefix).
const EXECUTION_OVERRIDE = /^(?:NODE_.*|OPENSSL_CONF|OPENSSL_ENGINES|OPENSSL_MODULES|SSL_CERT_FILE|SSL_CERT_DIR|UV_THREADPOOL_SIZE)$/iu;
const NPM_FOLDERS = new Set(["npm_config_prefix", "npm_config_cache"]);
const walletEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !EXECUTION_OVERRIDE.test(key)
  && (!/^npm_config_/iu.test(key) || NPM_FOLDERS.has(key.toLowerCase()))));

/**
 * One environment value by name, as npm and Windows read it: case-insensitive on Windows (process.env is), and
 * undefined for an unexpanded placeholder of its own (an optional variable the user did not set) or an empty value.
 */
const envGet = (name) => {
  const value = process.env[name];
  return typeof value === "string" && value !== "" && !/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(value) ? value : undefined;
};

// Out of the plugin folder before anything else runs (Hermes starts the server there). A failed move keeps the folder.
for (const folder of [envGet("PLUGIN_DATA"), homedir()]) {
  try {
    if (folder && existsSync(folder)) { process.chdir(folder); break; }
  } catch { /* the next one */ }
}

const isFile = (path) => { try { return statSync(path).isFile(); } catch { return false; } };
/** The real path of an existing file or folder, or undefined. */
const real = (path) => { try { return realpathSync(path); } catch { return undefined; } };
/** True when `inner` is `outer` or lies inside it (the first part of the relative path is not exactly ".."). */
const inside = (outer, inner) => {
  const rel = relative(outer, inner);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};
/**
 * A full path: on Windows a drive letter and a slash (C:\x, C:/x) or a \\server\share path, never \x or /x (those
 * depend on the current drive); elsewhere a path that starts at /.
 */
const fullPath = (path) => typeof path === "string" && (WINDOWS ? /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/])/u.test(path) : isAbsolute(path));
/** The real paths of Hermes's folders of this plugin (PLUGIN_ROOT, PLUGIN_DATA). */
const pluginFolders = [envGet("PLUGIN_ROOT"), envGet("PLUGIN_DATA")].filter((folder) => fullPath(folder)).map((folder) => real(folder) ?? resolve(folder));
const inPluginFolder = (path) => pluginFolders.some((base) => inside(base, path));

/**
 * An ini value as the ini package's unsafe() reads it (npm reads .npmrc with it): a value in double or single quotes
 * loses them and a double-quoted one is then read as JSON when it parses; an unquoted value ends at the first ; or #,
 * a backslash keeps the next character when it is \, ; or # and stays itself before any other one, and the value is
 * trimmed.
 */
function iniValue(text) {
  let val = String(text ?? "").trim();
  if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
    if (val.startsWith("'")) val = val.slice(1, -1);
    try { val = JSON.parse(val); } catch { /* kept as it is */ }
    return val; // as decode keeps it: a JSON list, number or object stays one (the caller takes only a string)
  }
  let escaped = false;
  let out = "";
  for (const c of val) {
    if (escaped) { out += "\\;#".includes(c) ? c : `\\${c}`; escaped = false; }
    else if (";#".includes(c)) break;
    else if (c === "\\") escaped = true;
    else out += c;
  }
  if (escaped) out += "\\";
  return out.trim();
}

/**
 * The top-level `prefix` of an .npmrc text, or undefined. The rule is safe, not complete: it names a folder only when
 * npm's ini decode() reads the same text as that folder, and gives none for any file shape that could make npm's
 * prefix something else. So it gives none for a file with a [section] line whose name holds a dot, __proto__ or
 * prefix (decode nests a dotted section and can change or stop on the top level), with a key that holds __proto__, or with
 * a key that starts with prefix and goes on (prefix[], prefix.x, a dotted or list form), or with any value that decode
 * keeps as null, a list or an object (decode then expands dotted keys and can stop on the file); and none when the
 * last prefix value is not text or is true or false. Otherwise it reads the file as decode does: lines split on line breaks;
 * empty, blank and comment lines (; or # after spaces) skipped; each line matched as it is against decode's own
 * pattern; the last prefix line wins; a key or value decoded by iniValue. With none, the launcher tries the next npm
 * folder or shows the setup notice. A file it gives none for returns null ("a prefix may be set, its folder is not
 * known"), so the launcher tries no other npm folder; undefined means the file sets no prefix.
 */
function npmrcTopPrefix(text) {
  const re = /^\[([^\]]*)\]\s*$|^([^=]+)(=(.*))?$/iu;
  let value;
  let inSection = false;
  for (const line of String(text).split(/[\r\n]+/gu)) {
    if (!line || /^\s*[;#]/u.test(line) || /^\s*$/u.test(line)) continue;
    const match = re.exec(line);
    if (!match) continue;
    if (match[1] !== undefined) {
      // A plain section ([other]) only holds its own keys: the top-level prefix stays, and the keys after it are the
      // section's. A section name that is not text or holds a dot, __proto__ or prefix gives no folder.
      const section = iniValue(match[1]);
      if (typeof section !== "string" || section.includes(".") || section.includes("__proto__") || section.includes("prefix")) return null;
      inSection = true;
      continue;
    }
    if (inSection) continue;
    const key = iniValue(match[2]);
    // npm replaces ${NAME} in keys too (a key can become prefix): any such key gives no folder.
    if (typeof key !== "string" || key.includes("__proto__") || key.includes("${")) return null;
    if (key !== "prefix" && key.startsWith("prefix")) return null;
    const raw = match[3] ? iniValue(match[4]) : undefined;
    // Any key whose value decode keeps as null, a list or an object: decode then expands dotted keys and can stop on
    // the file (a=null with a.b=null throws), so npm has no prefix from it.
    if (raw === "null" || raw === null || typeof raw === "object") return null;
    if (key !== "prefix") continue;
    // A quoted JSON list or object makes decode keep a non-text prefix, and a list takes every later prefix line too.
    if (raw !== undefined && typeof raw !== "string") return null;
    value = typeof raw === "string" && raw !== "true" && raw !== "false" && raw !== "null" ? raw : null;
  }
  return typeof value === "string" ? value : value === null ? null : undefined;
}

/** The `prefix=` value of the user's ~/.npmrc, as a folder (npmPathValue), or undefined. */
function npmrcPrefix() {
  try {
    // npm's home is HOME || homedir() (@npmcli/config loadHome), and its user file is <home>/.npmrc unless
    // npm_config_userconfig names another one (the last non-empty one in any case, read as a path like the prefix).
    let named;
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toLowerCase() === "npm_config_userconfig" && value !== "" && !/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(value ?? "")) named = value;
    }
    const file = named !== undefined ? npmPathValue(named) : join(envGet("HOME") || homedir(), ".npmrc");
    if (!file) return null;
    const text = readFileSync(file, "utf8");
    // A prefix line that is no usable folder (a relative path): null, so no other npm folder is tried.
    const found = npmrcTopPrefix(text);
    return typeof found === "string" ? (npmPathValue(found) ?? null) : found;
  } catch { return undefined; }
}

/**
 * ${NAME} in a config value as npm's @npmcli/config env-replace.js replaces it (copied): the variable's value, or for
 * ${NAME?} an empty text when it is not set, or the text ${NAME} kept when it is not set; an odd number of backslashes
 * before it keeps it as text and drops half of them, an even number drops half of them and replaces it.
 */
function npmEnvReplace(text) {
  return text.replace(/(?<!\\)(\\*)\$\{([^${}?]+)(\?)?\}/gu, (orig, esc, name, modifier) => {
    const fallback = modifier === "?" ? "" : `\${${name}}`;
    const val = process.env[name] !== undefined ? process.env[name] : fallback;
    if (esc.length % 2) return orig.slice((esc.length + 1) / 2);
    return esc.slice(esc.length / 2) + val;
  });
}

/**
 * A prefix value as npm's parse-field reads a path: trimmed; ${NAME} replaced as npm does (npmEnvReplace); a leading
 * ~/ (on Windows also ~\) is npm's home folder (HOME || homedir()); any other value is resolved against npm's current
 * folder, which is not known here, so only a full path is a folder. Undefined for none.
 */
function npmPathValue(found) {
  if (typeof found !== "string") return undefined;
  const value = npmEnvReplace(found.trim());
  if (!value) return undefined;
  if (/^~\//u.test(value) || (WINDOWS && /^~\\/u.test(value))) return resolve(envGet("HOME") || homedir(), value.slice(2));
  return fullPath(value) ? resolve(value) : undefined;
}

/**
 * The prefix npm takes from the environment: the last variable, in the order npm reads them, whose name is
 * npm_config_prefix in any case and whose value is not empty (@npmcli/config loadEnv), read as a path (npmPathValue);
 * undefined when there is none. A value set but not a usable path gives null: no other user prefix then.
 */
function envPrefix() {
  let raw;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === "npm_config_prefix" && value !== "" && !/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(value ?? "")) raw = value;
  }
  if (raw === undefined) return undefined;
  return npmPathValue(raw) ?? null;
}

/**
 * The entry file of the shinjuku package under an npm prefix (its package.json bin), or undefined: the prefix must be
 * absolute, and the real paths of the prefix, the package folder and the entry file must lie outside the plugin's own
 * folders, with the entry inside the package folder.
 */
function entryUnder(prefix) {
  if (!fullPath(prefix)) return undefined;
  const realPrefix = real(prefix);
  if (!realPrefix || inPluginFolder(realPrefix)) return undefined;
  const folder = real(WINDOWS ? join(realPrefix, "node_modules", "shinjuku") : join(realPrefix, "lib", "node_modules", "shinjuku"));
  if (!folder || inPluginFolder(folder)) return undefined;
  try {
    const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
    if (manifest?.name !== "shinjuku") return undefined;
    const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.shinjuku;
    if (typeof bin !== "string" || !bin) return undefined;
    const file = real(join(folder, bin));
    return file && isFile(file) && inside(folder, file) && !inPluginFolder(file) ? file : undefined;
  } catch { return undefined; }
}

/** The installed wallet: { entry, prefix } of the first npm prefix (order above) that holds the package, or undefined. */
function findWallet() {
  // The environment's prefix wins over the user file, as in npm; one that npm would set but is no full path gives no
  // user prefix at all (npm would not read the user file's prefix then either).
  const fromEnv = envPrefix();
  const fromFile = fromEnv === undefined ? npmrcPrefix() : undefined;
  const userSet = (fromEnv ?? fromFile) ?? undefined;
  const home = envGet("HOME") || homedir();
  // npm's default global prefix for this Node (@npmcli/config loadGlobalPrefix): PREFIX when it is set, else the Node's
  // own folder on Windows and the folder above its bin elsewhere (under DESTDIR when that is set).
  const nodeDir = dirname(process.execPath);
  // PREFIX goes through npm's path rules (npmPathValue: trim, ~/ under npm's home, a full path); set, it replaces the
  // Node folder even when it is no usable path (npm takes it then too).
  const defaultPrefix = envGet("PREFIX") !== undefined ? npmPathValue(envGet("PREFIX"))
    : (WINDOWS ? nodeDir : (envGet("DESTDIR") ? join(envGet("DESTDIR"), dirname(nodeDir)) : dirname(nodeDir)));
  // A prefix the user set is the only folder npm installs to and updates, so an older install in another npm folder
  // is never started then (an update would not reach it). A set but unusable prefix leaves no folder (the notice).
  // The EACCES line (npm config set prefix ~/.local) makes ~/.local the user's prefix, so it is found this way too.
  const userGiven = fromEnv !== undefined || fromFile !== undefined;
  const prefixes = userGiven
    ? [userSet]
    : WINDOWS
      ? [join(envGet("APPDATA") || join(homedir(), "AppData", "Roaming"), "npm"), defaultPrefix]
      // npm's default prefix (this Node's) first: npm installs and updates there. ~/.local (the EACCES line) and
      // /usr/local cover a Node that Hermes brings itself, whose folder holds no wallet.
      : [defaultPrefix, join(home, ".local"), "/usr/local"];
  // npm's own folder for a plain `npm install -g` in a terminal: the user's prefix, else on Windows %APPDATA%\npm (the
  // Node.js installer's npm sets it), elsewhere the prefix of this Node. Any other folder is a fallback: a plain update
  // may go elsewhere, so the wallet's update words then set npm's folder to this one first (fallback: true).
  const npmOwn = prefixes[0];
  for (const candidate of prefixes) {
    const entry = entryUnder(candidate);
    // Windows: never a fallback (see wallet/src/updateWords.mjs UPDATE_PREFIX_ENV): a plain install reaches the started wallet.
    if (entry) return { entry, prefix: real(candidate), fallback: !WINDOWS && !userGiven && candidate !== npmOwn };
  }
  return undefined;
}

/** True when the folder holds config.json or a <pool>/wallet.json (the wallet's holdsWallet, setup/config.mjs). */
function holdsWallet(dir) {
  if (existsSync(join(dir, "config.json"))) return true;
  try {
    return readdirSync(dir, { withFileTypes: true }).some((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, "wallet.json")));
  } catch { return false; }
}
/**
 * The wallet home, by the wallet's own rule (wallet/src/setup/config.mjs setupHome, the same steps): SHIELDED_WALLET_HOME
 * resolved against the current folder, else ~/.shinjuku-shield in homedir(), else the older ~/.carbon-shielded-wallet
 * when only that one holds a wallet. The launcher gives the wallet the same environment (walletEnv: an unexpanded
 * placeholder is left out of both, as envGet does) and the same current folder, so the wallet it starts uses this home.
 */
function walletHome() {
  const given = envGet("SHIELDED_WALLET_HOME");
  if (given !== undefined) return resolve(given);
  const current = join(homedir(), ".shinjuku-shield");
  const older = join(homedir(), ".carbon-shielded-wallet");
  return !holdsWallet(current) && holdsWallet(older) ? older : current;
}
/**
 * True when the wallet in that home is set up: its config.json names its checked setup files (proofToolsRelease.dir).
 * Setup writes that field in its last config write, after the wallet, its passphrase and its setup files
 * (wallet/src/setup/setup.mjs, stage "config"); its first config write, at "Wallet created", has no such field.
 */
function walletSetUp() {
  const home = walletHome();
  try {
    // A BOM (a config.json saved again by Notepad) is read as the wallet reads it (setup/config.mjs readSetupConfigRaw).
    const config = JSON.parse(readFileSync(join(home, "config.json"), "utf8").replace(/^\uFEFF/u, ""));
    return typeof config?.proofToolsRelease?.dir === "string" && config.proofToolsRelease.dir !== "";
  } catch { return false; }
}
/**
 * How often the not-installed server looks for the finished setup. When Hermes starts this plugin before the wallet
 * is installed and the user then sets the wallet up with Hermes open, Hermes keeps this small server and its one tool:
 * its 60 s reconcile and /reload-mcp skip a server name that is live, and a respawn keeps the registered tools (Hermes
 * desktop 2026.7855, hermes-agent 8fc03744; seen on a Windows test computer, row 119, 2026-11-25). Hermes re-lists a
 * server's tools on notifications/tools/list_changed, so this server switches to the installed wallet in place and
 * sends that notice. The signal is the wallet's own "set up" mark (walletSetUp): setup's last config write. From then
 * on setup only saves the start copy, checks each app (those checks start the wallet too) and asks its last questions,
 * so the wallet may run beside it.
 */
const READY_CHECK_MS = 5_000;
const SWITCH_INIT_ID = "shinjuku-plugin-switch";
/** How long the switch waits for the wallet's initialize answer before it gives up (the launcher then ends). */
const SWITCH_INIT_MS = 120_000;

const NOT_READY = MAC
  ? "The Shinjuku private wallet does not run on a Mac yet: its proof programs run on Windows and Linux only. Nothing was paid or read. "
    + "Tell the user: Shinjuku works in Hermes on Windows or Linux."
  : "The Shinjuku private wallet is not installed on this computer yet, so it cannot pay or read anything yet. Nothing was paid. "
    + `Tell the user to do this once, ${WHERE_TO_TYPE}, and to type the lines exactly as they are here:\n`
    + `1. Install the wallet:\n   ${INSTALL_LINE}\n`
    + (WINDOWS ? "" : "   If npm says EACCES (no permission to write its global folder), make your own folder npm's folder, then install again:\n"
      + "   npm config set prefix ~/.local\n   npm install -g shinjuku\n   and in step 2 type ~/.local/bin/shinjuku setup\n") // typed-line-check: posix only (WINDOWS is false here)
    + `2. Set it up:\n   ${SETUP_LINE}\n`
    + "   Setup asks whether to use Tor (yes is the default: then the sites and services the wallet reaches do not see "
    + "your IP address), creates your private wallet and asks you to save its backup. The install in step 1 goes "
    + "directly to npm, before that question.\n"
    // Plugin 0.2.1: this server switches to the wallet by itself when setup ends (READY_CHECK_MS below), so the reload
    // is only the step for a wallet that does not show.
    + "3. Back in Hermes, ask again: Hermes loads the wallet by itself within a minute after setup. Only if the wallet still does "
    + `not answer: ${RELOAD}`;

/** MCP revisions this small server answers in; a client asking for another gets the newest one listed here. */
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const SETUP_TOOL_NAME = "setup_wallet_first";
const SETUP_TOOL_SHAPE = {
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};
/**
 * The same tool name once the wallet is installed (row 119 run 7 on 0.3.270, 2026-11-24 19:20:35Z, TC-D13): in a
 * conversation that began before setup, Hermes called setup_wallet_first again after the gateway restart, and Hermes
 * refused it itself ("not a known tool name"), a red line for the user. The launcher lists it beside the wallet's own
 * tools and answers it here; the wallet never sees the call.
 */
const INSTALLED_TOOL = {
  name: SETUP_TOOL_NAME,
  title: "Shinjuku wallet installed",
  description: "Only for a conversation from before the wallet was installed: the Shinjuku wallet is installed now, so use its other tools "
    + "for every request (wallet_balance for the balance). It answers that and pays, installs and changes nothing.",
  ...SETUP_TOOL_SHAPE,
};
const INSTALLED_WORDS = "The Shinjuku wallet is installed on this computer now. Use its other tools for the user's request: wallet_balance "
  + "for the balance (if the wallet is not set up yet, its own setup tool says what to do). Tell the user nothing about this step.";

/** A minimal MCP server (JSON-RPC, one message per line) that only says how to install and set up. */
function serveSetupNeeded() {
  const tool = {
    name: SETUP_TOOL_NAME,
    title: "Set up the Shinjuku wallet first",
    description: "Use this for any wallet, payment, balance or private page request: the Shinjuku wallet is not installed on this "
      + `computer yet. It answers what to tell the user (install with ${INSTALL_LINE}, then ${SETUP_LINE}). It installs, pays and changes nothing.`,
    ...SETUP_TOOL_SHAPE,
  };
  const send = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  // Hermes's input, read as bytes and cut at each line end. At the switch, the bytes after the last line end (a request
  // that has not ended yet) go to the wallet proxy first, so no request is cut in two.
  let rest = Buffer.alloc(0);
  let initParams = null;
  const onLine = (line) => {
    if (!line.trim()) return;
    let request;
    try { request = JSON.parse(line); } catch {
      send({ id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }
    const validId = (id) => typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
    if (!request || typeof request !== "object" || Array.isArray(request) || request.jsonrpc !== "2.0" || typeof request.method !== "string"
      || (request.id !== undefined && !validId(request.id))
      || (request.params !== undefined && (request.params === null || typeof request.params !== "object"))) {
      send({ id: validId(request?.id) ? request.id : null, error: { code: -32600, message: "Invalid Request" } });
      return;
    }
    if (request.id === undefined) return; // a notification
    const { id, method, params } = request;
    if (method === "initialize") {
      const asked = params?.protocolVersion;
      initParams = { ...params, protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0] };
      send({ id, result: {
        protocolVersion: initParams.protocolVersion,
        // listChanged: this server tells Hermes when its tools change (the switch below).
        capabilities: { tools: { listChanged: !MAC } },
        serverInfo: { name: "shinjuku", title: "Shinjuku private wallet (not installed yet)", version: PLUGIN_VERSION },
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
  };
  const onData = (chunk) => {
    rest = rest.length ? Buffer.concat([rest, chunk]) : chunk;
    let at;
    while ((at = rest.indexOf(0x0a)) >= 0) {
      const line = rest.subarray(0, at).toString("utf8").replace(/\r$/u, "");
      rest = rest.subarray(at + 1);
      onLine(line);
    }
  };
  const ended = () => {
    if (rest.length) { const line = rest.toString("utf8"); rest = Buffer.alloc(0); onLine(line); }
    if (process.stdout.writableLength > 0) process.stdout.write("", () => process.exit(0));
    else process.exit(0);
  };
  process.stdin.on("data", onData);
  process.stdin.on("end", ended);
  if (MAC) return;
  // The switch: once the wallet is installed and set up (walletSetUp), this process starts
  // the installed wallet, opens it with Hermes's own initialize, passes everything on from then, and tells Hermes that
  // the tools changed. Every answer above is written in the same turn as its request, so none is left half-answered.
  const timer = setInterval(() => {
    if (!initParams || !walletSetUp()) return;
    const wallet = findWallet();
    if (!wallet) return;
    clearInterval(timer);
    process.stdin.pause();
    process.stdin.removeListener("data", onData);
    process.stdin.removeListener("end", ended);
    startWallet(wallet, { params: initParams, pending: rest });
  }, READY_CHECK_MS);
  timer.unref();
}

/**
 * A folder name the launcher writes into words for the agent and into a typed line: a plain absolute path only (letters,
 * digits and _ @ % + = : , . / -; no space, quote, newline or other control character), so a folder name cannot become
 * prose or instructions for the model. The same test as wallet/src/updateWords.mjs PLAIN_FOLDER.
 */
const PLAIN_FOLDER = /^\/[A-Za-z0-9_@%+=:,./-]{0,255}$/u;

/**
 * The update lines for a fallback install (Linux and macOS: a wallet found outside npm's own folder for a plain
 * install), given by the plugin itself, since the installed wallet may be older than its own words for this case
 * (wallet/src/updateWords.mjs UPDATE_PREFIX_ENV) and a plain install line could update another folder. A folder with
 * an unusual name is not written at all: the words then say what to do without it.
 */
const fallbackNote = (folder) => {
  const head = "Shinjuku plugin: this wallet runs from a folder that is not npm's usual one for a plain install. When the wallet needs "
    + "an update, ";
  const reload = `then reload the wallet in Hermes (/reload-mcp; in the Hermes desktop app: Ctrl+K, "Restart gateway"; if Hermes then asks to restart the shared gateway, choose "Restart all").`;
  if (PLAIN_FOLDER.test(folder)) {
    return `${head}tell the user to type these lines in a terminal, in place of any other update line: \`npm config set prefix ${folder}\` ` // typed-line-check: posix only (no fallback on Windows)
      + `(this makes the wallet's folder npm's global folder for the account), then \`${INSTALL_LINE}\`, ${reload}`;
  }
  return `${head}tell the user that the wallet's folder has an unusual name: in a terminal, set npm's global folder to the folder `
    + `that holds this wallet (npm config set prefix, then that folder in quotes), then type \`${INSTALL_LINE}\`, ${reload}`;
};

/** The longest tool description with the note (a host's 4096-character cut less a 40-character margin). */
const NOTE_TOOL_LIMIT = 4096 - 40;
/** The longest line the launcher reads; a longer one passes as it is, unread. */
const MAX_READ_LINE = 4 * 1024 * 1024;

/**
 * Splits a byte stream into lines (each with its line end) for onLine, with a bounded buffer: a line longer than `max`
 * goes to onRaw in its pieces, unread, up to its end. Chunks are kept as they come and joined once per line.
 */
function lineSplitter(onLine, onRaw, max = MAX_READ_LINE) {
  let parts = [];
  let size = 0;
  let skipping = false;
  return {
    feed(chunk) {
      let at = 0;
      let end;
      while ((end = chunk.indexOf(0x0a, at)) >= 0) {
        const piece = chunk.subarray(at, end + 1);
        at = end + 1;
        if (skipping) { onRaw(piece); skipping = false; continue; }
        // A line that ends in this chunk but is longer than `max` in all goes out unread too.
        if (size + piece.length > max) { for (const part of parts) onRaw(part); onRaw(piece); parts = []; size = 0; continue; }
        parts.push(piece);
        const line = parts.length === 1 ? parts[0] : Buffer.concat(parts);
        parts = [];
        size = 0;
        onLine(line);
      }
      if (at >= chunk.length) return;
      const rest = chunk.subarray(at);
      if (skipping) { onRaw(rest); return; }
      parts.push(rest);
      size += rest.length;
      if (size > max) { for (const part of parts) onRaw(part); parts = []; size = 0; skipping = true; }
    },
    end() { for (const part of parts) onRaw(part); parts = []; size = 0; },
  };
}

/** The bytes the wallet's stdio server writes at the start of every answer, and after the id of a tools/list answer. */
const ANSWER_HEAD = Buffer.from('{"jsonrpc":"2.0","id":');
const TOOLS_HEAD = Buffer.from(',"result":{"tools":[');
/** The tools that can carry the note, in this order: wallet_status (before setup), then short tools. */
const NOTE_TOOLS = ["wallet_status", "wallet_cancel", "check_price", "find_paid_services"];
const bytesAt = (line, at, bytes) => line.length >= at + bytes.length && line.subarray(at, at + bytes.length).equals(bytes);

/** The end (after its closing quote) of the JSON string that starts at `at`, or -1. */
function stringEnd(line, at) {
  if (line[at] !== 0x22) return -1;
  for (let i = at + 1; i < line.length; i += 1) {
    if (line[i] === 0x5c) i += 1;
    else if (line[i] === 0x22) return i + 1;
  }
  return -1;
}

/**
 * A request id as the wallet's answer writes it (JSON.stringify of the parsed id): a string, a finite number or null
 * (wallet/src/mcp/stdioServer.mjs accepts these). Two large numbers that parse to one value share a token; both answers
 * then get the same added tool, which harms nothing. Else null: not a request the launcher reads.
 */
const requestToken = (id) => (id === null || typeof id === "string" || (typeof id === "number" && Number.isFinite(id)) ? JSON.stringify(id) : null);

/** The raw id text of a wallet answer line (a string, a number or null), or null for a line that is not an answer. */
function answerId(line) {
  if (!bytesAt(line, 0, ANSWER_HEAD)) return null;
  const idAt = ANSWER_HEAD.length;
  let idEnd = idAt;
  if (line[idAt] === 0x22) idEnd = stringEnd(line, idAt);
  else if (bytesAt(line, idAt, NULL_BYTES)) idEnd = idAt + NULL_BYTES.length;
  else while (idEnd < line.length && /[-+.eE0-9]/u.test(String.fromCharCode(line[idEnd]))) idEnd += 1;
  if (idEnd <= idAt || line[idEnd] !== 0x2c) return null;
  return line.subarray(idAt, idEnd).toString("utf8");
}
const NULL_BYTES = Buffer.from("null");

/**
 * The wallet's answer line with the note put in at the start of one tool's description, or null for any other line,
 * which then passes as it is. Hermes reads tool descriptions, not a server's initialize instructions
 * (hermes-agent tools/mcp_tool_registration.py). The launcher does not parse or rewrite the answer: it reads the answer's
 * id as its raw text (the asked ids are kept in the same form), and inserts the note's escaped text (`insert`) after the
 * opening quote of the first NOTE_TOOLS description that stays within NOTE_TOOL_LIMIT with it. Every other byte stays.
 */
function withToolsNote(line, insert, asked) {
  const id = answerId(line);
  if (id === null || !asked.has(id)) return null;
  const idEnd = ANSWER_HEAD.length + Buffer.byteLength(id);
  asked.delete(id);
  if (!bytesAt(line, idEnd, TOOLS_HEAD)) return null; // an error answer, or not a tools list: as it is
  // JSON.parse checks the line only (it is never written back): a line that is not valid JSON passes as it is, and the
  // raw place below must hold the same description as the parsed answer, tool by tool.
  let parsed;
  try { parsed = JSON.parse(line.toString("utf8")); } catch { return null; }
  const tools = parsed?.result?.tools;
  if (!Array.isArray(tools)) return null;
  const spots = toolDescriptions(line, idEnd + TOOLS_HEAD.length);
  if (!spots || spots.length !== tools.length) return null; // not the shape the launcher knows: as it is
  for (const name of NOTE_TOOLS) {
    const index = tools.findIndex((tool) => tool?.name === name);
    const spot = index < 0 ? null : spots[index];
    if (!spot || spot.name !== name || typeof tools[index].description !== "string") continue;
    let rawDescription;
    try { rawDescription = JSON.parse(line.subarray(spot.open, spot.close).toString("utf8")); } catch { continue; }
    if (rawDescription !== tools[index].description) continue;
    // The raw length is at least the description's length in characters, so this keeps it under the cut.
    if (spot.close - spot.open - 2 + insert.chars > NOTE_TOOL_LIMIT) continue;
    const out = Buffer.concat([line.subarray(0, spot.open + 1), insert.bytes, line.subarray(spot.open + 1)]);
    // The last check, whatever the line's shape (a duplicate "result" or "tools" key, for one): parsed, the new line is
    // the old answer with only this tool's description changed, to the note plus the old description. Else as it is.
    return sameButNote(out, parsed, index, `${JSON.parse(`"${insert.bytes.toString("utf8")}"`)}${tools[index].description}`) ? out : null;
  }
  return null;
}

/**
 * A tools/list answer line with INSTALLED_TOOL put first in result.tools, or null (the line then passes as it is): an
 * answer that is not a tools list, one that already has a tool of that name, or one whose shape the launcher does not
 * know. Checked as for the note: parsed, the new line is the old answer with only that tool added at the front.
 */
function withInstalledTool(line) {
  const id = answerId(line);
  if (id === null) return null;
  const at = ANSWER_HEAD.length + Buffer.byteLength(id) + TOOLS_HEAD.length;
  if (!bytesAt(line, ANSWER_HEAD.length + Buffer.byteLength(id), TOOLS_HEAD)) return null;
  let before;
  try { before = JSON.parse(line.toString("utf8")); } catch { return null; }
  const tools = before?.result?.tools;
  if (!Array.isArray(tools) || tools.some((tool) => tool?.name === SETUP_TOOL_NAME)) return null;
  const empty = line[skipSpace(line, at)] === 0x5d;
  const out = Buffer.concat([line.subarray(0, at), Buffer.from(JSON.stringify(INSTALLED_TOOL) + (empty ? "" : ","), "utf8"), line.subarray(at)]);
  let after;
  try { after = JSON.parse(out.toString("utf8")); } catch { return null; }
  if (after?.result?.tools?.[0]?.name !== SETUP_TOOL_NAME) return null;
  after.result.tools.shift();
  try { return JSON.stringify(after) === JSON.stringify(before) ? out : null; } catch { return null; }
}

/** True when the wallet's own tools/list answer already names setup_wallet_first. */
function walletListsTool(line) {
  try { return JSON.parse(line.toString("utf8"))?.result?.tools?.some?.((tool) => tool?.name === SETUP_TOOL_NAME) === true; } catch { return false; }
}

/** True when `out` parses to `before` with only result.tools[index].description changed to `description`. */
function sameButNote(out, before, index, description) {
  let after;
  try { after = JSON.parse(out.toString("utf8")); } catch { return false; }
  if (after?.result?.tools?.[index]?.description !== description) return false;
  after.result.tools[index].description = before.result.tools[index].description;
  try { return JSON.stringify(after) === JSON.stringify(before); } catch { return false; } // a very deep answer: as it is
}

const isSpace = (byte) => byte === 0x20 || byte === 0x09 || byte === 0x0d || byte === 0x0a;
const skipSpace = (line, at) => { while (at < line.length && isSpace(line[at])) at += 1; return at; };

/** The end of the JSON value that starts at `at`, read as raw bytes (nested objects and arrays by depth, outside strings), or -1. */
function valueEnd(line, at) {
  if (line[at] === 0x22) return stringEnd(line, at);
  if (line[at] === 0x7b || line[at] === 0x5b) {
    let depth = 0;
    for (let i = at; i < line.length; i += 1) {
      const byte = line[i];
      if (byte === 0x22) {
        const end = stringEnd(line, i);
        if (end < 0) return -1;
        i = end - 1;
      } else if (byte === 0x7b || byte === 0x5b) depth += 1;
      else if (byte === 0x7d || byte === 0x5d) { depth -= 1; if (depth === 0) return i + 1; }
    }
    return -1;
  }
  let end = at;
  while (end < line.length && !isSpace(line[end]) && line[end] !== 0x2c && line[end] !== 0x5d && line[end] !== 0x7d) end += 1;
  return end > at ? end : -1;
}

/**
 * One entry per direct member object of result.tools (the array that starts at `at`), in order: its decoded name and
 * the { open, close } byte offsets of its description string's quotes, or null. Keys are decoded before they are
 * compared, and a later duplicate key counts, as in JSON.parse. Null when the array is not a list of objects the
 * launcher can read to its end; values inside a tool (its inputSchema too) are skipped whole, so a nested object never
 * counts as a tool.
 */
function toolDescriptions(line, at) {
  const spots = [];
  const decode = (start, end) => { try { return JSON.parse(line.subarray(start, end).toString("utf8")); } catch { return undefined; } };
  let i = skipSpace(line, at);
  if (line[i] === 0x5d) return spots;
  for (;;) {
    if (line[i] !== 0x7b) return null;
    let j = skipSpace(line, i + 1);
    let name = null;
    let description = null;
    if (line[j] !== 0x7d) {
      for (;;) {
        const keyEnd = line[j] === 0x22 ? stringEnd(line, j) : -1;
        if (keyEnd < 0) return null;
        const key = decode(j, keyEnd);
        j = skipSpace(line, keyEnd);
        if (line[j] !== 0x3a) return null;
        j = skipSpace(line, j + 1);
        const end = valueEnd(line, j);
        if (end < 0) return null;
        const isString = line[j] === 0x22;
        if (key === "name") name = isString ? (decode(j, end) ?? null) : null;
        if (key === "description") description = isString ? { open: j, close: end } : null;
        j = skipSpace(line, end);
        if (line[j] === 0x2c) { j = skipSpace(line, j + 1); continue; }
        if (line[j] === 0x7d) break;
        return null;
      }
    }
    spots.push(description ? { name, ...description } : null);
    i = skipSpace(line, j + 1);
    if (line[i] === 0x2c) { i = skipSpace(line, i + 1); continue; }
    if (line[i] === 0x5d) return spots;
    return null;
  }
}

function startWallet({ entry, prefix, fallback }, handshake = null) {
  // The launcher reads both directions line by line. From Hermes: the ids of its tools/list requests (their answers get
  // INSTALLED_TOOL, and on a fallback install the update note, withToolsNote), and a tools/call of setup_wallet_first,
  // which the launcher answers itself (INSTALLED_WORDS) and does not pass on. Every other byte passes as it is.
  const note = fallback ? fallbackNote(prefix) : null;
  const insert = note ? { bytes: Buffer.from(JSON.stringify(`${note} `).slice(1, -1), "utf8"), chars: note.length + 1 } : null;
  // npm_config_prefix: the folder that holds this install, so the wallet's own texts name the folder its command is in.
  const child = spawn(process.execPath, [entry, "mcp"], { stdio: ["pipe", "pipe", "inherit"],
    // SHINJUKU_WALLET_UPDATE_PREFIX: only for a fallback install, the folder the wallet's update words set as npm's
    // global folder before the install line (wallet/src/updateWords.mjs); never taken from Hermes's environment.
    env: { ...Object.fromEntries(Object.entries(walletEnv).filter(([key]) => !["npm_config_prefix", "shinjuku_wallet_update_prefix"].includes(key.toLowerCase()))),
      npm_config_prefix: prefix, ...(fallback ? { SHINJUKU_WALLET_UPDATE_PREFIX: prefix } : {}) },
    cwd: process.cwd(), windowsHide: true });
  child.stdin.on("error", () => {}); // the wallet ended first; its exit below ends this launcher
  // The tools/list requests that wait for their answer, oldest first, at most MAX_ASKED; a newer one pushes out the
  // oldest, so an answer the launcher could not read (a line longer than MAX_READ_LINE) never blocks later ones. Hermes
  // asks for the list once per connection and after a list change, so 1024 open lists are far above its use.
  const MAX_ASKED = 1024;
  const listAsked = new Set();
  const noteAsked = new Set();
  const remember = (set, id) => { set.delete(id); set.add(id); if (set.size > MAX_ASKED) set.delete(set.values().next().value); };
  // The wallet lists setup_wallet_first itself (a later wallet version): then its own tool answers, not the launcher.
  // Read again from every tools/list answer the launcher reads; until the first one, the launcher answers.
  let walletOwnsTool = false;
  // Hermes's input pauses while any of these holds: the wallet's input is full, Hermes's output is full, or launcher
  // answers wait behind a long wallet line. It resumes when none holds.
  const holds = new Set();
  const hold = (why) => { holds.add(why); process.stdin.pause(); };
  const release = (why) => { holds.delete(why); if (!holds.size) process.stdin.resume(); };
  const toWallet = (bytes) => {
    if (child.stdin.destroyed || child.stdin.write(bytes)) return;
    hold("wallet-input");
    child.stdin.once("drain", () => release("wallet-input"));
  };
  // A write that fills Hermes's input pauses the wallet's output and Hermes's input until it drains. An answer the
  // launcher gives itself waits while a long line of the wallet passes in pieces (rawOpen), so it never lands inside it.
  let held = false;
  let rawOpen = false;
  const waiting = [];
  const put = (bytes) => {
    if (process.stdout.write(bytes) || held) return;
    held = true;
    child.stdout.pause();
    hold("output");
    process.stdout.once("drain", () => { held = false; child.stdout.resume(); release("output"); });
  };
  const flushWaiting = () => { while (waiting.length) put(waiting.shift()); release("waiting"); };
  const putLine = (bytes) => { put(bytes); rawOpen = false; flushWaiting(); };
  const putRaw = (bytes) => { put(bytes); rawOpen = bytes[bytes.length - 1] !== 0x0a; if (!rawOpen) flushWaiting(); };
  const installedAnswer = (id) => ({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: INSTALLED_WORDS }], isError: false } });
  const putOwn = (message) => {
    const bytes = Buffer.from(`${JSON.stringify(message)}\n`, "utf8");
    if (!rawOpen) { put(bytes); return; }
    waiting.push(bytes);
    hold("waiting");
  };
  const isRequest = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.method === "string"
    && Object.hasOwn(entry, "id") && requestToken(entry.id) !== null;
  // A call the launcher answers: setup_wallet_first with a request id (a notification gets no answer, as from the wallet).
  const isOwnCall = (entry) => !walletOwnsTool && isRequest(entry) && entry.method === "tools/call" && entry.params?.name === SETUP_TOOL_NAME;
  const noteList = (entry) => {
    if (!isRequest(entry) || entry.method !== "tools/list") return;
    const id = requestToken(entry.id);
    remember(listAsked, id);
    if (note) remember(noteAsked, id);
  };
  // A batch (MCP 2025-06-18 has none; older revisions allow it) with setup_wallet_first calls among other messages: the
  // launcher keeps its answers until the wallet's batch answer (the line whose array holds one of the batch's other
  // request ids) and puts them into that array, so Hermes gets one answer array for one batch. A batch whose other
  // messages are notifications only gets the launcher's answers as its array at once (the wallet answers nothing).
  const batchOwn = new Map(); // token of one wallet-side request id of that batch -> { ids, answers }
  const fromHermes = lineSplitter((line) => {
    let message = null;
    try { message = JSON.parse(line.toString("utf8")); } catch { message = null; }
    if (isOwnCall(message)) { putOwn(installedAnswer(message.id)); return; }
    if (Array.isArray(message) && message.length) {
      for (const entry of message) noteList(entry);
      const own = message.filter(isOwnCall);
      if (own.length) {
        const rest = message.filter((entry) => !isOwnCall(entry));
        const answers = own.map((entry) => installedAnswer(entry.id));
        const ids = rest.filter(isRequest).map((entry) => requestToken(entry.id));
        if (!ids.length) {
          putOwn(answers);
          if (rest.length) toWallet(Buffer.from(`${JSON.stringify(rest)}\n`, "utf8"));
          return;
        }
        const group = { ids, answers };
        for (const id of ids) batchOwn.set(id, group);
        while (batchOwn.size > MAX_ASKED) batchOwn.delete(batchOwn.keys().next().value);
        toWallet(Buffer.from(`${JSON.stringify(rest)}\n`, "utf8"));
        return;
      }
    } else noteList(message);
    toWallet(line);
  }, toWallet);
  const attach = () => {
    process.stdin.on("data", (chunk) => fromHermes.feed(chunk));
    process.stdin.on("end", () => { fromHermes.end(); child.stdin.end(); });
  };
  // A switch from the not-installed server (handshake: Hermes's initialize params and its unfinished input): the
  // launcher opens the wallet with those params and holds Hermes's input until the wallet's initialize result is in;
  // only then it passes Hermes's input on (the unfinished part first) and says that the tools changed. An error answer,
  // or no answer in SWITCH_INIT_MS, ends the wallet and this launcher (Hermes starts the plugin again at its next call).
  let switching = Boolean(handshake);
  let switchTimer = null;
  const switchFailed = (why) => {
    process.stderr.write(`shinjuku plugin: the switch to the installed wallet failed (${why})\n`);
    child.kill();
    process.exit(1);
  };
  if (switching) {
    hold("switch");
    switchTimer = setTimeout(() => switchFailed("no initialize answer"), SWITCH_INIT_MS);
    toWallet(Buffer.from(`${JSON.stringify({ jsonrpc: "2.0", id: SWITCH_INIT_ID, method: "initialize", params: handshake.params })}\n`, "utf8"));
  } else attach();
  // A tools/list answer object (single or in a batch) gets the tool, and tells whether the wallet lists it itself.
  const fixList = (answer) => {
    const tools = answer?.result?.tools;
    if (!Array.isArray(tools)) return answer;
    walletOwnsTool = tools.some((tool) => tool?.name === SETUP_TOOL_NAME);
    return walletOwnsTool ? answer : { ...answer, result: { ...answer.result, tools: [INSTALLED_TOOL, ...tools] } };
  };
  const fromWallet = lineSplitter((line) => {
    if (switching) {
      let message = null;
      try { message = JSON.parse(line.toString("utf8")); } catch { message = null; }
      if (message && !Array.isArray(message) && message.id === SWITCH_INIT_ID) {
        if (!message.result || typeof message.result !== "object") { switchFailed("the wallet's initialize answer was an error"); return; }
        switching = false;
        clearTimeout(switchTimer);
        toWallet(Buffer.from(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`, "utf8"));
        attach();
        if (handshake.pending?.length) fromHermes.feed(handshake.pending);
        putOwn({ jsonrpc: "2.0", method: "notifications/tools/list_changed" });
        release("switch");
        return;
      }
    }
    if (!listAsked.size && !batchOwn.size) { putLine(line); return; }
    // Any fault in the launcher's own code passes the line as it is: it never stops the wallet's answers.
    let out = line;
    try {
      if (line[0] === 0x5b) {
        // A batch answer: read whole and written again (batches are rare; a single answer keeps its bytes).
        const answers = JSON.parse(line.toString("utf8"));
        if (Array.isArray(answers)) {
          let changed = false;
          const fixed = answers.map((answer) => {
            const id = answer && typeof answer === "object" && Object.hasOwn(answer, "id") ? requestToken(answer.id) : null;
            if (id === null || !listAsked.has(id)) return answer;
            listAsked.delete(id);
            noteAsked.delete(id);
            changed = true;
            return fixList(answer);
          });
          const id = fixed.map((answer) => (answer && typeof answer === "object" ? requestToken(answer.id) : null)).find((token) => batchOwn.has(token));
          if (id !== undefined) {
            const group = batchOwn.get(id);
            for (const token of group.ids) batchOwn.delete(token);
            fixed.push(...group.answers);
            changed = true;
          }
          if (changed) out = Buffer.from(`${JSON.stringify(fixed)}\n`, "utf8");
        }
      } else {
        const id = answerId(line);
        if (id !== null && listAsked.has(id)) {
          listAsked.delete(id);
          if (noteAsked.size) out = withToolsNote(out, insert, noteAsked) ?? out;
          const added = withInstalledTool(out);
          if (added) { out = added; walletOwnsTool = false; } else walletOwnsTool = walletListsTool(out);
        }
      }
    } catch { out = line; }
    putLine(out);
  }, putRaw);
  child.stdout.on("data", (chunk) => fromWallet.feed(chunk));
  // The wallet's output ended: its last piece without a line end gets one, so a waiting launcher answer is its own line.
  child.stdout.on("end", () => { fromWallet.end(); if (rawOpen) put(Buffer.from("\n")); rawOpen = false; flushWaiting(); outputEnded(); });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => {
    process.stderr.write(`shinjuku plugin: could not start ${entry} (${error.message})\n`);
    process.exit(1);
  });
  // The launcher ends when the wallet has ended and, with a piped output, its output has ended too and this launcher's
  // own output is written ("close" would also wait for the wallet's input, which Hermes keeps open).
  let ended = null;
  let outputDone = false;
  const finish = () => {
    if (!ended || !outputDone) return;
    const code = ended.code ?? (ended.signal ? 1 : 0);
    // An empty write's callback runs after every earlier write is done (a "drain" comes only after a full buffer).
    if (process.stdout.writableLength > 0) process.stdout.write("", () => process.exit(code));
    else process.exit(code);
  };
  function outputEnded() { outputDone = true; finish(); }
  child.on("exit", (code, signal) => { ended = { code, signal }; finish(); });
}

const wallet = findWallet();
if (wallet) startWallet(wallet);
else serveSetupNeeded();
