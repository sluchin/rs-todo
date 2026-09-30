import { ReactElement, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import log from "loglevel";
import "./styles/App.css";

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export default function App(): ReactElement {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const result = await invoke<Task[]>("get_tasks");
      setTasks(result);
    } catch (error) {
      log.error("Failed to load tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async () => {
    if (!input.trim()) return;
    try {
      const newTask = await invoke<Task>("add_task", {
        title: input,
        description: null,
      });
      setTasks([...tasks, newTask]);
      setInput("");
    } catch (error) {
      log.error("Failed to add task:", error);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const updated = await invoke<Task | null>("update_task", {
        id: task.id,
        title: null,
        description: null,
        completed: !task.completed,
      });
      if (updated) {
        setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
      }
    } catch (error) {
      log.error("Failed to update task:", error);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await invoke("delete_task", { id });
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (error) {
      log.error("Failed to delete task:", error);
    }
  };

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  return (
    <div className="app">
      <h1>My Tasks</h1>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              addTask();
            }
          }}
          placeholder="Add a new task..."
        />
        <button onClick={addTask}>Add</button>
      </div>
      <div className="tasks-list">
        {tasks.length === 0 ? (
          <p className="empty">No tasks yet. Add one to get started!</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${task.completed ? "completed" : ""}`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task)}
              />
              <div className="task-content">
                <span className="task-title">{task.title}</span>
                {task.description && (
                  <span className="task-description">{task.description}</span>
                )}
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="delete-btn"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
