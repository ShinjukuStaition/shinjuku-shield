#!/usr/bin/env node
// `shinjuku-shielded` is the older npm name of Shinjuku Shield. This package holds no wallet code: it runs the wallet
// package shinjuku-shield (the one package in package.json dependencies) at the exact version named there (publish.yml
// sets it to this package's version), with the same commands, input, output and exit code. It works as
// names/shinjuku/shinjuku.mjs does.
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const [walletPackage] = Object.keys(require("./package.json").dependencies);
const wallet = realpathSync(require.resolve(`${walletPackage}/shinjuku-wallet.mjs`));
// The wallet runs its command when it is the script node started (argv[1]), and its background steps start that same
// file. It reads its version from the package.json and manifest.json beside that file (shinjuku-shield's).
process.argv[1] = wallet;
await import(pathToFileURL(wallet).href);
