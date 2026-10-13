use rstodo::commands::{load_data, save_data, save_report, Subtask, Task, TodoData};
use tempfile::tempdir;

#[test]
fn test_save_and_load_data_integration() {
    let dir = tempdir().unwrap();
    // 環境変数は, プロセス全体で共有される. 設定するテストは, このひとつだけにする.
    std::env::set_var("RSTODO_DATA_DIR", dir.path());

    assert_eq!(load_data().unwrap(), TodoData::default());

    let data = TodoData {
        lists: vec![],
        tasks: vec![Task {
            id: "t1".into(),
            title: "テスト".into(),
            completed: true,
            important: false,
            my_day: false,
            due_date: None,
            planned_date: Some("2026-01-01".into()),
            start_date: None,
            note: String::new(),
            subtasks: vec![Subtask {
                id: "s1".into(),
                title: "確認".into(),
                completed: false,
                planned_date: None,
                start_date: Some("2026-01-01".into()),
                due_date: None,
                completed_at: None,
            }],
            completed_at: Some("2026-01-02T10:00".into()),
            list_id: "tasks".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
        }],
    };
    save_data(data.clone()).unwrap();
    assert_eq!(load_data().unwrap(), data);
    assert!(dir.path().join("todo.json").exists());

    let path = save_report("daily".into(), "2026-01-05".into(), "# 日報".into()).unwrap();
    assert_eq!(
        std::path::PathBuf::from(&path),
        dir.path().join("reports").join("report-2026-01-05.md")
    );
    assert_eq!(std::fs::read_to_string(path).unwrap(), "# 日報");
    assert!(save_report("daily".into(), "bad".into(), "x".into()).is_err());
    let weekly = save_report("weekly".into(), "2026-01-05".into(), "# 週報".into()).unwrap();
    assert!(weekly.ends_with("weekly-2026-01-05.md"));
}
