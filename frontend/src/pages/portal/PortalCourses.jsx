import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { RichTextViewer } from '../../components/RichTextEditor';
import {
  getPortalAcademics,
  getPortalCourse,
  getPortalModule,
  getPortalProfile,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import PortalTable from './PortalTable';
import { errorMessage, usePortalData } from './portalUtils';

const unitsTitles = { modules: 'Módulos', disciplines: 'Disciplinas', teachers: 'Professores' };

const formatDuration = (months) => (months ? `${months} ${months === 1 ? 'mês' : 'meses'}` : '—');

const registrationStatus = (status) => (
  status === 'PAID' ? 'Pago' : status === 'FREE' ? 'Sem taxa de cobrança' : 'Pendente'
);

function RegistrationTable({ rows, label }) {
  return (
    <PortalTable
      columns={[label, 'Data', 'Valor', 'Pago', 'Saldo', 'Estado']}
      rows={rows}
      empty="Sem inscrições."
      renderRow={(row) => (
        <tr key={row.id}>
          <td>{displayText(row.testType ?? row.examType)}</td>
          <td>{toDisplayDate(row.registrationDate)}</td>
          <td>{row.status === 'FREE' ? '—' : formatMoney(row.amount)}</td>
          <td>{row.status === 'FREE' ? '—' : formatMoney(row.paidAmount)}</td>
          <td>{row.status === 'FREE' ? '—' : formatMoney(row.balance)}</td>
          <td>{registrationStatus(row.status)}</td>
        </tr>
      )}
    />
  );
}

export default function PortalCourses() {
  const profile = usePortalData(getPortalProfile);
  const academics = usePortalData(getPortalAcademics);
  const courseInfo = usePortalData(getPortalCourse);
  const [tab, setTab] = useState('tests');
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [unitsTab, setUnitsTab] = useState('modules');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [detailsModule, setDetailsModule] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  if (profile.loading || academics.loading || courseInfo.loading) {
    return <p className="portal-loading">A carregar…</p>;
  }
  if (profile.error || academics.error || courseInfo.error) {
    return <p className="portal-error">{profile.error || academics.error || courseInfo.error}</p>;
  }

  const course = profile.data;
  const info = courseInfo.data;

  const openUnits = () => {
    setUnitsTab('modules');
    setUnitsOpen(true);
  };

  const openDetails = async (module) => {
    setDetailsOpen(true);
    setDetailsModule(null);
    setDetailsTarget(module);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      setDetailsModule(await getPortalModule(module.id));
    } catch (loadError) {
      setDetailsError(errorMessage(loadError));
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <>
      <div className="portal-heading">
        <h1>Cursos</h1>
      </div>

      <section className="portal-card">
        <PortalTable
          columns={['Curso', 'Categoria', 'Nível', 'Modalidade', 'Duração', 'Data de inscrição', 'Ações']}
          rows={[course]}
          renderRow={(row) => (
            <tr key={row.code}>
              <td>{displayText(row.courseName)}</td>
              <td>{displayText(row.categoryName)}</td>
              <td>{displayText(row.levelName)}</td>
              <td>{displayText(row.modalityName)}</td>
              <td>{formatDuration(info.durationMonths)}</td>
              <td>{row.enrollmentDate ? toDisplayDate(row.enrollmentDate) : '—'}</td>
              <td>
                <button
                  type="button"
                  className="portal-icon-button"
                  title="Ver módulos, disciplinas e professores"
                  aria-label={`Ver módulos, disciplinas e professores do curso ${displayText(row.courseName)}`}
                  onClick={openUnits}
                  disabled={!info.courseId}
                >
                  <Eye size={17} aria-hidden="true" />
                </button>
              </td>
            </tr>
          )}
        />
      </section>

      <section className="portal-card">
        <h2>Inscrições</h2>
        <div className="portal-tabs">
          <button type="button" className={`portal-tab${tab === 'tests' ? ' active' : ''}`} onClick={() => setTab('tests')}>
            Testes
          </button>
          <button type="button" className={`portal-tab${tab === 'exams' ? ' active' : ''}`} onClick={() => setTab('exams')}>
            Exames
          </button>
        </div>
        {tab === 'tests'
          ? <RegistrationTable rows={academics.data.testRegistrations} label="Tipo de teste" />
          : <RegistrationTable rows={academics.data.examRegistrations} label="Tipo de exame" />}
      </section>

      <Dialog open={unitsOpen} onClose={() => setUnitsOpen(false)} fullWidth maxWidth="md" disablePortal>
        <DialogTitle>
          {unitsTitles[unitsTab]} — {displayText(info.courseName)}
        </DialogTitle>
        <DialogContent>
          <div className="portal-tabs">
            <button
              type="button"
              className={`portal-tab${unitsTab === 'modules' ? ' active' : ''}`}
              onClick={() => setUnitsTab('modules')}
            >
              Módulos
            </button>
            <button
              type="button"
              className={`portal-tab${unitsTab === 'disciplines' ? ' active' : ''}`}
              onClick={() => setUnitsTab('disciplines')}
            >
              Disciplinas
            </button>
            <button
              type="button"
              className={`portal-tab${unitsTab === 'teachers' ? ' active' : ''}`}
              onClick={() => setUnitsTab('teachers')}
            >
              Professores
            </button>
          </div>
          {unitsTab === 'modules' ? (
            <PortalTable
              columns={['N.º', 'Módulo', 'Nome', 'Ações']}
              rows={info.modules}
              empty="Este curso ainda não tem módulos."
              renderRow={(module, index) => (
                <tr key={module.id}>
                  <td>{index + 1}</td>
                  <td>Módulo {module.moduleNumber}</td>
                  <td>{displayText(module.name)}</td>
                  <td>
                    <button
                      type="button"
                      className="portal-icon-button"
                      title="Ver detalhes do módulo"
                      aria-label={`Ver detalhes do módulo ${module.moduleNumber}`}
                      onClick={() => openDetails(module)}
                    >
                      <Eye size={17} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              )}
            />
          ) : unitsTab === 'disciplines' ? (
            <PortalTable
              columns={['N.º', 'Disciplina']}
              rows={info.disciplines}
              empty="Este curso ainda não tem disciplinas."
              renderRow={(discipline, index) => (
                <tr key={discipline.id}>
                  <td>{index + 1}</td>
                  <td>{displayText(discipline.name)}</td>
                </tr>
              )}
            />
          ) : (
            <PortalTable
              columns={['N.º', 'Professor']}
              rows={info.teachers}
              empty="Este curso ainda não tem professores associados."
              renderRow={(teacher, index) => (
                <tr key={`${teacher}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{teacher}</td>
                </tr>
              )}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUnitsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="md" disablePortal>
        <DialogTitle>
          {detailsModule
            ? `Módulo ${detailsModule.moduleNumber}: ${displayText(detailsModule.name)}`
            : detailsTarget
              ? `Módulo ${detailsTarget.moduleNumber}: ${displayText(detailsTarget.name)}`
              : 'Detalhes do módulo'}
        </DialogTitle>
        <DialogContent>
          {detailsError && <Alert severity="error" sx={{ mb: 2 }}>{detailsError}</Alert>}
          {detailsLoading && <p>A carregar detalhes…</p>}
          {detailsModule && (
            <>
              <p className="portal-dialog-eyebrow">{displayText(detailsModule.courseName)}</p>
              <RichTextViewer value={detailsModule.details} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
