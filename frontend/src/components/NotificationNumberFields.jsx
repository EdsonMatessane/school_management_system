import { useMemo } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import './notification-number-fields.css';

const digitsOf = (value) => String(value ?? '').replace(/\D/g, '');

/** Números de WhatsApp e SMS com sugestão dos números já preenchidos no formulário. */
export default function NotificationNumberFields({ values, onChange, errorFor }) {
  const filled = useMemo(
    () => [...new Set(
      [values.phone, values.whatsappNumber, values.smsNumber]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    )],
    [values.phone, values.whatsappNumber, values.smsNumber],
  );

  const renderField = (field, label) => {
    const error = errorFor(field);
    return (
      <Autocomplete
        freeSolo
        size="small"
        options={filled}
        inputValue={values[field] ?? ''}
        onInputChange={(_, value) => onChange(field, value)}
        filterOptions={(options, { inputValue }) => {
          const typed = digitsOf(inputValue);
          return options.filter((option) => (
            option !== inputValue.trim() && digitsOf(option).includes(typed)
          ));
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label={label}
            placeholder="+258 84 123 4567"
            error={Boolean(error)}
            helperText={error || undefined}
            inputProps={{ ...params.inputProps, maxLength: 16, inputMode: 'tel' }}
          />
        )}
      />
    );
  };

  return (
    <div className="cacoin-notification-number-fields">
      {renderField('whatsappNumber', 'WhatsApp')}
      {renderField('smsNumber', 'SMS')}
    </div>
  );
}
