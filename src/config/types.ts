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
     * External FHIR validator cascade (e.g. a HAPI or Firely instance).
     * When `enabled` + `url` are set, the Validation tab runs a 3-tier
     * cascade: external → server $validate → local structural checker.
     * Every external fetch is PHI-gated (see src/quality/phiGate.ts)
     * and AbortController-wrapped with `timeoutMs` (default 15000).
     *
     * Phase 31 UX-01 (D-07 + D-18).
     */
    externalValidator?: {
      url: string;
      enabled: boolean;
      timeoutMs?: number;
      /** Optional override for the variant suffix in the Active-strategy status line (D-18). Blank → URL-pattern heuristic. */
      label?: string;
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
