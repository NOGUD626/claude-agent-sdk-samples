// セッション再開デモ
// 1回目: 新規セッションで情報を伝える (sessionId をファイルに保存)
// 2回目: 同じ sessionId を resume して、過去会話を覚えているか確認
//
// 実行:
//   npm run session          ← 1回目
//   npm run session:resume   ← 2回目
import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SESSION_FILE = ".last-session-id";
const isResume = process.argv.includes("--resume");

async function consume(iter: AsyncIterable<unknown>) {
  for await (const m of iter as any) {
    if (m.type === "assistant") {
      for (const b of m.message.content) {
        if (b.type === "text") process.stdout.write(b.text);
      }
    }
    if (m.type === "result") {
      console.log(`\n--- 完了 (${m.duration_ms}ms) ---`);
    }
  }
}

if (isResume) {
  if (!existsSync(SESSION_FILE)) {
    console.error(`${SESSION_FILE} がない。先に \`npm run session\` を実行して。`);
    process.exit(1);
  }
  const sessionId = readFileSync(SESSION_FILE, "utf8").trim();
  console.log(`[resume] sessionId=${sessionId}\n`);

  await consume(
    query({
      prompt: "さっき私が伝えた『好きな数字』を 2 倍した値だけを答えて。理由はいらない。",
      options: {
        resume: sessionId,
        allowedTools: [],
      },
    }),
  );
} else {
  const sessionId = randomUUID();
  writeFileSync(SESSION_FILE, sessionId);
  console.log(`[new] sessionId=${sessionId}\n`);

  await consume(
    query({
      prompt: "私の好きな数字は 42 です。短く相槌だけ打って。",
      options: {
        sessionId,
        allowedTools: [],
      },
    }),
  );

  console.log(`\n次は \`npm run session:resume\` を実行すると、覚えているか試せる。`);
}
