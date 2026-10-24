import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DateInput from "@/components/DateInput";

describe("DateInput", () => {
  it("正常系: 値が空のときだけ data-empty が付き、値があると付かない", () => {
    const { rerender } = render(
      <DateInput type="date" label="期限" value="" onChange={() => {}} />,
    );
    expect(screen.getByLabelText("期限")).toHaveAttribute("data-empty", "true");

    rerender(
      <DateInput
        type="date"
        label="期限"
        value="2026-01-05"
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("期限")).not.toHaveAttribute("data-empty");
  });

  it("正常系: 入力した値を onChange に渡す。日時の種類も使える", () => {
    const onChange = vi.fn();
    render(
      <DateInput
        type="datetime-local"
        label="完了日"
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("完了日"), {
      target: { value: "2026-01-05T09:00" },
    });
    expect(onChange).toHaveBeenCalledWith("2026-01-05T09:00");
  });
});
