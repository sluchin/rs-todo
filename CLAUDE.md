# rs-todo プロジェクトガイド

## 概要
Tauri + React + Rust で構築されたタスク管理アプリ。Microsoft Todo ライクな基本機能と、日々の作業内容をアウトプットする機能を備えています。

## 技術スタック
- **フロントエンド**: React 19 + TypeScript + Vite
- **バックエンド**: Rust + Tauri 2
- **ビルド**: Cargo + npm
- **開発**: フロントエンドと Rust バックエンド両方のホットリロード対応

## アーキテクチャ
フロントエンド（`src/` 内の React コンポーネント）はタスク管理 UI と日報機能を管理します。バックエンド（`src-tauri/` 内の Rust）はタスクデータの管理、永続化、検索機能を処理します。

## 開発ワークフロー
- **開発サーバーを起動**: `npm run tauri:dev` — フロントエンドと Rust は両方とも変更時に自動リロード
- **テスト**: `npm run test`（`src/` に対する Vitest）と `npm run test:rust`（`src-tauri/` に対する）
- **フォーマット + リント**: `npm run check`（format:check、lint、test を実行 — CI ゲート）
- CI は `main` へのすべてのプッシュ/PR で同じ内容を実行

## 機能の追加

### Rust バックエンド関数の追加
`src-tauri/src/lib.rs` を編集:
1. 関数を `TaskStore` impl ブロック内に追加
2. `#[tauri::command]` 属性で新しいコマンド関数を作成
3. `generate_handler!` にコマンド関数を追加

### UI の更新
`src/` 内のコンポーネントを編集:
1. コンポーネントは `src/components/` に配置（後で構成化予定）
2. スタイルは `src/styles/` に配置
3. 状態変更について `App.tsx` を更新

### Tauri コマンド
React から呼び出し可能な新しいバックエンド関数を追加:
1. `src-tauri/src/lib.rs` に関数を追加
2. `generate_handler!` に追加
3. React から呼び出し: `await invoke('function_name', { arg: value })`

## 現在の実装状況

### 実装済み
- ✅ 基本的なタスク管理（作成・読取・更新・削除）
- ✅ タスク完了状態の切り替え
- ✅ タスク一覧表示
- ✅ 簡易 UI

### TODO
- [ ] タスク優先度
- [ ] 期限設定と期限切れアラート
- [ ] タスクカテゴリ/タグ
- [ ] 日報機能（日々の作業内容アウトプット）
- [ ] データの永続化（JSON ファイルまたはデータベース）
- [ ] タスク検索・フィルタリング
- [ ] キーボード操作の最適化
- [ ] ダークテーマ対応
- [ ] タスクのインポート/エクスポート

## ビルドと配布

```bash
# 開発
npm run tauri:dev

# 現在のプラットフォーム用にビルド
npm run tauri:build

# ビルドされたアプリの場所
src-tauri/target/release/rstodo  # または Windows では .exe、macOS では .app
```

## ヒント

- フロントエンドのホットリロードは Vite 開発サーバーを経由して機能
- Rust コードの変更はアプリのリロードが必要（自動的に発生）
- エラーをチェック: Tauri アプリで Ctrl+Shift+I
- Rust のコンパイルは最初のビルドでは遅くなる可能性がある

## コミットガイドライン

- コミットメッセージは英語で記述
- メッセージ本体はダッシュ/ハイフンで始まる（例: `- Add priority to tasks`）
- コミットメッセージに `Co-Authored-By` または Claude 帰属行を含めない

### Git 設定

```bash
git config user.name "Tetsuya Higashi"
git config user.email "996846+sluchin@users.noreply.github.com"
```

## プロジェクト構成

```
rs-todo/
├── src/                      # フロントエンド (React / TypeScript)
│   ├── components/           # React コンポーネント
│   ├── styles/               # CSS ファイル
│   ├── tests/                # テストファイル
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── src-tauri/                # バックエンド (Rust)
│   ├── src/
│   │   ├── lib.rs            # メインの Tauri ロジック
│   │   └── main.rs           # エントリポイント
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── CLAUDE.md                 # このファイル
├── README.md
└── .gitignore
```
