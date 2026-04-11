import type { CapabilityStatement } from '@medplum/fhirtypes';
import type { MedplumClient } from '@medplum/core';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'connected'; client: MedplumClient; capability: CapabilityStatement }
  | { status: 'error'; error: ConnectionError };

export interface ConnectionError {
  type: 'network' | 'auth' | 'invalid_response' | 'unknown';
  message: string;
  details?: string;
  suggestion: string;
}
