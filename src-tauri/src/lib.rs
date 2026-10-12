//! `rstodo` バックエンドアプリケーションのコアライブラリ.
//!
//! Tauri アプリケーションの初期化と, IPC ハンドラー (`commands` モジュール) の登録を管理します.

/// フロントエンドと通信する IPC コマンドを提供するモジュール.
pub mod commands;

/// Tauri アプリケーションをビルドして実行します.
///
/// # Panics
///
/// Tauri アプリケーションの初期化で修復不能なエラーが発生した場合,
/// `"error while running tauri application"` メッセージとともにパニックします.
#[cfg(not(tarpaulin_include))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::store::load_data,
            commands::store::save_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
