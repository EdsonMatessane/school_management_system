import { useState } from 'react';
import { Alert, Button } from '@mui/material';
import { ImagePlus, Trash2 } from 'lucide-react';
import ThemeSelector from '../../../components/ThemeSelector';

const maxLogoSize = 1024 * 1024;
const acceptedLogoTypes = ['image/png', 'image/jpeg', 'image/webp'];

export default function SchoolCustomization({ theme, onThemeChange, logo, onLogoChange }) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleThemeChange = (value) => {
    try {
      onThemeChange(value);
      setError('');
      setNotice('Tema atualizado em todo o programa.');
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível guardar o tema.');
      setNotice('');
    }
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!acceptedLogoTypes.includes(file.type)) {
      setError('Selecione um logotipo PNG, JPEG ou WebP.');
      setNotice('');
      return;
    }
    if (file.size > maxLogoSize) {
      setError('O logotipo não pode exceder 1 MB.');
      setNotice('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Não foi possível carregar o ficheiro do logotipo.');
        setNotice('');
        return;
      }
      try {
        onLogoChange(reader.result);
        setError('');
        setNotice('Logotipo atualizado no cabeçalho do programa.');
      } catch (saveError) {
        setError(saveError.message || 'Não foi possível guardar o logotipo.');
        setNotice('');
      }
    };
    reader.onerror = () => {
      setError('Não foi possível ler o ficheiro do logotipo.');
      setNotice('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    try {
      onLogoChange('');
      setError('');
      setNotice('Logotipo removido.');
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível remover o logotipo.');
      setNotice('');
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-school-customization">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Minha Escola</p>
          <h1>Customização</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <section className="cacoin-settings-card" aria-labelledby="school-logo-heading">
        <div className="cacoin-settings-section-heading">
          <ImagePlus size={20} aria-hidden="true" />
          <div>
            <h2 id="school-logo-heading">Logotipo</h2>
          </div>
        </div>
        <div className="cacoin-school-logo-controls">
          <div className="cacoin-school-logo-preview">
            {logo ? <img src={logo} alt="Pré-visualização do logotipo" /> : <span>Sem logotipo</span>}
          </div>
          <div className="cacoin-school-logo-actions">
            <Button component="label" variant="contained" startIcon={<ImagePlus size={17} />}>
              Carregar logotipo
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
              />
            </Button>
            {logo && (
              <Button
                color="error"
                startIcon={<Trash2 size={17} />}
                onClick={handleRemoveLogo}
              >
                Remover
              </Button>
            )}
            <span>PNG, JPEG ou WebP · máximo 1 MB</span>
          </div>
        </div>
      </section>

      <section className="cacoin-settings-card cacoin-school-theme-card" aria-labelledby="school-theme-heading">
        <div className="cacoin-settings-section-heading">
          <h2 id="school-theme-heading">Tema do programa</h2>
        </div>
        <ThemeSelector
          value={theme}
          onChange={handleThemeChange}
          labelledBy="school-theme-heading"
          name="school-theme"
        />
      </section>
    </section>
  );
}
