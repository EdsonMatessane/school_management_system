import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, History, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Tab,
  Tabs,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import SearchField from '../../components/SearchField';
import SettingsFormDialog from '../../components/SettingsFormDialog';
import SettingsValuesTable from '../../components/SettingsValuesTable';
import DataExportMenu from '../../components/DataExportMenu';
import StandardTable from '../../components/StandardTable';
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  getSystemSettings,
  updateHoliday,
  updateSystemSettings,
} from '../../services/api';
import { isValidDisplayDate, maskDate, parseDisplayDate, toDisplayDate } from '../../utils/date';
import { getSystemYear, setSystemYear } from '../../utils/systemDate';

const defaultSettings = {
  timeZone: 'Africa/Maputo',
  locale: 'pt-MZ',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '24h',
  weekStartsOn: 'MONDAY',
  academicYearStartMonth: 1,
  academicYearEndMonth: 12,
  previousYearEnabled: false,
  systemYear: null,
  currency: 'MZN',
  classesOnSaturday: false,
  classesOnSunday: false,
  schoolDayStart: '07:00',
  schoolDayEnd: '17:00',
  defaultLessonMinutes: 45,
  requiredStudentFields: [],
  requiredStaffFields: [],
};
const studentFormTabs = [
  {
    label: 'Dados Pessoais',
    fields: [
      ['studentCode', 'Código do Estudante (gerado automaticamente)'],
      ['firstName', 'Nome'],
      ['surname', 'Apelido'],
      ['fatherName', 'Nome do Pai'],
      ['motherName', 'Nome da Mãe'],
      ['gender', 'Género'],
      ['birthDate', 'Data de Nascimento'],
      ['biNumber', 'Número de BI'],
      ['issueDate', 'Data de Emissão'],
      ['expiryDate', 'Data de Validade'],
      ['nuit', 'NUIT'],
      ['country', 'País'],
      ['birthDistrict', 'Naturalidade (distrito)'],
    ],
  },
  {
    label: 'Endereço',
    fields: [
      ['addressProvince', 'Província'],
      ['addressDistrict', 'Distrito'],
      ['address', 'Endereço'],
      ['phone', 'Telefone'],
      ['email', 'Email'],
    ],
  },
  {
    label: 'Detalhes do Curso',
    fields: [
      ['course', 'Curso'],
      ['category', 'Categoria'],
      ['level', 'Nível'],
      ['modality', 'Modalidade'],
      ['durationMonths', 'Duração (preenchida automaticamente)'],
      ['monthlyFeeAmount', 'Mensalidade (preenchida automaticamente)'],
      ['monthlyFeeType', 'Tipo de Mensalidade (preenchido automaticamente)'],
      ['enrollmentFeeAmount', 'Taxa de Inscrição (preenchida automaticamente)'],
      ['enrollmentFeeType', 'Tipo de Taxa de Inscrição (preenchido automaticamente)'],
      ['manualFeeType', 'Tipo de Valor do Manual (preenchido automaticamente)'],
      ['manualFeeAmount', 'Valor do Manual (preenchido automaticamente)'],
    ],
  },
];
const staffFormTabs = [
  {
    label: 'Dados Pessoais',
    fields: [
      ['staffCode', 'Código do Funcionário (gerado automaticamente)'],
      ['firstName', 'Nome'],
      ['surname', 'Apelido'],
      ['fatherName', 'Nome do Pai'],
      ['motherName', 'Nome da Mãe'],
      ['gender', 'Género'],
      ['birthDate', 'Data de Nascimento'],
      ['biNumber', 'Número de BI'],
      ['issueDate', 'Data de Emissão'],
      ['expiryDate', 'Data de Validade'],
      ['nuit', 'NUIT'],
      ['country', 'País'],
      ['birthDistrict', 'Naturalidade (distrito)'],
    ],
  },
  {
    label: 'Endereço',
    fields: [
      ['addressProvince', 'Província'],
      ['addressDistrict', 'Distrito'],
      ['address', 'Endereço'],
      ['phone', 'Telefone'],
      ['email', 'Email'],
    ],
  },
  {
    label: 'Formação Académica',
    fields: [
      ['trainingCourse', 'Curso de Formação'],
      ['institution', 'Instituição'],
      ['entryYear', 'Ano de Ingresso'],
      ['completionYear', 'Ano de Término'],
      ['trainingInProgress', 'Formação em progresso'],
    ],
  },
  {
    label: 'Certificação',
    fields: [
      ['certificate', 'Certificado'],
      ['cv', 'Currículo (CV)'],
    ],
  },
];
const emptyHoliday = {
  name: '',
  date: '',
  type: 'PUBLIC',
  description: '',
  recurring: false,
  active: true,
};
const holidayTypes = [
  { value: 'PUBLIC', label: 'Feriado nacional' },
  { value: 'SCHOOL', label: 'Feriado escolar' },
  { value: 'EXAM', label: 'Período de exames' },
  { value: 'OTHER', label: 'Outro' },
];
const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

function Field({ label, value, onChange, type = 'text', required = false, children, ...props }) {
  return (
    <TextField
      select={Boolean(children)}
      fullWidth
      size="small"
      label={label}
      value={value ?? ''}
      onChange={onChange}
      type={type}
      required={required}
      {...props}
    >
      {children}
    </TextField>
  );
}

export default function SettingsManagement({ formMode = false, formType = 'student' }) {
  const [tab, setTab] = useState(0);
  const [studentFormTab, setStudentFormTab] = useState(0);
  const [staffFormTab, setStaffFormTab] = useState(0);
  const [settings, setSettings] = useState(defaultSettings);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deletingHoliday, setDeletingHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState(emptyHoliday);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTab, setEditingTab] = useState(null);
  const filteredHolidays = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('pt-MZ');
    return holidays.filter((holiday) => (
      [holiday.name, holiday.description, holiday.type, holiday.date]
        .some((value) => String(value ?? '').toLocaleLowerCase('pt-MZ').includes(query))
    ));
  }, [holidays, searchTerm]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [savedSettings, savedHolidays] = await Promise.all([
        getSystemSettings(),
        getHolidays(),
      ]);
      setSettings({
        ...defaultSettings,
        ...savedSettings,
        dateFormat: defaultSettings.dateFormat,
        requiredStudentFields: savedSettings.requiredStudentFields ?? [],
        requiredStaffFields: savedSettings.requiredStaffFields ?? [],
      });
      setHolidays(savedHolidays);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeSetting = (name, value) => {
    setSettings((current) => ({ ...current, [name]: value }));
  };
  const saveSettings = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (settings.previousYearEnabled) {
      const year = Number(settings.systemYear);
      if (!/^\d{4}$/.test(String(settings.systemYear ?? ''))) {
        setError('Indique o ano no formato AAAA.');
        return;
      }
      if (year > new Date().getFullYear()) {
        setError('O ano não pode estar no futuro.');
        return;
      }
    }
    setSaving(true);
    try {
      const previousYear = getSystemYear();
      const saved = await updateSystemSettings({
        ...settings,
        systemYear: settings.previousYearEnabled ? Number(settings.systemYear) : null,
        dateFormat: defaultSettings.dateFormat,
      });
      const savedYear = saved.previousYearEnabled ? saved.systemYear : null;
      setSystemYear(savedYear);
      if (savedYear !== previousYear) {
        window.location.reload();
        return;
      }
      setSettings({
        ...defaultSettings,
        ...saved,
        dateFormat: defaultSettings.dateFormat,
        requiredStudentFields: saved.requiredStudentFields ?? [],
        requiredStaffFields: saved.requiredStaffFields ?? [],
      });
      setEditingTab(null);
      setNotice('As configurações foram guardadas.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const yesNo = (value) => (value ? 'Sim' : 'Não');
  const calendarRows = [
    ['Mês de início do ano lectivo', months[settings.academicYearStartMonth - 1] ?? '—'],
    ['Mês de fim do ano lectivo', months[settings.academicYearEndMonth - 1] ?? '—'],
    ['Moeda padrão', settings.currency || '—'],
    ['Início do dia escolar', settings.schoolDayStart || '—'],
    ['Fim do dia escolar', settings.schoolDayEnd || '—'],
    ['Duração padrão da aula (minutos)', settings.defaultLessonMinutes ?? '—'],
    ['Aulas ao sábado', yesNo(settings.classesOnSaturday)],
    ['Aulas ao domingo', yesNo(settings.classesOnSunday)],
  ];
  const dateTimeRows = [
    ['Fuso horário', settings.timeZone || '—'],
    ['Idioma e região', settings.locale || '—'],
    ['Formato da data', 'DD/MM/AAAA'],
    ['Formato da hora', settings.timeFormat === '12h' ? '12 horas' : '24 horas'],
    ['Primeiro dia da semana', {
      MONDAY: 'Segunda-feira',
      SUNDAY: 'Domingo',
      SATURDAY: 'Sábado',
    }[settings.weekStartsOn] ?? '—'],
  ];
  const yearRows = [
    ['Ano do sistema', settings.previousYearEnabled
      ? `Ano anterior (${settings.systemYear || '—'})`
      : 'Ano corrente'],
  ];

  const toggleStudentFieldRequired = (field, required) => {
    setSettings((current) => ({
      ...current,
      requiredStudentFields: required
        ? [...new Set([...current.requiredStudentFields, field])]
        : current.requiredStudentFields.filter((item) => item !== field),
    }));
  };
  const toggleStaffFieldRequired = (field, required) => {
    setSettings((current) => ({
      ...current,
      requiredStaffFields: required
        ? [...new Set([...current.requiredStaffFields, field])]
        : current.requiredStaffFields.filter((item) => item !== field),
    }));
  };

  const openCreateHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm(emptyHoliday);
    setError('');
    setDialogOpen(true);
  };
  const openEditHoliday = (holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      ...holiday,
      date: toDisplayDate(holiday.date),
      description: holiday.description ?? '',
    });
    setError('');
    setDialogOpen(true);
  };
  const submitHoliday = async (event) => {
    event.preventDefault();
    if (!isValidDisplayDate(holidayForm.date) || !parseDisplayDate(holidayForm.date)) {
      setError('Indique uma data válida no formato DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, {
          ...holidayForm,
          date: parseDisplayDate(holidayForm.date),
        });
        setNotice('O registo foi actualizado.');
      } else {
        await createHoliday({ ...holidayForm, date: parseDisplayDate(holidayForm.date) });
        setNotice('O registo foi criado.');
      }
      setDialogOpen(false);
      setHolidays(await getHolidays());
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };
  const confirmDeleteHoliday = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteHoliday(deletingHoliday.id);
      setHolidays(await getHolidays());
      setDeletingHoliday(null);
      setNotice('O registo foi apagado.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Designação' },
    { key: 'date', label: 'Data' },
    { key: 'type', label: 'Tipo' },
    { key: 'recurring', label: 'Recorrente' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const holidayTypeLabel = (type) => holidayTypes.find((item) => item.value === type)?.label ?? type;
  const exportColumns = columns.filter(({ key }) => key !== 'actions');
  const exportRows = filteredHolidays.map((holiday) => ({
    name: holiday.name,
    date: toDisplayDate(holiday.date),
    type: holidayTypeLabel(holiday.type),
    recurring: holiday.recurring ? 'Sim' : 'Não',
    status: holiday.active ? 'Activo' : 'Inactivo',
  }));
  const activeFormTabs = formType === 'staff' ? staffFormTabs : studentFormTabs;
  const activeFormTab = formType === 'staff' ? staffFormTab : studentFormTab;
  const requiredFormFields = formType === 'staff'
    ? settings.requiredStaffFields
    : settings.requiredStudentFields;
  const toggleFormFieldRequired = formType === 'staff'
    ? toggleStaffFieldRequired
    : toggleStudentFieldRequired;

  return (
    <section className="cacoin-course-page cacoin-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Administração</p>
          <h1>{formMode
            ? formType === 'staff' ? 'Formulário de Funcionários' : 'Formulário de Estudantes'
            : 'Configurações'}</h1>
        </div>
      </header>
      {error && !dialogOpen && editingTab === null && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {formMode ? (
        <section className="cacoin-settings-card cacoin-student-required-settings">
          <Tabs
            value={activeFormTab}
            onChange={(_, value) => {
              if (formType === 'staff') setStaffFormTab(value);
              else setStudentFormTab(value);
            }}
            aria-label="Separadores dos campos de inscrição"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            {activeFormTabs.map((section) => (
              <Tab key={section.label} label={section.label} />
            ))}
          </Tabs>
          <div className="cacoin-student-required-fields">
            {activeFormTabs[activeFormTab].fields.map(([field, label]) => (
              <div className="cacoin-student-required-field" key={field}>
                <span>{label}</span>
                <FormControlLabel
                  label={requiredFormFields.includes(field) ? 'Obrigatório' : 'Opcional'}
                  control={(
                    <Switch
                      checked={requiredFormFields.includes(field)}
                      onChange={(_, checked) => toggleFormFieldRequired(field, checked)}
                      color="primary"
                      slotProps={{ input: { 'aria-label': `${label}: obrigatório` } }}
                    />
                  )}
                />
              </div>
            ))}
          </div>
          <form onSubmit={saveSettings}>
            <div className="cacoin-settings-actions">
              <Button type="submit" variant="contained" disabled={saving || loading}>
                {saving ? 'A guardar…' : 'Guardar configurações'}
              </Button>
            </div>
          </form>
        </section>
      ) : (
      <section className="cacoin-settings-card cacoin-general-settings">
      <div className="cacoin-settings-tabs">
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Secções de configurações"
        >
          <Tab icon={<Settings2 size={17} />} iconPosition="start" label="Geral" />
          <Tab icon={<Clock3 size={17} />} iconPosition="start" label="Data e hora" />
          <Tab icon={<CalendarDays size={17} />} iconPosition="start" label="Feriados e calendário" />
          <Tab icon={<History size={17} />} iconPosition="start" label="Ano" />
        </Tabs>
      </div>

      {tab === 0 && (
        <>
          <SettingsValuesTable
            ariaLabel="Calendário escolar"
            columns={['Definição', 'Valor']}
            loading={loading}
            disabled={saving}
            rows={calendarRows.map(([label, value]) => ({
              key: label,
              label,
              cells: [label, value],
              onEdit: () => {
                setError('');
                setEditingTab(0);
              },
            }))}
          />
          <SettingsFormDialog
            open={editingTab === 0}
            title="Calendário escolar"
            onClose={() => { setEditingTab(null); load(); }}
            onSubmit={saveSettings}
            saving={saving || loading}
            error={error}
            maxWidth="md"
          >
            <div className="cacoin-settings-grid">
              <Field
                label="Mês de início do ano lectivo"
                value={settings.academicYearStartMonth}
                onChange={(e) => changeSetting('academicYearStartMonth', Number(e.target.value))}
              >
                {months.map((month, index) => (
                  <MenuItem key={month} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Field>
              <Field
                label="Mês de fim do ano lectivo"
                value={settings.academicYearEndMonth}
                onChange={(e) => changeSetting('academicYearEndMonth', Number(e.target.value))}
              >
                {months.map((month, index) => (
                  <MenuItem key={month} value={index + 1}>
                    {month}
                  </MenuItem>
                ))}
              </Field>
              <Field
                label="Moeda padrão"
                value={settings.currency}
                onChange={(e) => changeSetting('currency', e.target.value)}
              >
                <MenuItem value="MZN">MZN — Metical</MenuItem>
                <MenuItem value="USD">USD — Dólar americano</MenuItem>
                <MenuItem value="ZAR">ZAR — Rand</MenuItem>
                <MenuItem value="EUR">EUR — Euro</MenuItem>
              </Field>
              <Field
                label="Início do dia escolar"
                type="time"
                value={settings.schoolDayStart}
                onChange={(e) => changeSetting('schoolDayStart', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Field
                label="Fim do dia escolar"
                type="time"
                value={settings.schoolDayEnd}
                onChange={(e) => changeSetting('schoolDayEnd', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Field
                label="Duração padrão da aula (minutos)"
                type="number"
                value={settings.defaultLessonMinutes}
                onChange={(e) => changeSetting('defaultLessonMinutes', Number(e.target.value))}
                slotProps={{ htmlInput: { min: 5, max: 240 } }}
              />
            </div>
            <div className="cacoin-settings-checks">
              <label>
                <input
                  type="checkbox"
                  checked={settings.classesOnSaturday}
                  onChange={(e) => changeSetting('classesOnSaturday', e.target.checked)}
                />
                Aulas ao sábado
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.classesOnSunday}
                  onChange={(e) => changeSetting('classesOnSunday', e.target.checked)}
                />
                Aulas ao domingo
              </label>
            </div>
          </SettingsFormDialog>
        </>
      )}

      {tab === 1 && (
        <>
          <SettingsValuesTable
            ariaLabel="Data, hora e localização"
            columns={['Definição', 'Valor']}
            loading={loading}
            disabled={saving}
            rows={dateTimeRows.map(([label, value]) => ({
              key: label,
              label,
              cells: [label, value],
              onEdit: () => {
                setError('');
                setEditingTab(1);
              },
            }))}
          />
          <SettingsFormDialog
            open={editingTab === 1}
            title="Data, hora e localização"
            onClose={() => { setEditingTab(null); load(); }}
            onSubmit={saveSettings}
            saving={saving || loading}
            error={error}
            maxWidth="md"
          >
            <div className="cacoin-settings-grid">
              <Field
                label="Fuso horário"
                required
                value={settings.timeZone}
                onChange={(e) => changeSetting('timeZone', e.target.value)}
              >
                <MenuItem value="Africa/Maputo">África/Maputo (UTC+02:00)</MenuItem>
                <MenuItem value="Africa/Johannesburg">
                  África/Johannesburgo (UTC+02:00)
                </MenuItem>
                <MenuItem value="UTC">UTC</MenuItem>
                <MenuItem value="Europe/Lisbon">Europa/Lisboa</MenuItem>
              </Field>
              <Field
                label="Idioma e região"
                value={settings.locale}
                onChange={(e) => changeSetting('locale', e.target.value)}
              >
                <MenuItem value="pt-MZ">Português (Moçambique)</MenuItem>
                <MenuItem value="pt-PT">Português (Portugal)</MenuItem>
                <MenuItem value="en-GB">English (United Kingdom)</MenuItem>
              </Field>
              <Field
                label="Formato da data"
                value={settings.dateFormat}
                onChange={(e) => changeSetting('dateFormat', e.target.value)}
              >
                <MenuItem value="dd/MM/yyyy">DD/MM/AAAA — 31/12/2026</MenuItem>
              </Field>
              <Field
                label="Formato da hora"
                value={settings.timeFormat}
                onChange={(e) => changeSetting('timeFormat', e.target.value)}
              >
                <MenuItem value="24h">24 horas — 17:30</MenuItem>
                <MenuItem value="12h">12 horas — 05:30 PM</MenuItem>
              </Field>
              <Field
                label="Primeiro dia da semana"
                value={settings.weekStartsOn}
                onChange={(e) => changeSetting('weekStartsOn', e.target.value)}
              >
                <MenuItem value="MONDAY">Segunda-feira</MenuItem>
                <MenuItem value="SUNDAY">Domingo</MenuItem>
                <MenuItem value="SATURDAY">Sábado</MenuItem>
              </Field>
            </div>
            <div className="cacoin-settings-preview">
              <span>Pré-visualização</span>
              <strong>
                {(() => {
                  const dateParts = new Intl.DateTimeFormat('pt-MZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    timeZone: settings.timeZone || 'Africa/Maputo',
                  }).formatToParts(new Date());
                  const part = (type) => dateParts.find((item) => item.type === type)?.value ?? '';
                  return `${part('day')}/${part('month')}/${part('year')}`;
                })()}
              </strong>
              <strong>
                {new Intl.DateTimeFormat(settings.locale || 'pt-MZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: settings.timeFormat === '12h',
                  timeZone: settings.timeZone || 'Africa/Maputo',
                }).format(new Date())}
              </strong>
            </div>
          </SettingsFormDialog>
        </>
      )}

      {tab === 3 && (
        <>
          <SettingsValuesTable
            ariaLabel="Ano do sistema"
            columns={['Definição', 'Valor']}
            loading={loading}
            disabled={saving}
            rows={yearRows.map(([label, value]) => ({
              key: label,
              label,
              cells: [label, value],
              onEdit: () => {
                setError('');
                setEditingTab(3);
              },
            }))}
          />
          <SettingsFormDialog
            open={editingTab === 3}
            title="Ano do sistema"
            onClose={() => { setEditingTab(null); load(); }}
            onSubmit={saveSettings}
            saving={saving || loading}
            error={error}
            maxWidth="xs"
          >
            <RadioGroup
              value={settings.previousYearEnabled ? 'previous' : 'current'}
              onChange={(e) => {
                const previous = e.target.value === 'previous';
                setSettings((current) => ({
                  ...current,
                  previousYearEnabled: previous,
                  systemYear: previous ? current.systemYear : null,
                }));
              }}
            >
              <FormControlLabel value="current" control={<Radio />} label="Ano Corrente" />
              <FormControlLabel value="previous" control={<Radio />} label="Ano Anterior" />
            </RadioGroup>
            {settings.previousYearEnabled && (
              <div className="cacoin-settings-grid">
                <Field
                  label="Ano"
                  required
                  value={settings.systemYear}
                  onChange={(e) => changeSetting('systemYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric', maxLength: 4, placeholder: 'AAAA' },
                  }}
                />
              </div>
            )}
          </SettingsFormDialog>
        </>
      )}

      {tab === 2 && (
        <div className="cacoin-settings-holidays-content">
          <div className="cacoin-settings-holidays-heading">
            <div>
              <h2>Feriados e calendário</h2>
            </div>
            <div className="cacoin-page-heading-actions">
              <SearchField value={searchTerm} onChange={setSearchTerm} />
              <DataExportMenu
                columns={exportColumns}
                rows={exportRows}
                filename="feriados-calendario"
                title="Feriados e Calendário Escolar"
                disabled={loading}
                onError={(exportError) => setError(exportError.message)}
              />
              <Button
                variant="contained"
                startIcon={<Plus size={17} />}
                onClick={openCreateHoliday}
              >
                Novo registo
              </Button>
            </div>
          </div>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <StandardTable
            audit="Holiday"
            ariaLabel="Feriados e calendário escolar"
            columns={columns}
            loading={loading}
            rows={filteredHolidays}
            emptyMessage={searchTerm.trim()
              ? 'Nenhum registo corresponde à pesquisa.'
              : 'Ainda não existem feriados ou registos de calendário.'}
            renderRow={(holiday, rowNumber) => (
              <TableRow key={holiday.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{holiday.name}</TableCell>
                <TableCell>
                  {toDisplayDate(holiday.date)}
                </TableCell>
                <TableCell>{holidayTypeLabel(holiday.type)}</TableCell>
                <TableCell>{holiday.recurring ? 'Sim' : 'Não'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={holiday.active ? 'success' : 'default'}
                    label={holiday.active ? 'Activo' : 'Inactivo'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar registo">
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label={`Editar ${holiday.name}`}
                      onClick={() => openEditHoliday(holiday)}
                    >
                      <Pencil size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Apagar registo">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar ${holiday.name}`}
                      onClick={() => setDeletingHoliday(holiday)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}
          />
        </div>
      )}
      </section>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitHoliday}>
          <DialogTitle>
            {editingHoliday ? 'Editar registo de calendário' : 'Novo registo de calendário'}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
            <div className="cacoin-settings-dialog-grid">
              <Field
                label="Designação"
                required
                value={holidayForm.name}
                onChange={(e) => setHolidayForm((current) => ({
                  ...current,
                  name: e.target.value,
                }))}
                slotProps={{ htmlInput: { maxLength: 160 } }}
                sx={{ gridColumn: '1 / -1', mt: 1 }}
              />
              <Field
                label="Data"
                required
                value={holidayForm.date}
                onChange={(e) => setHolidayForm((current) => ({
                  ...current,
                  date: maskDate(e.target.value),
                }))}
                placeholder="DD/MM/AAAA"
                slotProps={{
                  htmlInput: { inputMode: 'numeric', maxLength: 10 },
                  inputLabel: { shrink: true },
                }}
              />
              <Field
                label="Tipo de registo"
                value={holidayForm.type}
                onChange={(e) => setHolidayForm((current) => ({
                  ...current,
                  type: e.target.value,
                }))}
              >
                {holidayTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Field>
              <Field
                label="Descrição"
                value={holidayForm.description}
                onChange={(e) => setHolidayForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))}
                multiline
                minRows={2}
                sx={{ gridColumn: '1 / -1' }}
              />
            </div>
            <div className="cacoin-settings-checks">
              <label>
                <input
                  type="checkbox"
                  checked={holidayForm.recurring}
                  onChange={(e) => setHolidayForm((current) => ({
                    ...current,
                    recurring: e.target.checked,
                  }))}
                />
                Repetir todos os anos
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={holidayForm.active}
                  onChange={(e) => setHolidayForm((current) => ({
                    ...current,
                    active: e.target.checked,
                  }))}
                />
                Registo activo
              </label>
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingHoliday ? 'Guardar alterações' : 'Criar registo'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(deletingHoliday)}
        onClose={() => !saving && setDeletingHoliday(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar registo</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar “{deletingHoliday?.name}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingHoliday(null)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={confirmDeleteHoliday} disabled={saving} color="error">
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
