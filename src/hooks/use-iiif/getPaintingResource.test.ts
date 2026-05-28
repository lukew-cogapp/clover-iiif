import {
  manifest,
  manifestNoAnnotations,
} from "src/fixtures/use-iiif/get-painting-resource";

import { Vault } from "@iiif/helpers/vault";
import { getPaintingResource } from "./getPaintingResource";

describe("getPaintingResource()", () => {
  test("should return the painting resource annotation", async () => {
    const vault = new Vault();
    await vault.loadManifest("", manifest);

    const result = getPaintingResource(
      vault,
      "https://test.org/works/ad25d4af-8a12-4d8f-a557-79aea012e081?as=iiif/canvas/access/0",
    );
    const expected = [
      {
        format: "image/tiff",
        height: 2580,
        id: "https://iiif.dc.library.northwestern.edu/iiif/2/4eb5a0d0-1908-42a8-a5f2-1ce88e25928c/full/600,/0/default.jpg",
        "iiif-parser:hasPart": [
          {
            id: "https://iiif.dc.library.northwestern.edu/iiif/2/4eb5a0d0-1908-42a8-a5f2-1ce88e25928c/full/600,/0/default.jpg",
            "iiif-parser:partOf":
              "https://test.org/works/ad25d4af-8a12-4d8f-a557-79aea012e081?as=iiif/canvas/access/0/annotation/0",
            type: "Image",
          },
        ],
        service: [
          {
            "@id":
              "https://iiif.dc.library.northwestern.edu/iiif/2/4eb5a0d0-1908-42a8-a5f2-1ce88e25928c",
            "@type": "ImageService2",
            profile: "http://iiif.io/api/image/2/level2.json",
          },
        ],
        type: "Image",
        width: 3072,
      },
    ];
    expect(result).toEqual(expected);
  });

  test("should return undefined if there are no annotations", async () => {
    const vault = new Vault();
    await vault.loadManifest("", manifestNoAnnotations);

    const result = getPaintingResource(
      vault,
      "https://api.dc.library.northwestern.edu/api/v2/works/57446da0-dc8b-4be6-998d-efb67c71f654?as=iiif/canvas/access/0",
    );
    expect(result).toBeUndefined();
  });

  test("accepts Model bodies (Presi 4 3D draft)", async () => {
    const vault = new Vault();
    const modelManifest = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id: "https://test.org/3d/manifest",
      type: "Manifest",
      label: { none: ["3D"] },
      items: [
        {
          id: "https://test.org/3d/canvas/0",
          type: "Canvas",
          height: 1000,
          width: 1000,
          items: [
            {
              id: "https://test.org/3d/canvas/0/page/0",
              type: "AnnotationPage",
              items: [
                {
                  id: "https://test.org/3d/canvas/0/anno/0",
                  type: "Annotation",
                  motivation: "painting",
                  body: {
                    id: "https://test.org/3d/model.glb",
                    type: "Model",
                    format: "model/gltf-binary",
                  },
                  target: "https://test.org/3d/canvas/0",
                },
              ],
            },
          ],
        },
      ],
    };
    await vault.loadManifest("", modelManifest);

    const result = getPaintingResource(vault, "https://test.org/3d/canvas/0");
    expect(result).toBeDefined();
    expect(result?.[0].type).toBe("Model");
    expect(result?.[0].format).toBe("model/gltf-binary");
  });
});
