import { RichTextEditor } from './RichTextEditor';
import { richTextToPlain } from '../utils/richText';
import './rich-text-field.css';

/** Campo de texto formatado reutilizável (especificações, descrições e mensagens). */
export default function RichTextField({
  label,
  value,
  onChange,
  required = false,
  error = '',
  resetKey = 0,
  fullWidth = true,
}) {
  return (
    <div
      className={`cacoin-rich-text-field ${error ? 'cacoin-rich-text-field-error' : ''}`.trim()}
      style={fullWidth ? { gridColumn: '1 / -1' } : undefined}
    >
      <p className="cacoin-rich-text-label">{required ? `${label} *` : label}</p>
      <RichTextEditor
        key={resetKey}
        value={value}
        onChange={onChange}
        ariaLabel={label}
        emptyAsBlank
      />
      {error && <p className="cacoin-rich-text-helper" role="alert">{error}</p>}
    </div>
  );
}

/** Célula de tabela com o texto formatado em texto simples, com scroll quando é longo. */
export function RichTextCell({ value }) {
  const text = richTextToPlain(value);
  return text ? <div className="cacoin-rich-cell">{text}</div> : '—';
}
