export default function PortalTable({ columns, rows, empty = 'Sem registos.', renderRow }) {
  if (!rows.length) return <p className="portal-empty">{empty}</p>;
  return (
    <div className="portal-table-wrap">
      <table className="portal-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}
