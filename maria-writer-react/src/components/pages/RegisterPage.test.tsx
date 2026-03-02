/**
 * Tests for RegisterPage component.
 *
 * Canvas API (used by resizeToDataUrl) is stubbed so no actual rendering happens.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Stubs — must be declared before vi.mock factory runs
// ---------------------------------------------------------------------------

// Stub canvas toDataURL
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    drawImage: vi.fn(),
  }),
  configurable: true,
});
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/jpeg;base64,stub',
  configurable: true,
});

// Stub URL.createObjectURL / revokeObjectURL
globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:stub');
globalThis.URL.revokeObjectURL = vi.fn();

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
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

vi.mock('./RegisterPage.module.scss', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillAndSubmit({
  username = 'testuser',
  email = 'test@example.com',
  password = 'Secret1!',
  confirm = 'Secret1!',
}: {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

// eslint-disable-next-line import/first
import { RegisterPage } from './RegisterPage';

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('RegisterPage – rendering', () => {
  it('renders all required fields', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('renders optional genre tags field', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/favourite genres/i)).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('renders Continue as Guest button', () => {
    render(<RegisterPage />);
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Password strength meter
// ---------------------------------------------------------------------------

describe('RegisterPage – password strength', () => {
  it('does not show strength meter when password is empty', () => {
    render(<RegisterPage />);
    expect(screen.queryByText(/weak|fair|good|strong/i)).not.toBeInTheDocument();
  });

  it('shows Weak for a short password', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abc' } });
    // Only 0 criteria met (no uppercase, no special, length < 8) → no label at score 0
    // with 'abc' → score 0 → label is empty. Try a slightly longer one.
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abcdefgh' } });
    // length >= 8 → score 1 → Weak
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('shows Strong for a fully qualifying password', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SuperSecret1!' } });
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Password mismatch
// ---------------------------------------------------------------------------

describe('RegisterPage – password mismatch', () => {
  it('shows mismatch error when confirm differs', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret1!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Different1!' } });
    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it('disables Create Account button when passwords mismatch', () => {
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret1!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Nope' } });
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Form submission
// ---------------------------------------------------------------------------

describe('RegisterPage – form submission', () => {
  it('calls register() with correct payload on submit', async () => {
    mockRegister.mockResolvedValueOnce({ isNewUser: true });
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Secret1!',
      })
    ));
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does not call register() when passwords mismatch', async () => {
    render(<RegisterPage />);
    await fillAndSubmit({ password: 'Secret1!', confirm: 'Different!' });
    expect(mockRegister).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/passwords don.t match/i)
    );
  });

  it('shows server error on registration failure', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Username already taken'));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Username already taken')
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    let resolve!: (value?: unknown) => void;
    mockRegister.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
    );
    resolve();
  });

  it('includes genreTags in payload when provided', async () => {
    mockRegister.mockResolvedValueOnce({ isNewUser: true });
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/favourite genres/i), {
      target: { value: 'Fantasy, Sci-Fi' },
    });
    await fillAndSubmit();

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ genreTags: 'Fantasy, Sci-Fi' })
    ));
  });
});

// ---------------------------------------------------------------------------
// Password visibility
// ---------------------------------------------------------------------------

describe('RegisterPage – password visibility toggles', () => {
  it('toggles the password field', () => {
    render(<RegisterPage />);
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getAllByLabelText('Show password')[0]);
    expect(input.type).toBe('text');
  });

  it('password eye toggle prevents mouseDown default so it cannot steal focus', () => {
    render(<RegisterPage />);
    const notPrevented = fireEvent.mouseDown(screen.getAllByLabelText('Show password')[0]);
    expect(notPrevented).toBe(false);
  });

  it('confirm-password eye toggle prevents mouseDown default so it cannot steal focus', () => {
    render(<RegisterPage />);
    // Fill in password first so both eye buttons are present
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret1!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Secret1!' } });
    const confirmEye = screen.getAllByLabelText('Show password')[1];
    const notPrevented = fireEvent.mouseDown(confirmEye);
    expect(notPrevented).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Guest navigation
// ---------------------------------------------------------------------------

describe('RegisterPage – guest button', () => {
  it('navigates to / when clicking Continue as Guest', () => {
    render(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
