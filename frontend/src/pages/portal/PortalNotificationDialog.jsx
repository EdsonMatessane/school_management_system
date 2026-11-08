import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import StatusBadge from '../../components/StatusBadge';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';

/**
 * Diálogo aberto pelo sino do topo do portal (e da consulta de estudante).
 * `load` devolve { items }; `seen` e `onRead` só são usados no portal, onde abrir o diálogo
 * marca as notificações como lidas. Na consulta (só leitura) não são passados.
 */
export default function PortalNotificationDialog({ open, onClose, load, seen, onRead, onViewAll }) {
  const [state, setState] = useState({ loading: false, items: [], fresh: new Set(), error: '' });

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    load()
      .then((result) => {
        if (!active) return;
        const items = result?.items ?? [];
        const fresh = new Set(seen ? items.filter((item) => !seen.has(item.id)).map((item) => item.id) : []);
        setState({ loading: false, items, fresh, error: '' });
        if (onRead) onRead(items.map((item) => item.id));
      })
      .catch(() => {
        if (active) setState({ loading: false, items: [], fresh: new Set(), error: 'Não foi possível carregar as notificações.' });
      });
    return () => { active = false; };
    // só recarrega quando o diálogo abre
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" disablePortal scroll="paper">
      <DialogTitle>Notificações</DialogTitle>
      <DialogContent dividers>
        {state.loading && !state.items.length && <p className="portal-loading">A carregar…</p>}
        {state.error && <p className="portal-error">{state.error}</p>}
        {!state.loading && !state.error && state.items.length === 0 && (
          <p className="portal-empty">Ainda não existem notificações.</p>
        )}
        {state.items.length > 0 && (
          <ul className="portal-notification-list">
            {state.items.map((item) => (
              <li key={item.id} className="portal-notification-item">
                <div className="portal-notification-head">
                  <strong>{displayText(item.title)}</strong>
                  {state.fresh.has(item.id) && <StatusBadge label="Nova" tone={item.tone} />}
                </div>
                {item.message && <p>{displayText(item.message)}</p>}
                <time>{toDisplayDate(item.date)}</time>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
      <DialogActions>
        {onViewAll && (
          <Button onClick={() => { onClose(); onViewAll(); }}>Ver todas</Button>
        )}
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
