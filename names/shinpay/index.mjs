#!/usr/bin/env node
// shinpay: a name of Shinjuku Shield (private x402 payments). It installs nothing: it prints how to install the wallet.
// No version here: npm's `latest` tag of shinjuku is the stable version (publish.yml sets latest only for the pin), so this
// line stays true after each new stable version without a new shinpay.
process.stdout.write([
  "Shinjuku Shield: a self-custody wallet that pays x402 URLs privately from a shielded USDC balance on Solana.",
  "",
  "This package (shinpay) only points to the wallet. Install the wallet at its stable version:",
  "  npm install -g shinjuku",
  "  shinjuku setup",
  "",
  "The exact stable version, the release notes and the host configs:",
  "  https://github.com/ShinjukuStaition/shinjuku-shield",
  "",
].join("\n"));
