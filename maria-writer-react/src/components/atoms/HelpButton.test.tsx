import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpButton } from './HelpButton';
import { HelpProvider } from '../../context/HelpContext';

// Mock Lucide icon to avoid issues
vi.mock('lucide-react', () => ({
  HelpCircle: (props: any) => <svg data-testid="help-icon" {...props} />
}));

// Mock the context hook
const mockOpenHelp = vi.fn();
vi.mock('../../context/HelpContext', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../context/HelpContext')>();
    return {
        ...actual,
        useHelp: () => ({
            openHelp: mockOpenHelp
        })
    };
});

describe('HelpButton', () => {
  it('renders correctly', () => {
    render(
        <HelpButton helpId="test-help" />
    );
    expect(screen.getByTestId('help-icon')).toBeInTheDocument();
  });

  it('calls openHelp with correct id when clicked', () => {
    render(
        <HelpButton helpId="my-feature" />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOpenHelp).toHaveBeenCalledWith('my-feature');
  });

  it('applies custom class name', () => {
      const { container } = render(
          <HelpButton helpId="test" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
  });
});
