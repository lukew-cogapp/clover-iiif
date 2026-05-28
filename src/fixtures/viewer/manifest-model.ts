export const manifestModel = {
  "@context": "http://iiif.io/api/presentation/3/context.json",
  id: "http://localhost:3000/manifest/model/astronaut.json",
  type: "Manifest",
  label: { none: ["Astronaut (glTF) - IIIF 3D draft fixture"] },
  items: [
    {
      id: "http://localhost:3000/manifest/model/astronaut.json/canvas/1",
      type: "Canvas",
      height: 1000,
      width: 1000,
      label: { none: ["Astronaut"] },
      items: [
        {
          id: "http://localhost:3000/manifest/model/astronaut.json/canvas/1/page/1",
          type: "AnnotationPage",
          items: [
            {
              id: "http://localhost:3000/manifest/model/astronaut.json/canvas/1/anno/1",
              type: "Annotation",
              motivation: "painting",
              body: {
                id: "https://raw.githubusercontent.com/IIIF/3d/main/assets/astronaut/astronaut.glb",
                type: "Model",
                format: "model/gltf-binary",
              },
              target:
                "http://localhost:3000/manifest/model/astronaut.json/canvas/1",
            },
          ],
        },
      ],
    },
  ],
};
