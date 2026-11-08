import StatusBadge from '../../components/StatusBadge';
import { getLookupRequestAttachmentUrl, getLookupRequests } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import PortalTable from '../portal/PortalTable';
import { useLookupData } from './lookupUtils';

export default function LookupRequests({ code }) {
  const { data, loading, error } = useLookupData(getLookupRequests, code);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  return (
    <>
      <div className="portal-heading">
        <h1>Pedidos</h1>
      </div>

      <section className="portal-card">
        <PortalTable
          columns={['N.º de Pedido', 'Tipo', 'Descrição', 'Anexos', 'Data', 'Estado', 'Notas']}
          rows={data.items}
          empty="Ainda não fez nenhum pedido."
          renderRow={(row) => (
            <tr key={row.id}>
              <td>{row.requestNumber}</td>
              <td>{displayText(row.typeName)}</td>
              <td>{displayText(row.description)}</td>
              <td>
                {row.attachments.length ? row.attachments.map((item) => (
                  <div key={item.id}>
                    <a href={getLookupRequestAttachmentUrl(code, item.id)} target="_blank" rel="noreferrer">
                      {item.fileName}
                    </a>
                  </div>
                )) : '—'}
              </td>
              <td>{toDisplayDate(row.requestDate)}</td>
              <td><StatusBadge label={row.statusLabel} tone={row.statusTone} /></td>
              <td>{displayText(row.notes)}</td>
            </tr>
          )}
        />
      </section>
    </>
  );
}
