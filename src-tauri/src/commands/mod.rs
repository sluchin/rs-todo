//! フロントエンドから呼び出す IPC コマンドをまとめるモジュール.

/// 日報のファイルを保存するモジュール.
pub mod report;
/// タスクとリストの保存・読み込みを行うモジュール.
pub mod store;

pub use report::{is_valid_date, report_dir_for, save_report, write_report};
pub use store::{
    data_file_path, load_data, read_data, resolve_data_path, save_data, write_data, Task, TaskList,
    TodoData,
};
