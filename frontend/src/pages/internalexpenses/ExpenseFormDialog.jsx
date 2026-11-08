import { systemDate } from '../../utils/systemDate';
import { useEffect, useState } from 'react';
import { getExpenseRequesters } from './internal-expenses-api';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField as MuiTextField,
} from '@mui/material';
import DateField from '../../components/DateField';

function TextField(props) {
  return <MuiTextField {...props} size="small" />;
}

const blank = {
  title: '',
  description: '',
  type: 'OPERATIONAL',
  expenseDate: systemDate().toISOString().slice(0, 10),
  dueDate: '',
  currency: 'MZN',
  baseAmount: '',
  discountAmount: '0',
  taxAmount: '0',
  otherCharges: '0',
  priority: 'NORMAL',
  requesterId: '',
  department: '',
  costCenter: '',
  categoryId: '',
  supplierId: '',
  externalDocumentNumber: '',
  notes: '',
};

export default function ExpenseFormDialog({
  open,
  expense,
  categories,
  suppliers,
  settings,
  saving,
  error,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(blank);
  const [requesters, setRequesters] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    getExpenseRequesters()
      .then((result) => { if (!cancelled) setRequesters(result); })
      .catch(() => { if (!cancelled) setRequesters([]); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm(
      expense
        ? {
            ...blank,
            ...expense,
            expenseDate: expense.expenseDate || blank.expenseDate,
            dueDate: expense.dueDate || '',
            categoryId: String(expense.categoryId || ''),
            supplierId: expense.supplierId ? String(expense.supplierId) : '',
            requesterId: expense.requesterId ? String(expense.requesterId) : '',
          }
        : {
            ...blank,
            currency: settings?.defaultCurrency || blank.currency,
            type: settings?.expenseTypes?.[0]?.code || blank.type,
            priority: settings?.priorities?.[0]?.code || blank.priority,
          },
    );
  }, [expense, open, settings]);

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const values = { ...form };
    delete values.requesterName;
    onSave({
      ...values,
      requesterId: Number(form.requesterId),
      categoryId: Number(form.categoryId),
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      dueDate: form.dueDate || null,
      baseAmount: Number(form.baseAmount),
      discountAmount: Number(form.discountAmount || 0),
      taxAmount: Number(form.taxAmount || 0),
      otherCharges: Number(form.otherCharges || 0),
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={submit}>
        <DialogTitle>{expense ? 'Editar despesa' : 'Registar despesa'}</DialogTitle>
        <DialogContent className="internal-expense-form-grid">
          {error && <Alert severity="error" className="internal-expense-form-wide">{error}</Alert>}
          <TextField label="Título" value={form.title} onChange={set('title')} required inputProps={{ maxLength: 180 }} />
          <TextField select label="Tipo" value={form.type} onChange={set('type')} required>
            {(settings?.expenseTypes || []).map((option) => (
              <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            className="internal-expense-form-wide"
            label="Descrição / justificação"
            value={form.description}
            onChange={set('description')}
            required
            multiline
            minRows={2}
          />
          <DateField label="Data da despesa" value={form.expenseDate} onChange={set('expenseDate')} required InputLabelProps={{ shrink: true }} />
          <DateField label="Data de vencimento" value={form.dueDate} onChange={set('dueDate')} InputLabelProps={{ shrink: true }} />
          <TextField label="Valor base" type="number" value={form.baseAmount} onChange={set('baseAmount')} required inputProps={{ min: '0.01', step: '0.01' }} />
          <TextField select label="Moeda" value={form.currency} onChange={set('currency')} required>
            {(settings?.currencies || []).map((option) => (
              <MenuItem key={option.code} value={option.code}>{option.code} — {option.label}</MenuItem>
            ))}
          </TextField>
          <TextField label="Desconto" type="number" value={form.discountAmount} onChange={set('discountAmount')} inputProps={{ min: '0', step: '0.01' }} />
          <TextField label="Impostos" type="number" value={form.taxAmount} onChange={set('taxAmount')} inputProps={{ min: '0', step: '0.01' }} />
          <TextField label="Outros encargos" type="number" value={form.otherCharges} onChange={set('otherCharges')} inputProps={{ min: '0', step: '0.01' }} />
          <TextField select label="Prioridade" value={form.priority} onChange={set('priority')} required>
            {(settings?.priorities || []).map((option) => (
              <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Solicitante" value={form.requesterId} onChange={set('requesterId')} required>
            {(expense?.requesterId && !requesters.some((person) => person.id === expense.requesterId)
              ? [...requesters, { id: expense.requesterId, name: expense.requesterName || `#${expense.requesterId}` }]
              : requesters
            ).map((person) => (
              <MenuItem key={person.id} value={String(person.id)}>{person.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Departamento" value={form.department} onChange={set('department')} required />
          <TextField label="Centro de custo" value={form.costCenter} onChange={set('costCenter')} />
          <TextField select label="Categoria" value={form.categoryId} onChange={set('categoryId')} required>
            {categories.filter((category) => category.active).map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Fornecedor / beneficiário" value={form.supplierId} onChange={set('supplierId')}>
            <MenuItem value="">Sem fornecedor</MenuItem>
            {suppliers.filter((supplier) => supplier.active).map((supplier) => (
              <MenuItem key={supplier.id} value={String(supplier.id)}>{supplier.legalName}</MenuItem>
            ))}
          </TextField>
          <TextField label="N.º do documento externo" value={form.externalDocumentNumber} onChange={set('externalDocumentNumber')} />
          <TextField className="internal-expense-form-wide" label="Observações internas" value={form.notes} onChange={set('notes')} multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'A guardar…' : 'Guardar rascunho'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
