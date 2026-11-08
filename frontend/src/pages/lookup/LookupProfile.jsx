import { getLookupProfile } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { useLookupData } from './lookupUtils';

export default function LookupProfile({ code }) {
  const { data, loading, error } = useLookupData(getLookupProfile, code);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const sections = [
    ['Dados Pessoais', [
      ['Código', data.code],
      ['Nome', data.name],
      ['BI', data.bi],
      ['Telefone', data.phone],
      ['Email', data.email],
    ]],
    ['Inscrição', [
      ['Curso', data.courseName],
      ['Categoria', data.categoryName],
      ['Nível', data.levelName],
      ['Modalidade', data.modalityName],
      ['Data de inscrição', data.enrollmentDate ? toDisplayDate(data.enrollmentDate) : ''],
      ['Estado da matrícula', data.enrollmentStatus],
    ]],
  ];

  return (
    <>
      <div className="portal-heading">
        <h1>Minha informação</h1>
      </div>

      <section className="portal-card portal-info">
        {sections.map(([title, rows], index) => (
          <div key={title}>
            {index > 0 && <div className="portal-info-rule" aria-hidden="true">{'='.repeat(32)}</div>}
            <h2>{title}</h2>
            {rows.map(([label, value]) => (
              <p key={label}>{label}: {value ?? ''}</p>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}
