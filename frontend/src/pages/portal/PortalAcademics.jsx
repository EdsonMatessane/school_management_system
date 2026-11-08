import { displayGrade } from '../../utils/grade';
import { useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { getPortalAcademics } from '../../services/api';
import { displayText } from '../../utils/displayText';
import PortalTable from './PortalTable';
import { usePortalData } from './portalUtils';

const tabs = [
  { id: 'tests', label: 'Testes' },
  { id: 'exams', label: 'Exames' },
];

const number = displayGrade;

const summary = (rows) => {
  const graded = rows.filter((row) => !row.absent && row.grade != null && Number(row.maxGrade) > 0);
  const average = graded.length
    ? graded.reduce((sum, row) => sum + (Number(row.grade) * 100) / Number(row.maxGrade), 0) / graded.length
    : 0;
  return [
    ['Avaliações', rows.length],
    ['Com nota', graded.length],
    ['Ausências', rows.filter((row) => row.absent).length],
    ['Média', `${average.toLocaleString('pt-MZ', { maximumFractionDigits: 1 })}%`],
  ];
};

function GradeTable({ rows, empty }) {
  return (
    <PortalTable
      columns={['Avaliação', 'Unidade', 'Nota', 'Estado', 'Observações']}
      rows={rows}
      empty={empty}
      renderRow={(row, index) => {
        const percent = row.grade != null && Number(row.maxGrade) > 0
          ? Math.min(100, (Number(row.grade) * 100) / Number(row.maxGrade)) : 0;
        return (
          <tr key={`${row.name}-${index}`}>
            <td>{displayText(row.name)}</td>
            <td>{displayText(row.unit)}</td>
            <td>
              {row.absent ? '—' : (
                <div className="portal-grade">
                  <strong>{number(row.grade)}/{number(row.maxGrade)}</strong>
                  <div className="portal-bar" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
                </div>
              )}
            </td>
            <td>
              <StatusBadge
                label={row.absent ? 'Ausente' : row.completed ? 'Concluído' : 'Em curso'}
                tone={row.absent ? 'rejected' : row.completed ? 'paid' : 'pending'}
              />
            </td>
            <td>{displayText(row.observations)}</td>
          </tr>
        );
      }}
    />
  );
}

export default function PortalAcademics() {
  const { data, loading, error } = usePortalData(getPortalAcademics);
  const [tab, setTab] = useState('tests');

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const rows = tab === 'tests' ? data.tests : data.exams;

  return (
    <>
      <div className="portal-heading">
        <h1>Notas</h1>
      </div>

      <div className="portal-stats">
        {summary(rows).map(([label, value]) => (
          <div className="portal-stat" key={label}>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="portal-card">
        <div className="portal-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`portal-tab${tab === item.id ? ' active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <GradeTable
          rows={rows}
          empty={tab === 'tests' ? 'Ainda não existem notas de testes.' : 'Ainda não existem notas de exames.'}
        />
      </section>
    </>
  );
}
