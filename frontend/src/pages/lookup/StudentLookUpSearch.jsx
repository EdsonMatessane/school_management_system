import { useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { Search } from 'lucide-react';
import { getLookupProfile } from '../../services/api';
import { errorMessage } from '../portal/portalUtils';

// Pesquisa > Estudante: procura pelo código e abre a consulta (StudentLookUp) num novo separador.
export default function StudentLookUpSearch() {
  const [code, setCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    const wanted = code.trim().toUpperCase();
    setFound(null);
    if (!wanted) {
      setError('Indique o código do estudante.');
      return;
    }
    setError('');
    // abre já o separador, dentro do clique/Enter, para o navegador não o bloquear
    const tab = window.open('', '_blank');
    if (!tab) {
      setError('O navegador bloqueou o novo separador. Permita as janelas pop-up para este site e tente de novo.');
      return;
    }
    setSearching(true);
    try {
      const profile = await getLookupProfile(wanted);
      tab.location.href = `${window.location.origin}${window.location.pathname}?lookup=${encodeURIComponent(profile.code)}`;
      setFound(profile);
    } catch (searchError) {
      tab.close();
      setError(searchError.response?.status === 404
        ? 'Estudante não encontrado.'
        : errorMessage(searchError));
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Pesquisa</p>
          <h1>Estudante</h1>
        </div>
      </header>

      <form onSubmit={submit}>
        <Stack direction="row" spacing={1.5} sx={{ maxWidth: 560, mb: 2 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Código do estudante"
            placeholder="CACOIN202601"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={searching}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<Search size={16} aria-hidden="true" />}
            disabled={searching}
          >
            {searching ? 'A pesquisar…' : 'Pesquisar'}
          </Button>
        </Stack>
      </form>

      {error && <Alert severity="error" sx={{ maxWidth: 560 }}>{error}</Alert>}
      {found && (
        <Alert severity="success" sx={{ maxWidth: 560 }}>
          {found.name} ({found.code}) aberto num novo separador.
        </Alert>
      )}
    </section>
  );
}
