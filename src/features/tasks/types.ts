/** 1 つのタスク. バックエンドの `Task` 構造体と同じフィールド名にする. */
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  important: boolean;
  my_day: boolean;
  /** 期限 (`YYYY-MM-DD`). 未設定なら `null`. */
  due_date: string | null;
  note: string;
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

/** スマートリスト (条件で自動的に集まるリスト) の定義. */
export interface SmartView {
  id: ViewId;
  label: string;
  icon: string;
}
