import type { ReactElement } from "react";
import DateInput from "../../../components/DateInput";
import { useState } from "react";
import { newSubtask, toggleCompletedPatch } from "../taskLogic";
import type { Subtask, Task } from "../types";

/** サブタスクの日付の項目. 詳細ペインのタスクの日付と同じ種類を, 同じ順に並べる. */
const SUBTASK_DATE_FIELDS = [
  { key: "planned_date", label: "予定日", type: "date" },
  { key: "start_date", label: "着手日", type: "date" },
  { key: "due_date", label: "期限", type: "date" },
  { key: "completed_at", label: "完了日", type: "datetime-local" },
] as const;

/** サブタスクに入っている日付を, 一行の文字列にします (閉じているときの表示). 無ければ空文字. */
function subtaskDateSummary(s: Subtask): string {
  return SUBTASK_DATE_FIELDS.filter((f) => s[f.key])
    .map((f) => `${f.label} ${String(s[f.key]).slice(0, 10)}`)
    .join(" ・ ");
}

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
                onClick={() => patchSubtask(s.id, toggleCompletedPatch(s))}
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
              <details className="subtask-dates">
                <summary aria-label={`${s.title} の日付`}>
                  {subtaskDateSummary(s) || "日付"}
                </summary>
                {SUBTASK_DATE_FIELDS.map((f) => (
                  <label key={f.key} className="subtask-date">
                    <span>{f.label}</span>
                    <DateInput
                      type={f.type}
                      label={`${s.title} の${f.label}`}
                      value={s[f.key] ?? ""}
                      onChange={(v) =>
                        patchSubtask(s.id, { [f.key]: v || null })
                      }
                    />
                  </label>
                ))}
              </details>
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
