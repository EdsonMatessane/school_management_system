import { useEffect, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import ThemeSelector from '../../components/ThemeSelector';
import { changeOwnPassword, getTeacherProfile, setAuthToken } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';

const fullName = (staff) => [staff.firstName, staff.surname]
  .filter(Boolean)
  .join(' ');

export default function TeacherProfilePage({ theme, onThemeChange }) {
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const submitPassword = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (next !== confirmation) {
      setMessage({ severity: 'error', text: 'As palavras-passe não coincidem.' });
      return;
    }
    setSaving(true);
    try {
      const result = await changeOwnPassword({
        username: staff.staffCode,
        currentPassword: current,
        newPassword: next,
      });
      setAuthToken(result.token);
      setCurrent('');
      setNext('');
      setConfirmation('');
      setMessage({ severity: 'success', text: 'Palavra-passe alterada.' });
    } catch (saveError) {
      setMessage({
        severity: 'error',
        text: saveError.response?.data?.message ?? 'Não foi possível alterar a palavra-passe.',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    getTeacherProfile()
      .then((profile) => setStaff(profile.staff))
      .catch(() => setError('Não foi possível carregar os seus dados.'));
  }, []);

  const fields = staff ? [
    ['Código', String(staff.staffCode ?? '').toUpperCase()],
    ['Nome', fullName(staff)],
    ['Cargo', staff.positionName],
    ['Sexo', staff.gender],
    ['Data de Nascimento', staff.birthDate ? toDisplayDate(staff.birthDate) : ''],
    ['BI', String(staff.biNumber ?? '').toUpperCase()],
    ['NUIT', staff.nuit],
    ['Telefone', staff.phone],
    ['Email', staff.email],
    ['Província', staff.addressProvince],
    ['Distrito', staff.addressDistrict],
    ['Endereço', staff.address],
  ] : [];

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Meu Perfil</p>
          <h1>Informação</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {staff && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 24,
              alignItems: 'start',
            }}
          >
            <div className="cacoin-settings-card">
              {fields.map(([label, value]) => (
                <p key={label} style={{ margin: '0 0 8px' }}>
                  <strong>{label}:</strong> {displayText(value)}
                </p>
              ))}
            </div>
            <div className="cacoin-settings-card">
              <h2 style={{ marginTop: 0 }}>Alterar palavra-passe</h2>
              {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}
              <form
                onSubmit={submitPassword}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
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
            </div>
          </div>
          {onThemeChange && (
            <div style={{ marginTop: 24 }}>
              <ThemeSelector value={theme} onChange={onThemeChange} name="teacher-theme" />
            </div>
          )}
        </>
      )}
    </section>
  );
}
