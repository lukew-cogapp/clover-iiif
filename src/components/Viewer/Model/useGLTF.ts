import { useEffect, useState } from "react";
import { Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

export const DEFAULT_DRACO_DECODER_PATH =
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

export type ModelLoadStatus =
  | { kind: "loading"; progress: number }
  | { kind: "loaded"; gltf: GLTF }
  | { kind: "error"; error: Error };

export const useGLTF = (
  url: string,
  dracoDecoderPath: string = DEFAULT_DRACO_DECODER_PATH,
): ModelLoadStatus => {
  const [status, setStatus] = useState<ModelLoadStatus>({
    kind: "loading",
    progress: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "loading", progress: 0 });

    let dispose: (() => void) | null = null;

    (async () => {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/loaders/DRACOLoader.js"),
      ]);
      if (cancelled) return;

      const loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath(dracoDecoderPath);
      loader.setDRACOLoader(draco);
      dispose = () => draco.dispose();

      loader.load(
        url,
        async (gltf) => {
          if (cancelled) return;
          await applySpecGlossFallback(gltf);
          if (!cancelled) setStatus({ kind: "loaded", gltf });
        },
        (event) => {
          if (cancelled || !event.lengthComputable) return;
          setStatus({
            kind: "loading",
            progress: event.loaded / event.total,
          });
        },
        (err) => {
          if (cancelled) return;
          setStatus({
            kind: "error",
            error: err instanceof Error ? err : new Error(String(err)),
          });
        },
      );
    })().catch((err) => {
      if (!cancelled)
        setStatus({
          kind: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [url, dracoDecoderPath]);

  return status;
};

/**
 * Three.js (since r161) no longer parses the deprecated
 * `KHR_materials_pbrSpecularGlossiness` extension. Models that ship only with
 * spec-gloss materials end up with no baseColor texture on their generated
 * MeshStandardMaterial and render as grey when the original asset clearly
 * has a diffuse texture.
 *
 * This shim walks the loaded scene, finds materials whose source glTF
 * material declares a `diffuseTexture` in the deprecated extension, resolves
 * the texture via the GLTFLoader parser dependency API, and assigns it to
 * `material.map` (sRGB) so the model renders with its intended albedo.
 *
 * Specular/glossiness are not re-derived; only the diffuse map is restored.
 */
const applySpecGlossFallback = async (gltf: GLTF): Promise<void> => {
  const parser: any = (gltf as any).parser;
  const rawMaterials: any[] = parser?.json?.materials ?? [];
  if (rawMaterials.length === 0) return;

  const meshes: Mesh[] = [];
  gltf.scene.traverse((obj) => {
    if (obj instanceof Mesh) meshes.push(obj);
  });
  if (meshes.length === 0) return;

  const materialIndexByName = new Map<string, number>();
  rawMaterials.forEach((m: any, i: number) => {
    if (m?.name) materialIndexByName.set(m.name, i);
  });

  for (const mesh of meshes) {
    const material = mesh.material as MeshStandardMaterial | undefined;
    if (!material) continue;
    if (material.map) continue;

    const rawIndex = materialIndexByName.get(material.name);
    if (rawIndex === undefined) continue;
    const rawMaterial = rawMaterials[rawIndex];
    const ext = rawMaterial?.extensions?.KHR_materials_pbrSpecularGlossiness;
    const diffuseIndex = ext?.diffuseTexture?.index;
    if (typeof diffuseIndex !== "number") continue;

    try {
      const texture = await parser.getDependency("texture", diffuseIndex);
      if (texture) {
        texture.colorSpace = SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
      }
    } catch {
      // ignore — leave material unchanged
    }
  }
};
