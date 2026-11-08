import { formatMoney } from '../utils/money';

/** Mostra um valor monetário no formato do sistema: 3,000.00 MZN. */
export default function Money({ value, currency, empty, className, style }) {
  return (
    <span
      className={className}
      style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...style }}
    >
      {formatMoney(value, { currency, empty })}
    </span>
  );
}
