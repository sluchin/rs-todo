# TODO

## クラウド同期 (Google Drive) と Android / iOS アプリ

結論: **できる**。Tauri v2 は Android (`tauri android`) と iOS (`tauri ios`) に対応していて、フロントエンド (React) とバックエンド (Rust) は、ほぼそのまま使える。データは Google Drive の API で同期する。ただし、次の 3 つにはまとまった作業が要る。

1. 同期のためのデータ設計 (競合の解決)。
2. Google の認証 (OAuth)。デスクトップと Android では方式が違う。
3. Android 向けの画面 (今は 3 列のデスクトップ向け) と、ビルド・署名。

### 方針

- **ローカルが正**: 今までどおり、端末のファイル (`todo.json`) に保存する。オフラインでも使える。同期はその上に重ねる (オフラインファースト)。
- **保存先は `appDataFolder`**: Google Drive の「アプリ専用フォルダ」(スコープ `https://www.googleapis.com/auth/drive.appdata`) に置く。利用者の Drive には見えず、ほかのファイルには触れない。権限が小さく、Google の審査も軽い。
- **同期は Drive API v3 (REST)**: `reqwest` などで Rust 側から呼ぶ。1 つの JSON ファイルを、取得 → マージ → 更新する。
- **デスクトップだけなら、もっと簡単な方法もある**: データのディレクトリ (`RSTODO_DATA_DIR`) を、Google Drive のデスクトップアプリの同期フォルダにする。API は要らない。ただし、Android では使えず、同時に編集するとファイルが衝突する。そのため、API で同期する方針にする。

### データ設計 (最初にやる。ここが一番大事)

今の保存形式はファイル全体を上書きする。2 台で編集して同期すると、片方の変更が消える。項目ごとにマージできるようにする。

- [ ] タスク・サブタスク・リストに `updated_at` (ISO 8601, UTC) を足す。編集のたびに更新する
- [ ] 削除は、すぐに消さず `deleted_at` を付ける (墓石 / tombstone)。消さないと、別の端末が「まだ有る」と見て復活させる。一定期間 (例: 30 日) たったら、完全に消す
- [ ] マージの規則: 項目の ID ごとに、`updated_at` が新しい方を採る (last-write-wins)。サブタスクはタスクの中の配列なので、サブタスク単位で `updated_at` を持たせてマージする
- [ ] 端末の時計のずれに備える: 同期のときに Drive の `modifiedTime` との差を見て補正するか、論理時計 (連番) を併用する
- [ ] マージは Tauri に依存しない純粋な関数 (Rust) にして、`cargo test` で検証する (同時編集・削除と編集の競合・時計のずれ)
- [ ] 旧形式 (`updated_at` が無い) のデータを読み込めるようにする (`#[serde(default)]`。無ければ読み込んだ日時にする)
- [ ] 同じファイルを 2 台が同時に更新しないよう、Drive の `headRevisionId` (または ETag) で楽観的に排他する。食い違ったら、再取得してマージし直す

### Google 認証 (OAuth 2.0)

- [ ] Google Cloud でプロジェクトを作り、Drive API を有効にする。OAuth の同意画面を設定する (スコープは `drive.appdata` だけ)
- [ ] **注意**: 同意画面が「テスト」状態だと、リフレッシュトークンが 7 日で切れる。個人で使うだけでも「本番」に公開しておく (`drive.appdata` は機密性の低いスコープなので、審査は軽い)
- [ ] デスクトップ (Windows / macOS / Linux): 「インストール型アプリ」の OAuth クライアントを作り、PKCE + ループバック (`http://127.0.0.1:<ポート>`) でログインする (例: `tauri-plugin-oauth`)。ブラウザで同意させる
- [ ] Android: Android 用の OAuth クライアントを作る (パッケージ名と、署名の SHA-1 フィンガープリントが要る)。Credential Manager / Google Sign-In か、カスタムスキームのリダイレクト (`tauri-plugin-deep-link`) でログインする。**デバッグ用とリリース用では署名が違う**ので、クライアント ID を両方登録する
- [ ] トークンの保存: リフレッシュトークンは、OS の安全な保管場所に置く (デスクトップ: `keyring` クレート、Android: Keystore)。`todo.json` や `config.json` には書かない
- [ ] ログアウト (トークンの削除と、Google 側の取り消し) を用意する

### 同期の動作

- [ ] 同期の契機: 起動時、データの変更から数秒後 (デバウンス)、手動の「今すぐ同期」ボタン、一定間隔 (アプリが前面にあるとき)
- [ ] 流れ: Drive から取得 → ローカルとマージ → 変わっていれば保存・アップロード
- [ ] 同期の状態 (最終同期の時刻・同期中・失敗・オフライン) を画面に出す。失敗しても、ローカルの操作は止めない
- [ ] 同期の IPC コマンド (`sync_now`、`sync_status`、`sign_in`、`sign_out`) を足し、`generate_handler!` に登録する。権限 (`capabilities/default.json`) も足す
- [ ] ネットワーク周りはテストしやすい形にする (Drive のクライアントを trait にして、テストでは差し替える)
- [ ] 暗号化 (任意): `appDataFolder` のデータは Google 側では暗号化されるが、端末側の鍵では暗号化していない。必要なら、パスフレーズで暗号化してから送る

### Android アプリ

- [ ] `npm run tauri android init` で、Android プロジェクトを生成する。必要なもの: Android Studio (SDK / NDK)、Rust の Android 用ターゲット (`aarch64-linux-android` など)、JDK
- [ ] **データの置き場所**: 今は `dirs::data_dir()` で決めていて、Android では動かない。Tauri のパス API (`app.path().app_data_dir()`) を使う形に直す (`resolve_data_path` にパスを渡す)
- [ ] **日報・週報の保存**: Android では、アプリ内のフォルダに保存しても利用者が開けない。共有 (Share) か、保存先の選択 (ファイルダイアログ) にする。コピーはそのまま使える
- [ ] **画面**: 今は、サイドバー・一覧・詳細の 3 列。幅が狭いときは 1 列にして、画面を切り替える (サイドバーはドロワー、詳細は一覧の上に重ねる)。戻るボタンの動作にも対応する
- [ ] タッチ操作: 押す場所は 44px 以上にする。右クリックを前提にしない (今は抑止している)。キーボード操作は補助にする
- [ ] 日付の入力には `<input type="date">` が使える。Android の WebView では見た目が変わるので、実機で確かめる
- [ ] 通知 (期限・予定日のリマインド): 任意。`tauri-plugin-notification` と、スケジュール (Android は WorkManager / AlarmManager) が要る。同期とは別の課題
- [ ] アイコンと、アダプティブアイコン (`npx tauri icon` が生成する `android/` を使う)
- [ ] 署名: リリース用のキーストア (`.jks`) を作る。**キーストアはリポジトリに入れない**。GitHub Actions のシークレットに置く
- [ ] CI (`release.yml`): Android のビルド (`tauri android build`) を足す。成果物は APK / AAB。Google Play に出さない場合は、APK を GitHub Releases に付けて手で入れる (サイドロード)
- [ ] 実機・エミュレータでの試験項目を、`INTEGRATION_TESTS.md` に足す (今は無い。作る)

### iOS アプリ

Android より後にする。同期とマージが Android で動いてから、同じ設計で作る。

- [ ] **ビルドには macOS が必須** (Xcode が Mac でしか動かない)。CI は `macos-latest` を使う。この開発環境 (Linux) では、ビルドも動作の確認もできない。Mac の実機で確かめる
- [ ] `npm run tauri ios init` で、Xcode のプロジェクトを生成する。Rust のターゲット: `aarch64-apple-ios` (実機)・`aarch64-apple-ios-sim` (シミュレータ)
- [ ] Apple の登録: 実機で試すだけなら Apple ID (無料) で足りるが、署名が 7 日で切れる。長く使うときと、TestFlight / App Store で配布するときは、Apple Developer Program (年 99 ドル) が要る。**Android の APK のように、ファイルを渡して入れてもらうことは、基本的にできない**
- [ ] 署名: 証明書とプロビジョニングプロファイルを用意する。CI ではシークレットに置く (リポジトリには入れない)
- [ ] データの置き場所: Android と同じく、Tauri のパス API (`app.path().app_data_dir()`) を使う
- [ ] 日報・週報の保存: 共有シート (Share) か、ファイルアプリへの保存にする
- [ ] Google ログイン: iOS 用の OAuth クライアント (バンドル ID を登録) を作り、カスタム URL スキームでリダイレクトする (`tauri-plugin-deep-link`)。トークンは Keychain に置く
- [ ] 画面は Android 用の 1 列のレイアウトを使う。WKWebView (Safari と同じ描画エンジン) なので、`<input type="date">` の見た目とセーフエリア (ノッチ・ホームバー) を実機で確かめる
- [ ] App Store の審査: プライバシーの説明 (Google Drive にタスクを保存する旨)、スクリーンショット、アプリ名・アイコンが要る
- [ ] `release.yml` に、iOS のビルド (`tauri ios build`) を足す。成果物は `.ipa`。TestFlight へのアップロードには `xcrun altool` / Fastlane などを使う

### 進める順序

1. **データ設計** (`updated_at`・墓石・マージ関数)。同期が無くても先に入れられて、テストしやすい。
2. **Android でローカルだけ動かす** (データの置き場所、1 列の画面、ビルド)。同期なしでもアプリとして使える。
3. **デスクトップで Google ログイン + 同期** (ループバックは扱いやすい)。
4. **Android でログイン + 同期**。
5. **iOS** (Android と同じ設計を使う)。
6. 仕上げ (状態表示、リフレッシュトークンの更新、再ログイン、署名、CI)。

### 注意・リスク

- **Android と iOS は、これまで一度もビルドしていない**。Tauri の Android 対応はデスクトップより新しいので、プラグインの対応状況を最初に確かめる。
- **競合の解決は完全ではない**。2 台でほぼ同時に同じタスクを編集すると、新しい方だけが残る (項目単位)。メモの文章を文字単位でマージすることまではしない。
- **Google の仕様変更**: OAuth の方式と審査の条件は、変わることがある。着手する前に、最新の公式文書を確かめる。
- **個人情報**: タスクの内容が Google のサーバーに置かれる。このことを README にも書いておく。
- Drive の利用 (無料の範囲。Drive API は無料) では、費用はかからない。ストアに出す場合のみ、登録料が要る (Google Play: 25 ドル、1 回。Apple Developer Program: 年 99 ドル)。

## 配布

### デスクトップ版

方針: **GitHub Releases で配る**。CI の Artifact (Actions の成果物) は、保存期間が限られ (既定 90 日)、ログインしないと取れない。そのため、利用者向けの配布には使わない。

- [x] `v*` タグを push すると、`release.yml` が 3 OS 向けにビルドして、GitHub Releases に**ドラフト**を作る (済み)
- [ ] ドラフトを確かめてから、手で「公開」する運用にする。リリースノート (変更点) を書く
- [ ] ファイル名に、OS と形式が分かる名前を付ける (例: `rstodo_0.1.0_windows_x64.msi`、`..._macos_universal.dmg`、`..._linux_amd64.AppImage`)
- [ ] ダウンロード用のページ (GitHub Pages、任意): 今は Pages に API ドキュメント (typedoc / cargo doc) を公開している。同じサイトに「ダウンロード」のページを足して、`https://github.com/<owner>/rs-todo/releases/latest` へのリンクと、OS ごとの案内を置く。**インストーラの実体は、Pages ではなく Releases に置く** (Pages にはサイズと帯域の制限がある)
- [ ] 署名: 署名していないと OS が警告を出す。**macOS**: Apple Developer ID の署名と公証 (notarization) が要る (年 99 ドル)。署名しないと「壊れている」と表示され、右クリックから開く必要がある。**Windows**: コード署名証明書 (有料) が無いと、SmartScreen が警告を出す (使われるうちに警告は減る)。**Linux**: 署名は不要 (AppImage / deb / rpm)
- [ ] 自動更新 (任意): `tauri-plugin-updater` を使う。更新用の署名鍵 (OS の署名とは別) を作り、秘密鍵は GitHub のシークレットに置く。`tauri-action` が `latest.json` を Releases に付けて、アプリがそれを見て更新を知らせる
- [ ] パッケージマネージャー (任意): Windows の winget / Scoop、macOS の Homebrew Cask。リリースごとに更新が要る

### モバイル版

- Android: APK を Releases に付けて手で入れる (サイドロード)。または、Google Play に出す
- iOS: TestFlight / App Store (サイドロードは基本的にできない)

## そのほか

- [ ] 「計画済み」ビューの条件に、期限だけでなく予定日・着手日も入れるかを決める
- [ ] サブタスクの日付を、「計画済み」・並べ替え・週報に使うかを決める
- [ ] 親タスクを完了にしたときに、未完了のサブタスクも完了にするかを決める
- [ ] 日報・週報に、所感の自由記述欄を付ける

## 不具合

- [ ] 「計画済み」のタスクを完了にすると、完了済みのタスクが「計画済み」の一覧に 1 件出てしまう。
