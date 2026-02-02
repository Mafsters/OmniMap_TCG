import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';

const originalEnv = import.meta.env;

describe('authService', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      ...globalThis.window,
      google: undefined,
    });
    // Reset module env - Vitest doesn't easily let us override import.meta.env per test,
    // so we test behaviour when window.google is missing instead.
  });

  describe('initialize', () => {
    it('does not throw when window.google is undefined', () => {
      expect(() => authService.initialize()).not.toThrow();
    });

    it('getStoredUser returns null when sessionStorage is empty', () => {
      vi.stubGlobal('sessionStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      });
      expect(authService.getStoredUser()).toBeNull();
    });

    it('hasActiveSession returns false when no session in storage', () => {
      vi.stubGlobal('sessionStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      });
      expect(authService.hasActiveSession()).toBe(false);
    });
  });
});
