import { invoke } from "@tauri-apps/api/core";
import log from "loglevel";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { buildDailyReport, addDays } from "../report";
import { todayString } from "../taskLogic";
import type { TodoData } from "../types";

/** `ReportDialog` の props. */
interface ReportDialogProps {
  data: TodoData;
  onClose: () => void;
}

/**
 * 日報のダイアログ. 日付を選ぶと, その日の日報 (Markdown) を表示し, クリップボードへのコピーと,
 * ファイルへの保存ができる.
 */
export default function ReportDialog({
  data,
  onClose,
}: ReportDialogProps): ReactElement {
  const [date, setDate] = useState(todayString());
  const [message, setMessage] = useState("");
  const report = buildDailyReport(data, date);

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
    invoke<string>("save_report", { date, content: report })
      .then((path) => setMessage(`保存しました: ${path}`))
      .catch((e) => {
        log.error("日報を保存できません", e);
        setMessage(`保存できませんでした: ${String(e)}`);
      });
  };

  return (
    <div className="overlay" role="presentation">
      <div className="dialog" role="dialog" aria-label="日報">
        <header className="dialog-header">
          <h2>日報</h2>
          <button
            type="button"
            aria-label="前の日"
            onClick={() => changeDate(addDays(date, -1))}
          >
            ◀
          </button>
          <input
            type="date"
            aria-label="日報の日付"
            value={date}
            onChange={(e) => changeDate(e.target.value)}
          />
          <button
            type="button"
            aria-label="次の日"
            onClick={() => changeDate(addDays(date, 1))}
          >
            ▶
          </button>
        </header>
        <textarea
          className="report-text"
          aria-label="日報の内容"
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
