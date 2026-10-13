/** 1 つのタスク. バックエンドの `Task` 構造体と同じフィールド名にする. */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  important: boolean;
  my_day: boolean;
  /** 期限 (`YYYY-MM-DD`). 未設定なら `null`. */
  due_date: string | null;
  /** 予定日 (`YYYY-MM-DD`). 未設定なら `null`. */
  planned_date: string | null;
  /** 着手日 (`YYYY-MM-DD`). 未設定なら `null`. */
  start_date: string | null;
  note: string;
  /** 完了した日時 (ローカル時間の `YYYY-MM-DDTHH:mm`). 未設定なら `null`. 完了を解除しても残す. */
  completed_at: string | null;
  list_id: string;
  /** 作成日時 (ISO 8601). */
  created_at: string;
}

/** タスクをまとめるリスト. */
export interface TaskList {
  id: string;
  name: string;
}

/** 保存するデータ全体. */
export interface TodoData {
  /** 利用者が作ったリスト. 既定のリスト「タスク」は含めない. */
  lists: TaskList[];
  tasks: Task[];
}

/** 画面に表示するビューの識別子. スマートリストの ID か, リストの ID. */
export type ViewId = string;

/** 並べ替えの基準. 作成日・予定日・着手日・期限・完了日・題名. */
export type SortKey =
  "created" | "planned" | "start" | "due" | "completed" | "title";

/** 並べ替えの向き. */
export type SortDir = "asc" | "desc";

/** 並べ替えの設定. */
export interface SortOrder {
  key: SortKey;
  dir: SortDir;
}

/** スマートリスト (条件で自動的に集まるリスト) の定義. */
export interface SmartView {
  id: ViewId;
  label: string;
  icon: string;
}
