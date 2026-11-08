import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { getAuditRecord, getSchoolProfile } from '../services/api';
import { formatDateTime } from '../utils/date';

const institutionName = () => {
  try {
    return getSchoolProfile().institutionName || '—';
  } catch {
    return '—';
  }
};

const formatAuditDate = (value) => formatDateTime(value);

function AuditSection({ title, rows }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 10px', fontWeight: 700 }}>{title}</h3>
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 16px', margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ fontWeight: 400 }}>{label}:</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AuditDialog({ target, onClose }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!target) return undefined;
    let mounted = true;
    setRecord(null);
    setError('');
    getAuditRecord(target.entity, target.id)
      .then((loaded) => {
        if (mounted) setRecord(loaded);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.response?.data?.message || loadError.message);
      });
    return () => {
      mounted = false;
    };
  }, [target]);

  const institution = institutionName();
  const entry = record?.entry;
  const authorization = record?.authorization;

  return (
    <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 400 }}>Auditoria</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!error && !record && <p>A carregar…</p>}
        {record && (
          <>
            <AuditSection
              title="Entrada de dados"
              rows={[
                ['Instituição', institution],
                ['Data e Hora', formatAuditDate(entry?.at)],
                ['Funcionário', entry?.code ?? '—'],
                ['Nome', entry?.name || '—'],
              ]}
            />
            <div
              aria-hidden="true"
              style={{ margin: '0 0 20px', overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              {'='.repeat(120)}
            </div>
            <AuditSection
              title="Autorização"
              rows={authorization ? [
                ['Instituição', institution],
                ['Data e Hora', formatAuditDate(authorization.at)],
                ['Funcionário', authorization.code ?? '—'],
                ['Nome', authorization.name || '—'],
              ] : [
                ['Instituição', '0 auth'],
                ['Data e Hora', '0 auth'],
                ['Funcionário', '0 auth'],
                ['Nome', '0 auth'],
              ]}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
