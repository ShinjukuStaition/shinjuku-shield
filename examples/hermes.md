# Hermes Agent

Shinjuku works inside Hermes Agent. Hermes gets tools to pay for paid web services from your private balance,
check a price first, read web pages over Tor, and add or send money. Only you hold the keys.

## The Hermes plugin (one install)

The Shinjuku plugin adds the wallet to Hermes and teaches Hermes how to use it, including the
`/shinjuku:wallet` card. Set up the wallet first (step 1 below), then install the plugin from this repository:

```sh
hermes plugins install ShinjukuStaition/shinjuku-shield/plugins/hermes/shinjuku
hermes plugins enable shinjuku
```

Its README lists every step and what the plugin does on your computer:
[plugins/hermes/shinjuku](../plugins/hermes/shinjuku/README.md). Step 2 below adds the wallet by hand instead.

## The stable version (0.3.210)

You need:

- Node.js 22.21 or later, or Node.js 24 or later.
- Linux, or Windows x64 (no WSL needed). macOS is not supported yet.

### 1. Set up the wallet in a terminal

```sh
npm install -g shinjuku@0.3.210
shinjuku setup
```

Or, without installing the `shinjuku` command:

```sh
npx -y --no-audit --no-fund shinjuku-shield@0.3.210 setup
```

Setup asks two questions:

- **Use Tor?** Tor hides your internet address from the sites the wallet pays and reads. With Tor, setup
  itself runs over Tor too. On Windows the wallet starts its own Tor in the background.
- **Your own wallet address** (optional; press Enter to skip). The wallet sends money back to you there.

Setup then makes the wallet and downloads the files it needs to make private payments (about 191 MB, checked
before use). It also writes a **recovery file**: copy it to two offline places, then delete it from this
computer. It is the only way to restore the wallet.

### 2. Add the wallet to Hermes

Setup can do this for you:

```sh
npx -y shinjuku@0.3.210 setup --add-to hermes
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
    args: ["-y", "--no-audit", "--no-fund", "shinjuku-shield@0.3.210", "mcp"]
    trust: untrusted
    timeout: 600
```

- `trust: untrusted`: Hermes asks you before each wallet call that can move money (Once, for this session, or
  Always). Calls that only read, such as the balance or a price, do not ask. Saying no is safe: nothing happens.
- `timeout: 600`: a payment or a send can take a few minutes. Hermes' own limit is 300 seconds per call.
- A wallet in another folder: add `env: {SHIELDED_WALLET_HOME: "<that folder>"}` under `shinjuku:`.

Then type `/reload-mcp` in Hermes (or start Hermes again).

### 3. Use it

Ask in plain words:

- "What is my balance?"
- "Add 0.50 USDC to my private balance." The wallet gives a one-time address for USDC on Solana. Send any
  amount from 0.01 USDC to it, from an exchange or a phone wallet.
- "How much does this cost?" with a link, then "Pay for it, at most 0.05 USDC."
- "Send 1 USDC back to my wallet."

If you skipped the terminal setup, ask "What is my balance?" anyway: the wallet asks Hermes to confirm that it
may set up a wallet on this computer, and Hermes shows an Approve button. Approve, and the setup runs.

**What stays private and what does not.** The seller and the blockchain do not see which wallet paid. With Tor,
the sites do not see your internet address. Hermes itself still sends your chat to its AI company, and that
company sees what the wallet tools answer (links, prices, amounts, the address you send to). A local model
removes that observer.
