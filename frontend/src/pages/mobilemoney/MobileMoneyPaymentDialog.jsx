import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { CheckCircle, CircleAlert, Smartphone } from 'lucide-react';
import {
  createMobileMoneyPayment,
  getMobileMoneyBanks,
  getMobileMoneyWallets,
  refreshMobileMoneyTransaction,
} from '../../services/api';
import { formatMoney } from '../../utils/money';
import { errorMessage } from '../users/userUtils';
import { formatNib } from './mobileMoneyUtils';

const digitsOnly = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return (digits.startsWith('258') && digits.length > 9 ? digits.slice(3) : digits).slice(0, 9);
};

const walletOptions = [
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'EMOLA', label: 'e-Mola' },
  { value: 'MKESH', label: 'mKesh' },
];

export default function MobileMoneyPaymentDialog({ target, onClose, onDone }) {
  const open = Boolean(target);
  const [step, setStep] = useState('form');
  const [wallet, setWallet] = useState('');
  const [phone, setPhone] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [banks, setBanks] = useState([]);
  const [tab, setTab] = useState(0);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const finished = useRef(false);

  useEffect(() => {
    if (!target) return;
    setStep('form');
    setWallet('');
    setPhone(digitsOnly(target.student.phone));
    setTransaction(null);
    setError('');
    finished.current = false;
    setTab(0);
    getMobileMoneyBanks().then(setBanks).catch(() => setBanks([]));
    setLoadingWallets(true);
    getMobileMoneyWallets()
      .then(setWallets)
      .catch((walletError) => setError(errorMessage(walletError)))
      .finally(() => setLoadingWallets(false));
  }, [target]);

  useEffect(() => {
    if (step !== 'waiting' || !transaction) return undefined;
    const interval = setInterval(async () => {
      try {
        const current = await refreshMobileMoneyTransaction(transaction.id);
        if (current.status === 'PENDING') return;
        setTransaction(current);
        setStep(current.status === 'SUCCESS' ? 'success' : 'failed');
        if (!finished.current) {
          finished.current = true;
          onDone();
        }
      } catch (pollError) {
        setError(errorMessage(pollError));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, transaction, onDone]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createMobileMoneyPayment({
        studentId: target.student.studentId,
        kind: target.kind,
        itemId: target.item.itemId,
        wallet,
        phone,
      });
      setTransaction(created);
      if (created.status === 'FAILED') {
        setStep('failed');
        onDone();
      } else {
        setStep('waiting');
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const walletLabel = walletOptions.find((item) => item.value === wallet)?.label ?? '';
  const missing = walletOptions.filter((item) => !wallets.some((entry) => entry.wallet === item.value));
  const destination = wallets.find((item) => item.wallet === wallet);

  return (
    <Dialog open={open} onClose={step === 'form' && saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Pagar — {target?.item.description}</DialogTitle>
      {step === 'form' && (
        <>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth">
            <Tab label="Carteira móvel" />
            <Tab label="Banco" />
          </Tabs>
          {tab === 1 && (
            <>
              <DialogContent>
                <p style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 650 }}>
                  {formatMoney(target?.item.amount)}
                </p>
                {banks.length === 0 && (
                  <Alert severity="warning">
                    Defina as contas em Configurações &gt; Mobile Money &gt; Bancos.
                  </Alert>
                )}
                {banks.map((bank) => (
                  <div
                    key={bank.id}
                    style={{ padding: '12px 0', borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}
                  >
                    <div style={{ fontWeight: 650 }}>{bank.bankName}</div>
                    <div>NIB: {formatNib(bank.nib)}</div>
                    <div>Titular: {bank.holder}</div>
                  </div>
                ))}
              </DialogContent>
              <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
              </DialogActions>
            </>
          )}
          {tab === 0 && (
        <form onSubmit={submit}>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <p style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 650 }}>
              {formatMoney(target?.item.amount)}
            </p>
            {!loadingWallets && missing.length > 0 && !error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Carteira não activa: {missing.map((item) => item.label).join(', ')}. Active em
                Configurações &gt; Mobile Money &gt; Carteiras.
              </Alert>
            )}
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={wallet}
              onChange={(_, value) => value && setWallet(value)}
              aria-label="Tipo de carteira"
              sx={{ mb: 2 }}
            >
              {walletOptions.map((item) => (
                <ToggleButton
                  key={item.value}
                  value={item.value}
                  disabled={!wallets.some((entry) => entry.wallet === item.value)}
                >
                  {item.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <TextField
              required
              fullWidth
              size="small"
              label="Número da carteira"
              value={phone}
              onChange={(event) => setPhone(digitsOnly(event.target.value))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 9 } }}
              disabled={!wallet || saving}
            />
            {destination && (
              <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.8 }}>
                Carteira da instituição: {destination.label} · {destination.accountNumber}
                {destination.accountName ? ` · ${destination.accountName}` : ''}
              </p>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!wallet || phone.length !== 9 || saving}
            >
              {saving ? 'A enviar…' : 'Pagar'}
            </Button>
          </DialogActions>
        </form>
          )}
        </>
      )}
      {step === 'waiting' && (
        <>
          <DialogContent sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress size={44} />
            <p style={{ margin: '18px 0 4px', fontWeight: 600 }}>
              <Smartphone size={16} style={{ verticalAlign: -3 }} /> {walletLabel} · {phone}
            </p>
            <p style={{ margin: 0 }}>A aguardar o PIN do estudante…</p>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Fechar</Button>
          </DialogActions>
        </>
      )}
      {step === 'success' && (
        <>
          <DialogContent sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircle size={44} color="#27ae60" />
            <p style={{ margin: '14px 0 4px', fontSize: 18, fontWeight: 650 }}>Pagamento efectuado</p>
            <p style={{ margin: 0 }}>{transaction?.reference} · {formatMoney(transaction?.amount)}</p>
            {transaction && !transaction.recorded && (
              <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                {transaction.failureReason}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={onClose}>Fechar</Button>
          </DialogActions>
        </>
      )}
      {step === 'failed' && (
        <>
          <DialogContent sx={{ textAlign: 'center', py: 3 }}>
            <CircleAlert size={44} color="#c0392b" />
            <p style={{ margin: '14px 0 4px', fontSize: 18, fontWeight: 650 }}>Pagamento falhado</p>
            <p style={{ margin: 0 }}>{transaction?.failureReason ?? '—'}</p>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Fechar</Button>
            <Button variant="contained" onClick={() => { setStep('form'); setTransaction(null); finished.current = false; }}>
              Tentar novamente
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
