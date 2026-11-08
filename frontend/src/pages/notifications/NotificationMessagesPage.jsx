import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  IconButton,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { RotateCcw } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import RichTextField, { RichTextCell } from '../../components/RichTextField';
import StatusBadge from '../../components/StatusBadge';
import {
  getNotificationMessages,
  getStaff,
  getStudents,
  resendNotificationMessage,
  sendNotificationMessage,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { richTextIsEmpty, richTextToPlain } from '../../utils/richText';
import { filterBySearch } from '../../utils/search';
import { formatDateTime } from '../../utils/date';

const channels = {
  whatsapp: { channel: 'WHATSAPP', title: 'WhatsApp' },
  sms: { channel: 'SMS', title: 'SMS' },
};
const recipientTypes = [
  { value: 'STAFF', label: 'Funcionário' },
  { value: 'STUDENT', label: 'Estudante' },
  { value: 'MANUAL', label: 'Número de telefone' },
];
const columns = [
  { key: 'recipient', label: 'Destinatário' },
  { key: 'phone', label: 'Número de Telefone' },
  { key: 'message', label: 'Mensagem' },
  { key: 'createdAt', label: 'Data do Pedido' },
  { key: 'sentAt', label: 'Data de Envio' },
  { key: 'statusLabel', label: 'Estado' },
  { key: 'error', label: 'Erro' },
];
const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const recipientText = (row) => (
  row.recipientCode ? `${row.recipientCode} — ${displayText(row.recipientName)}` : 'Número avulso'
);

export default function NotificationMessagesPage({ channelKey }) {
  const { channel, title } = channels[channelKey];
  const [recipientType, setRecipientType] = useState('STAFF');
  const [recipient, setRecipient] = useState(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [messageKey, setMessageKey] = useState(0);
  const [staffOptions, setStaffOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedMessages, hr, teachers, other, students] = await Promise.all([
        getNotificationMessages(channel),
        getStaff('hr'),
        getStaff('teachers'),
        getStaff('other'),
        getStudents(),
      ]);
      setMessages(loadedMessages);
      setStaffOptions([...hr, ...teachers, ...other].filter((item) => item.active).map((item) => ({
        id: item.id,
        code: item.staffCode,
        name: [item.firstName, item.surname].filter(Boolean).join(' '),
        phone: item.phone,
      })));
      setStudentOptions(students.filter((item) => item.active).map((item) => ({
        id: item.id,
        code: item.studentCode,
        name: [item.firstName, item.surname].filter(Boolean).join(' '),
        phone: item.phone,
      })));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    load();
  }, [load]);

  const options = recipientType === 'STAFF' ? staffOptions : studentOptions;

  const submit = async (event) => {
    event.preventDefault();
    if (richTextIsEmpty(message)) {
      setError('Escreva a mensagem.');
      return;
    }
    if (recipientType !== 'MANUAL' && !recipient) {
      setError('Seleccione o destinatário.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const sent = await sendNotificationMessage({
        channel,
        recipientType,
        recipientId: recipient?.id ?? null,
        phone: recipientType === 'MANUAL' ? phone : null,
        message,
      });
      setNotice(sent.status === 'SENT'
        ? 'Mensagem enviada.'
        : `A mensagem foi registada com o estado ${sent.statusLabel}.`);
      setRecipient(null);
      setPhone('');
      setMessage('');
      setMessageKey((current) => current + 1);
      await load();
    } catch (sendError) {
      setError(errorMessage(sendError));
    } finally {
      setSaving(false);
    }
  };

  const resend = async (row) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const sent = await resendNotificationMessage(row.id);
      setNotice(sent.status === 'SENT' ? 'Mensagem enviada.' : `Estado: ${sent.statusLabel}.`);
      await load();
    } catch (resendError) {
      setError(errorMessage(resendError));
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = useMemo(() => filterBySearch(messages, searchTerm, (row) => [
    recipientText(row), row.phone, richTextToPlain(row.message), row.statusLabel, row.error,
  ]), [messages, searchTerm]);
  const exportRows = visibleRows.map((row) => ({
    recipient: recipientText(row),
    phone: displayText(row.phone),
    message: richTextToPlain(row.message),
    createdAt: formatDateTime(row.createdAt),
    sentAt: formatDateTime(row.sentAt),
    statusLabel: row.statusLabel,
    error: row.error ?? '—',
  }));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Notificações</p>
          <h1>{title}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={columns}
            rows={exportRows}
            filename={`mensagens-${channelKey}`}
            title={`Mensagens ${title}`}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <form className="cacoin-test-registration-form" onSubmit={submit}>
        <TextField
          select
          size="small"
          label="Destinatário"
          value={recipientType}
          onChange={(event) => {
            setRecipientType(event.target.value);
            setRecipient(null);
          }}
        >
          {recipientTypes.map(({ value, label }) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </TextField>
        {recipientType === 'MANUAL' ? (
          <TextField
            required
            size="small"
            label="Número de Telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        ) : (
          <Autocomplete
            options={options}
            value={recipient}
            onChange={(_, selected) => setRecipient(selected)}
            getOptionLabel={(option) => `${option.code} — ${displayText(option.name)}`}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            disabled={loading || saving}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                size="small"
                label={recipientType === 'STAFF' ? 'Funcionário' : 'Estudante'}
              />
            )}
          />
        )}
        <RichTextField
          label="Mensagem"
          required
          value={message}
          resetKey={messageKey}
          onChange={setMessage}
        />
        <div className="cacoin-test-registration-actions">
          <Button type="submit" variant="contained" disabled={saving || loading}>
            {saving ? 'A enviar…' : 'Enviar'}
          </Button>
        </div>
      </form>

      <StandardTable
        audit="NotificationMessage"
        ariaLabel={`Mensagens ${title}`}
        columns={[...columns, { key: 'actions', label: 'Acções', align: 'right' }]}
        emptyMessage={searchTerm.trim()
          ? 'Nenhuma mensagem corresponde à pesquisa.'
          : 'Ainda não existem mensagens.'}
        loading={loading}
        rows={visibleRows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{recipientText(row)}</TableCell>
            <TableCell>{displayText(row.phone)}</TableCell>
            <TableCell><RichTextCell value={row.message} /></TableCell>
            <TableCell>{formatDateTime(row.createdAt)}</TableCell>
            <TableCell>{formatDateTime(row.sentAt)}</TableCell>
            <TableCell><StatusBadge label={row.statusLabel} tone={row.statusTone} /></TableCell>
            <TableCell>{row.error ?? '—'}</TableCell>
            <TableCell align="right">
              {row.status !== 'SENT' && (
                <Tooltip title="Reenviar">
                  <span>
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label={`Reenviar mensagem ${rowNumber}`}
                      disabled={saving}
                      onClick={() => resend(row)}
                    >
                      <RotateCcw size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </TableCell>
          </TableRow>
        )}
      />
    </section>
  );
}
