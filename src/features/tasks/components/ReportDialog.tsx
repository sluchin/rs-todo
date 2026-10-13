import { invoke } from "@tauri-apps/api/core";
import log from "loglevel";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  addDays,
  buildDailyReport,
  buildWeeklyReport,
  weekRange,
} from "../report";
import { todayString } from "../taskLogic";
import type { TodoData } from "../types";

/** `ReportDialog` の props. */
interface ReportDialogProps {
  data: TodoData;
  onClose: () => void;
}

/**
 * 日報のダイアログ. 日報か週報を選び, 日付を選ぶと, その日 (週報は, その日を含む週) のレポート (Markdown) を表示し, クリップボードへのコピーと,
 * ファイルへの保存ができる.
 */
export default function ReportDialog({
  data,
  onClose,
}: ReportDialogProps): ReactElement {
  const [date, setDate] = useState(todayString());
  const [kind, setKind] = useState<"daily" | "weekly">("daily");
  const [message, setMessage] = useState("");
  const weekly = kind === "weekly";
  const report = weekly
    ? buildWeeklyReport(data, date)
    : buildDailyReport(data, date);
  // 保存するファイルの日付. 週報は週の最初の日 (月曜).
  const fileDate = weekly ? weekRange(date).start : date;
  const step = weekly ? 7 : 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changeDate = (next: string): void => {
    if (next === "") return;
    setDate(next);
    setMessage("");
  };

  const copy = (): void => {
    navigator.clipboard
      .writeText(report)
      .then(() => setMessage("クリップボードにコピーしました"))
      .catch((e) => {
        log.error("コピーできません", e);
        setMessage("コピーできませんでした");
      });
  };

  const save = (): void => {
    invoke<string>("save_report", { kind, date: fileDate, content: report })
      .then((path) => setMessage(`保存しました: ${path}`))
      .catch((e) => {
        log.error("日報を保存できません", e);
        setMessage(`保存できませんでした: ${String(e)}`);
      });
  };

  return (
    <div className="overlay" role="presentation">
      <div className="dialog" role="dialog" aria-label="日報・週報">
        <header className="dialog-header">
          <h2>日報・週報</h2>
          <select
            aria-label="種類"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "daily" | "weekly");
              setMessage("");
            }}
          >
            <option value="daily">日報</option>
            <option value="weekly">週報</option>
          </select>
          <button
            type="button"
            aria-label={weekly ? "前の週" : "前の日"}
            onClick={() => changeDate(addDays(date, -step))}
          >
            ◀
          </button>
          <input
            type="date"
            aria-label={weekly ? "週報の日付" : "日報の日付"}
            value={date}
            onChange={(e) => changeDate(e.target.value)}
          />
          <button
            type="button"
            aria-label={weekly ? "次の週" : "次の日"}
            onClick={() => changeDate(addDays(date, step))}
          >
            ▶
          </button>
        </header>
        <textarea
          className="report-text"
          aria-label="レポートの内容"
          readOnly
          value={report}
        />
        <p className="report-message" role="status">
          {message}
        </p>
        <footer className="dialog-footer">
          <button type="button" onClick={copy}>
            コピー
          </button>
          <button type="button" onClick={save}>
            ファイルに保存
          </button>
          <button type="button" onClick={onClose}>
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}
