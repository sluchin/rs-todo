import type { ReactElement } from "react";
import { useState } from "react";
import { splitTasks, viewTitle } from "../taskLogic";
import type { Task, TaskList, ViewId } from "../types";
import TaskItem from "./TaskItem";

/** `TaskView` の props. */
interface TaskViewProps {
  view: ViewId;
  lists: TaskList[];
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onAddTask: (title: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteList: (id: string) => void;
}

/**
 * 中央のタスク一覧. 見出し, タスクの追加欄, 未完了と完了のタスクを表示する.
 */
export default function TaskView({
  view,
  lists,
  tasks,
  selectedTaskId,
  onSelectTask,
  onAddTask,
  onUpdateTask,
  onDeleteList,
}: TaskViewProps): ReactElement {
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(true);
  const { active, done } = splitTasks(tasks, view);
  const isCustomList = lists.some((l) => l.id === view);

  const submit = (): void => {
    const trimmed = title.trim();
    if (trimmed === "") return;
    onAddTask(trimmed);
    setTitle("");
  };

  const renderItem = (t: Task): ReactElement => (
    <TaskItem
      key={t.id}
      task={t}
      selected={t.id === selectedTaskId}
      onSelect={() => onSelectTask(t.id)}
      onToggleCompleted={() => onUpdateTask(t.id, { completed: !t.completed })}
      onToggleImportant={() => onUpdateTask(t.id, { important: !t.important })}
    />
  );

  return (
    <main className="task-view">
      <header className="view-header">
        <h1>{viewTitle(view, lists)}</h1>
        {isCustomList && (
          <button
            type="button"
            className="link-button"
            onClick={() => onDeleteList(view)}
          >
            リストを削除
          </button>
        )}
      </header>

      <form
        className="add-task"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <span className="add-icon" aria-hidden="true">
          +
        </span>
        <input
          aria-label="タスクを追加"
          placeholder="タスクを追加"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </form>

      <ul className="task-list" aria-label="未完了のタスク">
        {active.map(renderItem)}
      </ul>

      {done.length > 0 && (
        <section className="done-section">
          <button
            type="button"
            className="done-toggle"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? "▾" : "▸"} 完了済み {done.length}
          </button>
          {showDone && (
            <ul className="task-list" aria-label="完了済みのタスク">
              {done.map(renderItem)}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
