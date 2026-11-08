import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import StatusBadge from '../../components/StatusBadge';
import { getLookupOnlineClasses } from '../../services/api';
import { displayText } from '../../utils/displayText';
import PortalTable from '../portal/PortalTable';
import { useLookupData } from './lookupUtils';
import { formatDateTime } from '../../utils/date';

const platforms = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  TEAMS: 'Microsoft Teams',
  OTHER: 'Outro',
};

const materialTypes = {
  LINK: 'Link externo',
  RECORDING: 'Gravação',
  DOCUMENT: 'Documento',
  VIDEO: 'Vídeo',
};

const recurrences = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
};

const lessonState = (lesson, now) => {
  if (now < new Date(lesson.startAt).getTime()) return { label: 'Agendada', tone: 'pending' };
  if (now < new Date(lesson.endAt).getTime()) return { label: 'Em direto', tone: 'paid' };
  return { label: 'Concluída', tone: 'neutral' };
};

export default function LookupOnlineClasses({ code }) {
  const { data, loading, error } = useLookupData(getLookupOnlineClasses, code);
  const [selected, setSelected] = useState(null);
  const now = Date.now();

  const lessons = useMemo(() => {
    const items = data?.lessons ?? [];
    const time = Date.now();
    const byStart = (a, b) => new Date(a.startAt) - new Date(b.startAt);
    const upcoming = items.filter((lesson) => new Date(lesson.endAt).getTime() >= time).sort(byStart);
    const past = items.filter((lesson) => new Date(lesson.endAt).getTime() < time).sort((a, b) => byStart(b, a));
    return [...upcoming, ...past];
  }, [data]);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  return (
    <>
      <div className="portal-heading">
        <h1>Aulas online</h1>
      </div>

      <section className="portal-card">
        <PortalTable
          columns={['N.º', 'Aula', 'Início', 'Fim', 'Plataforma', 'Materiais', 'Estado', 'Ações']}
          rows={lessons}
          empty="Ainda não existem aulas online para o seu curso."
          renderRow={(lesson, index) => {
            const state = lessonState(lesson, now);
            return (
              <tr key={lesson.id}>
                <td>{index + 1}</td>
                <td>{lesson.title}</td>
                <td>{formatDateTime(lesson.startAt)}</td>
                <td>{formatDateTime(lesson.endAt)}</td>
                <td>{platforms[lesson.platform] ?? displayText(lesson.platform)}</td>
                <td>{lesson.materials.length}</td>
                <td><StatusBadge label={state.label} tone={state.tone} /></td>
                <td>
                  <div className="portal-row-actions">
                    <button
                      type="button"
                      className="portal-icon-button"
                      title="Ver detalhes da aula"
                      aria-label={`Ver detalhes da aula ${lesson.title}`}
                      onClick={() => setSelected(lesson)}
                    >
                      <Eye size={17} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }}
        />
      </section>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm" disablePortal>
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogContent>
          {selected && (
            <>
              <p className="portal-dialog-eyebrow">{displayText(data.courseName)}</p>
              {selected.description && <p className="portal-dialog-text">{selected.description}</p>}
              <dl className="portal-details">
                <div><dt>Início</dt><dd>{formatDateTime(selected.startAt)}</dd></div>
                <div><dt>Fim</dt><dd>{formatDateTime(selected.endAt)}</dd></div>
                <div><dt>Plataforma</dt><dd>{platforms[selected.platform] ?? displayText(selected.platform)}</dd></div>
                <div><dt>Recorrência</dt><dd>{recurrences[selected.recurrence] ?? 'Aula única'}</dd></div>
                {selected.meetingPassword && (
                  <div><dt>Código de acesso</dt><dd>{selected.meetingPassword}</dd></div>
                )}
                {selected.meetingUrl && (
                  <div><dt>Link da aula</dt><dd>{selected.meetingUrl}</dd></div>
                )}
              </dl>
              <h2 className="portal-dialog-subtitle">Materiais</h2>
              <PortalTable
                columns={['Título', 'Tipo', 'Ação']}
                rows={selected.materials}
                empty="Esta aula ainda não tem materiais."
                renderRow={(material) => (
                  <tr key={material.id}>
                    <td>
                      {material.title}
                      {material.description && (
                        <span className="portal-table-note">{material.description}</span>
                      )}
                    </td>
                    <td>{materialTypes[material.type] ?? displayText(material.type)}</td>
                    <td>
                      <a href={material.url} target="_blank" rel="noreferrer">Abrir</a>
                    </td>
                  </tr>
                )}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelected(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
