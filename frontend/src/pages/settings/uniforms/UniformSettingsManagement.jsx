import { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  CircleCheck,
  Package,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  Autocomplete,
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
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import StandardTable from '../../../components/StandardTable';
import Money from '../../../components/Money';
import {
  createUniformStockEntry,
  deleteUniformFee,
  getUniformSettings,
  getUniformStock,
  setUniformFeeActive,
  updateUniformFee,
} from '../../../services/api';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'UNIFORMS', title: 'Estados' }];

const pages = {
  definition: { title: 'Definição', icon: BadgeDollarSign },
  stock: { title: 'Stock', icon: Package },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const emptyStock = { total: 0, sizes: [], standardSizes: [] };
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

export default function UniformSettingsManagement({ mode }) {
  const [settings, setSettings] = useState({ fee: 0, feeActive: false });
  const [stock, setStock] = useState(emptyStock);
  const [feeInput, setFeeInput] = useState('');
  const [editingFee, setEditingFee] = useState(false);
  const [deletingFee, setDeletingFee] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entry, setEntry] = useState({ quantity: '', size: null });
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
      const [loadedSettings, loadedStock] = await Promise.all([
        getUniformSettings(),
        getUniformStock(),
      ]);
      setSettings(loadedSettings);
      setStock(loadedStock);
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
      setSettings(await updateUniformFee(amount));
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
      setSettings(await deleteUniformFee());
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
      setSettings(await setUniformFeeActive(!settings.feeActive));
      setNotice(settings.feeActive ? 'Definição desactivada.' : 'Definição activada.');
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    const quantity = Number(entry.quantity);
    if (!entry.size || !Number.isInteger(quantity) || quantity <= 0) {
      setError('Indique a quantidade (número inteiro superior a zero) e o tamanho.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setStock(await createUniformStockEntry({ size: entry.size, quantity }));
      setEntry({ quantity: '', size: null });
      setEntryOpen(false);
      setNotice('Entrada de stock registada.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const availableSizes = stock.sizes.filter((item) => item.quantity > 0);

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {error && !editingFee && !entryOpen && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {mode === 'statuses' && (
        <StatusSettingsTable groups={statusGroups} />
      )}

      {mode === 'stock' && (
        <>
          <section className="cacoin-settings-card">
            <div className="cacoin-status-table-heading">
              <div className="cacoin-settings-section-heading">
                <Package size={20} />
                <div>
                  <h2>Uniformes disponíveis: {loading ? '—' : stock.total}</h2>
                </div>
              </div>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={16} />}
                disabled={loading || saving}
                onClick={() => {
                  setError('');
                  setEntryOpen(true);
                }}
              >
                Registar entrada
              </Button>
            </div>
            <StandardTable
              ariaLabel="Tamanhos disponíveis"
              columns={[
                { key: 'size', label: 'Tamanho' },
                { key: 'quantity', label: 'Quantidade' },
              ]}
              emptyMessage="Ainda não existem uniformes em stock."
              loading={loading}
              rows={availableSizes}
              renderRow={(item, rowNumber) => (
                <TableRow key={item.size} hover>
                  <TableCell>{rowNumber}</TableCell>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                </TableRow>
              )}
            />
          </section>
          <SettingsFormDialog
            open={entryOpen}
            title="Registar entrada de stock"
            onClose={() => setEntryOpen(false)}
            onSubmit={saveEntry}
            saving={saving}
            error={error}
            submitLabel="Registar entrada"
            maxWidth="xs"
          >
            <div className="cacoin-settings-grid">
              <TextField
                required
                fullWidth
                size="small"
                type="number"
                label="Quantidade"
                value={entry.quantity}
                onChange={(event) => setEntry((current) => ({
                  ...current,
                  quantity: event.target.value,
                }))}
                disabled={saving}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
              <Autocomplete
                options={stock.standardSizes}
                value={entry.size}
                onChange={(_, value) => setEntry((current) => ({ ...current, size: value }))}
                disabled={saving}
                renderInput={(params) => (
                  <TextField {...params} required label="Tamanho" size="small" />
                )}
              />
            </div>
          </SettingsFormDialog>
        </>
      )}

      {mode !== 'stock' && mode !== 'statuses' && (
        <section className="cacoin-settings-card">
          <div className="cacoin-settings-section-heading">
            <BadgeDollarSign size={20} />
            <div>
              <h2>Taxa de uniforme</h2>
            </div>
          </div>
          <StandardTable
            ariaLabel="Taxa de uniforme"
            showIndex={false}
            columns={[
              { key: 'label', label: 'Definição' },
              { key: 'amount', label: 'Taxa' },
              { key: 'actions', label: 'Acções', align: 'right' },
            ]}
            emptyMessage="Não existem definições."
            loading={loading}
            rows={[{ id: 'fee', label: 'Taxa de uniforme' }]}
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
                        aria-label="Editar taxa de uniforme"
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
                        aria-label={`${settings.feeActive ? 'Desactivar' : 'Activar'} taxa de uniforme`}
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
                        aria-label="Apagar taxa de uniforme"
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
          <DialogTitle>Editar taxa de uniforme</DialogTitle>
          <DialogContent>
            <TextField
              required
              autoFocus
              fullWidth
              size="small"
              type="number"
              label="Taxa de uniforme"
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
        <DialogTitle>Apagar taxa de uniforme</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar a taxa de uniforme?
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
