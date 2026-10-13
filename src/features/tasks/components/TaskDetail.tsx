import type { ReactElement } from "react";
import DateInput from "../../../components/DateInput";
import { useState } from "react";
import { newSubtask } from "../taskLogic";
import type { Subtask, Task } from "../types";

/** `TaskDetail` の props. */
interface TaskDetailProps {
  task: Task;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * 右側の詳細ペイン. 題名, サブタスク, 今日の予定, 予定日, 着手日, 期限, 完了日, メモを編集し, タスクを削除する.
 */
export default function TaskDetail({
  task,
  onUpdate,
  onDelete,
  onClose,
}: TaskDetailProps): ReactElement {
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const setSubtasks = (subtasks: Subtask[]): void => onUpdate({ subtasks });
  const patchSubtask = (id: string, patch: Partial<Subtask>): void =>
    setSubtasks(
      task.subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  const addSubtask = (): void => {
    const trimmed = subtaskTitle.trim();
    if (trimmed === "") return;
    setSubtasks([...task.subtasks, newSubtask(trimmed)]);
    setSubtaskTitle("");
  };

  return (
    <aside className="task-detail" aria-label="タスクの詳細">
      <input
        className="detail-title"
        aria-label="題名"
        value={task.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
      />
      <section className="subtasks" aria-label="サブタスク">
        <ul>
          {task.subtasks.map((s) => (
            <li key={s.id} className={s.completed ? "done" : undefined}>
              <button
                type="button"
                className={`circle${s.completed ? " checked" : ""}`}
                aria-label={`${s.title} を${s.completed ? "未完了に戻す" : "完了にする"}`}
                aria-pressed={s.completed}
                onClick={() => patchSubtask(s.id, { completed: !s.completed })}
              >
                {s.completed ? "✓" : ""}
              </button>
              <input
                aria-label={`サブタスク ${s.title}`}
                value={s.title}
                onChange={(e) => patchSubtask(s.id, { title: e.target.value })}
              />
              <button
                type="button"
                className="link-button"
                aria-label={`${s.title} を削除`}
                onClick={() =>
                  setSubtasks(task.subtasks.filter((x) => x.id !== s.id))
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addSubtask();
          }}
        >
          <input
            aria-label="サブタスクを追加"
            placeholder="+ サブタスクを追加"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
          />
        </form>
      </section>
      <button
        type="button"
        className={`detail-row${task.my_day ? " on" : ""}`}
        aria-pressed={task.my_day}
        onClick={() => onUpdate({ my_day: !task.my_day })}
      >
        ☀ {task.my_day ? "今日の予定に追加済み" : "今日の予定に追加"}
      </button>
      <label className="detail-row">
        <span>▷ 予定日</span>
        <DateInput
          type="date"
          label="予定日"
          value={task.planned_date ?? ""}
          onChange={(v) => onUpdate({ planned_date: v || null })}
        />
      </label>
      <label className="detail-row">
        <span>▶ 着手日</span>
        <DateInput
          type="date"
          label="着手日"
          value={task.start_date ?? ""}
          onChange={(v) => onUpdate({ start_date: v || null })}
        />
      </label>
      <label className="detail-row">
        <span>▦ 期限</span>
        <DateInput
          type="date"
          label="期限"
          value={task.due_date ?? ""}
          onChange={(v) => onUpdate({ due_date: v || null })}
        />
      </label>
      <label className="detail-row">
        <span>✓ 完了日</span>
        <DateInput
          type="datetime-local"
          label="完了日"
          value={task.completed_at ?? ""}
          onChange={(v) => onUpdate({ completed_at: v || null })}
        />
      </label>
      <textarea
        className="detail-note"
        aria-label="メモ"
        placeholder="メモを追加"
        value={task.note}
        onChange={(e) => onUpdate({ note: e.target.value })}
      />
      <footer className="detail-footer">
        <button type="button" className="link-button" onClick={onClose}>
          閉じる
        </button>
        <button type="button" className="danger" onClick={onDelete}>
          タスクを削除
        </button>
      </footer>
    </aside>
  );
}
