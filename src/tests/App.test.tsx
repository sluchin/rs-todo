import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  beforeEach(() => {
    // Ensure clean state between tests
  });

  it("renders the app container", () => {
    render(<App />);
    const appContainer = document.querySelector(".app");
    expect(appContainer).toBeDefined();
  });

  it("displays loading state initially", () => {
    render(<App />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });
});
