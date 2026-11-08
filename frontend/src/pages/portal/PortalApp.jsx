import { useEffect, useState } from 'react';
import { Drawer, IconButton, Menu, MenuItem } from '@mui/material';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  ShoppingBag,
  UserRound,
  Video,
  Wallet,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { systemDate } from '../../utils/systemDate';
import { getPortalNotifications, getPortalProfile, setAuthToken } from '../../services/api';
import PortalAcademics from './PortalAcademics';
import PortalAttendance from './PortalAttendance';
import PortalCourses from './PortalCourses';
import PortalDashboard from './PortalDashboard';
import PortalNotificationDialog from './PortalNotificationDialog';
import PortalNotifications from './PortalNotifications';
import PortalOnlineClasses from './PortalOnlineClasses';
import PortalPautas from './PortalPautas';
import PortalPayments from './PortalPayments';
import PortalProfile from './PortalProfile';
import PortalRequests from './PortalRequests';
import PortalServices from './PortalServices';
import {
  initials,
  readPortalTheme,
  readSeenNotifications,
  savePortalTheme,
  saveSeenNotifications,
} from './portalUtils';
import './portal.css';

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

const signOut = () => {
  setAuthToken(null);
  window.location.reload();
};

export default function PortalApp() {
  const [section, setSection] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notificationIds, setNotificationIds] = useState([]);
  const [seen, setSeen] = useState(() => new Set());
  const [theme, setTheme] = useState(() => readPortalTheme(null) ?? 'blue');

  useEffect(() => {
    if (!profile?.code) return;
    setSeen(readSeenNotifications(profile.code));
  }, [profile?.code]);

  useEffect(() => {
    if (!profile?.code) return undefined;
    let active = true;
    const load = () => getPortalNotifications()
      .then((result) => { if (active) setNotificationIds(result.items.map((item) => item.id)); })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 120000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [profile?.code]);

  const markRead = (ids) => {
    setNotificationIds(ids);
    setSeen((current) => {
      const next = new Set([...current, ...ids]);
      saveSeenNotifications(profile?.code, next);
      return next;
    });
  };

  useEffect(() => {
    if (!profile?.code) return;
    const saved = readPortalTheme(profile.code);
    if (saved) setTheme(saved);
  }, [profile?.code]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const changeTheme = (value) => {
    setTheme(value);
    savePortalTheme(profile?.code, value);
  };

  const unread = notificationIds.filter((id) => !seen.has(id)).length;
  const badgeText = unread > 9 ? '9+' : String(unread);

  useEffect(() => {
    getPortalProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  const today = systemDate();
  const dateText = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const page = {
    dashboard: <PortalDashboard onNavigate={setSection} />,
    profile: <PortalProfile theme={theme} onThemeChange={changeTheme} />,
    courses: <PortalCourses />,
    'online-classes': <PortalOnlineClasses />,
    payments: <PortalPayments />,
    academics: <PortalAcademics />,
    pautas: <PortalPautas />,
    attendance: <PortalAttendance />,
    requests: <PortalRequests />,
    services: <PortalServices />,
    notifications: <PortalNotifications seen={seen} onRead={markRead} />,
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
            {unread > 0 && <span className="portal-toggle-dot" aria-hidden="true" />}
          </IconButton>
          <div className="portal-topbar-right">
            <IconButton
              className="portal-bell"
              aria-label={unread > 0 ? `Notificações (${unread} novas)` : 'Notificações'}
              onClick={() => setBellOpen(true)}
            >
              <Bell size={20} aria-hidden="true" />
              {unread > 0 && <span className="portal-badge portal-bell-badge" aria-hidden="true">{badgeText}</span>}
            </IconButton>
            <span className="portal-chip">
              <CalendarDays size={16} aria-hidden="true" />
              {dateText}
            </span>
            <button type="button" className="portal-user" onClick={(event) => setAnchor(event.currentTarget)}>
              <span className="portal-avatar">{initials(profile?.name) || '?'}</span>
              <span className="portal-user-name">{profile?.name ?? ''}</span>
            </button>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); setSection('profile'); }}>Minha informação</MenuItem>
              <MenuItem onClick={signOut}>Terminar sessão</MenuItem>
            </Menu>
          </div>
        </header>

        <PortalNotificationDialog
          open={bellOpen}
          onClose={() => setBellOpen(false)}
          load={getPortalNotifications}
          seen={seen}
          onRead={markRead}
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
          <nav aria-label="Navegação do portal">
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
                    {id === 'notifications' && unread > 0 && (
                      <span className="portal-badge">{badgeText}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
            <hr className="portal-drawer-divider" />
            <button type="button" className="portal-drawer-item" onClick={signOut}>
              <LogOut size={19} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </nav>
        </Drawer>

        <nav className="portal-sidebar" aria-label="Menu do portal">
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
                  {id === 'notifications' && unread > 0 && (
                    <span className="portal-nav-badge">{badgeText}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <div className="portal-nav-group portal-nav-exit">
            <hr className="portal-nav-divider" />
            <button type="button" className="portal-nav-item" onClick={signOut} aria-label="Sair" data-label="Sair">
              <LogOut size={19} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </nav>

        <main className="portal-main">{page}</main>
      </div>
    </div>
  );
}
