import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "200mb",
    },
  },
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "model";

const buildManifest = (
  origin: string,
  id: string,
  label: string,
  modelLabel: string,
  imageLabel: string,
) => ({
  "@context": "http://iiif.io/api/presentation/3/context.json",
  id: `${origin}/manifest/baked/${id}/manifest.json`,
  type: "Manifest",
  label: { en: [label] },
  metadata: [
    { label: { en: ["Source"] }, value: { en: ["3D-iiify bake"] } },
    { label: { en: ["Model"] }, value: { en: [modelLabel] } },
    { label: { en: ["Image"] }, value: { en: [imageLabel] } },
  ],
  items: [
    {
      id: `${origin}/manifest/baked/${id}/manifest.json/canvas/0`,
      type: "Canvas",
      height: 1000,
      width: 1000,
      label: { en: [modelLabel] },
      items: [
        {
          id: `${origin}/manifest/baked/${id}/manifest.json/canvas/0/page/0`,
          type: "AnnotationPage",
          items: [
            {
              id: `${origin}/manifest/baked/${id}/manifest.json/canvas/0/anno/model`,
              type: "Annotation",
              motivation: "painting",
              body: {
                id: `${origin}/manifest/baked/${id}/model.glb`,
                type: "Model",
                format: "model/gltf-binary",
                label: { en: [modelLabel] },
              },
              target: `${origin}/manifest/baked/${id}/manifest.json/canvas/0`,
            },
          ],
        },
      ],
    },
  ],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const { modelLabel, imageLabel, glbBase64 } = req.body ?? {};
  if (typeof glbBase64 !== "string" || glbBase64.length === 0) {
    res.status(400).json({ error: "Missing glbBase64" });
    return;
  }

  const id = `${slug(modelLabel || "model")}-${slug(imageLabel || "image")}-${Date.now().toString(36)}`;
  const dir = path.join(process.cwd(), "public", "manifest", "baked", id);
  fs.mkdirSync(dir, { recursive: true });

  const buf = Buffer.from(glbBase64, "base64");
  fs.writeFileSync(path.join(dir, "model.glb"), new Uint8Array(buf));

  const protocol =
    (req.headers["x-forwarded-proto"] as string) ||
    (req.socket && (req.socket as any).encrypted ? "https" : "http");
  const host = req.headers.host ?? "localhost:3000";
  const origin = `${protocol}://${host}`;

  const manifest = buildManifest(
    origin,
    id,
    `${imageLabel ?? "image"} on ${modelLabel ?? "model"}`,
    modelLabel ?? "Model",
    imageLabel ?? "Image",
  );

  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  res.status(200).json({
    id,
    manifestUrl: manifest.id,
    glbUrl: `${origin}/manifest/baked/${id}/model.glb`,
  });
}
