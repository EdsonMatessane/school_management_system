import { FormControl, FormControlLabel, Radio, RadioGroup } from '@mui/material';

export const themeOptions = [
  { id: 'blue', label: 'Azul' },
  { id: 'green', label: 'Verde' },
  { id: 'purple', label: 'Roxo' },
  { id: 'dark', label: 'Escuro' },
];

export default function ThemeSelector({ value, onChange, labelledBy, name = 'theme' }) {
  return (
    <FormControl>
      <RadioGroup
        aria-labelledby={labelledBy}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cacoin-school-theme-options"
      >
        {themeOptions.map(({ id, label }) => (
          <FormControlLabel
            key={id}
            value={id}
            control={<Radio />}
            label={(
              <span className="cacoin-school-theme-label">
                <span className={`cacoin-school-theme-swatch ${id}`} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                </span>
              </span>
            )}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
