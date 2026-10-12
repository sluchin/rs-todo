import { invoke } from "@tauri-apps/api/core";
import log from "loglevel";
import { useCallback, useEffect, useRef, useState } from "react";
import { createTask, newId, removeList } from "../taskLogic";
import type { Task, TodoData, ViewId } from "../types";

/** `useTodoData` が返す値. */
export interface TodoStore {
  data: TodoData;
  /** 保存済みのデータを読み込み終えたか. */
  loaded: boolean;
  addTask: (title: string, view: ViewId) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addList: (name: string) => string;
  deleteList: (id: string) => void;
}

const EMPTY: TodoData = { lists: [], tasks: [] };

/**
 * タスクとリストを保持し, 変更のたびにバックエンドへ保存するフック.
 *
 * @returns データと, それを変更する関数.
 */
export function useTodoData(): TodoStore {
  const [data, setData] = useState<TodoData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    invoke<TodoData>("load_data")
      .then((d) => setData(d))
      .catch((e) => log.error("データを読み込めません", e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !dirty.current) return;
    invoke("save_data", { data }).catch((e) =>
      log.error("データを保存できません", e),
    );
  }, [data, loaded]);

  /** 変更を記録して, 保存の対象にする. */
  const change = useCallback((fn: (d: TodoData) => TodoData) => {
    dirty.current = true;
    setData(fn);
  }, []);

  const addTask = useCallback(
    (title: string, view: ViewId): Task => {
      const task = createTask(title, view);
      change((d) => ({ ...d, tasks: [...d.tasks, task] }));
      return task;
    },
    [change],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      change((d) => ({
        ...d,
        tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    [change],
  );

  const deleteTask = useCallback(
    (id: string) =>
      change((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),
    [change],
  );

  const addList = useCallback(
    (name: string): string => {
      const id = newId("list");
      change((d) => ({ ...d, lists: [...d.lists, { id, name }] }));
      return id;
    },
    [change],
  );

  const deleteList = useCallback(
    (id: string) => change((d) => removeList(d, id)),
    [change],
  );

  return { data, loaded, addTask, updateTask, deleteTask, addList, deleteList };
}
