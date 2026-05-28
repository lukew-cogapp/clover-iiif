import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useGLTF, DEFAULT_DRACO_DECODER_PATH } from "./useGLTF";
import type { ModelTextureAnnotation } from "src/hooks/use-iiif/getModelTextureAnnotations";

export const SUPPORTED_3D_FORMATS = [
  "model/gltf-binary",
  "model/gltf+json",
] as const;

const ModelCanvas = dynamic(() => import("./ModelCanvas"), {
  ssr: false,
  loading: () => null,
});

export interface ModelProps {
  src: string;
  format?: string;
  ariaLabel: string;
  canvasHeight?: string;
  autoPlayAnimations?: boolean;
  autoRotate?: boolean;
  dracoDecoderPath?: string;
  environmentIntensity?: number;
  showGrid?: boolean;
  textureAnnotations?: ModelTextureAnnotation[];
}

const ModelInner: React.FC<ModelProps> = ({
  src,
  format,
  ariaLabel,
  canvasHeight,
  autoPlayAnimations,
  autoRotate,
  dracoDecoderPath = DEFAULT_DRACO_DECODER_PATH,
  environmentIntensity,
  showGrid,
  textureAnnotations,
}) => {
  const onGltfReady = React.useCallback((gltf: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("clover:3d-gltf-ready", { detail: { gltf } }),
      );
    }
  }, []);
  const [texturesEnabled, setTexturesEnabled] = useState(true);
  const unsupported =
    typeof format === "string" &&
    format.startsWith("model/") &&
    !SUPPORTED_3D_FORMATS.includes(format as (typeof SUPPORTED_3D_FORMATS)[number]);
  const status = useGLTF(unsupported ? "" : src, dracoDecoderPath);
  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: canvasHeight && canvasHeight !== "auto" ? canvasHeight : "100%",
    minHeight: "480px",
  };
  const messageStyle: React.CSSProperties = {
    ...containerStyle,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (unsupported) {
    return (
      <div
        className="clover-viewer-model-unsupported"
        data-testid="clover-viewer-model-unsupported"
        style={messageStyle}
        role="alert"
      >
        Unsupported 3D format: {format}
      </div>
    );
  }

  if (status.kind === "loading") {
    return (
      <div
        className="clover-viewer-model-loading"
        data-testid="clover-viewer-model-loading"
        style={messageStyle}
        role="status"
        aria-label={`Loading 3D model: ${Math.round(status.progress * 100)}%`}
      >
        Loading 3D model…{" "}
        {status.progress > 0 ? `${Math.round(status.progress * 100)}%` : ""}
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div
        className="clover-viewer-model-error"
        data-testid="clover-viewer-model-error"
        style={messageStyle}
        role="alert"
      >
        Unable to load 3D model.
      </div>
    );
  }

  return (
    <div
      className="clover-viewer-model"
      data-testid="clover-viewer-model"
      role="img"
      aria-label={ariaLabel}
      style={containerStyle}
    >
      <ModelCanvas
        gltf={status.gltf}
        canvasHeight={canvasHeight}
        autoPlayAnimations={autoPlayAnimations}
        autoRotate={autoRotate}
        environmentIntensity={environmentIntensity}
        showGrid={showGrid}
        textureAnnotations={texturesEnabled ? textureAnnotations : []}
        onGltfReady={onGltfReady}
      />
      {(textureAnnotations?.length ?? 0) > 0 && (
        <button
          type="button"
          className="clover-viewer-model-texture-toggle"
          data-testid="clover-viewer-model-texture-toggle"
          aria-pressed={texturesEnabled}
          onClick={() => setTexturesEnabled((v) => !v)}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            padding: "0.4rem 0.7rem",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "4px",
            font: "inherit",
            fontSize: "0.85rem",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          {texturesEnabled ? "Show original textures" : "Show IIIF texture annotations"}
        </button>
      )}
    </div>
  );
};

const Model: React.FC<ModelProps> = (props) => {
  if (typeof window === "undefined") return null;
  return <ModelInner {...props} />;
};

export default Model;
