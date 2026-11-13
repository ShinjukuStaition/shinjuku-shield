#!/usr/bin/env node
// shinpay: a name of Shinjuku Shield (private x402 payments). It installs nothing: it prints how to install the wallet.
// No version here: npm's `latest` tag of shinjuku is the stable version (publish.yml sets latest only for the pin), so this
// line stays true after each new stable version without a new shinpay. Windows: npm.cmd and shinjuku.cmd, which also run
// in Windows PowerShell (its default setting refuses npm's .ps1 command files).
const cmd = process.platform === "win32" ? ".cmd" : "";
process.stdout.write([
  "Shinjuku Shield: a self-custody wallet that pays x402 URLs privately from a shielded USDC balance on Solana.",
  "",
  "This package (shinpay) only points to the wallet. Install the wallet at its stable version:",
  `  npm${cmd} install -g shinjuku`,
  `  shinjuku${cmd} setup`,
  "",
  "The exact stable version, the release notes and the host configs:",
  "  https://github.com/ShinjukuStaition/shinjuku-shield",
  "",
].join("\n"));
