import type { ConnectionError } from '../fhir/types';

export function classifyError(err: unknown, serverUrl: string, authMode: string): ConnectionError {
  const errMsg = err instanceof Error ? err.message : String(err);

  // Network errors (fetch failures, DNS, connection refused)
  if (err instanceof TypeError && errMsg.includes('fetch')) {
    return {
      type: 'network',
      message: `Cannot reach FHIR server at ${serverUrl}. Check that the server is running and the URL is correct in settings.yaml.`,
      details: errMsg,
      suggestion: 'Verify the server URL in public/settings.yaml and ensure the FHIR server is running.',
    };
  }

  // HTTP error responses
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403) {
      return {
        type: 'auth',
        message: `Authentication failed for ${serverUrl}. Verify your credentials in settings.yaml. Current auth mode: ${authMode}.`,
        details: `HTTP ${status}`,
        suggestion: 'Check username/password or token in public/settings.yaml.',
      };
    }
    return {
      type: 'invalid_response',
      message: `Unexpected response from ${serverUrl} (HTTP ${status}). Verify this is a FHIR R4 server.`,
      details: `HTTP ${status}: ${errMsg}`,
      suggestion: 'Ensure the URL points to a FHIR R4 server metadata endpoint.',
    };
  }

  return {
    type: 'unknown',
    message: `Connection failed to ${serverUrl}.`,
    details: errMsg,
    suggestion: 'Check the server URL and network connectivity.',
  };
}
