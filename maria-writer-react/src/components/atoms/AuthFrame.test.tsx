import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthFrame } from './AuthFrame';

const mockSetReturnTo = vi.fn();

let mockAuthState = {
  isLoading: false,
  isAuthenticated: false,
  setReturnTo: mockSetReturnTo,
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('AuthFrame', () => {
  beforeEach(() => {
    mockSetReturnTo.mockClear();
    mockAuthState = {
      isLoading: false,
      isAuthenticated: false,
      setReturnTo: mockSetReturnTo,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading state while auth is being resolved', () => {
    mockAuthState.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthFrame>
          <div>Editor</div>
        </AuthFrame>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Checking authentication');
    expect(screen.queryByText('Editor')).not.toBeInTheDocument();
  });

  it('renders children when auth is ready and the route is public', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthFrame>
          <div>Login page</div>
        </AuthFrame>
      </MemoryRouter>
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users and stores the current location for protected routes', async () => {
    render(
      <MemoryRouter initialEntries={['/profile?tab=account#security']}>
        <Routes>
          <Route
            path="/profile"
            element={
              <AuthFrame requireAuth>
                <div>Protected page</div>
              </AuthFrame>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSetReturnTo).toHaveBeenCalledWith('/profile?tab=account#security');
    });
  });

  it('renders protected content for authenticated users', () => {
    mockAuthState.isAuthenticated = true;

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route
            path="/profile"
            element={
              <AuthFrame requireAuth>
                <div>Profile page</div>
              </AuthFrame>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Profile page')).toBeInTheDocument();
    expect(mockSetReturnTo).not.toHaveBeenCalled();
  });
});
