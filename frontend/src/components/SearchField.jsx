import { InputAdornment, TextField } from '@mui/material';
import { Search } from 'lucide-react';

export default function SearchField({ value, onChange, width = 280 }) {
  return (
    <TextField
      size="small"
      label="Pesquisar"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ width, maxWidth: '100%' }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} aria-hidden="true" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
