# Shinjuku private wallet for Hermes

Pay for paid web services privately, read web pages through your private wallet, and keep a private balance
that only you control, from inside Hermes.

**New (November 2026).** The plugin is new. Its first version was checked in November 2026 in the Hermes
desktop app 0.23.1 on Windows with wallet 0.3.217 (the wallet card, a price check, a paid search, a private AI
answer and the receipts). This version starts the wallet you installed (the npm package `shinjuku`), with no
version of its own. No test by a new user has passed yet.

What stays private: the seller and the blockchain do not see which wallet paid. If you choose Tor in setup,
the sites and services the wallet reaches do not see your IP address. What does not change: your Hermes chat
still goes to its AI company, and that company reads what the wallet answers in the chat.

## What you need first

- **Hermes.** Install it from Nous Research's own page:
  https://hermes-agent.nousresearch.com/docs/getting-started/installation
- **Node.js 24 LTS** (24.22.1 or newer; or 22.23.4 or newer). Download the installer for your computer from
  https://nodejs.org/en/download and run it. The wallet runs on Node.js.
- **Git.** The Hermes app needs Git to install a plugin: without it, the install stops with "spawn git ENOENT".
  On Windows, download Git for Windows from https://git-scm.com/download/win, run it with its default choices,
  then close Hermes and open it again. On Linux, install Git from your system's packages.

## Before you start: install and set up the wallet once

Do this once, before you use the wallet in Hermes. You do not need to look up the lines: after you install
the plugin, ask Hermes anything about the wallet and it shows you the exact two lines for your computer:

- Linux, in a terminal: `npm install -g shinjuku`, then `shinjuku setup`.
- Windows, in PowerShell or Command Prompt: `npm.cmd install -g shinjuku`, then `shinjuku.cmd setup`.

On Linux, if npm says EACCES (no permission to write its global folder), install it in your own folder:
`npm config set prefix ~/.local`, then `npm install -g shinjuku`, then `~/.local/bin/shinjuku setup`. npm then
installs and updates the wallet there, and the plugin finds it there.

The first line installs the `shinjuku` command. This download goes directly to npm, before setup asks about
Tor, so npm sees your IP address for it. The second line, setup:

- asks whether to use Tor (yes is the default: then the services the wallet reaches do not see your IP
  address, and setup's own downloads go over Tor),
- creates your private wallet and asks you to save its backup,
- downloads the wallet's proof programs, and Tor when you chose Tor.

The wallet runs with Node.js on Windows (x64) and Linux. It does not run on a Mac yet.

## Install the plugin

1. In the Hermes desktop app: Capabilities → Plugins, search "Shinjuku", open the "shinjuku" card and choose
   Install. Or Capabilities → Plugins → Install from Git, then paste `https://github.com/ShinjukuStaition/hermes-shinjuku`.
   Or in a terminal:

   ```
   hermes plugins install ShinjukuStaition/hermes-shinjuku
   hermes plugins enable shinjuku
   ```

   The first time, the Hermes desktop app on Windows can show a red note: "MCP server shinjuku is not
   connected". This is normal and you do not need to do anything. Hermes first prepares its own copy of
   Node.js, and on a new computer that takes longer than Hermes waits. About a minute later, Hermes tries
   again by itself and the plugin connects (70 seconds on our test computer). You can close the note.

2. Start Hermes and ask "set up my Shinjuku wallet". Hermes shows the two setup lines above for your
   computer. Run them. Hermes then loads the wallet by itself within a minute. Only if it does not show, reload
   the wallet in Hermes: in a terminal, type `/reload-mcp`; in the Hermes desktop app, press Ctrl+K and choose
   "Restart gateway"; if Hermes then asks to restart the shared gateway, choose "Restart all" (this also reconnects
   the other bots that share that gateway). (Closing the app window does not restart the wallet.)

3. Type `/shinjuku:wallet` to see your wallet card. It says whether Tor is on.

## Use it

Ask in plain words:

- "What is my balance?": shows your private balance, pays nothing.
- "What does this API cost?" with its address: checks the price, pays nothing.
- "Find a paid API for weather data": searches public lists on your computer, pays nothing.
- "Pay for this service, at most 5 cents": pays privately from your balance.
- "Show my receipts", "Send 2 USDC back to my wallet".
- Keep the wallet backup that setup saved (the recovery file and the passphrase file) in a safe place, away
  from this computer. Never share it: anyone with it can spend your balance.
- "Add funds": the wallet gives you an address. Send USDC on Solana to it from any wallet or exchange (no SOL
  needed), then tell Hermes "I sent it". Hermes checks your balance and tells you when the USDC arrived and
  when it is private and ready to spend.

The agent pays or sends only when you ask for that payment or send. The plugin marks the wallet as
untrusted, so Hermes asks for your OK before each wallet call that is not a read (a payment, a send, a stop,
a new deposit address); you can say no, and nothing happens. Your approval setting in Hermes can change
when Hermes asks. The wallet can also ask you itself ("Allow once") before some steps. A balance check pays
and sends nothing, but when USDC you added is waiting, it makes that USDC private.

## Update the wallet

The plugin never installs or updates the wallet. When the wallet tells you a new version is out, run the same
install line again in a terminal (Linux `npm install -g shinjuku`; Windows `npm.cmd install -g shinjuku`). On Linux, if the wallet runs from a folder that is not npm's usual one, the plugin tells Hermes the update lines for
that folder: `npm config set prefix` with that folder, then the install line. Run both, so the update reaches that wallet. Then reload the wallet in Hermes: `/reload-mcp` in a terminal; in the Hermes desktop app, Ctrl+K, "Restart gateway"
(if Hermes then asks to restart the shared gateway, choose "Restart all").

A plugin update (`hermes plugins update shinjuku`) changes only the plugin's own files.

## What the plugin does on your computer

So you know before you install:

- **Network:** the plugin itself makes no connection and downloads nothing. It starts the `shinjuku` command
  you installed: it looks only in npm's own global folders (only the one you set, when you set one) and starts the first
  install it finds there; it never searches your PATH. The wallet connects to Shinjuku's payment service and to the services you pay, over Tor when
  you chose Tor. Before setup, the install line downloads the wallet from npm directly, not over Tor.
- **Background:** Hermes starts the wallet as a background program while it runs. With Tor on, the wallet
  starts its own Tor in the background on Windows, with no window, from the Tor files in its npm package (each
  checked by its pinned sha256). On Linux, setup says how Tor runs on your computer. If Tor cannot start, the
  wallet pays and sends nothing and says what to do; after it, reload the wallet: `/reload-mcp` in a terminal, or
  Ctrl+K, "Restart gateway" in the Hermes desktop app (if Hermes then asks to restart the shared gateway, choose
  "Restart all"; this also reconnects the other bots that share that gateway).
- **Files:** the wallet keeps its keys, its backup and its records in its own folder in your user account.
  To find the installed wallet, the plugin only reads your npm settings file (`.npmrc` in your home folder, or
  the file `npm_config_userconfig` names, for the folder you set there), npm's own global folders and the `package.json` of the shinjuku package there; it
  stores nothing.
- **No telemetry:** the plugin sends no usage reports.

## Files

- `plugin.json`: the plugin, and the setting that makes Hermes ask before the wallet changes
  anything.
- `mcp.json`: how Hermes starts the wallet: `node launch.mjs`, with no wallet version.
- `launch.mjs`: finds your installed `shinjuku` command and starts `shinjuku mcp` (Windows `shinjuku.cmd mcp`),
  or tells you the install lines when it is not installed yet, and switches to the wallet by itself when setup ends.
- `skills/wallet/SKILL.md`: how Hermes uses the wallet, and the `/shinjuku:wallet` card.
- `LICENSE`: MIT, for the files of this repository only. The wallet (the npm package `shinjuku`) has its own license.
