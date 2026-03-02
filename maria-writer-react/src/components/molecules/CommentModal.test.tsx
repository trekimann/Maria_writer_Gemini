/**
 * Tests for CommentModal — covers:
 *   · Guest auto-fill from localStorage
 *   · Authenticated auto-fill from profile (displayName > username)
 *   · localStorage saved only for guests, skipped for authenticated users
 *   · Validation alerts (empty name, empty comment, missing replacement text)
 *   · Suggestion toggle shows replacement textarea
 *   · onSave called with correct payload
 *   · Escape key closes, isOpen=false renders nothing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentModal } from './CommentModal';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('./CommentModal.module.scss', () => ({
  default: new Proxy({}, { get: (_t, p) => String(p) }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';
const mockedUseAuth = vi.mocked(useAuth);

function setAuthState(overrides: Partial<ReturnType<typeof useAuth>>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    returnTo: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    setReturnTo: vi.fn(),
    ...overrides,
  });
}

const MOCK_USER = {
  id: 'u-1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER' as const,
  tier: 'DEFAULT' as const,
  genreTags: null,
  profilePicture: null,
};

// Default props factory
const defaultProps = (overrides = {}) => ({
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  position: { x: 0, y: 0 },
  selectedText: 'Some selected text',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('CommentModal – rendering', () => {
  it('renders nothing when isOpen is false', () => {
    setAuthState({ isAuthenticated: false });
    const { container } = render(<CommentModal {...defaultProps({ isOpen: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByRole('heading', { name: 'Add Comment' })).toBeInTheDocument();
    expect(screen.getByText('"Some selected text"')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Auto-fill – guest
// ---------------------------------------------------------------------------

describe('CommentModal – guest auto-fill', () => {
  it('leaves name field empty when guest has no localStorage entry', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue('');
  });

  it('auto-fills name from localStorage for guest users', () => {
    localStorage.setItem('maria-comment-author', 'Guest Nick');
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Guest Nick');
  });

  it('saves author name to localStorage on submit for guests', async () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Nick' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'Great passage!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    expect(localStorage.getItem('maria-comment-author')).toBe('Nick');
  });

  it('does not show the "from your profile" hint for guests', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.queryByText(/from your profile/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Auto-fill – authenticated
// ---------------------------------------------------------------------------

describe('CommentModal – authenticated auto-fill', () => {
  it('auto-fills the name field with displayName when authenticated', () => {
    setAuthState({ isAuthenticated: true, user: MOCK_USER });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Test User');
  });

  it('falls back to username when displayName is null', () => {
    setAuthState({
      isAuthenticated: true,
      user: { ...MOCK_USER, displayName: null },
    });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue('testuser');
  });

  it('shows the "from your profile" hint when authenticated', () => {
    setAuthState({ isAuthenticated: true, user: MOCK_USER });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByText(/from your profile/i)).toBeInTheDocument();
  });

  it('name field is read-only when authenticated', () => {
    setAuthState({ isAuthenticated: true, user: MOCK_USER });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveAttribute('readonly');
  });

  it('does NOT save author name to localStorage when authenticated', async () => {
    const onSave = vi.fn();
    setAuthState({ isAuthenticated: true, user: MOCK_USER });
    render(<CommentModal {...defaultProps({ onSave })} />);

    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'Great passage!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    expect(localStorage.getItem('maria-comment-author')).toBeNull();
  });

  it('prefers profile over any stale localStorage value', () => {
    localStorage.setItem('maria-comment-author', 'Stale Guest Name');
    setAuthState({ isAuthenticated: true, user: MOCK_USER });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Test User');
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('CommentModal – validation', () => {
  it('alerts when name is empty', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'A comment' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));
    expect(window.alert).toHaveBeenCalledWith('Please enter your name and comment.');
  });

  it('alerts when comment text is empty', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Nick' } });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));
    expect(window.alert).toHaveBeenCalledWith('Please enter your name and comment.');
  });

  it('alerts when suggestion is checked but replacement text is empty', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Nick' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'A comment' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));
    expect(window.alert).toHaveBeenCalledWith(
      'Please enter replacement text for your suggestion.',
    );
  });
});

// ---------------------------------------------------------------------------
// Suggestion toggle
// ---------------------------------------------------------------------------

describe('CommentModal – suggestion toggle', () => {
  it('shows replacement textarea when suggestion checkbox is checked', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    expect(screen.queryByPlaceholderText(/enter suggested replacement/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByPlaceholderText(/enter suggested replacement/i)).toBeInTheDocument();
  });

  it('hides replacement textarea when checkbox is unchecked again', () => {
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByPlaceholderText(/enter suggested replacement/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// onSave payload
// ---------------------------------------------------------------------------

describe('CommentModal – onSave payload', () => {
  it('calls onSave with correct data for a regular comment', () => {
    const onSave = vi.fn();
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps({ onSave })} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: '  Nick  ' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: '  Great passage!  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    expect(onSave).toHaveBeenCalledWith({
      author: 'Nick',
      text: 'Great passage!',
      isSuggestion: false,
      replacementText: undefined,
    });
  });

  it('calls onSave with correct data for a suggestion', () => {
    const onSave = vi.fn();
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps({ onSave })} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Nick' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'Rephrase this' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText(/enter suggested replacement/i), {
      target: { value: 'New text here' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    expect(onSave).toHaveBeenCalledWith({
      author: 'Nick',
      text: 'Rephrase this',
      isSuggestion: true,
      replacementText: 'New text here',
    });
  });

  it('calls onSave using the profile displayName for authenticated users', () => {
    const onSave = vi.fn();
    setAuthState({ isAuthenticated: true, user: MOCK_USER });
    render(<CommentModal {...defaultProps({ onSave })} />);

    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'Looks good!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ author: 'Test User' }),
    );
  });

  it('resets comment text after successful save', async () => {
    const onSave = vi.fn();
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps({ onSave })} />);

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Nick' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your comment/i), {
      target: { value: 'Gone after save' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add comment/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter your comment/i)).toHaveValue('');
    });
  });
});

// ---------------------------------------------------------------------------
// Keyboard / close
// ---------------------------------------------------------------------------

describe('CommentModal – keyboard & close', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps({ onClose })} />);
    fireEvent.keyDown(screen.getByTestId('comment-modal'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps({ onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when × close button is clicked', () => {
    const onClose = vi.fn();
    setAuthState({ isAuthenticated: false });
    render(<CommentModal {...defaultProps({ onClose })} />);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onClose).toHaveBeenCalled();
  });
});
