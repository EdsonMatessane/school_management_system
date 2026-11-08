import { useEffect, useState } from 'react';
import { Drawer, IconButton } from '@mui/material';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu as MenuIcon,
  ShoppingBag,
  UserRound,
  Video,
  Wallet,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { getLookupNotifications, getLookupProfile } from '../../services/api';
import { systemDate } from '../../utils/systemDate';
import { errorMessage, initials } from '../portal/portalUtils';
import LookupAcademics from './LookupAcademics';
import LookupAttendance from './LookupAttendance';
import LookupCourses from './LookupCourses';
import LookupDashboard from './LookupDashboard';
import LookupNotifications from './LookupNotifications';
import PortalNotificationDialog from '../portal/PortalNotificationDialog';
import LookupOnlineClasses from './LookupOnlineClasses';
import LookupPautas from './LookupPautas';
import LookupPayments from './LookupPayments';
import LookupProfile from './LookupProfile';
import LookupRequests from './LookupRequests';
import LookupServices from './LookupServices';
import '../portal/portal.css';

/*
 * Pesquisa de estudante: réplica do portal do estudante (PortalApp) em modo de consulta.
 * Qualquer alteração feita no portal do estudante deve ser feita também aqui. A única
 * diferença é que aqui não pode existir nenhum botão de acção (criar, guardar, alterar,
 * terminar sessão…); só botões e ligações de "ver".
 */
const groups = [
  [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Minha informação', icon: UserRound },
    { id: 'courses', label: 'Cursos', icon: BookOpen },
    { id: 'online-classes', label: 'Aulas online', icon: Video },
  ],
  [
    { id: 'payments', label: 'Pagamentos', icon: Wallet },
    { id: 'academics', label: 'Notas', icon: GraduationCap },
    { id: 'pautas', label: 'Pautas', icon: FileText },
  ],
  [
    { id: 'attendance', label: 'Presenças', icon: CalendarCheck },
    { id: 'requests', label: 'Pedidos', icon: ClipboardList },
    { id: 'services', label: 'Serviços', icon: ShoppingBag },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ],
];

export default function StudentLookUp({ code }) {
  const [section, setSection] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = 'blue';
  }, []);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setLoadError('');
    getLookupProfile(code)
      .then((result) => { if (active) setProfile(result); })
      .catch((error) => { if (active) setLoadError(errorMessage(error)); });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    document.title = profile ? `${profile.name} — Consulta de estudante` : 'Consulta de estudante';
  }, [profile]);

  const today = systemDate();
  const dateText = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  if (loadError) {
    return (
      <div className="portal-app">
        <div className="portal-frame">
          <main className="portal-main"><p className="portal-error">{loadError}</p></main>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="portal-app">
        <div className="portal-frame">
          <main className="portal-main"><p className="portal-loading">A carregar…</p></main>
        </div>
      </div>
    );
  }

  const page = {
    dashboard: <LookupDashboard code={code} onNavigate={setSection} />,
    profile: <LookupProfile code={code} />,
    courses: <LookupCourses code={code} />,
    'online-classes': <LookupOnlineClasses code={code} />,
    payments: <LookupPayments code={code} />,
    academics: <LookupAcademics code={code} />,
    pautas: <LookupPautas code={code} />,
    attendance: <LookupAttendance code={code} />,
    requests: <LookupRequests code={code} />,
    services: <LookupServices code={code} />,
    notifications: <LookupNotifications code={code} />,
  }[section];

  return (
    <div className="portal-app">
      <div className="portal-frame">
        <div className="portal-logo">
          <img src={logo} alt="Logótipo" />
        </div>

        <header className="portal-topbar">
          <IconButton
            className="portal-menu-toggle"
            aria-label="Abrir menu de navegação"
            aria-expanded={navigationOpen}
            onClick={() => setNavigationOpen(true)}
            size="large"
          >
            <MenuIcon size={22} aria-hidden="true" />
          </IconButton>
          <div className="portal-topbar-right">
            <IconButton
              className="portal-bell"
              aria-label="Ver notificações"
              onClick={() => setBellOpen(true)}
            >
              <Bell size={20} aria-hidden="true" />
            </IconButton>
            <span className="portal-chip">
              <Eye size={16} aria-hidden="true" />
              Modo de consulta
            </span>
            <span className="portal-chip">
              <CalendarDays size={16} aria-hidden="true" />
              {dateText}
            </span>
            <div className="portal-user" style={{ cursor: 'default' }}>
              <span className="portal-avatar">{initials(profile.name) || '?'}</span>
              <span className="portal-user-name">{profile.name}</span>
            </div>
          </div>
        </header>

        <PortalNotificationDialog
          open={bellOpen}
          onClose={() => setBellOpen(false)}
          load={() => getLookupNotifications(code)}
          onViewAll={() => setSection('notifications')}
        />

        <Drawer
          anchor="left"
          open={navigationOpen}
          onClose={() => setNavigationOpen(false)}
          slotProps={{
            paper: {
              sx: {
                width: 280,
                px: 2,
                py: 2.5,
                backgroundColor: 'var(--portal-card)',
                color: 'var(--portal-ink)',
              },
            },
          }}
        >
          <div className="portal-drawer-logo">
            <img src={logo} alt="Logótipo" />
          </div>
          <nav aria-label="Navegação da consulta">
            {groups.map((group, index) => (
              <div className="portal-drawer-group" key={group[0].id}>
                {index > 0 && <hr className="portal-drawer-divider" />}
                {group.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`portal-drawer-item${section === id ? ' active' : ''}`}
                    onClick={() => {
                      setSection(id);
                      setNavigationOpen(false);
                    }}
                  >
                    <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </Drawer>

        <nav className="portal-sidebar" aria-label="Menu da consulta">
          {groups.map((group, index) => (
            <div className="portal-nav-group" key={group[0].id}>
              {index > 0 && <hr className="portal-nav-divider" />}
              {group.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`portal-nav-item${section === id ? ' active' : ''}`}
                  onClick={() => setSection(id)}
                  aria-label={label}
                  data-label={label}
                >
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className="portal-main">{page}</main>
      </div>
    </div>
  );
}
