# Vercel AI SDK

On Windows, type `npm.cmd`, `npx.cmd` and `shinjuku.cmd` where a line below says `npm`, `npx` or `shinjuku`
(they run in Command Prompt and in PowerShell). App start lines, app configs and `claude mcp add ... npx ...` lines stay as they are.

Two ways to use the wallet from the [Vercel AI SDK](https://ai-sdk.dev):

- **Private AI answers for your app** (below, first): the wallet's private AI
  address is the model. You need no other AI account: each answer is paid
  from your private balance, through Tor.
- **The wallet's tools for your agent** (further down): your app's model calls
  the wallet (balance, pay a link, add funds) through `@ai-sdk/mcp`.

## Private AI answers: the wallet as your model

### 1. Set up the wallet and start the address

```sh
npm install -g shinjuku
shinjuku setup
shinjuku infer start
```

On Windows (Command Prompt or PowerShell): `npm.cmd install -g shinjuku`,
`shinjuku.cmd setup`, then `shinjuku.cmd infer start`.

`infer start` prints the address (`base_url http://127.0.0.1:11402/v1`) and an
API key. Put the key where your program can find it: `set OPENAI_API_KEY=<your key>`
(Windows Command Prompt) or `export OPENAI_API_KEY=<your key>` (Mac or Linux).

### 2. Install

```sh
npm install ai@7.0.173 @ai-sdk/openai-compatible@3.0.92
```

This example uses these versions.

### 3. Ask a question

Save this as `ask.mjs`, then run `node ask.mjs`:

```js
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const shinjuku = createOpenAICompatible({
  name: "shinjuku",
  baseURL: "http://127.0.0.1:11402/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

const { text } = await generateText({
  model: shinjuku("qwen3-8-flash"),
  maxOutputTokens: 4096,
  prompt: "What is the capital of Japan?",
});
console.log(text);
```

`qwen3-8-flash` thinks before it answers, so it needs `maxOutputTokens` of at
least 4096 (a short question costs about 0.003 USDC, at most 0.011 USDC). For
the other models, 256 is the smallest. `GET http://127.0.0.1:11402/v1/models`
lists the models with their prices.

## The wallet's tools for your agent

The AI SDK reads MCP servers through `@ai-sdk/mcp`. It runs the same
`shinjuku-shield@0.3.266 mcp` server as the other examples, so you do not need
another package.

### 1. Set up the wallet in a terminal

```sh
npm install -g shinjuku
shinjuku setup
```

On Windows (Command Prompt or PowerShell): `npm.cmd install -g shinjuku`, then `shinjuku.cmd setup`.

Setup creates the wallet only after you confirm it. An AI SDK app does not
show that confirmation to you, so run setup once in a terminal first. If you
call `shinjuku_setup` from the app, it answers `mcp_setup_needs_terminal` and
creates nothing.

### 2. Install

```sh
npm install ai @ai-sdk/mcp
```

Also install the provider package for your model, for example
`@ai-sdk/anthropic` or `@ai-sdk/openai`.

### 3. Connect the tools

```js
import { generateText, stepCountIs } from "ai";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { anthropic } from "@ai-sdk/anthropic";

const shinjuku = await createMCPClient({
  transport: new Experimental_StdioMCPTransport({
    command: "npx",
    args: ["-y", "--prefer-offline", "--no-audit", "--no-fund", "shinjuku-shield@0.3.266", "mcp", "--max-payment", "0.05"],
  }),
});

try {
  const tools = await shinjuku.tools();
  const { text } = await generateText({
    model: anthropic("claude-sonnet-5-5"),
    tools,
    stopWhen: stepCountIs(10),
    prompt: "Show my Shinjuku balance.",
  });
  console.log(text);
} finally {
  await shinjuku.close();
}
```

- `shinjuku.tools()` returns all the server's tools: `pay_for_service`,
  `wallet_balance`, `wallet_add_funds`, `wallet_unshield`, and the others. To
  give the model only some of them, pick them by name, for example
  `{ pay_for_service: tools.pay_for_service, wallet_balance: tools.wallet_balance }`.
- Every flag of `help mcp` goes in `args`. The caps (`--max-payment`,
  `--max-session`, `--max-unshield`) are optional and in USDC:
  `0.05` = 5 cents. With no cap there is no limit.
- Windows: if Node cannot find `npx`, use `command: "cmd"` and put `"/c",
  "npx"` at the start of `args`.
- Close the client when you are done. The server holds the wallet lease while
  it runs. Run one server per wallet at a time.

### Unshield to a new address

`wallet_unshield` to an address that you did not approve asks you to confirm
through MCP elicitation. The AI SDK client does not answer that by default,
so the call is refused and nothing is sent. Approve the address ahead of
time with `--unshield-to <address>` in `args`.

### Check that it works

Call one tool without a model:

```js
const tools = await shinjuku.tools();
const result = await tools.wallet_balance.execute({}, { toolCallId: "check", messages: [] });
console.log(result.content[0].text);
```

The answer is JSON. It holds `balanceAtomic` (1000000 = 1 USDC) and what it holds
under `breakdown`.
