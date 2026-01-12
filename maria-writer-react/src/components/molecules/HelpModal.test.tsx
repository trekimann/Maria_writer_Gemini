import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { HelpModal } from './HelpModal';
import * as HelpContext from '../../context/HelpContext';

// Mock Modal component
vi.mock('./Modal', () => ({
  Modal: ({ isOpen, children, onClose, title }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-modal">
        <button onClick={onClose} aria-label="Close">X</button>
        <h1>{title}</h1>
        {children}
      </div>
    );
  }
}));

// Mock marked
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((text) => Promise.resolve(`<h3>Parsed ${text}</h3>`))
  }
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html) => html)
  }
}));

describe('HelpModal', () => {
  const mockCloseHelp = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = (isOpen: boolean, helpId: string | null) => {
    vi.spyOn(HelpContext, 'useHelp').mockReturnValue({
      isOpen,
      helpId,
      openHelp: vi.fn(),
      closeHelp: mockCloseHelp
    });
    return render(<HelpModal />);
  };

  it('renders nothing when closed', () => {
    setup(false, null);
    expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
  });

  it('renders loading state initially', async () => {
    (global.fetch as any).mockReturnValue(new Promise(() => {})); // Never resolves
    
    setup(true, 'test-doc');
    
    expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    expect(screen.getByText('Loading help content...')).toBeInTheDocument();
  });

  it('fetches and renders content successfully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Hello World')
    });

    setup(true, 'test-doc');

    await waitFor(() => {
      expect(screen.queryByText('Loading help content...')).not.toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/help/test-doc.md');
    // Check for parsed content
    // Since we output raw HTML using dangerouslySetInnerHTML, we look for the result of our mocked marked.parse
    // Note: The mocked marked returns <h3>Parsed # Hello World</h3>, so that will be in the DOM
    expect(screen.getByText('Parsed # Hello World')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false
    });

    setup(true, 'missing-doc');

    await waitFor(() => {
        expect(screen.queryByText('Loading help content...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load help content. Please try again later.')).toBeInTheDocument();
  });

  it('displays error message on network failure', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    setup(true, 'network-error');

    await waitFor(() => {
        expect(screen.queryByText('Loading help content...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load help content. Please try again later.')).toBeInTheDocument();
  });
});
