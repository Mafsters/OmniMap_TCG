import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sheetsService } from './googleSheetsService';

const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxT_Mn0L9spyKDwIp8d3Vk_dGsb9V6JWdhb1t9GcBHWqJMeEi9Lq26knezQjfIZ_ZTEHA/exec';

describe('googleSheetsService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  describe('getScriptUrl / setScriptUrl', () => {
    it('returns default URL when localStorage has no script url', () => {
      expect(sheetsService.getScriptUrl()).toBe(DEFAULT_URL);
    });

    it('stores and returns custom script URL', () => {
      const custom = 'https://script.google.com/macros/s/CUSTOM/exec';
      sheetsService.setScriptUrl(custom);
      expect(sheetsService.getScriptUrl()).toBe(custom);
      expect(localStorage.setItem).toHaveBeenCalledWith('omnimap_script_url', custom);
    });

    it('trims whitespace from URL', () => {
      sheetsService.setScriptUrl('  https://example.com/exec  ');
      expect(sheetsService.getScriptUrl()).toBe('https://example.com/exec');
    });
  });

  describe('fetchData', () => {
    it('calls fetch with cache buster and returns parsed data', async () => {
      const mockData = { items: [], rocks: [], employees: [], updates: [] };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await sheetsService.fetchData();
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toMatch(/\?t=\d+|&t=\d+/);
      expect(result).toEqual(mockData);
    });

    it('throws when response is not ok', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(sheetsService.fetchData()).rejects.toThrow();
    });
  });

  describe('dispatch / upsertItem', () => {
    it('sends UPSERT_ITEM action with item in POST body', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const item = { id: 'item-1', title: 'Test', owner: 'Alice', goalId: 'g1' };
      const result = await sheetsService.upsertItem(item);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'UPSERT_ITEM', item }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('upsertProject', () => {
    it('sends UPSERT_PROJECT action with project in POST body', async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const project = {
        id: 'proj-1',
        title: 'My Project',
        description: 'Desc',
        owner: 'Bob',
        status: 'In Progress',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      const result = await sheetsService.upsertProject(project);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('UPSERT_PROJECT'),
        })
      );
      const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.action).toBe('UPSERT_PROJECT');
      expect(body.project).toEqual(project);
      expect(result).toBe(true);
    });
  });
});
