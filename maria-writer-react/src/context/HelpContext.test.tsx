import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { HelpProvider, useHelp } from './HelpContext';

describe('HelpContext', () => {
  it('should provide default values', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: HelpProvider });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.helpId).toBeNull();
  });

  it('should open help with specific id', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: HelpProvider });
    
    act(() => {
      result.current.openHelp('test-id');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.helpId).toBe('test-id');
  });

  it('should close help', () => {
    const { result } = renderHook(() => useHelp(), { wrapper: HelpProvider });
    
    act(() => {
      result.current.openHelp('test-id');
    });
    
    act(() => {
      result.current.closeHelp();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.helpId).toBeNull();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test since React will log the error boundary catch
    const consoleSpy = vi.spyOn(console, 'error');
    consoleSpy.mockImplementation(() => {});

    expect(() => renderHook(() => useHelp())).toThrow('useHelp must be used within a HelpProvider');

    consoleSpy.mockRestore();
  });
});
