import { IIIFExternalWebResource } from "@iiif/presentation-3";

/**
 * Fallback Model body extractor for Presi 3-era 3D manifests where
 * @iiif/helpers vault may not normalise Content Resources of `type: "Model"`.
 *
 * Reads the raw Canvas entity from vault, walks its AnnotationPages, and
 * returns any painting annotation bodies whose `type === "Model"` or whose
 * `format` starts with `model/`.
 *
 * Returns undefined when no Model bodies are found, leaving the standard
 * Image/Sound/Video path untouched.
 */
export const getModelPaintingFallback = (
  vault: any,
  canvasId: string,
): IIIFExternalWebResource[] | undefined => {
  const canvas = vault.get(canvasId);
  if (!canvas?.items?.length) return;

  const bodies: IIIFExternalWebResource[] = [];

  for (const pageRef of canvas.items) {
    const page = vault.get(pageRef);
    if (!page?.items) continue;

    for (const annoRef of page.items) {
      const anno = vault.get(annoRef);
      if (!anno) continue;
      const motivation = Array.isArray(anno.motivation)
        ? anno.motivation[0]
        : anno.motivation;
      if (motivation !== "painting") continue;

      const rawBody = Array.isArray(anno.body) ? anno.body[0] : anno.body;
      if (!rawBody) continue;

      const body = vault.get(rawBody.id) ?? rawBody;
      const isModel =
        body?.type === "Model" ||
        (typeof body?.format === "string" && body.format.startsWith("model/"));
      if (isModel) bodies.push(body as IIIFExternalWebResource);
    }
  }

  return bodies.length > 0 ? bodies : undefined;
};
