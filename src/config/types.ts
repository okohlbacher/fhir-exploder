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
}
