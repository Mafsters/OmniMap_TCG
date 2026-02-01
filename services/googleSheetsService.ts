
import { RoadmapItem, StrategicGoal, Employee, MonthlyUpdate, ActionPayload, ItemUpdate, SalesMetricData, SalesActionItem, HiBobConfig, WorkableConfig, SalesforceConfig } from "../types";

/**
 * GOOGLE APPS SCRIPT BACKEND (V7 - SALES MODULE):
 * see SyncPanel.tsx for the full script
 */

export interface SheetsData {
  rocks: StrategicGoal[];
  items: RoadmapItem[];
  employees: Employee[];
  updates: MonthlyUpdate[];
  itemUpdates?: ItemUpdate[];
  salesData?: SalesMetricData[];
  salesActions?: SalesActionItem[];
}

/** Item due for follow-up (for n8n / Slack); returned by list_follow_ups API */
export interface FollowUpItem {
  itemId: string;
  title: string;
  ownerName: string;
  ownerEmail: string;
  lastUpdate?: string;
  lastUpdateDate?: string;
}

// User provided default deployment
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxT_Mn0L9spyKDwIp8d3Vk_dGsb9V6JWdhb1t9GcBHWqJMeEi9Lq26knezQjfIZ_ZTEHA/exec';

class GoogleSheetsService {
  private scriptUrl: string | null = localStorage.getItem('omnimap_script_url') || DEFAULT_SCRIPT_URL;

  setScriptUrl(url: string) {
    let cleanUrl = url.trim();
    this.scriptUrl = cleanUrl;
    localStorage.setItem('omnimap_script_url', cleanUrl);
  }

  getScriptUrl() {
    return this.scriptUrl || DEFAULT_SCRIPT_URL;
  }

  async fetchData(): Promise<SheetsData | null> {
    const url = this.getScriptUrl();
    if (!url) return null;
    
    try {
      const separator = url.includes('?') ? '&' : '?';
      const urlWithCacheBuster = `${url}${separator}t=${Date.now()}`;
      
      const response = await fetch(urlWithCacheBuster, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      return rawData;
    } catch (error) {
      console.error('Sheets Fetch Error:', error);
      throw error; 
    }
  }

  private async dispatch(payload: ActionPayload): Promise<boolean> {
    const url = this.getScriptUrl();
    if (!url) {
      console.error('[Sheets Dispatch] No script URL configured');
      return false;
    }
    console.log('[Sheets Dispatch] Sending:', payload.action, payload);
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('[Sheets Dispatch] Request sent (no-cors mode, response status unknown)');
      return true;
    } catch (error) {
      console.error('[Sheets Dispatch] Error:', error);
      return false;
    }
  }

  async upsertItem(item: Partial<RoadmapItem>): Promise<boolean> {
    return this.dispatch({ action: 'UPSERT_ITEM', item });
  }

  async upsertItems(items: Partial<RoadmapItem>[]): Promise<boolean> {
    try {
      const promises = items.map(item => this.upsertItem(item));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Batch Upsert Error:', error);
      return false;
    }
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.dispatch({ action: 'DELETE_ITEM', id });
  }

  async upsertGoal(goal: Partial<StrategicGoal>): Promise<boolean> {
    return this.dispatch({ action: 'UPSERT_GOAL', goal });
  }

  async deleteGoal(id: string): Promise<boolean> {
    return this.dispatch({ action: 'DELETE_GOAL', id });
  }

  async upsertUpdate(update: Partial<MonthlyUpdate>): Promise<boolean> {
    return this.dispatch({ action: 'UPSERT_UPDATE', update });
  }

  async deleteUpdate(id: string): Promise<boolean> {
    return this.dispatch({ action: 'DELETE_UPDATE', id });
  }

  async upsertItemUpdate(itemUpdate: Partial<ItemUpdate>): Promise<boolean> {
    return this.dispatch({ action: 'UPSERT_ITEM_UPDATE', itemUpdate });
  }

  // --- FOLLOW-UP API (for n8n / Slack) ---

  /**
   * GET items due for follow-up. Requires backend to support action=list_follow_ups.
   * Used by n8n to know whom to DM on Slack.
   */
  async listFollowUps(options: {
    cadenceDays?: number;
    goalId?: string;
    token?: string;
  } = {}): Promise<FollowUpItem[]> {
    const url = this.getScriptUrl();
    if (!url) return [];
    const params = new URLSearchParams();
    params.set('action', 'list_follow_ups');
    if (options.cadenceDays != null) params.set('cadenceDays', String(options.cadenceDays));
    if (options.goalId) params.set('goalId', options.goalId);
    if (options.token) params.set('token', options.token);
    const separator = url.includes('?') ? '&' : '?';
    try {
      const response = await fetch(`${url}${separator}${params.toString()}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      console.error('[listFollowUps]', e);
      return [];
    }
  }

  /**
   * Record an ItemUpdate from an external source (e.g. Slack reply via n8n).
   * Backend must support action RECORD_UPDATE_FROM_EXTERNAL with itemUpdate payload.
   */
  async recordUpdateFromExternal(payload: {
    itemId: string;
    content: string;
    health: 'green' | 'amber' | 'red';
    source?: 'app' | 'slack' | 'n8n';
    month?: string;
    year?: number;
  }): Promise<boolean> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const itemUpdate: Partial<ItemUpdate> = {
      itemId: payload.itemId,
      content: payload.content,
      health: payload.health as ItemUpdate['health'],
      source: payload.source || 'n8n',
      month: payload.month ?? months[now.getMonth()],
      year: payload.year ?? now.getFullYear(),
      updatedAt: new Date().toISOString()
    };
    return this.dispatch({
      action: 'RECORD_UPDATE_FROM_EXTERNAL',
      itemUpdate
    });
  }

  async upsertSalesAction(salesAction: Partial<SalesActionItem>): Promise<boolean> {
    return this.dispatch({ action: 'UPSERT_SALES_ACTION', salesAction });
  }

  async toggleSalesAction(id: string, isCompleted: boolean): Promise<boolean> {
    return this.dispatch({ action: 'TOGGLE_SALES_ACTION', salesAction: { id, isCompleted } as any });
  }

  // --- HIBOB INTEGRATION METHODS ---

  async syncHiBobPeople(config: HiBobConfig): Promise<boolean> {
    return this.dispatch({ action: 'SYNC_HIBOB_PEOPLE', hibobConfig: config });
  }

  async syncHiBobGoals(config: HiBobConfig): Promise<boolean> {
    return this.dispatch({ action: 'SYNC_HIBOB_GOALS', hibobConfig: config });
  }

  // New Test Method
  async testHiBob(config: HiBobConfig, targetEmail: string, subAction: 'READ' | 'WRITE' | 'TEST_GOALS_MODULE' | 'TEST_PUSH' | 'TEST_GET_GOAL' | 'TEST_GET_TAGS' | 'TEST_CHECK_IN', goalId?: string, testHealthStatus?: string): Promise<any> {
    const url = this.getScriptUrl();
    if (!url) return { error: 'No Script URL Configured' };
    
    try {
      const separator = url.includes('?') ? '&' : '?';
      let testUrl = `${url}${separator}action=TEST_HIBOB&serviceId=${encodeURIComponent(config.serviceId)}&token=${encodeURIComponent(config.token)}&email=${encodeURIComponent(targetEmail)}&subAction=${subAction}`;
      
      // Add goalId parameter if provided (for TEST_GET_GOAL and TEST_CHECK_IN)
      if (goalId) {
        testUrl += `&goalId=${encodeURIComponent(goalId)}`;
      }
      
      // Add testHealthStatus parameter if provided (for TEST_CHECK_IN)
      if (testHealthStatus) {
        testUrl += `&testHealthStatus=${encodeURIComponent(testHealthStatus)}`;
      }
      
      const res = await fetch(testUrl, { method: 'GET' });
      const text = await res.text();

      try {
        return JSON.parse(text);
      } catch (e) {
        return { 
            success: false, 
            error: "Received invalid JSON from backend. Check Script URL.",
            rawResponse: text.substring(0, 500) 
        };
      }
    } catch (error: any) {
       return { 
           success: false, 
           error: "Network/Fetch Error: " + error.message,
           hint: "Is the script deployed as 'Anyone'?"
       };
    }
  }

  async pushGoalsToHiBob(config: HiBobConfig, targetEmail?: string): Promise<boolean> {
    return this.dispatch({ 
      action: 'PUSH_GOALS_HIBOB', 
      hibobConfig: config,
      targetEmail: targetEmail // Optional filter
    });
  }

  // UPDATED v7.46: Send item data via GET parameters to avoid sheet sync race condition
  async pushSingleGoalToHiBob(item: RoadmapItem, config: HiBobConfig, ownerEmail?: string): Promise<{success: boolean, message: string, hibobGoalId?: string}> {
    const url = this.getScriptUrl();
    if (!url) return { success: false, message: 'Script URL missing' };

    if (!config.serviceId || !config.token) {
      return { success: false, message: 'HiBob credentials missing (Service ID or Token)' };
    }

    try {
        const separator = url.includes('?') ? '&' : '?';
        // Construct GET URL with payload to avoid race condition with Sheet upsert
        const params = new URLSearchParams({
            action: 'PUSH_SINGLE_GOAL',
            serviceId: config.serviceId,
            token: config.token,
            itemId: item.id,
            manualGoalType: config.manualGoalType || '',
            p_title: item.title || '',
            p_desc: item.description || '',
            p_owner: item.owner || '',
            p_start: item.startDate || new Date().toISOString().split('T')[0],
            p_end: item.endDate || new Date(new Date().getTime() + (365*24*60*60*1000)).toISOString().split('T')[0],
            p_goal_type: item.goalType || 'PERSONAL',
            p_goal_category: item.goalCategory || 'PERFORMANCE',
            p_status: item.status || 'Not Started',
            p_progress: String(item.progress || 0),
            p_hibob_goal_id: item.hibobGoalId || '' // Pass existing HiBob goal ID if available
        });
        
        // Add email if provided (helps with owner lookup)
        if (ownerEmail && ownerEmail.includes('@')) {
          params.append('p_owner_email', ownerEmail);
        }
        
        const fetchUrl = `${url}${separator}${params.toString()}`;
        console.log('[HiBob Push] Sending request for:', item.title, 'Owner:', item.owner);
        console.log('[HiBob Push] URL (sanitized):', fetchUrl.replace(/token=[^&]+/, 'token=***').replace(/serviceId=[^&]+/, 'serviceId=***'));
        
        const res = await fetch(fetchUrl, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        const responseText = await res.text();
        console.log('[HiBob Push] Response status:', res.status, 'Content-Type:', res.headers.get('content-type'));
        console.log('[HiBob Push] Response text (first 500 chars):', responseText.substring(0, 500));
        
        if (!res.ok) {
          console.error('[HiBob Push] HTTP Error:', res.status, responseText.substring(0, 200));
          
          // Try to parse as JSON even on error status
          let errorJson;
          try {
            errorJson = JSON.parse(responseText);
            if (errorJson.message) {
              return { success: false, message: errorJson.message };
            }
          } catch (e) {
            // Not JSON, return raw error
          }
          
          throw new Error(`HTTP Error ${res.status}: ${responseText.substring(0, 100)}`);
        }

        // Check if response looks like HTML (error page)
        if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE')) {
          console.error('[HiBob Push] Received HTML instead of JSON. This might be an error page.');
          return { 
            success: false, 
            message: `Backend returned HTML instead of JSON. This usually means the script URL is incorrect or the script has an error. Response preview: ${responseText.substring(0, 200)}` 
          };
        }
        
        let json;
        try {
          json = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[HiBob Push] JSON Parse Error:', parseError);
          console.error('[HiBob Push] Full response:', responseText);
          return { 
            success: false, 
            message: `Invalid JSON response from backend. The script might have an error. Response preview: ${responseText.substring(0, 300)}` 
          };
        }
        
        console.log('[HiBob Push] Parsed response:', json);
        
        // Log status update info if available
        if (json.statusUpdateInfo) {
          if (json.statusUpdateInfo.success) {
            console.log(`[HiBob Push] ✅ Status updated successfully to: ${json.statusUpdateInfo.targetStatus}`);
          } else {
            console.error(`[HiBob Push] ❌ Status update failed:`, json.statusUpdateInfo.error);
            console.error(`[HiBob Push] Target status was: ${json.statusUpdateInfo.targetStatus}`);
          }
        }
        
        // Validate response structure
        if (typeof json.success === 'undefined') {
          console.warn('[HiBob Push] Response missing success field:', json);
          return { 
            success: false, 
            message: `Unexpected response format: ${JSON.stringify(json).substring(0, 200)}` 
          };
        }
        
        return json;
    } catch (e: any) {
        console.error('[HiBob Push] Exception:', e);
        return { success: false, message: e.message || 'Unknown network error' };
    }
  }

  // Push a monthly update as a HiBob goal update (fallback when check-ins don't work)
  async pushGoalUpdateToHiBob(
    hibobGoalId: string,
    config: HiBobConfig,
    updateDate: string,
    content: string,
    healthStatus: 'GREEN' | 'AMBER' | 'RED'
  ): Promise<{success: boolean, message: string}> {
    const url = this.getScriptUrl();
    if (!url) return { success: false, message: 'Script URL missing' };

    if (!config.serviceId || !config.token) {
      return { success: false, message: 'HiBob credentials missing (Service ID or Token)' };
    }

    try {
      const separator = url.includes('?') ? '&' : '?';
      const params = new URLSearchParams({
        action: 'PUSH_GOAL_UPDATE',
        serviceId: config.serviceId,
        token: config.token,
        goalId: hibobGoalId,
        updateDate: updateDate,
        content: content,
        healthStatus: healthStatus
      });

      const fetchUrl = `${url}${separator}${params.toString()}`;
      console.log('[HiBob Goal Update] Pushing update for goal:', hibobGoalId);

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const responseText = await res.text();
      console.log('[HiBob Goal Update] Response status:', res.status);

      if (!res.ok) {
        let errorMessage = `HTTP Error ${res.status}`;
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage += `: ${errorJson.message || errorJson.error || responseText}`;
        } catch (parseError) {
          errorMessage += `: ${responseText.substring(0, 500)}`;
        }
        throw new Error(errorMessage);
      }

      const json = JSON.parse(responseText);
      console.log('[HiBob Goal Update] Parsed response:', json);
      return json;
    } catch (e: any) {
      console.error('[HiBob Goal Update] Fetch Exception:', e);
      return { success: false, message: e.message || 'Unknown network error' };
    }
  }

  // Push a monthly update as a HiBob check-in (with fallback to goal update)
  // Check-ins are the proper way to track progress in HiBob
  async pushCheckInToHiBob(
    hibobGoalId: string,
    config: HiBobConfig,
    checkInDate: string,
    content: string,
    healthStatus: 'GREEN' | 'AMBER' | 'RED',
    preferGoalUpdate: boolean = false // Default to check-ins (proper HiBob feature)
  ): Promise<{success: boolean, message: string, fallbackUsed?: boolean, methodUsed?: string}> {
    const url = this.getScriptUrl();
    if (!url) return { success: false, message: 'Script URL missing' };

    if (!config.serviceId || !config.token) {
      return { success: false, message: 'HiBob credentials missing (Service ID or Token)' };
    }

    // If preferGoalUpdate is true, try goal update first (only use as fallback now)
    if (preferGoalUpdate) {
      console.log('[HiBob] Using goal update method (appears in description)');
      const goalUpdateResult = await this.pushGoalUpdateToHiBob(hibobGoalId, config, checkInDate, content, healthStatus);
      if (goalUpdateResult.success) {
        return { ...goalUpdateResult, methodUsed: 'goal_update' };
      }
      // If goal update fails, fall through to try check-ins
      console.warn('[HiBob] Goal update failed, trying check-ins...');
    }

    try {
      const separator = url.includes('?') ? '&' : '?';
      const params = new URLSearchParams({
        action: 'PUSH_CHECK_IN',
        serviceId: config.serviceId,
        token: config.token,
        goalId: hibobGoalId,
        checkInDate: checkInDate,
        content: content,
        healthStatus: healthStatus
      });

      const fetchUrl = `${url}${separator}${params.toString()}`;
      console.log('[HiBob Check-in] Pushing check-in for goal:', hibobGoalId);

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const responseText = await res.text();
      console.log('[HiBob Check-in] Response status:', res.status);
      console.log('[HiBob Check-in] Response text (first 500 chars):', responseText.substring(0, 500));

      if (!res.ok) {
        let errorMessage = `HTTP Error ${res.status}`;
        if (res.headers.get('Content-Type')?.includes('text/html')) {
          errorMessage += ". Received HTML, likely script error or wrong URL.";
        } else {
          try {
            const errorJson = JSON.parse(responseText);
            errorMessage += `: ${errorJson.message || errorJson.error || responseText}`;
            // Include debug info if available
            if (errorJson.debug) {
              console.error('[HiBob Check-in] Debug info:', errorJson.debug);
            }
            if (errorJson.lastError) {
              console.error('[HiBob Check-in] Last error:', errorJson.lastError);
            }
          } catch (parseError) {
            errorMessage += `: ${responseText.substring(0, 500)}`;
          }
        }
        throw new Error(errorMessage);
      }

      if (!res.headers.get('Content-Type')?.includes('application/json')) {
        return {
          success: false,
          message: `Received non-JSON response. Content-Type: ${res.headers.get('Content-Type')}. Raw: ${responseText.substring(0, 500)}`
        };
      }
      
      const json = JSON.parse(responseText);
      console.log('[HiBob Check-in] Parsed response:', json);
      
      // Log debug info if available - show it prominently
      if (json.debug) {
        console.group('[HiBob Check-in] Debug Info:');
        json.debug.forEach((msg: string) => console.log(msg));
        console.groupEnd();
      }
      
      // Log last error if available
      if (json.lastError) {
        console.error('[HiBob Check-in] Last Error:', json.lastError);
      }
      
      // If check-in failed but fallback was used, return success
      if (json.fallbackUsed) {
        console.warn('[HiBob Check-in] ⚠️ Check-in failed, but fallback goal update succeeded (will appear as "OmniMap Updated" activity)');
        return { ...json, methodUsed: 'goal_update_fallback' };
      }
      
      // If check-in failed completely and we haven't tried goal update yet, try it now
      if (!json.success && !preferGoalUpdate) {
        console.warn('[HiBob Check-in] ❌ Check-in failed:', json.message);
        console.log('[HiBob Check-in] Trying goal update fallback...');
        const fallbackResult = await this.pushGoalUpdateToHiBob(hibobGoalId, config, checkInDate, content, healthStatus);
        if (fallbackResult.success) {
          console.log('[HiBob Check-in] ✅ Fallback goal update succeeded (will appear as "OmniMap Updated" activity)');
          return { ...fallbackResult, fallbackUsed: true, methodUsed: 'goal_update_fallback' };
        }
        // If fallback also failed, return original error
        console.error('[HiBob Check-in] ❌ Both check-in and fallback failed');
        return json;
      }
      
      if (json.success) {
        console.log('[HiBob Check-in] ✅ Check-in created successfully');
        return { ...json, methodUsed: 'check_in' };
      }
      
      return json;
    } catch (e: any) {
      console.error('[HiBob Check-in] Fetch Exception:', e);
      return { success: false, message: e.message || 'Unknown network error' };
    }
  }

  // --- WORKABLE INTEGRATION METHODS ---

  async syncWorkableJobs(config: WorkableConfig): Promise<boolean> {
    return this.dispatch({ action: 'SYNC_WORKABLE_JOBS', workableConfig: config });
  }

  // --- SALESFORCE INTEGRATION METHODS ---
  async syncSalesforce(config: SalesforceConfig): Promise<boolean> {
    return this.dispatch({ action: 'SYNC_SALESFORCE', salesforceConfig: config });
  }

  // --- JIRA INTEGRATION METHODS ---
  async syncJiraIssues(config: { domain: string; email: string; apiToken: string; projectKeys?: string }): Promise<{
    success: boolean;
    message: string;
    issues?: any[];
    total?: number;
    error?: any;
  }> {
    const url = this.getScriptUrl();
    if (!url) return { success: false, message: 'No Script URL Configured' };
    
    try {
      const separator = url.includes('?') ? '&' : '?';
      const params = new URLSearchParams({
        action: 'SYNC_JIRA',
        domain: config.domain,
        email: config.email,
        token: config.apiToken,
        projectKeys: config.projectKeys || ''
      });
      
      const jiraUrl = `${url}${separator}${params.toString()}`;
      console.log('[Jira Sync] Fetching from:', config.domain);
      
      const response = await fetch(jiraUrl, { method: 'GET' });
      const text = await response.text();
      
      try {
        const json = JSON.parse(text);
        console.log('[Jira Sync] Response:', json.success ? `Found ${json.issues?.length || 0} issues` : json.message);
        return json;
      } catch (parseError) {
        console.error('[Jira Sync] Parse error:', parseError);
        return {
          success: false,
          message: 'Invalid JSON response from backend',
          error: text.substring(0, 500)
        };
      }
    } catch (error: any) {
      console.error('[Jira Sync] Fetch error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }
}

export const sheetsService = new GoogleSheetsService();
