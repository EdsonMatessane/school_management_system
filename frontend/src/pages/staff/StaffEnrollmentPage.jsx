import DetailList from '../../components/DetailList';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Tab,
  TableCell,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Power,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  addStaffCourse,
  createStaff,
  getCourses,
  getFinancePositions,
  getMozambiqueLocations,
  getStaffCourses,
  getStaffDocumentTypes,
  getStaffDocumentUrl,
  getSystemSettings,
  removeStaffCourse,
  setStaffCourseActive,
  updateStaff,
} from '../../services/api';
import { maskDate, parseDisplayDate, toDisplayDate } from '../../utils/date';
import {
  dateFields,
  getFieldError,
  maskBiNumber,
  maskDigits,
} from '../../utils/personForm';
import NotificationNumberFields from '../../components/NotificationNumberFields';
import { AddressFields, PersonalInformationFields } from '../../components/PersonFormFields';
import StandardTable from '../../components/StandardTable';

const initialForm = {
  firstName: '',
  surname: '',
  fatherName: '',
  motherName: '',
  gender: null,
  birthDate: '',
  documentType: null,
  biNumber: '',
  nuit: '',
  issueDate: '',
  expiryDate: '',
  country: 'Moçambique',
  birthDistrict: null,
  addressProvince: null,
  addressDistrict: null,
  address: '',
  phone: '',
  email: '',
  trainingCourse: '',
  institution: '',
  entryYear: '',
  completionYear: '',
  trainingInProgress: false,
  position: null,
  whatsappNumber: '',
  smsNumber: '',
};

const TAB_PERSONAL = 0;
const TAB_ADDRESS = 1;
const TAB_TRAINING = 2;
const TAB_POSITION = 3;
const TAB_CERTIFICATION = 4;
const TAB_COURSE = 5;
const MAX_DOCUMENT_NUMBER_LENGTH = 20;

const isBiType = (type) => !type || type.name?.trim().toUpperCase() === 'BI';

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível guardar o funcionário.';

const sameName = (left, right) => (
  left?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  === right?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
);

const findDistrict = (provinces, provinceName, districtName) => {
  const province = provinces.find((item) => sameName(item.name, provinceName));
  const district = province?.districts.find((item) => sameName(item.name, districtName));
  return district ? { ...district, province } : null;
};

const parseYear = (value) => (value === '' ? null : Number(value));
const personalFields = [
  'firstName', 'surname', 'fatherName', 'motherName', 'gender', 'birthDate',
  'biNumber', 'nuit', 'issueDate', 'expiryDate', 'country', 'birthDistrict',
];
const addressFields = ['addressProvince', 'addressDistrict', 'address', 'phone', 'email'];
const notificationFields = ['whatsappNumber', 'smsNumber'];
const requiredFieldLabels = {
  staffCode: 'Código do Funcionário',
  firstName: 'Nome',
  surname: 'Apelido',
  fatherName: 'Nome do Pai',
  motherName: 'Nome da Mãe',
  gender: 'Género',
  birthDate: 'Data de Nascimento',
  biNumber: 'Número de BI',
  issueDate: 'Data de Emissão',
  expiryDate: 'Data de Validade',
  nuit: 'NUIT',
  country: 'País',
  birthDistrict: 'Naturalidade',
  addressProvince: 'Província',
  addressDistrict: 'Distrito',
  address: 'Endereço',
  phone: 'Telefone',
  email: 'Email',
  trainingCourse: 'Curso de Formação',
  institution: 'Instituição',
  entryYear: 'Ano de Ingresso',
  completionYear: 'Ano de Término',
  certificate: 'Certificado',
  cv: 'Currículo (CV)',
};
const validDocument = (file) => {
  if (!file) return true;
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(extension);
};

export default function StaffEnrollmentPage({
  staffType,
  staff,
  onCancel,
  onSaved,
}) {
  const [form, setForm] = useState(initialForm);
  const [persistedStaff, setPersistedStaff] = useState(null);
  const [positions, setPositions] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [certificate, setCertificate] = useState(null);
  const [cv, setCv] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedModality, setSelectedModality] = useState(null);
  const [staffCourses, setStaffCourses] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseError, setCourseError] = useState('');
  const [courseNotice, setCourseNotice] = useState('');
  const [courseToView, setCourseToView] = useState(null);
  const [courseToRemove, setCourseToRemove] = useState(null);
  const [tab, setTab] = useState(0);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requiredStaffFields, setRequiredStaffFields] = useState([]);
  const courseStaff = persistedStaff ?? staff;
  const hasCourseTab = staffType === 'teachers';
  const tabNotifications = hasCourseTab ? TAB_COURSE + 1 : TAB_COURSE;

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getMozambiqueLocations(),
      getSystemSettings(),
      hasCourseTab ? getCourses() : Promise.resolve([]),
      getFinancePositions(),
      getStaffDocumentTypes(),
    ])
      .then(([
        loadedProvinces,
        systemSettings,
        loadedCourses,
        loadedPositions,
        loadedDocumentTypes,
      ]) => {
        if (!mounted) return;
        const identityTypes = loadedDocumentTypes.filter((type) => !type.requiresDescription);
        const defaultType = identityTypes.find((type) => isBiType(type) && type.name) ?? null;
        setProvinces(loadedProvinces);
        setRequiredStaffFields(systemSettings.requiredStaffFields ?? []);
        setCourses(loadedCourses);
        setPositions(loadedPositions);
        setDocumentTypes(identityTypes);
        if (!staff) {
          setForm((current) => ({ ...current, documentType: current.documentType ?? defaultType }));
          return;
        }
        const addressProvince = loadedProvinces.find(
          (province) => sameName(province.name, staff.addressProvince),
        ) ?? null;
        const addressDistrict = addressProvince?.districts.find(
          (district) => sameName(district.name, staff.addressDistrict),
        ) ?? null;
        setForm({
          firstName: staff.firstName ?? '',
          surname: staff.surname ?? '',
          fatherName: staff.fatherName ?? '',
          motherName: staff.motherName ?? '',
          gender: staff.gender ?? null,
          birthDate: toDisplayDate(staff.birthDate),
          documentType: identityTypes.find((type) => type.id === staff.documentTypeId)
            ?? defaultType,
          biNumber: staff.biNumber ?? '',
          nuit: staff.nuit ?? '',
          issueDate: toDisplayDate(staff.issueDate),
          expiryDate: toDisplayDate(staff.expiryDate),
          country: staff.country ?? '',
          birthDistrict: findDistrict(loadedProvinces, staff.birthProvince, staff.birthDistrict),
          addressProvince,
          addressDistrict,
          address: staff.address ?? '',
          phone: staff.phone ?? '',
          email: staff.email ?? '',
          trainingCourse: staff.trainingCourse ?? '',
          institution: staff.institution ?? '',
          entryYear: staff.entryYear == null ? '' : String(staff.entryYear),
          completionYear: staff.completionYear == null ? '' : String(staff.completionYear),
          trainingInProgress: Boolean(staff.trainingInProgress),
          position: loadedPositions.find((item) => item.id === staff.positionId) ?? null,
          whatsappNumber: staff.whatsappNumber ?? '',
          smsNumber: staff.smsNumber ?? '',
        });
      })
      .catch((loadError) => {
        if (mounted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [hasCourseTab, staff]);

  useEffect(() => {
    if (!hasCourseTab || !courseStaff?.id) {
      setStaffCourses([]);
      return undefined;
    }
    let mounted = true;
    setCourseLoading(true);
    setCourseError('');
    getStaffCourses(staffType, courseStaff.id)
      .then((assignments) => {
        if (mounted) setStaffCourses(assignments);
      })
      .catch((loadError) => {
        if (mounted) setCourseError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setCourseLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [courseStaff?.id, hasCourseTab, staffType]);

  const districts = useMemo(
    () => provinces.flatMap((province) =>
      province.districts.map((district) => ({ ...district, province }))),
    [provinces],
  );
  const availableCourses = useMemo(
    () => courses.filter((course) => course.active
      && !staffCourses.some((assignment) => assignment.courseId === course.id)),
    [courses, staffCourses],
  );
  const categoryOptions = useMemo(
    () => [...new Map(availableCourses.map((course) => [
      course.categoryId,
      { id: course.categoryId, name: course.categoryName },
    ])).values()],
    [availableCourses],
  );
  const levelOptions = useMemo(
    () => [...new Map(availableCourses
      .filter((course) => !selectedCategory || course.categoryId === selectedCategory.id)
      .map((course) => [course.levelId, { id: course.levelId, name: course.levelName }]))
      .values()],
    [availableCourses, selectedCategory],
  );
  const modalityOptions = useMemo(
    () => [...new Map(availableCourses
      .filter((course) => (
        (!selectedCategory || course.categoryId === selectedCategory.id)
        && (!selectedLevel || course.levelId === selectedLevel.id)
      ))
      .map((course) => [course.modalityId, { id: course.modalityId, name: course.modalityName }]))
      .values()],
    [availableCourses, selectedCategory, selectedLevel],
  );
  const filteredCourseOptions = useMemo(
    () => availableCourses.filter((course) => (
      (!selectedCategory || course.categoryId === selectedCategory.id)
      && (!selectedLevel || course.levelId === selectedLevel.id)
      && (!selectedModality || course.modalityId === selectedModality.id)
    )),
    [availableCourses, selectedCategory, selectedLevel, selectedModality],
  );

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'addressProvince' ? { addressDistrict: null } : {}),
      ...(field === 'trainingInProgress' && value ? { completionYear: '' } : {}),
    }));
    setTouched((current) => ({ ...current, [field]: true }));
    setError('');
  };

  const fieldError = (field) => {
    const currentStaff = persistedStaff ?? staff;
    const configuredValues = {
      staffCode: currentStaff?.staffCode ?? 'Gerado após guardar',
      birthDistrict: form.birthDistrict?.code,
      addressProvince: form.addressProvince?.code,
      addressDistrict: form.addressDistrict?.code,
      certificate: certificate ?? (currentStaff?.certificateFileName ? true : null),
      cv: cv ?? (currentStaff?.cvFileName ? true : null),
    };
    const value = Object.hasOwn(configuredValues, field)
      ? configuredValues[field]
      : form[field];
    const missingRequiredValue = value == null
      || typeof value === 'string' && value.trim() === '';
    if (
      requiredStaffFields.includes(field)
      && missingRequiredValue
      && !(field === 'completionYear' && form.trainingInProgress)
    ) {
      return `O campo "${requiredFieldLabels[field] ?? field}" é obrigatório.`;
    }
    if (field === 'biNumber' && !isBiType(form.documentType)) {
      return form.biNumber.trim().length > MAX_DOCUMENT_NUMBER_LENGTH
        ? `O número do documento pode ter até ${MAX_DOCUMENT_NUMBER_LENGTH} caracteres.`
        : '';
    }
    const validationError = getFieldError(field, form[field], form);
    if (validationError) return validationError;
    if (field === 'entryYear' || field === 'completionYear') {
      if (form[field] && (!/^\d{4}$/.test(form[field]) || Number(form[field]) < 1900)) {
        return 'Indique um ano válido com quatro algarismos.';
      }
      if (
        field === 'completionYear'
        && !form.trainingInProgress
        && form.entryYear
        && form.completionYear
        && Number(form.completionYear) < Number(form.entryYear)
      ) {
        return 'O ano de término não pode ser anterior ao ingresso.';
      }
    }
    if (field === 'certificate' && certificate && !validDocument(certificate)) {
      return 'Use um ficheiro PDF, Word ou imagem (JPG/PNG).';
    }
    if (field === 'cv' && cv && !validDocument(cv)) {
      return 'Use um ficheiro PDF, Word ou imagem (JPG/PNG).';
    }
    if ((field === 'certificate' && certificate || field === 'cv' && cv)
      && (field === 'certificate' ? certificate : cv).size > 20 * 1024 * 1024) {
      return 'Cada ficheiro pode ter até 20 MB.';
    }
    return '';
  };

  const visibleError = (field) => (
    submitted || touched[field] ? fieldError(field) : ''
  );

  const validateFields = (fields) => {
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(fields.map((field) => [field, true])),
    }));
    return fields.every((field) => !fieldError(field));
  };

  const validate = () => {
    const allFields = [
      ...personalFields,
      ...addressFields,
      'entryYear',
      'completionYear',
      'certificate',
      'cv',
      ...notificationFields,
    ];
    if (validateFields(allFields)) return true;
    const firstInvalidTab = personalFields.some((field) => fieldError(field))
      ? TAB_PERSONAL
      : addressFields.some((field) => fieldError(field))
        ? TAB_ADDRESS
        : ['entryYear', 'completionYear'].some((field) => fieldError(field))
          ? TAB_TRAINING
          : notificationFields.some((field) => fieldError(field))
            ? tabNotifications
            : TAB_CERTIFICATION;
    setTab(firstInvalidTab);
    return false;
  };

  const assignCourse = async () => {
    if (!courseStaff?.id || !selectedCourse) return;
    setCourseSaving(true);
    setCourseError('');
    setCourseNotice('');
    try {
      const assignment = await addStaffCourse(staffType, courseStaff.id, selectedCourse.id);
      setStaffCourses((current) => [...current, assignment]);
      setCourseNotice(`O curso “${assignment.courseName}” foi associado ao professor.`);
      setSelectedCourse(null);
      setSelectedCategory(null);
      setSelectedLevel(null);
      setSelectedModality(null);
    } catch (actionError) {
      setCourseError(getErrorMessage(actionError));
    } finally {
      setCourseSaving(false);
    }
  };

  const toggleCourseStatus = async (assignment) => {
    setCourseSaving(true);
    setCourseError('');
    try {
      const updated = await setStaffCourseActive(
        staffType,
        courseStaff.id,
        assignment.id,
        !assignment.active,
      );
      setStaffCourses((current) => current.map((item) => (
        item.id === updated.id ? updated : item
      )));
    } catch (actionError) {
      setCourseError(getErrorMessage(actionError));
    } finally {
      setCourseSaving(false);
    }
  };

  const confirmRemoveCourse = async () => {
    if (!courseToRemove) return;
    setCourseSaving(true);
    setCourseError('');
    try {
      await removeStaffCourse(staffType, courseStaff.id, courseToRemove.id);
      setStaffCourses((current) => current.filter((item) => item.id !== courseToRemove.id));
      setCourseToRemove(null);
    } catch (actionError) {
      setCourseError(getErrorMessage(actionError));
    } finally {
      setCourseSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (hasCourseTab && tab === TAB_COURSE) {
      setTab(tabNotifications);
      return;
    }
    setSubmitted(true);
    if (!validate()) return;
    setSaving(true);
    setError('');
    const request = {
      staffType,
      firstName: form.firstName.trim(),
      surname: form.surname.trim(),
      fatherName: form.fatherName.trim(),
      motherName: form.motherName.trim(),
      gender: form.gender,
      birthDate: parseDisplayDate(form.birthDate),
      documentTypeId: form.documentType?.id ?? null,
      biNumber: form.biNumber.trim(),
      nuit: form.nuit.trim(),
      issueDate: parseDisplayDate(form.issueDate),
      expiryDate: parseDisplayDate(form.expiryDate),
      country: form.country.trim(),
      birthProvince: form.birthDistrict?.province.name ?? '',
      birthDistrict: form.birthDistrict?.name ?? '',
      addressProvince: form.addressProvince?.name ?? '',
      addressDistrict: form.addressDistrict?.name ?? '',
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      trainingCourse: form.trainingCourse.trim(),
      institution: form.institution.trim(),
      entryYear: parseYear(form.entryYear),
      completionYear: parseYear(form.completionYear),
      trainingInProgress: form.trainingInProgress,
      positionId: form.position?.id ?? null,
      whatsappNumber: form.whatsappNumber.trim(),
      smsNumber: form.smsNumber.trim(),
    };
    const formData = new FormData();
    formData.append('staff', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    if (certificate) formData.append('certificate', certificate);
    if (cv) formData.append('cv', cv);
    try {
      const currentStaff = persistedStaff ?? staff;
      const saved = currentStaff
        ? await updateStaff(staffType, currentStaff.id, formData)
        : await createStaff(staffType, formData);
      if (hasCourseTab && tab !== tabNotifications) {
        setPersistedStaff(saved);
        setTab(TAB_COURSE);
      } else {
        onSaved(saved, Boolean(staff));
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const renderText = (field, label, options = {}) => {
    const validationError = visibleError(field);
    const dateField = dateFields.has(field);
    const required = requiredStaffFields.includes(field);
    return (
      <TextField
        fullWidth
        size="small"
        label={required ? `${label} *` : label}
        value={form[field] ?? ''}
        onChange={(event) => {
          const value = event.target.value;
          setField(
            field,
            dateField
              ? maskDate(value)
              : field === 'nuit'
                ? maskDigits(value, 9)
                : field === 'biNumber'
                  ? (isBiType(form.documentType)
                    ? maskBiNumber(value)
                    : value.toUpperCase().slice(0, MAX_DOCUMENT_NUMBER_LENGTH))
                  : field === 'entryYear' || field === 'completionYear'
                    ? maskDigits(value, 4)
                  : value,
          );
        }}
        error={Boolean(validationError)}
        helperText={validationError || options.helperText}
        required={required}
        placeholder={dateField ? 'DD/MM/AAAA' : options.placeholder}
        slotProps={{ htmlInput: options.inputProps }}
        disabled={options.disabled ?? false}
        type={dateField ? 'text' : options.type ?? 'text'}
      />
    );
  };

  const renderAutocomplete = (field, label, options, getOptionLabel, optionProps = {}) => {
    const validationError = visibleError(field);
    const required = requiredStaffFields.includes(field);
    return (
      <Autocomplete
        options={options}
        value={form[field]}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, value) => {
          if (typeof option === 'string') return option === value;
          if (option.id != null) return option.id === value.id;
          if (option.province) {
            return option.code === value.code && option.province.code === value.province.code;
          }
          return option.code === value.code;
        }}
        onChange={(_, value) => setField(field, value)}
        disabled={optionProps.disabled ?? false}
        disableClearable={optionProps.disableClearable ?? false}
        noOptionsText={optionProps.noOptionsText ?? 'Nenhuma opção disponível.'}
        renderInput={(params) => (
          <TextField
            {...params}
            label={required ? `${label} *` : label}
            size="small"
            error={Boolean(validationError)}
            helperText={validationError || optionProps.helperText}
          />
        )}
      />
    );
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>{staff ? 'Editar funcionário' : 'Inscrever'}</h1>
        </div>
        {staff && (
          <Button startIcon={<X size={17} />} onClick={onCancel}>
            Cancelar edição
          </Button>
        )}
      </header>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {loading ? (
        <CircularProgress size={24} aria-label="A carregar dados do formulário" />
      ) : (
        <form className="cacoin-student-form-card" onSubmit={submit}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            aria-label="Separadores dos dados do funcionário"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Dados Pessoais" />
            <Tab label="Endereço" />
            <Tab label="Formação Académica" />
            <Tab label="Cargo" />
            <Tab label="Certificação" />
            {hasCourseTab && <Tab label="Curso" disabled={!courseStaff?.id} />}
            <Tab label="Notificações" disabled={hasCourseTab && !courseStaff?.id} />
          </Tabs>
          <div className="cacoin-course-form-grid">
            {tab === TAB_PERSONAL && (
              <PersonalInformationFields
                codeLabel="Código do Funcionário"
                code={staff?.staffCode ?? 'Gerado após guardar'}
                requiredCode={requiredStaffFields.includes('staffCode')}
                renderTextField={renderText}
                renderAutocomplete={renderAutocomplete}
                naturalityDistricts={districts}
                documentTypeField={renderAutocomplete(
                  'documentType',
                  'Tipo de Documento',
                  documentTypes,
                  (type) => type.name,
                  {
                    disableClearable: documentTypes.length > 0,
                    noOptionsText: 'Ainda não existem tipos de documento.',
                  },
                )}
                numberLabel={`Número de ${form.documentType?.name ?? 'BI'}`}
                numberPlaceholder={isBiType(form.documentType)
                  ? '12 algarismos e uma letra'
                  : ''}
                numberMaxLength={isBiType(form.documentType) ? 13 : MAX_DOCUMENT_NUMBER_LENGTH}
              />
            )}
            {tab === TAB_ADDRESS && (
              <AddressFields
                form={form}
                provinces={provinces}
                renderTextField={renderText}
                renderAutocomplete={renderAutocomplete}
              />
            )}
            {tab === TAB_TRAINING && (
              <>
                {renderText('trainingCourse', 'Curso de Formação')}
                {renderText('institution', 'Instituição')}
                {renderText('entryYear', 'Ano de Ingresso', {
                  inputProps: { maxLength: 4, inputMode: 'numeric' },
                })}
                {renderText('completionYear', 'Ano de Término', {
                  inputProps: { maxLength: 4, inputMode: 'numeric' },
                  disabled: form.trainingInProgress,
                })}
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={form.trainingInProgress}
                      onChange={(event) => setField('trainingInProgress', event.target.checked)}
                    />
                  )}
                  label="Formação em progresso"
                />
              </>
            )}
            {tab === TAB_POSITION && renderAutocomplete(
              'position',
              'Cargo',
              positions,
              (position) => position.name,
              {
                noOptionsText: 'Ainda não existem cargos. Crie-os em Definições > Cargos.',
                helperText: 'Cargos definidos em Definições > Cargos.',
              },
            )}
            {tab === TAB_CERTIFICATION && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  type="file"
                  label={requiredStaffFields.includes('certificate')
                    ? 'Carregar certificado *'
                    : 'Carregar certificado'}
                  slotProps={{
                    htmlInput: { accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png' },
                    inputLabel: { shrink: true },
                  }}
                  onChange={(event) => setCertificate(event.target.files?.[0] ?? null)}
                  onBlur={() => setTouched((current) => ({ ...current, certificate: true }))}
                  error={Boolean(visibleError('certificate'))}
                  helperText={visibleError('certificate')
                    || (certificate
                      ? `Novo ficheiro: ${certificate.name}`
                    : courseStaff?.certificateFileName
                      ? `Ficheiro actual: ${courseStaff.certificateFileName}. Escolha outro para substituir.`
                      : 'PDF, Word ou imagem; máximo 20 MB.')}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="file"
                  label={requiredStaffFields.includes('cv')
                    ? 'Carregar CV *'
                    : 'Carregar CV'}
                  slotProps={{
                    htmlInput: { accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png' },
                    inputLabel: { shrink: true },
                  }}
                  onChange={(event) => setCv(event.target.files?.[0] ?? null)}
                  onBlur={() => setTouched((current) => ({ ...current, cv: true }))}
                  error={Boolean(visibleError('cv'))}
                  helperText={visibleError('cv')
                    || (cv
                      ? `Novo ficheiro: ${cv.name}`
                    : courseStaff?.cvFileName
                      ? `Ficheiro actual: ${courseStaff.cvFileName}. Escolha outro para substituir.`
                      : 'PDF, Word ou imagem; máximo 20 MB.')}
                />
                {courseStaff?.certificateFileName && (
                  <a href={getStaffDocumentUrl(staffType, courseStaff.id, 'certificate')} target="_blank" rel="noreferrer">
                    Descarregar certificado actual
                  </a>
                )}
                {courseStaff?.cvFileName && (
                  <a href={getStaffDocumentUrl(staffType, courseStaff.id, 'cv')} target="_blank" rel="noreferrer">
                    Descarregar CV actual
                  </a>
                )}
              </>
            )}
            {tab === TAB_COURSE && hasCourseTab && (
              <>
                {courseError && (
                  <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>
                    {courseError}
                  </Alert>
                )}
                {courseNotice && (
                  <Alert
                    severity="success"
                    sx={{ gridColumn: '1 / -1' }}
                    onClose={() => setCourseNotice('')}
                  >
                    {courseNotice}
                  </Alert>
                )}
                <Autocomplete
                  options={filteredCourseOptions}
                  value={selectedCourse}
                  disabled={courseLoading}
                  getOptionLabel={(course) => course.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => {
                    setSelectedCourse(value);
                    setSelectedCategory(value
                      ? { id: value.categoryId, name: value.categoryName }
                      : selectedCategory);
                    setSelectedLevel(value
                      ? { id: value.levelId, name: value.levelName }
                      : selectedLevel);
                    setSelectedModality(value
                      ? { id: value.modalityId, name: value.modalityName }
                      : selectedModality);
                  }}
                  noOptionsText="Não existem cursos activos disponíveis."
                  renderInput={(params) => (
                    <TextField {...params} label="Curso" size="small" />
                  )}
                />
                <Autocomplete
                  options={categoryOptions}
                  value={selectedCategory}
                  disabled={courseLoading}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => {
                    setSelectedCategory(value);
                    setSelectedLevel(null);
                    setSelectedModality(null);
                    setSelectedCourse(null);
                  }}
                  noOptionsText="Não existem categorias disponíveis."
                  renderInput={(params) => (
                    <TextField {...params} label="Categoria" size="small" />
                  )}
                />
                <Autocomplete
                  options={levelOptions}
                  value={selectedLevel}
                  disabled={courseLoading}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => {
                    setSelectedLevel(value);
                    setSelectedModality(null);
                    setSelectedCourse(null);
                  }}
                  noOptionsText="Não existem níveis disponíveis."
                  renderInput={(params) => (
                    <TextField {...params} label="Nível" size="small" />
                  )}
                />
                <Autocomplete
                  options={modalityOptions}
                  value={selectedModality}
                  disabled={courseLoading}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => {
                    setSelectedModality(value);
                    setSelectedCourse(null);
                  }}
                  noOptionsText="Não existem modalidades disponíveis."
                  renderInput={(params) => (
                    <TextField {...params} label="Modalidade" size="small" />
                  )}
                />
                <TextField
                  label="Duração (autopreenchida)"
                  size="small"
                  value={selectedCourse?.durationMonths
                    ? `${selectedCourse.durationMonths} meses`
                    : ''}
                  disabled
                />
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={courseSaving
                    ? <CircularProgress size={16} />
                    : <Plus size={17} />}
                  onClick={assignCourse}
                  disabled={!selectedCourse || !courseStaff?.id || courseLoading || courseSaving}
                >
                  {courseSaving ? 'A adicionar…' : 'Adicionar curso'}
                </Button>
                {!courseStaff?.id && (
                  <Alert severity="info" sx={{ gridColumn: '1 / -1' }}>
                    Para adicionar cursos, preencha os separadores anteriores e clique em
                    “Guardar e continuar” na aba Certificação.
                  </Alert>
                )}
                {courseStaff?.id && !selectedCourse && (
                  <span></span>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <StandardTable
                    audit="StaffCourseAssignment"
                    ariaLabel={`Cursos associados a ${courseStaff?.staffCode ?? 'professor'}`}
                    columns={[
                      { key: 'course', label: 'Curso' },
                      { key: 'category', label: 'Categoria' },
                      { key: 'level', label: 'Nível' },
                      { key: 'modality', label: 'Modalidade' },
                      { key: 'duration', label: 'Duração' },
                      { key: 'status', label: 'Estado' },
                      { key: 'actions', label: 'Ações', align: 'right' },
                    ]}
                    rows={staffCourses}
                    loading={courseLoading}
                    emptyMessage="Ainda não foram associados cursos a este professor."
                    renderRow={(assignment, rowNumber) => (
                      <TableRow key={assignment.id} hover>
                        <TableCell>{rowNumber}</TableCell>
                        <TableCell>{assignment.courseName}</TableCell>
                        <TableCell>{assignment.categoryName}</TableCell>
                        <TableCell>{assignment.levelName}</TableCell>
                        <TableCell>{assignment.modalityName}</TableCell>
                        <TableCell>
                          {assignment.durationMonths
                            ? `${assignment.durationMonths} meses`
                            : '—'}
                        </TableCell>
                        <TableCell>{assignment.active ? 'Activo' : 'Desactivado'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                            <Tooltip title="Ver curso">
                              <IconButton
                                type="button"
                                aria-label={`Ver curso ${assignment.courseName}`}
                                onClick={() => setCourseToView(assignment)}
                              >
                                <Eye size={17} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={assignment.active ? 'Desactivar associação' : 'Activar associação'}>
                              <span>
                                <IconButton
                                  type="button"
                                  aria-label={`${assignment.active ? 'Desactivar' : 'Activar'} ${assignment.courseName}`}
                                  onClick={() => toggleCourseStatus(assignment)}
                                  disabled={courseSaving}
                                >
                                  <Power size={17} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Remover associação">
                              <IconButton
                                type="button"
                                aria-label={`Remover ${assignment.courseName}`}
                                color="error"
                                onClick={() => setCourseToRemove(assignment)}
                                disabled={courseSaving}
                              >
                                <Trash2 size={17} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  />
                </div>
              </>
            )}
            {tab === tabNotifications && (
              <NotificationNumberFields
                values={form}
                errorFor={visibleError}
                onChange={(field, value) => setField(field, value)}
              />
            )}
          </div>
          <div className="cacoin-student-form-actions">
            {tab > TAB_PERSONAL && (
              <Button
                type="button"
                startIcon={<ChevronLeft size={17} />}
                onClick={() => setTab((current) => current - 1)}
                disabled={saving}
              >
                Anterior
              </Button>
            )}
            {tab < TAB_CERTIFICATION
              || (tab === TAB_CERTIFICATION && !hasCourseTab)
              || (tab === TAB_COURSE && hasCourseTab) ? (
                <Button
                  type="button"
                  variant="contained"
                  endIcon={<ChevronRight size={17} />}
                  onClick={() => {
                    const fields = tab === TAB_PERSONAL
                      ? personalFields
                      : tab === TAB_ADDRESS
                        ? addressFields
                        : tab === TAB_TRAINING
                          ? ['entryYear', 'completionYear']
                          : tab === TAB_CERTIFICATION
                            ? ['certificate', 'cv']
                            : [];
                    if (!validateFields(fields)) return;
                    setError('');
                    setTab((current) => current + 1);
                  }}
                >
                  Continuar
                </Button>
              ) : tab === TAB_CERTIFICATION && hasCourseTab ? (
                <Button
                  type="submit"
                  variant="contained"
                  endIcon={saving ? <CircularProgress size={16} color="inherit" /> : <ChevronRight size={17} />}
                  disabled={saving}
                >
                  {saving ? 'A guardar…' : 'Guardar e continuar'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={saving
                    ? <CircularProgress size={16} color="inherit" />
                    : <UserPlus size={17} />}
                  disabled={saving}
                >
                  {saving
                    ? 'A guardar…'
                    : staff ? 'Guardar alterações' : 'Inscrever funcionário'}
                </Button>
              )}
          </div>
        </form>
      )}
      <Dialog
        open={Boolean(courseToView)}
        onClose={() => setCourseToView(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Detalhes do curso</DialogTitle>
        <DialogContent>
          <DetailList
            rows={[
              ['Curso', courseToView?.courseName],
              ['Categoria', courseToView?.categoryName],
              ['Nível', courseToView?.levelName],
              ['Modalidade', courseToView?.modalityName],
              ['Duração', courseToView?.durationMonths
                ? `${courseToView.durationMonths} meses`
                : '—'],
              ['Estado da associação', courseToView?.active ? 'Activo' : 'Desactivado'],
            ].map(([label, value]) => [label, value || '—'])}
          />
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setCourseToView(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(courseToRemove)}
        onClose={() => {
          if (!courseSaving) setCourseToRemove(null);
        }}
      >
        <DialogTitle>Remover associação</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende remover o curso “{courseToRemove?.courseName}” deste professor?
          O curso continuará disponível no catálogo.
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setCourseToRemove(null)} disabled={courseSaving}>
            Cancelar
          </Button>
          <Button type="button" color="error" onClick={confirmRemoveCourse} disabled={courseSaving}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
