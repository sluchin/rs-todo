import type {
  SmartView,
  Subtask,
  SortKey,
  SortOrder,
  Task,
  TaskList,
  TodoData,
  ViewId,
} from "./types";

/** 既定の並べ替え (作成が新しい順). */
export const DEFAULT_SORT: SortOrder = { key: "created", dir: "desc" };

/** 並べ替えの基準の表示名. */
export const SORT_LABELS: Record<SortKey, string> = {
  created: "作成日",
  planned: "予定日",
  start: "着手日",
  due: "期限",
  completed: "完了日",
  title: "題名",
};

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
  { id: "completed", label: "完了済み", icon: "✓" },
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

/** ローカル時間の日時を `YYYY-MM-DDTHH:mm` で返します (`datetime-local` の入力欄の値と同じ形式). */
export function nowLocalString(now: Date = new Date()): string {
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${todayString(now)}T${h}:${min}`;
}

/**
 * 完了の状態を切り替えるときの変更内容を返します. 完了にするときに完了日が空なら, 完了した日時を
 * 記録します (入っていれば, そのまま). 未完了に戻すときも, 完了日は残します.
 *
 * @param task - 切り替えるタスク.
 * @param now - 現在の日時.
 * @returns `updateTask` に渡す変更内容.
 */
export function toggleCompletedPatch(
  task: Task,
  now: Date = new Date(),
): Partial<Task> {
  if (task.completed) {
    return { completed: false };
  }
  return {
    completed: true,
    completed_at: task.completed_at || nowLocalString(now),
  };
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
    case "completed":
      return task.completed;
    default:
      return task.list_id === view;
  }
}

/** 並べ替えの基準になる値を返します. 値が無ければ `null`. */
function sortValue(task: Task, key: SortKey): string | null {
  switch (key) {
    case "created":
      return task.created_at;
    case "planned":
      return task.planned_date;
    case "start":
      return task.start_date;
    case "due":
      return task.due_date;
    case "completed":
      return task.completed_at;
    case "title":
      return task.title;
  }
}

/**
 * タスクを並べ替えた新しい配列を返します. 基準の値が無いタスクは, 向きにかかわらず最後に置きます.
 * 値が同じときは, 作成が新しい順です.
 *
 * @param tasks - 並べ替えるタスク.
 * @param order - 並べ替えの設定.
 * @returns 並べ替えたタスク.
 */
export function sortTasks(tasks: Task[], order: SortOrder): Task[] {
  const sign = order.dir === "asc" ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const va = sortValue(a, order.key);
    const vb = sortValue(b, order.key);
    if (va === null || vb === null) {
      if (va === vb) return b.created_at.localeCompare(a.created_at);
      return va === null ? 1 : -1;
    }
    const c = va.localeCompare(vb);
    return c !== 0 ? c * sign : b.created_at.localeCompare(a.created_at);
  });
}

/**
 * ビューのタスクを, 未完了と完了に分けて返します. どちらも, 指定した順に並べます.
 */
export function splitTasks(
  tasks: Task[],
  view: ViewId,
  order: SortOrder = DEFAULT_SORT,
): { active: Task[]; done: Task[] } {
  const inThisView = sortTasks(
    tasks.filter((t) => inView(t, view)),
    order,
  );
  return {
    active: inThisView.filter((t) => !t.completed),
    done: inThisView.filter((t) => t.completed),
  };
}

/** ビューのタスクの数を返します. 「完了済み」は完了したタスクの数, ほかは未完了のタスクの数. */
export function countActive(tasks: Task[], view: ViewId): number {
  return tasks.filter(
    (t) =>
      (view === "completed" ? t.completed : !t.completed) && inView(t, view),
  ).length;
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
    subtasks: [],
    planned_date: null,
    start_date: null,
    completed_at: null,
    list_id: isSmart ? DEFAULT_LIST_ID : view,
    created_at: now.toISOString(),
  };
}

/**
 * 完了日 (日付の部分) が範囲に入るタスクだけを返します. 範囲が空 (どちらも空文字) なら, すべて返します.
 * 範囲を指定したときは, 完了日の無いタスクを除きます.
 *
 * @param tasks - 絞り込むタスク.
 * @param from - 範囲の最初の日 (`YYYY-MM-DD`). 空文字なら下限なし.
 * @param to - 範囲の最後の日 (`YYYY-MM-DD`). 空文字なら上限なし.
 * @returns 絞り込んだタスク.
 */
export function filterByCompletedDate(
  tasks: Task[],
  from: string,
  to: string,
): Task[] {
  if (from === "" && to === "") return tasks;
  return tasks.filter((t) => {
    if (!t.completed_at) return false;
    const day = t.completed_at.slice(0, 10);
    return (from === "" || day >= from) && (to === "" || day <= to);
  });
}

/** 新しいサブタスクを作ります. */
export function newSubtask(title: string): Subtask {
  return { id: newId("sub"), title, completed: false };
}

/**
 * タスクのサブタスクの進み具合を返します.
 *
 * @param task - タスク.
 * @returns 完了したサブタスクの数と, 全体の数.
 */
export function subtaskProgress(task: Task): { done: number; total: number } {
  return {
    done: task.subtasks.filter((s) => s.completed).length,
    total: task.subtasks.length,
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
