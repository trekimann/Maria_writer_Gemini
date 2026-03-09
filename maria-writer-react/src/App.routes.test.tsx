import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

const mockSetReturnTo = vi.fn();

let mockAuthState = {
  isLoading: false,
  isAuthenticated: false,
  user: null as { role: 'USER' | 'ADMIN' } | null,
  setReturnTo: mockSetReturnTo,
};

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthState,
}));

vi.mock('./context/StoreContext', () => ({
  StoreProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./context/HelpContext', () => ({
  HelpProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./components/templates/MainLayout', () => ({
  MainLayout: () => <div>Editor route</div>,
}));

vi.mock('./components/molecules/HelpModal', () => ({
  HelpModal: () => <div>Help modal</div>,
}));

vi.mock('./components/pages/LoginPage', () => ({
  LoginPage: () => <div>Login route</div>,
}));

vi.mock('./components/pages/RegisterPage', () => ({
  RegisterPage: () => <div>Register route</div>,
}));

vi.mock('./components/pages/ProjectStatisticsPage', () => ({
  ProjectStatisticsPage: () => <div>Statistics route</div>,
}));

vi.mock('./components/pages/UserProfilePage', () => ({
  UserProfilePage: () => <div>Profile route</div>,
}));

vi.mock('./components/pages/AdminPage', () => ({
  AdminPage: () => <div>Admin route</div>,
}));

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      isLoading: false,
      isAuthenticated: false,
      user: null,
      setReturnTo: mockSetReturnTo,
    };
  });

  it('redirects the root route to the editor route', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByText('Editor route')).toBeInTheDocument();
  });

  it('renders the profile route for authenticated users', async () => {
    mockAuthState.isAuthenticated = true;
    window.history.pushState({}, '', '/profile');
    render(<App />);

    expect(await screen.findByText('Profile route')).toBeInTheDocument();
  });

  it('renders the statistics route', async () => {
    window.history.pushState({}, '', '/statistics');
    render(<App />);

    expect(await screen.findByText('Statistics route')).toBeInTheDocument();
  });

  it('redirects unauthenticated profile visits to login and stores returnTo', async () => {
    window.history.pushState({}, '', '/profile');
    render(<App />);

    expect(await screen.findByText('Login route')).toBeInTheDocument();
    expect(mockSetReturnTo).toHaveBeenCalledWith('/profile');
  });

  it('renders the admin route for admin users', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { role: 'ADMIN' };
    window.history.pushState({}, '', '/admin');
    render(<App />);

    expect(await screen.findByText('Admin route')).toBeInTheDocument();
  });

  it('redirects non-admin users away from the admin route', async () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { role: 'USER' };
    window.history.pushState({}, '', '/admin');
    render(<App />);

    expect(await screen.findByText('Editor route')).toBeInTheDocument();
  });
});
