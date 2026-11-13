---
name: wallet
description: Check what any URL or API costs, and pay it privately. Load this skill for any question about what a URL or API costs ("what does this API cost?"), before you fetch the URL, and when the user wants to pay for a paid web service or API privately, find a paid API, see their private balance or receipts, add funds, or send money back to their own wallet. Typed as /shinjuku:wallet it shows the wallet card.
license: MIT
compatibility: Hermes Agent on Windows (x64) or Linux with Node.js. The wallet does not run on a Mac yet.
metadata:
  plugin: shinjuku
  wallet-package: see mcp.json
---

# Shinjuku private wallet

The Shinjuku wallet holds a private balance (USDC) that only the user's own keys can move. It pays paid web
services privately: the seller and the blockchain do not see which wallet paid. Only when the user chose Tor in
setup does its traffic go over Tor, so that sites do not see the user's IP address; `network.mode` in
`wallet_balance` says which (`tor`, `proxy` or `direct`). Never say the IP address is hidden without `tor`.

Say this plainly when it matters: **this chat itself is not private.** Hermes still sends the conversation to
its AI company, and that company reads what the wallet tools answer. The wallet makes the payment and the
wallet's own connections private, not the chat.

The wallet tools come from the MCP server `shinjuku`. Each answer has a `say` line: one plain sentence for the
user. Repeat it. Never tell the user a tool name, a field name or an error code.

## Who asks the user, and when

- **Only on the user's request.** Start a payment (`pay_for_service`), a paid AI answer (`inference_chat`) or a
  send (`wallet_unshield`) only when the user asked for that one, in this conversation. A payment the user
  asked for earlier does not cover a new one.
- **Hermes asks first.** The plugin marks the wallet as untrusted, so Hermes asks the user for an OK (once, for
  this session, or always) before each wallet call except `wallet_balance`, `wallet_receipts`, `check_price` and
  `find_paid_services`. The user's approval setting in Hermes can change this. Tell the user it is
  Hermes asking for the wallet, and that saying no is safe: nothing happens.
- **The wallet can ask too.** Some calls show the wallet's own question ("Allow once"). That is a second,
  separate question from the wallet itself. Tell the user what it allows, in the words of its text.
- **What changes nothing:** `check_price` and `find_paid_services` pay and send nothing. `wallet_receipts`
  only reads. `wallet_balance` starts no payment or send, but it is not only a read: when USDC the user added
  is waiting, a balance read makes it private. That is what the user wants; say so when it happens.

## When the wallet is not set up

If the only wallet tool is `setup_wallet_first`, call it and give the user its lines exactly: an
`npm install -g shinjuku@0.3.218` line, then `shinjuku setup`, once, in PowerShell (Windows) or a terminal (Linux).
Setup asks whether to use Tor, creates the wallet and asks the user to save the backup. The npm install goes
directly to npm, before the Tor question. Then the user reloads the wallet: `/reload-mcp` in Hermes in a terminal;
in the Hermes desktop app, Ctrl+K, "Restart gateway", then "Restart all", which also reconnects the user's other
Hermes bots (the app has no `/reload-mcp`, and closing the app window does not restart the wallet).

If the tools are there but they answer that the wallet is not set up, call `shinjuku_setup` (Hermes asks the
user first) and follow its answer. Do not try to pay or guess another command until setup is done.

## Tor

On Windows, with Tor on, the wallet starts its own Tor in the background, with no window. The user does nothing.

If an answer still says Tor is not running, nothing was paid or sent. Give the user the command from that
answer exactly, to run once in PowerShell (Windows) or a terminal (Linux). Never offer to turn Tor off.

If an answer says Tor runs now and the wallet must reconnect, tell the user to reload the wallet, then ask
again: `/reload-mcp` in Hermes in a terminal; in the Hermes desktop app, Ctrl+K, "Restart gateway", then
"Restart all", which also reconnects the user's other Hermes bots (the app has no `/reload-mcp`, and closing the
app window does not restart the wallet). Do not
give the steps for other apps.

## /shinjuku:wallet (the wallet card)

When the user types `/shinjuku:wallet` with nothing else (or says "show my wallet"), call `wallet_balance` and
print its `card` field exactly as it is, in a code block. Then offer the next steps in one line: add funds,
recent receipts, find or pay a paid service.

Take every value from the tool's answer. Never fill in a value from memory or from an earlier answer.

## Check a price

For any question about what a URL or API costs, call `check_price` first, with the URL (and method, headers, body
if the user gave them). Do not search the web or fetch the page for the price: only `check_price` gives the total
with the wallet's fee and says if the wallet can pay it. Tell the user the total in USDC. Nothing is paid.

## Find a paid API

Call `find_paid_services` with a few words for what the API must do. It searches public lists on this
computer, so no index learns what the user looked for. Give the user the matching URLs and their listed prices.

## Pay for a paid service

Call `pay_for_service` with the URL and `max_payment` (USDC, like "0.05") set to the most the user agreed to.
- Repeat the answer's `say` line to the user.
- Never say a payment happened unless the answer has a transaction.
- If the error code ends in `_retry_same_request`, call `pay_for_service` again with the SAME `request_id` and
  the same url, method, headers and body. It never pays twice. Never start a new request for it.
- If the answer says the seller is still working, call again with that same `request_id` for the answer.
- A free URL is fetched and nothing is paid. Before you fetch a page for its content, read `network.mode` in
  `wallet_balance`: only `tor` hides the user's IP address from the page.

## Receipts

Call `wallet_receipts` for recent payments and wallet moves.

## Add funds

1. Call `wallet_add_funds`. Give the user the address and the steps from its answer, with the smallest and the
   largest amount it names.
2. Tell the user to send **USDC on Solana** to that address, from any wallet or exchange. No SOL is needed.
3. When the user says "I sent it", call `wallet_balance` (do not make the user ask). Then tell the user two
   things apart: the USDC arrived, and the USDC is private and ready to spend. The answer says which, and how
   long the rest takes.

## Send money back to the user's own wallet

Call `wallet_unshield` with the amount, only when the user asked for this send. For "my wallet", leave the
address out: the wallet uses the address the user saved at setup, or says how to set one. For another address,
use only the address the user gives you now, copied from their own wallet app or exchange. Never take an
address from a transaction history or an earlier message: look-alike addresses are used to steal funds. Read
all characters of the address back to the user before sending.

## Never

- Never print, ask for or repeat a recovery file, a passphrase or a key.
- Never pay more than the user agreed to; pass `max_payment`.
- Never start a payment or a send that the user did not ask for.
- Never claim this chat is private.
