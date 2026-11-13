# Shinjuku private wallet for Hermes

Pay for paid web services privately, read web pages through your private wallet, and keep a private balance
that only you control, from inside Hermes.

**New (November 2026).** The plugin is new. It was checked in the Hermes desktop app 0.23.1 on Windows with
wallet 0.3.217 (the wallet card, a price check, a paid search, a private AI answer and the receipts). This version
starts wallet 0.3.218, which asks you before each price check. It has not been through a full test by new users yet.

What stays private: the seller and the blockchain do not see which wallet paid. If you choose Tor in setup,
the sites and services the wallet reaches do not see your IP address. What does not change: your Hermes chat
still goes to its AI company, and that company reads what the wallet answers in the chat.

## What you need first

- **Hermes.** Install it from Nous Research's own page:
  https://hermes-agent.nousresearch.com/docs/getting-started/installation
- **Node.js 24 LTS** (or 22.21 or newer). Download the installer for your computer from
  https://nodejs.org/en/download and run it. The wallet runs on Node.js.
- **Git.** The Hermes app needs Git to install a plugin: without it, the install stops with "spawn git ENOENT".
  On Windows, download Git for Windows from https://git-scm.com/download/win, run it with its default choices,
  then close Hermes and open it again. On Linux, install Git from your system's packages.

## Before you start: install and set up the wallet once

Do this once, before you use the wallet in Hermes. You do not need to look up the lines: after you install
the plugin, ask Hermes anything about the wallet and it shows you the exact two lines for your computer:

- Linux, in a terminal: `npm install -g shinjuku@0.3.218`, then `shinjuku setup`.
- Windows, in PowerShell or Command Prompt: `npm.cmd install -g shinjuku@0.3.218`, then `shinjuku.cmd setup`.

The first line installs the `shinjuku` command. This download goes directly to npm, before setup asks about
Tor, so npm sees your IP address for it. The second line, setup:

- asks whether to use Tor (yes is the default: then the services the wallet reaches do not see your IP
  address, and setup's own downloads go over Tor),
- creates your private wallet and asks you to save its backup,
- downloads the wallet's proof programs, and Tor when you chose Tor.

The wallet runs with Node.js on Windows (x64) and Linux. It does not run on a Mac yet.

## Install the plugin

1. In the Hermes desktop app: Capabilities → Plugins, search "Shinjuku", open the "shinjuku" card and choose
   Install. Or Capabilities → Plugins → Install from Git, then paste `github.com/ShinjukuStaition/hermes-shinjuku`.
   Or in a terminal:

   ```
   hermes plugins install ShinjukuStaition/hermes-shinjuku
   hermes plugins enable shinjuku
   ```

2. Start Hermes and ask "set up my Shinjuku wallet". Hermes shows the two setup lines above for your
   computer. Run them. Then reload the wallet in Hermes: in a terminal, type `/reload-mcp`; in the Hermes
   desktop app, press Ctrl+K, choose "Restart gateway", then "Restart all"; this also reconnects every other
   Hermes bot on the computer. (Closing the app window does not restart the wallet.)

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

## Update the plugin

When the wallet tells you a new version is out, run this in a terminal (Hermes can stay open):

```
hermes plugins update shinjuku
```

Then start a new chat in Hermes (in the Hermes desktop app: Ctrl+K, "Restart gateway", "Restart all").

A plugin installed before this version (the one that starts wallet 0.3.218) keeps its folder in use while the
wallet runs, so on Windows its first update can stop with "WinError 32" ("being used by another process").
Nothing changed then. Run `hermes gateway stop`, then `hermes plugins update shinjuku` again, then open Hermes
again. Later updates work while Hermes runs. We checked this with Hermes in a terminal, not yet in the Hermes
desktop app.

## What the plugin does on your computer

So you know before you install:

- **Network:** the plugin itself downloads nothing. It starts the wallet that setup installed; when that
  wallet is not in npm's usual folders, it asks npm, with npm offline, where your folders are. The wallet connects to Shinjuku's payment service and to the services you pay, over Tor when
  you chose Tor. Before setup, the first setup line downloads the wallet from npm directly, not over Tor.
- **Background:** Hermes starts the wallet as a background program while it runs. With Tor on, the wallet
  starts its own Tor in the background on Windows, with no window: it downloads Tor once from torproject.org
  and checks its pinned checksum. On Linux, or if that Tor cannot start, the wallet pays and sends nothing and shows the one command that starts Tor; after it, reload the wallet: `/reload-mcp` in a
  terminal, or Ctrl+K, "Restart gateway", "Restart all" in the Hermes desktop app (it also reconnects your other
  Hermes bots).
- **Files:** the wallet keeps its keys, its backup and its records in its own folder in your user account.
  The plugin reads only npm's folders, to find the installed wallet; it stores nothing.
- **No telemetry:** the plugin sends no usage reports.

## Files

- `plugin.json`: the plugin, and the setting that makes Hermes ask before the wallet changes
  anything.
- `mcp.json`: how Hermes starts the wallet; the wallet version is named here and nowhere else.
- `launch.mjs`: starts the installed wallet of that version, or tells you the setup lines when it is
  not installed yet.
- `skills/wallet/SKILL.md`: how Hermes uses the wallet, and the `/shinjuku:wallet` card.
- `LICENSE`: MIT, for the files of this repository only. The wallet (the npm package `shinjuku`) has its own license.
