import type { ReactElement } from "react";
import { dueLabel, isOverdue } from "../taskLogic";
import type { Task } from "../types";

/** `TaskItem` の props. */
interface TaskItemProps {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onToggleCompleted: () => void;
  onToggleImportant: () => void;
}

/**
 * タスク 1 件の行. 完了の丸, 題名, 期限, 重要の星を表示する.
 */
export default function TaskItem({
  task,
  selected,
  onSelect,
  onToggleCompleted,
  onToggleImportant,
}: TaskItemProps): ReactElement {
  const due = dueLabel(task);
  return (
    <li
      className={`task-item${selected ? " selected" : ""}${task.completed ? " done" : ""}`}
    >
      <button
        type="button"
        className={`circle${task.completed ? " checked" : ""}`}
        aria-label={task.completed ? "未完了に戻す" : "完了にする"}
        aria-pressed={task.completed}
        onClick={onToggleCompleted}
      >
        {task.completed ? "✓" : ""}
      </button>
      <button type="button" className="task-body" onClick={onSelect}>
        <span className="task-title">{task.title}</span>
        {(due || task.my_day) && (
          <span className="task-meta">
            {task.my_day && <span>☀ 今日の予定</span>}
            {due && (
              <span className={isOverdue(task) ? "overdue" : undefined}>
                ▦ {due}
              </span>
            )}
          </span>
        )}
      </button>
      <button
        type="button"
        className={`star${task.important ? " on" : ""}`}
        aria-label={task.important ? "重要を外す" : "重要にする"}
        aria-pressed={task.important}
        onClick={onToggleImportant}
      >
        {task.important ? "★" : "☆"}
      </button>
    </li>
  );
}
