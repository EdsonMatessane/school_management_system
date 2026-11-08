import { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  CircleCheck,
  Pencil,
  Power,
  Trash2,
} from 'lucide-react';
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
import Money from '../../../components/Money';
import {
  deleteSuspensionFee,
  getSuspensionSettings,
  setSuspensionFeeActive,
  updateSuspensionFee,
} from '../../../services/api';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'SUSPENSIONS', title: 'Estados' }];

const pages = {
  definition: { title: 'Definição', icon: BadgeDollarSign },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

export default function SuspensionSettingsManagement({ mode }) {
  const [settings, setSettings] = useState({ fee: 0, feeActive: false });
  const [feeInput, setFeeInput] = useState('');
  const [editingFee, setEditingFee] = useState(false);
  const [deletingFee, setDeletingFee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const page = pages[mode] ?? pages.definition;
  const Icon = page.icon;
  const fee = Number(settings.fee || 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSettings(await getSuspensionSettings());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveFee = async (event) => {
    event.preventDefault();
    const amount = Number(feeInput);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
      setError('Indique uma taxa superior a zero, com no máximo duas casas decimais.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(await updateSuspensionFee(amount));
      setEditingFee(false);
      setFeeInput('');
      setNotice('Definição guardada.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFee = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(await deleteSuspensionFee());
      setDeletingFee(false);
      setNotice('Definição apagada.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const toggleFee = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(await setSuspensionFeeActive(!settings.feeActive));
      setNotice(settings.feeActive ? 'Definição desactivada.' : 'Definição activada.');
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {error && !editingFee && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {mode === 'statuses' && (
        <StatusSettingsTable groups={statusGroups} />
      )}

      {mode !== 'statuses' && (
        <section className="cacoin-settings-card">
          <div className="cacoin-settings-section-heading">
            <BadgeDollarSign size={20} />
            <div>
              <h2>Taxa de trancamento</h2>
            </div>
          </div>
          <StandardTable
            ariaLabel="Taxa de trancamento"
            showIndex={false}
            columns={[
              { key: 'label', label: 'Definição' },
              { key: 'amount', label: 'Taxa' },
              { key: 'actions', label: 'Acções', align: 'right' },
            ]}
            emptyMessage="Não existem definições."
            loading={loading}
            rows={[{ id: 'fee', label: 'Taxa de trancamento' }]}
            renderRow={(row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.label}</TableCell>
                <TableCell>
                  {fee > 0 ? <Money value={fee} /> : '—'}
                  {fee > 0 && (
                    <>
                      {' '}
                      <span className={`cacoin-status-badge ${settings.feeActive ? 'paid' : 'pending'}`}>
                        {settings.feeActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <span>
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label="Editar taxa de trancamento"
                        onClick={() => {
                          setFeeInput(fee > 0 ? String(fee) : '');
                          setEditingFee(true);
                          setError('');
                        }}
                        disabled={saving}
                      >
                        <Pencil size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={settings.feeActive ? 'Desactivar' : 'Activar'}>
                    <span>
                      <IconButton
                        className={
                          settings.feeActive
                            ? 'cacoin-table-action-deactivate'
                            : 'cacoin-table-action-activate'
                        }
                        aria-label={`${settings.feeActive ? 'Desactivar' : 'Activar'} taxa de trancamento`}
                        onClick={toggleFee}
                        disabled={saving || fee <= 0}
                      >
                        <Power size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Apagar">
                    <span>
                      <IconButton
                        className="cacoin-table-action-delete"
                        aria-label="Apagar taxa de trancamento"
                        onClick={() => setDeletingFee(true)}
                        disabled={saving || fee <= 0}
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
      )}

      <Dialog
        open={editingFee}
        onClose={() => !saving && setEditingFee(false)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={saveFee}>
          <DialogTitle>Editar taxa de trancamento</DialogTitle>
          <DialogContent>
            <TextField
              required
              autoFocus
              fullWidth
              size="small"
              type="number"
              label="Taxa de trancamento"
              value={feeInput}
              onChange={(event) => setFeeInput(event.target.value)}
              sx={{ mt: 1 }}
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingFee(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={deletingFee}
        onClose={() => !saving && setDeletingFee(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar taxa de trancamento</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar a taxa de trancamento?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingFee(false)} disabled={saving}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteFee} disabled={saving}>
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
