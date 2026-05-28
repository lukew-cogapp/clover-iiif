import { describe, expect, it } from "vitest";
import { extractImages } from "./extractImages";

const baseManifest = {
  type: "Manifest",
  items: [
    {
      id: "c/0",
      type: "Canvas",
      label: { en: ["Page 1"] },
      thumbnail: [{ id: "https://example.org/thumb.jpg" }],
      items: [
        {
          type: "AnnotationPage",
          items: [
            {
              type: "Annotation",
              motivation: "painting",
              body: {
                id: "https://example.org/full.jpg",
                type: "Image",
                format: "image/jpeg",
                width: 4000,
                height: 3000,
                service: [
                  {
                    id: "https://example.org/iiif/2/asset",
                    type: "ImageService2",
                  },
                ],
              },
              target: "c/0",
            },
          ],
        },
      ],
    },
  ],
};

describe("extractImages", () => {
  it("returns one image with service-rewritten textureUrl", () => {
    const res = extractImages(baseManifest);
    expect(res).toHaveLength(1);
    expect(res[0].canvasId).toBe("c/0");
    expect(res[0].canvasLabel).toBe("Page 1");
    expect(res[0].imageUrl).toBe("https://example.org/full.jpg");
    expect(res[0].textureUrl).toBe(
      "https://example.org/iiif/2/asset/full/!2048,2048/0/default.jpg",
    );
    expect(res[0].thumbnail).toBe("https://example.org/thumb.jpg");
  });

  it("falls back to body.id when no service is present", () => {
    const m = JSON.parse(JSON.stringify(baseManifest));
    delete m.items[0].items[0].items[0].body.service;
    const res = extractImages(m);
    expect(res[0].textureUrl).toBe("https://example.org/full.jpg");
  });

  it("skips non-painting motivations", () => {
    const m = JSON.parse(JSON.stringify(baseManifest));
    m.items[0].items[0].items[0].motivation = "supplementing";
    expect(extractImages(m)).toHaveLength(0);
  });
});
