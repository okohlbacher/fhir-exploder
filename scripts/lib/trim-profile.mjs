/**
 * Shared StructureDefinition trim function for fetch-{mii,ips}-profiles.
 *
 * Trims SDs to the subset the completeness walker / IPS walker reads:
 *   { resourceType, url, name, type, snapshot.element[] (path, min?,
 *     max?, mustSupport?, sliceName?, type?, binding (required only)) }
 *
 * DO NOT extend this shape without auditing both walkers — the walkers
 * are profile-version coupled to what trim emits. Section/slice catalogues
 * (e.g. IPS LOINC codes) live INSIDE walker source, not in trimmed JSON
 * (per 44-RESEARCH §6 Pitfall 5).
 *
 * Phase 44 — extracted from fetch-mii-profiles.mjs (Phase 34 inline trim).
 */
export function trim(sd) {
  return {
    resourceType: 'StructureDefinition',
    url: sd.url,
    name: sd.name,
    type: sd.type,
    snapshot: {
      element: (sd.snapshot?.element ?? []).map((e) => {
        const out = { path: e.path };
        if (e.min !== undefined) out.min = e.min;
        if (e.max !== undefined) out.max = e.max;
        if (e.mustSupport !== undefined) out.mustSupport = e.mustSupport;
        if (e.sliceName !== undefined) out.sliceName = e.sliceName;
        if (e.type !== undefined) out.type = e.type;
        if (e.binding?.strength === 'required') out.binding = e.binding;
        return out;
      }),
    },
  };
}
