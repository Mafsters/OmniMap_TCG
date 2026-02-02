
import React, { useState, useEffect, useRef } from 'react';
import { Employee, GoogleUser } from '../types';
import { authService } from '../services/authService';
import { getAiEnabled, setAiEnabled } from '../utils/aiPrefs';

interface LoginScreenProps {
  employees: Employee[];
  onLogin: (employee: Employee) => void;
  onAuthError?: (error: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ employees, onLogin, onAuthError }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  // Dev mode bypass (only on localhost)
  const isDevMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const [devCode, setDevCode] = useState('');
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devCodeValidated, setDevCodeValidated] = useState(false);
  const [devSearchTerm, setDevSearchTerm] = useState('');
  const [aiEnabled, setAiEnabledState] = useState(() => getAiEnabled());

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Initialize Google Sign-In when component mounts
    const initAuth = () => {
      console.log('[LoginScreen] Initializing Google Sign-In...');
      console.log('[LoginScreen] Google script loaded:', !!window.google?.accounts);
      console.log('[LoginScreen] Button ref available:', !!buttonRef.current);
      
      if (window.google?.accounts) {
        console.log('[LoginScreen] Google accounts available, initializing...');
        authService.initialize();
        
        // Render the sign-in button
        if (buttonRef.current) {
          setTimeout(() => {
            console.log('[LoginScreen] Rendering button...');
            authService.renderButton('google-signin-button', {
              theme: 'outline',
              size: 'large',
            });
          }, 100);
        } else {
          console.error('[LoginScreen] Button ref not available');
        }
      } else {
        console.log('[LoginScreen] Waiting for Google script to load...');
        // Wait for Google script to load
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkGoogle = setInterval(() => {
          attempts++;
          if (window.google?.accounts) {
            console.log('[LoginScreen] Google script loaded after', attempts * 100, 'ms');
            clearInterval(checkGoogle);
            authService.initialize();
            if (buttonRef.current) {
              setTimeout(() => {
                authService.renderButton('google-signin-button', {
                  theme: 'outline',
                  size: 'large',
                });
              }, 100);
            }
          } else if (attempts >= maxAttempts) {
            console.error('[LoginScreen] Google script failed to load after', maxAttempts * 100, 'ms');
            clearInterval(checkGoogle);
            setError('Failed to load Google Sign-In. Please refresh the page.');
          }
        }, 100);
        
        return () => clearInterval(checkGoogle);
      }
    };

    // Wait a bit for the DOM to be ready
    const timer = setTimeout(() => {
      initAuth();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Listen for authentication success
    const handleSignInSuccess = (event: CustomEvent) => {
      setIsAuthenticating(true);
      setError(null);
      
      const { googleUser } = event.detail as { googleUser: GoogleUser };
      
      // Match Google user to Employee
      const employee = authService.matchEmployeeByEmail(googleUser, employees);
      
      if (employee) {
        setIsAuthenticating(false);
        onLogin(employee);
      } else {
        setIsAuthenticating(false);
        const errorMsg = `No employee record found for ${googleUser.email}. Please contact your administrator.`;
        setError(errorMsg);
        if (onAuthError) {
          onAuthError(errorMsg);
        }
      }
    };

    // Listen for authentication errors
    const handleSignInError = (event: CustomEvent) => {
      setIsAuthenticating(false);
      const { error: errorMsg } = event.detail as { error: string };
      setError(errorMsg);
      if (onAuthError) {
        onAuthError(errorMsg);
      }
    };

    window.addEventListener('google-signin-success', handleSignInSuccess as EventListener);
    window.addEventListener('google-signin-error', handleSignInError as EventListener);

    return () => {
      window.removeEventListener('google-signin-success', handleSignInSuccess as EventListener);
      window.removeEventListener('google-signin-error', handleSignInError as EventListener);
    };
  }, [employees, onLogin, onAuthError]);

  // Dev mode - validate code
  const handleDevCodeSubmit = () => {
    if (devCode === '123') {
      setDevCodeValidated(true);
      setError(null);
    } else {
      setError('Invalid dev code');
    }
  };

  // Dev mode - login as selected employee
  const handleDevLoginAs = (employee: Employee) => {
    console.log('[Dev Login] Impersonating:', employee.id, employee.name, employee.email);
    onLogin(employee);
  };

  // Filter employees for dev mode search
  const filteredDevEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(devSearchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(devSearchTerm.toLowerCase()) ||
    e.department?.toLowerCase().includes(devSearchTerm.toLowerCase()) ||
    e.role?.toLowerCase().includes(devSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* Main Card */}
      <div 
        className={`
          w-full max-w-xl bg-white rounded-2xl shadow-elevated border border-slate-300 overflow-hidden
          transition-all duration-500 ease-out
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-teal-600 rounded-xl">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                OmniMap
              </h1>
              <p className="text-sm text-slate-500">
                Strategic Roadmap Platform
              </p>
            </div>
          </div>
          <p className="mt-4 text-slate-600">
            Sign in with your company Google account to access your dashboard.
          </p>
        </div>

        {/* Sign-In Section */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-rose-900">Authentication Error</p>
                  <p className="text-sm text-rose-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isAuthenticating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">Authenticating...</p>
              <p className="text-sm text-slate-500 mt-2">Please wait</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              {/* AI features toggle – default OFF to avoid API costs during testing */}
              <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiEnabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAiEnabledState(checked);
                      setAiEnabled(checked);
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Enable AI features</span>
                </label>
                <p className="text-xs text-slate-500 mt-2 ml-7">
                  AI suggestions and insights use the Gemini API and may incur costs. Leave off while testing.
                </p>
              </div>

              <div 
                id="google-signin-button" 
                ref={buttonRef}
                className="w-full flex justify-center"
              />
              <p className="text-xs text-slate-500 text-center">
                Only company Google Workspace accounts are authorized to access this application.
              </p>

              {/* Dev Mode Bypass (localhost only) */}
              {isDevMode && (
                <div className="w-full pt-6 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowDevLogin(!showDevLogin);
                      if (showDevLogin) {
                        setDevCodeValidated(false);
                        setDevCode('');
                        setDevSearchTerm('');
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showDevLogin ? 'Hide' : 'Show'} Dev Login
                  </button>
                  
                  {showDevLogin && !devCodeValidated && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-medium text-amber-900 mb-3">
                        Development Mode Only
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={devCode}
                          onChange={(e) => setDevCode(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleDevCodeSubmit()}
                          placeholder="Enter dev code"
                          className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          onClick={handleDevCodeSubmit}
                          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          Unlock
                        </button>
                      </div>
                    </div>
                  )}

                  {showDevLogin && devCodeValidated && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs font-medium text-amber-900 mb-3">
                        Select a user to impersonate
                      </p>
                      
                      {/* Search input */}
                      <div className="relative mb-3">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={devSearchTerm}
                          onChange={(e) => setDevSearchTerm(e.target.value)}
                          placeholder="Search by name, email, department..."
                          className="w-full pl-9 pr-3 py-2 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                        />
                      </div>

                      {/* Employee list */}
                      <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-amber-200 bg-white">
                        {filteredDevEmployees.length === 0 ? (
                          <p className="p-3 text-xs text-slate-500 text-center">No employees found</p>
                        ) : (
                          filteredDevEmployees.map((employee) => (
                            <button
                              key={employee.id}
                              onClick={() => handleDevLoginAs(employee)}
                              className="w-full flex items-center gap-3 p-2 text-left hover:bg-amber-100 transition-colors border-b border-amber-100 last:border-b-0"
                            >
                              <img 
                                src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random&color=fff`}
                                alt={employee.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{employee.name}</p>
                                <p className="text-xs text-slate-500 truncate">
                                  {employee.department} {employee.role ? `• ${employee.role}` : ''}
                                </p>
                              </div>
                              <span className={`
                                text-[10px] font-medium px-2 py-0.5 rounded-full
                                ${employee.accessLevel === 'Admin' 
                                  ? 'bg-teal-100 text-teal-700' 
                                  : employee.accessLevel === 'Manager' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-slate-100 text-slate-600'
                                }
                              `}>
                                {employee.accessLevel}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      
                      <p className="text-xs text-amber-700 mt-3">
                        {filteredDevEmployees.length} of {employees.length} employees
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs">Connected to Google Sheets</span>
          </div>
          <span className="text-xs text-slate-500">v3.0</span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
