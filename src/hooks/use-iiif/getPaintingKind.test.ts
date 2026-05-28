import { describe, expect, it } from "vitest";
import { getPaintingKind } from "./getPaintingKind";

describe("getPaintingKind", () => {
  it("returns image for undefined or empty", () => {
    expect(getPaintingKind(undefined)).toBe("image");
    expect(getPaintingKind([])).toBe("image");
  });

  it("returns av for Sound and Video", () => {
    expect(getPaintingKind([{ id: "a", type: "Sound" } as any])).toBe("av");
    expect(getPaintingKind([{ id: "a", type: "Video" } as any])).toBe("av");
  });

  it("returns model for Model type", () => {
    expect(getPaintingKind([{ id: "a", type: "Model" } as any])).toBe("model");
  });

  it("returns model for any model/* format", () => {
    expect(
      getPaintingKind([
        { id: "a", type: "Dataset", format: "model/gltf-binary" } as any,
      ]),
    ).toBe("model");
    expect(
      getPaintingKind([
        { id: "a", type: "Dataset", format: "model/vnd.usd+zip" } as any,
      ]),
    ).toBe("model");
  });

  it("returns image for Image type or unknown", () => {
    expect(getPaintingKind([{ id: "a", type: "Image" } as any])).toBe("image");
    expect(getPaintingKind([{ id: "a", type: "Text" } as any])).toBe("image");
  });
});
