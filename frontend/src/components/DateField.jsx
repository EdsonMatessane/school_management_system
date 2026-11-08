import { useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';
import {
  maskDate,
  maskDateTime,
  parseDisplayDate,
  parseDisplayDateTime,
  toDisplayDate,
  toDisplayDateTime,
} from '../utils/date';

const modes = {
  date: {
    mask: maskDate,
    parse: parseDisplayDate,
    display: toDisplayDate,
    length: 10,
    pattern: '\\d{2}/\\d{2}/\\d{4}',
  },
  datetime: {
    mask: maskDateTime,
    parse: parseDisplayDateTime,
    display: toDisplayDateTime,
    length: 16,
    pattern: '\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}',
  },
};

export function DateInput({ mode = 'date', value, onChange, error, slotProps, inputProps, ...rest }) {
  const config = modes[mode];
  const [text, setText] = useState(() => config.display(value));
  const inputRef = useRef(null);

  useEffect(() => {
    const current = config.parse(text) ?? '';
    if ((value || '') !== current) setText(value ? config.display(value) : '');
  }, [value]);

  const invalid = text.length === config.length && !config.parse(text);

  useEffect(() => {
    inputRef.current?.setCustomValidity(text && !config.parse(text) ? 'Data inválida' : '');
  }, [text]);

  const change = (event) => {
    const masked = config.mask(event.target.value);
    setText(masked);
    onChange?.({ target: { name: rest.name, value: config.parse(masked) ?? '' } });
  };

  return (
    <TextField
      size="small"
      {...rest}
      inputRef={inputRef}
      value={text}
      onChange={change}
      error={Boolean(error) || invalid}
      slotProps={{
        ...slotProps,
        htmlInput: {
          inputMode: 'numeric',
          maxLength: config.length,
          pattern: config.pattern,
          ...inputProps,
          ...slotProps?.htmlInput,
        },
      }}
    />
  );
}

/** Campo de data do sistema: mostra e aceita DD/MM/AAAA; o valor (value/onChange) é AAAA-MM-DD. */
export default function DateField(props) {
  return <DateInput mode="date" {...props} />;
}

/** Campo de data e hora: mostra e aceita DD/MM/AAAA HH:MM; o valor é AAAA-MM-DDTHH:mm. */
export function DateTimeField(props) {
  return <DateInput mode="datetime" {...props} />;
}
