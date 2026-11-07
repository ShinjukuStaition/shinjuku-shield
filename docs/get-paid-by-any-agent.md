# Get paid by any AI agent or app

> **Not offered yet.** No live run of this path has passed. Until Shinjuku turns it on, `shinjuku seller setup` shows
> this choice as "not offered yet" and refuses it. Do not plan a business on it yet. The fee is not decided yet, and
> this page will name it before the path is offered.

You have a web API. With this path, an AI agent or an app can pay it by itself, and the money ends up in your private
balance.

x402 is the common way for apps and AI agents to pay a web address by themselves. Any wallet that speaks x402 can pay
you with USDC on Solana. The buyer does not need Shinjuku.

## What you need

- A Node.js server that uses Express, with `"type": "module"` in its `package.json`. It must run Node.js 22.21 or later.
- A public web address, so buyers can reach your server.
- One terminal on the computer that runs your server.

## Set it up

1. Install the wallet and make it. It asks a few questions, and it tells you how to back up your wallet:

   ```sh
   npm install -g shinjuku@next
   shinjuku setup
   ```

   On Windows, run this in Command Prompt instead: `npx -y shinjuku@next setup`.

2. Set up the seller:

   ```sh
   shinjuku seller setup
   ```

   On Windows, use `npx -y shinjuku@next seller setup`. Setup asks:

   - whether to use Tor. Tor hides your computer's IP address from Shinjuku.
   - who may pay your API. Answer **1** (any AI agent or app that pays with x402).
   - which path buyers pay for, for example `/weather`.
   - its price in USDC. Setup names the lowest and the highest price that Shinjuku takes.

3. Setup prints the lines for your server, with your own path and price. **Use those lines.** The first one is an
   `npm install` line for your server's folder. It names the right version of each package.

   The lines to add to your server file look like this:

   ```js
   import { createShinjukuSeller } from "shinjuku-shield/seller";

   // After `const app = express();`, before your routes:
   const shinjuku = await createShinjukuSeller({ routes: { "GET /weather": { price: "$0.01" } } });
   app.use(shinjuku.middleware);
   ```

4. Start your server as you always do. A request to your path with no payment gets the price. A paid request reaches
   your route.

To sell more routes, add them to `routes`. Each one is `"GET /path"` or `"POST /path"`, with its own `price`.

Run one server process per wallet. A second process is refused.

## See your sales

```sh
shinjuku seller status
```

It lists each sale: on its way, or paid into your private balance. Your balance shows the money that has arrived. A sale
moves into your private balance shortly after the buyer pays. We have not measured that time yet, so this page names none.

## What others can see

- **Anyone** can see each buyer's payment on the chain: who paid, and how much. It goes to Shinjuku's one shared account,
  not to an address of yours.
- **Shinjuku** knows which sale is yours.
- **Your buyers** see your web address and your price, like any web API.
- **Nobody on the chain** can see a sale arrive in your private balance as a payment to you.

If you want a sale where the chain does not show the buyer, ask for Shinjuku Shield buyers:
[Sell with Shinjuku Shield](sell-with-shinjuku.md).

## Your keys

Your server holds one key file. That key names your sales and reads their state. It cannot spend your balance, and it
cannot change where your sales are paid.

- If your server stops, Shinjuku still pays what it owes you.
- If someone changes the receiving address in that file, your server's start stops. Then `shinjuku seller setup` refuses
  that address, tells you, and makes a new address of yours.
- If someone steals the key file, they can name sales as yours and read their state. Move to a new seller wallet.

Your wallet's backup covers every key of the seller.

## If something goes wrong

- **The buyer's payment did not complete on the chain.** That sale shows as not completed. No money comes from it.
- **Your server asks for the install line.** Run the line it prints, in your server's folder.
- **Your server says that Shinjuku does not take these sales right now.** Your paid routes did not start, and nothing was
  changed. Start your server again later.
- **Setup says that Shinjuku did not answer.** Nothing was changed. Check your internet connection and run setup again.
- **Your server or its disk is lost.** Restore your wallet from its backup, run `shinjuku seller setup`, and start your
  server. What Shinjuku owes you, it pays without your server.

Your server keeps one record per payment, so one payment gets one answer. These limits remain:

- A payment is public once it lands. If Shinjuku's answer to your server is lost, the same payment sent again gets its one
  answer, and someone who copies the payment fast could take that answer first.
- If the buyer's copy of your answer is lost, the same payment sent again is refused. The wallet never asks a buyer to pay
  again. Settle it with the buyer yourself.
- If your disk fails while it saves a finished sale, your server still answers the buyer, who paid. After that failure and a
  restart, that payment can get one more answer. An old copy of your sales record can do the same.
- After a restore with no sales record, your server refuses payments that Shinjuku already settled, also one whose answer
  was lost.
