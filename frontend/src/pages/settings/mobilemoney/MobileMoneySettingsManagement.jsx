import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
} from '@mui/material';
import { CircleCheck, Landmark, Plus, Wallet } from 'lucide-react';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';
import {
  createMobileMoneyBankAccount,
  deleteMobileMoneyBankAccount,
  getMobileMoneyBankAccounts,
  getMobileMoneyWalletSettings,
  updateMobileMoneyBankAccount,
  updateMobileMoneyWalletSettings,
} from '../../../services/api';
import { displayText } from '../../../utils/displayText';
import { formatNib } from '../../mobilemoney/mobileMoneyUtils';
import { errorMessage } from '../../users/userUtils';

const pages = {
  wallets: { title: 'Carteiras', icon: Wallet },
  banks: { title: 'Bancos', icon: Landmark },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const emptyBank = { bankName: '', nib: '', holder: '' };
const bankColumns = ['Banco', 'NIB', 'Titular'];
const walletColumns = ['Carteira', 'Número', 'Nome da conta', 'Operador', 'Estado'];
const statusGroups = [{ module: 'MOBILE_MONEY', title: 'Estados dos pagamentos Mobile Money' }];

const operatorStatus = (item) => {
  if (item.wallet !== 'MPESA') return 'Sem ligação';
  const ready = item.apiKeySet && item.publicKeySet && item.serviceProviderCode;
  if (!ready) return 'Por configurar';
  return item.environment === 'production' ? 'Produção' : 'Teste (sandbox)';
};

export default function MobileMoneySettingsManagement({ mode }) {
  const page = pages[mode] ?? pages.wallets;
  const Icon = page.icon;
  const [wallets, setWallets] = useState([]);
  const [banks, setBanks] = useState([]);
  const [bank, setBank] = useState(emptyBank);
  const [editingId, setEditingId] = useState(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [walletEditing, setWalletEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (mode === 'statuses') return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'banks') {
        setBanks(await getMobileMoneyBankAccounts());
      } else {
        setWallets(await getMobileMoneyWalletSettings());
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const change = (wallet, key, value) => setWallets((current) => current.map(
    (item) => (item.wallet === wallet ? { ...item, [key]: value } : item),
  ));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setWallets(await updateMobileMoneyWalletSettings(wallets));
      setWalletEditing(null);
      setNotice('Carteira guardada.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const resetBank = () => {
    setBank(emptyBank);
    setEditingId(null);
    setBankOpen(false);
  };

  const openNewBank = () => {
    setBank(emptyBank);
    setEditingId(null);
    setError('');
    setBankOpen(true);
  };

  const saveBank = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) {
        await updateMobileMoneyBankAccount(editingId, bank);
        setNotice('Conta bancária actualizada.');
      } else {
        await createMobileMoneyBankAccount(bank);
        setNotice('Conta bancária criada.');
      }
      resetBank();
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const removeBank = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deleteMobileMoneyBankAccount(deleting.id);
      setNotice('Conta bancária apagada.');
      setDeleting(null);
      await load();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
      setDeleting(null);
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
        {mode === 'banks' && (
          <div className="cacoin-page-heading-actions">
            <Button
              variant="contained"
              startIcon={<Plus size={17} />}
              onClick={openNewBank}
              sx={{ textTransform: 'none' }}
            >
              Adicionar conta
            </Button>
          </div>
        )}
      </header>
      {mode === 'statuses' ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : mode === 'banks' ? (
        <>
          {error && !bankOpen && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
          <SettingsValuesTable
            audit="MobileMoneyBankAccount"
            ariaLabel="Contas bancárias"
            columns={bankColumns}
            emptyMessage="Ainda não existem contas bancárias."
            loading={loading}
            disabled={saving}
            rows={banks.map((row) => ({
              key: row.id,
              label: row.bankName,
              cells: [displayText(row.bankName), formatNib(row.nib), displayText(row.holder)],
              onEdit: () => {
                setEditingId(row.id);
                setBank({ bankName: row.bankName, nib: row.nib, holder: row.holder });
                setError('');
                setBankOpen(true);
              },
              onDelete: () => setDeleting(row),
            }))}
          />
          <SettingsFormDialog
            open={bankOpen}
            title={editingId ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            onClose={resetBank}
            onSubmit={saveBank}
            saving={saving}
            error={error}
            submitLabel={editingId ? 'Guardar alterações' : 'Adicionar conta'}
            submitDisabled={bank.nib.length !== 21}
          >
            <div className="cacoin-settings-grid">
              <TextField
                required
                fullWidth
                size="small"
                label="Nome do Banco"
                value={bank.bankName}
                onChange={(event) => setBank((current) => ({ ...current, bankName: event.target.value }))}
                disabled={saving}
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                required
                fullWidth
                size="small"
                label="NIB"
                value={bank.nib}
                onChange={(event) => setBank((current) => ({
                  ...current,
                  nib: event.target.value.replace(/\D/g, '').slice(0, 21),
                }))}
                disabled={saving}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 21 } }}
              />
              <TextField
                required
                fullWidth
                size="small"
                label="Titular"
                value={bank.holder}
                onChange={(event) => setBank((current) => ({ ...current, holder: event.target.value }))}
                disabled={saving}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                sx={{ gridColumn: '1 / -1' }}
              />
            </div>
          </SettingsFormDialog>
          <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)}>
            <DialogTitle>Apagar conta bancária</DialogTitle>
            <DialogContent>{deleting?.bankName} — {formatNib(deleting?.nib)}</DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleting(null)} disabled={saving}>Cancelar</Button>
              <Button color="error" variant="contained" onClick={removeBank} disabled={saving}>
                {saving ? 'A apagar…' : 'Apagar'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        <>
          {error && !walletEditing && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
          <SettingsValuesTable
            ariaLabel="Carteiras Mobile Money"
            columns={walletColumns}
            emptyMessage="Ainda não existem carteiras."
            loading={loading}
            disabled={saving}
            rows={wallets.map((item) => ({
              key: item.wallet,
              label: item.label,
              cells: [
                item.label,
                displayText(item.accountNumber),
                displayText(item.accountName),
                operatorStatus(item),
                item.active ? 'Activa' : 'Inactiva',
              ],
              onEdit: () => {
                setError('');
                setWalletEditing(item.wallet);
              },
            }))}
          />
          <SettingsFormDialog
            open={Boolean(walletEditing)}
            title={`Editar ${wallets.find((item) => item.wallet === walletEditing)?.label ?? 'carteira'}`}
            onClose={() => { setWalletEditing(null); load(); }}
            onSubmit={save}
            saving={saving}
            error={error}
          >
            {wallets.filter((item) => item.wallet === walletEditing).map((item) => (
              <div key={item.wallet} className="cacoin-settings-grid">
                <TextField
                  fullWidth
                  size="small"
                  label="Número da carteira"
                  value={item.accountNumber}
                  onChange={(event) => change(
                    item.wallet,
                    'accountNumber',
                    event.target.value.replace(/\D/g, '').slice(0, 9),
                  )}
                  disabled={saving}
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 9 } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Nome da conta"
                  value={item.accountName}
                  onChange={(event) => change(item.wallet, 'accountName', event.target.value)}
                  disabled={saving}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
                {item.wallet === 'MPESA' && (
                  <>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Ambiente"
                      value={item.environment || 'sandbox'}
                      onChange={(event) => change(item.wallet, 'environment', event.target.value)}
                      disabled={saving}
                    >
                      <MenuItem value="sandbox">Teste (sandbox)</MenuItem>
                      <MenuItem value="production">Produção (dinheiro real)</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      size="small"
                      label="Código do negócio (Service Provider Code)"
                      value={item.serviceProviderCode ?? ''}
                      onChange={(event) => change(item.wallet, 'serviceProviderCode', event.target.value)}
                      disabled={saving}
                      slotProps={{ htmlInput: { maxLength: 40 } }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="password"
                      autoComplete="new-password"
                      label="Chave de API"
                      value={item.apiKey ?? ''}
                      onChange={(event) => change(item.wallet, 'apiKey', event.target.value)}
                      disabled={saving}
                      placeholder={item.apiKeySet ? '•••••••• (guardada)' : ''}
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      maxRows={6}
                      size="small"
                      label="Chave pública"
                      value={item.publicKey ?? ''}
                      onChange={(event) => change(item.wallet, 'publicKey', event.target.value)}
                      disabled={saving}
                      placeholder={item.publicKeySet ? '(guardada)' : ''}
                      sx={{ gridColumn: '1 / -1' }}
                    />
                    {item.environment === 'production' && (
                      <Alert severity="warning" sx={{ gridColumn: '1 / -1' }}>
                        Em produção cada pagamento cobra dinheiro real.
                      </Alert>
                    )}
                  </>
                )}
                <FormControlLabel
                  control={(
                    <Switch
                      checked={item.active}
                      onChange={(event) => change(item.wallet, 'active', event.target.checked)}
                      disabled={saving}
                    />
                  )}
                  label="Activa"
                />
              </div>
            ))}
          </SettingsFormDialog>
        </>
      )}
    </section>
  );
}
