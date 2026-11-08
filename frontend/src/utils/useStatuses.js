import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSystemStatuses } from '../services/api';

/** Estados guardados em tabela para um módulo (rótulo, cor e situação editáveis em Configurações). */
export default function useStatuses(module) {
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStatuses(await getSystemStatuses([module]));
    } catch (loadError) {
      setError(
        loadError.response?.data?.message
          || loadError.message
          || 'Não foi possível carregar os estados.',
      );
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    reload();
  }, [reload]);

  return useMemo(() => {
    const byCode = Object.fromEntries(statuses.map((status) => [status.code, status]));
    return {
      statuses,
      activeStatuses: statuses.filter((status) => status.active),
      loading,
      error,
      reload,
      labelOf: (code) => byCode[code]?.label ?? code ?? '',
      toneOf: (code) => byCode[code]?.tone ?? 'neutral',
    };
  }, [statuses, loading, error, reload]);
}
