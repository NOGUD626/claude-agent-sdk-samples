# agent-sdk-test

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-5FA04E?logo=nodedotjs&logoColor=white)
![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3.146-D97757?logo=anthropic&logoColor=white)
![Claude CLI](https://img.shields.io/badge/claude_CLI-2.1.144-D97757?logo=anthropic&logoColor=white)
![zod](https://img.shields.io/badge/zod-4.x-3068B7)
![macOS](https://img.shields.io/badge/macOS-Apple_Silicon-000000?logo=apple&logoColor=white)
![License](https://img.shields.io/badge/License-Public_Domain-lightgrey)

[Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)
(旧 Claude Code SDK) の最小動作確認用サンプル。

TypeScript で 6 パターン:

| ファイル | 概要 | 主に使う機能 |
|---|---|---|
| [`hello.ts`](./hello.ts) | ツール無しの純粋応答 (素数列挙) | `query()` |
| [`with-tool.ts`](./with-tool.ts) | カスタム MCP ツール (`now`) を渡してエージェントに呼ばせる | `createSdkMcpServer` / `tool()` |
| [`session-resume.ts`](./session-resume.ts) | 会話の保存と再開。1 回目で覚えさせて 2 回目で思い出させる | `sessionId` / `resume` |
| [`interactive.ts`](./interactive.ts) | ストリーミング入力モードの対話 REPL。実行中にモデル切替・中断もできる | `prompt: AsyncIterable` / `setModel()` / `interrupt()` |
| [`think-hard.ts`](./think-hard.ts) | 拡張思考で深く考えさせる。思考トークン量も計測 | `thinking` / `effort` |
| [`fork-explore.ts`](./fork-explore.ts) | 同じ起点から複数の分岐セッションを作る | `resume` + `forkSession` |

## 構成

```
┌─────────────── アプリ ────────────────┐
│                                       │
│   query({ prompt, options }) ─┐       │
│                               │       │
│                               ▼       │
│                       ┌──── Query ────┐
│                       │ AsyncGenerator│  ← for await でメッセージ取得
│                       │ interrupt()   │
│                       │ setModel()    │  ← 実行中に呼べる
│                       │ streamInput() │
│                       └───────────────┘
└──────────────────────┬────────────────┘
                       │ サブプロセス
                       ▼
            ┌─── claude CLI ───┐
            │ エージェントループ │  ← maxTurns / thinking で制御
            └────────┬─────────┘
                     │
                     ▼
        ┌── ~/.claude/projects/...jsonl ──┐
        │  セッション永続化                │
        │  resume / continue / forkSession │
        └──────────────────────────────────┘
```

## セッション・ループ・思考の早見表

`query({ options })` で渡せる主要オプション (Anthropic SDK のオプションを抜粋):

| カテゴリ | オプション | 役割 |
|---|---|---|
| **セッション** | `continue: true` | 同じ cwd の直近会話を継続 |
|  | `resume: "<uuid>"` | 特定セッションを再開 |
|  | `sessionId: "<uuid>"` | 新規セッション ID を自分で割り当て |
|  | `resumeSessionAt: "<msgUuid>"` | 特定メッセージまで巻き戻して再開 |
|  | `forkSession: true` | resume と併用、新 ID で分岐 (元は無傷) |
|  | `persistSession: false` | 永続化を無効化 (使い捨て) |
|  | `sessionStore: SessionStore` | 外部 DB 等にミラー |
| **ループ** | `maxTurns: N` | 最大ターン数 |
|  | `maxBudgetUsd: N` | 累計 $N で停止 |
| **思考** | `thinking: { type: 'adaptive' }` | モデルに思考深度を委ねる |
|  | `thinking: { type: 'enabled', budgetTokens: N }` | 拡張思考に固定予算 |
|  | `thinking: { type: 'disabled' }` | 思考なし (最速) |
|  | `effort: 'low'\|'medium'\|'high'\|'xhigh'\|'max'` | 努力レベル |

`query()` の戻り値 `Query` で実行中に呼べるメソッド (ストリーミング入力時のみ):

| メソッド | 役割 |
|---|---|
| `interrupt()` | 現在のターンを中断 (ESC 相当) |
| `setPermissionMode(mode)` | 権限モード切替 (`default`/`acceptEdits`/`bypassPermissions`/`plan` 等) |
| `setModel(name?)` | 途中でモデル切替 |
| `streamInput(stream)` | 追加のユーザーメッセージを投入 |
| `backgroundTasks()` | Ctrl+B 相当、走ってる重いツールをバックグラウンドへ |
| `rewindFiles(msgUuid)` | `/rewind` 相当、ファイル状態を巻き戻し |
| `getContextUsage()` | 現在のトークン消費内訳を取得 |

セッション操作の補助関数 (`query()` とは別に export されている):

```
listSessions({ dir })          — 一覧
getSessionInfo(sessionId)      — メタ情報
getSessionMessages(sessionId)  — 全メッセージ取得
forkSession(sessionId)         — 分岐 (関数版)
deleteSession(sessionId)       — 削除
renameSession(sessionId, name) — タイトル変更
```

ポイント:

- SDK は内部で **ローカルの `claude` CLI をサブプロセス起動** する。
  `ANTHROPIC_API_KEY` 未設定でも、CLI がログイン済みなら
  サブスクリプション枠で動く (本リポジトリの動作確認もこれ)。
- カスタムツールは MCP サーバとして実装する。`createSdkMcpServer` で
  in-process な MCP サーバを作り、`mcpServers` オプションで渡す。

## 動作確認済み環境

- macOS (Apple Silicon)
- Node.js 20.x 以降
- `claude` CLI 2.1.144 (Claude Code) ログイン済み
- `@anthropic-ai/claude-agent-sdk` 0.3.146
- `zod` 4.x **(必須。v3 では peer dep 解決に失敗する)**

## セットアップ

```bash
cd ~/Desktop/sandbox/agent-sdk-test
npm install
```

API キー認証を使いたい場合は環境変数を設定:

```bash
export ANTHROPIC_API_KEY="sk-..."
```

サブスクリプション (`claude` CLI ログイン済み) を使う場合は何もしなくてよい。

## 実行

### 1. プレーン応答

```bash
npm run hello
```

実行例:

```
2, 3, 5, 7, 11, 13, 17, 19, 23, 29
---
コスト: $0.065891
所要: 5137ms
```

### 2. カスタムツール付き

```bash
npm run tool
```

実行例:

```
[tool_use] mcp__clock__now({"tz":"Asia/Tokyo"})
現在の日本時間は **2026年5月21日 23時23分13秒** です。
--- 完了 (12386ms) ---
```

### 3. セッション再開

```bash
npm run session          # 1 回目: 数字を覚えさせて sessionId を保存
npm run session:resume   # 2 回目: その sessionId で再開、覚えてるか確認
```

実行例 (2 回目):

```
[resume] sessionId=41900527-d4c8-4ba3-a218-c67a02df1e57

84
--- 完了 (6545ms) ---
```

sessionId は `.last-session-id` に保存。永続化先は `~/.claude/projects/<cwdハッシュ>/<sessionId>.jsonl`。

### 4. 対話 REPL

```bash
npm run interactive
```

- `>` プロンプトに入力 → Enter で送信
- `exit` または空入力で終了
- `/model claude-haiku-4-5` のように入力すると **実行中にモデル切替** (`setModel()`)
- `/stop` で **現在のターンを中断** (`interrupt()`)

`prompt` に `AsyncIterable<SDKUserMessage>` を渡しているので、`query()` は終わらず
ユーザー入力を待ち続け、新しい入力が来るたびに次のターンを実行する。

### 5. 拡張思考

```bash
npm run think
```

実行例 (抜粋):

```
[💭 思考中...]
[💡 回答]
答え: 「リンゴとオレンジ」とラベルのある箱 (= 箱 C) から取り出す
...
--- 統計 ---
思考トークン分の文字数 : 2211
回答の文字数           : 874
合計コスト             : $0.100010
所要時間               : 39663ms
```

`thinking: { type: 'enabled', budgetTokens: 16000 }` + `effort: 'high'` を指定。
内部の推論プロセスが `thinking` ブロックで観察できる。

### 6. セッション分岐

```bash
npm run fork
```

1 つの起点セッションから 3 つの言語に独立分岐する。
元のセッション ID は無傷で残るので、後から別の言語で再分岐もできる。

実行例 (抜粋):

```
[base] sessionId=fbb07879-0b8c-4d97-87b8-3abf033f2070

=== base ===
はい、準備できました。言語をどうぞ。

=== Fork 1: Rust ===
- 所有権と借用によるメモリ安全性をコンパイル時に保証 (GC 不要)
- ...

=== Fork 2: Go ===
- 静的型付け＋シンプルな構文で、コンパイル速度が速い
- ...

=== Fork 3: TypeScript ===
- ...
```

## コード解説

### hello.ts — 最小例

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: "1 から 30 までの素数を、カンマ区切りで列挙して。",
  options: {
    model: "claude-sonnet-4-6",
    allowedTools: [],   // ツール無しの純粋応答
  },
});

for await (const message of result) {
  // message.type は "assistant" | "user" | "result" | "system" | ...
  // assistant の content[].text を逐次表示すればストリーミングになる
}
```

`query()` は **async iterable** を返す。`for await` で逐次受け取り、
`message.type` で分岐する。`result` タイプには合計コスト / 所要時間が入る。

### with-tool.ts — カスタムツール

```ts
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const clockServer = createSdkMcpServer({
  name: "clock",
  version: "0.1.0",
  tools: [
    tool(
      "now",
      "現在の日時を ISO8601 形式で返す",
      { tz: z.string().optional() },
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
    mcpServers: { clock: clockServer },
    allowedTools: ["mcp__clock__now"],   // この MCP ツールだけ許可
  },
});
```

- `tool(name, description, inputSchema, handler)` で 1 ツール定義
- 第 3 引数の inputSchema は **zod スキーマ** をそのまま渡す
- 許可するツール名は `mcp__<server名>__<tool名>` という命名規則
  (上記なら `mcp__clock__now`)

## ハマりどころ

| 症状 | 原因 / 対処 |
|---|---|
| `npm install` が peer dep でエラー | `zod` を `^4.0.0` に上げる。v3 不可 |
| 認証で詰まる | `claude` CLI が未ログインなら `claude login`、または `ANTHROPIC_API_KEY` を設定 |
| ツールが呼ばれない | `allowedTools` に `mcp__<server>__<tool>` を含めているか確認 |
| プロンプトが応答だけで終わる | `model` を `claude-sonnet-4-6` 等に明示すると安定する |

## 参考

- npm: <https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk>
- 旧称: Claude Code SDK → **Claude Agent SDK** に改名
- Claude Code 本体 (CLI) も内部はこの SDK と同じエージェントループ

## ライセンス

このサンプルは public domain 相当 (動作確認用の習作)。
SDK 本体のライセンスは `node_modules/@anthropic-ai/claude-agent-sdk/LICENSE.md` を参照。
