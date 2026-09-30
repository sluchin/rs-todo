import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});
