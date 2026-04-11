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
}
