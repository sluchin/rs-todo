import type { ReactElement } from "react";
import { useState } from "react";
import Sidebar from "./features/tasks/components/Sidebar";
import TaskDetail from "./features/tasks/components/TaskDetail";
import TaskView from "./features/tasks/components/TaskView";
import { useTodoData } from "./features/tasks/hooks/useTodoData";
import ReportDialog from "./features/tasks/components/ReportDialog";
import { DEFAULT_LIST_ID, DEFAULT_SORT } from "./features/tasks/taskLogic";
import type { SortOrder, ViewId } from "./features/tasks/types";

/**
 * アプリケーションのルート. サイドバー, タスク一覧, 詳細ペインの 3 列で構成する.
 */
export default function App(): ReactElement {
  const store = useTodoData();
  const [view, setView] = useState<ViewId>("my-day");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOrder>(DEFAULT_SORT);
  const [showReport, setShowReport] = useState(false);
  const selected = store.data.tasks.find((t) => t.id === selectedId) ?? null;

  const select = (next: ViewId): void => {
    setView(next);
    setSelectedId(null);
  };

  return (
    <div className="app">
      <Sidebar
        lists={store.data.lists}
        tasks={store.data.tasks}
        selected={view}
        onSelect={select}
        onAddList={(name) => select(store.addList(name))}
        onOpenReport={() => setShowReport(true)}
      />
      <TaskView
        view={view}
        lists={store.data.lists}
        tasks={store.data.tasks}
        selectedTaskId={selectedId}
        onSelectTask={setSelectedId}
        sort={sort}
        onSortChange={setSort}
        onAddTask={(title) => store.addTask(title, view)}
        onUpdateTask={store.updateTask}
        onDeleteList={(id) => {
          store.deleteList(id);
          select(DEFAULT_LIST_ID);
        }}
      />
      {showReport && (
        <ReportDialog data={store.data} onClose={() => setShowReport(false)} />
      )}
      {selected && (
        <TaskDetail
          task={selected}
          onUpdate={(patch) => store.updateTask(selected.id, patch)}
          onDelete={() => {
            store.deleteTask(selected.id);
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
