import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { Plus } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import {
  createPortalRequest,
  getPortalRequestAttachmentUrl,
  getPortalRequests,
  getPortalRequestTypes,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import PortalTable from './PortalTable';
import { errorMessage, usePortalData } from './portalUtils';

const loadPortalRequestData = async () => {
  const [requests, types] = await Promise.all([getPortalRequests(), getPortalRequestTypes()]);
  return { ...requests, types };
};

export default function PortalRequests() {
  const { data, loading, error, reload } = usePortalData(loadPortalRequestData);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  if (loading && !data) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const close = () => {
    if (saving) return;
    setOpen(false);
    setFormError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!type) {
      setFormError('Seleccione o tipo de pedido.');
      return;
    }
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify({ typeId: type, description })], {
      type: 'application/json',
    }));
    files.forEach((file) => formData.append('files', file));
    setSaving(true);
    setFormError('');
    try {
      const created = await createPortalRequest(formData);
      setNotice(`Pedido ${created.requestNumber} registado.`);
      setType('');
      setDescription('');
      setFiles([]);
      setFormKey((current) => current + 1);
      setOpen(false);
      await reload();
    } catch (saveError) {
      setFormError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="portal-heading portal-heading-row">
        <h1>Pedidos</h1>
        <Button
          variant="contained"
          startIcon={<Plus size={16} aria-hidden="true" />}
          onClick={() => { setNotice(''); setOpen(true); }}
        >
          Novo pedido
        </Button>
      </div>

      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

      <section className="portal-card">
        <PortalTable
          columns={['N.º de Pedido', 'Tipo', 'Descrição', 'Anexos', 'Data', 'Estado', 'Notas']}
          rows={data.items}
          empty="Ainda não fez nenhum pedido."
          renderRow={(row) => (
            <tr key={row.id}>
              <td>{row.requestNumber}</td>
              <td>{displayText(row.typeName)}</td>
              <td>{displayText(row.description)}</td>
              <td>
                {row.attachments.length ? row.attachments.map((item) => (
                  <div key={item.id}>
                    <a href={getPortalRequestAttachmentUrl(item.id)} target="_blank" rel="noreferrer">
                      {item.fileName}
                    </a>
                  </div>
                )) : '—'}
              </td>
              <td>{toDisplayDate(row.requestDate)}</td>
              <td><StatusBadge label={row.statusLabel} tone={row.statusTone} /></td>
              <td>{displayText(row.notes)}</td>
            </tr>
          )}
        />
      </section>

      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <form onSubmit={submit}>
          <DialogTitle>Novo pedido</DialogTitle>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            {!data.types.length && (
              <Alert severity="warning" sx={{ mb: 2 }}>Não existem tipos de pedido disponíveis.</Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                required
                select
                fullWidth
                size="small"
                label="Tipo de pedido"
                value={type}
                onChange={(event) => setType(event.target.value)}
                disabled={saving}
              >
                {data.types.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{displayText(item.name)}</MenuItem>
                ))}
              </TextField>
              <TextField
                required
                multiline
                fullWidth
                minRows={3}
                size="small"
                label="Descrição"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={saving}
              />
              <TextField
                key={`files-${formKey}`}
                fullWidth
                size="small"
                type="file"
                label="Anexos"
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                disabled={saving}
                slotProps={{
                  htmlInput: { accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png', multiple: true },
                  inputLabel: { shrink: true },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={close} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving || !data.types.length}>
              {saving ? 'A enviar…' : 'Enviar pedido'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
