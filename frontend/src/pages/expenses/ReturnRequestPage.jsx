import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, TextField } from '@mui/material';
import { createExpenseRecord, getExpenseRecords } from '../../services/api';
import { formatMoney } from '../../utils/money';
import { formatQuantity } from '../../utils/quantity';
import { richTextToPlain } from '../../utils/richText';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível registar a devolução.'
);
const text = (value) => (value == null || value === '' ? 'N/A' : String(value));
const money = (value) => (value == null ? 'N/A' : formatMoney(value));

/** Devolução: só o artigo e o motivo; os restantes campos vêm dos detalhes da compra. */
export default function ReturnRequestPage() {
  const [purchases, setPurchases] = useState([]);
  const [purchase, setPurchase] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getExpenseRecords('purchases')
      .then(setPurchases)
      .catch((loadError) => setError(errorMessage(loadError)))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!purchase) {
      setError('Seleccione o artigo por devolver.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await createExpenseRecord('returns', { purchaseId: purchase.id, reason });
      setNotice('Devolução registada como pendente.');
      setPurchase(null);
      setReason('');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const details = purchase ? [
    ['Nome do artigo', text(purchase.itemName)],
    ['Quantidade', formatQuantity(purchase.quantity, purchase.quantityUnit)],
    ['Loja', text(purchase.store)],
    ['Endereço', text(purchase.address)],
    ['Preço por unidade', money(purchase.unitPrice)],
    ['Preço Total', money(purchase.totalPrice)],
  ] : [
    ['Nome do artigo', ''],
    ['Quantidade', ''],
    ['Loja', ''],
    ['Endereço', ''],
    ['Preço por unidade', ''],
    ['Preço Total', ''],
  ];

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Despesas</p>
          <h1>Devolução</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <form className="cacoin-test-registration-form" onSubmit={submit}>
        <Autocomplete
          options={purchases}
          value={purchase}
          loading={loading}
          onChange={(_, selected) => setPurchase(selected)}
          getOptionLabel={(option) => `${text(option.itemName)} — ${text(option.store)}`}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          noOptionsText="Sem compras registadas"
          sx={{ gridColumn: '1 / -1' }}
          renderInput={(params) => (
            <TextField {...params} label="Artigo por devolver" size="small" />
          )}
        />
        {details.map(([label, value]) => (
          <TextField key={label} size="small" label={label} value={value} disabled />
        ))}
        <TextField
          size="small"
          label="Especificação"
          value={purchase ? (richTextToPlain(purchase.specification) || 'N/A') : ''}
          disabled
          multiline
          minRows={2}
          sx={{ gridColumn: '1 / -1' }}
        />
        <TextField
          size="small"
          label="Motivo"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          multiline
          minRows={2}
          sx={{ gridColumn: '1 / -1' }}
        />
        <div className="cacoin-test-registration-actions">
          <Button type="submit" variant="contained" disabled={saving || loading}>
            {saving ? 'A guardar…' : 'Registar'}
          </Button>
        </div>
      </form>
    </section>
  );
}
