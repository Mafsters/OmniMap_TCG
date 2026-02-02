
import React, { useState, useEffect } from 'react';
import { JiraConfig } from '../services/jiraService';
import { sheetsService } from '../services/googleSheetsService';

interface JiraSyncModalProps {
  onSync: (config: JiraConfig) => void;
  isSyncing: boolean;
  onCancel: () => void;
}

const JiraSyncModal: React.FC<JiraSyncModalProps> = ({ onSync, isSyncing: externalSyncing, onCancel }) => {
  const [config, setConfig] = useState<JiraConfig>({
    domain: '',
    email: '',
    apiToken: '',
    projectKeys: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; issues?: any[] } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('omnimap_jira_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('omnimap_jira_config', JSON.stringify(config));
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      // Use the backend proxy to fetch Jira issues
      const result = await sheetsService.syncJiraIssues({
        domain: config.domain,
        email: config.email,
        apiToken: config.apiToken,
        projectKeys: config.projectKeys
      });
      
      setSyncResult(result);
      
      if (result.success && result.issues) {
        // Pass the issues to the parent for mapping
        onSync({ ...config, _issues: result.issues } as any);
      }
    } catch (error: any) {
      setSyncResult({ success: false, message: error.message || 'Unknown error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await sheetsService.syncJiraIssues({
        domain: config.domain,
        email: config.email,
        apiToken: config.apiToken,
        projectKeys: config.projectKeys
      });
      
      setSyncResult({
        success: result.success,
        message: result.success 
          ? `✅ Connection successful! Found ${result.issues?.length || 0} issues.`
          : `❌ ${result.message}`
      });
    } catch (error: any) {
      setSyncResult({ success: false, message: `❌ ${error.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53zM6.77 6.8a4.362 4.362 0 0 0 4.34 4.38h1.8v1.7c0 2.4 1.93 4.34 4.33 4.35V7.65a.85.85 0 0 0-.85-.85H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.38h1.78v1.7c.01 2.39 1.95 4.33 4.35 4.33v-9.57a.84.84 0 0 0-.85-.84H2z"/>
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Jira Cloud Integration</h4>
          <p className="text-xs text-blue-600">Sync tickets to your roadmap (via backend proxy - no CORS issues!)</p>
        </div>
      </div>

      {syncResult && (
        <div className={`p-4 rounded-xl border ${syncResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium ${syncResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
            {syncResult.message}
          </p>
          {syncResult.success && syncResult.issues && syncResult.issues.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2">Sample issues:</p>
              {syncResult.issues.slice(0, 5).map((issue: any) => (
                <div key={issue.key} className="text-xs bg-white p-2 rounded mb-1 border border-slate-100">
                  <span className="font-bold text-blue-600">{issue.key}</span>
                  <span className="mx-2 text-slate-400">|</span>
                  <span className="text-slate-700">{issue.summary?.substring(0, 50)}{issue.summary?.length > 50 ? '...' : ''}</span>
                </div>
              ))}
              {syncResult.issues.length > 5 && (
                <p className="text-xs text-slate-400 mt-1">...and {syncResult.issues.length - 5} more</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Jira Domain</label>
          <input 
            type="text" 
            placeholder="your-company.atlassian.net"
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-medium"
            value={config.domain}
            onChange={e => setConfig({...config, domain: e.target.value})}
            required
          />
          <p className="text-xs text-slate-400 mt-1">Just the domain, without https://</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
            <input 
              type="email" 
              placeholder="you@company.com"
              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-medium"
              value={config.email}
              onChange={e => setConfig({...config, email: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">API Token</label>
            <input 
              type="password" 
              placeholder="Your Jira API token"
              className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-medium"
              value={config.apiToken}
              onChange={e => setConfig({...config, apiToken: e.target.value})}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Project Keys (Optional)</label>
          <input 
            type="text" 
            placeholder="PROD, TECH, ENG (leave empty for all)"
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none font-medium"
            value={config.projectKeys}
            onChange={e => setConfig({...config, projectKeys: e.target.value})}
          />
          <p className="text-xs text-slate-400 mt-1">Comma-separated project keys to filter issues</p>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isSyncing || !config.domain || !config.email || !config.apiToken}
          className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300"
        >
          {isSyncing ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          type="submit"
          disabled={isSyncing || externalSyncing || !config.domain || !config.email || !config.apiToken}
          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSyncing || externalSyncing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Fetch & Import Issues
            </>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
      >
        Cancel
      </button>

      <div className="border-t border-slate-200 pt-4 mt-4">
        <p className="text-xs text-slate-500">
          <strong>How to get an API token:</strong> Go to{' '}
          <a 
            href="https://id.atlassian.com/manage-profile/security/api-tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Atlassian Account Settings
          </a>
          {' '}→ Security → Create API token
        </p>
      </div>
    </form>
  );
};

export default JiraSyncModal;
