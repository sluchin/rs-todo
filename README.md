# rstodo

Microsoft To Do 風の見た目をした、TODO アプリケーション。Tauri v2 (バックエンド: Rust、フロントエンド: React 19 / TypeScript / Vite) で作る。

## 機能

- 左: スマートリスト (今日の予定・重要・計画済み・すべて)、既定のリスト「タスク」、自分のリスト
- 中央: タスクの追加、完了 (丸)、重要 (星)、期限の表示、完了済みの折りたたみ
- 右: 詳細ペイン (題名・今日の予定・期限・メモの編集、削除)
- データは JSON ファイル (`<OS のデータディレクトリ>/rstodo/todo.json`) に保存する。環境変数 `RSTODO_DATA_DIR` で保存先のディレクトリを変えられる。

## 開発

| 目的                | コマンド                                                                      |
| ------------------- | ----------------------------------------------------------------------------- |
| 開発サーバー        | `npm run tauri:dev`                                                           |
| ビルド              | `npm run build`                                                               |
| テスト              | `npm run test` (Vitest)、`npm run test:rust` (cargo test)                     |
| 整形                | `npm run format` (Prettier + cargo fmt)                                       |
| 整形チェック + 検査 | `npm run check` (format:check、eslint、clippy、vitest、cargo test。CI と同じ) |
| カバレッジ          | `npm run coverage:fe` (Vitest)、`npm run coverage:be` (cargo tarpaulin)       |
| ドキュメント        | `npm run doc` (typedoc、cargo doc)                                            |

Linux では、Tauri のビルドに `libwebkit2gtk-4.1-dev` などのシステムライブラリが必要。

## 構成

- `src/`: フロントエンド。`features/tasks/{components,hooks,types.ts,taskLogic.ts}` に機能をまとめる。テストは `src/tests/`。
- `src-tauri/`: バックエンド。`src/commands/store.rs` がデータの保存・読み込み。
- `src-tauri/icons/`: アプリのアイコン。`public/icon.svg` が元の絵 (`npx tauri icon` で作り直せる)。
