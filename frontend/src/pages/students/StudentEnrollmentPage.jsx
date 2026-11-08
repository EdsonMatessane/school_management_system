import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { ChevronLeft, ChevronRight, UserPlus, X } from 'lucide-react';
import {
  createStudentEnrollment,
  getCourses,
  getMozambiqueLocations,
  getSystemSettings,
  updateStudent,
} from '../../services/api';
import { maskDate, parseDisplayDate, toDisplayDate } from '../../utils/date';
import { formatMoney as formatMoneyValue } from '../../utils/money';
import { dateFields, getFieldError, maskBiNumber, maskDigits } from '../../utils/personForm';
import NotificationNumberFields from '../../components/NotificationNumberFields';
import { AddressFields, PersonalInformationFields } from '../../components/PersonFormFields';

const initialForm = {
  firstName: '',
  surname: '',
  fatherName: '',
  motherName: '',
  gender: null,
  birthDate: '',
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
  whatsappNumber: '',
  smsNumber: '',
  category: null,
  level: null,
  modality: null,
  course: null,
};

const personalFields = [
  'studentCode', 'firstName', 'surname', 'fatherName', 'motherName', 'gender', 'birthDate',
  'biNumber', 'nuit', 'issueDate', 'expiryDate', 'country', 'birthDistrict',
];
const addressFields = [
  'addressProvince', 'addressDistrict', 'address', 'phone', 'email',
];
const notificationFields = ['whatsappNumber', 'smsNumber'];
const courseFields = [
  'course', 'category', 'level', 'modality', 'durationMonths', 'monthlyFeeAmount',
  'monthlyFeeType', 'enrollmentFeeAmount', 'enrollmentFeeType', 'manualFeeType',
  'manualFeeAmount',
];
const fieldLabels = {
  studentCode: 'Código do Estudante',
  birthDistrict: 'Naturalidade',
  addressProvince: 'Província',
  addressDistrict: 'Distrito',
  course: 'Curso',
  category: 'Categoria',
  level: 'Nível',
  modality: 'Modalidade',
  durationMonths: 'Duração',
  monthlyFeeAmount: 'Mensalidade',
  monthlyFeeType: 'Tipo de Mensalidade',
  enrollmentFeeAmount: 'Taxa de Inscrição',
  enrollmentFeeType: 'Tipo de Taxa de Inscrição',
  manualFeeType: 'Tipo de Valor do Manual',
  manualFeeAmount: 'Valor do Manual',
};

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a inscrição.';

const formatMoney = (amount) => formatMoneyValue(amount, { empty: '' });

const formatDuration = (months) => {
  if (!months) return '';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years && remainingMonths) {
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  }
  if (years) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
};

const uniqueCourseOptions = (courses, idKey, nameKey) => (
  [...new Map(courses.map((course) => [
    course[idKey],
    { id: course[idKey], name: course[nameKey] },
  ])).values()]
);

const sameName = (left, right) => (
  left?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  === right?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
);

const findDistrict = (provinces, provinceName, districtName) => {
  const province = provinces.find((item) => sameName(item.name, provinceName));
  const district = province?.districts.find((item) => sameName(item.name, districtName));
  return district ? { ...district, province } : null;
};

export default function StudentEnrollmentPage({ student, onCancel, onEnrolled, onUpdated }) {
  const [form, setForm] = useState(initialForm);
  const [courses, setCourses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [tab, setTab] = useState(0);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requiredStudentFields, setRequiredStudentFields] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getMozambiqueLocations(), getSystemSettings()])
      .then(([loadedCourses, loadedProvinces, systemSettings]) => {
        if (!mounted) return;
        setRequiredStudentFields(systemSettings.requiredStudentFields ?? []);
        setCourses(loadedCourses.filter((course) => (
          course.active || course.id === student?.courseId
        )));
        setProvinces(loadedProvinces);
        if (student) {
          const birthDistrict = findDistrict(
            loadedProvinces,
            student.birthProvince,
            student.birthDistrict,
          );
          const addressProvince = loadedProvinces.find(
            (province) => sameName(province.name, student.addressProvince),
          ) ?? null;
          const addressDistrict = addressProvince?.districts.find(
            (district) => sameName(district.name, student.addressDistrict),
          ) ?? null;
          const course = loadedCourses.find((item) => item.id === student.courseId) ?? null;
          setForm({
            firstName: student.firstName ?? '',
            surname: student.surname ?? '',
            fatherName: student.fatherName ?? '',
            motherName: student.motherName ?? '',
            gender: student.gender ?? null,
            birthDate: toDisplayDate(student.birthDate),
            biNumber: student.biNumber ?? '',
            nuit: student.nuit ?? '',
            issueDate: toDisplayDate(student.issueDate),
            expiryDate: toDisplayDate(student.expiryDate),
            country: student.country ?? '',
            birthDistrict,
            addressProvince,
            addressDistrict,
            address: student.address ?? '',
            phone: student.phone ?? '',
            email: student.email ?? '',
            whatsappNumber: student.whatsappNumber ?? '',
            smsNumber: student.smsNumber ?? '',
            category: course ? { id: course.categoryId, name: course.categoryName } : null,
            level: course ? { id: course.levelId, name: course.levelName } : null,
            modality: course ? { id: course.modalityId, name: course.modalityName } : null,
            course,
          });
        }
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
  }, [student]);

  const naturalityDistricts = useMemo(
    () => provinces.flatMap((province) => province.districts.map((district) => ({
      ...district,
      province,
    }))),
    [provinces],
  );
  const categoryOptions = useMemo(
    () => uniqueCourseOptions(courses, 'categoryId', 'categoryName'),
    [courses],
  );
  const levelOptions = useMemo(
    () => uniqueCourseOptions(
      courses.filter((course) => !form.category || course.categoryId === form.category.id),
      'levelId',
      'levelName',
    ),
    [courses, form.category],
  );
  const modalityOptions = useMemo(
    () => uniqueCourseOptions(
      courses.filter((course) => (
        (!form.category || course.categoryId === form.category.id)
        && (!form.level || course.levelId === form.level.id)
      )),
      'modalityId',
      'modalityName',
    ),
    [courses, form.category, form.level],
  );
  const filteredCourses = useMemo(
    () => courses.filter((course) => (
      (!form.category || course.categoryId === form.category.id)
      && (!form.level || course.levelId === form.level.id)
      && (!form.modality || course.modalityId === form.modality.id)
    )),
    [courses, form.category, form.level, form.modality],
  );

  const setField = (field, value) => {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === 'addressProvince') updated.addressDistrict = null;
      if (field === 'category') {
        updated.level = null;
        updated.modality = null;
        updated.course = null;
      }
      if (field === 'level') {
        updated.modality = null;
        updated.course = null;
      }
      if (field === 'modality') updated.course = null;
      if (field === 'course') {
        updated.category = value
          ? { id: value.categoryId, name: value.categoryName }
          : current.category;
        updated.level = value
          ? { id: value.levelId, name: value.levelName }
          : current.level;
        updated.modality = value
          ? { id: value.modalityId, name: value.modalityName }
          : current.modality;
      }
      return updated;
    });
    setTouched((current) => ({ ...current, [field]: true }));
    setError('');
  };

  const selectedCourse = form.course;
  const valueForField = (field) => {
    const values = {
      studentCode: student?.studentCode ?? 'Gerado após guardar',
      birthDistrict: form.birthDistrict?.code,
      addressProvince: form.addressProvince?.code,
      addressDistrict: form.addressDistrict?.code,
      course: selectedCourse?.id,
      category: form.category?.id,
      level: form.level?.id,
      modality: form.modality?.id,
      durationMonths: selectedCourse?.durationMonths,
      monthlyFeeAmount: selectedCourse?.monthlyFeeAmount,
      monthlyFeeType: selectedCourse?.monthlyFeeType,
      enrollmentFeeAmount: selectedCourse?.enrollmentFeeAmount,
      enrollmentFeeType: selectedCourse?.enrollmentFeeType,
      manualFeeType: selectedCourse?.manualFeeType,
      manualFeeAmount: selectedCourse?.manualFeeAmount,
    };
    return Object.hasOwn(values, field) ? values[field] : form[field];
  };

  const fieldError = (field) => {
    const value = valueForField(field);
    const missingRequiredValue = value == null
      || typeof value === 'string' && value.trim() === '';
    if (requiredStudentFields.includes(field) && missingRequiredValue) {
      const label = fieldLabels[field] ?? field;
      return `O campo "${label}" é obrigatório.`;
    }
    return getFieldError(field, value, form);
  };

  const visibleError = (field) => (
    submitted || touched[field] ? fieldError(field) : ''
  );

  const markFieldsTouched = (fields) => {
    setTouched((current) => ({
      ...current,
      ...Object.fromEntries(fields.map((field) => [field, true])),
    }));
  };

  const validateFields = (fields) => {
    markFieldsTouched(fields);
    return fields.every((field) => !fieldError(field));
  };

  const nextTab = () => {
    const fields = tab === 0 ? personalFields : tab === 1 ? addressFields : courseFields;
    if (validateFields(fields)) setTab((current) => Math.min(current + 1, 3));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const allFields = [
      ...personalFields, ...addressFields, ...courseFields, ...notificationFields,
    ];
    if (!validateFields(allFields)) {
      const firstInvalidTab = personalFields.some((field) => fieldError(field))
        ? 0
        : addressFields.some((field) => fieldError(field))
          ? 1
          : courseFields.some((field) => fieldError(field)) ? 2 : 3;
      setTab(firstInvalidTab);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const request = {
        firstName: form.firstName,
        surname: form.surname,
        fatherName: form.fatherName,
        motherName: form.motherName,
        gender: form.gender,
        birthDate: parseDisplayDate(form.birthDate),
        biNumber: form.biNumber.trim(),
        nuit: form.nuit.trim(),
        issueDate: parseDisplayDate(form.issueDate),
        expiryDate: parseDisplayDate(form.expiryDate),
        country: form.country,
        birthProvinceCode: form.birthDistrict?.province.code ?? null,
        birthDistrictCode: form.birthDistrict?.code ?? null,
        addressProvinceCode: form.addressProvince?.code ?? null,
        addressDistrictCode: form.addressDistrict?.code ?? null,
        address: form.address,
        phone: form.phone,
        email: form.email,
        whatsappNumber: form.whatsappNumber,
        smsNumber: form.smsNumber,
        courseId: form.course?.id ?? null,
      };
      const result = student
        ? await updateStudent(student.id, request)
        : await createStudentEnrollment(request);
      if (student) onUpdated(result.studentCode);
      else onEnrolled(result.studentCode);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const renderTextField = (field, label, options = {}) => {
    const validationError = visibleError(field);
    const dateField = dateFields.has(field);
    const displayLabel = requiredStudentFields.includes(field) ? `${label} *` : label;
    return (
      <TextField
        fullWidth
        size="small"
        label={displayLabel}
        value={form[field] ?? ''}
        onChange={(event) => setField(
          field,
          dateField
            ? maskDate(event.target.value)
            : field === 'nuit'
              ? maskDigits(event.target.value, 9)
              : field === 'biNumber'
                ? maskBiNumber(event.target.value)
                : event.target.value,
        )}
        error={Boolean(validationError)}
        helperText={validationError || options.helperText}
        placeholder={dateField ? 'DD/MM/AAAA' : options.placeholder}
        slotProps={{ htmlInput: options.inputProps }}
        type={options.type ?? 'text'}
      />
    );
  };

  const renderAutocomplete = (field, label, options, getOptionLabel, optionProps = {}) => {
    const validationError = visibleError(field);
    const displayLabel = requiredStudentFields.includes(field) ? `${label} *` : label;
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
            label={displayLabel}
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
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{student ? 'Editar estudante' : 'Inscrever'}</h1>
        </div>
        {student && (
          <Button startIcon={<X size={17} />} onClick={onCancel}>
            Cancelar edição
          </Button>
        )}
      </header>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <CircularProgress size={24} aria-label="A carregar dados da inscrição" />
      ) : (
        <form className="cacoin-student-form-card" onSubmit={submit}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            aria-label="Separadores dos dados do estudante"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Dados Pessoais" />
            <Tab label="Endereço" />
            <Tab label="Detalhes do Curso" />
            <Tab label="Notificações" />
          </Tabs>

          <div className="cacoin-course-form-grid">
            {tab === 0 && (
              <PersonalInformationFields
                codeLabel="Código do Estudante"
                code={student?.studentCode ?? 'Gerado após guardar'}
                requiredCode={requiredStudentFields.includes('studentCode')}
                renderTextField={renderTextField}
                renderAutocomplete={renderAutocomplete}
                naturalityDistricts={naturalityDistricts}
              />
            )}

            {tab === 1 && (
              <AddressFields
                form={form}
                provinces={provinces}
                renderTextField={renderTextField}
                renderAutocomplete={renderAutocomplete}
              />
            )}

            {tab === 2 && (
              <>
                {renderAutocomplete(
                  'course',
                  'Curso',
                  filteredCourses,
                  (course) => course.name,
                  {
                    noOptionsText: 'Não existem cursos compatíveis com as opções selecionadas.',
                    disableClearable: Boolean(student?.courseId),
                  },
                )}
                {renderAutocomplete(
                  'category',
                  'Categoria',
                  categoryOptions,
                  (option) => option.name,
                )}
                {renderAutocomplete(
                  'level',
                  'Nível',
                  levelOptions,
                  (option) => option.name,
                  { disabled: !form.category },
                )}
                {renderAutocomplete(
                  'modality',
                  'Modalidade',
                  modalityOptions,
                  (option) => option.name,
                  { disabled: !form.level },
                )}
                <TextField
                  fullWidth
                  size="small"
                  label="Duração"
                  value={formatDuration(selectedCourse?.durationMonths)}
                  disabled
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Mensalidade"
                  value={formatMoney(selectedCourse?.monthlyFeeAmount)}
                  disabled
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Tipo de Mensalidade"
                  value={selectedCourse?.monthlyFeeType ?? ''}
                  disabled
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Taxa de Inscrição"
                  value={formatMoney(selectedCourse?.enrollmentFeeAmount)}
                  disabled
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Tipo de Taxa de Inscrição"
                  value={selectedCourse?.enrollmentFeeType ?? ''}
                  disabled
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Tipo de Valor do Manual"
                  value={selectedCourse?.manualFeeType ?? ''}
                  disabled
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Valor do Manual"
                  value={formatMoney(selectedCourse?.manualFeeAmount)}
                  disabled
                />
              </>
            )}
            {tab === 3 && (
              <NotificationNumberFields
                values={form}
                errorFor={visibleError}
                onChange={(field, value) => {
                  setForm((current) => ({ ...current, [field]: value }));
                  setTouched((current) => ({ ...current, [field]: true }));
                }}
              />
            )}
          </div>

          <div className="cacoin-student-form-actions">
            {tab > 0 && (
              <Button
                type="button"
                startIcon={<ChevronLeft size={17} />}
                onClick={() => setTab((current) => current - 1)}
                disabled={saving}
              >
                Anterior
              </Button>
            )}
            {tab < 3 ? (
              <Button
                type="button"
                variant="contained"
                endIcon={<ChevronRight size={17} />}
                onClick={nextTab}
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <UserPlus size={17} />}
                disabled={saving}
              >
                {saving
                  ? student ? 'A guardar alterações…' : 'A inscrever…'
                  : student ? 'Guardar alterações' : 'Inscrever estudante'}
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
