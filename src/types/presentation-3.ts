import {
  ExternalResourceTypes as BaseExternalResourceTypes,
  IIIFExternalWebResource,
  InternationalString,
} from "@iiif/presentation-3";

/**
 * Presi 4.0 (draft) adds the Model content resource for 3D bodies.
 * Augment locally until @iiif/presentation-3 ships v4 types.
 */
export type ExternalResourceTypes = BaseExternalResourceTypes | "Model";

export interface LabeledIIIFExternalWebResource
  extends IIIFExternalWebResource {
  label?: InternationalString;
  region?: string;
}

export type RenderingItem = WithLabel<IIIFExternalWebResource>;

export type WithLabel<T> = T & {
  label: InternationalString;
};
