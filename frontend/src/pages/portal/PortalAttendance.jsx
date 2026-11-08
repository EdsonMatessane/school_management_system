import { Alert } from '@mui/material';
import StatusBadge from '../../components/StatusBadge';
import { getPortalAttendance } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import { justificationLabels } from '../attendances/attendanceUtils';
import PortalTable from './PortalTable';
import { attendanceLabel, usePortalData } from './portalUtils';

export default function PortalAttendance() {
  const { data, loading, error } = usePortalData(getPortalAttendance);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  return (
    <>
      <div className="portal-heading">
        <h1>Presenças</h1>
      </div>
      {data.exceeded && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {data.warning}
          {' '}
          ({data.unjustified} faltas injustificadas, limite {data.maxAbsences})
        </Alert>
      )}
      <section className="portal-card">
        <div className="portal-stats">
          {[
            ['Registos', data.total],
            ['Presenças', data.present],
            ['Faltas', data.absent],
            ['Justificadas', data.justified],
            ['Injustificadas', data.unjustified],
            ...(data.maxAbsences == null ? [] : [['Limite de faltas', data.maxAbsences]]),
            ['Taxa de presença', `${Number(data.rate).toLocaleString('pt-MZ', { maximumFractionDigits: 1 })}%`],
          ].map(([label, value]) => (
            <div className="portal-stat" key={label}>
              <div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="portal-card">
        <PortalTable
          columns={['Data', 'Curso', 'Professor', 'Estado', 'Justificação', 'Taxa']}
          rows={data.records}
          empty="Ainda não existem presenças registadas."
          renderRow={(row) => {
            const state = attendanceLabel(row);
            return (
              <tr key={row.id}>
                <td>{toDisplayDate(row.date)}</td>
                <td>{displayText(row.courseName)}</td>
                <td>{displayText(row.teacherName)}</td>
                <td><StatusBadge label={state.label} tone={state.tone} /></td>
                <td>{row.status === 'ABSENT' ? justificationLabels[row.justification] ?? '—' : '—'}</td>
                <td>{row.justificationFee ? formatMoney(row.justificationFee) : '—'}</td>
              </tr>
            );
          }}
        />
      </section>
    </>
  );
}
