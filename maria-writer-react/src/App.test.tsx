import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreProvider } from './context/StoreContext';
import { MainLayout } from './components/templates/MainLayout';

// Mock vis-network
vi.mock('vis-network/standalone', () => {
  return {
    DataSet: class {
      add = vi.fn();
      remove = vi.fn();
      update = vi.fn();
    },
    Network: class {
      on = vi.fn();
      destroy = vi.fn();
    },
  };
});

// Mock SortableJS
vi.mock('sortablejs', () => ({
  default: {
    create: vi.fn().mockReturnValue({
      destroy: vi.fn(),
    }),
  },
}));

describe('App Integration', () => {
  it('renders the TopBar and Sidebar', () => {
    render(
      <StoreProvider>
        <MainLayout />
      </StoreProvider>
    );

    expect(screen.getByText('Maria Writer')).toBeInTheDocument();
    expect(screen.getByText('Chapters')).toBeInTheDocument();
    expect(screen.getByText('Manuscript')).toBeInTheDocument();
  });

  it('switches to Codex view', () => {
    render(
      <StoreProvider>
        <MainLayout />
      </StoreProvider>
    );

    const codexBtn = screen.getByText('Codex');
    fireEvent.click(codexBtn);

    // Should show Codex tabs
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('opens Metadata modal', () => {
    render(
      <StoreProvider>
        <MainLayout />
      </StoreProvider>
    );

    // Find the Info button in TopBar. It has title="Info"
    const infoBtn = screen.getByTitle('Info');
    fireEvent.click(infoBtn);

    // Modal should be visible
    expect(screen.getByText('Book Metadata')).toBeInTheDocument();
  });
});
