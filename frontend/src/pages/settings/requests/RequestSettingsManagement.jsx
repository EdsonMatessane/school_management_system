import { useCallback, useEffect, useState } from 'react';
import { Bell, CircleCheck, ClipboardList } from 'lucide-react';
import { Alert, TextField } from '@mui/material';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';
import FinanceCatalogSection from '../finance/FinanceCatalogSection';
import {
  createStudentRequestType,
  deleteStudentRequestType,
  getStudentRequestSettings,
  getStudentRequestTypes,
  updateStudentRequestSettings,
  updateStudentRequestType,
} from '../../../services/api';

const pages = {
  types: { title: 'Tipos de Pedidos', icon: ClipboardList },
  notifications: { title: 'Notificações', icon: Bell },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const statusGroups = [{ module: 'REQUESTS', title: 'Estados dos pedidos' }];
const emptyMessages = { approveMessage: '', rejectMessage: '', completeMessage: '' };
const messageFields = [
  { key: 'approveMessage', label: 'Mensagem ao aprovar pedido' },
  { key: 'rejectMessage', label: 'Mensagem ao rejeitar pedido' },
  { key: 'completeMessage', label: 'Mensagem ao concluir pedido' },
];
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);
const fromResponse = (data) => ({
  approveMessage: data.approveMessage ?? '',
  rejectMessage: data.rejectMessage ?? '',
  completeMessage: data.completeMessage ?? '',
});

export default function RequestSettingsManagement({ mode }) {
  const page = pages[mode] ?? pages.types;
  const Icon = page.icon;
  const [types, setTypes] = useState([]);
  const [messages, setMessages] = useState(emptyMessages);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingKey, setEditingKey] = useState(null);

  const load = useCallback(async () => {
    if (mode === 'statuses') return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'notifications') {
        setMessages(fromResponse(await getStudentRequestSettings()));
      } else {
        setTypes(await getStudentRequestTypes());
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

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setMessages(fromResponse(await updateStudentRequestSettings(messages)));
      setEditingKey(null);
      setNotice('Definições guardadas.');
    } catch (saveError) {
      setError(errorMessage(saveError));
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

      {mode === 'statuses' ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : mode === 'notifications' ? (
        <>
          {error && !editingKey && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
          <SettingsValuesTable
            ariaLabel="Notificações dos pedidos"
            columns={['Notificação', 'Mensagem']}
            loading={loading}
            disabled={saving}
            rows={messageFields.map(({ key, label }) => ({
              key,
              label,
              cells: [label, messages[key] || '—'],
              onEdit: () => {
                setError('');
                setEditingKey(key);
              },
            }))}
          />
          <SettingsFormDialog
            open={Boolean(editingKey)}
            title={messageFields.find(({ key }) => key === editingKey)?.label ?? 'Editar'}
            onClose={() => { setEditingKey(null); load(); }}
            onSubmit={save}
            saving={saving}
            error={error}
          >
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              label="Mensagem"
              value={messages[editingKey] ?? ''}
              onChange={(event) => setMessages((current) => ({
                ...current,
                [editingKey]: event.target.value,
              }))}
              disabled={saving}
              slotProps={{ htmlInput: { maxLength: 1600 } }}
            />
          </SettingsFormDialog>
        </>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <FinanceCatalogSection
            audit="StudentRequestType"
            title="Novo Tipo de Pedido"
            icon={ClipboardList}
            items={types}
            loading={loading}
            withAmount={false}
            nameLabel="Tipo de Pedido"
            showDate
            onCreate={createStudentRequestType}
            onUpdate={updateStudentRequestType}
            onDelete={deleteStudentRequestType}
            onChanged={load}
          />
        </>
      )}
    </section>
  );
}
