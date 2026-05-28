import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AnimationMixer, Box3, Sphere, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const Loaded: React.FC<{
  gltf: GLTF;
  onBounds: (radius: number, center: Vector3) => void;
}> = ({ gltf, onBounds }) => {
  const mixerRef = useRef<AnimationMixer | null>(null);

  useEffect(() => {
    const box = new Box3().setFromObject(gltf.scene);
    const sphere = new Sphere();
    box.getBoundingSphere(sphere);
    onBounds(sphere.radius, sphere.center);

    if (gltf.animations?.length > 0) {
      const mixer = new AnimationMixer(gltf.scene);
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
      mixerRef.current = mixer;
    }

    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [gltf, onBounds]);

  useFrame((_, delta) => mixerRef.current?.update(delta));

  return <primitive object={gltf.scene} />;
};

const CameraRig: React.FC<{ target: Vector3; radius: number }> = ({
  target,
  radius,
}) => {
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
    controls.update();
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl, target, radius]);

  useFrame(() => controlsRef.current?.update());

  return null;
};

interface ModelCanvasProps {
  gltf: GLTF;
  ariaLabel: string;
  canvasHeight?: string;
}

const ModelCanvas: React.FC<ModelCanvasProps> = ({
  gltf,
  ariaLabel,
  canvasHeight,
}) => {
  const [target, setTarget] = useState(new Vector3());
  const [radius, setRadius] = useState(0);

  const onBounds = React.useCallback((r: number, c: Vector3) => {
    setRadius(r);
    setTarget(c.clone());
  }, []);

  return (
    <Canvas
      data-testid="clover-viewer-model-canvas"
      style={{
        width: "100%",
        height: canvasHeight && canvasHeight !== "auto" ? canvasHeight : "100%",
        minHeight: "320px",
      }}
      aria-label={ariaLabel}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />
      <Loaded gltf={gltf} onBounds={onBounds} />
      {radius > 0 && <CameraRig target={target} radius={radius} />}
    </Canvas>
  );
};

export default ModelCanvas;
