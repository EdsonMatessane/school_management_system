import { Autocomplete, TextField } from '@mui/material';
import { displayText } from '../../utils/displayText';

export default function EmployeePicker({ employees, value, onChange, disabled = false }) {
  return (
    <>
      <Autocomplete
        options={employees}
        value={value}
        onChange={(_, selected) => onChange(selected)}
        getOptionLabel={(option) => option.code ?? option.staffCode ?? ''}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        disabled={disabled}
        renderInput={(params) => (
          <TextField {...params} required label="Código do Funcionário" size="small" />
        )}
      />
      <TextField
        size="small"
        label="Nome"
        value={value ? displayText(value.name ?? value.staffName) : ''}
        disabled
      />
      <TextField
        size="small"
        label="Telefone"
        value={value ? displayText(value.phone) : ''}
        disabled
      />
      <TextField
        size="small"
        label="BI"
        value={value ? displayText(value.biNumber) : ''}
        disabled
      />
      <TextField
        size="small"
        label="NUIT"
        value={value ? displayText(value.nuit) : ''}
        disabled
      />
    </>
  );
}
