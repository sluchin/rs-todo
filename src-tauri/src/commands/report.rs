//! 日報・週報のファイルを保存するモジュール.

use super::store::data_file_path;
use std::fs;
use std::path::{Path, PathBuf};

/// 日報を保存するディレクトリの名前 (データのディレクトリの下).
const REPORT_DIR_NAME: &str = "reports";

/// 日付の文字列が `YYYY-MM-DD` の形か調べます. ファイル名に使うので, 数字とハイフン以外は認めません.
///
/// # Arguments
///
/// * `date` - 調べる文字列.
///
/// # Returns
///
/// `YYYY-MM-DD` の形なら `true`.
pub fn is_valid_date(date: &str) -> bool {
    let bytes = date.as_bytes();
    bytes.len() == 10
        && bytes.iter().enumerate().all(|(i, b)| {
            if i == 4 || i == 7 {
                *b == b'-'
            } else {
                b.is_ascii_digit()
            }
        })
}

/// レポートの種類から, ファイル名の接頭辞を決めます.
///
/// # Arguments
///
/// * `kind` - レポートの種類 (`daily` または `weekly`).
///
/// # Returns
///
/// ファイル名の接頭辞. 種類が正しくなければエラーの文字列.
fn file_prefix(kind: &str) -> Result<&'static str, String> {
    match kind {
        "daily" => Ok("report"),
        "weekly" => Ok("weekly"),
        _ => Err(format!("レポートの種類が正しくありません: {}", kind)),
    }
}

/// 日報・週報のファイルを書き込みます. ディレクトリがなければ作ります. 同じ種類・日付のファイルは上書きします.
///
/// # Arguments
///
/// * `dir` - レポートを保存するディレクトリ.
/// * `kind` - レポートの種類 (`daily` または `weekly`). 日報は `report-DATE.md`, 週報は `weekly-DATE.md` になる.
/// * `date` - レポートの日付 (`YYYY-MM-DD`). 週報は, 週の最初の日.
/// * `content` - レポートの内容.
///
/// # Returns
///
/// 書き込んだファイルのパス. 種類や日付の形が正しくない, または書き込めなければエラーの文字列.
pub fn write_report(dir: &Path, kind: &str, date: &str, content: &str) -> Result<PathBuf, String> {
    let prefix = file_prefix(kind)?;
    if !is_valid_date(date) {
        return Err(format!("日付の形式が正しくありません: {}", date));
    }
    fs::create_dir_all(dir).map_err(|e| format!("{} を作れません: {}", dir.display(), e))?;
    let path = dir.join(format!("{}-{}.md", prefix, date));
    fs::write(&path, content).map_err(|e| format!("{} に書き込めません: {}", path.display(), e))?;
    Ok(path)
}

/// データのファイルのパスから, 日報を保存するディレクトリのパスを決めます.
///
/// # Arguments
///
/// * `data_file` - データのファイル (`todo.json`) のパス.
///
/// # Returns
///
/// 日報を保存するディレクトリ. 親のディレクトリが無ければエラーの文字列.
pub fn report_dir_for(data_file: &Path) -> Result<PathBuf, String> {
    data_file
        .parent()
        .map(|dir| dir.join(REPORT_DIR_NAME))
        .ok_or_else(|| "日報の保存先を決められません".to_string())
}

/// 日報・週報をファイルに保存します.
///
/// # Arguments
///
/// * `kind` - レポートの種類 (`daily` または `weekly`).
/// * `date` - レポートの日付 (`YYYY-MM-DD`). 週報は, 週の最初の日.
/// * `content` - レポートの内容 (Markdown).
///
/// # Returns
///
/// 保存したファイルのパス. 失敗したらエラーの文字列.
#[tauri::command]
pub fn save_report(kind: String, date: String, content: String) -> Result<String, String> {
    let dir = report_dir_for(&data_file_path()?)?;
    write_report(&dir, &kind, &date, &content).map(|p| p.display().to_string())
}
