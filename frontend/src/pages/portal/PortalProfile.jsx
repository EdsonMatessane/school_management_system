import { useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import ThemeSelector from '../../components/ThemeSelector';
import { changeOwnPassword, getPortalProfile, setAuthToken } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { errorMessage, usePortalData } from './portalUtils';

export default function PortalProfile({ theme, onThemeChange }) {
  const { data, loading, error } = usePortalData(getPortalProfile);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  if (loading) return <p className="portal-loading">A carregar…</p>;
  if (error) return <p className="portal-error">{error}</p>;

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (next !== confirmation) {
      setMessage({ severity: 'error', text: 'As palavras-passe não coincidem.' });
      return;
    }
    setSaving(true);
    try {
      const result = await changeOwnPassword({
        username: data.code,
        currentPassword: current,
        newPassword: next,
      });
      setAuthToken(result.token);
      setCurrent('');
      setNext('');
      setConfirmation('');
      setMessage({ severity: 'success', text: 'Palavra-passe alterada.' });
    } catch (saveError) {
      setMessage({ severity: 'error', text: errorMessage(saveError) });
    } finally {
      setSaving(false);
    }
  };

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

      <div className="portal-split">
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
        <section className="portal-card">
          <h2>Alterar palavra-passe</h2>
          {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
          <form className="portal-form" onSubmit={submit}>
            <TextField
              required
              size="small"
              type="password"
              label="Palavra-passe actual"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              disabled={saving}
            />
            <TextField
              required
              size="small"
              type="password"
              label="Nova palavra-passe"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              disabled={saving}
            />
            <TextField
              required
              size="small"
              type="password"
              label="Confirmar palavra-passe"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={saving}
            />
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar palavra-passe'}
            </Button>
          </form>
        </section>
      </div>

      <section className="portal-card">
        <h2 id="portal-theme-heading">Tema</h2>
        <ThemeSelector
          value={theme}
          onChange={onThemeChange}
          labelledBy="portal-theme-heading"
          name="portal-theme"
        />
      </section>
    </>
  );
}
