# Hermes Agent

Shinjuku works inside Hermes Agent. Hermes gets tools to pay for paid web services from your private balance,
check a price first, read web pages over Tor, and add or send money. Only you hold the keys.

## Private AI in the Hermes desktop app (Windows)

In the Hermes Agent desktop app on Windows, with Tor on (setup's default), ask a private AI model in plain
words. Each answer is paid from your private balance.

1. In the Hermes app, open Capabilities > Plugins > Install from Git, and type
   `https://github.com/ShinjukuStaition/hermes-shinjuku`. Hermes installs the Shinjuku plugin. It needs Git (see "You need" below).
2. Set up the wallet in a new Command Prompt (step 1 below): `npm.cmd install -g shinjuku`, then
   `shinjuku.cmd setup`. Keep the default answers. Setup adds the wallet to Hermes, and an open Hermes shows it
   by itself.
3. In Hermes, ask in plain words which private AI models you can use, then ask one of them a question.

## The stable version (0.3.281)

You need:

- Node.js 24.22.1 or later, or Node.js 22.23.4 or later.
- Linux, or Windows x64 (no WSL needed). macOS is not supported yet.
- Git, for the plugin: Hermes installs every plugin with Git. On Windows, Git for Windows from
  https://git-scm.com/download/win (then open Hermes again); on Linux, Git from your system's packages.

### 1. Set up the wallet

Linux, in a terminal:

```sh
npm install -g shinjuku
shinjuku setup
```

Windows, in PowerShell or Command Prompt:

```bat
npm.cmd install -g shinjuku
shinjuku.cmd setup
```

Or, without installing the `shinjuku` command. Linux:

```sh
npx -y shinjuku setup
```

Windows:

```bat
npx.cmd -y shinjuku setup
```

Setup asks two questions:

- **Use Tor?** Tor hides your internet address from the sites the wallet pays and reads. With Tor, setup
  itself runs over Tor too. On Windows the wallet starts its own Tor in the background.
- **Your own wallet address** (optional; press Enter to skip). The wallet sends money back to you there.

Setup then makes the wallet and downloads the files it needs to make private payments (about 191 MB, checked
before use). It also writes a **recovery file**: copy it to two offline places, then delete it from this
computer. It is the only way to restore the wallet.

### 2. Add the wallet to Hermes

Setup can do this for you. Linux:

```sh
npx -y shinjuku setup --add-to hermes
```

Windows:

```bat
npx.cmd -y shinjuku setup --add-to hermes
```

It writes the `shinjuku` entry into Hermes' `config.yaml` (with `trust: untrusted` and `timeout: 600`), keeps
every other line of the file, and saves a copy of the old file first.

Or do it by hand: open Hermes' `config.yaml` (on Windows `%LOCALAPPDATA%\hermes\config.yaml`, on Linux `~/.hermes/config.yaml`)
and add these lines at the end. If the file already has an `mcp_servers:` line, put the `shinjuku:` part under
that line instead.

```yaml
mcp_servers:
  shinjuku:
    command: npx
    args: ["-y", "--prefer-offline", "--no-audit", "--no-fund", "shinjuku-shield@0.3.281", "mcp"]
    trust: untrusted
    timeout: 600
```

- `trust: untrusted`: Hermes asks you before each wallet call that can move money (Once, for this session, or
  Always). Calls that only read, such as the balance or a price, do not ask. Saying no is safe: nothing happens.
- `timeout: 600`: a payment or a send can take a few minutes. Hermes' own limit is 300 seconds per call.
- A wallet in another folder: add `env: {SHIELDED_WALLET_HOME: "<that folder>"}` under `shinjuku:`.

An open Hermes loads the wallet by itself within a minute. If it does not show: in a Hermes terminal chat, type
`/reload-mcp`; in the Hermes desktop app, press Ctrl+K and choose "Restart gateway" (if Hermes then asks to restart
the shared gateway, choose "Restart all"). Closing the app window does not reload it.

### 3. Use it

Ask in plain words:

- "What is my balance?"
- "Give me an address to add 0.50 USDC to my wallet." The wallet gives a one-time address for USDC on Solana. Send any
  amount from 0.01 USDC to it, from an exchange or a phone wallet.
- "How much does this cost?" with a link, then "Pay for it, at most 0.05 USDC."
- "Send 1 USDC back to my wallet."

If you skipped the terminal setup, ask "What is my balance?" anyway: the wallet asks Hermes to confirm that it
may set up a wallet on this computer, and Hermes shows an Approve button. Approve, and the setup runs.

**What stays private and what does not.** No transaction names your wallet as the payer, and the seller does not learn it. With Tor,
the sites do not see your internet address. Hermes itself still sends your chat to its AI company, and that
company sees what the wallet tools answer (links, prices, amounts, the address you send to). A local model
removes that observer.
