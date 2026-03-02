/**
 * Tests for LoginPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './LoginPage';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin    = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login:    mockLogin,
    returnTo: null,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) =>
      <a href={to} className={className}>{children}</a>,
  };
});

vi.mock('./LoginPage.module.scss', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('LoginPage – rendering', () => {
  it('renders email, password, and submit button', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders link to register page', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: /create a free account/i })).toHaveAttribute('href', '/register');
  });

  it('renders continue as guest button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Password visibility toggle
// ---------------------------------------------------------------------------

describe('LoginPage – password visibility', () => {
  it('toggles password field type', async () => {
    render(<LoginPage />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(input.type).toBe('text');

    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(input.type).toBe('password');
  });

  it('eye toggle prevents mouseDown default so it cannot steal focus from password input', () => {
    render(<LoginPage />);
    // fireEvent returns false when the event's default was prevented
    const notPrevented = fireEvent.mouseDown(screen.getByLabelText('Show password'));
    expect(notPrevented).toBe(false);
  });

  it('can submit successfully with password visible (eye toggled on)', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'),    { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret1!' } });

    // Reveal password — simulates the user clicking the eye
    fireEvent.mouseDown(screen.getByLabelText('Show password'));
    fireEvent.click(screen.getByLabelText('Show password'));
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('text');

    // Submit while password is visible
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Secret1!',
        rememberMe: false,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------

describe('LoginPage – form submission', () => {
  it('calls login with email and password', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret1!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Secret1!',
      rememberMe: false,
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('shows error alert on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid email or password'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@x.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables submit button while request is in flight', async () => {
    let resolve!: () => void;
    mockLogin.mockReturnValueOnce(new Promise<void>(r => { resolve = r; }));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    );
    resolve();
  });

  it('includes rememberMe=true when checkbox is checked', async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith(
      expect.objectContaining({ rememberMe: true })
    ));
  });
});

// ---------------------------------------------------------------------------
// Guest navigation
// ---------------------------------------------------------------------------

describe('LoginPage – guest button', () => {
  it('navigates to / when continuing as guest', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
