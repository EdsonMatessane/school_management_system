import { useCallback } from 'react';
import { usePortalData } from '../portal/portalUtils';

// Igual a usePortalData, mas para o estudante identificado por `code` (modo de consulta).
export const useLookupData = (fetcher, code) => {
  const loader = useCallback(() => fetcher(code), [fetcher, code]);
  return usePortalData(loader);
};
