import { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle, CircleAlert, Eye, EyeOff, LogIn } from 'lucide-react';
import {
  changeOwnPassword,
  getInstitutions,
  getSchoolProfile,
  login,
  setAuthToken,
} from '../../services/api';
import {
  defaultApiBase,
  getApiBase,
  isPartitionBase,
  readInstitutionOptions,
  saveInstitutionOptions,
  setApiBase,
} from '../../utils/institution';
import logo from '../../assets/logo.png';
import './LoginPage.css';

const GLOW = '#00a6ff';
const GLOW_BRIGHT = '#e0f2fe';
const PATH = 'M 0 260 L 115 175 L 530 175 L 685 325 L 945 325 L 985 285 L 1200 285';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

const institutionName = () => {
  try {
    return getSchoolProfile().institutionName || 'CACOIN Training Center';
  } catch {
    return 'CACOIN Training Center';
  }
};

export default function LoginPage({ setupMode = false, onSetup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [changing, setChanging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focused, setFocused] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [fallbackName] = useState(institutionName);
  const [options, setOptions] = useState(readInstitutionOptions);
  const toastTimer = useRef(null);

  useEffect(() => {
    if (setupMode) {
      setToast({
        message: 'Ainda não existe administrador: o acesso é livre até criar o primeiro.',
        isError: false,
      });
    }
    return () => {
      clearTimeout(toastTimer.current);
    };
  }, [setupMode]);

  // A lista de instituições vem do sistema principal e fica guardada para quando se entra numa repartição.
  useEffect(() => {
    if (isPartitionBase()) return;
    getInstitutions()
      .then((list) => {
        const next = list.length ? [
          { key: 'main', name: institutionName(), apiBase: defaultApiBase },
          ...list.map((item) => ({
            key: String(item.id),
            name: item.institutionName,
            apiBase: `${window.location.protocol}//${window.location.hostname}:${item.port}/api`,
          })),
        ] : [];
        saveInstitutionOptions(next);
        setOptions(next);
      })
      .catch(() => {});
  }, []);

  // Instituição activa: a do backend seleccionado (ou a do perfil guardado, se a lista ainda não carregou).
  const currentOption = options.find((item) => item.apiBase === getApiBase());
  const institution = currentOption?.name || fallbackName;

  const chooseInstitution = (event) => {
    const option = options.find((item) => item.key === event.target.value);
    if (!option) return;
    setApiBase(option.apiBase);
    setAuthToken(null);
    window.sessionStorage.setItem('cacoin.skipFrontPage', '1');
    window.location.reload();
  };

  const showToast = (message, isError = false) => {
    clearTimeout(toastTimer.current);
    setToast({ message, isError });
    toastTimer.current = setTimeout(() => setToast(null), isError ? 6000 : 3500);
  };

  const enter = (result) => {
    setAuthToken(result.token, rememberMe);
    window.location.reload();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (setupMode && !username.trim() && !password) {
      onSetup();
      return;
    }
    if (changing && newPassword !== confirmation) {
      showToast('As palavras-passe não coincidem.', true);
      return;
    }
    setLoading(true);
    try {
      if (changing) {
        enter(await changeOwnPassword({ username, currentPassword: password, newPassword }));
      } else {
        const result = await login({ username, password });
        if (result.mustChangePassword) {
          setChanging(true);
          setShowPassword(false);
          showToast('Primeiro acesso: defina a sua nova palavra-passe.');
        } else {
          enter(result);
        }
      }
    } catch (loginError) {
      showToast(errorMessage(loginError), true);
    } finally {
      setLoading(false);
    }
  };

  const fields = changing
    ? [
      { id: 'input-new-password', label: 'Nova palavra-passe', value: newPassword, set: setNewPassword, autoComplete: 'new-password', toggle: true },
      { id: 'input-confirmation', label: 'Confirmar palavra-passe', value: confirmation, set: setConfirmation, autoComplete: 'new-password', toggle: false },
    ]
    : [
      { id: 'input-codigo', label: 'Código', value: username, set: setUsername, autoComplete: 'username', text: true },
      { id: 'input-senha', label: 'Palavra-passe', value: password, set: setPassword, autoComplete: 'current-password', toggle: true },
    ];

  return (
    <div className="card-page-wrapper" style={{ '--glow-color': GLOW, '--glow-color-bright': GLOW_BRIGHT }}>
      <main className="card-wrapper-outer">
        <div className="login-card-main">
          <div className="card-photo-layer" aria-hidden="true" />
          <svg className="card-svg-layer" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="cacoin-login-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="cacoin-login-dark-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#01283A" />
                <stop offset="100%" stopColor="#001d2b" />
              </linearGradient>
              <linearGradient id="cacoin-login-glow-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={GLOW} stopOpacity="0.85" />
                <stop offset="50%" stopColor={GLOW_BRIGHT} stopOpacity="1" />
                <stop offset="100%" stopColor={GLOW} stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <polygon
              points="0,260 115,175 530,175 685,325 945,325 985,285 1200,285 1200,600 0,600"
              fill="url(#cacoin-login-dark-bg)"
              fillOpacity="0.88"
            />
            <path
              d={PATH}
              fill="none"
              stroke={GLOW}
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="glow-ambient-stroke"
              filter="url(#cacoin-login-glow-filter)"
            />
            <path
              d={PATH}
              fill="none"
              stroke={GLOW}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="glow-mid-stroke"
            />
            <path
              d={PATH}
              fill="none"
              stroke="url(#cacoin-login-glow-line)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="glow-core-stroke"
            />
            <path
              d={PATH}
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              className="glow-travel-particle"
            />
          </svg>

          <div className="card-html-content">
            <div className="logo-brand-wrap" title={institution}>
              <img src={logo} alt={institution} className="logo-brand-img" />
            </div>

            <form className="login-form-section" onSubmit={submit}>
              <div className="form-fields-and-btn-row">
                <div className="fields-vertical-stack">
                  {fields.map((field) => (
                    <div className="mui-input-group" key={field.id}>
                      <input
                        id={field.id}
                        type={field.text || (field.toggle && showPassword) ? 'text' : 'password'}
                        className="mui-underline-input"
                        value={field.value}
                        onChange={(event) => field.set(event.target.value)}
                        onFocus={() => setFocused(field.id)}
                        onBlur={() => setFocused('')}
                        placeholder=" "
                        autoComplete={field.autoComplete}
                        disabled={loading}
                        required={!setupMode}
                      />
                      <label
                        htmlFor={field.id}
                        className={`mui-floating-label ${focused === field.id || field.value ? 'floated' : ''}`}
                      >
                        {field.label}{!setupMode && <span className="asterisk">*</span>}
                      </label>
                      <span className="mui-active-glow-indicator" />
                      {field.toggle && (
                        <button
                          type="button"
                          className="toggle-password-btn"
                          onClick={() => setShowPassword((current) => !current)}
                          title={showPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                          aria-label={showPassword ? 'Ocultar palavra-passe' : 'Ver palavra-passe'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="btn-side-column">
                  <button type="submit" className="btn-entrar-side" disabled={loading} title={changing ? 'Guardar palavra-passe' : 'Entrar no sistema'}>
                    {loading ? (
                      <span className="btn-loading-spin">...</span>
                    ) : (
                      <>
                        <LogIn size={16} className="btn-entrar-icon" />
                        <span className="btn-entrar-label">{changing ? 'Guardar' : 'Entrar'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-action-row">
                <label className="remember-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  Lembrar acesso
                </label>
                <span className="action-separator" aria-hidden="true">|</span>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => showToast('Contacte o administrador para repor a palavra-passe.')}
                >
                  Esqueceu a palavra-passe?
                </button>
              </div>
            </form>

            <div className="dark-region-content">
              <div className="institution-select-row">
                <label htmlFor="instituicao-select" className="institution-label">
                  Seleccione instituição:
                </label>
                <div className="institution-underline-select-wrap">
                  <select
                    id="instituicao-select"
                    className="institution-select"
                    value={currentOption?.key ?? ''}
                    onChange={chooseInstitution}
                    disabled={loading || changing || options.length < 2}
                  >
                    {options.length > 1 ? (
                      options.map((item) => (
                        <option key={item.key} value={item.key}>{item.name}</option>
                      ))
                    ) : (
                      <option value="">{institution}</option>
                    )}
                  </select>
                  <div className="custom-select-arrow">
                    <Building2 size={16} />
                  </div>
                </div>
              </div>
            </div>

            <footer className="footer-ribbon-container">
              <p className="footer-ribbon-text">
                Developed by <span className="author-name">Matessane</span>
              </p>
            </footer>
          </div>
        </div>
      </main>

      {toast && (
        <div className={`toast-feedback${toast.isError ? ' is-error' : ''}`} role="status">
          {toast.isError
            ? <CircleAlert size={18} color="#ff6b6b" />
            : <CheckCircle size={18} color={GLOW} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
