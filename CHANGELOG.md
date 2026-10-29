# Changelog

The Shinjuku Shielded MCP server is the `mcp` command of the wallet file
`shinjuku-wallet.mjs`. Each wallet release has its SHA-256 in the
[Releases table](README.md#releases) of this repository. Dates are UTC.

## 2026-10-29: wallet release `885a1cb2`, npm `shinjuku@0.3.124` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.123 and these:

### Fixed

- Asking again for a paid request could pay twice. After you allowed a payment
  once and the seller failed, a second call of the same request now sends the
  same payment again or gives back its saved answer. It never pays more than
  the first payment. It never says "Nothing was paid" for a request that
  already has a payment, and it gives no new request id for it. This also
  holds after the wallet restarts and in the AI chat.
- A request that you closed now says "this request was closed earlier". It
  no longer loops on "Ask again".
- A request id that another unfinished request uses, with nothing sent yet,
  now says so: "Nothing was paid: another request has this id and X USDC set
  aside." It offers two steps: finish that request, or close it and send
  yours. Before, it said only "Ask again to pay for this one".
- A payment that is ready but was never sent now says so ("Nothing was sent: a
  payment of X USDC is prepared") and names the same request. You can send it,
  or cancel it first. This also holds for one that an older version of the
  wallet made ready.
- Cancel now gives your spending room back for a request that was never sent,
  and for a sent one that the wallet proved can never arrive.
- A payment that the wallet made ready but never sent now follows the
  limits you have now. Before, it was sent with no check. Above your limit
  for one payment, your AI app asks "Allow it once?" first: a yes sends
  that same payment, never a second one, and a no sends nothing.
  `shinjuku curl` asks "Pay X USDC for ...? [y/N]" first. Above a limit
  that you lowered with `shinjuku limits` after the payment was made ready,
  and in `shinjuku infer`, `shinjuku pay`, `shinjuku chat` and the local AI
  address, the wallet stops, sends nothing, and says how to raise the limit
  or close the payment. This also holds for such a payment that an older
  version of the wallet made ready.
- A payment that was made ready but whose price offer ran out before it
  was sent can never be sent. The wallet now says so at once, with no
  "Allow it once?" question, and tells you to close it before you try
  again: in your AI app, in the terminal, in the AI chat and at the local
  AI address (HTTP 402, not 500). Before, no answer said what happened.
- A payment that the wallet made ready but never sent now also stays
  inside your limit for all payments together. Above that limit, the
  wallet sends nothing and does not ask: raise the limit with
  `shinjuku limits`, or cancel the request.
- Cancel now closes every payment that is ready but was never sent.
  Before, it said there was nothing to close for some of them. Cancel
  gives your spending room back, and the wallet never sends that request
  after it.
- `shinjuku cancel` now takes the request id that you paid with, also for
  a payment that Shinjuku makes for you.
- `shinjuku cancel` for a payment that it cannot close printed only an
  error code. It now says why and what to do next: the payment is finished
  and paid, it never went through (pay again with a new request id if you
  still want it), it was paid to Shinjuku (run the command that started it
  again, with the same request id; it never pays twice), or this wallet has
  no payment with that id.
- A payment that Shinjuku makes for you, whose first step never went
  through, now ends with nothing paid. The wallet does not send it to the
  seller again, and it does not count against your limit for one seller
  site. Your balance no longer shows a refund for it. Asking for the same
  request again says that nothing was paid, and gives the earlier answer
  when there is one. Cancel now says the same: nothing was paid and nothing
  comes back. Before, it could say that the payment was finished and paid,
  or that a refund was coming.
- A payment that an earlier run of the wallet sent, and that this run
  finishes, now counts once: in your 24-hour limit, not again in the limit of
  this run.
- After a seller refused a payment, the wallet waited up to 8 seconds and then
  still said "not certain". It now answers within about 1 second. Your
  receipts and your balance show the result later.
- A balance that the wallet is checking again now says so: "Your last known
  balance is X USDC private; the wallet is checking it now. Ask again in about
  30 seconds." A refund that arrived no longer shows as "coming".
- Short answers in your AI app were cut in the middle of a sentence. The
  wallet now drops whole sentences, never part of one.
- A wallet with missing setup files said that a standard USDC payment could
  still work. That was false: every payment needs the setup files. It now says
  one sentence: run `shinjuku setup` in a terminal, then reconnect the wallet.
  Every message now calls these files "setup files".

### Changed: paying more than your limit ("Allow it once?")

- When a request asks to pay more than your limit for one payment, the wallet
  reads the price first. A price inside your limit pays with no question. A
  price above it asks you once, and the question shows the price and the fee
  apart. Your yes covers that total only. Before, the wallet asked before it
  knew the price.
- The wallet asks only when a yes can pay. When your 24-hour limit or another
  limit would still stop the payment, the answer names that limit and what
  works, with no question. When your saved balance is below the total, it
  says so, with no question.
- A yes now pays in a wallet whose limits you set with `shinjuku limits`.
  Before, the wallet's own check refused the payment after your yes. A yes
  never lifts your total limit for all payments.
- A yes is kept for the same web address only. Another page of the same site
  asks again. A new question for a request removes an earlier yes for it.
- When the time for a call runs out while the question is open, the wallet
  tells your AI app to close the question and pays nothing. When your AI app
  stops the call, the same happens. A new call opens a new question.
- In the AI chat, the question shows the most that an answer can cost plus
  the fee, and your yes covers that total. An answer that would cost more is
  refused with your real limit named. The 24-hour limit no longer stops an
  answer that it can pay. A refusal suggests a shorter answer or a cheaper
  model. The chat names the AI service, not "this seller".
- When the wallet offers a new request id, it now says to use it only if you
  still want that request.
- The limit for one seller site in 24 hours now counts the payments that
  Shinjuku makes for you by the seller's site, at the price plus the fee.
  Before, it counted them under Shinjuku's own site.

### Changed: AI answers (`shinjuku chat`, `shinjuku infer`, and the local AI address for your apps)

- A private AI chat can now pay an AI service that offers both a private
  payment and a standard USDC payment: Shinjuku pays it for you. Before, the
  chat refused that service. A service that offers only a private payment is
  refused, as before.
- A request that your app sends again with the same request key
  (`Idempotency-Key`) to a restarted local AI address now gets its first
  payment's answer and pays nothing more. Before, it got a limit refusal.
  `shinjuku infer --request-id` with a held id finishes or replays its own
  payment at a lower `--max-payment`.
- When Shinjuku cannot take a payment, the chat, `shinjuku infer` and the
  local AI address say what happened in plain words, with one step: another
  model, try again in about 5 seconds, or run setup and restart. The local AI
  address answers HTTP 402, or 503 when Shinjuku cannot take a payment now,
  not 500.
- A request id that is already in use is now explained by what that request
  did: a payment that left (with its amount), a payment that is prepared and
  not sent, an earlier try that is not finished (close it first), or a
  closed request. Each answer gives the step that works. The chat's last
  error line no longer ends in a code. For a payment that is ready but not
  sent yet, it says so, with `/retry` (it sends that same payment, never a
  second one) and the close step.
- `shinjuku infer` and the local AI address now measure a payment that is
  ready but was never sent at its own amount, not at the most that the
  answer could cost. When the `--max-payment` that you typed is below that
  amount or above your limits, the next step names `--max-payment` at that
  amount.

### Changed: words

- In `shinjuku curl`, the errors and the terminal hints, plain words replace
  the payment type names: "a private payment", "a standard USDC payment" and
  "hidden-amount payments". The `shinjuku curl` paid line now says "paid X
  USDC from your private balance in transaction S (the chain does not show
  who paid)", or "Shinjuku paid the seller for you".
- A seller that takes too long to charge now gets: "This seller takes too
  long to charge, so it cannot be paid. Not known yet whether your X USDC
  comes back. Nothing to do now." Before, it said the money "comes back if
  the charge failed", which you could not check.
- A token send whose saved record cannot be read now says that nothing moved
  in this call and that you can start a new send.
- `shinjuku balance --refresh` and `shinjuku recover` with `--rpc-file` now
  keep your RPC address in your file. Before, they passed it on as a typed
  address and printed a warning that told you to use `--rpc-file`, which
  you already did.
- `shinjuku pay` and `shinjuku unshield` with `--rpc-file` now send their
  chain reads to your own RPC. Before, some of these reads still went to
  Shinjuku's server. The public payment history that the wallet checks
  still comes from Shinjuku's history service unless you add
  `--history-rpc own`.
- `shinjuku unshield` with your RPC address in `UNDERMARKET_SOLANA_RPC_URL`
  no longer prints a warning about `--rpc` after the send.
- The 24-hour limit message now names `shinjuku limits`.
- When a payment is above your limit for one payment, or above what is left
  of your limit for all payments together, the answer in your AI app now
  names that limit and the amount, not an error code.
- `shinjuku curl`, `balance`, `pay`, `setup`, `infer`, `chat` and the other
  commands print their progress paragraphs only with `--verbose`. An answer
  that you save with `> file` no longer fills the terminal.

### Changed: the terminal home screen

- A new opening animation in the brand colors, with the shield mark. It ends
  on "SENDER HIDDEN" (nothing is paid at the opening). It takes about 3
  seconds.
- The home screen says SHINJUKU SHIELD and shows your data sooner. The shield
  mark now shows in a standard 120 x 30 terminal window, and every line fits
  from 80 columns.
- The home screen shows which AI apps use this wallet. With Tor off, it says
  that your internet address is not hidden. A wallet that opens only with its
  passphrase says that your AI app cannot open it.
- Plain labels: "[u] send money out", "only you hold your keys", "last
  payments".
- The key `c` ("connect an agent") now adds the wallet only to the AI app you
  pick. It then tells you to restart that app and ask "what is my balance".
  Before, it ran the full setup.

## 2026-10-28: wallet release `916f76a4`, npm `shinjuku@0.3.123` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.122 and these:

- `shinjuku curl` with a `--max-payment` above your own limit stops at once
  and says so. Before, it first asked the site for its price, which took
  about 6 seconds over Tor.
- A payment that stops at a limit says it in one plain sentence: the price,
  your limit, that nothing was paid, and what to do next (`shinjuku limits`
  shows your limits and asks for new ones). Before, it could print only an
  error code, or name an internal id.
- When a payment that Shinjuku makes for you is above your limit, "Allow it
  once?" and the answer after Decline name the seller's price and Shinjuku's
  fee apart, for example "the price 0.005 USDC plus Shinjuku's fee 0.001
  USDC".
- The private AI address for your other AI apps says "your private balance
  is 0 USDC" when the wallet just checked and found nothing, also right
  after you start it.

## 2026-10-28: wallet release `67cedf24`, npm `shinjuku@0.3.122` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.121 and these:

- Your agent app is told, in every answer, never to reach a paid site or look
  up its address on its own (no browser, no curl and no DNS lookup, also over
  HTTPS), also when you ask for no Tor: that would show your IP address to the
  site or to a DNS company. Before, an agent app asked to check a site without
  Tor looked up its address itself.
- With a private balance of 0, a payment or an AI question above your limit
  says that the balance is 0 and how to add money, also when the last check of
  your balance is more than a minute old: the wallet checks again first. Before,
  it could still ask "Allow it once?". A wallet with money makes no extra
  check, so payments are not slower.
- A balance answer names the check it just made, not an older one.
- "Allow it once?" for a payment that Shinjuku makes for you names the
  seller's price and Shinjuku's fee apart, for example "the price 0.005 USDC
  plus Shinjuku's fee 0.001 USDC".
- The private AI address for your other AI apps says "your private balance is
  0 USDC" when the wallet knows it is 0.
- `shinjuku infer` shows each amount once ("--max-payment 0.005 USDC").

## 2026-10-28: wallet release `b2d6f450`, npm `shinjuku@0.3.121` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.120 and these:

- When a paid site cannot be reached, the answer tells your agent app never
  to reach that site on its own (with its own tools that would show your IP
  address to the site), and not to try again at once. It says why when the
  wallet can tell, and what you can do. The agent app also gets this rule
  when it starts. Before, an agent app could offer to check the site without
  Tor.
- With a private balance of 0, a payment or an AI question above your limit
  says that the balance is 0 and how to add money. It no longer asks you
  "Allow it once?" first, a question whose yes could not pay.
- The private AI address for your other AI apps, and the agent app answers,
  no longer show internal codes of the wallet.
- When Tor on your computer keeps closing connections with no answer, the
  wallet stops after a few tries and says to check that Tor runs. Before, it
  tried again with no limit until the request's time ran out.
- `shinjuku infer` above `--max-payment`, `shinjuku limits` with less than
  the 0.001 USDC fee left, and `shinjuku chat` with a limit too small for one
  answer say so in plain words, and the chat says it when it starts.
- The lists of paid services that the wallet searches for you are kept for
  up to 24 hours. A new start downloads a list only when its copy is older than
  that, and a search answers at once from an older copy while a new one
  downloads. Before, each start more than 10 minutes after the last download
  fetched about 25 MB again, at the time of a first payment.

## 2026-10-28: wallet release `967a5d2f`, npm `shinjuku@0.3.120` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.119 and these:

- On Windows, `shinjuku setup` in a terminal no longer loses your first Enter
  at its second question. The opening animation does not read keys on
  Windows; Ctrl+C still ends it. On other systems any key still skips it.
- `shinjuku curl` checks your spending limits before it asks you to pay. When
  a limit has no room for the price, it says which limit and what to do, and
  asks nothing. Before, it asked, and refused only after you answered y.
- When you choose Decline at "Allow it once?" (or close the question), the
  answer says only that you did not allow the payment and that nothing was
  paid. Before, it also kept the limit's own refusal, and an agent app could
  report a second reason that was not true.
- `shinjuku infer` refuses a payment limit below the least an AI answer costs
  before it reads your balance, so the answer comes at once.
- When a payment would pass your limit for any 24 hours, the terminal shows
  the plain sentence only, with no internal code.
- When a payment needs more than is left of one of your limits, the step
  names that limit and the least it needs, not a higher maximum for the
  command (which the wallet would refuse again).
- `shinjuku limits` shows what is left now of your limits for any 24 hours
  and for all payments, and says when that is too little for an AI answer.
- The private AI address for your other AI apps answers an empty or low
  balance and a reached limit with the standard code these apps know
  (`insufficient_quota`), so they show the message and do not retry.

## 2026-10-28: wallet release `27af600c`, npm `shinjuku@0.3.119` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.118 and these:

- `shinjuku setup` in a terminal opens with the Shinjuku animation before its
  first question. Any key skips it. A setup with `--yes` does not play it.
- When your own spending limits are below what a payment needs, every answer
  gives one step: `shinjuku limits`. Before, some answers asked you to raise a
  limit for one command, and the wallet then refused that payment anyway. A
  limit for one command above your own spending limits is refused before
  anything starts.
- Your limit for any 24 hours now counts every payment of the wallet, also
  after you restart the private AI address or the terminal chat, and also for
  `shinjuku infer`, `shinjuku curl` and `shinjuku pay`. When the limit is
  reached, the answer says to wait or to run `shinjuku limits`.
- The terminal chat shows the room you have left in your 24-hour limit,
  counted over every payment of the wallet, and stops before a payment that
  would not fit. Before, it showed its own room only.
- `shinjuku balance` also shows USDC on the wallet's own public address that
  is not private yet, and how to make it private.
- `shinjuku infer` counts Shinjuku's 0.001 USDC fee in its first check, so a
  limit of 0.01 USDC per answer is refused before anything starts, with the
  limit that works (0.011 USDC).
- When the private AI address for your other AI apps cannot pay because of
  your spending limits or an empty balance, its answer says that nothing was
  paid and gives the command that works. Before, it could say that a payment
  may have gone out, or give a server error.
- While your agent app pays, the wallet pauses its download of the list of
  paid APIs, and continues it after the payment.
- The agent's texts use plain words. A balance check is always safe: it starts
  no payment.

## 2026-10-28: wallet release `ec36e97e`, npm `shinjuku@0.3.118` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.117 and these:

- The QR code of a deposit address shows in the chat: as a picture in an app
  that shows pictures, and as text in a terminal. The wallet no longer saves
  it as a file and gives you the file's path. `shinjuku add-funds` no longer
  prints an image path under its QR code.
- When the search for paid APIs could read only part of a long seller list,
  the answer says how much of that list it searched.
- When the private AI address for your other AI apps has a limit per answer
  below 0.011 USDC (the AI provider's standard 0.01 USDC payment plus the
  0.001 USDC Shinjuku fee), each answer about it says so and gives the exact
  command that raises the limit, for the place your limit came from.
- The agent does not tell you the names of the wallet's tools, fields or
  codes, unless an answer asks it to pass a code on. The wallet's texts name
  Shinjuku where they used a technical word for our payment service.

## 2026-10-28: wallet release `396cdf6f`, npm `shinjuku@0.3.117` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.116 and these:

- The search for paid APIs reads the public seller lists through Shinjuku's
  own copies of them. Before, with Tor on, two of the lists refused the
  search, so it skipped them. Now every list works with Tor, and no list
  host sees your search. Your search words still stay on your machine.
- When a list cannot be read, the answer says which list was not searched.
- When your limit for one AI answer is below 0.01 USDC, the AI chat says why
  no answer can start and the one step that works. The `limits` command
  says so when you set such a limit.
- The price check of a paid URL says when your private balance is too low to
  pay it, before you say yes.
- After you decline an "Allow it once?" question, the agent says that you
  declined it. It does not ask you whether a question showed.
- When you ask for the AI models with no question, the answer lists them
  with their notes and the price of a default answer. It says when your
  limit or your balance is too low for an answer.
- A balance of 0 says that nothing can be paid yet and how to add money.
- The wallet deletes its old copies of the seller lists (about 80 MB) once.

## 2026-10-28: wallet release `458187f8`, npm `shinjuku@0.3.116` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.115 and these:

- A private send leaves in one transfer. The wallet no longer splits a send
  into parts at random times. A send in parts that an older version started
  still finishes.
- In a terminal, a send of money you received goes straight to the address.
  Before, the terminal first paid the wallet itself, and the send took longer.
- Before the wallet says your private balance is 0, it reads the chain. In a
  terminal, `infer`, `curl` and `unshield` check the balance before the first
  question. At 0 they say how to add money. Before, you could answer every
  question and then learn that there was no money.
- A payment or an AI question with no money says that nothing was paid and
  how to add money. Before, the AI chat said that it may be paid already.
- The words that an answer gives you name no tool and no field. They say
  what to ask for in plain words, for example "ask me to add funds".
- A balance of payments you received says that you can send them to a
  wallet address, and the receipts list each received payment. Before, the
  balance said that no payment could use them yet.
- A balance that the wallet still reads shows your public USDC and how to
  make it private.
- A spending limit says where it was set. When no limit is set, setup and the
  balance say how to set one in a terminal.
- When the wallet is not set up, its status says so and offers setup.
- The AI chat shows one price in its banner.
- When a seller offers several ways to pay, the wallet picks Solana USDC.
- The wallet accepts a seller's payment terms that name the address you asked
  for with its query items in another order. Before, it refused them.
- The wallet reads the pool history in fewer requests, and two reads at the
  same time share them. The first payment stays fast when the pool history
  grows past 4,096 records. Each history request has a random number, so
  requests over Tor do not link by their numbers.

## 2026-10-27: wallet release `148b3f52`, npm `shinjuku@0.3.115` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.114 and these:

- When a payment is still open with the seller, the answer no longer shows
  you its request id. The agent keeps the id and uses it to ask for the
  result.
- When the agent app ends the wallet during a private send, the next start
  finishes the send without holding up your first payment. Before, that
  payment could wait about 8 seconds.
- A private send in parts no longer stops and starts again when a part
  finishes before the chain marks it final. The wallet waits a few seconds
  and tries again. Before, such a part took about 25 seconds longer.

## 2026-10-27: wallet release `dc0b6b99`, npm `shinjuku@0.3.114` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.113 and these:

- A refund notice names the payment it belongs to ("for the payment to
  example.com"), and the list of refunds on their way names the seller too.
  Before, two refunds side by side could read as one conflict.
- A refund notice stays until an answer shows it, also when the agent app
  starts the wallet again between answers. Answers to an AI question carry
  refund notices too. Before, some notices were lost.
- The agent keeps request ids to itself in every answer that carries one.
- A payment answers sooner after the seller answers: the wallet checks older
  refunds while the seller works. Before, that check could add up to 3
  seconds after the seller answered.
- A payment during a private send in parts waits for one step of a part, not
  the whole part. Before, a payment or an AI question could wait about 30
  seconds.

## 2026-10-27: wallet release `bfaedd12`, npm `shinjuku@0.3.113` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.112 and these:

- A payment can go while a private send in parts runs from the same money.
  Before, a send in parts from one account stopped every other payment until
  its last part went.
- After an agent app starts the wallet again, a send keeps the time it really
  left. Before, a new send to the same address could be taken for an earlier
  one, and the agent had to ask again.
- A long answer from a seller shows its first 20,000 characters, and the
  wallet saves the whole answer to a file that the answer names. Before, an
  agent app could refuse the answer as too long.
- The agent keeps request ids to itself, and the answers name a private send
  by its amount and the address it pays.
- The words about money that a private send keeps are now true: a send keeps
  nothing after its last part goes, and stopping the send frees it at once.
- When the Shinjuku account that pays the network fee of a payment is low,
  the answer says so and asks you to try again later. Before, it said to try
  again in a minute.

## 2026-10-27: wallet release `1406c0d4`, npm `shinjuku@0.3.112` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.111 and these:

- Answers no longer show you a request id. Before, the agent could tell you
  "The request ID is auto-..." about an id you never use. The agent still
  reads the id from the answer when it must pass it.
- The balance names an open private send by its amount and the address it
  pays.
- The request id of a payment and of an AI chat says to leave it out for a
  new payment or question. Before, an agent could make the same id for the
  same question in a new conversation, and the answer then spoke of a
  payment made earlier.

## 2026-10-27: wallet release `ca9504f8`, npm `shinjuku@0.3.111` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.110 and these:

- The request id of a deposit and a send says to leave it out for a new one.
  Before, an agent could make up an id that an earlier send used, read that
  old send, and ask you about a send you never made.
- A token transfer with the request id of an earlier transfer says that this
  call moved nothing, and names one new request id. Before, it said "Done."
- A payment or an AI chat with the request id of a payment from more than 10
  minutes before names one new request id.

## 2026-10-27: wallet release `f6ab1c40`, npm `shinjuku@0.3.110` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.109 and these:

- While a private send keeps money for its next payment and the change of
  your last payment is still on its way, the balance says when one payment
  can use that change, and how much. Before, it said that no payment could
  use the money yet, so agents told the user that new payments would fail.
- The balance gives that time and amount only when no private send can still
  take the change. Otherwise it says that no payment can use the money yet.
- A payment or an AI chat with a request id that an earlier payment used now
  says that nothing was paid, and names one new request id to use.

## 2026-10-27: wallet release `b09cef56`, npm `shinjuku@0.3.109` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.108 and these:

- A private send keeps the money that its next payments need. Other payments
  and sends can no longer split that money, so the last payment of a send no
  longer waits until you cancel it. A payment that only this money could pay
  says so, names the send, and names the call that stops it.
- When a payment of a private send fails a try, every answer says so: how
  many tries, why, and that the wallet tries again by itself. A cancel says
  how much came back to the private balance.
- When the wallet must first get the balance ready to pay, the first answer
  of the payment is no longer an error. It says that the wallet gets the
  balance ready, then pays.
- A shield or a send asked again with the request id of a finished one names
  one new request id to use.
- When a seller's payment offer names no fee payer, the answer also names the
  price that the offer asks.
- A refund answer asked again gives the same reason as the first answer: the
  seller's answer code, a seller that charged too late, or a request to fix.

## 2026-10-27: wallet release `3163c1c6`, npm `shinjuku@0.3.108` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.107 and these:

- Install the terminal command with `npm install -g shinjuku@0.3.108`, then
  type `shinjuku setup`. The npm page now shows these two lines first.
- The first payment after the agent app starts the wallet no longer waits
  about one second for the seller search: the wallet reads and writes its
  saved seller lists in small steps, and never while a payment runs.
- When a seller's payment offer cannot be paid (another network or token, or
  no fee payer), the answer says why, says that nothing was paid, and says to
  pay another seller.
- Each refund on its way names the request id of its payment, so an answer
  about one payment never shows another payment's refund as its own.
- A shield asked again with the request id of a finished shield says that
  this call moved nothing, and to use a new request id.
- While a private send still has payments to go, the balance answer names
  it: its request id, how much is sent and left, and when the next payment
  goes. The agent no longer asks you for the send's id.
- When the `node` command is older than Node.js 22, the first line says
  which Node it found, where, and to install Node.js 24.
- `shinjuku` with no command starts with `setup`. The terminal says "this
  wallet's own key" for the address the wallet receives on, so it is not
  mixed up with your own address from setup.

Open in this version (no money is lost): when other payments or sends run
while a private send waits between its payments, its last payment can wait
until you cancel it. The value stays private, and a cancel gives it back to
the balance. The fix comes in a later release.

## 2026-10-27: wallet release `28821f7e`, npm `shinjuku@0.3.107` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.106 and these:

- Install the terminal command with `npm install -g shinjuku@0.3.107`.
- Right after a payment, the balance says that one payment can use the rest
  after the last payment settles; it no longer says that no payment can use
  it, and the next payment waits for it by itself.
- When a seller refuses after payment, the answer shows the seller's own
  reason, and no error code asks the agent to try again while the text says
  that there is nothing to do.
- A seller that works more than about 30 s before it charges cannot be paid
  by any wallet: a Solana payment expires about 30 s after it is signed. The
  answer now says so, and says that the payment comes back once the payment
  service proves that its transfer expired.
- The wallet starts to read its own public USDC, its other tokens and its
  open add-funds addresses when the agent app starts it. A read that does not
  answer in time says so, and never looks like an empty balance or "no
  tokens". One balance request after a deposit lands starts that deposit.
- Agent apps show `shinjuku <command>` for each terminal step, and you stop
  the private AI address by asking the agent.
- In the chat, `/balance` reads the balance itself.

## 2026-10-26: wallet release `f8173150`, npm `shinjuku@0.3.106` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.105 and these:

- Install the terminal command with `npm install -g --no-audit --no-fund shinjuku@0.3.106`.
- Cancel: a payment that the payment service proves it never received is
  cancelled, nothing is paid, and the balance no longer counts it. A payment
  still on its way says that it is not finished and that the same request id
  is safe; it never promises a refund.
- A payment that no one payment can cover now asks the payment service for
  nothing, so nothing is held for it.
- The wallet gets the balance ready to send (it puts its notes together) with
  fewer stops: an attempt that sent nothing does not count, and the last
  check runs once instead of waiting inside the step.
- Texts give only times that the wallet or the payment service measures. A
  balance that no payment can use yet says so in one plain line.
- Over Tor, each money step other than a payment (add funds, a send, each
  part of a private send, getting the balance ready) runs on a Tor circuit of
  its own, so one circuit never links two of them. The local AI address keeps
  the payment service's onion ready, as the MCP server does.

## 2026-10-26: wallet release `2408266a`, npm `shinjuku@0.3.105` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.103 and these:

- Install the terminal command with `npm install -g --no-audit --no-fund shinjuku@0.3.105`.
- The balance answer names the wallet version that runs, and `shinjuku version`
  names the `shinjuku` command.
- A private send of one payment that must wait says how long it waits and that
  it is one payment. The texts for a send in parts say that the parts are
  random whole cents, and equal when the amount allows no other split.
- The receive address says which payers can pay it.
- No update notice to an older version than the one that runs.
- When a seller asks to be paid at another URL, or its URL moved, the answer
  names that URL. Nothing is paid.
- The deposit warning shows its amount in USDC.
- A first payment over Tor is faster: the first contact with the payment
  service brings its settings, the history checks start earlier, and the chain
  time stays fresh while a payment waits for the payment before it.

## 2026-10-24: wallet release `b5da74cb`, npm `shinjuku@0.3.103` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.102 and these:

- Install the terminal command with `npm install -g --no-audit --no-fund shinjuku@0.3.103`.
- `shinjuku curl` and a one-question `shinjuku infer` return to the prompt
  right after the answer.
- When a payment is over a spending limit that is set in the agent app's
  wallet entry, the answer names the entry that setup adds (`shinjuku`).
- The amount paid in the balance no longer counts a payment that came back
  to you as a refund.
- A receipt of a seller that sends no transfer signature says that it has
  no seller transaction to show.
- With `--verbose` in a terminal, the progress lines wait until you answer
  a question.

## 2026-10-24: wallet release `3a984162`, npm `shinjuku@0.3.102` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.101 and these:

- Install the terminal command with `npm install -g --no-audit --no-fund shinjuku@0.3.102`.
- `shinjuku chat`: when Shinjuku's payment service is busy or not ready,
  the chat says that nothing was paid and when to ask again (or `/retry`).
- `shinjuku add-funds`: Ctrl+C while it waits for your deposit prints one
  line: what it waited for, and the command to continue.
- `shinjuku curl` in a terminal shows only the price question, the answer
  and what it paid. Add `--verbose` to see the progress lines.
- `shinjuku unshield all` names the amount in its question, also right
  after payments. `shinjuku unshield --verbose all` works too.
- A no at a confirm question stops the command with one line, not an
  error.
- Ctrl+C at setup's money question says that setup is done. Setup run again
  shows the private AI lines and the lines to add the wallet to an agent
  app.

## 2026-10-24: wallet release `1c3d204e`, npm `shinjuku@0.3.101` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.100 and these:

- Install the terminal command with `npm install -g --no-audit --no-fund shinjuku@0.3.101`.
- An AI answer gets 4096 tokens by default (512 for `claude-opus-5`) in
  `shinjuku chat`, `shinjuku infer`, the private AI address and the
  `inference_chat` tool. At 2048 tokens a 300-word `qwen3-8-flash` answer
  stopped before its end: the model thinks before it answers, and those
  tokens are paid too. At 4096 tokens the same answer was complete and
  cost 0.00312 USDC in a live test. The price follows the token limit, not
  the length of the answer.
- `shinjuku chat`: after you add funds in another terminal, `/balance`
  starts from the newer balance, or says that money came in.
- `shinjuku add-funds`: the ready line and the stop line name no internal
  run name.
- Ctrl+C at a question in a terminal stops the command with one line: it
  says that nothing was sent or paid.
- `shinjuku unshield all` and `shinjuku unshield 0.5` take the word as the
  amount.

## 2026-10-24: wallet release `fe6cb068`, npm `shinjuku@0.3.100` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.99 and these:

- Install the terminal command with `npm install -g --no-audit --no-fund shinjuku@0.3.100`.
- One default AI model, `qwen3-8-flash`, for `shinjuku chat`, `shinjuku infer`,
  the private AI address and the `inference_chat` tool. An answer pays for
  up to 2048 tokens (512 for `claude-opus-5`). Correction: in a later live
  test a 300-word answer stopped at this 2048-token limit (it paid
  0.002062 USDC); 0.3.101 gives 4096 tokens. `deepseek-v4-1-flash` stays available
  (`/model deepseek-v4-1-flash` in the chat): in that test its AI provider
  took the payment and answered an error instead of a long answer.
- `shinjuku chat`: when the AI provider keeps a payment and sends an error
  instead of an answer, the chat says so, says that the payment does not
  come back, and counts it in `/cost` and at the end. Ask again or pick
  another model with `/model`. When an answer is only late, `/retry` still
  asks again with the same payment and never pays twice.
- `shinjuku chat`: the wait is one line that counts the seconds. `/balance`
  counts down from the last balance it read. `/quit` and `/q` end the chat.
  A balance too low for an answer says that nothing was paid: add funds in
  another terminal, then type `/retry`.
- Setup no longer asks about private inference, and its next step names the
  chat first.
- `shinjuku add-funds` prints shorter lines in a terminal.
- `shinjuku unshield`: the confirm of a send of all names the amount, and
  no line shows an internal step name.
- `shinjuku help infer --verbose` lists every flag of `infer`.

## 2026-10-24: wallet release `5023a291`, npm `shinjuku@0.3.99` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.98 and these:

- Install the terminal command with
  `npm install -g --no-audit --no-fund shinjuku@0.3.99`, then run `shinjuku help`.
  The lines for your agent app still name `shinjuku-shield@0.3.99`.
- One default AI model, `deepseek-v4-1-flash`, for `shinjuku chat`,
  `shinjuku infer`, the private AI address and the `inference_chat` tool.
  `qwen3-8-flash` stays available (`/model qwen3-8-flash` in the chat).
- `shinjuku chat`: an answer can be up to 2048 tokens long when your limits
  and your private balance allow it (else 512). The chat prints a line when
  it sends a paid question again, and a "still waiting" line after 20
  seconds. When the AI provider answers with an error, the chat says so and
  tells you to type `/retry`, which never pays twice. The first Ctrl+C keeps
  the chat open. `/balance` shows your private balance, and a command that
  does not exist gets a plain answer.
- `shinjuku chat` and `shinjuku infer start` read your private balance when
  they start. When it is below the price of one answer, they say so and give
  the line that adds funds.
- `shinjuku infer start` and `shinjuku infer status` give the model line for
  your app, and say that the address stops when the computer restarts: then
  run `shinjuku infer start` again. The `inference_server` tool says the
  same. `--verbose` prints every line.
- Setup ends with short next steps (add money, chat, the private AI address,
  your agent app) and prints no API key.
- `shinjuku help` is short. `shinjuku help all` lists every command.
- Every wallet text says "private balance".
- `shinjuku unshield`: press Enter to send to your own address. Before you
  confirm a send of all, it names the amount. `--split` spreads the amount
  over several exits.
- A deposit starts as soon as the wallet sees its USDC (no random wait of up
  to 5 minutes).
- A limit refusal names the 24-hour limit or the per-payment limit.
- When a seller refuses the request itself (an HTTP 4xx with a reason), the
  answer says to fix the request and pay with a new request id.
- A quiet terminal prints no line about the RPC relay.
- After a seller refuses a payment at once, the refund time uses the block
  pace that our facilitator measures, and your balance shows the refund
  from that time.

## 2026-10-24: wallet release `1fe3c2f7`, npm `shinjuku-shield@0.3.98` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.97 and these:

- The terminal command is `shinjuku`. Install it with
  `npm install -g --no-audit --no-fund shinjuku-shield@0.3.98`, then run
  `shinjuku help`. Setup asks to install it for you, over Tor when you chose
  Tor, and it updates an older `shinjuku` command.
- A command that the wallet prints starts with `shinjuku` when that command
  is on your computer. Otherwise it is a one-time line,
  `npx -y --no-audit --no-fund shinjuku-shield@0.3.98 <command>`, that works
  with nothing installed.
- The lines for your agent app name `shinjuku-shield@0.3.98`. The app entry
  stays `shinjuku`, so the slash commands stay `/shinjuku:<name>`: type / and
  pick a command, then add its value, or press Enter and the agent asks.
- When a seller refuses a payment at once, the answer gives the time when
  the refund lands, not "about 7 minutes". Your balance shows the refund soon
  after.
- When Tor stops, the wallet's answer gives the command that starts Tor
  again, and the steps to reconnect name the app entry `shinjuku`.
- A limit refusal names the limit that refused, and each text that raises a
  limit names `shinjuku limits`, which asks for each limit.
- Setup prints no onion line. After `--add-to` added your agent app, setup
  prints no manual lines for that app.
- A `curl` rerun with the same `--request-id` asks the price that the wallet
  kept for it.
- The model list says that nothing was asked or paid.
- The Releases link names this repository, `shinjuku-shield`.

## 2026-10-24: wallet release `7438f0e3`, npm `shinjuku@0.3.97` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.96 and these:

- Slash commands: in Claude Code, type `/` to see the wallet's eight
  commands: `/shinjuku:setup`, `/shinjuku:balance`, `/shinjuku:add-funds`,
  `/shinjuku:pay`, `/shinjuku:send`, `/shinjuku:receipts`,
  `/shinjuku:find-sellers` and `/shinjuku:ask-ai`. Each one puts a plain
  request for your agent in the chat.
- The wallet's name in your agent app is now `shinjuku`. Setup writes that
  name and removes an older `shinjuku-shielded` or `shinjuku-shield` entry of
  this wallet, so your app never starts two wallets.
- Add funds fills the private balance up to 5 USDC. When your balance leaves
  less room than the amount you ask for, add funds tells you before you
  send, and the payment link and its QR code ask only for the amount that
  fits.
- In a terminal, the wallet asks instead of taking flags. The setup question
  "Send every request through Tor?" takes Enter as yes. `add-funds`,
  `unshield` and `limits` ask for their values. `curl` shows the seller's
  price first and pays only after you answer y. `unshield` sends only after
  you answer y.
- The wallet card says "Last payments to sellers". Your sends and deposits
  are in your receipts.
- The wallet's instructions to your agent name the private AI tools too.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `4a3321b0`, npm `shinjuku@0.3.96` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.95 and these:

- The npm name you use is now `shinjuku`. Setup and the update texts write
  `shinjuku@0.3.96` in the lines for your agent app. The names
  `shinjuku-shield` and `shinjuku-shielded` run the same wallet, and lines
  that name them keep working.
- To put money in, every answer offers one way: add funds, which gives you a
  one-time address. With the Shinjuku relay (the default), setup no longer
  offers the wallet's own public address: deposits to one public address
  can be linked to each other.
- After you send USDC to an add-funds address, the wallet watches that
  address. It no longer says that your balance is empty or asks you to add
  funds again while the deposit is on its way.
- The privacy wait after a deposit now reads "up to 5 minutes".
- Before setup, each tool says in one line what it does after setup, so your
  agent can tell you what the wallet offers.
- A wallet that runs without the Shinjuku relay says what the chain shows
  before you deposit to its own address.
- In a terminal, the add-funds command that an empty balance shows now runs
  as shown.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `6304f680`, npm `shinjuku-shield@0.3.95` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.94 and these:

- When setup ends in your agent app, the first line of the answer names your
  recovery file, so your agent tells you to copy it in the same turn. This is
  also true when setup stops after the wallet was made.
- One setup call waits until setup has ended, so your agent does not stop
  half way through the downloads.
- After you accept the setup box, every setup answer names your choices.
  Before, your agent could tell you the setup box never showed.
- After you accept a send in its confirmation box, every answer of that send
  says that you confirmed it. Before, your agent could tell you that no
  confirmation was shown.
- The texts use plain words for the step that gets your balance ready to
  send. The wallet does this step by itself; the terminal command for it is
  now `shinjuku prepare`, and the old command name still works.
- When Tor is not running, the terminal gives one sentence and then the
  command that starts Tor, alone on its line, for the port that setup
  recorded.
- Each command that a hint shows now runs as shown.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `af5b54d5`, npm `shinjuku-shield@0.3.94` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.93 and these:

- When your agent app sets up the wallet, the setup call waits for your answer
  in the setup box and gives the result in the same answer. Your agent goes on
  by itself after you answer: you do not type "I approved it".
- After you answer the setup box, the wallet status gives the result of setup,
  not "waiting for your answer".
- If Tor Browser is open, the first line of the setup answer now says that Tor
  Browser does not give the connection the wallet needs, the same as the rest of
  the answer. Before, it said "Tor is not running".
- If you close a confirmation box (Esc), the wallet takes it as your answer
  and sends nothing. Before, a fast close could read "this app could not show
  you the address".
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `6048ca61`, npm `shinjuku-shield@0.3.93` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.92 and these:

- Setup in your agent app asks "Use Tor?", ticked by default. Tor hides your
  IP address from the payment service and from sellers. With Tor, setup
  downloads the wallet's files over Tor, and the wallet then runs over Tor in
  the same session: you do not restart the app.
- If you choose Tor and Tor is not running on your computer, setup makes
  nothing and gives one command that downloads Tor and starts it. On Windows
  the command checks the Tor download against its published SHA-256 before it
  runs it. Tor Browser alone does not give the connection the wallet needs.
- Before you answer the setup question, the wallet sends nothing: no update
  check and no seller search. The seller search (`x402_discover`) works after
  setup.
- If the wallet runs over Tor and Tor stops (for example after your computer
  restarts), each answer says why and gives the start command and the steps
  to reconnect the wallet in your app.
- A second run of setup in a terminal prints a short text that says to
  reconnect the wallet in your agent app, not the whole first-setup text.
- A wallet set up without Tor gives the whole setup command to turn Tor on
  later, not a flag.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `afa037c8`, npm `shinjuku-shield@0.3.92` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.91 and these:

- Some agent apps read only the first 4096 characters of a tool's description
  and of the server's instructions. The description of `wallet_unshield` (5218
  characters) and the instructions before setup (4599) were longer, so the agent
  never read their last rules. Both are shorter now, and every release checks
  that no text is over the limit.
- The send question shows the amount as "0.01 USDC", not "0.010000 USDC".
- The check of the receiving address before the send question waits at most
  8 seconds; a slow network no longer holds the question for minutes.
- `shinjuku add-funds` and setup show amounts as "0.05 USDC", not
  "0.050000 USDC", and no longer show an internal deposit-size warning.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `1d784246`, npm `shinjuku-shield@0.3.91` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.90 (known issues 1 to 6, the deposit QR code) and these:

- Known issue 7 of 0.3.86 is fixed: a plain `shinjuku balance` right after a
  deposit or a send reads the chain once and shows the number. The
  `wallet_balance` tool checks a refund from an old read before it calls the
  refund "on its way".
- Add money in a terminal in any amount from 0.01 USDC:
  `shinjuku add-funds --route exchange --amount 0.05` (with the QR code). Until
  now the terminal took whole USDC only.
- Your own wallet address, for sending money back to yourself: setup asks for
  it in a terminal (Enter skips it; setup asks again when you run it again).
  Your agent then sends to it without asking each time, also in an agent app
  that cannot show a question. Setup takes the address only in a real
  terminal, never from a script or an agent's tool, so an agent cannot
  approve an address by itself.
- In an agent app that cannot show the send question, the answer says that
  nothing was sent and tells you to run setup in a terminal to add your own
  wallet address.
- Plainer answers: a finished deposit or send says that a backup of the
  wallet was saved (not its folder), and the balance says nothing about
  spending limits when you set none.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `4cda1792`, npm `shinjuku-shield@0.3.90` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 to 0.3.89 (known issues 1, 2, 3, 4 and 6) and these:

- Add money from your phone: `shinjuku add-funds` in a terminal and the
  `wallet_add_funds` tool show a QR code of the one-time deposit address (a
  Solana Pay link). Scan it with a phone wallet such as Phantom or Solflare.
  The wallet makes the code on your machine; no other server sees the address.
- Known issue 5 of 0.3.86 is fixed: before a send that must first get your
  balance ready, the agent tells you how long it takes (about 2 minutes).
- Plainer texts for a first-time user: `shinjuku chat` starts with two short
  lines, and `/help` shows the details. `shinjuku infer` and `shinjuku unshield`
  show their id only when a run stops. The texts say "the AI provider". One
  plain line says when Tor is slow to reach the payment service. A refused
  command line after setup shows short examples.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-24: wallet release `9af59797`, npm `shinjuku-shield@0.3.89` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fixes of
0.3.87 and 0.3.88 (known issues 1, 2 and 4) and two more:

- Known issues 3 and 6 of 0.3.86 are fixed: in a terminal, `shinjuku chat`,
  `shinjuku balance`, `shinjuku infer` and `shinjuku unshield` show only
  the result lines. The wallet's own Tor, RPC and history lines show only
  with `--verbose`. When Tor is slow, one plain line says so, for example
  "Tor was slow, so the wallet switched to another Tor route. This can add
  a few seconds." Errors and warnings always show.
- In a terminal, `shinjuku unshield` says once that the send takes about a
  minute, so a quiet terminal does not look stuck.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `17d8275d`, npm `shinjuku-shield@0.3.88` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version. It has the fix of
0.3.87 (known issue 1) and two more:

- Known issue 2 of 0.3.86 is fixed: the terminal send no longer prints the
  internal `SELLER_STORE` line.
- Known issue 4 of 0.3.86 is fixed: when a payment is over your spending
  limit, the answer names the place that set the limit. When your host's
  MCP entry holds `--max-payment` (or `--max-session`), it tells you to
  change it there and restart the host; setup does not change that limit.
  When the entry has no such flag, it names setup, as before.
- When a seller fails before it takes the money, the answer says the money
  comes back "within about 7 minutes" (in a live test it came back in
  under 2 minutes).
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `c0b0b77b`, npm `shinjuku-shield@0.3.87` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.86` (wallet release `b650bf06`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- Known issue 1 of 0.3.86 is fixed: when a seller fails before it takes the
  money, the answer starts with "Not paid yet", not "Paid". It says to ask
  again with the same request_id, and that the money otherwise comes back
  by itself in about 7 minutes. This release fixes nothing else.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: npm `shinjuku-shielded@0.3.86` is the stable version (wallet release `b650bf06`, pinned)

The stable version is now 0.3.86, on npm under the tag `latest` as
`shinjuku-shielded`, `shinjuku-shield` and the `shinjuku` command. It
replaces 0.3.80 (wallet release `98296ff0`). The wallet file is the file of
the 0.3.86 candidate below. To move from an older version, run
`npx -y --no-audit --no-fund shinjuku@0.3.86 setup` once and put
`shinjuku-shield@0.3.86` in your host's MCP entry. Your wallet, its address
and its balance stay the same. How to use each feature: the
[0.3.86 release notes](README.md#release-0386).

Every feature passed a live run on the published 0.3.86 package, on
production, with real USDC, on 2026-10-23:

- Add funds (`wallet_add_funds`, `shinjuku add-funds`): 1 USDC sent at
  21:54:31 UTC was private by 21:56:55 UTC, after the agent app had closed.
- Make public USDC private (`wallet_shield`): 0.01 USDC private in one 34 s
  agent turn.
- Send any token privately (`wallet_transfer_token`): 0.132573 JUP sold;
  0.04 USDC arrived in 2 parts (22:10:51 and 22:24:32 UTC).
- Pay any x402 endpoint (`x402_pay`, `shinjuku pay`, `shinjuku curl`): the
  first payment to sellers the wallet never paid took 4.85 s and 11.31 s
  direct, 9.94 s and 18.14 s over Tor.
- Price preview (`x402_preview`): the price and the fee in 2.9 s, nothing
  paid.
- Find paid APIs (`x402_discover`): 15 paid APIs in 0.75 s.
- Automatic refunds: two failed sellers refunded in full; one seller that
  kept the money is named in the receipt.
- Slow sellers, never paid twice: sellers that answer after 30 s and 60 s,
  one payment each, and the data arrived.
- Images and files: a 1,797-byte PNG saved for 0.002 USDC.
- Cancel (`wallet_cancel`, `shinjuku cancel`): an unknown request and a paid
  one both answered correctly; nothing changed.
- Send to an address (`wallet_unshield`, `shinjuku unshield`): 0.974 USDC in
  one 48 s agent turn; 1 USDC from the terminal in 49 s.
- Send in parts at random times: 2 parts landed at 22:03:52 and 22:06:04 UTC,
  after the app had closed.
- Automatic join: 3 parts joined and sent in one call; 2 parts joined in one
  terminal command (106 s).
- Spend a received payment: a direct exit and a change exit, one transaction
  each.
- Balance (`wallet_balance`, `shinjuku balance`): answered in every run.
- Receipts (`wallet_receipts`): 6 receipts with both refunds and their
  transactions; the totals are right.
- Spending limits (`--max-payment`, `--max-session`, `shinjuku limits`): a
  0.011 USDC payment refused under a 0.001 USDC limit, nothing paid.
- Version pin and update notice: no false update notice in 11 answers.
- Ask an AI model (`inference_chat`): an answer for 0.001136 USDC in 15.1 s.
- Terminal chat (`shinjuku chat`): two answers with the context kept,
  0.002539 USDC in all.
- One question (`shinjuku infer`): both forms answered, 0.001266 USDC.
- Private AI address for your apps (`shinjuku infer start`,
  `inference_server`): the official OpenAI client streamed an answer; no
  prompt words in any log.
- Tor (`setup --tor`, `--tor`, `--no-tor`): every run of this release ran
  over Tor.
- Self-custody (`shinjuku setup`, `backup-export`): setup took 89 s; 5 min
  over Tor with the full proof download.
- The shinjuku command (`npm i -g shinjuku@0.3.86`): setup, add-funds,
  balance and send-all passed in a real terminal.

Known issues (none of them loses money; each one gets its own fix release,
tested live before the next):

1. When a seller fails before it takes the money, the answer starts with
   "Paid". The money is not taken and comes back by itself.
2. The terminal send prints one internal line that starts with
   `SELLER_STORE`.
3. `shinjuku chat` can print raw Tor lines while Tor is slow.
4. When the spending limit comes from the host's MCP entry, the refusal names
   setup as the place to change it.
5. Before a send that must first join parts, the agent may not tell you it
   takes about 2 minutes.
6. In a terminal, balance, infer and unshield print internal Tor, RPC and
   history lines.
7. A plain `shinjuku balance` right after a deposit can show no number.
   `shinjuku balance --refresh` shows it.
## 2026-10-23: wallet release `b650bf06`, npm `shinjuku-shield@0.3.86` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.80` (wallet release `98296ff0`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- Unshield: when the facilitator answers that its exit transaction has not
  landed yet, the wallet sends the same exit again by itself (it never sends
  twice). When the exit proof's time window ends first, the wallet makes a
  new proof once and sends it. Every refusal of the exit relay now says what
  it means and what to run.
- `shinjuku unshield --amount all --unshield-id <id>` finishes an unshield
  that started earlier, with the amount it started with. `shinjuku balance`
  names an unshield that has not finished and the command that finishes it.
- `inference_chat`: a refusal for a low `max_payment` says that the cap is
  only a limit, not the price, and what the call pays.
- A run through Tor or a proxy no longer prints Node's proxy warning many
  times.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `654041bc`, npm `shinjuku-shield@0.3.85` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.80` (wallet release `98296ff0`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- `shinjuku unshield --amount all --to <wallet address>` sends a balance
  held in several parts in one command: it says how long the join takes,
  joins the parts, then sends all of it. No `merge` command first.
- `shinjuku add-funds`: when the answer to a deposit is lost on the way,
  the wallet finds the deposit on the chain and finishes it. Each new try
  prints one line that says what it waits for and when it tries again.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `b73f57e5`, npm `shinjuku-shield@0.3.84` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.80` (wallet release `98296ff0`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- A payment stopped by the `max_payment` of that one call now says so, and
  names the amount that would work. It no longer tells you to run setup.
  The private AI chat names the smallest `max_payment` it accepts.
- Asking again for a send that already finished answers "already sent",
  with how long ago it finished. Nothing is sent twice.
- A balance check while the wallet still reads the chain shows the last
  full balance and how old it is. A history read over Tor waits for the
  onion route before its time limit starts.
- The wallet keeps the payment notes it already read, so the next start
  reads less from the chain.
- A balance held in several parts: your agent says how long the join takes
  BEFORE it starts a send of all of it.
- `shinjuku unshield --amount <usdc|all> --to <wallet address>` is the whole
  command after `shinjuku setup`. It prints plain lines and your new private
  balance (`--json` prints JSON). `shinjuku balance` prints one line.
- Every `shinjuku` command uses Tor when setup chose Tor. `--no-tor` turns
  it off for one command. The Node warning about the proxy is gone.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `a59aa27b`, npm `shinjuku-shield@0.3.83` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.80` (wallet release `98296ff0`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- A payment that the seller kept is no longer reported as a refund on its
  way, also when the seller refused a late retry, and the balance no longer
  counts such a refund.
- Receipts name each refund step in plain words and agree with the balance.
- A balance held in several parts: before a send of all of it, your agent
  can tell you how long the wallet needs to join the parts, and the answer
  says why the send took that long. The answer comes as soon as the send is
  final.
- A new send while a private send in parts is open no longer stops right
  after a deposit: the wallet reads its history again and goes on.
- `shinjuku add-funds` in a terminal shows one line per step and a short
  summary. `--verbose` shows every progress line, and `--json` prints the
  status as JSON (also for `shinjuku funds-status`).
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `eaf7063e`, npm `shinjuku-shield@0.3.82` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.80` (wallet release `98296ff0`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- A seller that writes its own URL in another encoding (for example `%2C`
  for a comma) can now be paid.
- `x402_discover` answers within about 10 s. A list that is still
  downloading is searched in its older copy or in the pages downloaded so
  far, and a later search goes on from those pages.
- After you send USDC to an add-funds address, ask for your balance once:
  the wallet then makes it private by itself.
- Receipts list a deposit made with `shinjuku add-funds`.
- The balance counts every refund on its way.
- A token transfer or a private send in parts goes on by itself when
  another wallet process holds the wallet for a moment.
- Clearer answers when a seller cannot receive a payment, when a seller
  refuses after it was paid, and for a refund on its way.
- `shinjuku infer "your question"` needs no flags after setup.
  `shinjuku chat` shows one line about Tor and no progress lines
  (`--verbose` shows them). `shinjuku add-funds` and
  `shinjuku funds-status` end with a short summary in a terminal.
- The local AI address serves the OpenAI Chat Completions API and
  `/v1/models`. Apps that use the OpenAI Responses API do not work with it
  yet.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `63f08b62`, npm `shinjuku-shield@0.3.81` (candidate, npm tag `next`)

A candidate: npm publishes it under the tag `next`. The stable version stays
`0.3.80` (wallet release `98296ff0`, npm tag `latest`) until we name a new
one. To try the candidate, install its exact version.

- Shinjuku Shield is the main name. The npm package `shinjuku-shield` holds
  the same files as `shinjuku-shielded`, and the npm package `shinjuku`
  gives the short command `shinjuku` at the same version
  (`npm install -g shinjuku@0.3.81`).
- Private AI in the terminal: `shinjuku chat`. Each answer is paid from the
  shielded balance, through Tor, with a cap of 0.05 USDC an answer and
  1 USDC a chat by default. The wallet keeps no copy of the conversation.
- A local AI address for an agent app that speaks the OpenAI API:
  `shinjuku infer start` prints the `base_url` and an api key. The address
  keeps running after the terminal closes; `shinjuku infer status` shows it
  and `shinjuku infer stop` stops it. Answers can stream (`stream: true`).
- New MCP tool `inference_server`: your agent starts, checks or stops that
  address. Its caps are never above the caps of setup or of the MCP launch.
- A private AI call is paid only in a way that keeps no copy of its request.
- A pay right after a part of a private send goes through.
- A private send in parts also finishes when the host closes all its child
  processes as it ends (Windows).
- A deposit made in a host that ends the wallet after each answer goes on
  in the background.
- The shield receipt says when the shield is done.
- `help` prints the real version, and `shinjuku` alone opens with a short
  animation in a real terminal (any key skips it).
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `98296ff0`, npm `shinjuku-shielded@0.3.80`

- A private send in parts now finishes in every agent host. In a host
  that ends the wallet after each answer (such as `claude -p`), a small
  background wallet process sends each part at its planned time, then
  ends. The agent does not need to ask again in a loop.
- `wallet_receipts` shows each part of a private send and the minutes
  until the next part goes, and lists token transfers.
- A payment the seller served shows the transfer to the seller, also when
  the seller sends no receipt header.
- A refund that has landed leaves the "on its way" balance at once.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `2b67ac65`, npm `shinjuku-shielded@0.3.79`

- A seller that takes the payment and then refuses the data: the wallet
  resends the same proof once, then says the seller keeps it. It never
  shows a refund that will not come.
- A seller that answers an error: the answer says so, and says that the
  money comes back by itself if the transfer to the seller never lands.
- `wallet_receipts` lists a payment the seller has not served yet, with
  the seller and the state of its refund.
- A seller that is not x402 v2 gets a clear refusal; nothing is paid.
- The add-funds answer gives the new balance, and the balance answer names
  all the USDC you added.
- Write `version` to print the version.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `b840ab22`, npm `shinjuku-shielded@0.3.78`

- `wallet_receipts` shows the private transaction of every payment, also
  when the app ended the wallet right after the payment.
- A token transfer reports its progress in fewer, slower answers, names the
  exact SOL it needs, and sends a total rounded down to 0.01 USDC. The rest
  stays in your private balance, so the parts do not match the sale.
- A balance split into parts joins by itself across sessions, and the
  balance answer says when a send of everything must join parts first.
- Limit refusals say how to raise the limit, and where.
- Each payment, shield or send answer gives your new balance, and "show my
  wallet" gives a short wallet card.
- `npx -y --no-audit --no-fund shinjuku-shielded version` prints the
  version (in that line npm answers `--version` itself), and MCP apps show
  the real version.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `e2b3bd72`, npm `shinjuku-shielded@0.3.77`

- While new USDC waits out its random privacy wait, the wallet tells you
  when to ask about your balance again. That ask starts the deposit if it
  has not started yet. It no longer says "no step from you".
- When the wallet stops a payment before it pays (for example over your
  limit), Shinjuku's server gets no request for that payment.
- The first payment reads the pool history checks sooner, and the wallet
  keeps each pool's name on disk, so a new session skips one read.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `6d58045e`, npm `shinjuku-shielded@0.3.76`

- A payment to a seller whose price names an old Solana blockhash no
  longer fails: when that blockhash is about to expire, the wallet signs
  with a fresh one.
- While the wallet reads a long pool history, it still answers your other
  requests (the read runs in small steps).
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-23: wallet release `57e0bc6a`, npm `shinjuku-shielded@0.3.75`

- When a paid request fails after the money left, the refund is visible:
  the answer names the refund, `wallet_receipts` says "refund pending"
  until the money is back in the balance, and the balance says how much of
  it is a refund on its way.
- `wallet_balance` right after a payment answers at once with the new
  number.
- Closing the MCP no longer waits for background work that did not start.
- With `--tor`, every command uses the Tor setup the wallet recorded.
- Setup's background read of the pool history now also runs from the npm
  package.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `bf5ad0c1`, npm `shinjuku-shielded@0.3.74`

- An unshield (a send to a normal Solana address) answers as soon as the
  transfer is final on chain, with its transaction. The wallet then checks
  the pool history by itself; there is nothing to do. If an MCP ends before
  that check ends, the next MCP finishes it.
- With `--tor`, a new wallet first tries the two facilitator onion addresses
  that the most Tor directory relays carry. The other two stay as spares.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `ff6f25bc`, npm `shinjuku-shielded@0.3.73`

- A wallet that checked the pool history before needs only the newest part
  of it: it reads one small page beside the full list and stops waiting for
  the full list when the small page and its saved records pass every check.
  Every wallet sends the same two requests and reads both to the end.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `07990722`, npm `shinjuku-shielded@0.3.72`

- With `--tor`, a new MCP's first payment asks for the pool history at the
  same time as its pool read, not after it. When the pool moved since the
  wallet's last check, the payment waits less.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `61674c4e`, npm `shinjuku-shielded@0.3.71`

- When money you added has landed but is not counted yet, the balance answer
  now tells you that nothing is needed from you, and tells the agent to check
  again in the same turn. Before, some agents stopped and waited for you.
- The wallet reuses its saved program check for a slightly older pool view when
  the program did not change, so a send-back does not repeat that check.
- With `--tor`, a pool read that gets no answer in 5 seconds goes once more on
  another Tor circuit; the first answer wins.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `ae568c80`, npm `shinjuku-shielded@0.3.70`

- A new MCP's first payment waits less for its history check. The check now
  uses the pool read that the payment already makes, with the same checks, and
  sends no extra reads of its own. If that read lacks a needed field, the
  wallet reads as before.
- A history snapshot's age now counts from its pool read, so a snapshot that
  took long to load is not read again at once for the proof.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `c6cbe0a6`, npm `shinjuku-shielded@0.3.69`

- Setup now checks the pool history and the program while it downloads the
  proof tools, so the first balance after a deposit does not have to do that
  check again. Setup never waits for it, and nothing it starts runs on after
  setup ends. With `--tor` it uses its own Tor circuit, never a direct one.
- When the history service has no record newer than the wallet's last one,
  the wallet asks once more after 2 seconds before it reads the whole history.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `3d64f9b4`, npm `shinjuku-shielded@0.3.68`

- An unshield, a merge or a pocket fill no longer gets refused by its own
  check when the pool adds new records while its quote is still valid. The
  wallet now checks a quote against the same records the facilitator and the
  program accept. In one case a payment was refused 12 times this way until
  its quote ran out.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `4d9b6de2`, npm `shinjuku-shielded@0.3.67`

- Over Tor, a check read of one of your own past transactions that has no
  good answer after 4 seconds is sent once more on another Tor circuit, and
  the first good answer is used. In one test on 0.3.65 two such reads
  stalled for 20 seconds each on one slow circuit.
- When two steps of one wallet process need the same full check of the
  program's history, the second step uses the result of the check that is
  already running and verifies it with its own reads, instead of a second
  full check. It waits for that check for 45 seconds at most.
- When neither main facilitator onion answers, the two spare onions join
  after 8 seconds, not 15 seconds.
- The wallet no longer uses one history onion that did not answer new
  clients. Three history onions remain.
- Each step of an unshield now writes its time to the local log.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `402e7c36`, npm `shinjuku-shielded@0.3.66`

- The wallet downloads the pool's history page once at a time. When a
  payment needs that page while an earlier read of it is still on its way,
  the payment uses that read instead of a second download on the same
  connection. In one test on 0.3.65 a first payment after the pool moved
  took 85 seconds because two downloads of the page slowed each other.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `f1563e53`, npm `shinjuku-shielded@0.3.65`

- When the history server is a moment behind the chain right after a
  payment, the wallet now keeps the history page that is already on its way
  instead of cutting it and asking for it again. In one test on 0.3.64 a
  second request right after the first payment waited 38 seconds for that.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `f7b2fe09`, npm `shinjuku-shielded@0.3.64`

- Before a payment's proof, the wallet checks its saved check of our program
  on the chain from the pool read it already makes, not by one more round
  trip. Over Tor that round trip took 0.3 to 0.8 seconds, and in 13 of 16
  measured first payments the proof waited for it.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `f3c65200`, npm `shinjuku-shielded@0.3.63`

- The setup line and every host entry are now
  `npx -y --no-audit --no-fund shinjuku-shielded ...`. Without the two flags,
  npx sends npm's audit request when it installs a new version, and on
  2026-10-22 that request hung for about 5 minutes. `setup --add-to` replaces
  an entry that an older setup wrote.
- Over Tor, a pool history request that gets no answer moves to the next
  history onion, and a history source that answers nothing for 60 seconds
  ends the load with a plain error, not a wait of several minutes.
- Over Tor, a long-running MCP can again move to a new circuit after a stall
  once the new circuit has answered.
- The add-funds answer says to ask once more about 1 minute after the random
  privacy wait, for hosts that close the MCP after each answer.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `d9319f9c`, npm `shinjuku-shielded@0.3.62`

- Over Tor, a tool that needs the private pocket now waits for the pool's
  pocket list itself, up to 60 seconds. Before, it waited 15 seconds and then
  refused with "Nothing was paid or moved" when a slow Tor circuit made the
  list arrive later.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `fd8f40cf`, npm `shinjuku-shielded@0.3.61`

- A new MCP process now builds the private balance's spent-note tree from its
  saved history while the first payment waits for the network. Before, it
  built the whole tree after that wait. If the saved tree does not match the
  chain, the wallet builds it again in full, as before.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `ad143a47`, npm `shinjuku-shielded@0.3.60`

- Over Tor, the facilitator also answers on two spare onion addresses. When
  neither main onion address answers in 15 seconds, the wallet tries the
  spares too, and one line says so. Before, setup could stop after
  100 seconds when Tor could not look up the two main addresses.
- When `wallet_balance` finishes your deposit and the new balance is not
  counted yet, it says that the USDC landed and is being counted (ask again
  in about 30 seconds). Before, it said that the balance is not known yet
  and to ask again in a minute.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `a18f4dcc`, npm `shinjuku-shielded@0.3.59`

- When `wallet_transfer_token` finishes, the answer says that no tool of
  this wallet moves the SOL on the wallet's own key out yet, and that no
  private route for that SOL exists yet. The SOL pays the fees of your next
  sells.
- When USDC arrives at an add-funds address, `wallet_balance` says that the
  wait before the deposit is a random privacy wait (0 to 5 minutes). The
  wait hides the link between your deposit and your private balance. The
  wait did not change.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `780f6896`, npm `shinjuku-shielded@0.3.58`

- `setup --tor` on a Tor that has just started: setup tries the release
  document again for up to 110 seconds, shows a progress line every
  10 seconds, and says that Tor has no path to the onion service yet when
  nothing answers. Before, it stopped after about 50 seconds with "no answer".
- Over Tor, a request to the facilitator waits for the fastest onion address
  for at most 15 seconds. Then it tries each onion address in turn. It never
  goes to the clearnet address.
- `setup --tor --proxy http://127.0.0.1:<port>` keeps that port in
  `config.json` (`torTunnel`), and `mcp` uses it.
- When the wallet cannot read the receipt of a deposit that landed, it looks
  for the deposit in the pool history over the history connection (its onion
  under Tor). Each look stops after 120 seconds, and the next status call
  tries again. Before, one look could take many minutes (19 minutes in our
  test).
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-22: wallet release `a5a9b7dd`, npm `shinjuku-shielded@0.3.57`

- `wallet_transfer_token` closes the sold token's empty account on the
  wallet's own key before the private send starts, so its rent comes back
  as SOL. The done answer names the SOL that stays on the key to pay the
  fees of your next transfer.
- `wallet_balance` finishes an add-funds deposit that an earlier, closed
  process started but did not sign, and one whose wait has passed.
- `wallet_balance` lists the other tokens on the wallet's own key by mint
  (`ownKeyTokens`), so a token you sent for `wallet_transfer_token` shows
  before the transfer.
- The wallet builds a part of the payment proof from its saved history on a
  second thread at start. We did not measure the first payment yet.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-21: wallet release `e18d1d95`, npm `shinjuku-shielded@0.3.56`

- Less work inside the first payment after a start. The wallet folds its
  saved history while it waits for the live pool read (our test: the fold
  after the start went from 0.74-0.80 s to 0.01-0.39 s). Every check still
  runs against the live pool account.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-21: wallet release `70ff655b`, npm `shinjuku-shielded@0.3.55`

- `wallet_balance` and `x402_preview` show `network`: `tor`, `proxy` or
  `direct`, with one line that says who can see your IP address. Your agent
  can now tell you that your payments go through Tor.
- `setup --tor` records Tor for the MCP, the same as `--prefer-tor`. The
  proof-tools download prints its progress every 10 s, and a setup error
  prints the whole command that works.
- Added funds that landed on chain show as `landingAtomic` until the wallet
  counts them, and `wallet_balance` finishes a sent deposit within 20 s of
  the call. This helps hosts that end the MCP server after each answer.
- The add-funds wait says when to ask again, and that the funds become
  private within about 1 minute of that request.
- `wallet_transfer_token` answers name the address you gave, say that the
  steps continue at your next request if the chat ends, and say that the
  address already has a USDC account. A part whose time passed while the
  wallet did not run waits again from the next start; the answer says so.
- Terminal texts are ASCII only, so a Windows console shows them correctly.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-21: wallet release `285d2c1d`, npm `shinjuku-shielded@0.3.54`

- Money flags take USDC. Write `--max-payment 0.05` for 5 cents and
  `--max-session 2` for 2 USDC. `setup` and the other commands refuse a
  whole number from 1000 up (the old atomic form) and print its USDC form.
  `mcp` still reads an old launch line as atomic, and `wallet_balance` tells
  you how to write it in USDC. Tool arguments stay atomic (`amount_atomic`).
- `--max-session` is the most this wallet pays in any 24 hours, from every
  MCP process together. `--max-shield` and `--max-unshield` count 24 hours
  the same way.
- "Send all my USDC" in one call. When your balance sits in more than one
  part, `wallet_unshield` joins the parts and sends in the same call if your
  host shows progress (our test: 0.02 USDC in 2 parts, 137 s to "Sent",
  about 55 s of it a random privacy wait). Without progress, the answer
  says how many more asks it needs and when.
- A send the wallet keeps for later says when it tries again and why. It
  stops after 8 tries in about 90 minutes, and says so.
- Clear refusals. A send above your balance, from an empty balance, or while
  a deposit is still on its way says the numbers, the amount that works now,
  and when to ask again. `to` may be left out when exactly one
  `--unshield-to` address is set.
- `wallet_receipts`: a send that did not go says why (`not_sent` with
  `reason`); a sent row's `at` is the time it left, and `startedAt` the
  start.
- A wallet that received payments but never shielded can now unshield one
  received payment directly.
- Every money record survives a crash in the middle of a write.
- `x402_pay` no longer says "The page was free" for a page that refused the
  request (for example HTTP 403 from a seller that blocks Tor exits). It
  says the status and that nothing was paid.
- `--tor` runs race four onions of our history service and keep the first
  that answers. A Node.js without the proxy support that `--tor` needs is
  refused at the start, before anything is sent.
  Node.js 22.21 or later, or Node.js 24 or later.
- The tool list shows 12 tools. `wallet_receive_shielded` left the list
  (it comes back with private escrow deals); it still answers by name.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-20: wallet release `667ac38b`, npm `shinjuku-shielded@0.3.53`

- Simpler start. `npx -y shinjuku-shielded setup` prints the host line to
  paste and how to add funds. Ask your agent to add funds:
  `wallet_add_funds` gives a one-time address, and amounts from 0.01 USDC
  become private by themselves.
- Plain answers. Every tool answer starts with a `say` line in plain words,
  and amounts also show as USDC text beside the atomic fields. No field was
  renamed or removed.
- A slow seller no longer holds your agent. After 25 s, `x402_pay` answers
  `seller_working` with its `request_id`. Call `x402_pay` again with that
  `request_id` to get the answer; it never pays twice. `inference_chat` does
  the same.
- A seller that stops answering after the payment: from 45 s the wallet
  reads our payment state, and it stops when the seller is dead (73 s in our
  test, where the old wait took 122 s).
- Faster first payment from a fresh process: the wallet hashes the pool
  roots on worker threads, so it reads your call at once.
- `--tor` runs try both of our onion addresses and keep the first that
  answers.
- New tools: `wallet_receive_shielded` (a one-time private address of this
  wallet), `wallet_transfer_token` and `wallet_transfer_token_status` (sell a
  Solana token for USDC, make it private, and send it privately). The tool
  list shows 13 tools.
- `wallet_receipts` gives `{ok, count, total, facilitatorNote, receipts}`;
  each row has `kind`. The old row fields stay.
- No tool of the Solana Agent Kit plugin changed its name or its arguments.

## 2026-10-11: wallet release `08a4b56f`, npm `shinjuku-shielded@0.3.8`

- Update now. On 2026-10-11 the pool program was upgraded (faster pool
  anchors). 0.3.7 and earlier pin the old program and proof tools
  `ad860e62`, and cannot pay. Run `npx -y shinjuku-shielded@latest setup`
  once: it pins the new program and gets proof tools `47678912`. Your
  wallet, its address, and its balance stay the same.
- A new account pays sooner: the pool takes an anchor about every 30 s when
  it grew, not only every 5 minutes. In our test on 2026-10-11, 12 of 12 new
  accounts could pay within 45 s (median 18 s).
- When an earlier payment is not finished, `x402_pay` names its
  `request_id` (`p03_resource_payment_another_request_unresolved`). Call
  `x402_pay` again with that `request_id` to finish it; it never pays twice.
  `wallet_balance` lists it with its `requestId`.

## 2026-10-11: wallet release `488372b4`, npm `shinjuku-shielded@0.3.7`

- `x402_pay` also pays a stock `exact` seller that settles on our own
  facilitator (`https://shinjukustaition.com/api/x402`), through float pay.
  0.3.6 refused it with `p03_float_seller_uses_our_facilitator`.
- A refund (`p03_float_refund_pending`) comes back within about 7 minutes,
  not 2: it waits for the next pool anchor. `wallet_balance` counts it in
  `refundsInFlightAtomic` for 8 minutes.
- A seller that offers only scheme `confidential` is refused with
  `confidential_retired` by `x402_preview` and `x402_pay`, and nothing is
  paid. `--play-token-file` is accepted and ignored.
- An error answers its code by name: 91 float pay, refund, and seller codes
  answered `unknown_error` before. An error answer carries only the wallet's
  own text.
- The wallet spends the oldest account that pays, so fresh change is not
  tied to your next payment.
- The wallet reads the faster pool anchors (one about every 30 s) that a
  coming upgrade of the pool program adds. Until that upgrade, nothing
  changes.

## 2026-10-11: wallet release `e3348092`, npm `shinjuku-shielded@0.3.6`

- Float pay. `x402_pay` pays a seller that takes only standard `exact`
  (Coinbase CDP, PayAI, any Solana `exact` seller that takes USDC) through
  Shinjuku: the wallet pays us privately from the shielded balance, the
  seller's price plus a flat fee (0.001 USDC), and we pay the seller from our
  own shared float. `x402_preview` shows `feeAtomic` and `totalAtomic`.
  `max_payment_atomic` must cover the total.
- Automatic pockets are off: the wallet fills no pocket. `--ready-pockets`
  is accepted and ignored. With `--proof-tools`, `--exit-proof-tools`, and
  `--profile`, the server returns old pockets to the shielded balance by
  itself while it is idle; `--no-auto-pockets` stops that.
- If a seller does not take our payment, `x402_pay` answers
  `p03_float_refund_pending`: the refund comes back to the balance by itself
  within about 2 minutes.
- `wallet_balance` answers one balance (`balanceAtomic`) with a
  `breakdown`: `shieldedAtomic`, `refundsInFlightAtomic`, and
  `setAsideAtomic`.
- A balance split over several accounts: `x402_pay` names the new CLI
  command `shinjuku-wallet merge`, which joins them.
- A refusal by a wallet-file cap names the new CLI command
  `shinjuku-wallet limits`, which changes or removes the cap.
- Hidden amounts (scheme `confidential`, the V0b vault) are retired: the V0b
  program was closed on chain on 2026-10-11.

## 2026-10-10: wallet release `f2ea6840`, npm `shinjuku-shielded@0.3.5`

- The pool program was upgraded, and the shielded pool moved to
  `45mhosfA2MuygZWeqYRVcEZX2Q3gA8KR8FwP6AZkK1zR`. The old pool
  `AAG16mNWTtC1sBeu2tTVTwWjqWXCefLTCByVPj5X3kV8` is retired; earlier releases
  refuse payments. Run `npx -y shinjuku-shielded@latest setup` once: it keeps
  the old wallet file, makes a wallet for the new pool (a new address), and
  downloads proof tools `ad860e62`.
- No spending limit by default. `--max-payment`, `--max-session`, and
  `--max-total` are optional; a setup rerun lifts the old default caps.
- The first deposit into an empty pool works.
- A pocket fill for a split shielded balance says why it fails: each part is
  smaller than one pocket. Shield 1 more USDC so one part holds a full pocket.

## 2026-10-09: wallet release `14dd9efa`, npm `shinjuku-shielded@0.3.4`

- Proof tools `9975fdf8` pin the upgraded pool program. With 0.3.3, setup
  worked but every pocket fill failed (`p03_seller_chain_pin_mismatch`). Run
  `npx -y shinjuku-shielded@latest setup` once.

## 2026-10-09: wallet release `36d0219d`, npm `shinjuku-shielded@0.3.3`

- Required after the pool program upgrade of 2026-10-09: earlier releases
  refuse payments. Run `npx -y shinjuku-shielded@latest setup` once; it keeps
  your wallet and downloads proof tools `a9f18f88`.

## 2026-10-08: wallet release `d2a7291f`, npm `shinjuku-shielded@0.3.2`

- When the facilitator is short of network-fee funds, the agent hears
  `p03_facilitator_underfunded`: nothing was spent; try again later with a new
  request_id.
- A seller that closes a payment request now tells the agent to pay again with
  a NEW request_id.

## 2026-10-08: wallet release `a8516e49`, npm `shinjuku-shielded@0.3.1`

- A shield call made right after the MCP server starts now waits for the
  server's own background pocket check instead of failing `wallet_locked`.
- Tool texts name fewer third-party wallets.
- Otherwise the same as 0.3.0 (wallet release `94a357bc`, no longer served).

## 2026-10-08: wallet release `94a357bc`, npm `shinjuku-shielded@0.3.0`

Update from 0.2.0. The pool program was upgraded on 2026-10-08. The proof
tools that 0.2.0 pins (`24e819a8`) name the program from before the upgrade,
so setup from 0.2.0 now refuses production. 0.3.0 pins the new set
`262e1e98`.

- `x402_discover`: searches public x402 listings (Coinbase x402 Bazaar,
  PayAI, Dexter, and others) on your machine. The first call takes about
  15 s.
- Automatic pockets: for a standard `exact` seller, `x402_pay` fills a
  1 USDC pocket from the shielded balance when it needs one.
  `--ready-pockets 0-5` (default 1) sets how many stay ready.
  `--no-auto-pockets` turns this off.
- Image answers: `x402_pay` returns image bytes (also JSON `image_base64`)
  as an MCP image block and saves the file.
- `wallet_shield` needs no SOL. Our facilitator's relayer pays the network
  fee; you pay the shield cost.
- An Approve button with an empty form (Hermes) counts as accept.
- `x402_preview` and `x402_pay` price a seller that lists several networks
  from its Solana offer.
- The pool history comes through our facilitator's https history proxy by
  default. A new wallet is ready in about 60 s instead of about 220 s.
- A seller receipt that names another payer is checked on chain.
- A payment that landed, from a seller that gives no answer, closes as paid.
- Verified on production with a new wallet, the default setup, and no SOL at
  any time: a shield
  ([`5np1EYjN…fH2`](https://solscan.io/tx/5np1EYjNkr5w7Tt6ng2KQ9cp7RgNkhpwAKtzkm2nyRKMgi1FsmM3TMZMx8EkyiAV4sUtoQ3mTtTbuehas1qV3fH2)),
  then `x402_pay` to a public satellite-imagery seller: 0.013 USDC, HTTP 200
  in 8 s, a JPEG answer
  ([`iC6gnjFM…DHwC`](https://solscan.io/tx/iC6gnjFMBwHaqArgcRL6C5GdNbcWMom82cZqcQ2C2xup9aXJX91HXmWozQcVvAyTSTZsRptynfdbBPjjxG9DHwC)).

## 2026-10-08: wallet release `11fe6b40`, npm `shinjuku-shielded@0.2.0`

One command installs and runs it: `npx -y shinjuku-shielded mcp`.

- First run with no wallet: in a terminal it asks "Set up Shinjuku Shielded
  now? (y/n)". Started by an agent app, it serves a setup mode: the tools
  `shinjuku_setup` and `wallet_status`, and the app asks you "Create a
  Shinjuku Shielded wallet on this machine?" (MCP elicitation). Nothing is
  created until you accept. The money tools answer `wallet_not_set_up`.
- `setup` (also run by the first start): creates the wallet with a
  generated passphrase in a private file, shows the recovery file to back
  up, downloads the proof tools and checks every file against a set pinned
  inside the wallet (the server alone cannot change it), and writes
  `config.json`. `--add-to claude-code|claude-desktop|cursor` adds the server
  to your agent app. `--yes` asks nothing.
- `mcp` with no flags reads `config.json`. Flags on the command line still
  win.
- Linux, or Windows with WSL. macOS is not supported (the provers are Linux
  programs).
- In the official MCP Registry as `io.github.ShinjukuStaition/shinjuku-mcp`
  0.2.0. npm versions are published from this repository's workflow with
  npm provenance (from 0.1.1).
- Verified on production: an end-to-end run from the published package
  (setup in 25 s, `mcp` with no flags, a balance read).

## 2026-10-08: npm `shinjuku-shielded@0.1.1` (same wallet release `1a336885`)

- `server.json` for the official MCP Registry
  (`io.github.ShinjukuStaition/shinjuku-mcp`).
- `mcpName` in `npm/package.json`. The registry checks it on npm, so it
  needs a new npm version before the registry entry.
- `examples/`: Claude Code, Claude Desktop, Cursor, and Hermes Agent configs,
  a first-10-minutes walkthrough, and 10 plain requests.
- `SECURITY.md`.

## 2026-10-08: wallet release `1a336885`, npm `shinjuku-shielded@0.1.0`

The MCP runs by itself. You talk in plain words, and the server does the
upkeep.

- `wallet_shield` is on by default with `--proof-tools`. `--no-shield`
  turns it off. `--max-shield` is optional. `--allow-shield` is still
  accepted for older configs.
- `wallet_unshield` is on with `--exit-proof-tools` and `--profile`. An
  address in `--unshield-to` is sent at once. Any other address is sent only
  after you confirm it in your MCP client (MCP elicitation): "Send X USDC
  from your shielded balance to <address>?". A decline, or no answer in 5
  minutes, sends nothing (`mcp_unshield_declined`). A client that cannot ask
  is refused (`mcp_unshield_to_not_allowed`). `--max-unshield` is optional.
- The wallet's own key is refused as a send address. It made the deposits,
  so a send there would link them. The server does not start when
  `--unshield-to` names it.
- Automatic refresh: after a deposit lands, and before a payment or a send
  when the local balance is stale, the server reads the chain itself.
  `wallet_balance` answers with `refreshing: true` after about 20 s and
  finishes in the background.
- Automatic backup: after each shield and each send, the wallet writes an
  encrypted backup to `$SHIELDED_WALLET_HOME/auto-backups/<pool>/` and keeps
  the newest 5.
- A send is your own money. It does not count against the payment budget of
  the wallet file (`init --max-payment`, `--max-cumulative`). Payments to
  sellers still count.
- The server instructions and the tool descriptions map plain requests
  ("what is my balance", "shield 5 USDC", "pay this URL", "send 2 USDC to
  <address>") to one tool each.
- npm: `shinjuku-shielded@0.1.0` holds this release unchanged
  (`shinjukuRelease` `1a336885`). Commands: `shinjuku-shielded` and
  `shinjuku-wallet`.

## 2026-10-08: wallet release `b7d6f394`

- New tool `wallet_shield {amount_atomic, request_id}`: moves the public
  USDC on the wallet's own key into the shielded balance. Off unless you
  start the server with `--allow-shield --max-shield <atomic>`.
- New tool `wallet_unshield {amount_atomic, to, request_id}`: sends shielded
  USDC to a public Solana address. Off unless you start the server with
  `--unshield-to <address> --max-unshield <atomic>`.
- Both take minutes. The same `request_id` reads the status and never moves
  money twice, also after a restart.
- `wallet_balance` shows SHIELDED and UNSHIELDED separately: the private
  balance, and the plain USDC on the wallet's own key.

## 2026-10-07: the `mcp` command

- `shinjuku-wallet mcp`: a local MCP server on stdio. Your keys and
  passphrase stay in that process.
- Tools: `x402_preview` (the price and the cap check; pays nothing),
  `x402_pay` (alias `fetch_paid`; pays and returns the answer),
  `wallet_balance`, `wallet_receipts`, `wallet_cancel`.
- Caps: `--max-payment` and `--max-session` are required. Without them the
  server does not start (`mcp_cap_required`). A tool argument can only lower
  the per-payment cap. Optional: `--max-per-host-day` and `--allow-host`.
- The same `request_id` never pays twice.
- Pays `shielded-exact` from the shielded balance and standard `exact` from
  a ready pocket. Not `confidential`.
- `--tor` sends seller requests, memo reads, and RPC calls through Tor.
