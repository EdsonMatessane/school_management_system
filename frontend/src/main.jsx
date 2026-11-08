import { schoolProfileKey } from './utils/institution';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import FrontPage from './pages/auth/FrontPage';
import LoginPage from './pages/auth/LoginPage';
import FolderManagement from './pages/FolderManagement';
import StudentLookUp from './pages/lookup/StudentLookUp';
import PortalApp from './pages/portal/PortalApp';
import {
  getAuthStatus,
  getAuthToken,
  getAuthTokenKind,
  getInstanceInfo,
  getInstitutionWebsite,
  getSystemSettings,
  getTeacherProfile,
} from './services/api';
import { setSystemYear } from './utils/systemDate';
import { setPortalKind, setTeacherMode } from './utils/teacherMode';

const root = createRoot(document.getElementById('root'));
const SETUP_KEY = 'cacoin.setup';
const FRONT_PAGE_SKIP_KEY = 'cacoin.skipFrontPage';

const render = (element) => root.render(<React.StrictMode>{element}</React.StrictMode>);

// Contas de funcionários que são professores abrem o portal do professor.
const personalPortalKind = async () => {
  if (getAuthTokenKind() !== 'STAFF') return null;
  try {
    const profile = await getTeacherProfile();
    return profile?.staff?.staffType ?? null;
  } catch {
    return null;
  }
};

// Uma repartição nasce só com o nome e o endereço da instituição: passam para o perfil da escola.
const seedInstitution = async () => {
  try {
    const info = await getInstanceInfo();
    if (!info?.partition) return;
    const key = schoolProfileKey();
    const saved = JSON.parse(window.localStorage.getItem(key) ?? '{}') ?? {};
    if (!saved.institutionName) {
      window.localStorage.setItem(key, JSON.stringify({
        ...saved,
        institutionName: info.institutionName ?? '',
        institutionAddress: info.address ?? '',
      }));
    }
  } catch {
    // sem identidade da instalação: o perfil da escola fica como está
  }
};

const openApp = async () => {
  const kind = await personalPortalKind();
  const teacher = kind === 'teachers' || kind === 'other';
  const hr = kind === 'hr';
  setTeacherMode(teacher);
  setPortalKind(kind);
  try {
    const settings = await getSystemSettings();
    setSystemYear(settings.previousYearEnabled ? settings.systemYear : null);
  } catch {
    setSystemYear(null);
  }
  render(<App teacher={teacher} hr={hr} />);
};

const openStandalone = async (element) => {
  let required;
  try {
    required = (await getAuthStatus()).required;
  } catch {
    required = false;
  }
  if (required && !getAuthToken()) return false;
  render(element);
  return true;
};

const start = async () => {
  await seedInstitution();
  const query = new URLSearchParams(window.location.search);
  const lookupCode = query.get('lookup');
  if (lookupCode && getAuthTokenKind() !== 'STUDENT' && await openStandalone(<StudentLookUp code={lookupCode} />)) {
    return;
  }
  // Pastas: janela completa, aberta num novo separador pelo menu "Pastas"
  if (query.has('folders') && getAuthTokenKind() !== 'STUDENT' && await openStandalone(<FolderManagement />)) {
    return;
  }
  if (getAuthToken() && getAuthTokenKind() === 'STUDENT') {
    render(<PortalApp />);
    return;
  }
  let required;
  try {
    required = (await getAuthStatus()).required;
  } catch {
    render(<App />);
    return;
  }
  if (required && getAuthToken()) {
    await openApp();
    return;
  }
  if (!required && window.sessionStorage.getItem(SETUP_KEY)) {
    await openApp();
    return;
  }
  const showLogin = () => render(
    <LoginPage
      setupMode={!required}
      onSetup={() => {
        window.sessionStorage.setItem(SETUP_KEY, '1');
        openApp();
      }}
    />,
  );
  // Com website definido, é ele a página inicial; «Prosseguir» leva ao login. Trocar de
  // instituição no login recarrega a página e não deve voltar a mostrá-la.
  const skipFrontPage = window.sessionStorage.getItem(FRONT_PAGE_SKIP_KEY) === '1';
  window.sessionStorage.removeItem(FRONT_PAGE_SKIP_KEY);
  let website = '';
  if (!skipFrontPage) {
    try {
      website = await getInstitutionWebsite();
    } catch {
      website = '';
    }
  }
  if (website) {
    render(<FrontPage website={website} onProceed={showLogin} />);
    return;
  }
  showLogin();
};

start();
