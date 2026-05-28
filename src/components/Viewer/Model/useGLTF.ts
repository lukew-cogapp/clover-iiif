import { useEffect, useState } from "react";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const DRACO_DECODER_PATH =
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

export type ModelLoadStatus =
  | { kind: "loading"; progress: number }
  | { kind: "loaded"; gltf: GLTF }
  | { kind: "error"; error: Error };

export const useGLTF = (url: string): ModelLoadStatus => {
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
      draco.setDecoderPath(DRACO_DECODER_PATH);
      loader.setDRACOLoader(draco);
      dispose = () => draco.dispose();

      loader.load(
        url,
        (gltf) => {
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
  }, [url]);

  return status;
};
