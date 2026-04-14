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
