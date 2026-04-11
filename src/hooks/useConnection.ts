import { useConnectionContext } from '../contexts/ConnectionContext';

export function useConnection() {
  return useConnectionContext();
}
