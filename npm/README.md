# Shinjuku Shield

Shinjuku Shield is a private wallet on your own computer. It pays for paid
web services and AI answers from your private balance, so the payment does
not show who paid. It works inside your AI app (Claude, Cursor, Codex) and in
a terminal. Only you hold the keys: they never leave your computer.

This is version {{VERSION}}. The command is `shinjuku`.

## Set up

```sh
npx -y shinjuku@{{VERSION}} setup
```

Setup does every step for you:

- It makes your wallet on this computer, with a passphrase file that only you
  can read.
- It asks "Use Tor?" (Tor hides your internet address; on by default). With
  Tor, start Tor yourself before you use the wallet, with an HTTP tunnel port
  (add `HTTPTunnelPort 127.0.0.1:9080` to your torrc); the wallet prints the
  steps when Tor is not running.
- It downloads and checks the files the wallet needs (about 200 MB), so later
  payments do not wait for them.
- It offers to install the `shinjuku` command. On Windows it also puts that
  command on your PATH: open a new window after setup to type `shinjuku`.
- It writes a recovery file. Copy it to two offline places (for example two
  USB drives), then delete it from this computer. It is the only way to get
  your wallet back if this computer is lost.

Run setup again at any time: it never changes a wallet that exists.

## Add it to your AI app

Claude Code: run this line once. Setup then adds the wallet to Claude Code:

```sh
shinjuku setup --add-to claude-code
```

Then reconnect the wallet in Claude Code: type `/mcp`, pick `shinjuku`, and
choose Reconnect.

## Add money

Ask your AI app: "Add 0.50 USDC to my private balance." It gives you a
one-time address. Send USDC on Solana to it from any wallet or exchange. Any
amount from 0.01 USDC works, and you need no SOL. The USDC becomes private by
itself.

In a terminal: `shinjuku add-funds`.

## Pay

Ask your AI app in plain words, for example:

- "Find a paid weather service."
- "What does this link cost?" (nothing is paid)
- "Pay for this link."

Each answer says what happened and what to do next. A payment that the seller
does not take comes back to your private balance by itself.

Spending limits are off by default: only your balance limits a payment. To
set limits, run setup again with `--max-payment` (the most one payment may
cost) and `--max-session` (the most in any 24 hours), in USDC: `0.05` is 5
cents.

## Private AI

Each AI answer is paid from your private balance, through Tor. The AI service
sees your words, but not your internet address, and the payment does not show
who paid. The wallet keeps no copy of a conversation.

- `shinjuku chat`: chat with an AI in this terminal. Each answer costs at most
  0.05 USDC and each chat at most 1 USDC, unless you change these limits.
- `shinjuku infer start`: a private AI address for another app on this
  computer (an app that uses the OpenAI format). It prints the address and a
  key to put in that app. It keeps running after you close the terminal.
  `shinjuku infer status` shows it, and `shinjuku infer stop` stops it.
- In your AI app, ask "Ask a private AI: ..." for one private answer.

## The `shinjuku` command

Every wallet command starts with `shinjuku`, for example `shinjuku balance`,
`shinjuku add-funds` or `shinjuku chat`. `shinjuku help` lists them all.

## What you need

- Windows (x64) or Linux. macOS is not supported yet: setup says so before it
  asks anything.
- Node.js 22.21 or later, or Node.js 24 or later (not Node.js 23).
  `node --version` shows yours.

## If setup cannot add the wallet to your app

Add it yourself. The name of the wallet in your app is `shinjuku`.

Claude Code:

```sh
claude mcp add --scope user shinjuku -- npx -y --prefer-offline --no-audit --no-fund shinjuku-shield@{{VERSION}} mcp
```

`--prefer-offline` runs the copy of the wallet that npm saved. If npm has not saved it yet, that start asks
npm once, directly, so npm sees your IP address that one time; later starts ask npm nothing.

## For builders: check what you install

The package has no install scripts. Do not let other users write to the npm
folders (`node_modules/.bin` and the global npm folder): the wallet in them
holds your keys.

This package holds one wallet release, unchanged. The `shinjukuRelease` and
`shinjukuSha256` fields in `package.json` name that release. Compare the hash
with the Releases table in
[ShinjukuStaition/shinjuku-shield](https://github.com/ShinjukuStaition/shinjuku-shield#releases).
Versions are published from GitHub Actions with npm provenance.

`shinjuku-shield` is the package that holds the wallet. `shinjuku-shielded`
{{VERSION}}, its older name, runs this package at the same version, so wallets
installed under that name keep updating. New installs use `shinjuku`.

The full guide is
[ShinjukuStaition/shinjuku-shield](https://github.com/ShinjukuStaition/shinjuku-shield).

## License

`LICENSE.txt` (the Shinjuku Shielded wallet license, all rights reserved) and
`THIRD_PARTY_NOTICES.txt` (the open-source packages inside the file) ship
unchanged from the release. `manifest.json` names the source commit and every
bundled package.
