import { TextField } from '@mui/material';

export function PersonalInformationFields({
  codeLabel,
  code,
  requiredCode = false,
  renderTextField,
  renderAutocomplete,
  naturalityDistricts,
  documentTypeField = null,
  numberLabel = 'Número de BI',
  numberPlaceholder = '12 algarismos e uma letra',
  numberMaxLength = 13,
}) {
  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={requiredCode ? `${codeLabel} *` : codeLabel}
        value={code}
        disabled
        required={requiredCode}
      />
      {renderTextField('firstName', 'Nome')}
      {renderTextField('surname', 'Apelido')}
      {renderTextField('fatherName', 'Nome do Pai')}
      {renderTextField('motherName', 'Nome da Mãe')}
      {renderAutocomplete('gender', 'Género', ['M', 'F'], (value) => value, {
        noOptionsText: 'Selecione M ou F.',
      })}
      {renderTextField('birthDate', 'Data de Nascimento')}
      {documentTypeField}
      {renderTextField('biNumber', numberLabel, {
        placeholder: numberPlaceholder,
        inputProps: { maxLength: numberMaxLength },
      })}
      {renderTextField('issueDate', 'Data de Emissão')}
      {renderTextField('expiryDate', 'Data de Validade')}
      {renderTextField('nuit', 'NUIT', {
        inputProps: { maxLength: 9, inputMode: 'numeric' },
      })}
      {renderTextField('country', 'País')}
      {renderAutocomplete(
        'birthDistrict',
        'Naturalidade (distrito)',
        naturalityDistricts,
        (district) => `${district.name} — ${district.province.name}`,
        { helperText: 'Pesquise pelo distrito ou província.' },
      )}
    </>
  );
}

export function AddressFields({ form, provinces, renderTextField, renderAutocomplete }) {
  return (
    <>
      {renderAutocomplete(
        'addressProvince',
        'Província',
        provinces,
        (province) => province.name,
      )}
      {renderAutocomplete(
        'addressDistrict',
        'Distrito',
        form.addressProvince?.districts ?? [],
        (district) => district.name,
        { disabled: !form.addressProvince },
      )}
      {renderTextField('address', 'Endereço')}
      {renderTextField('phone', 'Telefone', {
        placeholder: '+258 84 123 4567',
        inputProps: { maxLength: 16, inputMode: 'tel' },
      })}
      {renderTextField('email', 'Email', { type: 'email' })}
    </>
  );
}
