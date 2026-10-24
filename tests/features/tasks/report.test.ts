import { describe, expect, it } from "vitest";
import {
  addDays,
  buildDailyReport,
  buildWeeklyReport,
  weekRange,
} from "@/features/tasks/report";
import type { Task, TodoData } from "@/features/tasks/types";

/** テスト用のタスクを作る. */
function task(patch: Partial<Task>): Task {
  return {
    id: "t",
    title: "t",
    completed: false,
    important: false,
    my_day: false,
    due_date: null,
    note: "",
    subtasks: [],
    completed_at: null,
    planned_date: null,
    start_date: null,
    list_id: "tasks",
    created_at: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const DATA: TodoData = {
  lists: [{ id: "l1", name: "買い物" }],
  tasks: [
    task({
      id: "d2",
      title: "牛乳を買う",
      completed: true,
      completed_at: "2026-01-05T15:30",
      list_id: "l1",
      note: "2 本\n\n低脂肪",
      due_date: "2026-01-05",
    }),
    task({
      id: "d1",
      title: "朝の会議",
      completed: true,
      completed_at: "2026-01-05T09:00",
    }),
    task({
      id: "other-day",
      title: "昨日の完了",
      completed: true,
      completed_at: "2026-01-04T23:59",
    }),
    task({ id: "no-time", title: "日時なし", completed: true }),
    task({ id: "my", title: "今日やる", my_day: true }),
    task({
      id: "due",
      title: "今日が期限",
      due_date: "2026-01-05",
      list_id: "x",
    }),
    task({
      id: "late-my",
      title: "遅れだが今日の予定",
      my_day: true,
      due_date: "2026-01-01",
    }),
    task({ id: "late2", title: "遅れ 2", due_date: "2026-01-03" }),
    task({ id: "late1", title: "遅れ 1", due_date: "2026-01-02" }),
    task({ id: "up2", title: "先の予定", due_date: "2026-01-20" }),
    task({ id: "up1", title: "明日の予定", due_date: "2026-01-06" }),
    task({ id: "none", title: "期限なし" }),
  ],
};

describe("addDays", () => {
  it("正常系: 日数を足し引きする. 月や年をまたぐ", () => {
    expect(addDays("2026-01-05", 1)).toBe("2026-01-06");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("buildDailyReport", () => {
  const report = buildDailyReport(DATA, "2026-01-05");

  it("正常系: 見出しに日付と曜日が入る", () => {
    expect(report.split("\n")[0]).toBe("# 日報 2026-01-05 (月)");
  });

  it("正常系: その日に完了したタスクを、完了時刻の順に、リスト名・期限・メモ付きで出す", () => {
    const section = report.split("## ")[1];
    expect(section).toBe(
      [
        "完了したタスク (2)",
        "- [x] 09:00 朝の会議 [タスク]",
        "- [x] 15:30 牛乳を買う [買い物] (期限: 2026-01-05)",
        "  - 2 本",
        "  - 低脂肪",
        "",
        "",
      ].join("\n"),
    );
    expect(report).not.toContain("昨日の完了");
    expect(report).not.toContain("日時なし");
  });

  it("正常系: 未完了は、今日の予定かその日が期限のもの. 知らないリストは ID で出す", () => {
    expect(report).toContain("## 未完了のタスク (3)");
    expect(report).toContain("- [ ] 今日やる [タスク]");
    expect(report).toContain("- [ ] 今日が期限 [x] (期限: 2026-01-05)");
  });

  it("正常系: 期限切れと明日以降の予定を、期限の順に出す", () => {
    expect(report).toMatch(
      /## 期限切れのタスク \(2\)\n- \[ \] 遅れ 1 .*\n- \[ \] 遅れ 2 /,
    );
    expect(report).toMatch(
      /## 明日以降の予定 \(2\)\n- \[ \] 明日の予定 .*\n- \[ \] 先の予定 /,
    );
    expect(report).not.toContain("期限なし");
    // 今日の予定に出したものは、期限切れには重ねて出さない.
    expect(report.match(/遅れだが今日の予定/g)).toHaveLength(1);
  });

  it("正常系: 該当が無い節は「なし」と出す", () => {
    const empty = buildDailyReport({ lists: [], tasks: [] }, "2026-01-11");
    expect(empty).toContain("# 日報 2026-01-11 (日)");
    expect(empty.match(/- なし/g)).toHaveLength(4);
    expect(empty).toContain("## 完了したタスク (0)");
  });
});

describe("weekRange", () => {
  it("正常系: 日付を含む週の月曜と日曜を返す。月曜・日曜・年またぎも正しい", () => {
    // 2026-01-05 は月曜.
    expect(weekRange("2026-01-05")).toEqual({
      start: "2026-01-05",
      end: "2026-01-11",
    });
    expect(weekRange("2026-01-11")).toEqual({
      start: "2026-01-05",
      end: "2026-01-11",
    });
    expect(weekRange("2026-01-07")).toEqual({
      start: "2026-01-05",
      end: "2026-01-11",
    });
    expect(weekRange("2026-01-01")).toEqual({
      start: "2025-12-29",
      end: "2026-01-04",
    });
  });
});

describe("buildWeeklyReport", () => {
  // 週は 2026-01-05 (月) 〜 2026-01-11 (日). 来週は 01-12 〜 01-18.
  const data: TodoData = {
    lists: [{ id: "l1", name: "仕事" }],
    tasks: [
      task({
        id: "m",
        title: "月曜に完了",
        completed: true,
        completed_at: "2026-01-05T10:00",
        list_id: "l1",
        note: "メモ",
      }),
      task({
        id: "m2",
        title: "月曜の午後に完了",
        completed: true,
        completed_at: "2026-01-05T15:30",
      }),
      task({
        id: "f",
        title: "金曜に完了",
        completed: true,
        completed_at: "2026-01-09T09:00",
      }),
      task({
        id: "prev",
        title: "先週の完了",
        completed: true,
        completed_at: "2026-01-04T23:00",
      }),
      task({
        id: "nxt",
        title: "来週の完了",
        completed: true,
        completed_at: "2026-01-12T00:00",
      }),
      task({ id: "st1", title: "着手した", start_date: "2026-01-07" }),
      task({
        id: "st2",
        title: "着手して完了",
        start_date: "2026-01-06",
        completed: true,
        completed_at: "2026-01-08T10:00",
      }),
      task({ id: "st3", title: "先週に着手", start_date: "2026-01-02" }),
      task({ id: "due", title: "今週が期限", due_date: "2026-01-10" }),
      task({ id: "plan", title: "今週に予定", planned_date: "2026-01-06" }),
      task({ id: "late", title: "遅れている", due_date: "2026-01-02" }),
      task({
        id: "n1",
        title: "来週が期限",
        due_date: "2026-01-18",
        list_id: "unknown",
      }),
      task({ id: "n2", title: "来週に予定", planned_date: "2026-01-12" }),
      task({ id: "far", title: "再来週", due_date: "2026-01-19" }),
      task({ id: "none", title: "日付なし" }),
    ],
  };
  const report = buildWeeklyReport(data, "2026-01-07");
  const sectionOf = (title: string): string =>
    report.split("\n## ").find((s) => s.startsWith(title)) ?? "";

  it("正常系: 見出しに週の範囲が入る", () => {
    expect(report.split("\n")[0]).toBe("# 週報 2026-01-05 〜 2026-01-11");
  });

  it("正常系: 完了したタスクを、完了日ごとの見出しの下に、時刻・リスト名・メモ付きで出す", () => {
    expect(sectionOf("完了したタスク")).toBe(
      [
        "完了したタスク (4)",
        "### 2026-01-05 (月)",
        "- [x] 10:00 月曜に完了 [仕事]",
        "  - メモ",
        "- [x] 15:30 月曜の午後に完了 [タスク]",
        "### 2026-01-08 (木)",
        "- [x] 10:00 着手して完了 [タスク]",
        "### 2026-01-09 (金)",
        "- [x] 09:00 金曜に完了 [タスク]",
        "",
      ].join("\n"),
    );
    expect(report).not.toContain("先週の完了");
    expect(report).not.toContain("来週の完了");
  });

  it("正常系: 着手したタスクを、着手日の順に出す (完了済みも含む)", () => {
    const section = sectionOf("着手したタスク");
    expect(section).toContain("着手したタスク (2)");
    expect(section).toMatch(
      /\[x\] 2026-01-06 着手して完了[\s\S]*\[ \] 2026-01-07 着手した/,
    );
    expect(section).not.toContain("先週に着手");
  });

  it("正常系: 未完了は期限か予定日が今週のもの。期限切れ・来週の予定はそれぞれ別の節", () => {
    const week = sectionOf("未完了のタスク");
    expect(week).toContain("未完了のタスク (2)");
    expect(week).toContain("今週が期限");
    expect(week).toContain("今週に予定");
    expect(sectionOf("期限切れのタスク")).toContain("遅れている");
    const next = sectionOf("来週の予定");
    expect(next).toContain("来週の予定 (2)");
    expect(next).toContain("来週が期限 [unknown]");
    expect(next).toContain("来週に予定");
    expect(report).not.toContain("再来週");
    expect(report).not.toContain("日付なし");
  });

  it("正常系: 該当が無い節は「なし」と出す", () => {
    const empty = buildWeeklyReport({ lists: [], tasks: [] }, "2026-01-07");
    expect(empty.match(/- なし/g)).toHaveLength(5);
  });
});

describe("レポートのサブタスク", () => {
  it("正常系: 日報と週報で、タスクの下にサブタスクを完了の状態付きで出す (メモより前)", () => {
    const data: TodoData = {
      lists: [],
      tasks: [
        task({
          title: "資料",
          my_day: true,
          note: "急ぐ",
          subtasks: [
            {
              id: "1",
              title: "構成",
              completed: true,
              planned_date: null,
              start_date: null,
              due_date: null,
              completed_at: null,
            },
            {
              id: "2",
              title: "清書",
              completed: false,
              planned_date: null,
              start_date: null,
              due_date: "2026-01-09",
              completed_at: null,
            },
          ],
        }),
      ],
    };
    const daily = buildDailyReport(data, "2026-01-05");
    expect(daily).toContain(
      "- [ ] 資料 [タスク]\n  - [x] 構成\n  - [ ] 清書 (期限: 2026-01-09)\n  - 急ぐ",
    );
    const weekly = buildWeeklyReport(
      {
        ...data,
        tasks: [{ ...data.tasks[0], my_day: false, due_date: "2026-01-06" }],
      },
      "2026-01-05",
    );
    expect(weekly).toContain("  - [x] 構成\n  - [ ] 清書 (期限: 2026-01-09)");
  });
});
