import type { ReactElement } from "react";
import { useState } from "react";
import {
  DEFAULT_LIST_ID,
  DEFAULT_LIST_NAME,
  SMART_VIEWS,
  countActive,
} from "../taskLogic";
import type { Task, TaskList, ViewId } from "../types";

/** `Sidebar` の props. */
interface SidebarProps {
  lists: TaskList[];
  tasks: Task[];
  selected: ViewId;
  onSelect: (view: ViewId) => void;
  onAddList: (name: string) => void;
  onOpenReport: () => void;
}

/** ビューを選ぶ 1 行. */
function Row(props: {
  icon: string;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={`nav-row${props.active ? " active" : ""}`}
      aria-current={props.active ? "page" : undefined}
      onClick={props.onClick}
    >
      <span className="nav-icon" aria-hidden="true">
        {props.icon}
      </span>
      <span className="nav-label">{props.label}</span>
      {props.count > 0 && <span className="nav-count">{props.count}</span>}
    </button>
  );
}

/**
 * 左側のナビゲーション. スマートリスト, 既定のリスト, 利用者のリストを並べる.
 */
export default function Sidebar({
  lists,
  tasks,
  selected,
  onSelect,
  onAddList,
  onOpenReport,
}: SidebarProps): ReactElement {
  const [name, setName] = useState("");

  const submit = (): void => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    onAddList(trimmed);
    setName("");
  };

  return (
    <nav className="sidebar" aria-label="リスト">
      <div className="nav-group">
        {SMART_VIEWS.map((v) => (
          <Row
            key={v.id}
            icon={v.icon}
            label={v.label}
            count={countActive(tasks, v.id)}
            active={selected === v.id}
            onClick={() => onSelect(v.id)}
          />
        ))}
        <Row
          icon="⌂"
          label={DEFAULT_LIST_NAME}
          count={countActive(tasks, DEFAULT_LIST_ID)}
          active={selected === DEFAULT_LIST_ID}
          onClick={() => onSelect(DEFAULT_LIST_ID)}
        />
      </div>
      <hr className="nav-sep" />
      <div className="nav-group nav-lists">
        {lists.map((l) => (
          <Row
            key={l.id}
            icon="≡"
            label={l.name}
            count={countActive(tasks, l.id)}
            active={selected === l.id}
            onClick={() => onSelect(l.id)}
          />
        ))}
      </div>
      <form
        className="new-list"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <span className="nav-icon" aria-hidden="true">
          +
        </span>
        <input
          aria-label="新しいリスト"
          placeholder="新しいリスト"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </form>
      <button
        type="button"
        className="nav-row report-button"
        onClick={onOpenReport}
      >
        <span className="nav-icon" aria-hidden="true">
          ✎
        </span>
        <span className="nav-label">日報</span>
      </button>
    </nav>
  );
}
