use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskStore {
    tasks: Vec<Task>,
}

impl TaskStore {
    pub fn new() -> Self {
        TaskStore { tasks: Vec::new() }
    }

    pub fn add_task(&mut self, title: String, description: Option<String>) -> Task {
        let now = Utc::now().to_rfc3339();
        let task = Task {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            completed: false,
            created_at: now.clone(),
            updated_at: now,
        };
        self.tasks.push(task.clone());
        task
    }

    pub fn get_tasks(&self) -> Vec<Task> {
        self.tasks.clone()
    }

    pub fn update_task(
        &mut self,
        id: String,
        title: Option<String>,
        description: Option<Option<String>>,
        completed: Option<bool>,
    ) -> Option<Task> {
        self.tasks.iter_mut().find(|t| t.id == id).map(|task| {
            if let Some(title) = title {
                task.title = title;
            }
            if let Some(description) = description {
                task.description = description;
            }
            if let Some(completed) = completed {
                task.completed = completed;
            }
            task.updated_at = Utc::now().to_rfc3339();
            task.clone()
        })
    }

    pub fn delete_task(&mut self, id: String) -> bool {
        if let Some(pos) = self.tasks.iter().position(|t| t.id == id) {
            self.tasks.remove(pos);
            true
        } else {
            false
        }
    }
}

pub fn run() {
    let store = Mutex::new(TaskStore::new());

    tauri::Builder::default()
        .manage(store)
        .invoke_handler(tauri::generate_handler![
            add_task,
            get_tasks,
            update_task,
            delete_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn add_task(
    title: String,
    description: Option<String>,
    store: tauri::State<Mutex<TaskStore>>,
) -> Result<Task, String> {
    let mut store = store.lock().map_err(|e| e.to_string())?;
    Ok(store.add_task(title, description))
}

#[tauri::command]
fn get_tasks(store: tauri::State<Mutex<TaskStore>>) -> Result<Vec<Task>, String> {
    let store = store.lock().map_err(|e| e.to_string())?;
    Ok(store.get_tasks())
}

#[tauri::command]
fn update_task(
    id: String,
    title: Option<String>,
    description: Option<Option<String>>,
    completed: Option<bool>,
    store: tauri::State<Mutex<TaskStore>>,
) -> Result<Option<Task>, String> {
    let mut store = store.lock().map_err(|e| e.to_string())?;
    Ok(store.update_task(id, title, description, completed))
}

#[tauri::command]
fn delete_task(id: String, store: tauri::State<Mutex<TaskStore>>) -> Result<bool, String> {
    let mut store = store.lock().map_err(|e| e.to_string())?;
    Ok(store.delete_task(id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_task() {
        let mut store = TaskStore::new();
        let task = store.add_task("Test task".to_string(), None);
        assert_eq!(task.title, "Test task");
        assert!(!task.completed);
    }

    #[test]
    fn test_get_tasks() {
        let mut store = TaskStore::new();
        store.add_task("Task 1".to_string(), None);
        store.add_task("Task 2".to_string(), None);
        assert_eq!(store.get_tasks().len(), 2);
    }

    #[test]
    fn test_update_task() {
        let mut store = TaskStore::new();
        let task = store.add_task("Original".to_string(), None);
        let updated = store.update_task(task.id, Some("Updated".to_string()), None, Some(true));
        assert!(updated.is_some());
        let updated = updated.unwrap();
        assert_eq!(updated.title, "Updated");
        assert!(updated.completed);
    }

    #[test]
    fn test_delete_task() {
        let mut store = TaskStore::new();
        let task = store.add_task("Task".to_string(), None);
        assert!(store.delete_task(task.id));
        assert_eq!(store.get_tasks().len(), 0);
    }
}
