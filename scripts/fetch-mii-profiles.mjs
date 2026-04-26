/**
 * scripts/fetch-mii-profiles.mjs
 *
 * Phase 34 Plan 34-03, MII-EXT-12 / MII-EXT-13.
 *
 * Fetches 14 MII extension IG packages via fhir-package-loader@^2.2.4
 * (devDep), extracts StructureDefinition resources, trims them to the
 * subset the completeness walker reads, and writes:
 *   - src/quality/profiles/extensions/<type>-<slug>.json (one per SD)
 *   - src/quality/profiles/extensions/index.ts (URL-keyed REGISTRY)
 *   - src/quality/profiles/extensions/ATTRIBUTION.md (per-package metadata)
 *
 * Idempotent: re-running overwrites outputs if packages.fhir.org returns
 * newer content.
 *
 * Failure mode = warn-and-continue (CONTEXT D-13): any package that fails
 * to fetch logs console.warn and the script exits 0 — CI relies on committed
 * JSON in the repo (CONTEXT D-12). The `|| true` escape in the prepare hook
 * (CONTEXT D-14) is belt-and-braces: this script's top-level catch also
 * exits 0 on unexpected errors.
 *
 * Pre-GA packages (Kardiologie alpha, Symptom ballot) emit console.info
 * (not warn — pre-GA is expected, not an error).
 *
 * Version pins: sourced from .planning/research/color-design-audit.md §1
 * (Plan 34-01 live probe 2026-04-24). DO NOT use the older 34-RESEARCH
 * draft values — the 34-01 audit is the authoritative source.
 */

import { defaultPackageLoader, LoadStatus } from 'fhir-package-loader';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'src', 'quality', 'profiles', 'extensions');

// Version set verified 2026-04-24 in .planning/research/color-design-audit.md §1.
// Alphabetical-by-German-label per CONTEXT D-01.
const EXTENSION_PACKAGES = [
  ['de.medizininformatikinitiative.kerndatensatz.bildgebung',    '2026.0.0'],
  ['de.medizininformatikinitiative.kerndatensatz.biobank',       '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.dokument',      '2026.0.0'],
  ['de.medizininformatikinitiative.kerndatensatz.icu',           '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.kardiologie',   '2026.0.0-alpha.2'],
  ['de.medizininformatikinitiative.kerndatensatz.mikrobiologie', '2025.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.molgen',        '2026.0.4'],
  ['de.medizininformatikinitiative.kerndatensatz.mtb',           '2026.0.0'],
  ['de.medizininformatikinitiative.kerndatensatz.onkologie',     '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.patho',         '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.pros',          '2026.0.1'],
  ['de.medizininformatikinitiative.kerndatensatz.seltene',       '2026.0.0'],
  ['de.medizininformatikinitiative.kerndatensatz.studie',        '2026.0.2'],
  ['de.medizininformatikinitiative.kerndatensatz.symptom',       '2024.0.0-ballot'],
];

const PRE_GA_PATTERN = /-(alpha|beta|rc|ballot|draft)/i;

// Canonical URLs for ATTRIBUTION.md (matches color-design-audit.md §1).
const CANONICAL_URLS = {
  'de.medizininformatikinitiative.kerndatensatz.bildgebung':    'https://www.medizininformatik-initiative.de/fhir/ext/modul-bildgebung',
  'de.medizininformatikinitiative.kerndatensatz.biobank':       'https://www.medizininformatik-initiative.de/fhir/ext/modul-biobank',
  'de.medizininformatikinitiative.kerndatensatz.dokument':      'https://www.medizininformatik-initiative.de/fhir/ext/modul-dokument',
  'de.medizininformatikinitiative.kerndatensatz.icu':           'https://www.medizininformatik-initiative.de/fhir/ext/modul-icu',
  'de.medizininformatikinitiative.kerndatensatz.kardiologie':   'https://www.medizininformatik-initiative.de/fhir/ext/modul-kardio',
  'de.medizininformatikinitiative.kerndatensatz.mikrobiologie': 'https://www.medizininformatik-initiative.de/fhir/ext/modul-mikrobio',
  'de.medizininformatikinitiative.kerndatensatz.molgen':        'https://www.medizininformatik-initiative.de/fhir/ext/modul-molgen',
  'de.medizininformatikinitiative.kerndatensatz.mtb':           'https://www.medizininformatik-initiative.de/fhir/ext/modul-mtb',
  'de.medizininformatikinitiative.kerndatensatz.onkologie':     'https://www.medizininformatik-initiative.de/fhir/ext/modul-onko',
  'de.medizininformatikinitiative.kerndatensatz.patho':         'https://www.medizininformatik-initiative.de/fhir/ext/modul-patho',
  'de.medizininformatikinitiative.kerndatensatz.pros':          'https://www.medizininformatik-initiative.de/fhir/ext/modul-pros',
  'de.medizininformatikinitiative.kerndatensatz.seltene':       'https://www.medizininformatik-initiative.de/fhir/ext/modul-seltene',
  'de.medizininformatikinitiative.kerndatensatz.studie':        'https://www.medizininformatik-initiative.de/fhir/ext/modul-studie',
  'de.medizininformatikinitiative.kerndatensatz.symptom':       'https://www.medizininformatik-initiative.de/fhir/ext/modul-symptom',
};

function trim(sd) {
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

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const log = (level, msg) => {
    if (level === 'error') console.warn(`[${level}] ${msg}`);
    else if (level === 'info') console.log(`[${level}] ${msg}`);
    else console.log(`[${level}] ${msg}`);
  };
  const loader = await defaultPackageLoader({ log });

  const fetchedOn = new Date().toISOString();
  const registryLines = [];
  const attributionSections = [];

  for (const [name, version] of EXTENSION_PACKAGES) {
    if (PRE_GA_PATTERN.test(version)) {
      console.info(`[info] bundling pre-GA version: ${name}@${version}`);
    }

    const status = await loader.loadPackage(name, version).catch((err) => {
      console.warn(`[warn] ${name}@${version} — fetch failed: ${err?.message ?? err}`);
      return LoadStatus.FAILED;
    });

    attributionSections.push(
      `## ${name}\n\n` +
      `- **Canonical URL:** ${CANONICAL_URLS[name] ?? '(unknown)'}\n` +
      `- **Bundled version:** ${version}\n` +
      `- **License:** CC-BY-4.0\n` +
      `- **Source:** https://packages.fhir.org/packages/${name}\n` +
      `- **Fetched on:** ${fetchedOn}\n`,
    );

    if (status !== LoadStatus.LOADED) {
      console.warn(`[warn] ${name}@${version} — status ${status}; skipping, relying on committed JSON`);
      continue;
    }

    // fhir-package-loader v2 API: findResourceJSONs(key, { type, scope, ... }).
    // - `type` filters by resourceType (not `resourceTypes`)
    // - `scope` restricts to a package by `name` or `name#version` (not `packageId`)
    // - key '*' returns all resources matching the filter; '' sometimes returns empty.
    const sds = loader.findResourceJSONs('*', {
      type: ['StructureDefinition'],
      scope: name,
    }) ?? [];

    for (const sd of sds) {
      const slug = slugify(sd.name ?? sd.id ?? sd.url?.split('/').pop() ?? 'unknown');
      // Sanitize sd.type too — MII LogicalModel SDs occasionally carry a URL-
      // shaped `type` (e.g. "https://.../LogicalModel/...") which would nest
      // the output under subdirectories. Slashes are stripped; the filename
      // prefix keeps the R4 resource-type token where present.
      const typeSlug = String(sd.type ?? 'Unknown').replace(/[^A-Za-z0-9]+/g, '');
      const filename = `${typeSlug}-${slug}.json`;
      await fs.writeFile(
        path.join(OUT_DIR, filename),
        JSON.stringify(trim(sd), null, 2) + '\n',
      );
      // Phase 36 / MII-EXT-12: emit URL to lazy thunk; key is sd.url
      // (canonical, known at script-emit time); value is a static-string
      // `() => import('./<file>.json')` thunk; .default unwrap happens at
      // the caller per Pitfall 1.
      registryLines.push(
        '  ' + JSON.stringify(sd.url) + ": () => import('./" + filename + "') as Promise<{ default: StructureDefinition }>,",
      );
    }
    console.log(`[ok] ${name}@${version} — wrote ${sds.length} StructureDefinition(s)`);
  }

  // -----------------------------------------------------------------------
  // DEFENSIVE EARLY-RETURN (checker fix — cross_plan_data_contracts):
  // When all fetches fail (offline prepare-hook runs), registryLines is
  // empty. Regenerating index.ts with zero entries would clobber the
  // committed REGISTRY and break `getExtensionProfileForUrl()` for every
  // downstream consumer. ATTRIBUTION.md would also regenerate with zero
  // per-package sections (the attributionSections array is only populated
  // inside the loop, so it's also empty in this case). Bail out and rely
  // on the committed JSON/index.ts/ATTRIBUTION.md as the authoritative
  // offline fallback (CONTEXT D-12).
  // -----------------------------------------------------------------------
  if (registryLines.length === 0) {
    console.warn(
      '[warn] no StructureDefinitions fetched (offline or all failed); ' +
      'preserving committed src/quality/profiles/extensions/index.ts + ATTRIBUTION.md',
    );
    return;
  }

  // Regenerate index.ts (Phase 36: per-URL lazy thunks; values trigger
  // dynamic import() chunks at first call site — see RESEARCH §Pattern 1).
  const indexContent =
    "// GENERATED by scripts/fetch-mii-profiles.mjs — DO NOT EDIT BY HAND.\n" +
    "// Regenerated on npm install via the 'prepare' lifecycle hook.\n" +
    "// Phase 36: per-URL lazy-load thunks; values trigger dynamic import() chunks.\n" +
    "import type { StructureDefinition } from '@medplum/fhirtypes';\n\n" +
    "type LazyProfile = () => Promise<{ default: StructureDefinition }>;\n\n" +
    "export const REGISTRY: Record<string, LazyProfile> = {\n" +
    registryLines.join("\n") +
    "\n};\n";
  await fs.writeFile(path.join(OUT_DIR, 'index.ts'), indexContent);

  // Regenerate ATTRIBUTION.md.
  const attributionContent =
    `# Bundled MII Extension StructureDefinition Profiles — Attribution\n\n` +
    `Per Creative Commons Attribution 4.0 International (CC-BY-4.0), this\n` +
    `file attributes each bundled profile to its source IG. The trimmed\n` +
    `JSONs in this directory are derivatives of the upstream packages below.\n` +
    `The FHIR Exploder source code itself remains MIT-licensed — see the\n` +
    `root LICENSE file for details.\n\n` +
    attributionSections.join('\n');
  await fs.writeFile(path.join(OUT_DIR, 'ATTRIBUTION.md'), attributionContent);
}

main().catch((err) => {
  console.warn(`[warn] fetch-mii-profiles failed globally: ${err?.message ?? err}`);
  process.exit(0);
});
