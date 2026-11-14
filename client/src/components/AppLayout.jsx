import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, UserCircle, ShieldCheck, LogOut, AlertTriangle } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationDropdown from './NotificationDropdown';
import { Avatar, Badge } from './ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const TITLES = { '/': 'Overview', '/analytics': 'Analytics', '/users': 'Users Management', '/projects': 'Projects', '/tasks': 'Tasks', '/messages': 'Messages', '/notifications': 'Notifications', '/reports': 'Reports', '/settings': 'Settings', '/profile': 'Profile', '/security': 'Security' };

export default function AppLayout() {
  const { user, setTheme, logout, settings } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('titanium_sidebar') === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('titanium_sidebar', c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const load = () => api.get('/messages/unread-count').then(({ data }) => setUnreadMessages(data.count)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const title = TITLES[location.pathname] || (location.pathname.startsWith('/users/') ? 'User details' : settings.appName);
  const isLight = user.theme === 'light';

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} unreadMessages={unreadMessages} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-base/70 px-4 backdrop-blur-xl sm:px-6">
          <button className="icon-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h2 className="truncate text-sm font-medium text-mute">{title}</h2>
          <div className="ml-auto flex items-center gap-1">
            <button className="icon-btn" onClick={() => setTheme(isLight ? 'dark' : 'light')} aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}>
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NotificationDropdown />
            <div className="relative ml-1" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-raised" aria-label="Account menu" aria-expanded={menu}>
                <Avatar user={user} size={32} />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-4">{user.name}</span>
                  <span className="block text-[11px] capitalize text-mute">{user.role}</span>
                </span>
              </button>
              {menu && (
                <div className="glass absolute right-0 z-40 mt-2 w-56 animate-fade-up p-1.5">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-mute">{user.email}</p>
                  </div>
                  <div className="my-1 border-t" />
                  {[
                    ['/profile', 'Profile', UserCircle],
                    ['/security', 'Security', ShieldCheck],
                  ].map(([to, text, Icon]) => (
                    <button key={to} onClick={() => { setMenu(false); navigate(to); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mute hover:bg-raised hover:text-ink">
                      <Icon size={16} /> {text}
                    </button>
                  ))}
                  <button onClick={async () => { await logout(); navigate('/login'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-mute hover:bg-bad/10 hover:text-bad">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {settings.systemAlert && (
          <div className="flex items-center gap-2 border-b border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn sm:px-6" role="alert">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">{settings.systemAlert}</span>
            <Badge tone="warn">System alert</Badge>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
