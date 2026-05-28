import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Box3,
  Mesh,
  MeshStandardMaterial,
  Sphere,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ModelTextureAnnotation } from "src/hooks/use-iiif/getModelTextureAnnotations";
import { buildTextTexture } from "./textureFromText";

const CHANNEL_TO_MATERIAL_KEY: Record<
  ModelTextureAnnotation["channel"],
  "map" | "emissiveMap" | "normalMap"
> = {
  baseColor: "map",
  emissive: "emissiveMap",
  normal: "normalMap",
};

const ORIGINAL_KEY = "__cloverOriginalMaps";

const captureOriginal = (
  material: MeshStandardMaterial,
  matKey: "map" | "emissiveMap" | "normalMap",
) => {
  const store = (material.userData[ORIGINAL_KEY] ??= {});
  if (!(matKey in store)) {
    store[matKey] = material[matKey] ?? null;
  }
};

const restoreOriginals = (gltf: GLTF) => {
  gltf.scene.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of materials) {
      const material = m as MeshStandardMaterial | undefined;
      if (!material) continue;
      const store = material.userData?.[ORIGINAL_KEY];
      if (!store) continue;
      for (const k of Object.keys(store) as Array<
        "map" | "emissiveMap" | "normalMap"
      >) {
        material[k] = store[k];
      }
      material.needsUpdate = true;
    }
  });
};

const applyTextureAnnotations = (
  gltf: GLTF,
  annotations: ModelTextureAnnotation[],
  textureLoader: TextureLoader,
): void => {
  if (annotations.length === 0) return;

  for (const anno of annotations) {
    const matKey = CHANNEL_TO_MATERIAL_KEY[anno.channel];

    let texture: Texture | null = null;
    if (anno.source.kind === "text") {
      texture = buildTextTexture(anno.source.value);
    } else {
      texture = textureLoader.load(
        anno.source.url,
        undefined,
        undefined,
        (err) =>
          console.error(`Failed to load 3D texture: ${anno.source.kind === "image" ? anno.source.url : ""}`, err),
      );
      texture.colorSpace = SRGBColorSpace;
    }
    if (!texture) continue;

    gltf.scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      if (anno.mesh && obj.name !== anno.mesh) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of materials) {
        const material = m as MeshStandardMaterial | undefined;
        if (!material) continue;
        captureOriginal(material, matKey);
        material[matKey] = texture;
        material.needsUpdate = true;
      }
    });
  }
};

const Loaded: React.FC<{
  gltf: GLTF;
  onBounds: (radius: number, center: Vector3) => void;
  autoPlayAnimations?: boolean;
  textureAnnotations?: ModelTextureAnnotation[];
}> = ({ gltf, onBounds, autoPlayAnimations, textureAnnotations }) => {
  const mixerRef = useRef<AnimationMixer | null>(null);

  useEffect(() => {
    const box = new Box3().setFromObject(gltf.scene);
    const sphere = new Sphere();
    box.getBoundingSphere(sphere);
    onBounds(sphere.radius, sphere.center);

    if (autoPlayAnimations && gltf.animations?.length > 0) {
      const mixer = new AnimationMixer(gltf.scene);
      mixer.clipAction(gltf.animations[0]).play();
      mixerRef.current = mixer;
    }

    restoreOriginals(gltf);
    const textureLoader = new TextureLoader();
    applyTextureAnnotations(gltf, textureAnnotations ?? [], textureLoader);

    return () => {
      const mixer = mixerRef.current;
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(gltf.scene);
      }
      mixerRef.current = null;
      restoreOriginals(gltf);
    };
  }, [gltf, onBounds, autoPlayAnimations, textureAnnotations]);

  useFrame((_, delta) => mixerRef.current?.update(delta));

  return <primitive object={gltf.scene} />;
};

const CameraRig: React.FC<{
  target: Vector3;
  radius: number;
  autoRotate?: boolean;
}> = ({ target, radius, autoRotate }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 1.5;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  const initialised = useRef(false);
  useEffect(() => {
    if (initialised.current) return;
    const controls = controlsRef.current;
    if (!controls) return;
    if (radius === 0) return;
    const distance = radius * 2.5;
    camera.position.set(target.x, target.y, target.z + distance);
    camera.near = Math.max(0.001, distance / 1000);
    camera.far = distance * 1000;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.minDistance = distance / 100;
    controls.maxDistance = distance * 100;
    controls.update();
    initialised.current = true;
  }, [camera, target, radius]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (controls) controls.autoRotate = Boolean(autoRotate);
  }, [autoRotate]);

  useFrame(() => controlsRef.current?.update());

  return null;
};

interface ModelCanvasProps {
  gltf: GLTF;
  canvasHeight?: string;
  autoPlayAnimations?: boolean;
  autoRotate?: boolean;
  environmentIntensity?: number;
  showGrid?: boolean;
  textureAnnotations?: ModelTextureAnnotation[];
  onGltfReady?: (gltf: GLTF) => void;
}

const ModelCanvas: React.FC<ModelCanvasProps> = ({
  gltf,
  canvasHeight,
  autoPlayAnimations,
  autoRotate,
  environmentIntensity = 0.6,
  showGrid,
  textureAnnotations,
  onGltfReady,
}) => {
  const [target, setTarget] = useState(new Vector3());
  const [radius, setRadius] = useState(0);

  const onBounds = React.useCallback((r: number, c: Vector3) => {
    setRadius(r);
    setTarget(c.clone());
  }, []);

  React.useEffect(() => {
    onGltfReady?.(gltf);
  }, [gltf, onGltfReady]);

  return (
    <Canvas
      data-testid="clover-viewer-model-canvas"
      style={{
        width: "100%",
        height: canvasHeight && canvasHeight !== "auto" ? canvasHeight : "100%",
        minHeight: "320px",
        touchAction: "none",
      }}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
        outputColorSpace: SRGBColorSpace,
        antialias: true,
      }}
      aria-hidden="true"
    >
      <hemisphereLight
        args={[0xffffff, 0x808080, environmentIntensity * 2]}
      />
      <ambientLight intensity={environmentIntensity * 1.2} />
      <directionalLight position={[5, 10, 7]} intensity={2.2} />
      <directionalLight position={[-5, -3, -5]} intensity={0.8} />
      <directionalLight position={[0, -5, 5]} intensity={0.6} />
      {showGrid && (
        <gridHelper args={[Math.max(radius * 4, 2), 10, 0x888888, 0xcccccc]} />
      )}
      <Loaded
        gltf={gltf}
        autoPlayAnimations={autoPlayAnimations}
        textureAnnotations={textureAnnotations}
        onBounds={onBounds}
      />
      <CameraRig target={target} radius={radius} autoRotate={autoRotate} />
    </Canvas>
  );
};

export default ModelCanvas;
