import { useCallback, useEffect, useState } from 'react';
import { Pencil, Percent, Settings, Trash2 } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import StandardTable from '../../../components/StandardTable';
import {
  deleteFineSettings,
  getFineSettings,
  updateFineSettings,
} from '../../../services/api';

const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

// Percentagem escrita à mão (aceita vírgula ou ponto): 1.5, 2, 2,25 ...
const parsePercent = (text) => Number(String(text).trim().replace(',', '.'));
const showPercent = (value) => `${Number(value).toLocaleString('pt-MZ', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})}%`;

/** Configurações > Multas > Definição: percentagem da mensalidade cobrada por atraso. */
export default function FineSettingsManagement() {
  const [percent, setPercent] = useState(null);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const configured = percent != null && Number(percent) > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPercent((await getFineSettings()).percent);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (event) => {
    event.preventDefault();
    const value = parsePercent(input);
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      setError('Indique uma percentagem maior que 0 e até 100.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setPercent((await updateFineSettings(value)).percent);
      setEditing(false);
      setInput('');
      setNotice('Definição guardada.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setPercent((await deleteFineSettings()).percent);
      setDeleting(false);
      setNotice('Definição apagada.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Percent size={23} aria-hidden="true" /> Definição</h1>
        </div>
      </header>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      <section className="cacoin-settings-card">
        <div className="cacoin-settings-section-heading">
          <Settings size={20} />
          <div>
            <h2>Multa por atraso da mensalidade</h2>
          </div>
        </div>
        <StandardTable
          ariaLabel="Definição da multa por atraso"
          showIndex={false}
          columns={[
            { key: 'label', label: 'Definição' },
            { key: 'value', label: 'Percentagem' },
            { key: 'actions', label: 'Acções', align: 'right' },
          ]}
          emptyMessage="Não existem definições."
          loading={loading}
          rows={[{ id: 'late' }]}
          renderRow={(row) => (
            <TableRow key={row.id} hover>
              <TableCell>Percentagem da mensalidade cobrada como multa</TableCell>
              <TableCell>{configured ? showPercent(percent) : '—'}</TableCell>
              <TableCell align="right">
                <Tooltip title="Editar">
                  <span>
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label="Editar a percentagem da multa"
                      disabled={saving}
                      onClick={() => {
                        setInput(configured ? String(Number(percent)) : '');
                        setEditing(true);
                        setError('');
                      }}
                    >
                      <Pencil size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Apagar">
                  <span>
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label="Apagar a percentagem da multa"
                      disabled={saving || !configured}
                      onClick={() => setDeleting(true)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          )}
        />
      </section>

      <Dialog open={editing} onClose={() => !saving && setEditing(false)} fullWidth maxWidth="xs">
        <form onSubmit={save}>
          <DialogTitle>Editar definição</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField
              required
              autoFocus
              fullWidth
              size="small"
              label="Percentagem da multa (%)"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={saving}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleting} onClose={() => !saving && setDeleting(false)} fullWidth maxWidth="xs">
        <DialogTitle>Apagar definição</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar a percentagem da multa? Deixa de se cobrar multa nas mensalidades que ainda não a tenham.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(false)} disabled={saving}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={saving}>
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
