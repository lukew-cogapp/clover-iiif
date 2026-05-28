import { describe, expect, it } from "vitest";
import { extractModels } from "./extractModels";

const manifest = {
  type: "Manifest",
  items: [
    {
      id: "c/0",
      type: "Canvas",
      label: { en: ["Glb canvas"] },
      items: [
        {
          type: "AnnotationPage",
          items: [
            {
              type: "Annotation",
              motivation: "painting",
              body: {
                id: "https://example.org/model.glb",
                type: "Model",
                format: "model/gltf-binary",
              },
            },
          ],
        },
      ],
    },
    {
      id: "c/1",
      type: "Canvas",
      label: { en: ["Usdz canvas"] },
      items: [
        {
          type: "AnnotationPage",
          items: [
            {
              type: "Annotation",
              motivation: "painting",
              body: {
                id: "https://example.org/model.usdz",
                type: "Model",
                format: "model/vnd.usd+zip",
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("extractModels", () => {
  it("returns only supported gltf bodies", () => {
    const res = extractModels(manifest);
    expect(res).toHaveLength(1);
    expect(res[0].canvasId).toBe("c/0");
    expect(res[0].format).toBe("model/gltf-binary");
  });

  it("returns empty for image manifests", () => {
    const images = {
      type: "Manifest",
      items: [
        {
          id: "c/0",
          type: "Canvas",
          items: [
            {
              type: "AnnotationPage",
              items: [
                {
                  type: "Annotation",
                  motivation: "painting",
                  body: {
                    id: "https://example.org/img.jpg",
                    type: "Image",
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractModels(images)).toHaveLength(0);
  });
});
