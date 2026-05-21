// カスタムツールを 1 つ渡して、エージェントに使わせるサンプル
// 実行: ANTHROPIC_API_KEY=sk-... npm run tool
import {
  query,
  tool,
  createSdkMcpServer,
} from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// 現在時刻を返すだけのカスタムツール (MCP サーバとして提供)
const clockServer = createSdkMcpServer({
  name: "clock",
  version: "0.1.0",
  tools: [
    tool(
      "now",
      "現在の日時を ISO8601 形式で返す",
      { tz: z.string().optional().describe("タイムゾーン (例: Asia/Tokyo)") },
      async ({ tz }) => {
        const now = new Date();
        const text = tz
          ? now.toLocaleString("ja-JP", { timeZone: tz })
          : now.toISOString();
        return { content: [{ type: "text", text }] };
      },
    ),
  ],
});

const result = query({
  prompt: "now ツールを使って、今の日本時間を教えて。",
  options: {
    model: "claude-sonnet-4-6",
    mcpServers: { clock: clockServer },
    allowedTools: ["mcp__clock__now"],
  },
});

for await (const message of result) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") process.stdout.write(block.text);
      if (block.type === "tool_use") {
        console.log(`\n[tool_use] ${block.name}(${JSON.stringify(block.input)})`);
      }
    }
  }
  if (message.type === "result") {
    console.log(`\n--- 完了 (${message.duration_ms}ms) ---`);
  }
}
