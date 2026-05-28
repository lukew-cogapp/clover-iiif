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

const applyTextureAnnotations = (
  gltf: GLTF,
  annotations: ModelTextureAnnotation[],
  textureLoader: TextureLoader,
): Array<{ material: any; key: string; original: any }> => {
  const reverts: Array<{ material: any; key: string; original: any }> = [];
  if (annotations.length === 0) return reverts;

  for (const anno of annotations) {
    const matKey = CHANNEL_TO_MATERIAL_KEY[anno.channel];

    let texture: Texture | null = null;
    if (anno.source.kind === "text") {
      texture = buildTextTexture(anno.source.value);
    } else {
      texture = textureLoader.load(anno.source.url);
      texture.colorSpace = SRGBColorSpace;
    }
    if (!texture) continue;

    gltf.scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      if (anno.mesh && obj.name !== anno.mesh) return;
      const material = obj.material as MeshStandardMaterial;
      if (!material) return;
      reverts.push({
        material,
        key: matKey,
        original: material[matKey] ?? null,
      });
      material[matKey] = texture;
      material.needsUpdate = true;
    });
  }

  return reverts;
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

    const textureLoader = new TextureLoader();
    const reverts = applyTextureAnnotations(
      gltf,
      textureAnnotations ?? [],
      textureLoader,
    );

    return () => {
      const mixer = mixerRef.current;
      if (mixer) {
        mixer.stopAllAction();
        mixer.uncacheRoot(gltf.scene);
      }
      mixerRef.current = null;
      for (const revert of reverts) {
        revert.material[revert.key] = revert.original;
        revert.material.needsUpdate = true;
      }
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
    if (radius === 0) return;
    const distance = radius * 2.5;
    camera.position.set(target.x, target.y, target.z + distance);
    camera.near = Math.max(0.001, distance / 100);
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = distance / 10;
    controls.maxDistance = distance * 10;
    controls.autoRotate = Boolean(autoRotate);
    controls.autoRotateSpeed = 1.5;
    controls.update();
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl, target, radius, autoRotate]);

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
}

const ModelCanvas: React.FC<ModelCanvasProps> = ({
  gltf,
  canvasHeight,
  autoPlayAnimations,
  autoRotate,
  environmentIntensity = 0.6,
  showGrid,
  textureAnnotations,
}) => {
  const [target, setTarget] = useState(new Vector3());
  const [radius, setRadius] = useState(0);

  return (
    <Canvas
      data-testid="clover-viewer-model-canvas"
      style={{
        width: "100%",
        height: canvasHeight && canvasHeight !== "auto" ? canvasHeight : "100%",
        minHeight: "320px",
      }}
      gl={{
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
        antialias: true,
      }}
      aria-hidden="true"
    >
      <hemisphereLight
        args={[0xffffff, 0x444444, environmentIntensity]}
      />
      <ambientLight intensity={environmentIntensity * 0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />
      {showGrid && (
        <gridHelper args={[Math.max(radius * 4, 2), 10, 0x888888, 0xcccccc]} />
      )}
      <Loaded
        gltf={gltf}
        autoPlayAnimations={autoPlayAnimations}
        textureAnnotations={textureAnnotations}
        onBounds={(r, c) => {
          setRadius(r);
          setTarget(c.clone());
        }}
      />
      {radius > 0 && (
        <CameraRig target={target} radius={radius} autoRotate={autoRotate} />
      )}
    </Canvas>
  );
};

export default ModelCanvas;
