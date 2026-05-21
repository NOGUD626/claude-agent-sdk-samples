// セッション分岐 (forkSession) のデモ
// 同じ起点から複数の分岐を作って、別々の方向に会話を進める。
// 元のセッションは無傷で残るので「後でやり直し」もできる。
//
// 実行: npm run fork
import { query } from "@anthropic-ai/claude-agent-sdk";
import { randomUUID } from "node:crypto";

async function consume(label: string, iter: AsyncIterable<unknown>) {
  console.log(`\n=== ${label} ===`);
  for await (const m of iter as any) {
    if (m.type === "assistant") {
      for (const b of m.message.content) {
        if (b.type === "text") process.stdout.write(b.text);
      }
    }
  }
  console.log();
}

const baseSessionId = randomUUID();
console.log(`[base] sessionId=${baseSessionId}`);

// 起点セッション: コンテキストを共有させる
await consume(
  "base",
  query({
    prompt:
      "これからプログラミング言語を 1 つ指定するので、その言語の特徴を 3 つ簡潔に挙げてもらいたい。準備はいい？短く返事だけして。",
    options: {
      sessionId: baseSessionId,
      allowedTools: [],
    },
  }),
);

// 分岐 1: Rust
await consume(
  "Fork 1: Rust",
  query({
    prompt: "言語は Rust。特徴を 3 つ、箇条書きで。",
    options: {
      resume: baseSessionId,
      forkSession: true,
      allowedTools: [],
    },
  }),
);

// 分岐 2: Go (Rust の分岐とは独立。base からの分岐)
await consume(
  "Fork 2: Go",
  query({
    prompt: "言語は Go。特徴を 3 つ、箇条書きで。",
    options: {
      resume: baseSessionId,
      forkSession: true,
      allowedTools: [],
    },
  }),
);

// 分岐 3: TypeScript (これも base からの独立分岐)
await consume(
  "Fork 3: TypeScript",
  query({
    prompt: "言語は TypeScript。特徴を 3 つ、箇条書きで。",
    options: {
      resume: baseSessionId,
      forkSession: true,
      allowedTools: [],
    },
  }),
);

console.log(`\n--- 完了 ---`);
console.log(`元のセッション ${baseSessionId} は無傷で残っており、`);
console.log(`3 つの分岐セッションが ~/.claude/projects/ 配下に新規 UUID で保存されている。`);
