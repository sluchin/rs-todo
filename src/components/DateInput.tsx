import type { ReactElement } from "react";

/** `DateInput` の props. */
interface DateInputProps {
  /** 入力欄の種類. 日付だけか, 日時か. */
  type: "date" | "datetime-local";
  /** 入力欄のラベル (アクセシビリティ用). */
  label: string;
  /** 値. 空なら空文字. */
  value: string;
  /** 値が変わったときのハンドラー. 消したときは空文字. */
  onChange: (value: string) => void;
}

/**
 * 日付・日時の入力欄. 値が空のとき, ブラウザが出す「yyyy/mm/dd」の表示を隠す
 * (選択するとき, または入力中は出す. カレンダーのボタンは使える).
 */
export default function DateInput({
  type,
  label,
  value,
  onChange,
}: DateInputProps): ReactElement {
  return (
    <input
      type={type}
      aria-label={label}
      value={value}
      data-empty={value === "" ? "true" : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
