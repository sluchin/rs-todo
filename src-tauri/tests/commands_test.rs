use rstodo::commands::{load_data, save_data, Task, TodoData};
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
            note: String::new(),
            list_id: "tasks".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
        }],
    };
    save_data(data.clone()).unwrap();
    assert_eq!(load_data().unwrap(), data);
    assert!(dir.path().join("todo.json").exists());
}
