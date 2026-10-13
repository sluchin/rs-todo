import type { ReactElement } from "react";
import { useState } from "react";
import {
  SORT_LABELS,
  filterByCompletedDate,
  splitTasks,
  toggleCompletedPatch,
  viewTitle,
} from "../taskLogic";
import type { SortKey, SortOrder, Task, TaskList, ViewId } from "../types";
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
  sort: SortOrder;
  onSortChange: (sort: SortOrder) => void;
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
  sort,
  onSortChange,
}: TaskViewProps): ReactElement {
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [completedFrom, setCompletedFrom] = useState("");
  const [completedTo, setCompletedTo] = useState("");
  const isCompletedView = view === "completed";
  const split = splitTasks(tasks, view, sort);
  const active = split.active;
  const done = isCompletedView
    ? filterByCompletedDate(split.done, completedFrom, completedTo)
    : split.done;
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
      onToggleCompleted={() => onUpdateTask(t.id, toggleCompletedPatch(t))}
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

      <div className="sort-bar">
        <label>
          並べ替え
          <select
            aria-label="並べ替えの基準"
            value={sort.key}
            onChange={(e) =>
              onSortChange({ ...sort, key: e.target.value as SortKey })
            }
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-label="並べ替えの向き"
          onClick={() =>
            onSortChange({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })
          }
        >
          {sort.dir === "asc" ? "↑ 昇順" : "↓ 降順"}
        </button>
      </div>

      {isCompletedView ? (
        <>
          <div className="filter-bar">
            <span>完了日</span>
            <input
              type="date"
              aria-label="完了日の開始"
              value={completedFrom}
              onChange={(e) => setCompletedFrom(e.target.value)}
            />
            <span>〜</span>
            <input
              type="date"
              aria-label="完了日の終了"
              value={completedTo}
              onChange={(e) => setCompletedTo(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setCompletedFrom("");
                setCompletedTo("");
              }}
            >
              解除
            </button>
          </div>
          <ul className="task-list" aria-label="完了済みのタスク">
            {done.map(renderItem)}
          </ul>
          {done.length === 0 && (
            <p className="empty">該当するタスクはありません</p>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
