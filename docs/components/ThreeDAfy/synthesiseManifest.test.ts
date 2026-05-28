import { describe, expect, it } from "vitest";
import { synthesiseManifest } from "./synthesiseManifest";

describe("synthesiseManifest", () => {
  const m = synthesiseManifest({
    modelUrl: "https://example.org/model.glb",
    imageUrl: "https://example.org/img.jpg",
    imageLabel: "Pi",
    modelLabel: "Pie",
  });

  it("produces a Presi 3 Manifest", () => {
    expect(m.type).toBe("Manifest");
    expect(m["@context"]).toMatch(/presentation\/3/);
    expect(m.items).toHaveLength(1);
    expect(m.items[0].type).toBe("Canvas");
  });

  it("has Model painting annotation on the canvas", () => {
    const annos = m.items[0].items[0].items;
    expect(annos[0].motivation).toBe("painting");
    expect(annos[0].body.type).toBe("Model");
    expect(annos[0].body.id).toBe("https://example.org/model.glb");
    expect(annos[0].target).toBe(m.items[0].id);
  });

  it("has mesh-selector texture painting annotation", () => {
    const texture = m.items[0].items[0].items[1];
    expect(texture.body.type).toBe("Image");
    expect(texture.body.id).toBe("https://example.org/img.jpg");
    const target = texture.target as {
      type: string;
      selector: { conformsTo: string; value: string };
    };
    expect(target.type).toBe("SpecificResource");
    expect(target.selector.conformsTo).toBe(
      "https://iiif.io/api/extension/3d-mesh-selector/",
    );
    expect(target.selector.value).toBe("channel=baseColor");
  });

  it("uses a stable synthetic id", () => {
    const a = synthesiseManifest({
      modelUrl: "a",
      imageUrl: "b",
    });
    const b = synthesiseManifest({
      modelUrl: "a",
      imageUrl: "b",
    });
    expect(a.id).toBe(b.id);
  });
});
