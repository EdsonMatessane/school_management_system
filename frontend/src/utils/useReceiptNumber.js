import { useEffect, useState } from 'react';
import { getReceiptNumber } from '../services/api';

/** Número sequencial do recibo (sem saltos), atribuído pelo servidor. */
export default function useReceiptNumber(kind, id) {
  const [state, setState] = useState({ key: '', number: '' });
  const key = id ? `${kind}-${id}` : '';

  useEffect(() => {
    if (!key) return undefined;
    let mounted = true;
    getReceiptNumber(kind, id)
      .then((number) => {
        if (mounted) setState({ key, number });
      })
      .catch(() => {
        if (mounted) setState({ key, number: '—' });
      });
    return () => {
      mounted = false;
    };
  }, [kind, id, key]);

  return state.key === key ? state.number : '…';
}
