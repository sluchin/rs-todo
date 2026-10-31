//! `commands::report` のテスト.

use std::fs;
use std::path::{Path, PathBuf};

use rstodo::commands::{is_valid_date, report_dir_for, write_report};
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
    let path = write_report(&reports, "daily", "2026-01-05", "# a").unwrap();
    assert_eq!(path, reports.join("report-2026-01-05.md"));
    assert_eq!(fs::read_to_string(&path).unwrap(), "# a");
    write_report(&reports, "daily", "2026-01-05", "# b").unwrap();
    assert_eq!(fs::read_to_string(&path).unwrap(), "# b");
}

#[test]
fn test_write_report_weekly_and_invalid_kind() {
    let dir = tempdir().unwrap();
    let path = write_report(dir.path(), "weekly", "2026-01-05", "# w").unwrap();
    assert_eq!(path, dir.path().join("weekly-2026-01-05.md"));
    let err = write_report(dir.path(), "../x", "2026-01-05", "a").unwrap_err();
    assert!(err.contains("種類"));
}

#[test]
fn test_write_report_invalid_date() {
    let dir = tempdir().unwrap();
    let err = write_report(dir.path(), "daily", "../x", "a").unwrap_err();
    assert!(err.contains("日付の形式"));
}

#[test]
fn test_write_report_dir_is_file() {
    let dir = tempdir().unwrap();
    let blocker = dir.path().join("file");
    fs::write(&blocker, "x").unwrap();
    assert!(write_report(&blocker, "daily", "2026-01-05", "a")
        .unwrap_err()
        .contains("作れません"));
}

#[test]
fn test_write_report_target_is_directory() {
    let dir = tempdir().unwrap();
    fs::create_dir_all(dir.path().join("report-2026-01-05.md")).unwrap();
    assert!(write_report(dir.path(), "daily", "2026-01-05", "a")
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
