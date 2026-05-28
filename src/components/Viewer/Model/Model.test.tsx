import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/dynamic", () => ({
  default: () => () =>
    React.createElement(
      "div",
      { "data-testid": "clover-viewer-model-canvas-stub" },
      "canvas",
    ),
}));

vi.mock("./useGLTF", () => ({
  useGLTF: vi.fn(),
}));

import Model from "./Model";
import { useGLTF } from "./useGLTF";

describe("Model", () => {
  it("renders loading state with progress", () => {
    (useGLTF as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      kind: "loading",
      progress: 0.42,
    });
    render(<Model src="foo.glb" ariaLabel="Test model" />);
    expect(screen.getByTestId("clover-viewer-model-loading")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("42%");
  });

  it("renders error state", () => {
    (useGLTF as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      kind: "error",
      error: new Error("boom"),
    });
    render(<Model src="foo.glb" ariaLabel="Test model" />);
    expect(screen.getByTestId("clover-viewer-model-error")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Unable to load");
  });

  it("renders canvas when loaded", () => {
    (useGLTF as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      kind: "loaded",
      gltf: { scene: {}, animations: [] },
    });
    render(<Model src="foo.glb" ariaLabel="Test model" />);
    expect(
      screen.getByTestId("clover-viewer-model-canvas-stub"),
    ).toBeTruthy();
  });
});
