import { describe, expect, it } from "vitest";
import { addDays, buildDailyReport } from "../features/tasks/report";
import type { Task, TodoData } from "../features/tasks/types";

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
    completed_at: null,
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
