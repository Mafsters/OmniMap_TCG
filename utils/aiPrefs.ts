const STORAGE_KEY = 'omnimap_ai_enabled';

/** Whether AI features (Gemini) are enabled. Default: false to avoid API costs during testing. */
export function getAiEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export function setAiEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}
