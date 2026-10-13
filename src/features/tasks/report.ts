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

/**
 * 日付を含む週の, 最初の日 (月曜) と最後の日 (日曜) を返します.
 *
 * @param date - 週に含まれる日付 (`YYYY-MM-DD`).
 * @returns 週の最初の日と最後の日 (どちらも `YYYY-MM-DD`).
 */
export function weekRange(date: string): { start: string; end: string } {
  const [y, m, d] = date.split("-").map(Number);
  const offset = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const start = addDays(date, -offset);
  return { start, end: addDays(start, 6) };
}

/** 日付が範囲 (両端を含む) に入るか. 日付が無ければ `false`. */
function inRange(
  date: string | null | undefined,
  start: string,
  end: string,
): boolean {
  return !!date && date >= start && date <= end;
}

/**
 * 指定した日を含む週 (月曜から日曜) の週報を, Markdown で作ります.
 *
 * 内容は次のとおりです.
 * - 完了したタスク: 週の中で完了したもの. 完了日ごとに分けて出す.
 * - 着手したタスク: 着手日が週の中にあるもの.
 * - 未完了のタスク: 期限か予定日が週の中にある, 未完了のもの.
 * - 期限切れのタスク: 期限が週の前にある, 未完了のもの.
 * - 来週の予定: 期限か予定日が来週にある, 未完了のもの.
 *
 * @param data - タスクとリスト.
 * @param date - 週に含まれる日付 (`YYYY-MM-DD`).
 * @returns 週報の本文.
 */
export function buildWeeklyReport(data: TodoData, date: string): string {
  const { start, end } = weekRange(date);
  const next = weekRange(addDays(end, 1));
  const names = new Map(allLists(data.lists).map((l) => [l.id, l.name]));
  const nameOf = (t: Task): string => names.get(t.list_id) ?? t.list_id;
  const line = (t: Task, prefix: string): string[] =>
    taskLines(t, nameOf(t), prefix);
  const byDue = (a: Task, b: Task): number =>
    String(a.due_date).localeCompare(String(b.due_date));

  const open = data.tasks.filter((t) => !t.completed);
  const inWeek = (t: Task, from: string, to: string): boolean =>
    inRange(t.due_date, from, to) || inRange(t.planned_date, from, to);
  const done = data.tasks
    .filter(
      (t) => t.completed && inRange(t.completed_at?.slice(0, 10), start, end),
    )
    .sort((a, b) =>
      String(a.completed_at).localeCompare(String(b.completed_at)),
    );
  const started = data.tasks
    .filter((t) => inRange(t.start_date, start, end))
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  const thisWeek = open.filter((t) => inWeek(t, start, end)).sort(byDue);
  const overdue = open
    .filter((t) => t.due_date !== null && t.due_date < start)
    .sort(byDue);
  const nextWeek = open
    .filter((t) => inWeek(t, next.start, next.end))
    .sort(byDue);

  const section = (title: string, tasks: Task[], lines: string[]): string[] => [
    "",
    `## ${title} (${tasks.length})`,
    ...(tasks.length === 0 ? ["- なし"] : lines),
  ];

  const doneLines: string[] = [];
  let currentDay = "";
  for (const t of done) {
    const day = String(t.completed_at).slice(0, 10);
    if (day !== currentDay) {
      currentDay = day;
      const [y, m, d] = day.split("-").map(Number);
      doneLines.push(
        `### ${day} (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`,
      );
    }
    doneLines.push(...line(t, `[x] ${String(t.completed_at).slice(11, 16)} `));
  }

  return [
    `# 週報 ${start} 〜 ${end}`,
    ...section("完了したタスク", done, doneLines),
    ...section(
      "着手したタスク",
      started,
      started.flatMap((t) =>
        line(t, `${t.completed ? "[x]" : "[ ]"} ${t.start_date} `),
      ),
    ),
    ...section(
      "未完了のタスク",
      thisWeek,
      thisWeek.flatMap((t) => line(t, "[ ] ")),
    ),
    ...section(
      "期限切れのタスク",
      overdue,
      overdue.flatMap((t) => line(t, "[ ] ")),
    ),
    ...section(
      "来週の予定",
      nextWeek,
      nextWeek.flatMap((t) => line(t, "[ ] ")),
    ),
    "",
  ].join("\n");
}
