// Does a material suit its job? The needs ("mustBe") and material properties come from
// char-and-properties.json; this file only compares them.

/** Looks up one property of a material. null or undefined means "not shown or tested". */
export type PropertyLookup = (property: string) => boolean | null | undefined;

export interface MaterialCheck {
  works: boolean;
  /** The first property the material is missing for this job (e.g. "waterproof"), or null if it works. */
  missing: string | null;
}

export const MATERIAL_OK: MaterialCheck = { works: true, missing: null };

/**
 * The first required property the material does not have, or null if it has them all.
 * A property that is null in the data is not tested, so it never counts as missing.
 */
export function missingProperty(mustBe: Readonly<Record<string, boolean>>, valueOf: PropertyLookup): string | null {
  for (const [property, required] of Object.entries(mustBe)) {
    const value = valueOf(property);
    if (value === null || value === undefined) continue;
    if (value !== required) return property;
  }
  return null;
}
