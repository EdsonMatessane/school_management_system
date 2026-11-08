import { useEffect, useState } from 'react';
import { Alert, TextField } from '@mui/material';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import { getInstitutionWebsite, getSchoolProfile, updateSchoolProfile } from '../../../services/api';
import { isPartitionBase } from '../../../utils/institution';
import { isValidWebsite } from '../../../utils/website';

const footerStorageKey = 'cacoin.schoolReportFooter';

function getSavedFooter() {
  return window.localStorage.getItem(footerStorageKey) || '';
}

export default function SchoolReportManagement({ mode, logo }) {
  const isHeader = mode === 'header';
  const [profile, setProfile] = useState({});
  const [footerText, setFooterText] = useState('');
  const [draft, setDraft] = useState(null);
  const [websiteDraft, setWebsiteDraft] = useState(null);
  const [websiteError, setWebsiteError] = useState('');
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      setProfile(getSchoolProfile());
      setFooterText(getSavedFooter());
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar os dados do relatório.');
    } finally {
      setLoading(false);
    }
    if (!isPartitionBase()) {
      getInstitutionWebsite()
        .then((site) => setProfile((current) => ({ ...current, institutionWebsite: site })))
        .catch(() => {});
    }
  }, []);

  const saveFooter = (event) => {
    event.preventDefault();
    try {
      window.localStorage.setItem(footerStorageKey, draft);
      setFooterText(draft);
      setDraft(null);
      setError('');
      setNotice('Rodapé guardado com sucesso.');
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível guardar o rodapé.');
      setNotice('');
    }
  };

  const saveWebsite = async (event) => {
    event.preventDefault();
    const value = (websiteDraft ?? '').trim();
    if (value && !isValidWebsite(value)) {
      setWebsiteError('Indique um endereço de website válido (ex.: www.escola.co.mz).');
      return;
    }
    setSavingWebsite(true);
    setWebsiteError('');
    try {
      const saved = await updateSchoolProfile({ ...getSchoolProfile(), institutionWebsite: value });
      setProfile(saved);
      setWebsiteDraft(null);
      setError('');
      setNotice('Website guardado com sucesso.');
    } catch (saveError) {
      setWebsiteError(
        saveError.response?.data?.message || saveError.message || 'Não foi possível guardar o website.',
      );
    } finally {
      setSavingWebsite(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-school-report-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Minha Escola</p>
          <h1>{isHeader ? 'Cabeçalho' : 'Rodapé'}</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      {loading ? (
        <section className="cacoin-settings-card"><p>A carregar pré-visualização…</p></section>
      ) : (
        <>
          {!isHeader && (
            <>
              <SettingsValuesTable
                ariaLabel="Rodapé dos relatórios"
                columns={['Definição', 'Valor']}
                rows={[{
                  key: 'footer',
                  label: 'texto do rodapé',
                  cells: ['Texto do rodapé', footerText || '—'],
                  onEdit: () => {
                    setError('');
                    setDraft(footerText);
                  },
                }]}
              />
              <SettingsFormDialog
                open={draft !== null}
                title="Texto do rodapé"
                onClose={() => setDraft(null)}
                onSubmit={saveFooter}
              >
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  size="small"
                  label="Texto do rodapé"
                  value={draft ?? ''}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </SettingsFormDialog>
            </>
          )}
          {isHeader && !isPartitionBase() && (
            <>
              <SettingsValuesTable
                ariaLabel="Website do cabeçalho"
                columns={['Definição', 'Valor']}
                rows={[{
                  key: 'website',
                  label: 'website',
                  cells: ['Website', profile.institutionWebsite || '—'],
                  onEdit: () => {
                    setWebsiteError('');
                    setWebsiteDraft(profile.institutionWebsite ?? '');
                  },
                }]}
              />
              <SettingsFormDialog
                open={websiteDraft !== null}
                title="Website"
                onClose={() => setWebsiteDraft(null)}
                onSubmit={saveWebsite}
                saving={savingWebsite}
                error={websiteError}
              >
                <TextField
                  fullWidth
                  size="small"
                  label="Website"
                  placeholder="www.escola.co.mz"
                  value={websiteDraft ?? ''}
                  onChange={(event) => setWebsiteDraft(event.target.value.replace(/\s/g, ''))}
                  disabled={savingWebsite}
                  slotProps={{ htmlInput: { maxLength: 300 } }}
                />
              </SettingsFormDialog>
            </>
          )}
          <section className="cacoin-settings-card" aria-label="Pré-visualização do relatório">
            <h2 className="cacoin-school-report-preview-title">Pré-visualização</h2>
            <div className={`cacoin-school-report-preview${isHeader ? ' header-preview' : ' footer-preview'}`}>
              {isHeader ? (
                <>
                  <div className="cacoin-school-report-heading">
                    {logo && <img src={logo} alt="Logotipo da instituição" />}
                    <div>
                      <h2>{profile.institutionName || 'Nome da Instituição'}</h2>
                      <p className="cacoin-school-report-slogan">
                        {profile.institutionSlogan || 'Slogan da instituição'}
                      </p>
                      <p>Endereço: {profile.institutionAddress || '—'}</p>
                      <p>Contacto: {profile.institutionPrimaryPhone || '—'}</p>
                      <p>Email: {profile.institutionEmail || '—'}</p>
                      {!isPartitionBase() && <p>Website: {profile.institutionWebsite || '—'}</p>}
                    </div>
                  </div>
                  <div className="cacoin-school-report-separator" aria-hidden="true" />
                  <div className="cacoin-school-report-sample">
                    <span>Conteúdo do relatório</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="cacoin-school-report-sample">
                    <span>Conteúdo do relatório</span>
                  </div>
                  <div className="cacoin-school-report-separator" aria-hidden="true" />
                  <div className="cacoin-school-report-footer-content">
                    {footerText || 'Pré-visualização do texto do rodapé'}
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
