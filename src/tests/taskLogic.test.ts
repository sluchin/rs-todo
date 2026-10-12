import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIST_ID,
  allLists,
  countActive,
  createTask,
  dueLabel,
  inView,
  isOverdue,
  newId,
  removeList,
  splitTasks,
  todayString,
  viewTitle,
} from "../features/tasks/taskLogic";
import type { Task } from "../features/tasks/types";

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
