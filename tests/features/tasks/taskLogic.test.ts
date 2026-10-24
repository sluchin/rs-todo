import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIST_ID,
  allLists,
  countActive,
  filterByCompletedDate,
  createTask,
  dueLabel,
  inView,
  isOverdue,
  newId,
  newSubtask,
  subtaskProgress,
  nowLocalString,
  toggleCompletedPatch,
  removeList,
  sortTasks,
  splitTasks,
  todayString,
  viewTitle,
} from "@/features/tasks/taskLogic";
import type { Task } from "@/features/tasks/types";

const NOW = new Date(2026, 0, 5, 9, 0, 0);

/** テスト用のタスクを作る. */
function task(patch: Partial<Task> = {}): Task {
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
    list_id: DEFAULT_LIST_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("todayString", () => {
  it("正常系: ローカルの日付を YYYY-MM-DD で返す", () => {
    expect(todayString(NOW)).toBe("2026-01-05");
  });

  it("正常系: 引数を省略すると現在の日付を返す", () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("nowLocalString / toggleCompletedPatch", () => {
  it("正常系: ローカルの日時を YYYY-MM-DDTHH:mm で返す", () => {
    expect(nowLocalString(NOW)).toBe("2026-01-05T09:00");
    expect(nowLocalString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("正常系: 完了にするとき完了日が空なら記録し、入っていればそのまま。未完了に戻しても完了日は触らない", () => {
    expect(toggleCompletedPatch(task(), NOW)).toEqual({
      completed: true,
      completed_at: "2026-01-05T09:00",
    });
    expect(
      toggleCompletedPatch(task({ completed_at: "2026-01-01T08:00" }), NOW),
    ).toEqual({ completed: true, completed_at: "2026-01-01T08:00" });
    expect(
      toggleCompletedPatch(
        task({ completed: true, completed_at: "2026-01-05T09:00" }),
        NOW,
      ),
    ).toEqual({ completed: false });
    expect(toggleCompletedPatch(task()).completed_at).toMatch(/^\d{4}-/);
  });

  it("正常系: 新しいタスクは完了日がない", () => {
    expect(createTask("a", DEFAULT_LIST_ID, NOW).completed_at).toBeNull();
  });
});

describe("newId", () => {
  it("正常系: 接頭辞が付き, 毎回異なる", () => {
    expect(newId("x")).toMatch(/^x-/);
    expect(newId("x")).not.toBe(newId("x"));
  });
});

describe("viewTitle / allLists", () => {
  const lists = [{ id: "l1", name: "買い物" }];

  it("正常系: スマートリストと利用者のリストの名前を返す", () => {
    expect(viewTitle("my-day", lists)).toBe("今日の予定");
    expect(viewTitle("l1", lists)).toBe("買い物");
    expect(viewTitle(DEFAULT_LIST_ID, lists)).toBe("タスク");
  });

  it("異常系: 存在しない ID は既定のリストの名前になる", () => {
    expect(viewTitle("zzz", lists)).toBe("タスク");
  });

  it("正常系: 既定のリストが先頭に付く", () => {
    expect(allLists(lists).map((l) => l.id)).toEqual([DEFAULT_LIST_ID, "l1"]);
  });
});

describe("inView / countActive", () => {
  const tasks = [
    task({ id: "a", my_day: true }),
    task({ id: "b", important: true, completed: true }),
    task({ id: "c", due_date: "2026-01-06", list_id: "l1" }),
  ];

  it("正常系: ビューごとの条件で判定する", () => {
    expect(inView(tasks[0], "my-day")).toBe(true);
    expect(inView(tasks[1], "important")).toBe(true);
    expect(inView(tasks[2], "planned")).toBe(true);
    expect(inView(tasks[0], "planned")).toBe(false);
    expect(inView(tasks[0], "all")).toBe(true);
    expect(inView(tasks[2], "l1")).toBe(true);
    expect(inView(tasks[0], "l1")).toBe(false);
  });

  it("正常系: 未完了だけを数える", () => {
    expect(countActive(tasks, "all")).toBe(2);
    expect(countActive(tasks, "important")).toBe(0);
  });
});

describe("splitTasks", () => {
  it("正常系: 未完了と完了に分け, 作成が新しい順に並べる", () => {
    const tasks = [
      task({ id: "old", created_at: "2026-01-01T00:00:00.000Z" }),
      task({ id: "new", created_at: "2026-01-02T00:00:00.000Z" }),
      task({ id: "done", completed: true }),
      task({ id: "other", list_id: "l1" }),
    ];
    const { active, done } = splitTasks(tasks, DEFAULT_LIST_ID);
    expect(active.map((t) => t.id)).toEqual(["new", "old"]);
    expect(done.map((t) => t.id)).toEqual(["done"]);
  });
});

describe("sortTasks / splitTasks の並べ替え", () => {
  const a = task({
    id: "a",
    title: "b",
    due_date: "2026-01-03",
    created_at: "2026-01-01T00:00:00.000Z",
  });
  const b = task({
    id: "b",
    title: "a",
    due_date: "2026-01-01",
    completed_at: "2026-01-09T10:00",
    created_at: "2026-01-02T00:00:00.000Z",
  });
  const c = task({
    id: "c",
    title: "c",
    completed_at: "2026-01-08T10:00",
    created_at: "2026-01-03T00:00:00.000Z",
  });
  const ids = (ts: Task[]) => ts.map((t) => t.id);

  it("正常系: 期限の昇順・降順. 期限が無いものは、向きにかかわらず最後", () => {
    expect(ids(sortTasks([c, a, b], { key: "due", dir: "asc" }))).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(ids(sortTasks([c, a, b], { key: "due", dir: "desc" }))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("正常系: 完了日の昇順・降順. 完了日が無いものは最後", () => {
    expect(ids(sortTasks([a, b, c], { key: "completed", dir: "asc" }))).toEqual(
      ["c", "b", "a"],
    );
    expect(
      ids(sortTasks([a, b, c], { key: "completed", dir: "desc" })),
    ).toEqual(["b", "c", "a"]);
  });

  it("正常系: 題名・作成日で並べる", () => {
    expect(ids(sortTasks([a, b, c], { key: "title", dir: "asc" }))).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(ids(sortTasks([a, b, c], { key: "created", dir: "asc" }))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("正常系: 値が同じ・どちらも無いときは、作成が新しい順. 元の配列は変えない", () => {
    const x = task({ id: "x", created_at: "2026-02-01T00:00:00.000Z" });
    const y = task({ id: "y", created_at: "2026-03-01T00:00:00.000Z" });
    const input = [x, y];
    expect(ids(sortTasks(input, { key: "due", dir: "asc" }))).toEqual([
      "y",
      "x",
    ]);
    expect(ids(sortTasks([x, y], { key: "title", dir: "asc" }))).toEqual([
      "y",
      "x",
    ]);
    expect(ids(input)).toEqual(["x", "y"]);
  });

  it("正常系: splitTasks は、未完了と完了のどちらも指定した順に並べる", () => {
    const d1 = task({
      id: "d1",
      completed: true,
      completed_at: "2026-01-02T10:00",
    });
    const d2 = task({
      id: "d2",
      completed: true,
      completed_at: "2026-01-05T10:00",
    });
    const { done } = splitTasks([d1, d2], DEFAULT_LIST_ID, {
      key: "completed",
      dir: "desc",
    });
    expect(ids(done)).toEqual(["d2", "d1"]);
  });
});

describe("完了済みビュー / 完了日の絞り込み", () => {
  const a = task({
    id: "a",
    completed: true,
    completed_at: "2026-01-03T09:30",
  });
  const b = task({
    id: "b",
    completed: true,
    completed_at: "2026-02-10T10:00",
  });
  const c = task({ id: "c", completed: true });
  const open = task({ id: "o" });

  it("正常系: 完了済みビューは完了したタスクだけで、数も完了したタスクの数", () => {
    expect(inView(a, "completed")).toBe(true);
    expect(inView(open, "completed")).toBe(false);
    expect(countActive([a, b, c, open], "completed")).toBe(3);
    expect(countActive([a, b, c, open], "all")).toBe(1);
  });

  it("正常系: 完了日の範囲で絞り込む. 範囲を指定すると完了日が無いものは除く", () => {
    const all = [a, b, c];
    expect(filterByCompletedDate(all, "", "")).toBe(all);
    expect(filterByCompletedDate(all, "2026-02-01", "")).toEqual([b]);
    expect(filterByCompletedDate(all, "", "2026-01-31")).toEqual([a]);
    expect(filterByCompletedDate(all, "2026-01-03", "2026-01-03")).toEqual([a]);
    expect(filterByCompletedDate(all, "2026-03-01", "")).toEqual([]);
  });

  it("正常系: 予定日・着手日で並べ替える", () => {
    const x = task({
      id: "x",
      planned_date: "2026-01-02",
      start_date: "2026-01-09",
    });
    const y = task({
      id: "y",
      planned_date: "2026-01-01",
      start_date: "2026-01-08",
    });
    expect(
      sortTasks([x, y], { key: "planned", dir: "asc" }).map((t) => t.id),
    ).toEqual(["y", "x"]);
    expect(
      sortTasks([x, y], { key: "start", dir: "desc" }).map((t) => t.id),
    ).toEqual(["x", "y"]);
  });
});

describe("createTask", () => {
  it("正常系: 今日の予定で追加すると, 今日の予定と今日の期限になる", () => {
    const t = createTask("a", "my-day", NOW);
    expect(t).toMatchObject({
      my_day: true,
      due_date: "2026-01-05",
      list_id: DEFAULT_LIST_ID,
      important: false,
    });
  });

  it("正常系: 重要で追加すると, 重要になる", () => {
    expect(createTask("a", "important", NOW).important).toBe(true);
  });

  it("正常系: 計画済みで追加すると, 今日の期限になる", () => {
    expect(createTask("a", "planned", NOW).due_date).toBe("2026-01-05");
  });

  it("正常系: リストで追加すると, そのリストに属する", () => {
    const t = createTask("a", "l1", NOW);
    expect(t).toMatchObject({ list_id: "l1", due_date: null, my_day: false });
  });
});

describe("dueLabel / isOverdue", () => {
  it("正常系: 期限の表示を返す", () => {
    expect(dueLabel(task(), "2026-01-05")).toBeNull();
    expect(dueLabel(task({ due_date: "2026-01-05" }), "2026-01-05")).toBe(
      "今日",
    );
    expect(dueLabel(task({ due_date: "2026-02-01" }), "2026-01-05")).toBe(
      "2026-02-01",
    );
  });

  it("正常系: 期限を過ぎた未完了だけが期限切れになる", () => {
    const today = "2026-01-05";
    expect(isOverdue(task({ due_date: "2026-01-04" }), today)).toBe(true);
    expect(isOverdue(task({ due_date: "2026-01-05" }), today)).toBe(false);
    expect(
      isOverdue(task({ due_date: "2026-01-04", completed: true }), today),
    ).toBe(false);
    expect(isOverdue(task(), today)).toBe(false);
  });

  it("正常系: 引数を省略しても動く", () => {
    expect(dueLabel(task({ due_date: todayString() }))).toBe("今日");
    expect(isOverdue(task({ due_date: "2000-01-01" }))).toBe(true);
  });
});

describe("removeList", () => {
  it("正常系: リストと, 属するタスクを削除する", () => {
    const data = {
      lists: [
        { id: "l1", name: "a" },
        { id: "l2", name: "b" },
      ],
      tasks: [
        task({ id: "x", list_id: "l1" }),
        task({ id: "y", list_id: "l2" }),
      ],
    };
    const next = removeList(data, "l1");
    expect(next.lists.map((l) => l.id)).toEqual(["l2"]);
    expect(next.tasks.map((t) => t.id)).toEqual(["y"]);
  });
});

describe("サブタスク", () => {
  it("正常系: サブタスクの完了も、タスクと同じ規則 (空なら記録、入っていれば保持、解除しても残す)", () => {
    const s = newSubtask("a");
    expect(toggleCompletedPatch(s, NOW)).toEqual({
      completed: true,
      completed_at: "2026-01-05T09:00",
    });
    expect(
      toggleCompletedPatch({ ...s, completed: true, completed_at: "x" }, NOW),
    ).toEqual({ completed: false });
  });

  it("正常系: 新しいサブタスクは未完了で、ID が毎回異なる", () => {
    const a = newSubtask("下調べ");
    expect(a).toMatchObject({
      title: "下調べ",
      completed: false,
      planned_date: null,
      start_date: null,
      due_date: null,
      completed_at: null,
    });
    expect(a.id).toMatch(/^sub-/);
    expect(newSubtask("x").id).not.toBe(newSubtask("x").id);
  });

  it("正常系: 完了したサブタスクの数と全体の数を返す。新しいタスクにはサブタスクがない", () => {
    const t = task({
      subtasks: [
        {
          id: "1",
          title: "a",
          completed: true,
          planned_date: null,
          start_date: null,
          due_date: null,
          completed_at: null,
        },
        {
          id: "2",
          title: "b",
          completed: false,
          planned_date: null,
          start_date: null,
          due_date: null,
          completed_at: null,
        },
        {
          id: "3",
          title: "c",
          completed: true,
          planned_date: null,
          start_date: null,
          due_date: null,
          completed_at: null,
        },
      ],
    });
    expect(subtaskProgress(t)).toEqual({ done: 2, total: 3 });
    expect(subtaskProgress(task())).toEqual({ done: 0, total: 0 });
    expect(createTask("a", DEFAULT_LIST_ID, NOW).subtasks).toEqual([]);
  });
});
