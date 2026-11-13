import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { TABS } from './nav';
import { IconSettings } from './icons';
import { UpdatePrompt } from './UpdatePrompt';
import { BackupReminder } from './BackupReminder';

function useTitle(): string {
  const { pathname } = useLocation();
  if (pathname.startsWith('/einstellungen')) return 'Einstellungen';
  return TABS.find((t) => pathname.startsWith(t.to))?.label ?? 'UKP-Labor';
}

export function Layout() {
  const title = useTitle();
  return (
    <div className="app">
      <aside className="sidebar" aria-label="Hauptnavigation">
        <div className="sidebar-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
          <span>UKP-Labor</span>
        </div>
        <nav>
          {TABS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className="side-link">
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/einstellungen" className="side-link side-settings">
          <IconSettings />
          <span>Einstellungen</span>
        </NavLink>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <NavLink to="/einstellungen" className="icon-btn topbar-settings" aria-label="Einstellungen">
            <IconSettings />
          </NavLink>
        </header>
        <main className="content">
          <BackupReminder />
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Hauptnavigation">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="tab">
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <UpdatePrompt />
    </div>
  );
}
