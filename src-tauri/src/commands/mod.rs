//! フロントエンドから呼び出す IPC コマンドをまとめるモジュール.

/// タスクとリストの保存・読み込みを行うモジュール.
pub mod store;

pub use store::{
    data_file_path, load_data, read_data, resolve_data_path, save_data, write_data, Task, TaskList,
    TodoData,
};
