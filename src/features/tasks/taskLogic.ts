import type { SmartView, Task, TaskList, TodoData, ViewId } from "./types";

/** 既定のリスト「タスク」の ID. */
export const DEFAULT_LIST_ID = "tasks";

/** 既定のリストの表示名. */
export const DEFAULT_LIST_NAME = "タスク";

/** サイドバーに並べるスマートリスト. */
export const SMART_VIEWS: SmartView[] = [
  { id: "my-day", label: "今日の予定", icon: "☀" },
  { id: "important", label: "重要", icon: "☆" },
  { id: "planned", label: "計画済み", icon: "▦" },
  { id: "all", label: "すべて", icon: "∞" },
];

/** 既定のリストを含む, すべてのリストを返します. */
export function allLists(lists: TaskList[]): TaskList[] {
  return [{ id: DEFAULT_LIST_ID, name: DEFAULT_LIST_NAME }, ...lists];
}

/**
 * ビューの表示名を返します.
 *
 * @param view - ビューの ID.
 * @param lists - 利用者が作ったリスト.
 * @returns 表示名. 見つからなければ既定のリストの名前.
 */
export function viewTitle(view: ViewId, lists: TaskList[]): string {
  const found =
    SMART_VIEWS.find((v) => v.id === view) ??
    allLists(lists).find((l) => l.id === view);
  return found
    ? "label" in found
      ? found.label
      : found.name
    : DEFAULT_LIST_NAME;
}

/** ローカル時間の日付を `YYYY-MM-DD` で返します. */
export function todayString(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** 重複しにくい ID を作ります. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * タスクがビューに属するかを返します.
 *
 * @param task - 判定するタスク.
 * @param view - ビューの ID.
 * @returns 属するなら `true`.
 */
export function inView(task: Task, view: ViewId): boolean {
  switch (view) {
    case "my-day":
      return task.my_day;
    case "important":
      return task.important;
    case "planned":
      return task.due_date !== null;
    case "all":
      return true;
    default:
      return task.list_id === view;
  }
}

/**
 * ビューのタスクを, 未完了と完了に分けて返します.
 * 未完了は, 作成が新しい順. 完了は, 作成が新しい順.
 */
export function splitTasks(
  tasks: Task[],
  view: ViewId,
): { active: Task[]; done: Task[] } {
  const inThisView = tasks
    .filter((t) => inView(t, view))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    active: inThisView.filter((t) => !t.completed),
    done: inThisView.filter((t) => t.completed),
  };
}

/** ビューの未完了タスクの数を返します. */
export function countActive(tasks: Task[], view: ViewId): number {
  return tasks.filter((t) => !t.completed && inView(t, view)).length;
}

/**
 * 新しいタスクを作ります. スマートリストで追加したときは, そのリストの条件を満たすようにします.
 *
 * @param title - 題名.
 * @param view - 追加したときに開いていたビューの ID.
 * @param now - 現在の日時.
 * @returns 作ったタスク.
 */
export function createTask(
  title: string,
  view: ViewId,
  now: Date = new Date(),
): Task {
  const isSmart = SMART_VIEWS.some((v) => v.id === view);
  return {
    id: newId("task"),
    title,
    completed: false,
    important: view === "important",
    my_day: view === "my-day",
    due_date: view === "my-day" || view === "planned" ? todayString(now) : null,
    note: "",
    list_id: isSmart ? DEFAULT_LIST_ID : view,
    created_at: now.toISOString(),
  };
}

/** 期限の表示用の文字列を返します. 期限がなければ `null`. */
export function dueLabel(
  task: Task,
  today: string = todayString(),
): string | null {
  if (task.due_date === null) return null;
  return task.due_date === today ? "今日" : task.due_date;
}

/** 期限を過ぎた未完了のタスクか. */
export function isOverdue(task: Task, today: string = todayString()): boolean {
  return !task.completed && task.due_date !== null && task.due_date < today;
}

/** リストを削除します. 属していたタスクも, 削除します. */
export function removeList(data: TodoData, listId: string): TodoData {
  return {
    lists: data.lists.filter((l) => l.id !== listId),
    tasks: data.tasks.filter((t) => t.list_id !== listId),
  };
}
