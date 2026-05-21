// 拡張思考 (extended thinking) で深く考えさせるサンプル
// thinking + effort で深さを指定。thinking ブロックの文字数も計測する。
//
// 実行: npm run think
import { query } from "@anthropic-ai/claude-agent-sdk";

const PUZZLE = `次のパズルを解いてください。

3 つの箱があり、それぞれ「リンゴ」「オレンジ」「リンゴとオレンジ」とラベルが貼られている。
しかし、3 つすべてのラベルが間違っている (中身と一致していない) ことが分かっている。
1 つの箱を選んで中から 1 個だけ果物を取り出すと、3 つすべての箱の中身を確定できる。
どの箱を選ぶべきか、論理的な根拠とともに答えてください。`;

const result = query({
  prompt: PUZZLE,
  options: {
    model: "claude-sonnet-4-6",
    thinking: { type: "enabled", budgetTokens: 16000 },
    effort: "high",
    allowedTools: [],
  },
});

let thinkingChars = 0;
let outputChars = 0;
let thinkingShown = false;

for await (const m of result as any) {
  if (m.type === "assistant") {
    for (const b of m.message.content) {
      if (b.type === "thinking") {
        thinkingChars += (b.thinking ?? "").length;
        if (!thinkingShown) {
          process.stdout.write("\n[💭 思考中...]\n");
          thinkingShown = true;
        }
      }
      if (b.type === "text") {
        if (thinkingShown) {
          process.stdout.write("\n[💡 回答]\n");
          thinkingShown = false;
        }
        process.stdout.write(b.text);
        outputChars += b.text.length;
      }
    }
  }
  if (m.type === "result") {
    console.log("\n\n--- 統計 ---");
    console.log(`思考トークン分の文字数 : ${thinkingChars}`);
    console.log(`回答の文字数           : ${outputChars}`);
    console.log(`合計コスト             : $${m.total_cost_usd?.toFixed(6) ?? "?"}`);
    console.log(`所要時間               : ${m.duration_ms}ms`);
  }
}
