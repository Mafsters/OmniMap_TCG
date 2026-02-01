import { GoogleUser, Employee } from '../types';

// Google Client ID - Set this via environment variable VITE_GOOGLE_CLIENT_ID
// For now, using a placeholder that will be replaced when you add your Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Company domain - Set this via environment variable VITE_GOOGLE_WORKSPACE_DOMAIN
// Example: 'yourcompany.com'
const WORKSPACE_DOMAIN = import.meta.env.VITE_GOOGLE_WORKSPACE_DOMAIN || '';

// Session storage keys
const SESSION_KEY = 'omnimap_auth_session';
const USER_KEY = 'omnimap_google_user';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

class AuthService {
  private initialized = false;

  /**
   * Initialize Google Identity Services
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not found. Please set VITE_GOOGLE_CLIENT_ID in your .env file');
      console.error('Current value:', GOOGLE_CLIENT_ID || '(empty)');
      return;
    }

    if (!window.google?.accounts) {
      console.error('Google Identity Services not loaded. Make sure the script is included in index.html');
      return;
    }

    try {
      const config: any = {
        client_id: GOOGLE_CLIENT_ID,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      };

      // Restrict to workspace domain if configured
      if (WORKSPACE_DOMAIN) {
        config.hd = WORKSPACE_DOMAIN;
      }

      window.google.accounts.id.initialize(config);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Identity Services:', error);
    }
  }

  /**
   * Handle the credential response from Google Sign-In
   */
  private async handleCredentialResponse(response: { credential: string }): Promise<void> {
    try {
      // Decode the JWT token to get user info
      const payload = this.decodeJWT(response.credential);
      
      if (!payload) {
        throw new Error('Failed to decode Google token');
      }

      // Extract user information
      const googleUser: GoogleUser = {
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture,
        hd: payload.hd, // Hosted domain
      };

      // Validate workspace domain if configured
      if (WORKSPACE_DOMAIN && googleUser.hd !== WORKSPACE_DOMAIN) {
        throw new Error(`Access restricted to ${WORKSPACE_DOMAIN} accounts only`);
      }

      // Store user info
      this.saveSession(googleUser, response.credential);

      // Dispatch custom event for App.tsx to handle
      window.dispatchEvent(new CustomEvent('google-signin-success', { 
        detail: { googleUser } 
      }));
    } catch (error: any) {
      console.error('Authentication error:', error);
      window.dispatchEvent(new CustomEvent('google-signin-error', { 
        detail: { error: error.message || 'Authentication failed' } 
      }));
    }
  }

  /**
   * Decode JWT token (client-side only, for basic user info)
   * Note: In production, you should validate tokens server-side
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }

  /**
   * Save authentication session
   */
  private saveSession(googleUser: GoogleUser, credential: string): void {
    try {
      sessionStorage.setItem(USER_KEY, JSON.stringify(googleUser));
      // Store minimal session info (not the full token for security)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        email: googleUser.email,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Get stored Google user info
   */
  getStoredUser(): GoogleUser | null {
    try {
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession(): boolean {
    try {
      const session = sessionStorage.getItem(SESSION_KEY);
      if (!session) return false;
      
      const sessionData = JSON.parse(session);
      // Session expires after 24 hours
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      return Date.now() - sessionData.timestamp < TWENTY_FOUR_HOURS;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sign out user
   */
  signOut(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(USER_KEY);
      
      // Revoke Google session if available
      if (window.google?.accounts) {
        window.google.accounts.id.disableAutoSelect();
      }
      
      window.dispatchEvent(new CustomEvent('google-signout'));
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  /**
   * Match Google user to Employee by email
   */
  matchEmployeeByEmail(googleUser: GoogleUser, employees: Employee[]): Employee | null {
    if (!googleUser.email) {
      console.log('[AuthService] No email provided for matching');
      return null;
    }

    console.log('[AuthService] Matching user:', googleUser.email, 'against', employees.length, 'employees');
    
    // Try exact match first
    let employee = employees.find(
      emp => emp.email?.toLowerCase() === googleUser.email.toLowerCase()
    );

    if (employee) {
      console.log('[AuthService] Found employee by email:', employee.id, employee.name, employee.email);
    } else {
      console.log('[AuthService] No email match found, trying name matching...');
      // If no exact match, try matching by name (fallback)
      const nameParts = googleUser.name.toLowerCase().split(' ');
      employee = employees.find(emp => {
        const empName = emp.name.toLowerCase();
        return nameParts.some(part => empName.includes(part)) || 
               empName.split(' ').some(part => nameParts.includes(part));
      });
      
      if (employee) {
        console.log('[AuthService] Found employee by name:', employee.id, employee.name, employee.email);
        // If matched by name, ensure email is set for consistency
        if (!employee.email) {
          employee = { ...employee, email: googleUser.email };
          console.log('[AuthService] Added email to employee record:', employee.email);
        }
      } else {
        console.log('[AuthService] No employee match found for:', googleUser.email, googleUser.name);
      }
    }

    return employee || null;
  }

  /**
   * Render Google Sign-In button
   */
  renderButton(elementId: string, config?: { theme?: 'outline' | 'filled_blue' | 'filled_black'; size?: 'large' | 'medium' | 'small' }): void {
    console.log('[AuthService] renderButton called for:', elementId);
    console.log('[AuthService] Client ID present:', !!GOOGLE_CLIENT_ID);
    console.log('[AuthService] Google accounts available:', !!window.google?.accounts);
    
    if (!GOOGLE_CLIENT_ID) {
      console.error('[AuthService] Cannot render button: Client ID missing');
      return;
    }

    if (!this.initialized) {
      console.log('[AuthService] Initializing before rendering button...');
      this.initialize();
      
      if (!this.initialized) {
        console.error('[AuthService] Initialization failed, cannot render button');
        return;
      }
    }

    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`[AuthService] Element with id "${elementId}" not found`);
      return;
    }

    if (!window.google?.accounts) {
      console.error('[AuthService] Google Identity Services not loaded');
      return;
    }

    try {
      console.log('[AuthService] Rendering button with config:', config);
      window.google.accounts.id.renderButton(element, {
        type: config?.theme || 'standard',
        size: config?.size || 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });
      console.log('[AuthService] Button rendered successfully');
    } catch (error) {
      console.error('[AuthService] Failed to render Google Sign-In button:', error);
    }
  }

  /**
   * Prompt user to sign in (one-tap)
   */
  prompt(): void {
    if (!this.initialized) {
      this.initialize();
    }

    if (window.google?.accounts) {
      try {
        window.google.accounts.id.prompt();
      } catch (error) {
        console.error('Failed to prompt Google Sign-In:', error);
      }
    }
  }
}

export const authService = new AuthService();
