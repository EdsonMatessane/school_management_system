import { getLookupServices } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import PortalTable from '../portal/PortalTable';
import { useLookupData } from './lookupUtils';

const yesNo = (value) => (value ? 'Sim' : 'Não');

export default function LookupServices({ code }) {
  const { data, loading, error } = useLookupData(getLookupServices, code);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  return (
    <>
      <div className="portal-heading">
        <h1>Serviços</h1>
      </div>
      <section className="portal-card">
        <h2>Uniforme</h2>
        <PortalTable
          columns={['Data', 'Tamanho', 'Valor', 'Pago', 'Entregue']}
          rows={data.uniforms}
          empty="Sem encomendas de uniforme."
          renderRow={(row) => (
            <tr key={row.id}>
              <td>{toDisplayDate(row.orderDate)}</td>
              <td>{displayText(row.size)}</td>
              <td>{formatMoney(row.amount)}</td>
              <td>{yesNo(row.paid)}</td>
              <td>{row.delivered ? toDisplayDate(row.deliveryDate) : 'Não'}</td>
            </tr>
          )}
        />
      </section>
      <section className="portal-card">
        <h2>Graduação</h2>
        <PortalTable
          columns={['Inscrição', 'Convidados', 'Valor', 'Pago', 'Graduado']}
          rows={data.graduations}
          empty="Sem inscrições na graduação."
          renderRow={(row) => (
            <tr key={row.id}>
              <td>{toDisplayDate(row.registrationDate)}</td>
              <td>{row.guests}</td>
              <td>{formatMoney(row.amount)}</td>
              <td>{yesNo(row.paid)}</td>
              <td>{row.graduated ? toDisplayDate(row.graduationDate) : 'Não'}</td>
            </tr>
          )}
        />
      </section>
      <section className="portal-card">
        <h2>Trancamento</h2>
        <PortalTable
          columns={['Data', 'Duração', 'Valor', 'Pago', 'Estado']}
          rows={data.suspensions}
          empty="Sem trancamentos."
          renderRow={(row) => (
            <tr key={row.id}>
              <td>{toDisplayDate(row.suspensionDate)}</td>
              <td>{row.durationMonths ? `${row.durationMonths} mês(es)` : '—'}</td>
              <td>{formatMoney(row.amount)}</td>
              <td>{yesNo(row.paid)}</td>
              <td>{row.suspended ? 'Trancado' : displayText(row.status)}</td>
            </tr>
          )}
        />
      </section>
    </>
  );
}
