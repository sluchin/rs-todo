# rs-todo

Tauri（Rust + React）で構築されたタスク管理アプリケーション。Microsoft Todo ライクな機能と日々の作業内容アウトプット機能を備えています。

## 機能

- ✅ タスクの作成・読取・更新・削除
- ✅ タスク完了状態の切り替え
- ✅ クロスプラットフォーム対応（Windows、Linux、macOS）

## はじめ方

### 必要な環境

- Node.js 16+
- Rust 1.70+

### インストール

```bash
npm install
```

### 開発

```bash
npm run tauri:dev
```

Vite 開発サーバーと Tauri バックエンドが起動し、ホットリロードに対応します。

### テスト

```bash
npm run test              # フロントエンドテスト実行
npm run test:rust         # バックエンドテスト実行
npm run test:all          # 両方のテスト実行
```

### ビルド

```bash
npm run tauri:build
```

ビルドされたアプリケーションは `src-tauri/target/release/` に配置されます。

### コード品質

```bash
npm run check             # フォーマットチェック、リント、テスト実行
npm run format            # コード整形
npm run lint:all          # フロントエンド・バックエンドのリント実行
```

## プロジェクト構造

詳細な開発ガイドについては [CLAUDE.md](./CLAUDE.md) を参照してください。

## ライセンス

LICENSE ファイルを参照してください。
