import { useContext } from 'react';
import { TerminologyContext } from '../contexts/TerminologyContext';
import type { TerminologyResolver } from '../terminology/TerminologyResolver';

/**
 * Returns the shared {@link TerminologyResolver} provided by the nearest
 * {@link TerminologyProvider}. Throws a developer-friendly error when
 * used outside a provider so missing wiring surfaces loudly in dev.
 */
export function useTerminology(): TerminologyResolver {
  const resolver = useContext(TerminologyContext);
  if (!resolver) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }
  return resolver;
}
