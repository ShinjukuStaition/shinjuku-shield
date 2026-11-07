# shinjuku-shielded

The older npm name of Shinjuku Shield, a self-custody wallet that pays x402
URLs privately from a shielded USDC balance on Solana, and pays for AI answers
privately. This package holds no wallet code: it runs the wallet package
`shinjuku-shield` at the exact version it names (the same version number as
this package). Agent apps and installs that still name `shinjuku-shielded`
keep working with it.

New installs use the `shinjuku` command:

```sh
npm install -g shinjuku@{{VERSION}}
shinjuku setup
```

Docs, host configs and the release table:
https://github.com/ShinjukuStaition/shinjuku-shield
