//! 日報のファイルを保存するモジュール.

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

/// 日報のファイルを書き込みます. ディレクトリがなければ作ります. 同じ日付のファイルは上書きします.
///
/// # Arguments
///
/// * `dir` - 日報を保存するディレクトリ.
/// * `date` - 日報の日付 (`YYYY-MM-DD`).
/// * `content` - 日報の内容.
///
/// # Returns
///
/// 書き込んだファイルのパス. 日付の形が正しくない, または書き込めなければエラーの文字列.
pub fn write_report(dir: &Path, date: &str, content: &str) -> Result<PathBuf, String> {
    if !is_valid_date(date) {
        return Err(format!("日付の形式が正しくありません: {}", date));
    }
    fs::create_dir_all(dir).map_err(|e| format!("{} を作れません: {}", dir.display(), e))?;
    let path = dir.join(format!("report-{}.md", date));
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

/// 日報をファイルに保存します.
///
/// # Arguments
///
/// * `date` - 日報の日付 (`YYYY-MM-DD`).
/// * `content` - 日報の内容 (Markdown).
///
/// # Returns
///
/// 保存したファイルのパス. 失敗したらエラーの文字列.
#[tauri::command]
pub fn save_report(date: String, content: String) -> Result<String, String> {
    let dir = report_dir_for(&data_file_path()?)?;
    write_report(&dir, &date, &content).map(|p| p.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_is_valid_date() {
        assert!(is_valid_date("2026-01-05"));
        assert!(!is_valid_date("2026-1-5"));
        assert!(!is_valid_date("2026/01/05"));
        assert!(!is_valid_date("../../etc/x"));
        assert!(!is_valid_date(""));
    }

    #[test]
    fn test_write_report_creates_and_overwrites() {
        let dir = tempdir().unwrap();
        let reports = dir.path().join("reports");
        let path = write_report(&reports, "2026-01-05", "# a").unwrap();
        assert_eq!(path, reports.join("report-2026-01-05.md"));
        assert_eq!(fs::read_to_string(&path).unwrap(), "# a");
        write_report(&reports, "2026-01-05", "# b").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "# b");
    }

    #[test]
    fn test_write_report_invalid_date() {
        let dir = tempdir().unwrap();
        let err = write_report(dir.path(), "../x", "a").unwrap_err();
        assert!(err.contains("日付の形式"));
    }

    #[test]
    fn test_write_report_dir_is_file() {
        let dir = tempdir().unwrap();
        let blocker = dir.path().join("file");
        fs::write(&blocker, "x").unwrap();
        assert!(write_report(&blocker, "2026-01-05", "a")
            .unwrap_err()
            .contains("作れません"));
    }

    #[test]
    fn test_write_report_target_is_directory() {
        let dir = tempdir().unwrap();
        fs::create_dir_all(dir.path().join("report-2026-01-05.md")).unwrap();
        assert!(write_report(dir.path(), "2026-01-05", "a")
            .unwrap_err()
            .contains("書き込めません"));
    }

    #[test]
    fn test_report_dir_for() {
        assert_eq!(
            report_dir_for(Path::new("/d/rstodo/todo.json")).unwrap(),
            PathBuf::from("/d/rstodo/reports")
        );
        assert!(report_dir_for(Path::new("")).is_err());
    }
}
