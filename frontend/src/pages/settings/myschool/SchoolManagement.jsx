import { systemDate } from '../../../utils/systemDate';
import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Save, UserRound, X } from 'lucide-react';
import { Alert, Autocomplete, Button, Tab, Tabs, TextField } from '@mui/material';
import {
  getInstitutionWebsite,
  getMozambiqueLocations,
  getSchoolProfile,
  updateSchoolProfile,
} from '../../../services/api';
import { isPartitionBase } from '../../../utils/institution';
import { isValidWebsite } from '../../../utils/website';
import { isValidDisplayDate, maskDate, parseDisplayDate, toDisplayDate } from '../../../utils/date';

const emptyProfile = {
  institutionName: '',
  institutionSlogan: '',
  constitutionDate: '',
  institutionNuit: '',
  institutionPrimaryPhone: '',
  institutionAlternatePhone: '',
  institutionEmail: '',
  institutionAddress: '',
  institutionWebsite: '',
  representativeFirstName: '',
  representativeSurname: '',
  representativeBirthDate: '',
  representativeBiNumber: '',
  representativeIssueDate: '',
  representativeExpiryDate: '',
  representativeBirthPlace: '',
  representativeNuit: '',
  representativeProvinceCode: '',
  representativeDistrictCode: '',
  representativeAddress: '',
  representativePhone: '',
  representativeAlternatePhone: '',
  representativeEmail: '',
};
const dateFields = [
  'constitutionDate',
  'representativeBirthDate',
  'representativeIssueDate',
  'representativeExpiryDate',
];
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const validPhone = (value) => {
  const phone = value.replace(/[\s()-]/g, '');
  const local = phone.startsWith('+258') ? phone.slice(4) : phone;
  return /^(?:8[2-7]\d{7}|2[1-9]\d{6})$/.test(local);
};
const isPotentialMozambiquePhone = (value) => {
  const normalized = value.replace(/[\s()-]/g, '');
  if (normalized.startsWith('+')) {
    const digits = normalized.slice(1);
    if (digits.length <= 3) return '258'.startsWith(digits);
    if (!digits.startsWith('258')) return false;
    return isPotentialMozambiquePhone(digits.slice(3));
  }
  if (!value) return true;
  if (value.length === 1) return value === '2' || value === '8';
  if (value.startsWith('2')) return /^2[1-9]\d{0,5}$/.test(value);
  if (value.startsWith('8')) return /^8[2-7]\d{0,7}$/.test(value);
  return false;
};
const sanitizeFieldValue = (field, value) => {
  if (dateFields.includes(field)) return maskDate(value);
  if (field === 'institutionWebsite') return value.replace(/\s/g, '').slice(0, 300);
  if (field.endsWith('Nuit')) return value.replace(/\D/g, '').slice(0, 9);
  if (field === 'representativeBiNumber') {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const letter = value.replace(/[0-9\s]/g, '').replace(/[^a-z]/gi, '').slice(0, 1);
    return `${digits}${digits.length === 12 ? letter.toUpperCase() : ''}`;
  }
  if (field.toLowerCase().includes('phone')) {
    const normalized = value.replace(/[^\d+]/g, '');
    const hasInternationalPrefix = normalized.startsWith('+');
    const digits = normalized.replace(/\D/g, '');
    const candidate = hasInternationalPrefix ? `+${digits}` : digits;
    return isPotentialMozambiquePhone(candidate) ? candidate : null;
  }
  return value;
};

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = 'text',
  error,
  helperText,
  inputProps,
}) {
  const dateField = type === 'date';
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      type={dateField ? 'text' : type}
      error={Boolean(error)}
      helperText={error || helperText}
      placeholder={dateField ? 'DD/MM/AAAA' : undefined}
      slotProps={{
        htmlInput: dateField ? { inputMode: 'numeric', maxLength: 10 } : inputProps,
        ...(dateField ? { inputLabel: { shrink: true } } : {}),
      }}
    />
  );
}

export default function SchoolManagement() {
  const [tab, setTab] = useState(0);
  const [representativeTab, setRepresentativeTab] = useState(0);
  const [profile, setProfile] = useState(emptyProfile);
  const [savedProfile, setSavedProfile] = useState(emptyProfile);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [inputErrors, setInputErrors] = useState({});
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getSchoolProfile(),
      getMozambiqueLocations(),
      // O website vem do servidor (é ele que define a página inicial).
      isPartitionBase() ? Promise.resolve(null) : getInstitutionWebsite().catch(() => null),
    ])
      .then(([savedProfile, savedProvinces, website]) => {
        if (!mounted) return;
        const loadedProfile = { ...emptyProfile, ...savedProfile };
        if (website !== null) loadedProfile.institutionWebsite = website;
        dateFields.forEach((field) => {
          loadedProfile[field] = toDisplayDate(loadedProfile[field]);
        });
        setProfile(loadedProfile);
        setSavedProfile(loadedProfile);
        setEditing(!Object.values(loadedProfile).some((value) => value != null && value !== ''));
        setProvinces(savedProvinces);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedProvince = useMemo(
    () => provinces.find(({ code }) => code === profile.representativeProvinceCode),
    [profile.representativeProvinceCode, provinces],
  );
  const districtOptions = useMemo(
    () => provinces.flatMap((province) => province.districts.map((district) => ({
      ...district,
      province,
      label: `${district.name} — ${province.name}`,
    }))),
    [provinces],
  );
  const selectedBirthPlace = districtOptions.find(({ label }) => (
    label === profile.representativeBirthPlace
  )) ?? districtOptions.find(({ name }) => name === profile.representativeBirthPlace) ?? null;

  const fieldError = (field) => {
    const value = profile[field]?.trim() ?? '';
    if (!value) return '';
    if (field.endsWith('Nuit') && !/^\d{9}$/.test(value)) {
      return 'O NUIT deve conter 9 algarismos.';
    }
    if (field === 'representativeBiNumber' && !/^\d{12}[A-Za-z]$/.test(value)) {
      return 'Use 12 algarismos seguidos de uma letra.';
    }
    if (['institutionPrimaryPhone', 'institutionAlternatePhone', 'representativePhone', 'representativeAlternatePhone'].includes(field)
      && !validPhone(value)) {
      return 'Indique um número de telefone válido de Moçambique.';
    }
    if (field === 'institutionWebsite' && !isValidWebsite(value)) {
      return 'Indique um endereço de website válido (ex.: www.escola.co.mz).';
    }
    if (['institutionEmail', 'representativeEmail'].includes(field) && !emailPattern.test(value)) {
      return 'Indique um endereço de email válido.';
    }
    if (dateFields.includes(field)) {
      const date = parseDisplayDate(value);
      if (!date) return 'Use uma data válida no formato DD/MM/AAAA.';
      const todayDate = systemDate();
      const today = [
        todayDate.getFullYear(),
        String(todayDate.getMonth() + 1).padStart(2, '0'),
        String(todayDate.getDate()).padStart(2, '0'),
      ].join('-');
      if (['constitutionDate', 'representativeBirthDate', 'representativeIssueDate'].includes(field)
        && date > today) {
        return 'A data não pode estar no futuro.';
      }
      if (field === 'representativeIssueDate' && profile.representativeBirthDate) {
        const birthDate = parseDisplayDate(profile.representativeBirthDate);
        if (birthDate && date < birthDate) return 'A emissão não pode ser anterior ao nascimento.';
      }
      if (field === 'representativeExpiryDate' && profile.representativeIssueDate) {
        const issueDate = parseDisplayDate(profile.representativeIssueDate);
        if (issueDate && date <= issueDate) return 'A validade deve ser posterior à emissão.';
      }
    }
    return '';
  };
  const visibleError = (field) => (
    inputErrors[field] || (submitted || touched[field] ? fieldError(field) : '')
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    const sanitizedValue = sanitizeFieldValue(name, value);
    if (sanitizedValue === null) {
      setInputErrors((current) => ({
        ...current,
        [name]: 'Indique um número de telefone moçambicano válido.',
      }));
      setTouched((current) => ({ ...current, [name]: true }));
      return;
    }
    setProfile((current) => ({
      ...current,
      [name]: sanitizedValue,
      ...(name === 'representativeProvinceCode' ? { representativeDistrictCode: '' } : {}),
    }));
    setInputErrors((current) => ({ ...current, [name]: '' }));
    setTouched((current) => ({ ...current, [name]: true }));
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    const fieldsToValidate = [
      ...Object.keys(profile).filter((field) => field !== 'representativeBirthPlace'),
      'representativeBirthPlace',
    ];
    const invalidFields = fieldsToValidate.filter((field) => fieldError(field));
    if (invalidFields.length) {
      setTouched((current) => ({
        ...current,
        ...Object.fromEntries(fieldsToValidate.map((field) => [field, true])),
      }));
      setError('Verifique os campos assinalados antes de guardar.');
      setNotice('');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...profile };
      dateFields.forEach((field) => {
        payload[field] = isValidDisplayDate(payload[field])
          ? parseDisplayDate(payload[field])
          : null;
      });
      const savedProfile = await updateSchoolProfile(payload);
      const updatedProfile = { ...emptyProfile, ...savedProfile };
      dateFields.forEach((field) => {
        updatedProfile[field] = toDisplayDate(updatedProfile[field]);
      });
      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);
      setEditing(false);
      setTouched({});
      setInputErrors({});
      setSubmitted(false);
      setNotice('Dados da escola guardados com sucesso.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const institutionFields = [
    ['institutionName', 'Nome da Instituição'],
    ['institutionSlogan', 'Slogan'],
    ['constitutionDate', 'Data da Constituição', 'date'],
    ['institutionNuit', 'NUIT'],
    ['institutionPrimaryPhone', 'Telefone Principal', 'tel'],
    ['institutionAlternatePhone', 'Telefone Alternativo', 'tel'],
    ['institutionEmail', 'Email', 'email'],
    ['institutionAddress', 'Endereço'],
    ...(isPartitionBase() ? [] : [['institutionWebsite', 'Website']]),
  ];

  const personalFields = [
    ['representativeFirstName', 'Nome'],
    ['representativeSurname', 'Apelido'],
    ['representativeBirthDate', 'Data de Nascimento', 'date'],
    ['representativeBiNumber', 'BI'],
    ['representativeIssueDate', 'Data de Emissão', 'date'],
    ['representativeExpiryDate', 'Data de Validade', 'date'],
    ['representativeNuit', 'NUIT'],
  ];

  const addressFields = [
    ['representativeAddress', 'Endereço'],
    ['representativePhone', 'Telefone', 'tel'],
    ['representativeAlternatePhone', 'Telefone Alternativo', 'tel'],
    ['representativeEmail', 'Email', 'email'],
  ];

  const birthPlaceField = (
    <Autocomplete
      options={districtOptions}
      value={selectedBirthPlace}
      getOptionLabel={(district) => district.label}
      isOptionEqualToValue={(option, value) => (
        option.code === value.code && option.province.code === value.province.code
      )}
      onChange={(_, district) => {
        setProfile((current) => ({
          ...current,
          representativeBirthPlace: district?.label ?? '',
        }));
        setTouched((current) => ({ ...current, representativeBirthPlace: true }));
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Naturalidade"
          size="small"
          error={Boolean(visibleError('representativeBirthPlace'))}
          helperText={visibleError('representativeBirthPlace')}
        />
      )}
    />
  );

  const renderFields = (fields, extraField = null) => (
    <div className="cacoin-settings-grid">
      {fields.map(([name, label, type]) => (
        <Field
          key={name}
          name={name}
          label={label}
          type={name.toLowerCase().includes('phone') ? 'tel' : type}
          value={profile[name]}
          onChange={handleChange}
          onBlur={() => setTouched((current) => ({ ...current, [name]: true }))}
          error={visibleError(name)}
          inputProps={name.endsWith('Nuit')
            ? { maxLength: 9, inputMode: 'numeric' }
            : name === 'representativeBiNumber'
              ? { maxLength: 13 }
              : name.toLowerCase().includes('phone')
                ? { maxLength: 13, inputMode: 'tel' }
                : undefined}
        />
      ))}
      {extraField}
    </div>
  );

  const cancelEditing = () => {
    setProfile(savedProfile);
    setEditing(false);
    setTouched({});
    setInputErrors({});
    setSubmitted(false);
    setError('');
    setNotice('');
  };

  const institutionSummary = [
    ['Nome da Instituição', savedProfile.institutionName],
    ['Slogan', savedProfile.institutionSlogan],
    ['Data da Constituição', savedProfile.constitutionDate],
    ['NUIT', savedProfile.institutionNuit],
    ['Telefone Principal', savedProfile.institutionPrimaryPhone],
    ['Telefone Alternativo', savedProfile.institutionAlternatePhone],
    ['Email', savedProfile.institutionEmail],
    ['Endereço', savedProfile.institutionAddress],
    ...(isPartitionBase() ? [] : [['Website', savedProfile.institutionWebsite]]),
  ];
  const representativeSummary = [
    ['Nome', [savedProfile.representativeFirstName, savedProfile.representativeSurname]
      .filter(Boolean).join(' ')],
    ['Data de Nascimento', savedProfile.representativeBirthDate],
    ['BI', savedProfile.representativeBiNumber],
    ['Data de Emissão', savedProfile.representativeIssueDate],
    ['Data de Validade', savedProfile.representativeExpiryDate],
    ['Naturalidade', savedProfile.representativeBirthPlace],
    ['NUIT', savedProfile.representativeNuit],
    ['Província', provinces.find(
      ({ code }) => code === savedProfile.representativeProvinceCode,
    )?.name],
    ['Distrito', provinces
      .find(({ code }) => code === savedProfile.representativeProvinceCode)
      ?.districts.find(({ code }) => code === savedProfile.representativeDistrictCode)?.name],
    ['Endereço', savedProfile.representativeAddress],
    ['Telefone', savedProfile.representativePhone],
    ['Telefone Alternativo', savedProfile.representativeAlternatePhone],
    ['Email', savedProfile.representativeEmail],
  ];
  const hasSavedProfile = Object.values(savedProfile)
    .some((value) => value != null && value !== '');
  const renderSummaryCard = (title, Icon, items) => (
    <article className="cacoin-school-summary-card">
      <header>
        <Icon size={20} aria-hidden="true" />
        <h2>{title}</h2>
      </header>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </article>
  );

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-school-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Minha Escola</p>
          <h1>Escola</h1>
        </div>
        {!loading && !editing && (
          <Button variant="contained" startIcon={<Pencil size={17} />} onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      {loading ? (
        <section className="cacoin-settings-card"><p>A carregar dados da escola…</p></section>
      ) : !editing ? (
        <div className="cacoin-school-summary">
          {renderSummaryCard('Dados da Instituição', Building2, institutionSummary)}
          {renderSummaryCard('Representante Legal', UserRound, representativeSummary)}
        </div>
      ) : (
        <form className="cacoin-settings-card" onSubmit={handleSubmit}>
            <Tabs
              className="cacoin-settings-tabs"
              value={tab}
              onChange={(_, value) => setTab(value)}
              aria-label="Dados da escola"
            >
              <Tab label="Dados da Instituição" />
              <Tab label="Dados do Representante Legal" />
            </Tabs>
            {tab === 0 ? (
              <section aria-label="Dados da Instituição">
                {renderFields(institutionFields)}
              </section>
            ) : (
              <section aria-label="Dados do Representante Legal">
                <Tabs
                  className="cacoin-settings-tabs cacoin-school-subtabs"
                  value={representativeTab}
                  onChange={(_, value) => setRepresentativeTab(value)}
                  aria-label="Secções do representante legal"
                >
                  <Tab label="Dados Pessoais" />
                  <Tab label="Endereço" />
                </Tabs>
                {representativeTab === 0 ? (
                  renderFields(personalFields, birthPlaceField)
                ) : (
                  <>
                    <div className="cacoin-settings-grid">
                      <Autocomplete
                        options={provinces}
                        value={selectedProvince ?? null}
                        getOptionLabel={(province) => province.name}
                        isOptionEqualToValue={(option, value) => option.code === value.code}
                        onChange={(_, province) => {
                          setProfile((current) => ({
                            ...current,
                            representativeProvinceCode: province?.code ?? '',
                            representativeDistrictCode: '',
                          }));
                          setTouched((current) => ({
                            ...current,
                            representativeProvinceCode: true,
                            representativeDistrictCode: true,
                          }));
                          setError('');
                          setNotice('');
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Província" size="small" />
                        )}
                      />
                      <Autocomplete
                        options={selectedProvince?.districts ?? []}
                        value={selectedProvince?.districts.find(
                          ({ code }) => code === profile.representativeDistrictCode,
                        ) ?? null}
                        getOptionLabel={(district) => district.name}
                        isOptionEqualToValue={(option, value) => option.code === value.code}
                        disabled={!selectedProvince}
                        onChange={(_, district) => {
                          setProfile((current) => ({
                            ...current,
                            representativeDistrictCode: district?.code ?? '',
                          }));
                          setTouched((current) => ({ ...current, representativeDistrictCode: true }));
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Distrito" size="small" />
                        )}
                      />
                      {addressFields.map(([name, label, type]) => (
                        <Field
                          key={name}
                          name={name}
                          label={label}
                          type={type}
                          value={profile[name]}
                          onChange={handleChange}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
            <div className="cacoin-settings-actions">
              {hasSavedProfile && (
                <Button type="button" startIcon={<X size={17} />} onClick={cancelEditing} disabled={saving}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="contained" startIcon={<Save size={17} />} disabled={saving}>
                {saving ? 'A guardar…' : 'Guardar'}
              </Button>
            </div>
        </form>
      )}
    </section>
  );
}
