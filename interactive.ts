// ストリーミング入力モードの対話 REPL
// prompt に AsyncIterable<SDKUserMessage> を渡すと、複数ターンの対話が可能になる
//
// 実行: npm run interactive
//   `exit` または空入力で終了。Ctrl+C でも抜けられる。
//   モデル切替: 入力で `/model <name>` (例: /model claude-haiku-4-5)
//   中断:      入力で `/stop` (現在のターンを止める)
import { query, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let pendingResolve: ((v: SDKUserMessage | null) => void) | null = null;
const inbox: SDKUserMessage[] = [];

// ユーザー入力をキューに溜める非同期関数
async function readLoop() {
  while (true) {
    const line = (await rl.question("\n> ")).trim();
    if (!line || line === "exit") {
      pendingResolve?.(null);
      rl.close();
      return;
    }

    // スラッシュコマンドは Query メソッドにルーティング
    if (line.startsWith("/model ")) {
      const name = line.slice("/model ".length).trim();
      await q.setModel(name);
      console.log(`(モデルを ${name} に変更)`);
      continue;
    }
    if (line === "/stop") {
      await q.interrupt();
      continue;
    }

    const msg: SDKUserMessage = {
      type: "user",
      message: { role: "user", content: line },
      parent_tool_use_id: null,
    };
    if (pendingResolve) {
      const r = pendingResolve;
      pendingResolve = null;
      r(msg);
    } else {
      inbox.push(msg);
    }
  }
}

// query が pull するためのプロンプト生成器
async function* promptStream(): AsyncGenerator<SDKUserMessage> {
  while (true) {
    const next = inbox.shift() ?? (await new Promise<SDKUserMessage | null>((res) => (pendingResolve = res)));
    if (next === null) return;
    yield next;
  }
}

console.log("対話モード開始。'exit' で終了。'/model <name>' でモデル切替、'/stop' で中断。");

const q = query({
  prompt: promptStream(),
  options: {
    model: "claude-sonnet-4-6",
    allowedTools: [],
  },
});

// 入力ループを並列起動
readLoop().catch((e) => console.error("入力エラー:", e));

for await (const m of q) {
  if (m.type === "assistant") {
    for (const b of m.message.content) {
      if (b.type === "text") process.stdout.write(b.text);
    }
  }
  if (m.type === "result") {
    process.stdout.write(`\n  (${m.duration_ms}ms, $${m.total_cost_usd?.toFixed(6) ?? "?"})`);
  }
}

console.log("\n--- セッション終了 ---");
process.exit(0);
