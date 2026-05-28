export interface ModelTextureAnnotation {
  id: string;
  mesh?: string;
  channel: "baseColor" | "emissive" | "normal";
  source:
    | { kind: "text"; value: string; format?: string }
    | { kind: "image"; url: string; format?: string };
}

const MESH_SELECTOR_CONFORMS =
  "https://iiif.io/api/extension/3d-mesh-selector/";

const parseMeshSelectorValue = (value: string | undefined) => {
  if (!value) return { mesh: undefined, channel: "baseColor" as const };
  const params = new URLSearchParams(value.replace(/^#/, ""));
  const channelRaw = params.get("channel") ?? "baseColor";
  const channel: ModelTextureAnnotation["channel"] = (
    ["baseColor", "emissive", "normal"] as const
  ).includes(channelRaw as any)
    ? (channelRaw as ModelTextureAnnotation["channel"])
    : "baseColor";
  return {
    mesh: params.get("mesh") ?? undefined,
    channel,
  };
};

/**
 * Extract texture-mapping painting annotations for a canvas that paints
 * a 3D Model.
 *
 * Recognises painting annotations whose target is a SpecificResource with a
 * FragmentSelector `conformsTo` the IIIF 3D mesh-selector extension URL
 * (proposed by Clover ahead of spec). Selector value is parsed as URL-search
 * pairs: `mesh=<name>`, `channel=baseColor|emissive|normal`.
 *
 * Body may be a TextualBody (rendered to a canvas texture at runtime) or an
 * Image content resource (loaded as TextureLoader source).
 */
export const getModelTextureAnnotations = (
  vault: any,
  canvasId: string,
): ModelTextureAnnotation[] => {
  const canvas = vault.get(canvasId);
  if (!canvas?.items?.length) return [];

  const results: ModelTextureAnnotation[] = [];

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

      const target = anno.target;
      if (!target || typeof target === "string") continue;
      if (target.type !== "SpecificResource") continue;
      const selector = Array.isArray(target.selector)
        ? target.selector[0]
        : target.selector;
      if (!selector) continue;
      if (selector.conformsTo !== MESH_SELECTOR_CONFORMS) continue;

      const rawBody = Array.isArray(anno.body) ? anno.body[0] : anno.body;
      if (!rawBody) continue;

      const body = vault.get(rawBody.id) ?? rawBody;
      const { mesh, channel } = parseMeshSelectorValue(selector.value);

      if (body.type === "TextualBody" && typeof body.value === "string") {
        results.push({
          id: anno.id,
          mesh,
          channel,
          source: { kind: "text", value: body.value, format: body.format },
        });
        continue;
      }

      if (
        (body.type === "Image" || typeof body.format === "string") &&
        typeof body.id === "string"
      ) {
        results.push({
          id: anno.id,
          mesh,
          channel,
          source: { kind: "image", url: body.id, format: body.format },
        });
      }
    }
  }

  return results;
};
