import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import StatusBadge from '../../components/StatusBadge';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';

export const teacherSeenKey = 'cacoin.teacher.seenNotifications';
export const teacherSeenEvent = 'teacher-notifications-seen';

export const readTeacherSeen = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(teacherSeenKey) ?? '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
};

export const saveTeacherSeen = (seen) => {
  try {
    window.localStorage.setItem(teacherSeenKey, JSON.stringify([...seen].slice(-600)));
  } catch {
    // o navegador não permite guardar; as notificações voltam a aparecer como novas
  }
  window.dispatchEvent(new Event(teacherSeenEvent));
};

/** Diálogo aberto pelo sino do topo; abrir marca as notificações como lidas. */
export default function TeacherNotificationDialog({ open, onClose, load }) {
  const [state, setState] = useState({ loading: false, items: [], fresh: new Set(), error: '' });

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    load()
      .then((result) => {
        if (!active) return;
        const items = result?.items ?? [];
        const seen = readTeacherSeen();
        const fresh = new Set(items.filter((item) => !seen.has(item.id)).map((item) => item.id));
        setState({ loading: false, items, fresh, error: '' });
        saveTeacherSeen(new Set([...seen, ...items.map((item) => item.id)]));
      })
      .catch(() => {
        if (active) {
          setState({
            loading: false,
            items: [],
            fresh: new Set(),
            error: 'Não foi possível carregar as notificações.',
          });
        }
      });
    return () => { active = false; };
    // só recarrega quando o diálogo abre
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Notificações</DialogTitle>
      <DialogContent dividers>
        {state.loading && !state.items.length && <p>A carregar…</p>}
        {state.error && <p>{state.error}</p>}
        {!state.loading && !state.error && state.items.length === 0 && (
          <p>Ainda não existem notificações.</p>
        )}
        {state.items.length > 0 && (
          <List disablePadding>
            {state.items.map((item) => (
              <ListItem key={item.id} divider alignItems="flex-start" disableGutters>
                <ListItemText
                  primary={(
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <strong>{displayText(item.title)}</strong>
                      {state.fresh.has(item.id) && <StatusBadge label="Nova" tone={item.tone} />}
                    </span>
                  )}
                  secondary={(
                    <>
                      {item.message && <span style={{ display: 'block' }}>{displayText(item.message)}</span>}
                      <span style={{ display: 'block' }}>{toDisplayDate(item.date)}</span>
                    </>
                  )}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
