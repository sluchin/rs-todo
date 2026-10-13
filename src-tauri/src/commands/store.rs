//! タスクとリストを JSON ファイルへ保存し, 読み込むモジュール.

use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};

/// データの保存先ディレクトリを上書きする環境変数の名前.
const DATA_DIR_ENV: &str = "RSTODO_DATA_DIR";
/// データを保存するファイルの名前.
const DATA_FILE_NAME: &str = "todo.json";
/// 既定の保存先ディレクトリ (`dirs::data_dir()` の下) の名前.
const APP_DIR_NAME: &str = "rstodo";

/// 1 つのタスク.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Task {
    /// タスクの識別子.
    pub id: String,
    /// タスクの題名.
    pub title: String,
    /// 完了しているか.
    #[serde(default)]
    pub completed: bool,
    /// 重要なタスクか.
    #[serde(default)]
    pub important: bool,
    /// 「今日の予定」に入れているか.
    #[serde(default)]
    pub my_day: bool,
    /// 期限 (`YYYY-MM-DD`). 未設定なら `None`.
    #[serde(default)]
    pub due_date: Option<String>,
    /// メモ.
    #[serde(default)]
    pub note: String,
    /// 完了した日時 (ローカル時間の `YYYY-MM-DDTHH:mm`). 未完了, または未設定なら `None`.
    #[serde(default)]
    pub completed_at: Option<String>,
    /// 属するリストの識別子.
    pub list_id: String,
    /// 作成日時 (ISO 8601).
    #[serde(default)]
    pub created_at: String,
}

/// タスクをまとめるリスト.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskList {
    /// リストの識別子.
    pub id: String,
    /// リストの名前.
    pub name: String,
}

/// 保存するデータ全体.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct TodoData {
    /// 利用者が作ったリスト. 既定のリスト「タスク」は含めない.
    #[serde(default)]
    pub lists: Vec<TaskList>,
    /// すべてのタスク.
    #[serde(default)]
    pub tasks: Vec<Task>,
}

/// 保存先のファイルのパスを決めます.
///
/// # Arguments
///
/// * `override_dir` - 環境変数 `RSTODO_DATA_DIR` の値. 指定されていれば, その下を使う.
/// * `data_dir` - OS 標準のデータディレクトリ.
///
/// # Returns
///
/// 保存先のファイルのパス. どちらも得られなければエラーの文字列.
pub fn resolve_data_path(
    override_dir: Option<OsString>,
    data_dir: Option<PathBuf>,
) -> Result<PathBuf, String> {
    if let Some(dir) = override_dir.filter(|d| !d.is_empty()) {
        return Ok(PathBuf::from(dir).join(DATA_FILE_NAME));
    }
    data_dir
        .map(|dir| dir.join(APP_DIR_NAME).join(DATA_FILE_NAME))
        .ok_or_else(|| "データの保存先を決められません".to_string())
}

/// 実行環境から保存先のファイルのパスを決めます.
///
/// # Returns
///
/// 保存先のファイルのパス. 決められなければエラーの文字列.
pub fn data_file_path() -> Result<PathBuf, String> {
    resolve_data_path(std::env::var_os(DATA_DIR_ENV), dirs::data_dir())
}

/// 指定したファイルからデータを読み込みます. ファイルがなければ空のデータを返します.
///
/// # Arguments
///
/// * `path` - 読み込むファイルのパス.
///
/// # Returns
///
/// 読み込んだデータ. 読み込みや解析に失敗したらエラーの文字列.
pub fn read_data(path: &Path) -> Result<TodoData, String> {
    if !path.exists() {
        return Ok(TodoData::default());
    }
    let text = fs::read_to_string(path)
        .map_err(|e| format!("{} を読み込めません: {}", path.display(), e))?;
    serde_json::from_str(&text)
        .map_err(|e| format!("{} の形式が正しくありません: {}", path.display(), e))
}

/// データを指定したファイルへ書き込みます. 親ディレクトリがなければ作ります.
///
/// 一時ファイルへ書いてから置き換えるので, 書き込みの途中で失敗しても元のファイルは壊れません.
///
/// # Arguments
///
/// * `path` - 書き込むファイルのパス.
/// * `data` - 保存するデータ.
///
/// # Returns
///
/// 成功したら `()`. 失敗したらエラーの文字列.
pub fn write_data(path: &Path, data: &TodoData) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("{} を作れません: {}", parent.display(), e))?;
    }
    let text = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, text).map_err(|e| format!("{} に書き込めません: {}", tmp.display(), e))?;
    fs::rename(&tmp, path).map_err(|e| format!("{} に書き込めません: {}", path.display(), e))
}

/// 保存したタスクとリストを読み込みます.
///
/// # Returns
///
/// 保存されているデータ. 失敗したらエラーの文字列.
#[tauri::command]
pub fn load_data() -> Result<TodoData, String> {
    read_data(&data_file_path()?)
}

/// タスクとリストを保存します.
///
/// # Arguments
///
/// * `data` - 保存するデータ全体.
///
/// # Returns
///
/// 成功したら `()`. 失敗したらエラーの文字列.
#[tauri::command]
pub fn save_data(data: TodoData) -> Result<(), String> {
    write_data(&data_file_path()?, &data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample() -> TodoData {
        TodoData {
            lists: vec![TaskList {
                id: "list-1".into(),
                name: "買い物".into(),
            }],
            tasks: vec![Task {
                id: "t1".into(),
                title: "牛乳を買う".into(),
                completed: false,
                important: true,
                my_day: true,
                due_date: Some("2026-01-02".into()),
                note: "2 本".into(),
                completed_at: Some("2026-01-03T09:30".into()),
                list_id: "list-1".into(),
                created_at: "2026-01-01T00:00:00Z".into(),
            }],
        }
    }

    #[test]
    fn test_resolve_data_path_override() {
        let path = resolve_data_path(Some("/tmp/x".into()), Some("/home/u".into())).unwrap();
        assert_eq!(path, PathBuf::from("/tmp/x/todo.json"));
    }

    #[test]
    fn test_resolve_data_path_default() {
        let path = resolve_data_path(Some("".into()), Some("/home/u".into())).unwrap();
        assert_eq!(path, PathBuf::from("/home/u/rstodo/todo.json"));
    }

    #[test]
    fn test_resolve_data_path_none() {
        assert!(resolve_data_path(None, None).is_err());
    }

    #[test]
    fn test_read_data_missing_file() {
        let dir = tempdir().unwrap();
        let data = read_data(&dir.path().join("none.json")).unwrap();
        assert_eq!(data, TodoData::default());
    }

    #[test]
    fn test_write_data_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("sub").join("todo.json");
        write_data(&path, &sample()).unwrap();
        assert_eq!(read_data(&path).unwrap(), sample());
        assert!(!path.with_extension("json.tmp").exists());
    }

    #[test]
    fn test_read_data_invalid_json() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("todo.json");
        fs::write(&path, "{ not json").unwrap();
        assert!(read_data(&path)
            .unwrap_err()
            .contains("形式が正しくありません"));
    }

    #[test]
    fn test_read_data_unreadable() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("todo.json");
        fs::create_dir(&path).unwrap();
        assert!(read_data(&path).unwrap_err().contains("読み込めません"));
    }

    #[test]
    fn test_read_data_defaults_missing_fields() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("todo.json");
        fs::write(
            &path,
            r#"{"tasks":[{"id":"a","title":"t","list_id":"tasks"}]}"#,
        )
        .unwrap();
        let data = read_data(&path).unwrap();
        assert!(data.lists.is_empty());
        assert!(!data.tasks[0].completed);
        assert_eq!(data.tasks[0].due_date, None);
        assert_eq!(data.tasks[0].completed_at, None);
    }

    #[test]
    fn test_write_data_parent_is_file() {
        let dir = tempdir().unwrap();
        let blocker = dir.path().join("file");
        fs::write(&blocker, "x").unwrap();
        assert!(write_data(&blocker.join("todo.json"), &sample()).is_err());
    }

    #[test]
    fn test_write_data_target_is_directory() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("todo.json");
        fs::create_dir(&path).unwrap();
        assert!(write_data(&path, &sample()).is_err());
    }
}
