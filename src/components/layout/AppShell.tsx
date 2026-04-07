import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <div className="app-shell">
      <TopBar mobileNavOpen={mobileNavOpen} onToggleMobileNav={() => setMobileNavOpen((current) => !current)} />
      <div className="app-body">
        <Sidebar mobileNavOpen={mobileNavOpen} onCloseMobileNav={() => setMobileNavOpen(false)} />
        <main className="app-main">{children}</main>
      </div>
      {mobileNavOpen ? (
        <button
          type="button"
          className="mobile-sidebar-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
    </div>
  );
}
