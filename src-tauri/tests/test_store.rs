//! `commands::store` のテスト.

use std::fs;
use std::path::PathBuf;

use rstodo::commands::{
    read_data, resolve_data_path, write_data, Subtask, Task, TaskList, TodoData,
};
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
            planned_date: Some("2026-01-04".into()),
            start_date: Some("2026-01-03".into()),
            note: "2 本".into(),
            subtasks: vec![Subtask {
                id: "s1".into(),
                title: "レジに並ぶ".into(),
                completed: true,
                planned_date: Some("2026-01-02".into()),
                start_date: None,
                due_date: Some("2026-01-03".into()),
                completed_at: Some("2026-01-03T09:00".into()),
            }],
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
    assert_eq!(data.tasks[0].planned_date, None);
    assert_eq!(data.tasks[0].start_date, None);
    assert!(data.tasks[0].subtasks.is_empty());
}

#[test]
fn test_read_data_subtask_defaults_missing_fields() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("todo.json");
    fs::write(
        &path,
        r#"{"tasks":[{"id":"a","title":"t","list_id":"tasks","subtasks":[{"id":"s","title":"u"}]}]}"#,
    )
    .unwrap();
    let sub = &read_data(&path).unwrap().tasks[0].subtasks[0];
    assert!(!sub.completed);
    assert_eq!(sub.planned_date, None);
    assert_eq!(sub.start_date, None);
    assert_eq!(sub.due_date, None);
    assert_eq!(sub.completed_at, None);
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
