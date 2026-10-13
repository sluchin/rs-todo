import { allLists } from "./taskLogic";
import type { Task, TodoData } from "./types";

/** 曜日の表示名. `Date#getDay` の値で引く. */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * `YYYY-MM-DD` の日付に, 日数を足した日付を返します.
 *
 * @param date - 元の日付.
 * @param days - 足す日数.
 * @returns 新しい日付 (`YYYY-MM-DD`).
 */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${mm}-${dd}`;
}

/** タスクの 1 行 (リスト名・期限付き) と, メモの行を返します. */
function taskLines(task: Task, listName: string, prefix: string): string[] {
  const due = task.due_date ? ` (期限: ${task.due_date})` : "";
  const lines = [`- ${prefix}${task.title} [${listName}]${due}`];
  for (const note of task.note.split("\n")) {
    if (note.trim() !== "") lines.push(`  - ${note.trim()}`);
  }
  return lines;
}

/**
 * 指定した日の日報を, Markdown で作ります.
 *
 * 内容は次のとおりです.
 * - 完了したタスク: その日に完了したもの (完了日の順).
 * - 未完了のタスク: 今日の予定に入っている, またはその日が期限のもの.
 * - 期限切れのタスク: 期限がその日より前の, 未完了のもの (「未完了のタスク」に出したものは除く).
 * - 明日以降の予定: 期限がその日より後の, 未完了のもの (期限の順).
 *
 * @param data - タスクとリスト.
 * @param date - 日報の日付 (`YYYY-MM-DD`).
 * @returns 日報の本文.
 */
export function buildDailyReport(data: TodoData, date: string): string {
  const names = new Map(allLists(data.lists).map((l) => [l.id, l.name]));
  const nameOf = (t: Task): string => names.get(t.list_id) ?? t.list_id;
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];

  const byDue = (a: Task, b: Task): number =>
    String(a.due_date).localeCompare(String(b.due_date));
  const open = data.tasks.filter((t) => !t.completed);
  const done = data.tasks
    .filter((t) => t.completed && t.completed_at?.startsWith(date))
    .sort((a, b) =>
      String(a.completed_at).localeCompare(String(b.completed_at)),
    );
  const today = open.filter((t) => t.my_day || t.due_date === date);
  const overdue = open
    .filter(
      (t) => t.due_date !== null && t.due_date < date && !today.includes(t),
    )
    .sort(byDue);
  const upcoming = open
    .filter((t) => t.due_date !== null && t.due_date > date)
    .sort(byDue);

  const section = (title: string, tasks: Task[], lines: string[]): string[] => [
    "",
    `## ${title} (${tasks.length})`,
    ...(tasks.length === 0 ? ["- なし"] : lines),
  ];

  return [
    `# 日報 ${date} (${weekday})`,
    ...section(
      "完了したタスク",
      done,
      done.flatMap((t) =>
        taskLines(t, nameOf(t), `[x] ${String(t.completed_at).slice(11, 16)} `),
      ),
    ),
    ...section(
      "未完了のタスク",
      today,
      today.flatMap((t) => taskLines(t, nameOf(t), "[ ] ")),
    ),
    ...section(
      "期限切れのタスク",
      overdue,
      overdue.flatMap((t) => taskLines(t, nameOf(t), "[ ] ")),
    ),
    ...section(
      "明日以降の予定",
      upcoming,
      upcoming.flatMap((t) => taskLines(t, nameOf(t), "[ ] ")),
    ),
    "",
  ].join("\n");
}
