import { IIIFExternalWebResource } from "@iiif/presentation-3";

export type PaintingKind = "image" | "av" | "model";

/**
 * Classify the first painting body of a canvas to drive viewer routing.
 *
 * Recognised:
 *   - `Sound` / `Video` body types -> "av"
 *   - `Model` body type or any body whose `format` starts with `model/` -> "model"
 *   - anything else -> "image"
 */
export const getPaintingKind = (
  painting: IIIFExternalWebResource[] | undefined,
): PaintingKind => {
  const first = painting?.[0];
  if (!first) return "image";

  const type = first.type as string | undefined;
  const format = first.format;

  if (type === "Sound" || type === "Video") return "av";
  if (
    type === "Model" ||
    (typeof format === "string" && format.startsWith("model/"))
  ) {
    return "model";
  }
  return "image";
};
