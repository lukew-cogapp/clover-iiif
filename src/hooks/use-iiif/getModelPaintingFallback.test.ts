import { describe, expect, it, vi } from "vitest";
import { getModelPaintingFallback } from "./getModelPaintingFallback";

const makeVault = (entities: Record<string, any>) => ({
  get: vi.fn((ref: any) => {
    if (!ref) return undefined;
    const id = typeof ref === "string" ? ref : ref.id;
    return entities[id];
  }),
});

describe("getModelPaintingFallback", () => {
  it("returns undefined for canvas with no items", () => {
    const vault = makeVault({ "canvas/1": { id: "canvas/1", items: [] } });
    expect(getModelPaintingFallback(vault, "canvas/1")).toBeUndefined();
  });

  it("returns undefined when no Model bodies present", () => {
    const vault = makeVault({
      "canvas/1": { id: "canvas/1", items: [{ id: "page/1" }] },
      "page/1": { id: "page/1", items: [{ id: "anno/1" }] },
      "anno/1": {
        id: "anno/1",
        motivation: "painting",
        body: { id: "body/1" },
      },
      "body/1": { id: "body/1", type: "Image", format: "image/jpeg" },
    });
    expect(getModelPaintingFallback(vault, "canvas/1")).toBeUndefined();
  });

  it("returns Model bodies by type", () => {
    const vault = makeVault({
      "canvas/1": { id: "canvas/1", items: [{ id: "page/1" }] },
      "page/1": { id: "page/1", items: [{ id: "anno/1" }] },
      "anno/1": {
        id: "anno/1",
        motivation: "painting",
        body: { id: "body/1" },
      },
      "body/1": { id: "body/1", type: "Model", format: "model/gltf-binary" },
    });
    const result = getModelPaintingFallback(vault, "canvas/1");
    expect(result).toHaveLength(1);
    expect(result?.[0].type).toBe("Model");
  });

  it("matches by model/* format when type missing", () => {
    const vault = makeVault({
      "canvas/1": { id: "canvas/1", items: [{ id: "page/1" }] },
      "page/1": { id: "page/1", items: [{ id: "anno/1" }] },
      "anno/1": {
        id: "anno/1",
        motivation: "painting",
        body: { id: "body/1" },
      },
      "body/1": { id: "body/1", format: "model/vnd.usd+zip" },
    });
    const result = getModelPaintingFallback(vault, "canvas/1");
    expect(result).toHaveLength(1);
    expect(result?.[0].format).toBe("model/vnd.usd+zip");
  });

  it("skips non-painting motivations", () => {
    const vault = makeVault({
      "canvas/1": { id: "canvas/1", items: [{ id: "page/1" }] },
      "page/1": { id: "page/1", items: [{ id: "anno/1" }] },
      "anno/1": {
        id: "anno/1",
        motivation: "supplementing",
        body: { id: "body/1" },
      },
      "body/1": { id: "body/1", type: "Model" },
    });
    expect(getModelPaintingFallback(vault, "canvas/1")).toBeUndefined();
  });

  it("falls back to inline body when vault.get returns undefined", () => {
    const vault = makeVault({
      "canvas/1": { id: "canvas/1", items: [{ id: "page/1" }] },
      "page/1": { id: "page/1", items: [{ id: "anno/1" }] },
      "anno/1": {
        id: "anno/1",
        motivation: "painting",
        body: {
          id: "body/inline",
          type: "Model",
          format: "model/gltf-binary",
        },
      },
    });
    const result = getModelPaintingFallback(vault, "canvas/1");
    expect(result).toHaveLength(1);
    expect(result?.[0].id).toBe("body/inline");
  });
});
