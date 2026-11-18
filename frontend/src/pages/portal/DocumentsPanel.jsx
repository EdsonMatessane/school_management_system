import { useEffect, useState } from 'react';
import { Alert, Button } from '@mui/material';
import { FileDown } from 'lucide-react';
import DigitalCard from '../../components/DigitalCard';
import { getInstitutionProfile } from '../../services/api';
import { studentCardData } from '../../utils/cardData';
import { errorMessage, usePortalData } from './portalUtils';

/** Cartão de estudante digital e carta de boas-vindas (portal do estudante e consulta). */
export default function DocumentsPanel({ loader }) {
  const { data, loading, error } = usePortalData(loader);
  const [institution, setInstitution] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInstitutionProfile().then(setInstitution).catch(() => setInstitution({}));
  }, []);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const letter = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const { exportStudentLetter } = await import('../../utils/studentLetter');
      await exportStudentLetter(data);
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
        <DigitalCard card={studentCardData(data, institution)} />
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
