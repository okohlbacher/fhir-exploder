/**
 * Authentication config for the Phase 43 external-validator cascade.
 *
 * SECURITY (43-CONTEXT.md D-01 / D-02):
 *   - Basic-auth credentials are accepted as plaintext in settings.yaml on
 *     the user's local disk. Same trust boundary as the FHIR server URL.
 *   - Bearer tokens NEVER persist to settings.yaml. The schema deliberately
 *     omits any `token` / `credentials` field; the YAML parser silently drops
 *     such fields if they appear (see src/config/settings.ts narrowing).
 *     Bearer tokens live in localStorage under a versioned key managed by
 *     ValidatorAuthSettingsModal — see that component for the exact key and
 *     read/write helpers.
 *
 * NOTE: do NOT add a `token` field here. Doing so opens T-43-06 by giving
 * users a place to paste org-issued bearer secrets into the on-disk YAML.
 */
export interface ValidatorAuthConfig {
  type: 'basic' | 'bearer';
  username?: string;  // basic only
  password?: string;  // basic only — plaintext in settings.yaml is INTENTIONAL (D-01)
}

export interface AppSettings {
  fhir: {
    serverUrl: string;
    auth: {
      mode: 'open' | 'basic' | 'bearer';
      username?: string;
      password?: string;
      token?: string;
    };
  };
  terminology?: {
    serverUrl?: string;
  };
  validation?: {
    /**
     * External FHIR validator endpoint for $validate. When absent, the
     * Data Quality Dashboard falls back to offline structural validation
     * against bundled MII profiles. PHI flows outbound when set; the UI
     * surfaces a warning on the Validation tab (Plan 05).
     */
    validatorUrl?: string;
    /** Batch size for Plan 05's batch validator. Defaults to 25. */
    batchSize?: number;
    /**
     * `externalValidator` block — external FHIR validator cascade (e.g.
     * a HAPI or Firely instance). When `enabled` + `url` are set, the
     * Validation tab runs a 3-tier cascade: external → server $validate
     * → local structural checker. Every external fetch is PHI-gated
     * (see src/quality/phiGate.ts) and AbortController-wrapped with
     * `timeoutMs` (default 15000).
     *
     * Phase 31 UX-01 (D-07 + D-18).
     */
    externalValidator?: {
      url: string;
      enabled: boolean;
      timeoutMs?: number;
      /** Optional override for the variant suffix in the Active-strategy status line (D-18). Blank → URL-pattern heuristic. */
      label?: string;
      /**
       * Phase 43 VAL-06: HTTP authentication for the external validator.
       * Basic credentials live in YAML; bearer tokens NEVER do (see
       * ValidatorAuthConfig docstring + 43-CONTEXT.md D-01/D-02).
       */
      auth?: ValidatorAuthConfig;
      /**
       * Phase 43 VAL-07: opt-in semantic near-miss suggestions for
       * `code-invalid` issues. Walks the configured terminology server
       * via `$lookup` (depth 3, 50-node abort, top-10 results). Default
       * false (43-CONTEXT.md D-11).
       */
      semanticNearMisses?: boolean;
    };
  };
  /** Plausibility check thresholds (D-08). */
  plausibility?: {
    /** Maximum plausible patient age in years. Defaults to 150. */
    maxAge?: number;
    /** Maximum plausible encounter duration in days. Defaults to 365. */
    maxEncounterDays?: number;
  };
  /**
   * Lab reference ranges keyed by LOINC code (D-13).
   * Config ranges override Observation.referenceRange from FHIR data (D-10).
   */
  referenceRanges?: Record<string, {
    low?: number;
    high?: number;
    unit?: string;
  }>;
}
