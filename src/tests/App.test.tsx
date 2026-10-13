import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { todayString } from "../features/tasks/taskLogic";
import type { TodoData } from "../features/tasks/types";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const mockedInvoke = vi.mocked(invoke);

const DATA: TodoData = {
  lists: [{ id: "l1", name: "買い物" }],
  tasks: [
    {
      id: "a",
      title: "牛乳を買う",
      completed: false,
      important: false,
      my_day: false,
      due_date: "2000-01-01",
      note: "",
      completed_at: null,
      list_id: "l1",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "b",
      title: "済んだこと",
      completed: true,
      important: true,
      my_day: true,
      due_date: todayString(),
      note: "",
      completed_at: "2026-01-03T09:30",
      list_id: "tasks",
      created_at: "2026-01-02T00:00:00.000Z",
    },
  ],
};

/** 保存済みデータを返すようにして, App を描画し, 読み込みを待つ. */
async function renderApp(data: TodoData = DATA) {
  mockedInvoke.mockImplementation((cmd) =>
    cmd === "load_data" ? Promise.resolve(data) : Promise.resolve(undefined),
  );
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(mockedInvoke).toHaveBeenCalledWith("load_data"));
  return user;
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 初期表示は「今日の予定」で, 該当するタスクが並ぶ", async () => {
    await renderApp();
    expect(
      await screen.findByRole("heading", { name: "今日の予定" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("済んだこと")).toBeInTheDocument();
    expect(screen.queryByText("牛乳を買う")).not.toBeInTheDocument();
  });

  it("正常系: リストを選ぶと, そのリストのタスクと期限切れの表示が出る", async () => {
    const user = await renderApp();
    await user.click(await screen.findByRole("button", { name: /買い物/ }));
    expect(screen.getByText("牛乳を買う")).toBeInTheDocument();
    expect(screen.getByText(/2000-01-01/)).toHaveClass("overdue");
  });

  it("正常系: タスクを追加できる. 空の入力は追加しない", async () => {
    const user = await renderApp();
    const input = await screen.findByLabelText("タスクを追加");
    await user.type(input, "   {Enter}");
    expect(screen.queryAllByRole("listitem")).toHaveLength(1);
    await user.type(input, "新しいタスク{Enter}");
    expect(screen.getByText("新しいタスク")).toBeInTheDocument();
    expect(input).toHaveValue("");
    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith("save_data", expect.anything()),
    );
  });

  it("正常系: 完了と重要を切り替えられる", async () => {
    const user = await renderApp();
    await user.click(await screen.findByRole("button", { name: "重要を外す" }));
    expect(
      screen.getByRole("button", { name: "重要にする" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "未完了に戻す" }));
    expect(
      within(screen.getByRole("list", { name: "未完了のタスク" })).getByText(
        "済んだこと",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "完了にする" }));
    expect(
      screen.getByRole("button", { name: /完了済み 1/ }),
    ).toBeInTheDocument();
  });

  it("正常系: 完了にすると完了日が入り、未完了に戻すと消える。未完了のタスクの詳細には完了日がない", async () => {
    const user = await renderApp();
    await user.click(
      await screen.findByRole("button", { name: "未完了に戻す" }),
    );
    await user.click(screen.getByText("済んだこと"));
    expect(screen.queryByLabelText("完了日")).toBeNull();

    await user.click(screen.getByRole("button", { name: "完了にする" }));
    expect((screen.getByLabelText("完了日") as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it("正常系: 完了済みの一覧を折りたためる", async () => {
    const user = await renderApp();
    const toggle = await screen.findByRole("button", { name: /完了済み 1/ });
    await user.click(toggle);
    expect(screen.queryByRole("list", { name: "完了済みのタスク" })).toBeNull();
    await user.click(toggle);
    expect(
      screen.getByRole("list", { name: "完了済みのタスク" }),
    ).toBeInTheDocument();
  });

  it("正常系: 詳細を開いて編集し, 閉じ, 削除できる", async () => {
    const user = await renderApp();
    await user.click(await screen.findByText("済んだこと"));
    const detail = screen.getByRole("complementary", { name: "タスクの詳細" });
    const title = within(detail).getByLabelText("題名");
    await user.type(title, "!");
    expect(title).toHaveValue("済んだこと!");

    await user.click(
      within(detail).getByRole("button", { name: /今日の予定に追加済み/ }),
    );
    expect(
      within(detail).getByRole("button", { name: /今日の予定に追加$/ }),
    ).toBeInTheDocument();

    await user.type(within(detail).getByLabelText("メモ"), "m");
    expect(within(detail).getByLabelText("メモ")).toHaveValue("m");

    const completedAt = within(detail).getByLabelText("完了日");
    expect(completedAt).toHaveValue("2026-01-03T09:30");
    fireEvent.change(completedAt, { target: { value: "2026-02-01T08:00" } });
    expect(completedAt).toHaveValue("2026-02-01T08:00");
    fireEvent.change(completedAt, { target: { value: "" } });
    expect(completedAt).toHaveValue("");

    const due = within(detail).getByLabelText("期限");
    await user.clear(due);
    expect(due).toHaveValue("");

    await user.click(within(detail).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByLabelText("タスクの詳細")).toBeNull();

    await user.click(screen.getByRole("button", { name: /すべて/ }));
    await user.click(await screen.findByText("済んだこと!"));
    await user.click(screen.getByRole("button", { name: "タスクを削除" }));
    expect(screen.queryByText("済んだこと!")).toBeNull();
  });

  it("正常系: リストを追加し, 削除できる", async () => {
    const user = await renderApp();
    const input = await screen.findByLabelText("新しいリスト");
    await user.type(input, "  {Enter}");
    expect(
      screen.getByRole("heading", { name: "今日の予定" }),
    ).toBeInTheDocument();
    await user.type(input, "仕事{Enter}");
    expect(screen.getByRole("heading", { name: "仕事" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "リストを削除" }));
    expect(screen.getByRole("heading", { name: "タスク" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /仕事/ })).toBeNull();
  });

  it("正常系: 既定のリストにはリスト削除のボタンがない", async () => {
    const user = await renderApp();
    await user.click(await screen.findByRole("button", { name: /^タスク/ }));
    expect(screen.queryByRole("button", { name: "リストを削除" })).toBeNull();
  });
});
