import { displayGrade } from '../../utils/grade';
import { getPortalAcademics } from '../../services/api';
import { displayText } from '../../utils/displayText';
import PortalTable from './PortalTable';
import { usePortalData } from './portalUtils';

const number = displayGrade;

export default function PortalPautas() {
  const { data, loading, error } = usePortalData(getPortalAcademics);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const latest = data.pautas[0];

  return (
    <>
      <div className="portal-heading">
        <h1>Pautas</h1>
      </div>

      <div className="portal-stats">
        {[
          ['Pautas', data.pautas.length],
          ['Última média', latest ? number(latest.finalAverage) : '—'],
          ['Último resultado', latest ? displayText(latest.result) : '—'],
        ].map(([label, value]) => (
          <div className="portal-stat" key={label}>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="portal-card">
        <PortalTable
          columns={['Ano', 'Curso', 'Categoria', 'Nível', 'Modalidade', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'Freq.', 'Exame 1', 'Exame 2', 'Trabalho', 'Média', 'Resultado']}
          rows={data.pautas}
          empty="Ainda não existem pautas."
          renderRow={(row) => (
            <tr key={row.id ?? row.academicYear}>
              <td>{row.academicYear}</td>
              <td>{displayText(row.courseName)}</td>
              <td>{displayText(row.categoryName)}</td>
              <td>{displayText(row.levelName)}</td>
              <td>{displayText(row.modalityName)}</td>
              <td>{number(row.t1)}</td>
              <td>{number(row.t2)}</td>
              <td>{number(row.t3)}</td>
              <td>{number(row.t4)}</td>
              <td>{number(row.t5)}</td>
              <td>{number(row.t6)}</td>
              <td>{number(row.frequency)}</td>
              <td>{number(row.exam1)}</td>
              <td>{number(row.exam2)}</td>
              <td>{number(row.work)}</td>
              <td><strong>{number(row.finalAverage)}</strong></td>
              <td>{displayText(row.result)}</td>
            </tr>
          )}
        />
      </section>
    </>
  );
}
