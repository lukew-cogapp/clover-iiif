import React from "react";
import dynamic from "next/dynamic";
import { useGLTF } from "./useGLTF";

const ModelCanvas = dynamic(() => import("./ModelCanvas"), {
  ssr: false,
  loading: () => null,
});

interface ModelProps {
  src: string;
  format?: string;
  ariaLabel: string;
  canvasHeight?: string;
}

const SUPPORTED_FORMATS = ["model/gltf-binary", "model/gltf+json"];

const ModelInner: React.FC<ModelProps> = ({
  src,
  format,
  ariaLabel,
  canvasHeight,
}) => {
  const unsupported =
    typeof format === "string" &&
    format.startsWith("model/") &&
    !SUPPORTED_FORMATS.includes(format);
  const status = useGLTF(unsupported ? "" : src);
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: canvasHeight && canvasHeight !== "auto" ? canvasHeight : "100%",
    minHeight: "320px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (status.kind === "loading") {
    return (
      <div
        className="clover-viewer-model-loading"
        data-testid="clover-viewer-model-loading"
        style={containerStyle}
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
        style={containerStyle}
        role="alert"
      >
        Unable to load 3D model.
      </div>
    );
  }

  return (
    <ModelCanvas
      gltf={status.gltf}
      ariaLabel={ariaLabel}
      canvasHeight={canvasHeight}
    />
  );
};

const Model: React.FC<ModelProps> = (props) => {
  if (typeof window === "undefined") return null;
  return <ModelInner {...props} />;
};

export default Model;
