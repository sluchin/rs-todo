//! `rstodo` バックエンドアプリケーションのコアライブラリ.
//!
//! Tauri アプリケーションの初期化と, IPC ハンドラー (`commands` モジュール) の登録を管理します.

/// フロントエンドと通信する IPC コマンドを提供するモジュール.
pub mod commands;

/// ログの初期化 (標準エラー出力とログファイル) と, フロントエンドのログの記録.
pub mod logging;

/// Tauri アプリケーションをビルドして実行します.
///
/// # Panics
///
/// Tauri アプリケーションの初期化で修復不能なエラーが発生した場合,
/// `"error while running tauri application"` メッセージとともにパニックします.
#[cfg(not(tarpaulin_include))]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logging::init_logging();
    log::info!("Started rstodo {}", env!("CARGO_PKG_VERSION"));
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            logging::log_frontend_message,
            commands::store::load_data,
            commands::store::save_data,
            commands::report::save_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
