import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppPageLayout } from './AppPageLayout';

let mockAuthState = {
  isAuthenticated: false,
  user: null as { role: 'USER' | 'ADMIN' } | null,
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('AppPageLayout', () => {
  beforeEach(() => {
    mockAuthState = { isAuthenticated: false, user: null };
  });

  it('renders the site logo, guest navigation, and injected menu bar', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AppPageLayout menuBar={<div>Toolbar content</div>}>
          <div>Page body</div>
        </AppPageLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /maria writer home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Editor' })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
    expect(screen.getByText('Toolbar content')).toBeInTheDocument();
    expect(screen.getByText('Page body')).toBeInTheDocument();
  });

  it('shows authenticated navigation and marks the active link', () => {
    mockAuthState = { isAuthenticated: true, user: { role: 'USER' } };

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AppPageLayout>
          <div>Profile body</div>
        </AppPageLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Editor' })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: 'Read' })).toHaveAttribute('href', '/read');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.queryByRole('link', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Register' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the admin navigation link for admin users', () => {
    mockAuthState = { isAuthenticated: true, user: { role: 'ADMIN' } };

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppPageLayout>
          <div>Admin body</div>
        </AppPageLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page');
  });
});
