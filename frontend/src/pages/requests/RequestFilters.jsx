import { useMemo } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { ClipboardList } from 'lucide-react';
import { displayText } from '../../utils/displayText';

const fields = [
  { key: 'courseId', label: 'Curso', id: 'courseId', name: 'courseName' },
  { key: 'categoryId', label: 'Categoria', id: 'categoryId', name: 'categoryName' },
  { key: 'levelId', label: 'Nível', id: 'levelId', name: 'levelName' },
  { key: 'modalityId', label: 'Modalidade', id: 'modalityId', name: 'modalityName' },
];

export default function RequestFilters({ rows, filters, onChange }) {
  const options = useMemo(() => Object.fromEntries(fields.map(({ key, id, name }) => {
    const unique = new Map();
    rows.forEach((item) => unique.set(String(item[id]), displayText(item[name])));
    return [key, [...unique].map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-MZ'))];
  })), [rows]);

  return (
    <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-filters">
      <header>
        <div>
          <h2>Filtros</h2>
        </div>
        <ClipboardList size={20} aria-hidden="true" />
      </header>
      <div className="cacoin-tests-dashboard-filter-grid">
        {fields.map(({ key, label }) => (
          <TextField
            key={key}
            select
            size="small"
            label={label}
            value={filters[key]}
            onChange={(event) => {
              const value = event.target.value;
              const course = key === 'courseId' && value
                ? rows.find((item) => String(item.courseId) === value)
                : null;
              onChange(key === 'courseId'
                ? {
                  ...filters,
                  courseId: value,
                  categoryId: course ? String(course.categoryId) : '',
                  levelId: course ? String(course.levelId) : '',
                  modalityId: course ? String(course.modalityId) : '',
                }
                : { ...filters, [key]: value });
            }}
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
          >
            <MenuItem value="">Todos</MenuItem>
            {options[key].map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        ))}
      </div>
    </section>
  );
}
