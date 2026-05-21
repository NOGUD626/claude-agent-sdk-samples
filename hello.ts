// Claude Agent SDK の最小サンプル
// 実行: ANTHROPIC_API_KEY=sk-... npm run hello
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: "1 から 30 までの素数を、カンマ区切りで列挙して。説明は不要。",
  options: {
    model: "claude-sonnet-4-6",
    // ツール使用なしのプレーン応答にする
    allowedTools: [],
  },
});

for await (const message of result) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") {
        process.stdout.write(block.text);
      }
    }
  }
  if (message.type === "result") {
    process.stdout.write("\n---\n");
    console.log(`コスト: $${message.total_cost_usd?.toFixed(6) ?? "?"}`);
    console.log(`所要: ${message.duration_ms}ms`);
  }
}
