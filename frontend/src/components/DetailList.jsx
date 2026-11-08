/** Dados de consulta em linhas «Título: valor», com o título a negrito. */
export default function DetailList({ rows }) {
  return (
    <dl className="cacoin-detail-list">
      {rows.map(([label, value]) => (
        <div key={label} className="cacoin-detail-row">
          <dt>{label}:</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
