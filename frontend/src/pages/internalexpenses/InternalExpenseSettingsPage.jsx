import { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, TextField as MuiTextField } from '@mui/material';
import { Save } from 'lucide-react';
import { getExpenseSettings, saveExpenseSettings } from './internal-expenses-api';

function TextField(props) {
  return <MuiTextField {...props} size="small" />;
}

const errorText = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

const optionText = (options = []) =>
  options.map(({ code, label }) => `${code}=${label}`).join('\n');

function parseOptions(value) {
  return value.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const separator = line.indexOf('=');
    if (separator < 1) return null;
    return {
      code: line.slice(0, separator).trim().toUpperCase(),
      label: line.slice(separator + 1).trim(),
    };
  });
}

const emptyForm = {
  defaultCurrency: 'MZN',
  budgetAlertPercent: '80',
  currencies: '',
  expenseTypes: '',
  priorities: '',
  paymentMethods: '',
};

export default function InternalExpenseSettingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getExpenseSettings()
      .then((settings) => {
        if (!active) return;
        setForm({
          defaultCurrency: settings.defaultCurrency,
          budgetAlertPercent: String(settings.budgetAlertPercent),
          currencies: optionText(settings.currencies),
          expenseTypes: optionText(settings.expenseTypes),
          priorities: optionText(settings.priorities),
          paymentMethods: optionText(settings.paymentMethods),
        });
      })
      .catch((loadError) => {
        if (active) setError(errorText(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const set = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const settings = {
        defaultCurrency: form.defaultCurrency,
        budgetAlertPercent: Number(form.budgetAlertPercent),
        currencies: parseOptions(form.currencies),
        expenseTypes: parseOptions(form.expenseTypes),
        priorities: parseOptions(form.priorities),
        paymentMethods: parseOptions(form.paymentMethods),
      };
      await saveExpenseSettings(settings);
      setNotice('As configurações das Despesas Internas foram guardadas.');
    } catch (saveError) {
      setError(errorText(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-tasks-page internal-expenses-page">
      <header className="cacoin-page-heading">
        <div><p className="cacoin-eyebrow">Despesas Internas</p><h1>Configurações</h1></div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      <form className="internal-expense-settings-form" onSubmit={save}>
        <section className="internal-expense-settings-section">
          <h2>Valores e alertas</h2>
          <div className="internal-expense-settings-grid">
            <TextField select label="Moeda padrão" value={form.defaultCurrency} onChange={set('defaultCurrency')} required disabled={loading}>
              {parseOptions(form.currencies).filter(Boolean).map(({ code, label }) => (
                <MenuItem key={code} value={code}>{code} — {label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Alerta de orçamento (%)"
              type="number"
              value={form.budgetAlertPercent}
              onChange={set('budgetAlertPercent')}
              required
              disabled={loading}
              inputProps={{ min: 1, max: 100, step: 1 }}
            />
          </div>
        </section>
        <section className="internal-expense-settings-section">
          <h2>Opções dos formulários</h2>
          <div className="internal-expense-settings-grid">
            <TextField label="Moedas disponíveis" value={form.currencies} onChange={set('currencies')} multiline minRows={4} required disabled={loading} />
            <TextField label="Tipos de despesa" value={form.expenseTypes} onChange={set('expenseTypes')} multiline minRows={4} required disabled={loading} />
            <TextField label="Prioridades" value={form.priorities} onChange={set('priorities')} multiline minRows={4} required disabled={loading} />
            <TextField label="Métodos de pagamento" value={form.paymentMethods} onChange={set('paymentMethods')} multiline minRows={4} required disabled={loading} />
          </div>
        </section>
        <div className="internal-expense-settings-actions">
          <Button type="submit" variant="contained" startIcon={<Save size={17} />} disabled={loading || saving}>
            {saving ? 'A guardar…' : 'Guardar configurações'}
          </Button>
        </div>
      </form>
    </section>
  );
}
