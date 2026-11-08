import { useEffect, useMemo, useState } from 'react';
import { Drawer, IconButton, Menu, MenuItem } from '@mui/material';
import { Bell, CalendarDays, LogOut, Menu as MenuIcon } from 'lucide-react';
import logo from '../../assets/logo.png';
import {
  teacherAreaOf,
  teacherFirstSection,
  teacherGroups,
  portalSections,
} from '../../components/teacherNav';
import { getTeacherNotifications, getTeacherProfile, setAuthToken } from '../../services/api';
import { systemDate } from '../../utils/systemDate';
import TeacherNotificationDialog, {
  readTeacherSeen,
  teacherSeenEvent,
} from '../teacher/TeacherNotificationDialog';
import { initials } from '../portal/portalUtils';
import '../portal/portal.css';
import './staffShell.css';

const signOut = () => {
  setAuthToken(null);
  window.location.reload();
};

/** Ligações finais de um grupo (os sub-grupos aninhados são achatados). */
const leaves = (links) => links.flatMap((link) => (link.links ? leaves(link.links) : [link]));

/**
 * Estrutura do portal do estudante (cabeçalho, menu de ícones e área de conteúdo) para o
 * portal de funcionários. Os grupos do menu passam a separadores no topo de cada área.
 */
export default function StaffShell({ activeSection, onSectionChange, children }) {
  const [profile, setProfile] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    getTeacherProfile().then((result) => setProfile(result.staff)).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => getTeacherNotifications()
      .then((result) => {
        if (!active) return;
        const seen = readTeacherSeen();
        setUnread(result.items.filter((item) => !seen.has(item.id)).length);
      })
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 120000);
    window.addEventListener(teacherSeenEvent, load);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(teacherSeenEvent, load);
    };
  }, []);

  const sections = portalSections();
  const area = teacherAreaOf(activeSection);
  const groups = useMemo(() => teacherGroups(area.id), [area.id]);
  const activeGroup = groups.find((group) => leaves(group.links).some(
    (link) => link.id === activeSection,
  )) ?? groups[0];
  const groupLinks = leaves(activeGroup.links);

  const badgeText = unread > 9 ? '9+' : String(unread);
  const name = profile ? [profile.firstName, profile.surname].filter(Boolean).join(' ') : '';
  const today = systemDate();
  const dateText = [
    String(today.getDate()).padStart(2, '0'),
    String(today.getMonth() + 1).padStart(2, '0'),
    today.getFullYear(),
  ].join('/');

  const open = (id) => {
    onSectionChange(teacherFirstSection(id));
    setNavigationOpen(false);
  };

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
              {unread > 0 && (
                <span className="portal-badge portal-bell-badge" aria-hidden="true">{badgeText}</span>
              )}
            </IconButton>
            <span className="portal-chip">
              <CalendarDays size={16} aria-hidden="true" />
              {dateText}
            </span>
            <button type="button" className="portal-user" onClick={(event) => setAnchor(event.currentTarget)}>
              <span className="portal-avatar">{initials(name) || '?'}</span>
              <span className="portal-user-name">{name}</span>
            </button>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); onSectionChange('teacher-info'); }}>
                Informação
              </MenuItem>
              <MenuItem onClick={signOut}>Terminar sessão</MenuItem>
            </Menu>
          </div>
        </header>

        <TeacherNotificationDialog
          open={bellOpen}
          onClose={() => setBellOpen(false)}
          load={getTeacherNotifications}
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
            <div className="portal-drawer-group">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`portal-drawer-item${area.id === id ? ' active' : ''}`}
                  onClick={() => open(id)}
                >
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span>{label}</span>
                  {id === 'notifications' && unread > 0 && (
                    <span className="portal-badge">{badgeText}</span>
                  )}
                </button>
              ))}
            </div>
            <hr className="portal-drawer-divider" />
            <button type="button" className="portal-drawer-item" onClick={signOut}>
              <LogOut size={19} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </nav>
        </Drawer>

        <nav className="portal-sidebar" aria-label="Menu do portal">
          <div className="portal-nav-group">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`portal-nav-item${area.id === id ? ' active' : ''}`}
                onClick={() => open(id)}
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
          <div className="portal-nav-group portal-nav-exit">
            <hr className="portal-nav-divider" />
            <button type="button" className="portal-nav-item" onClick={signOut} aria-label="Sair" data-label="Sair">
              <LogOut size={19} aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </nav>

        <main className="portal-main">
          <div style={{ minWidth: 0 }}>
          {groups.length > 1 && (
            <div className="portal-tabs" role="tablist" aria-label={area.label}>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={group.id === activeGroup.id}
                  className={`portal-tab${group.id === activeGroup.id ? ' active' : ''}`}
                  onClick={() => onSectionChange(leaves(group.links)[0].id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          )}
          {groupLinks.length > 1 && (
            <div className="portal-tabs" role="tablist" aria-label={activeGroup.label}>
              {groupLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  role="tab"
                  aria-selected={link.id === activeSection}
                  className={`portal-tab${link.id === activeSection ? ' active' : ''}`}
                  onClick={() => onSectionChange(link.id)}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
          {children}
          </div>
        </main>
      </div>
    </div>
  );
}
