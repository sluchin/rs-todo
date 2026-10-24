import { act, renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import log from "loglevel";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTodoData } from "@/features/tasks/hooks/useTodoData";
import { DEFAULT_LIST_ID } from "@/features/tasks/taskLogic";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const mockedInvoke = vi.mocked(invoke);

/** 読み込みの結果を設定し, フックを描画して読み込み完了まで待つ. */
async function setup(load: unknown = { lists: [], tasks: [] }) {
  mockedInvoke.mockImplementation((cmd) =>
    cmd === "load_data" ? Promise.resolve(load) : Promise.resolve(undefined),
  );
  const hook = renderHook(() => useTodoData());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

/** save_data の呼び出しのうち, 最後に渡されたデータを返す. */
function lastSaved() {
  const calls = mockedInvoke.mock.calls.filter((c) => c[0] === "save_data");
  return (
    calls[calls.length - 1][1] as {
      data: { lists: unknown[]; tasks: { title: string }[] };
    }
  ).data;
}

describe("useTodoData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 保存済みのデータを読み込み, 変更前は保存しない", async () => {
    const { result } = await setup({
      lists: [{ id: "l1", name: "a" }],
      tasks: [],
    });
    expect(result.current.data.lists).toHaveLength(1);
    expect(mockedInvoke).not.toHaveBeenCalledWith(
      "save_data",
      expect.anything(),
    );
  });

  it("異常系: 読み込みに失敗しても, 空のデータで使える", async () => {
    const spy = vi.spyOn(log, "error").mockImplementation(() => {});
    mockedInvoke.mockRejectedValue("NG");
    const { result } = renderHook(() => useTodoData());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.data.tasks).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("正常系: タスクの追加・更新・削除を保存する", async () => {
    const { result } = await setup();
    let id = "";
    act(() => {
      id = result.current.addTask("牛乳", DEFAULT_LIST_ID).id;
    });
    await waitFor(() => expect(lastSaved().tasks).toHaveLength(1));

    act(() => result.current.updateTask(id, { title: "豆乳" }));
    await waitFor(() => expect(lastSaved().tasks[0].title).toBe("豆乳"));

    act(() => result.current.deleteTask(id));
    await waitFor(() => expect(lastSaved().tasks).toHaveLength(0));
  });

  it("正常系: リストの追加と削除を保存する", async () => {
    const { result } = await setup();
    let id = "";
    act(() => {
      id = result.current.addList("買い物");
    });
    await waitFor(() => expect(lastSaved().lists).toHaveLength(1));
    act(() => result.current.deleteList(id));
    await waitFor(() => expect(lastSaved().lists).toHaveLength(0));
  });

  it("異常系: 保存に失敗したらログに出す", async () => {
    const spy = vi.spyOn(log, "error").mockImplementation(() => {});
    const { result } = await setup();
    mockedInvoke.mockRejectedValue("NG");
    act(() => {
      result.current.addList("a");
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });
});
