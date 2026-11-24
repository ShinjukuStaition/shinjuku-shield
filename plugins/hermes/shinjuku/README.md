# Shinjuku private wallet for Hermes

Pay for paid web services privately, read web pages through your private wallet, and keep a private balance
that only you control, from inside Hermes.

What stays private: the seller and the blockchain do not see which wallet paid. If you choose Tor in setup,
the sites and services the wallet reaches do not see your IP address. What does not change: your Hermes chat
still goes to its AI company, and that company reads what the wallet answers in the chat.

## What you need first

- **Hermes.** Install it from Nous Research's own page:
  https://hermes-agent.nousresearch.com/docs/getting-started/installation
- **Node.js 24 LTS** (24.22.1 or newer; or 22.23.4 or newer). Download the installer for your computer from
  https://nodejs.org/en/download and run it. It installs npm too, which installs the wallet.
- **Git.** The Hermes app needs Git to install a plugin: without it, the install stops with "spawn git ENOENT".
  On Windows, download Git for Windows from https://git-scm.com/download/win, run it with its default choices,
  then close Hermes and open it again. On Linux, install Git from your system's packages.

## Install the wallet once

In a terminal (on Windows: PowerShell or Command Prompt):

- Linux: `npm install -g shinjuku`, then `shinjuku setup`
- Windows: `npm.cmd install -g shinjuku`, then `shinjuku.cmd setup`

On Linux, if npm says EACCES (no permission to write its global folder), install it in your own folder:
`npm config set prefix ~/.local`, then `npm install -g shinjuku`, then `~/.local/bin/shinjuku setup`. npm then
installs and updates the wallet there, and the plugin finds it there.

Setup asks "Use Tor?" (yes is the default: then the services the wallet reaches do not see your IP address,
and the wallet's own downloads go over Tor), creates your private wallet and downloads its proof programs
(about 191 MB, a few minutes). The install itself goes directly to npm, before you choose Tor, so npm sees
your IP address for it.

The wallet runs on Windows and Linux with Node.js. It does not run on a Mac yet.

The plugin starts the wallet you installed. It never installs or updates the wallet: when the wallet says a
new version is out, run the same install line again (Linux `npm install -g shinjuku`; Windows
`npm.cmd install -g shinjuku`),
then reload the wallet in Hermes: `/reload-mcp` in a terminal; in the Hermes desktop app, Ctrl+K, "Restart gateway",
then "Restart all". On Linux, if the wallet runs from a folder that is not npm's usual one, the plugin tells Hermes the update lines for
that folder: `npm config set prefix` with that folder, then the install line. Run both, so the update reaches that wallet.

## Install the plugin

1. In a terminal:

   ```
   hermes plugins install ShinjukuStaition/hermes-shinjuku
   hermes plugins enable shinjuku
   ```

2. Start Hermes (if it is open: Ctrl+K, "Restart gateway"; in the terminal app `/reload-mcp`). The first start after
   the install can take longer than Hermes waits, because Hermes first copies its own Node.js. If Hermes then shows
   "MCP server shinjuku is not connected (CancelledError)", or answers that it has no Shinjuku tools, restart the
   gateway once more the same way. The second start connects.

3. Ask "what is my Shinjuku balance". If the wallet is not installed yet, Hermes says so, with the install lines
   above.

4. Type `/shinjuku:wallet` to see your wallet card. It says whether Tor is on.

## Use it

Ask in plain words:

- "What does this API cost?" with its address: checks the price, pays nothing.
- "Pay for this service, at most 5 cents": pays privately from your balance.
- "Read this page through my wallet": fetches the page; a free page costs nothing. It hides your IP
  address from the page only when Tor is on.
- "Show my receipts", "Add funds", "Send 2 USDC back to my wallet".

Hermes asks for your OK before each wallet call that can change something (a payment, a send, a stop, a
backup). That is the wallet asking, and you can say no.

## What the plugin does on your computer

So you know before you install:

- **Network:** the plugin itself makes no connection and downloads nothing. It starts the wallet you
  installed (the `shinjuku` command, the npm package shinjuku). The wallet connects to Shinjuku's payment
  service and to the services you pay, over Tor when you chose Tor.
- **Background:** Hermes starts the wallet as a background program while it runs. With Tor on, the wallet
  starts its own Tor in the background on Windows, with no window. On Linux, setup says how Tor runs on your
  computer.
- **Files:** the wallet keeps its keys, its backup and its records in its own folder in your user account.
  The plugin writes nothing. To find the installed wallet it only reads your npm settings file (`.npmrc` in your
  home folder, or the file `npm_config_userconfig` names, for the folder you set there), npm's own global folders (only the prefix you set, when you set one;
  else on Windows `%APPDATA%\npm`, then the folder of the Node that runs it; on Linux npm's folder for that Node (the folder above its `bin`), then
  `~/.local`, then `/usr/local`) and the `package.json` of the shinjuku package there; it never
  searches your PATH.
- **No telemetry:** the plugin sends no usage reports.

## Files

- `shinjuku/plugin.json`: the plugin, and the setting that makes Hermes ask before the wallet changes
  anything.
- `shinjuku/mcp.json`: how Hermes starts the wallet: `node launch.mjs`, with no wallet version.
- `shinjuku/launch.mjs`: finds your installed `shinjuku` command and starts `shinjuku mcp` (Windows
  `shinjuku.cmd mcp`); when there is none, it offers one tool that only says how to install it (on a Mac, that
  the wallet does not run there yet).
- `shinjuku/skills/wallet/SKILL.md`: how Hermes uses the wallet, and the `/shinjuku:wallet` card.
