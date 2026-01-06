import { describe, it, vi, beforeEach, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Editor } from './Editor';
import { StoreProvider } from '../../context/StoreContext';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Save: () => <div data-testid="save-icon" />,
  History: () => <div data-testid="history-icon" />,
  User: () => <div data-testid="user-icon" />,
  Book: () => <div data-testid="book-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  X: () => <div data-testid="x-icon" />,
  MessageSquare: () => <div data-testid="message-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Hash: () => <div data-testid="hash-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Code: () => <div data-testid="code-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
}));

// Setup safe defaults for window.getSelection
beforeEach(() => {
  window.getSelection = vi.fn().mockReturnValue({
    rangeCount: 0,
    getRangeAt: vi.fn(),
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  });
});

describe('Editor Mentions UI', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <StoreProvider>
        <Editor />
      </StoreProvider>
    );
    // Log the structure to see what's actually rendered
    console.log(container.innerHTML);
    expect(container).toBeDefined();
  });
});
