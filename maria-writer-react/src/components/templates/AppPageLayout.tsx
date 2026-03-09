import React from 'react';
import { Feather } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AppPageLayout.module.scss';

interface AppPageLayoutProps {
  children: React.ReactNode;
  menuBar?: React.ReactNode;
  headerActions?: React.ReactNode;
  contentClassName?: string;
  flushContent?: boolean;
}

interface NavItem {
  label: string;
  to: string;
}

export const AppPageLayout: React.FC<AppPageLayoutProps> = ({
  children,
  menuBar,
  headerActions,
  contentClassName,
  flushContent = false,
}) => {
  const { isAuthenticated, user } = useAuth();

  const authenticatedNavItems: NavItem[] = [
    { label: 'Editor', to: '/editor' },
    { label: 'Read', to: '/read' },
    { label: 'Statistics', to: '/statistics' },
    { label: 'Profile', to: '/profile' },
  ];

  if (user?.role === 'ADMIN') {
    authenticatedNavItems.push({ label: 'Admin', to: '/admin' });
  }

  const navItems: NavItem[] = isAuthenticated
    ? authenticatedNavItems
    : [
        { label: 'Editor', to: '/editor' },
        { label: 'Statistics', to: '/statistics' },
        { label: 'Sign In', to: '/login' },
        { label: 'Register', to: '/register' },
      ];

  const contentClasses = [
    styles.content,
    flushContent ? styles.flushContent : '',
    contentClassName ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brandRow}>
          <Link to="/" className={styles.brand} aria-label="Maria Writer home">
            <Feather className={styles.brandIcon} />
            <span>Maria Writer</span>
          </Link>

          <nav className={styles.nav} aria-label="Primary">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/editor'}
                className={({ isActive }) => [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {headerActions && <div className={styles.headerActions}>{headerActions}</div>}
      </header>

      {menuBar && <div className={styles.menuBar}>{menuBar}</div>}

      <main className={contentClasses}>{children}</main>
    </div>
  );
};
