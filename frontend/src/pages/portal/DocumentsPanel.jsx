import { useEffect, useState } from 'react';
import { Alert, Button } from '@mui/material';
import { FileDown } from 'lucide-react';
import DigitalCard from '../../components/DigitalCard';
import { recordPortalIssue } from '../../services/api';
import { studentCardData } from '../../utils/cardData';
import { loadCardInstitution } from '../../utils/reportHeader';
import { errorMessage, usePortalData } from './portalUtils';

/**
 * Cartão de estudante digital e carta de boas-vindas. A fotografia é colocada pela secretaria
 * (Gestão de Cartões); no portal as descargas ficam registadas e na consulta (`readOnly`) não.
 */
export default function DocumentsPanel({ loader, readOnly = false }) {
  const { data, loading, error } = usePortalData(loader);
  const [institution, setInstitution] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadCardInstitution().then(setInstitution).catch(() => setInstitution({}));
  }, []);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const card = studentCardData(data, institution);

  const letter = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { exportStudentLetter } = await import('../../utils/studentLetter');
      await exportStudentLetter(data);
      if (!readOnly) recordPortalIssue('LETTER');
    } catch (letterError) {
      setNotice({ severity: 'error', text: errorMessage(letterError) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="portal-heading">
        <h1>Cartão e carta</h1>
      </div>
      <section className="portal-card">
        <h2>Cartão de estudante</h2>
        <DigitalCard card={card} onDownloaded={readOnly ? undefined : () => recordPortalIssue('CARD')} />
      </section>
      <section className="portal-card">
        <h2>Carta de boas-vindas</h2>
        <p>
          Carta em PDF com os detalhes do seu curso (inscrição, duração e data de conclusão), as
          credenciais de acesso e o que pode fazer no portal.
        </p>
        {notice && <Alert severity={notice.severity} sx={{ mb: 2 }}>{notice.text}</Alert>}
        <Button variant="contained" startIcon={<FileDown size={16} />} onClick={letter} disabled={busy}>
          {busy ? 'A gerar…' : 'Descarregar carta (PDF)'}
        </Button>
      </section>
    </>
  );
}
