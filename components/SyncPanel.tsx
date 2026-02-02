
import React, { useState, useEffect } from 'react';
import { sheetsService, SheetsData } from '../services/googleSheetsService';
import { HiBobConfig, WorkableConfig, SalesforceConfig } from '../types';
import Modal from './Modal';

interface SyncPanelProps {
  onSync: () => void;
  onJiraSync: () => void;
  isSyncing: boolean;
  lastSync: Date | null;
  globalPeriod?: { month: string; year: number };
  onPeriodChange?: (period: { month: string; year: number }) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SyncPanel: React.FC<SyncPanelProps> = ({ onSync, onJiraSync: _onJiraSync, isSyncing, lastSync, globalPeriod, onPeriodChange }) => {
  const [url, setUrl] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'integrations' | 'data'>('general');
  
  // Modal States
  const [isHiBobOpen, setIsHiBobOpen] = useState(false);
  
  const [debugData, setDebugData] = useState<SheetsData | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  // HiBob Config State
  const [hiBobConfig, setHiBobConfig] = useState<HiBobConfig>({ serviceId: '', token: '' });
  const [hiBobStatus, setHiBobStatus] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState(''); 
  const [testGoalId, setTestGoalId] = useState(''); // For TEST_GET_GOAL
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testingHiBob, setTestingHiBob] = useState(false);
  const [manualGoalType, setManualGoalType] = useState(''); // New: Manual Override

  // Workable Config State
  const [workableConfig, setWorkableConfig] = useState<WorkableConfig>({ subdomain: '', token: '' });
  const [_workableStatus, setWorkableStatus] = useState<string | null>(null);

  // Salesforce Config State
  const [sfConfig, setSfConfig] = useState<SalesforceConfig>({ instanceUrl: '', clientId: '', clientSecret: '', refreshToken: '' });
  const [_sfStatus, setSfStatus] = useState<string | null>(null);

  // Initialize and sync URL state when menu opens
  useEffect(() => {
    if (isMenuOpen) {
      const storedUrl = sheetsService.getScriptUrl();
      if (storedUrl) {
        setUrl(storedUrl);
      }
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const savedBob = localStorage.getItem('omnimap_hibob_config');
    if (savedBob) {
        const parsed = JSON.parse(savedBob);
        setHiBobConfig(parsed);
        // If saved config has a manual type property (future proofing), load it
        if (parsed.manualGoalType) setManualGoalType(parsed.manualGoalType);
    }

    const savedWorkable = localStorage.getItem('omnimap_workable_config');
    if (savedWorkable) setWorkableConfig(JSON.parse(savedWorkable));

    const savedSf = localStorage.getItem('omnimap_salesforce_config');
    if (savedSf) setSfConfig(JSON.parse(savedSf));
  }, []);

  const handleSave = () => {
    sheetsService.setScriptUrl(url);
    setIsMenuOpen(false);
    onSync();
  };

  const handleDebugFetch = async () => {
    setLoadingDebug(true);
    try {
      const data = await sheetsService.fetchData();
      setDebugData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDebug(false);
    }
  };

  const handleManualGoalTypeChange = (val: string) => {
    setManualGoalType(val);
    // Persist immediately to avoid loss
    const configWithExtras = { ...hiBobConfig, manualGoalType: val };
    localStorage.setItem('omnimap_hibob_config', JSON.stringify(configWithExtras));
  };

  const handleHiBobSync = async (type: 'PULL' | 'PUSH') => {
    const configWithExtras = { ...hiBobConfig, manualGoalType }; // Pass manual type if set
    localStorage.setItem('omnimap_hibob_config', JSON.stringify(configWithExtras));
    
    // Filter by testEmail if it is set and we are Pushing
    const targetEmail = (type === 'PUSH' && testEmail) ? testEmail : undefined;
    const statusMsg = type === 'PUSH' 
        ? (targetEmail ? `Pushing Goals for ${targetEmail}...` : 'Pushing ALL Goals to HiBob...') 
        : 'Connecting to HiBob via Backend...';

    setHiBobStatus(statusMsg);
    
    try {
      let success = false;
      if (type === 'PULL') {
        success = await sheetsService.syncHiBobPeople(configWithExtras);
      } else {
        success = await sheetsService.pushGoalsToHiBob(configWithExtras, targetEmail);
      }

      if (success) {
        setHiBobStatus(`Success! Request sent. Allow 30s for processing then refresh.`);
        if (type === 'PULL') setTimeout(onSync, 2000); 
      } else {
        setHiBobStatus('Failed to send request. Check console.');
      }
    } catch (e: any) {
      setHiBobStatus(`Error: ${e.message}`);
    }
  };

  const handleHiBobTest = async (subAction: 'READ' | 'WRITE' | 'READ_GOALS' | 'SCAN_METADATA' | 'TEST_GOALS_MODULE' | 'TEST_PUSH' | 'TEST_GET_GOAL' | 'TEST_GET_TAGS' | 'TEST_CHECK_IN', goalId?: string, testHealthStatus?: string) => {
    // TEST_GET_TAGS doesn't need email
    if (subAction !== 'TEST_GET_TAGS' && subAction !== 'TEST_CHECK_IN' && !testEmail) {
        setTestResult({ error: "Please enter an email address." });
        return;
    }
    // TEST_CHECK_IN needs goalId
    if (subAction === 'TEST_CHECK_IN' && !goalId && !testGoalId) {
        setTestResult({ error: "Please enter a Goal ID or use 'Get Single Goal' first." });
        return;
    }
    setTestingHiBob(true);
    setTestResult(null);
    const configWithExtras = { ...hiBobConfig, manualGoalType };
    localStorage.setItem('omnimap_hibob_config', JSON.stringify(configWithExtras));
    
    try {
        // We pass manualGoalType via the config object logic in service, or append to URL if needed.
        // For testing, we append it as a param to the URL constructed in service
        // Hack: temporarily mutating config object to include it for the service call
        const res = await sheetsService.testHiBob({ ...hiBobConfig, serviceId: hiBobConfig.serviceId + (manualGoalType ? `&manualGoalType=${manualGoalType}` : '') }, testEmail || '', subAction as any, goalId || testGoalId || undefined, testHealthStatus);
        setTestResult(res);
    } catch (e: any) {
        setTestResult({ error: e.message });
    } finally {
        setTestingHiBob(false);
    }
  };

  const handleWorkableSync = async () => {
    localStorage.setItem('omnimap_workable_config', JSON.stringify(workableConfig));
    setWorkableStatus('Connecting to Workable via Backend...');

    try {
      const success = await sheetsService.syncWorkableJobs(workableConfig);
      if (success) {
         setWorkableStatus('Success! Jobs are syncing to Roadmap Items.');
         setTimeout(onSync, 2000);
      } else {
         setWorkableStatus('Failed. Check API token and Subdomain.');
      }
    } catch (e: any) {
      setWorkableStatus(`Error: ${e.message}`);
    }
  };

  const handleSalesforceSync = async () => {
    localStorage.setItem('omnimap_salesforce_config', JSON.stringify(sfConfig));
    setSfStatus('Authenticating & Pulling Data (this takes ~10s)...');

    try {
      const success = await sheetsService.syncSalesforce(sfConfig);
      if (success) {
        setSfStatus('Success! Actuals updated in Google Sheets.');
        setTimeout(onSync, 3000);
      } else {
        setSfStatus('Failed. Check configuration or logs.');
      }
    } catch (e: any) {
      setSfStatus(`Error: ${e.message}`);
    }
  };

  const scriptCode = `/**
 * OmniMap Backend Script v7.65 (DEBUG LOGGING)
 * FIXED: Removed all ?. optional chaining for older Google Apps Script compatibility
 * FEATURE: PUSH_SINGLE_GOAL now accepts direct item parameters (p_title, p_owner etc)
 * FIXED: Improved duplicate detection using hibobGoalId and better title matching
 * FIXED: Category field now included in updates (tags field)
 * NEW: Smart tag resolution - automatically detects HiBob tag format (string/object/id) and uses correct format
 * NEW: Push existing check-ins when goal is pushed
 * NEW: Update existing goals with status, progress, and all fields
 * NEW: PUSH_CHECK_IN action uses PATCH /goals/goals/{goalId}/key-results/progress endpoint
 * NEW: Status updates use PATCH /goals/goals/{goalId}/status endpoint
 * NEW: Automatic mapping of PERSONAL/DEPARTMENT/COMPANY to HiBob Goal Type IDs
 * NEW: Support for Goal Type (PERSONAL/DEPARTMENT/COMPANY) and Category (PERFORMANCE/DEVELOPMENT)
 * IMPROVED: Enhanced owner finder with better email extraction and multiple HiBob search strategies
 * IMPROVED: Tag format detection by examining existing goals before pushing
 * This allows the frontend to push items immediately without waiting for sheet sync.
 */

// Helper function to safely get nested properties (replaces optional chaining ?.)
function safeGet(obj, path, defaultVal) {
  if (defaultVal === undefined) defaultVal = null;
  if (!obj) return defaultVal;
  var parts = path.split('.');
  var current = obj;
  for (var i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return defaultVal;
    current = current[parts[i]];
  }
  return (current !== undefined && current !== null) ? current : defaultVal;
}

function doGet(e) {
  var params = e.parameter;
  
  // --- SINGLE GOAL PUSH (GET METHOD) ---
  if (params.action === 'PUSH_SINGLE_GOAL') {
      var serviceId = params.serviceId;
      var token = params.token;
      var itemId = params.itemId;
      var manualGoalType = params.manualGoalType || "";
      
      var authHeader = 'Basic ' + Utilities.base64Encode(serviceId + ':' + token);
      var headers = { 'Authorization': authHeader, 'Accept': 'application/json' };
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var employeesSheet = ss.getSheetByName('Employees') || ss.getSheetByName('Team');
      if (!employeesSheet) return jsonResp({ success: false, message: "Employee Sheet not found" });
      var employees = employeesSheet.getDataRange().getValues().slice(1);

      var ownerName = "";
      var title = "";
      var desc = "";
      var start = "";
      var end = "";
      var goalType = params.p_goal_type || "PERSONAL";
      var goalCategory = params.p_goal_category || "PERFORMANCE";
      var status = params.p_status || "Not Started";
      var progress = parseFloat(params.p_progress || "0");
      var existingHibobGoalId = params.p_hibob_goal_id || null;

      // 1. Try to get data from direct params (Preferred for immediate push)
      if (params.p_title && params.p_owner) {
          title = params.p_title;
          ownerName = params.p_owner;
          desc = params.p_desc || "";
          start = params.p_start || new Date().toISOString().split('T')[0];
          end = params.p_end || new Date(new Date().getTime() + (365*24*60*60*1000)).toISOString().split('T')[0];
          goalType = params.p_goal_type || "PERSONAL";
          goalCategory = params.p_goal_category || "PERFORMANCE";
          status = params.p_status || "Not Started";
          progress = parseFloat(params.p_progress || "0");
          existingHibobGoalId = params.p_hibob_goal_id || null;
      } 
      // 2. Fallback to sheet lookup
      else {
          var itemsSheet = ss.getSheetByName('AllGoals') || ss.getSheetByName('RoadmapItems');
          if (!itemsSheet) return jsonResp({ success: false, message: "Goal Sheet not found" });
          var items = itemsSheet.getDataRange().getValues().slice(1);
          var itemRow = items.find(function(row) { return String(row[0]) === itemId; });
          if (!itemRow) return jsonResp({ success: false, message: "Item ID not found in sheet: " + itemId });
          
          ownerName = itemRow[2];
          title = itemRow[3];
          desc = itemRow[4];
          // Default dates if missing
          start = new Date().toISOString().split('T')[0];
          end = new Date(new Date().getTime() + (365*24*60*60*1000)).toISOString().split('T')[0];
      }
      
      // --- IMPROVED OWNER FINDER WITH EMAIL SUPPORT ---
      var hibobOwnerId = null;
      var debugSteps = [];
      
      // Step 1: Try direct email parameter (if provided)
      var ownerEmail = params.p_owner_email;
      if (ownerEmail && String(ownerEmail).includes('@')) {
          debugSteps.push("Trying email search: " + ownerEmail);
          try {
               var searchUrl = 'https://api.hibob.com/v1/people/search';
               var searchPayload = {
                  "fields": ["root.email", "id"],
                  "filters": [{ "fieldPath": "root.email", "operator": "equals", "values": [String(ownerEmail).trim()] }]
               };
               var searchRes = UrlFetchApp.fetch(searchUrl, {
                  method: 'post', headers: headers, contentType: 'application/json',
                  payload: JSON.stringify(searchPayload), muteHttpExceptions: true
               });
               if (searchRes.getResponseCode() === 200) {
                   var searchJson = JSON.parse(searchRes.getContentText());
                   if (searchJson.employees && searchJson.employees.length > 0) {
                       hibobOwnerId = searchJson.employees[0].id;
                       debugSteps.push("Found via email: " + hibobOwnerId);
                   } else {
                       debugSteps.push("Email search returned no results");
                   }
               } else {
                   debugSteps.push("Email search failed with status: " + searchRes.getResponseCode());
               }
          } catch(e) {
              debugSteps.push("Email search exception: " + e.toString());
          }
      }
      
      // Step 2: Try direct match in employees sheet (by ID or name)
      if (!hibobOwnerId) {
          var directMatch = employees.find(function(e) { return e[1] === ownerName || e[0] === ownerName; });
          if (directMatch && String(directMatch[0]).length > 10) {
              hibobOwnerId = directMatch[0];
              debugSteps.push("Found via direct sheet match (ID): " + hibobOwnerId);
          }
      }
      
      // Step 3: Try fuzzy name match in employees sheet, then email lookup
      if (!hibobOwnerId) {
          debugSteps.push("Trying fuzzy name match for: " + ownerName);
          var empRow = employees.find(function(e) {
              var sheetName = String(e[1] || "").toLowerCase().trim();
              var target = String(ownerName).toLowerCase().trim();
              return sheetName === target || String(e[0] || "").toLowerCase() === target || 
                     sheetName.includes(target) || target.includes(sheetName);
          });
          
          if (empRow) {
              debugSteps.push("Found employee row in sheet (columns: " + empRow.length + ")");
              // Try to find email in any column - check all columns more thoroughly
              var email = null;
              for (var i = 0; i < empRow.length; i++) {
                  var cell = String(empRow[i] || "").trim();
                  // Check if it looks like an email
                  if (cell.includes('@') && cell.includes('.') && cell.length > 5) {
                      // Basic email validation
                      var emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                      if (emailPattern.test(cell)) {
                          email = cell;
                          debugSteps.push("Found email in column " + i + ": " + email);
                          break;
                      }
                  }
              }
              
              if (email) {
                  try {
                       var searchUrl = 'https://api.hibob.com/v1/people/search';
                       var searchPayload = {
                          "fields": ["root.email", "id"],
                          "filters": [{ "fieldPath": "root.email", "operator": "equals", "values": [String(email).trim()] }]
                       };
                       var searchRes = UrlFetchApp.fetch(searchUrl, {
                          method: 'post', headers: headers, contentType: 'application/json',
                          payload: JSON.stringify(searchPayload), muteHttpExceptions: true
                       });
                       if (searchRes.getResponseCode() === 200) {
                           var searchJson = JSON.parse(searchRes.getContentText());
                           if (searchJson.employees && searchJson.employees.length > 0) {
                               hibobOwnerId = searchJson.employees[0].id;
                               debugSteps.push("Found via sheet email lookup: " + hibobOwnerId);
                           } else {
                               debugSteps.push("Sheet email lookup returned no results for: " + email);
                           }
                       } else {
                           var errorText = searchRes.getContentText();
                           debugSteps.push("Sheet email lookup failed: " + searchRes.getResponseCode() + " - " + errorText.substring(0, 200));
                       }
                  } catch(e) {
                      debugSteps.push("Sheet email lookup exception: " + e.toString());
                  }
              } else {
                  debugSteps.push("No email found in employee row. Row data: " + JSON.stringify(empRow).substring(0, 200));
              }
          } else {
              debugSteps.push("Employee row not found in sheet for: " + ownerName);
          }
      }
      
      // Step 4: Try searching HiBob directly by name as last resort
      if (!hibobOwnerId) {
          debugSteps.push("Trying direct HiBob name search for: " + ownerName);
          try {
              var searchUrl = 'https://api.hibob.com/v1/people/search';
              
              // Try multiple search strategies
              var nameParts = ownerName.split(' ').filter(function(p) { return p.length > 0; });
              var firstName = nameParts[0] || "";
              var lastName = nameParts.slice(1).join(' ') || "";
              
              // Strategy 1: Search by first name and last name separately
              var searchPayload = null;
              if (firstName && lastName) {
                  debugSteps.push("Trying firstName + lastName search");
                  searchPayload = {
                      "fields": ["root.firstName", "root.lastName", "root.displayName", "id", "root.email"],
                      "filters": [{ 
                          "fieldPath": "root.firstName", 
                          "operator": "equals", 
                          "values": [firstName] 
                      }, {
                          "fieldPath": "root.lastName",
                          "operator": "equals",
                          "values": [lastName]
                      }]
                  };
              } else {
                  // Strategy 2: Search without filters and match in results
                  debugSteps.push("Trying broad search without filters");
                  searchPayload = {
                      "fields": ["root.firstName", "root.lastName", "root.displayName", "id", "root.email"],
                      "filters": []
                  };
              }
              
              var searchRes = UrlFetchApp.fetch(searchUrl, {
                  method: 'post', headers: headers, contentType: 'application/json',
                  payload: JSON.stringify(searchPayload), muteHttpExceptions: true
              });
              
              if (searchRes.getResponseCode() === 200) {
                  var searchJson = JSON.parse(searchRes.getContentText());
                  if (searchJson.employees && searchJson.employees.length > 0) {
                      // If we searched without filters, try to match by name
                      if (!firstName || !lastName) {
                          var targetLower = ownerName.toLowerCase();
                          var match = searchJson.employees.find(function(emp) {
                              var displayName = (safeGet(emp, 'fields.displayName.value') || emp.displayName || "").toLowerCase();
                              var fullName = ((safeGet(emp, 'fields.firstName.value') || emp.firstName || "") + " " + (safeGet(emp, 'fields.lastName.value') || emp.lastName || "")).toLowerCase().trim();
                              return displayName === targetLower || fullName === targetLower || 
                                     displayName.includes(targetLower) || fullName.includes(targetLower);
                          });
                          if (match) {
                              hibobOwnerId = match.id;
                              debugSteps.push("Found via HiBob name search (matched in results): " + hibobOwnerId);
                          } else {
                              debugSteps.push("HiBob name search returned results but no name match");
                          }
                      } else {
                          hibobOwnerId = searchJson.employees[0].id;
                          debugSteps.push("Found via HiBob name search (firstName+lastName): " + hibobOwnerId);
                      }
                  } else {
                      debugSteps.push("HiBob name search returned no results");
                  }
              } else {
                  var errorText = searchRes.getContentText();
                  debugSteps.push("HiBob name search failed: " + searchRes.getResponseCode() + " - " + errorText.substring(0, 300));
              }
          } catch(e) {
              debugSteps.push("HiBob name search exception: " + e.toString());
          }
      }
      
      if (!hibobOwnerId) {
          return jsonResp({ 
              success: false, 
              message: "Owner '" + ownerName + "' not found in HiBob. Debug: " + debugSteps.join(" | ") 
          });
      }
      
      // --- GOAL TYPE RESOLUTION ---
      // Map app goal types to HiBob goal type IDs
      // PERSONAL → Individual, DEPARTMENT → Department, COMPANY → Company
      var typeId = null;
      var goalTypeDebug = [];
      
      // First, try to fetch goal types from HiBob to map correctly
      try {
          var typeSearchUrl = 'https://api.hibob.com/v1/goals/goal-types/search';
          var typeRes = UrlFetchApp.fetch(typeSearchUrl, {
              method: 'post', headers: headers, contentType: 'application/json',
              payload: JSON.stringify({ "fields": ["id", "name"] }), 
              muteHttpExceptions: true
          });
          
          if (typeRes.getResponseCode() === 200) {
              var typeJson = JSON.parse(typeRes.getContentText());
              goalTypeDebug.push("Goal types API returned: " + typeRes.getResponseCode());
              
              // Try different response formats
              var goalTypes = [];
              if (typeJson.items && typeJson.items.length > 0) {
                  goalTypes = typeJson.items;
              } else if (typeJson.goalTypes && typeJson.goalTypes.items && typeJson.goalTypes.items.length > 0) {
                  goalTypes = typeJson.goalTypes.items;
              } else if (Array.isArray(typeJson)) {
                  goalTypes = typeJson;
              }
              
              if (goalTypes.length > 0) {
                  // Map goalType (PERSONAL/DEPARTMENT/COMPANY) to HiBob goal type ID
                  var goalTypeUpper = String(goalType).toUpperCase();
                  goalTypeDebug.push("Mapping goalType: " + goalTypeUpper);
                  
                  // Find matching goal type by name
                  var matchedType = null;
                  if (goalTypeUpper === 'PERSONAL') {
                      matchedType = goalTypes.find(function(gt) {
                          var name = (gt.name || safeGet(gt, 'fields.name.value') || safeGet(gt, 'fields.name') || "").toLowerCase();
                          return name.includes('individual') || name.includes('personal');
                      });
                  } else if (goalTypeUpper === 'DEPARTMENT') {
                      matchedType = goalTypes.find(function(gt) {
                          var name = (gt.name || safeGet(gt, 'fields.name.value') || safeGet(gt, 'fields.name') || "").toLowerCase();
                          return name.includes('department');
                      });
                  } else if (goalTypeUpper === 'COMPANY') {
                      matchedType = goalTypes.find(function(gt) {
                          var name = (gt.name || safeGet(gt, 'fields.name.value') || safeGet(gt, 'fields.name') || "").toLowerCase();
                          return name.includes('company');
                      });
                  }
                  
                  if (matchedType) {
                      typeId = matchedType.id || safeGet(matchedType, 'fields.id.value') || safeGet(matchedType, 'fields.id') || null;
                      var typeName = matchedType.name || safeGet(matchedType, 'fields.name.value') || safeGet(matchedType, 'fields.name') || "unnamed";
                      goalTypeDebug.push("Mapped to HiBob goal type: " + typeId + " (" + typeName + ")");
                  } else {
                      goalTypeDebug.push("Could not find matching goal type for: " + goalTypeUpper);
                      // Fallback: use first available type
                      var firstType = goalTypes[0];
                      typeId = firstType.id || safeGet(firstType, 'fields.id.value') || safeGet(firstType, 'fields.id') || null;
                      var typeName = firstType.name || safeGet(firstType, 'fields.name.value') || safeGet(firstType, 'fields.name') || "unnamed";
                      goalTypeDebug.push("Using fallback (first available): " + typeId + " (" + typeName + ")");
                  }
              } else {
                  goalTypeDebug.push("Goal types API returned empty. Full response: " + JSON.stringify(typeJson).substring(0, 300));
              }
          } else {
              var errorText = typeRes.getContentText();
              goalTypeDebug.push("Goal types API failed: " + typeRes.getResponseCode() + " - " + errorText.substring(0, 300));
          }
      } catch(e) {
          goalTypeDebug.push("Goal types API exception: " + e.toString());
      }
      
      // If mapping failed, try manual Goal Type ID as fallback
      if (!typeId && manualGoalType) {
          typeId = manualGoalType;
          goalTypeDebug.push("Using manual Goal Type ID fallback: " + typeId);
      }
      
      if (!typeId) {
          return jsonResp({ 
              success: false, 
              message: "Could not resolve Goal Type ID. Please enter manually in Bulk Creator settings. Debug: " + goalTypeDebug.join(" | ") 
          });
      }

      // --- PUSH TO HIBOB ---
      var baseEndpoint = 'https://api.hibob.com/v1/goals/goals';
      
      // --- TAG RESOLUTION ---
      // Try to determine the correct tag format by fetching an existing goal or available tags
      var tagFormat = null; // Will store the format: "string", "object", or "id"
      var resolvedTagValue = null; // Will store the actual tag value to use
      var tagDebug = [];
      
      // Strategy 1: Try to fetch an existing goal to see tag format
      try {
          var sampleSearchUrl = baseEndpoint + '/search';
          var sampleSearchPayload = {
                 "fields": ["id", "tags"],
                 "filters": [{ "fieldPath": "owner.id", "operator": "equals", "values": [hibobOwnerId] }]
          };
          var sampleSearchRes = UrlFetchApp.fetch(sampleSearchUrl, {
              method: 'post', headers: headers, contentType: 'application/json',
              payload: JSON.stringify(sampleSearchPayload), muteHttpExceptions: true
          });
          if (sampleSearchRes.getResponseCode() === 200) {
              var sampleJson = JSON.parse(sampleSearchRes.getContentText());
              if (sampleJson.items && sampleJson.items.length > 0) {
                  var sampleGoal = sampleJson.items[0];
                  var sampleTags = safeGet(sampleGoal, 'fields.tags.value') || sampleGoal.tags;
                  if (sampleTags && Array.isArray(sampleTags) && sampleTags.length > 0) {
                      var firstTag = sampleTags[0];
                      if (typeof firstTag === 'string') {
                          tagFormat = "string";
                          tagDebug.push("Detected tag format: string array");
                      } else if (typeof firstTag === 'object' && firstTag.id) {
                          tagFormat = "id";
                          tagDebug.push("Detected tag format: object with id");
                      } else if (typeof firstTag === 'object' && firstTag.name) {
                          tagFormat = "object";
                          tagDebug.push("Detected tag format: object with name");
                      }
                      tagDebug.push("Sample tag structure: " + JSON.stringify(firstTag).substring(0, 200));
                  }
              }
          }
      } catch(e) {
          tagDebug.push("Tag format detection failed: " + e.toString());
      }
      
      // Strategy 2: Map goalCategory to tag value
      var goalCategoryUpper = String(goalCategory).toUpperCase();
      var tagName = null;
      if (goalCategoryUpper === "PERFORMANCE") {
          tagName = "Performance";
      } else if (goalCategoryUpper === "DEVELOPMENT") {
          tagName = "Development";
      } else {
          tagName = goalCategory;
      }
      
      // If we detected a format, use it; otherwise default to string
      if (tagFormat === "id") {
          // Try to find tag ID by searching for tags
          try {
              var tagSearchUrl = baseEndpoint + '/search';
              var tagSearchPayload = {
                     "fields": ["tags"],
                     "filters": []
              };
              var tagSearchRes = UrlFetchApp.fetch(tagSearchUrl, {
                  method: 'post', headers: headers, contentType: 'application/json',
                  payload: JSON.stringify(tagSearchPayload), muteHttpExceptions: true
              });
              if (tagSearchRes.getResponseCode() === 200) {
                  var tagSearchJson = JSON.parse(tagSearchRes.getContentText());
                  // Look through goals to find a tag matching our tagName
                  var goalsArr = tagSearchJson.items || [];
                  for (var gi = 0; gi < goalsArr.length; gi++) {
                      var goal = goalsArr[gi];
                      var tags = safeGet(goal, 'fields.tags.value') || goal.tags || [];
                      for (var ti = 0; ti < tags.length; ti++) {
                          var tag = tags[ti];
                          if (typeof tag === 'object' && tag.id && (tag.name === tagName || (tag.name && tag.name.toLowerCase() === tagName.toLowerCase()))) {
                              resolvedTagValue = [{ "id": tag.id }];
                              tagDebug.push("Found tag ID: " + tag.id + " for name: " + tagName);
                              break;
                          }
                      }
                      if (resolvedTagValue) break;
                  }
              }
          } catch(e) {
              tagDebug.push("Tag ID search failed: " + e.toString());
          }
          // Fallback: use tag name if ID not found
          if (!resolvedTagValue) {
              resolvedTagValue = [tagName];
              tagDebug.push("Using tag name as fallback: " + tagName);
          }
      } else if (tagFormat === "object") {
          resolvedTagValue = [{ "name": tagName }];
          tagDebug.push("Using tag object format with name: " + tagName);
      } else {
          // Default: string format
          resolvedTagValue = [tagName];
          tagDebug.push("Using tag string format: " + tagName);
      }
      
      // Final fallback: if resolvedTagValue is still null, use string format
      if (!resolvedTagValue) {
          resolvedTagValue = [tagName || goalCategory];
          tagDebug.push("Final fallback: using tag name as string");
      }
      
      // First, check if we have an existing HiBob goal ID from params
      var existingId = existingHibobGoalId;
      
      // If no ID provided, search for existing goal by title
      if (!existingId) {
          try {
              var searchUrl = baseEndpoint + '/search';
              var searchPayload = {
                     "fields": ["id", "title", "name"],
                     "filters": [{ "fieldPath": "owner.id", "operator": "equals", "values": [hibobOwnerId] }]
              };
              var searchRes = UrlFetchApp.fetch(searchUrl, {
                  method: 'post', headers: headers, contentType: 'application/json',
                  payload: JSON.stringify(searchPayload), muteHttpExceptions: true
              });
              if (searchRes.getResponseCode() === 200) {
                  var json = JSON.parse(searchRes.getContentText());
                  // Try multiple field names and do case-insensitive comparison
                  var titleLower = String(title).toLowerCase().trim();
                  var match = (json.items || []).find(function(g) {
                      var goalTitle = (safeGet(g, 'fields.title.value') || safeGet(g, 'fields.name.value') || g.title || g.name || "").toLowerCase().trim();
                      return goalTitle === titleLower || goalTitle.includes(titleLower) || titleLower.includes(goalTitle);
                  });
                  if (match) {
                      existingId = match.id || safeGet(match, 'fields.id.value') || safeGet(match, 'fields.id');
                  }
              }
          } catch (e) {
              // Log error but continue - we'll create new if search fails
          }
      }

      try {
          var apiRes;
          var statusUpdateInfo = null;
          
          if (existingId) {
                // Map status to HiBob status values (using correct enum: onTrack, offTrack, completed, incomplete, other)
                var hibobStatus = "onTrack"; // Default
                var statusLower = String(status).toLowerCase();
                if (statusLower.includes('done') || statusLower.includes('complete')) {
                    hibobStatus = "completed";
                } else if (statusLower.includes('progress') || statusLower.includes('on track') || statusLower.includes('on_track')) {
                    hibobStatus = "onTrack"; // In progress or On Track = on track
                } else if (statusLower.includes('blocked')) {
                    hibobStatus = "offTrack"; // Blocked = off track
                } else if (statusLower.includes('paused') || statusLower.includes('on hold')) {
                    hibobStatus = "other"; // Paused = other (not off track, just on hold)
                } else if (statusLower.includes('not started') || statusLower.includes('not_started')) {
                    hibobStatus = "incomplete";
                } else {
                    hibobStatus = "onTrack"; // Default to onTrack
                }
                
                // Update other fields first (title, description, dates, progress, tags)
                var updatePayload = {
                    "items": [{
                            "objectType": "goal",
                            "fields": {
                                "title": { "value": title },
                                "description": { "value": desc },
                                "startDate": { "value": start },
                                "dueDate": { "value": end },
                                "progress": { "value": Math.min(100, Math.max(0, progress)) },
                                "tags": { "value": resolvedTagValue }
                            }
                    }]
                };
                apiRes = UrlFetchApp.fetch(baseEndpoint + '/' + existingId, {
                    method: 'patch', headers: headers, contentType: 'application/json',
                    payload: JSON.stringify(updatePayload), muteHttpExceptions: true
                });
                
                // ALWAYS update status separately using dedicated status endpoint (PATCH /goals/goals/{goalId}/status)
                // This happens regardless of whether other updates succeeded
                var statusUpdateSuccess = false;
                var statusUpdateError = null;
                var statusUpdateDebug = [];
                
                statusUpdateDebug.push("Attempting status update for goal ID: " + existingId);
                statusUpdateDebug.push("Mapped status from '" + status + "' to '" + hibobStatus + "'");
                
                try {
                    var statusUpdatePayload = {
                        "status": hibobStatus
                    };
                    var statusUpdateUrl = baseEndpoint + '/' + existingId + '/status';
                    statusUpdateDebug.push("Status update URL: " + statusUpdateUrl);
                    statusUpdateDebug.push("Status update payload: " + JSON.stringify(statusUpdatePayload));
                    
                    var statusUpdateRes = UrlFetchApp.fetch(statusUpdateUrl, {
                        method: 'patch', headers: headers, contentType: 'application/json',
                        payload: JSON.stringify(statusUpdatePayload), muteHttpExceptions: true
                    });
                    var statusUpdateCode = statusUpdateRes.getResponseCode();
                    var statusUpdateResponseText = statusUpdateRes.getContentText();
                    
                    statusUpdateDebug.push("Status update HTTP code: " + statusUpdateCode);
                    statusUpdateDebug.push("Status update response: " + statusUpdateResponseText.substring(0, 300));
                    
                    if (statusUpdateCode >= 200 && statusUpdateCode < 300) {
                        statusUpdateSuccess = true;
                        statusUpdateDebug.push("Status update SUCCESS");
                    } else {
                        statusUpdateError = "Status update failed: HTTP " + statusUpdateCode + " - " + statusUpdateResponseText.substring(0, 200);
                        statusUpdateDebug.push("Status update FAILED: " + statusUpdateError);
                    }
                } catch(statusErr) {
                    statusUpdateError = "Status update exception: " + statusErr.toString();
                    statusUpdateDebug.push("Status update EXCEPTION: " + statusUpdateError);
                }
                
                // Store status update info for response
                statusUpdateInfo = {
                    attempted: true,
                    success: statusUpdateSuccess,
                    targetStatus: hibobStatus,
                    originalStatus: status,
                    error: statusUpdateError,
                    debug: statusUpdateDebug
                };
          } else {
                var payloadWrapper = {
                    "items": [{
                            "objectType": "goal",
                            "fields": {
                                "title": { "value": title },
                                "description": { "value": desc },
                                "owner": { "value": hibobOwnerId },
                                "startDate": { "value": start },
                                "dueDate": { "value": end },
                                "isPrivate": { "value": false },
                                "typeId": { "value": typeId },
                                "tags": { "value": resolvedTagValue }
                            }
                    }]
                };
                apiRes = UrlFetchApp.fetch(baseEndpoint, {
                    method: 'post', headers: headers, contentType: 'application/json',
                    payload: JSON.stringify(payloadWrapper), muteHttpExceptions: true
                });
          }
          
          if (apiRes.getResponseCode() >= 200 && apiRes.getResponseCode() < 300) {
              var hibobGoalId = existingId;
              if (!hibobGoalId) {
                  // Extract goal ID from creation response
                  try {
                      var responseJson = JSON.parse(apiRes.getContentText());
                      hibobGoalId = (responseJson.items && responseJson.items[0] && responseJson.items[0].id) || responseJson.id || null;
                  } catch(e) {
                      // If we can't parse, try to find the goal by searching again
                      try {
                          var searchUrl = baseEndpoint + '/search';
                          var searchPayload = {
                                 "fields": ["id", "title"],
                                 "filters": [{ "fieldPath": "owner.id", "operator": "equals", "values": [hibobOwnerId] }]
                          };
                          var searchRes = UrlFetchApp.fetch(searchUrl, {
                              method: 'post', headers: headers, contentType: 'application/json',
                              payload: JSON.stringify(searchPayload), muteHttpExceptions: true
                          });
                          if (searchRes.getResponseCode() === 200) {
                              var json = JSON.parse(searchRes.getContentText());
                              var match = (json.items || []).find(function(g) { return (safeGet(g, 'fields.title.value') || g.title || g.name) === title; });
                              if (match) hibobGoalId = match.id || safeGet(match, 'fields.id.value');
                          }
                      } catch(e2) {}
                  }
              }
              var responseMessage = existingId ? "Goal Updated in HiBob" : "Goal Created in HiBob";
              if (statusUpdateInfo) {
                  if (statusUpdateInfo.success) {
                      responseMessage += ". Status updated to: " + statusUpdateInfo.targetStatus;
                  } else {
                      responseMessage += ". Status update failed: " + (statusUpdateInfo.error || "Unknown error");
                  }
              }
              
              var responseObj = { 
                  success: true, 
                  message: responseMessage,
                  hibobGoalId: hibobGoalId,
                  scriptVersion: "7.65" // Version check - if you don't see this, you need to redeploy!
              };
              
              if (tagDebug.length > 0) {
                  responseObj.tagDebug = tagDebug;
              }
              
              // Always include statusUpdateInfo (even if null) for debugging
              responseObj.statusUpdateInfo = statusUpdateInfo;
              
              return jsonResp(responseObj);
          } else {
              var errorText = apiRes.getContentText();
              var errorMsg = "HiBob API Error: " + errorText;
              return jsonResp({ 
                  success: false, 
                  message: errorMsg,
                  tagDebug: tagDebug.length > 0 ? tagDebug : undefined,
                  tagValueUsed: resolvedTagValue
              });
          }
      } catch(e) {
          return jsonResp({ success: false, message: "Fetch Exception: " + e.toString() });
      }
  }
  
  // --- PUSH GOAL UPDATE (Monthly Update as Goal Note/Description Update) ---
  if (params.action === 'PUSH_GOAL_UPDATE') {
      var serviceId = params.serviceId;
      var token = params.token;
      var goalId = params.goalId;
      var updateContent = params.content || "";
      var updateDate = params.updateDate || new Date().toISOString().split('T')[0];
      var healthStatus = params.healthStatus || "GREEN";
      
      var authHeader = 'Basic ' + Utilities.base64Encode(serviceId + ':' + token);
      var headers = { 'Authorization': authHeader, 'Accept': 'application/json' };
      
      if (!goalId) {
          return jsonResp({ success: false, message: "Goal ID is required for goal update" });
      }
      
      try {
          // First, fetch current goal to get description
          var baseEndpoint = 'https://api.hibob.com/v1/goals/goals';
          var searchUrl = baseEndpoint + '/search';
          var searchPayload = {
                 "fields": ["id", "title", "description"],
                 "filters": [{ "fieldPath": "id", "operator": "equals", "values": [goalId] }]
          };
          var searchRes = UrlFetchApp.fetch(searchUrl, {
              method: 'post', headers: headers, contentType: 'application/json',
              payload: JSON.stringify(searchPayload), muteHttpExceptions: true
          });
          
          var currentDescription = "";
          if (searchRes.getResponseCode() === 200) {
              var searchJson = JSON.parse(searchRes.getContentText());
              if (searchJson.items && searchJson.items.length > 0) {
                  currentDescription = safeGet(searchJson.items[0], 'fields.description.value') || searchJson.items[0].description || "";
              }
          }
          
          // Format update content with date and health status
          var healthEmoji = healthStatus === "RED" ? "[RED]" : healthStatus === "AMBER" ? "[AMBER]" : "[GREEN]";
          var updateNote = "\\n\\n--- Monthly Update (" + updateDate + ") " + healthEmoji + " ---\\n" + updateContent;
          var newDescription = currentDescription + updateNote;
          
          // Update goal description to create activity entry
          var updatePayload = {
              "items": [{
                      "objectType": "goal",
                      "fields": {
                          "description": { "value": newDescription }
                      }
              }]
          };
          
          var apiRes = UrlFetchApp.fetch(baseEndpoint + '/' + goalId, {
              method: 'patch', headers: headers, contentType: 'application/json',
              payload: JSON.stringify(updatePayload), muteHttpExceptions: true
          });
          
          if (apiRes.getResponseCode() >= 200 && apiRes.getResponseCode() < 300) {
              return jsonResp({ success: true, message: "Goal updated with monthly update (appears as OmniMap activity)" });
          } else {
              return jsonResp({ success: false, message: "HiBob API Error: " + apiRes.getContentText() });
          }
      } catch(e) {
          return jsonResp({ success: false, message: "Goal Update Exception: " + e.toString() });
      }
  }
  
  // --- PUSH CHECK-IN (Monthly Update) ---
  // Uses PATCH /goals/goals/{goalId}/key-results/progress endpoint
  if (params.action === 'PUSH_CHECK_IN') {
      var serviceId = params.serviceId;
      var token = params.token;
      var goalId = params.goalId; // HiBob goal ID
      var checkInDate = params.checkInDate || new Date().toISOString().split('T')[0];
      var content = params.content || "";
      var healthStatus = params.healthStatus || "GREEN"; // GREEN, AMBER, RED
      
      var authHeader = 'Basic ' + Utilities.base64Encode(serviceId + ':' + token);
      var headers = { 'Authorization': authHeader, 'Accept': 'application/json' };
      
      var debugInfo = [];
      debugInfo.push("Check-in request received");
      debugInfo.push("Goal ID: " + goalId);
      debugInfo.push("Date: " + checkInDate);
      debugInfo.push("Status: " + healthStatus);
      debugInfo.push("Content length: " + content.length);
      
      if (!goalId) {
          return jsonResp({ success: false, message: "Goal ID is required for check-in", debug: debugInfo });
      }
      
      try {
          var baseEndpoint = 'https://api.hibob.com/v1/goals/goals';
          
          // First, try to fetch key results for this goal
          var keyResults = [];
          try {
              var searchUrl = baseEndpoint + '/search';
              var searchPayload = {
                     "fields": ["id", "keyResults"],
                     "filters": [{ "fieldPath": "id", "operator": "equals", "values": [goalId] }]
              };
              var searchRes = UrlFetchApp.fetch(searchUrl, {
                  method: 'post', headers: headers, contentType: 'application/json',
                  payload: JSON.stringify(searchPayload), muteHttpExceptions: true
              });
              
              if (searchRes.getResponseCode() === 200) {
                  var searchJson = JSON.parse(searchRes.getContentText());
                  if (searchJson.items && searchJson.items.length > 0) {
                      var goal = searchJson.items[0];
                      var krData = safeGet(goal, 'fields.keyResults.value') || goal.keyResults || [];
                      if (Array.isArray(krData) && krData.length > 0) {
                          // Extract key result IDs
                          keyResults = krData.map(function(kr) { return {
                              keyResultId: kr.id || safeGet(kr, 'fields.id.value') || safeGet(kr, 'fields.id'),
                              currentValue: kr.currentValue || safeGet(kr, 'fields.currentValue.value') || 0,
                              notes: "" // Can be filled with update content if needed
                          }; }).filter(function(kr) { return kr.keyResultId; });
                          debugInfo.push("Found " + keyResults.length + " key results");
                      }
                  }
              }
          } catch(krErr) {
              debugInfo.push("Key results fetch failed: " + krErr.toString());
          }
          
          // Format comment with date
          var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          var dateObj = new Date(checkInDate);
          var monthName = monthNames[dateObj.getMonth()] || 'Unknown';
          var year = dateObj.getFullYear();
          var checkInComment = "Monthly check-in — " + monthName + " " + year + (content ? ": " + content : "");
          
          // Map health status to goal status
          var statusValue = "onTrack";
          if (healthStatus === "RED") {
              statusValue = "offTrack";
          } else if (healthStatus === "AMBER") {
              statusValue = "onTrack"; // AMBER = still on track but at risk
          }
          
          // If goal has no key results, use status update with comment
          // This creates a check-in as an activity entry, NOT a description update
          if (keyResults.length === 0) {
              debugInfo.push("Goal has no key results, using status update endpoint with comment");
              try {
                  // First, just try adding a comment/activity via the status endpoint
                  var statusUpdatePayload = {
                      "status": statusValue,
                      "comment": checkInComment
                  };
                  
                  var statusRes = UrlFetchApp.fetch(baseEndpoint + '/' + goalId + '/status', {
                      method: 'patch', headers: headers, contentType: 'application/json',
                      payload: JSON.stringify(statusUpdatePayload), muteHttpExceptions: true
                  });
                  
                  var statusCode = statusRes.getResponseCode();
                  var responseText = statusRes.getContentText();
                  debugInfo.push("Status update response: " + statusCode);
                  debugInfo.push("Status update response text: " + responseText.substring(0, 300));
                  
                  if (statusCode >= 200 && statusCode < 300) {
                      return jsonResp({ 
                          success: true, 
                          message: "Check-in recorded via status update (goal has no key results)",
                          debug: debugInfo,
                          methodUsed: "status_update"
                      });
                  } else {
                      // Status update failed - report failure, do NOT update description
                      debugInfo.push("Status update failed with code: " + statusCode);
                      return jsonResp({ 
                          success: false, 
                          message: "Check-in failed. Goal has no key results and status update returned " + statusCode + ". Add key results in HiBob for better check-in support.",
                          debug: debugInfo,
                          lastError: responseText.substring(0, 300)
                      });
                  }
              } catch(statusErr) {
                  debugInfo.push("Status update exception: " + statusErr.toString());
                  return jsonResp({ 
                      success: false, 
                      message: "Check-in failed: " + statusErr.toString() + ". Goal has no key results - add key results in HiBob for better check-in support.",
                      debug: debugInfo
                  });
              }
          } else {
              // Goal has key results - use the key-results/progress endpoint
              var checkInUrl = baseEndpoint + '/' + goalId + '/key-results/progress';
              debugInfo.push("Check-in URL: " + checkInUrl);
              
              // Build payload according to API spec
              var checkInPayload = {
                  "comment": checkInComment,
                  "keyResults": keyResults.map(function(kr) { return {
                      "keyResultId": kr.keyResultId,
                      "currentValue": kr.currentValue,
                      "notes": kr.notes || (content ? content.substring(0, 200) : "") // Use content as notes if available
                  }; })
              };
              
              debugInfo.push("Payload: " + JSON.stringify(checkInPayload).substring(0, 400));
              
              // Try the key-results/progress endpoint
              var apiRes = UrlFetchApp.fetch(checkInUrl, {
                  method: 'patch', 
                  headers: headers, 
                  contentType: 'application/json',
                  payload: JSON.stringify(checkInPayload), 
                  muteHttpExceptions: true
              });
              
              var statusCode = apiRes.getResponseCode();
              var responseText = apiRes.getContentText();
              debugInfo.push("Response status: " + statusCode);
              debugInfo.push("Response: " + responseText.substring(0, 300));
              
              if (statusCode >= 200 && statusCode < 300) {
              // If health status indicates status change, also update goal status
              if (healthStatus === "RED" || healthStatus === "AMBER") {
                  try {
                      var statusValue = "onTrack";
                      if (healthStatus === "RED") {
                          statusValue = "offTrack";
                      } else if (healthStatus === "AMBER") {
                          statusValue = "onTrack"; // AMBER = still on track but at risk
                      }
                      
                      var statusUpdatePayload = {
                          "status": statusValue,
                          "comment": checkInComment
                      };
                      
                      var statusRes = UrlFetchApp.fetch(baseEndpoint + '/' + goalId + '/status', {
                          method: 'patch', headers: headers, contentType: 'application/json',
                          payload: JSON.stringify(statusUpdatePayload), muteHttpExceptions: true
                      });
                      debugInfo.push("Status update response: " + statusRes.getResponseCode());
                  } catch(statusErr) {
                      debugInfo.push("Status update exception: " + statusErr.toString());
                  }
              }
              
              try {
                  var responseJson = JSON.parse(responseText);
                  return jsonResp({ 
                      success: true, 
                      message: "Check-in created in HiBob using key-results/progress endpoint",
                      debug: debugInfo,
                      response: responseJson
                  });
              } catch(parseErr) {
                  return jsonResp({ 
                      success: true, 
                      message: "Check-in created in HiBob",
                      debug: debugInfo,
                      rawResponse: responseText.substring(0, 500)
                  });
              }
          } else {
              // If key-results endpoint fails, try status update with comment as fallback
              debugInfo.push("Key-results/progress endpoint failed, trying status update fallback...");
              try {
                  var statusValue = "onTrack";
                  if (healthStatus === "RED") {
                      statusValue = "offTrack";
                  } else if (healthStatus === "AMBER") {
                      statusValue = "onTrack";
                  }
                  
                  var statusUpdatePayload = {
                      "status": statusValue,
                      "comment": checkInComment
                  };
                  
                  var statusRes = UrlFetchApp.fetch(baseEndpoint + '/' + goalId + '/status', {
                      method: 'patch', headers: headers, contentType: 'application/json',
                      payload: JSON.stringify(statusUpdatePayload), muteHttpExceptions: true
                  });
                  
                  if (statusRes.getResponseCode() >= 200 && statusRes.getResponseCode() < 300) {
                      debugInfo.push("Status update fallback succeeded");
                      return jsonResp({ 
                          success: true, 
                          message: "Check-in via key-results failed, but status update with comment succeeded",
                          fallbackUsed: true,
                          debug: debugInfo
                      });
                  }
              } catch(statusErr) {
                  debugInfo.push("Status update fallback exception: " + statusErr.toString());
              }
              
              // Both key-results and status update failed - report error, do NOT pollute description
              debugInfo.push("All check-in methods failed - NOT updating description");
              
              return jsonResp({ 
                  success: false, 
                  message: "Check-in failed. Key-results and status update both failed. Status: " + statusCode,
                  debug: debugInfo,
                  lastError: {
                      status: statusCode,
                      response: responseText.substring(0, 500)
                  }
              });
          }
          }
      } catch(e) {
          debugInfo.push("Exception: " + e.toString());
          return jsonResp({ success: false, message: "Check-in Exception: " + e.toString(), debug: debugInfo });
      }
  }
  
  // --- ISOLATED HIBOB TEST ---
  if (params.action === 'TEST_HIBOB') {
      var debugLog = [];
      var serviceId = params.serviceId;
      var manualGoalType = params.manualGoalType || "";
      if (serviceId.includes('&manualGoalType=')) {
          var parts = serviceId.split('&manualGoalType=');
          serviceId = parts[0];
          manualGoalType = parts[1];
      }
      var token = params.token;
      var email = params.email;
      var subAction = params.subAction; 
      var authHeader = 'Basic ' + Utilities.base64Encode(serviceId + ':' + token);
      var headers = { 'Authorization': authHeader, 'Accept': 'application/json' };
      
      // --- SUB ACTION: GET ALL TAGS (doesn't need employee lookup) ---
      if (subAction === 'TEST_GET_TAGS') {
          try {
              var attempts = [];
              
              // Strategy 1: Try GET requests to various tag endpoints
              var tagEndpoints = [
                  { url: 'https://api.hibob.com/v1/company/named-lists/tags', method: 'get' },
                  { url: 'https://api.hibob.com/v1/goals/tags', method: 'get' },
                  { url: 'https://api.hibob.com/v1/named-lists/tags', method: 'get' },
                  { url: 'https://api.hibob.com/v1/company/named-lists', method: 'get' }
              ];
              
              for (var tei = 0; tei < tagEndpoints.length; tei++) {
                  var endpoint = tagEndpoints[tei];
                  try {
                      var tagsRes = UrlFetchApp.fetch(endpoint.url, {
                          method: endpoint.method, headers: headers, muteHttpExceptions: true
                      });
                      var status = tagsRes.getResponseCode();
                      var responseText = tagsRes.getContentText();
                      attempts.push({ url: endpoint.url, method: endpoint.method, status: status, response: responseText.substring(0, 500) });
                      
                      if (status === 200) {
                          try {
                              var tagsJson = JSON.parse(responseText);
                              return jsonResp({ 
                                  success: true, 
                                  message: "Tags Fetched from: " + endpoint.url, 
                                  tags: tagsJson, 
                                  endpoint: endpoint.url,
                                  allAttempts: attempts
                              });
                          } catch(parseErr) {
                              attempts.push({ url: endpoint.url, parseError: parseErr.toString() });
                          }
                      }
                  } catch(e) {
                      attempts.push({ url: endpoint.url, exception: e.toString() });
                  }
              }
              
              // Strategy 2: Try POST search requests for tags
              var searchEndpoints = [
                  { url: 'https://api.hibob.com/v1/company/named-lists/search', payload: { "fields": ["id", "name"], "filters": [{ "fieldPath": "name", "operator": "contains", "values": ["tag"] }] } },
                  { url: 'https://api.hibob.com/v1/goals/goals/search', payload: { "fields": ["tags"], "filters": [] } }
              ];
              
              for (var sei = 0; sei < searchEndpoints.length; sei++) {
                  var endpoint = searchEndpoints[sei];
                  try {
                      var searchRes = UrlFetchApp.fetch(endpoint.url, {
                          method: 'post', headers: headers, contentType: 'application/json',
                          payload: JSON.stringify(endpoint.payload), muteHttpExceptions: true
                      });
                      var status = searchRes.getResponseCode();
                      var responseText = searchRes.getContentText();
                      attempts.push({ url: endpoint.url, method: 'post', status: status, response: responseText.substring(0, 500) });
                      
                      if (status === 200) {
                          try {
                              var searchJson = JSON.parse(responseText);
                              return jsonResp({ 
                                  success: true, 
                                  message: "Tags found via search: " + endpoint.url, 
                                  tags: searchJson, 
                                  endpoint: endpoint.url,
                                  allAttempts: attempts
                              });
                          } catch(parseErr) {
                              attempts.push({ url: endpoint.url, parseError: parseErr.toString() });
                          }
                      }
                  } catch(e) {
                      attempts.push({ url: endpoint.url, exception: e.toString() });
                  }
              }
              
              // If all endpoints failed, return error with all attempts
              return jsonResp({ 
                  success: false, 
                  message: "All tag endpoints failed. See attempts for details.", 
                  attemptedEndpoints: attempts,
                  hint: "Tags might be fetched from an existing goal. Try 'Get Single Goal' first."
              });
          } catch(e) {
              return jsonResp({ success: false, message: "Tags fetch exception: " + e.toString() });
          }
      }
      
      try {
        var searchUrl = 'https://api.hibob.com/v1/people/search';
        var searchPayload = { "fields": ["root.email"], "filters": [{ "fieldPath": "root.email", "operator": "equals", "values": [email] }] };
        var searchRes = UrlFetchApp.fetch(searchUrl, { method: 'post', headers: headers, contentType: 'application/json', payload: JSON.stringify(searchPayload), muteHttpExceptions: true });
        var searchJson = JSON.parse(searchRes.getContentText());
        if (!searchJson.employees || searchJson.employees.length === 0) return jsonResp({ success: false, error: "Employee not found." });
        
        var employeeId = searchJson.employees[0].id;
        debugLog.push("Employee ID: " + employeeId);

        // --- SUB ACTION 1: TEST PUSH ---
        if (subAction === 'TEST_PUSH') {
             var goalsUrl = 'https://api.hibob.com/v1/goals/goals';
             var now = new Date().toISOString().split('T')[0];
             var end = '2025-12-31';
             
             var validTypeId = manualGoalType;
             if (!validTypeId) {
                 try {
                     var typeRes = UrlFetchApp.fetch('https://api.hibob.com/v1/goals/goal-types/search', {
                        method: 'post', headers: headers, contentType: 'application/json',
                        payload: JSON.stringify({ "fields": ["id", "name"] }), muteHttpExceptions: true
                     });
                     var typeJson = JSON.parse(typeRes.getContentText());
                     if (typeJson.items && typeJson.items.length > 0) validTypeId = typeJson.items[0].id;
                 } catch(e) { debugLog.push("Auto-detect type failed: " + e.toString()); }
             }

             if (!validTypeId) return jsonResp({ success: false, message: "Missing Goal Type ID. Please find one via 'Read Goals API' and enter manually." });

             var payloadWrapped = {
                 "items": [{
                        "objectType": "goal",
                        "fields": {
                            "title": { "value": "OmniMap Test v7.46" },
                            "description": { "value": "Test goal created at " + new Date().toISOString() },
                            "startDate": { "value": now },
                            "dueDate": { "value": end },
                            "owner": { "value": employeeId },
                            "typeId": { "value": validTypeId }, 
                            "isPrivate": { "value": false } 
                        }
                 }]
             };

             var res = UrlFetchApp.fetch(goalsUrl, {
                method: 'post', headers: headers, contentType: 'application/json',
                payload: JSON.stringify(payloadWrapped), muteHttpExceptions: true
             });
             
             return jsonResp({ success: res.getResponseCode() < 300, message: "Push Attempted. Status: " + res.getResponseCode(), debugTrace: debugLog, response: JSON.parse(res.getContentText()) });
        }

        // --- SUB ACTION 2: READ GOALS ---
        if (subAction === 'TEST_GOALS_MODULE') {
             var typesRes = UrlFetchApp.fetch('https://api.hibob.com/v1/goals/goal-types/search', {
                method: 'post', headers: headers, contentType: 'application/json',
                payload: JSON.stringify({ "fields": ["id", "name"] }), muteHttpExceptions: true
             });
             var goalsRes = UrlFetchApp.fetch('https://api.hibob.com/v1/goals/goals/search', {
                method: 'post', headers: headers, contentType: 'application/json',
                payload: JSON.stringify({
                    "fields": ["id", "title", "typeId", "type", "tags", "owner.id"],
                    "filters": [{ "fieldPath": "owner.id", "operator": "equals", "values": [employeeId] }]
                }), muteHttpExceptions: true
             });
             
             return jsonResp({ success: true, message: "Data Fetched", goalTypes: JSON.parse(typesRes.getContentText()), userGoals: JSON.parse(goalsRes.getContentText()) });
        }
        
        // --- SUB ACTION 3: GET SINGLE GOAL BY ID (to see all fields including tags) ---
        if (subAction === 'TEST_GET_GOAL') {
            var goalId = params.goalId;
            var targetGoalId = goalId;
            var debugInfo = [];
            
            // If no goalId provided, get first goal ID from search
            if (!targetGoalId) {
                debugInfo.push("No goalId provided, searching for first goal");
                try {
                    var searchRes = UrlFetchApp.fetch('https://api.hibob.com/v1/goals/goals/search', {
                        method: 'post', headers: headers, contentType: 'application/json',
                        payload: JSON.stringify({
                            "fields": ["id", "title"],
                            "filters": [{ "fieldPath": "owner.id", "operator": "equals", "values": [employeeId] }]
                        }), muteHttpExceptions: true
                    });
                    var status = searchRes.getResponseCode();
                    var responseText = searchRes.getContentText();
                    debugInfo.push("Search status: " + status);
                    
                    if (status === 200) {
                        try {
                            var searchJson = JSON.parse(responseText);
                            debugInfo.push("Found " + ((searchJson.items && searchJson.items.length) || 0) + " goals");
                            if (searchJson.items && searchJson.items.length > 0) {
                                targetGoalId = searchJson.items[0].id || safeGet(searchJson.items[0], 'fields.id.value') || safeGet(searchJson.items[0], 'fields.id');
                                debugInfo.push("Using goal ID: " + targetGoalId);
                            }
                        } catch(parseErr) {
                            debugInfo.push("Parse error: " + parseErr.toString());
                            debugInfo.push("Response: " + responseText.substring(0, 500));
                        }
                    } else {
                        debugInfo.push("Search failed: " + responseText.substring(0, 500));
                    }
                } catch(e) {
                    return jsonResp({ success: false, message: "Exception searching for goals: " + e.toString(), debug: debugInfo });
                }
                if (!targetGoalId) {
                    return jsonResp({ success: false, message: "No goal ID provided and no goals found for employee", debug: debugInfo });
                }
            } else {
                debugInfo.push("Using provided goalId: " + targetGoalId);
            }
            
            // Try multiple strategies to fetch the goal
            var strategies = [];
            
            // Strategy 1: Search endpoint with ID filter
            try {
                debugInfo.push("Trying search endpoint with ID filter");
                var searchRes = UrlFetchApp.fetch('https://api.hibob.com/v1/goals/goals/search', {
                    method: 'post', headers: headers, contentType: 'application/json',
                    payload: JSON.stringify({
                        "fields": ["id", "title", "description", "startDate", "dueDate", "status", "progress", "tags", "typeId", "owner.id", "name"],
                        "filters": [{ "fieldPath": "id", "operator": "equals", "values": [String(targetGoalId)] }]
                    }), muteHttpExceptions: true
                });
                var status = searchRes.getResponseCode();
                var responseText = searchRes.getContentText();
                strategies.push({ method: "search_with_id_filter", status: status, response: responseText.substring(0, 1000) });
                
                if (status === 200) {
                    try {
                        var searchJson = JSON.parse(responseText);
                        if (searchJson.items && searchJson.items.length > 0) {
                            var goal = searchJson.items[0];
                            debugInfo.push("Goal found via search endpoint");
                            return jsonResp({ 
                                success: true, 
                                message: "Single Goal Fetched", 
                                goal: goal, 
                                allItems: searchJson.items,
                                debug: debugInfo,
                                strategies: strategies,
                                tagsInfo: {
                                    tagsField: goal.tags,
                                    tagsFieldsValue: safeGet(goal, 'fields.tags.value'),
                                    tagsRaw: JSON.stringify(goal.tags),
                                    allFields: Object.keys(goal.fields || {})
                                }
                            });
                        } else {
                            debugInfo.push("Search returned no items");
                        }
                    } catch(parseErr) {
                        debugInfo.push("Parse error: " + parseErr.toString());
                    }
                }
            } catch(e) {
                strategies.push({ method: "search_with_id_filter", exception: e.toString() });
            }
            
            // Strategy 2: Try direct GET (might work for some HiBob versions)
            try {
                debugInfo.push("Trying direct GET endpoint");
                var getRes = UrlFetchApp.fetch('https://api.hibob.com/v1/goals/goals/' + targetGoalId, {
                    method: 'get', headers: headers, muteHttpExceptions: true
                });
                var status = getRes.getResponseCode();
                var responseText = getRes.getContentText();
                strategies.push({ method: "direct_get", status: status, response: responseText.substring(0, 1000) });
                
                if (status === 200) {
                    try {
                        var goalJson = JSON.parse(responseText);
                        debugInfo.push("Goal found via direct GET");
                        return jsonResp({ 
                            success: true, 
                            message: "Single Goal Fetched (Direct GET)", 
                            goal: (goalJson.items && goalJson.items[0]) || goalJson,
                            debug: debugInfo,
                            strategies: strategies,
                            tagsInfo: {
                                tagsField: (goalJson.items && goalJson.items[0] && goalJson.items[0].tags) || goalJson.tags,
                                tagsFieldsValue: safeGet(goalJson.items && goalJson.items[0], 'fields.tags.value') || safeGet(goalJson, 'fields.tags.value'),
                                tagsRaw: JSON.stringify((goalJson.items && goalJson.items[0] && goalJson.items[0].tags) || goalJson.tags)
                            }
                        });
                    } catch(parseErr) {
                        debugInfo.push("Parse error: " + parseErr.toString());
                    }
                }
            } catch(e) {
                strategies.push({ method: "direct_get", exception: e.toString() });
            }
            
            return jsonResp({ 
                success: false, 
                message: "Could not fetch goal with ID: " + targetGoalId, 
                debug: debugInfo,
                strategies: strategies,
                hint: "Check if the goal ID is correct and belongs to the employee"
            });
        }
        
        // --- SUB ACTION 4: TEST CHECK-IN ---
        if (subAction === 'TEST_CHECK_IN') {
            var goalId = params.goalId;
            if (!goalId) {
                return jsonResp({ success: false, message: "Goal ID is required for check-in test. Use 'Get Single Goal' first to get a goal ID." });
            }
            
            var debugInfo = [];
            debugInfo.push("Testing check-in for goal ID: " + goalId);
            
            try {
                // Map health status to HiBob check-in status
                var hibobStatus = "on_track";
                var testHealthStatus = params.testHealthStatus || "GREEN";
                var healthUpper = String(testHealthStatus).toUpperCase();
                if (healthUpper === "AMBER" || healthUpper === "YELLOW") {
                    hibobStatus = "at_risk";
                } else if (healthUpper === "RED") {
                    hibobStatus = "off_track";
                }
                debugInfo.push("Mapped status: " + hibobStatus + " from: " + testHealthStatus);
                
                var checkInUrl = 'https://api.hibob.com/v1/goals/goals/' + goalId + '/check-ins';
                var testDate = new Date().toISOString().split('T')[0];
                var testContent = "Test check-in created at " + new Date().toISOString();
                
                var checkInPayload = {
                    "items": [{
                        "objectType": "checkIn",
                        "fields": {
                            "date": { "value": testDate },
                            "status": { "value": hibobStatus },
                            "comment": { "value": testContent }
                        }
                    }]
                };
                
                debugInfo.push("Check-in URL: " + checkInUrl);
                debugInfo.push("Payload: " + JSON.stringify(checkInPayload).substring(0, 300));
                
                var apiRes = UrlFetchApp.fetch(checkInUrl, {
                    method: 'post', 
                    headers: headers, 
                    contentType: 'application/json',
                    payload: JSON.stringify(checkInPayload), 
                    muteHttpExceptions: true
                });
                
                var statusCode = apiRes.getResponseCode();
                var responseText = apiRes.getContentText();
                debugInfo.push("Response status: " + statusCode);
                
                if (statusCode >= 200 && statusCode < 300) {
                    try {
                        var responseJson = JSON.parse(responseText);
                        return jsonResp({ 
                            success: true, 
                            message: "Test check-in created successfully",
                            checkInId: (responseJson.items && responseJson.items[0] && responseJson.items[0].id) || responseJson.id || null,
                            debug: debugInfo,
                            response: responseJson
                        });
                    } catch(parseErr) {
                        return jsonResp({ 
                            success: true, 
                            message: "Test check-in created (could not parse response)",
                            debug: debugInfo,
                            rawResponse: responseText.substring(0, 500)
                        });
                    }
                } else {
                    return jsonResp({ 
                        success: false, 
                        message: "Check-in test failed. Status: " + statusCode,
                        debug: debugInfo,
                        errorResponse: responseText.substring(0, 1000)
                    });
                }
            } catch(e) {
                debugInfo.push("Exception: " + e.toString());
                return jsonResp({ success: false, message: "Check-in test exception: " + e.toString(), debug: debugInfo });
            }
        }
        
        return jsonResp({ success: true, message: "Connection OK. Employee Found." });
      } catch (err) {
         return jsonResp({ success: false, error: err.toString() });
      }
  }

  // --- JIRA SYNC ---
  if (params.action === 'SYNC_JIRA') {
      var jiraDomain = params.domain;
      var jiraEmail = params.email;
      var jiraToken = params.token;
      var projectKeys = params.projectKeys || '';
      
      if (!jiraDomain || !jiraEmail || !jiraToken) {
          return jsonResp({ success: false, message: 'Missing Jira credentials (domain, email, token)' });
      }
      
      var jiraAuth = 'Basic ' + Utilities.base64Encode(jiraEmail + ':' + jiraToken);
      var jiraHeaders = { 
          'Authorization': jiraAuth, 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      };
      
      try {
          // Build JQL query
          var jql = 'status != Done';
          if (projectKeys) {
              var keys = projectKeys.split(',').map(function(k) { return k.trim(); }).filter(function(k) { return k.length > 0; });
              if (keys.length > 0) {
                  jql = 'project IN (' + keys.join(',') + ') AND ' + jql;
              }
          }
          jql += ' ORDER BY updated DESC';
          
          var searchUrl = 'https://' + jiraDomain + '/rest/api/3/search?jql=' + encodeURIComponent(jql) + '&maxResults=100&fields=summary,description,status,priority,assignee,issuetype,project,created,updated,labels,duedate';
          
          var response = UrlFetchApp.fetch(searchUrl, {
              method: 'get',
              headers: jiraHeaders,
              muteHttpExceptions: true
          });
          
          var statusCode = response.getResponseCode();
          var responseText = response.getContentText();
          
          if (statusCode >= 200 && statusCode < 300) {
              var jiraData = JSON.parse(responseText);
              var issues = jiraData.issues || [];
              
              // Map to a simpler format for the frontend
              var mappedIssues = issues.map(function(issue) {
                  var fields = issue.fields || {};
                  var desc = '';
                  
                  // Extract description text (Jira uses Atlassian Document Format)
                  if (fields.description && fields.description.content) {
                      try {
                          desc = fields.description.content.map(function(block) {
                              if (block.content) {
                                  return block.content.map(function(c) { return c.text || ''; }).join('');
                              }
                              return '';
                          }).join('\\n');
                      } catch(e) {
                          desc = '';
                      }
                  } else if (typeof fields.description === 'string') {
                      desc = fields.description;
                  }
                  
                  return {
                      key: issue.key,
                      id: issue.id,
                      summary: fields.summary || '',
                      description: desc,
                      status: fields.status ? fields.status.name : 'Unknown',
                      statusCategory: fields.status && fields.status.statusCategory ? fields.status.statusCategory.name : 'Unknown',
                      priority: fields.priority ? fields.priority.name : 'Medium',
                      assignee: fields.assignee ? fields.assignee.displayName : 'Unassigned',
                      assigneeEmail: fields.assignee ? fields.assignee.emailAddress : '',
                      issueType: fields.issuetype ? fields.issuetype.name : 'Task',
                      project: fields.project ? fields.project.name : '',
                      projectKey: fields.project ? fields.project.key : '',
                      created: fields.created,
                      updated: fields.updated,
                      dueDate: fields.duedate || '',
                      labels: fields.labels || [],
                      url: 'https://' + jiraDomain + '/browse/' + issue.key
                  };
              });
              
              return jsonResp({ 
                  success: true, 
                  message: 'Found ' + mappedIssues.length + ' issues from Jira',
                  total: jiraData.total || mappedIssues.length,
                  issues: mappedIssues
              });
          } else {
              var errorBody = '';
              try { errorBody = JSON.parse(responseText); } catch(e) { errorBody = responseText; }
              return jsonResp({ 
                  success: false, 
                  message: 'Jira API error: ' + statusCode, 
                  error: errorBody 
              });
          }
      } catch (err) {
          return jsonResp({ success: false, message: 'Jira sync failed: ' + err.toString() });
      }
  }

  // --- STANDARD DATA FETCH ---
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function getSheetData(possibleNames) {
    for (var i = 0; i < possibleNames.length; i++) {
      var name = possibleNames[i];
      var sheet = ss.getSheetByName(name);
      if (sheet) return sheet.getDataRange().getValues();
    }
    return [];
  }
  function safeDate(val) {
    if (!val) return "";
    var str = String(val).trim();
    if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(str)) {
       var parts = str.split('/'); 
       return parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    }
    if (val instanceof Date) return Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
    return val.toString();
  };

  try {
      var rocksRaw = getSheetData(['BigRocks', 'Big Rocks']);
      var itemsRaw = getSheetData(['AllGoals', 'RoadmapItems', 'Roadmap Items']);
      var employeesRaw = getSheetData(['Employees', 'Team']);
      var updatesRaw = getSheetData(['BigRocksMonthlyUpdates', 'MonthlyUpdates', 'Updates']);
      var itemUpdatesRaw = getSheetData(['MonthlyGoalUpdates', 'ItemUpdates', 'Item Updates']);
      var salesActionsRaw = getSheetData(['SalesActions', 'Sales Actions']);
      var targetsRaw = getSheetData(['SalesTargets', 'Sales Targets', 'SalesData']); 
      var actualsRaw = getSheetData(['SalesActuals', 'Sales Actuals']);
      var projectsRaw = getSheetData(['Projects']);
      var projectTasksRaw = getSheetData(['ProjectTasks']);
      var projectMilestonesRaw = getSheetData(['ProjectMilestones', 'Project Milestones']);
      var taskMilestonesRaw = getSheetData(['TaskMilestones', 'Task Milestones']);
      
      // Debug: Log the header row to understand column structure
      Logger.log('SalesTargets Headers: ' + JSON.stringify(targetsRaw[0]));
      Logger.log('SalesActuals Headers: ' + JSON.stringify(actualsRaw[0]));
      if (targetsRaw.length > 1) Logger.log('SalesTargets First Data Row: ' + JSON.stringify(targetsRaw[1]));
      
      // Include debug info in the response
      var salesDebugInfo = {
        targetsHeaders: targetsRaw.length > 0 ? targetsRaw[0] : [],
        actualsHeaders: actualsRaw.length > 0 ? actualsRaw[0] : [],
        targetsRowCount: targetsRaw.length - 1,
        actualsRowCount: actualsRaw.length - 1,
        sampleTargetRow: targetsRaw.length > 1 ? targetsRaw[1] : [],
        sampleActualRow: actualsRaw.length > 1 ? actualsRaw[1] : []
      };

      var actualsMap = {};
      if (actualsRaw.length > 1) {
        actualsRaw.slice(1).forEach(function(row) {
           var dateStr = safeDate(row[3]); 
           var empId = row[4] ? row[4].toString().trim() : "";
           if(dateStr && empId) actualsMap[empId + '_' + dateStr] = row;
        });
      }
      
      var data = {
        rocks: rocksRaw.length > 1 ? rocksRaw.slice(1).map(function(r) { return { id: r[0].toString(), title: r[1], description: r[2] }; }) : [],
        employees: employeesRaw.length > 1 ? employeesRaw.slice(1).map(function(e) {
           var hasEmailCol = e[4] && String(e[4]).includes('@');
           var offset = hasEmailCol ? 1 : 0;
           
           // Extract email - it's in column 4 if hasEmailCol is true, otherwise try to find it
           var email = null;
           if (hasEmailCol) {
             email = String(e[4] || "").trim();
             // Validate it's actually an email
             if (!email.includes('@') || email.length < 5) email = null;
           } else {
             // Try to find email in any column
             for (var i = 0; i < e.length; i++) {
               var cell = String(e[i] || "").trim();
               if (cell.includes('@') && cell.includes('.') && cell.length > 5) {
                 // Basic email validation
                 var emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                 if (emailPattern.test(cell)) {
                   email = cell;
                   break;
                 }
               }
             }
           }
           
           var hodVal = e[7 + offset];
           var accessVal = e[8 + offset];
           var salesAccessVal = e[10 + offset];
           
           var isHoD = (hodVal === true || String(hodVal).trim().toUpperCase() === 'TRUE');
           
           var accessLevel = "IC";
           if (accessVal) {
               var norm = String(accessVal).trim();
               if (['Admin', 'Manager', 'IC'].includes(norm)) accessLevel = norm;
           }
           if (isHoD && accessLevel === 'IC') accessLevel = 'Manager';

           var fName = String(e[1] || "").trim();
           var lName = String(e[2] || "").trim();
           if (lName && !lName.includes('@') && lName.length > 1) {
              fName = fName + " " + lName;
           }
           if (!fName) fName = String(e[3] || "Unknown");

           return { 
            id: (e[0] || e[3]).toString().trim(), 
            name: fName,
            email: email || undefined, // Include email field for SSO matching
            department: e[4 + offset], 
            team: e[5 + offset], 
            role: e[6 + offset] || "",
            responsibilities: e[11 + offset] ? String(e[11 + offset]).trim() : undefined,
            reportsTo: e[9 + offset] ? String(e[9 + offset]).trim() : "",
            salesPerformanceAccess: salesAccessVal ? String(salesAccessVal).split(',').map(function(s) { return s.trim(); }) : [],
            avatarUrl: "https://ui-avatars.com/api/?name=" + encodeURIComponent(fName) + "&background=random&color=fff",
            accessLevel: accessLevel,
            isHoD: isHoD
          };
        }) : [],
        items: itemsRaw.length > 1 ? itemsRaw.slice(1).map(function(i) { return {
          id: i[0].toString(), goalId: i[1].toString(), owner: i[2], title: i[3], description: i[4], 
          department: i[5], status: i[6], priority: i[7], startDate: safeDate(i[8]), endDate: safeDate(i[9]), 
          tags: i[10] ? i[10].toString().split(',') : [], progress: i[11] || 0, contribution: i[12] || "",
          goalType: (i[13] && i[13].toString().trim()) ? i[13].toString().trim() : 'PERSONAL',
          goalCategory: (i[14] && i[14].toString().trim()) ? i[14].toString().trim() : 'PERFORMANCE',
          hibobGoalId: (i[15] && i[15].toString().trim()) ? i[15].toString().trim() : ''
        }; }) : [],
        updates: updatesRaw.length > 1 ? updatesRaw.slice(1).map(function(u) { return {
          id: u[0], goalId: u[1], month: u[2], year: u[3], status: u[4], content: u[5], authorId: u[6], createdAt: u[7]
        }; }) : [],
        itemUpdates: itemUpdatesRaw.length > 1 ? itemUpdatesRaw.slice(1).map(function(u) { return {
          id: u[0], itemId: u[1], month: u[2], year: u[3], health: u[4], content: u[5], updatedAt: u[6]
        }; }) : [],
        salesData: targetsRaw.length > 1 ? targetsRaw.slice(1).flatMap(function(row, idx) {
          var dateStr = safeDate(row[3]); 
          if (!dateStr) return [];
          var parts = dateStr.split('-');
          var yearNum = parseInt(parts[0], 10) || 2025;
          var monthNum = parseInt(parts[1], 10) || 1;
          var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          var monthStr = monthNames[monthNum - 1] || 'Jan';
          
          var empId = row[4] ? row[4].toString().trim() : ""; 
          if (!empId) return [];
          
          var actualRow = actualsMap[empId + '_' + dateStr];
          var metrics = [];
          
          function parseVal(val, isPercentMetric) {
             if (val === undefined || val === null || val === '') return 0;
             var s = String(val).trim().replace(/,/g, '').replace(/[^0-9.%-]/g, '');
             if (!s || s === '-') return 0;
             var num = parseFloat(s.replace('%', '')) || 0;
             // For percentage metrics (Sales Rate, Conversion):
             // If value has % sign OR is > 1, assume it's already a percentage (27.75 = 27.75%)
             // Convert to decimal for internal storage (27.75 -> 0.2775)
             if (isPercentMetric) {
                if (s.indexOf('%') >= 0 || num > 1) {
                   return num / 100;
                }
                return num; // Already decimal (0.2775)
             }
             return num;
          }
          
          function addM(type, colIdx, isPercentMetric) { 
            var targetVal = parseVal(row[colIdx], isPercentMetric);
            var actualVal = actualRow ? parseVal(actualRow[colIdx], isPercentMetric) : 0;
            // Only add metric if we have at least a target value
            if (targetVal > 0 || actualVal > 0) {
              metrics.push({ 
                id: 'sd-' + idx + '-' + type + '-' + monthStr + yearNum, 
                employeeId: empId, 
                month: monthStr, 
                year: yearNum, 
                metricType: type, 
                target: targetVal, 
                actual: actualVal 
              }); 
            }
          }
          
          // Add all 5 metric types based on actual sheet structure:
          // ID(0), EmpID(1), TargetName(2), TargetDate(3), OwnerID(4), CompanyCode(5), Currency(6), LotType(7), RecordType(8),
          // RevenueActuals(9), IncompleteEnq(10), AwaitingPhotos(11), OutboundCalls(12), ListingsValue(13), 
          // ListingsActuals(14), SalesActuals(15), SellRate(16), DealsNoActivity(17), DealsOverdue(18),
          // Reruns(19), NewSellers(20), ConversionRate(21)
          addM('Revenue', 9, false);
          addM('Calls', 12, false);       // OUTBOUND CALLS
          addM('Listings', 14, false);    // LISTINGS ACTUALS
          addM('Sales Rate', 16, true);   // SELL RATE (percentage)
          addM('Conversion', 21, true);   // SUITABLE INQUIERIES CONVERSION RATE (percentage)
          
          return metrics;
        }) : [],
        salesActions: salesActionsRaw.length > 1 ? salesActionsRaw.slice(1).map(function(s) { return {
          id: s[0], employeeId: s[1], metricType: s[2], description: s[3], assignedBy: s[4], dueDate: safeDate(s[5]), isCompleted: s[6] === true, createdAt: s[7]
        }; }) : [],
        projects: projectsRaw.length > 1 ? projectsRaw.slice(1).map(function(p) { return {
          id: p[0].toString(), title: p[1], description: p[2] || '', owner: p[3] || '', status: p[4] || 'Not Started', priority: p[5] || 'Medium',
          startDate: safeDate(p[6]), endDate: safeDate(p[7]), createdAt: p[8] ? String(p[8]) : undefined, department: p[9], team: p[10]
        }; }) : [],
        projectTasks: projectTasksRaw.length > 1 ? projectTasksRaw.slice(1).map(function(t) { return {
          id: t[0].toString(), projectId: t[1].toString(), title: t[2], description: t[3] || '', owner: t[4] || '', status: t[5] || 'Not Started', priority: t[6] || 'Medium',
          startDate: safeDate(t[7]), endDate: safeDate(t[8]), order: t[9] != null ? Number(t[9]) : undefined, createdAt: t[10] ? String(t[10]) : undefined, department: t[11], team: t[12]
        }; }) : [],
        projectMilestones: projectMilestonesRaw.length > 1 ? projectMilestonesRaw.slice(1).map(function(m) { return {
          id: m[0].toString(), projectId: m[1].toString(), title: m[2], dueDate: safeDate(m[3]), completed: m[4] === true, completedAt: m[5] ? String(m[5]) : undefined
        }; }) : [],
        taskMilestones: taskMilestonesRaw.length > 1 ? taskMilestonesRaw.slice(1).map(function(m) { return {
          id: m[0].toString(), taskId: m[1].toString(), title: m[2], dueDate: safeDate(m[3]), completed: m[4] === true, completedAt: m[5] ? String(m[5]) : undefined
        }; }) : [],
        _salesDebug: salesDebugInfo
      };
      return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function jsonResp(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = payload.action;
    
    function getSheet(names, headers) {
      for (var i = 0; i < names.length; i++) { var s = ss.getSheetByName(names[i]); if (s) return s; }
      var newSheet = ss.insertSheet(names[0]);
      if (headers) newSheet.appendRow(headers);
      return newSheet;
    };

    if (action === 'UPSERT_ITEM') {
        Logger.log('UPSERT_ITEM received: ' + JSON.stringify(payload.item));
        Logger.log('hibobGoalId value: ' + (payload.item.hibobGoalId || 'NOT SET'));
        var sheet = getSheet(['AllGoals', 'RoadmapItems'], ['ID','GoalID','Owner','Title','Desc','Dept','Status','Priority','Start','End','Tags','Prog','Contrib','GoalType','GoalCategory','HiBobGoalId']);
        var values = [
            payload.item.id, payload.item.goalId, payload.item.owner, payload.item.title, payload.item.description, 
            payload.item.department, payload.item.status, payload.item.priority, payload.item.startDate, 
            payload.item.endDate, (payload.item.tags || []).join(','), payload.item.progress, payload.item.contribution,
            payload.item.goalType || 'PERSONAL', payload.item.goalCategory || 'PERFORMANCE',
            payload.item.hibobGoalId || ''
        ];
        Logger.log('Values to save (16 cols): ' + JSON.stringify(values));
        upsertRow(sheet, payload.item, values);
        Logger.log('UPSERT_ITEM completed for ID: ' + payload.item.id);
    }

    if (action === 'UPSERT_ITEM_UPDATE') {
        var sheet = getSheet(['MonthlyGoalUpdates', 'ItemUpdates'], ['ID','ItemID','Month','Year','Health','Content','UpdatedAt']);
        var update = payload.itemUpdate;
        upsertRow(sheet, update, [
            update.id, update.itemId, update.month, update.year, update.health, update.content, update.updatedAt || new Date().toISOString()
        ]);
    }

    if (action === 'UPSERT_GOAL') {
        var sheet = getSheet(['BigRocks', 'Goals'], ['ID','Title','Description']);
        var goal = payload.goal;
        upsertRow(sheet, goal, [goal.id, goal.title, goal.description]);
    }

    if (action === 'UPSERT_UPDATE') {
        var sheet = getSheet(['BigRocksMonthlyUpdates', 'MonthlyUpdates'], ['ID','GoalID','Month','Year','Status','Content','AuthorID','CreatedAt']);
        var upd = payload.update;
        upsertRow(sheet, upd, [upd.id, upd.goalId, upd.month, upd.year, upd.status, upd.content, upd.authorId, upd.createdAt || new Date().toISOString()]);
    }

    if (action === 'PUSH_GOALS_HIBOB') {
        return ContentService.createTextOutput("Bulk Push Executed").setMimeType(ContentService.MimeType.TEXT);
    }

    if (action === 'UPSERT_PROJECT') {
        var sheet = getSheet(['Projects'], ['ID','Title','Description','Owner','Status','Priority','StartDate','EndDate','CreatedAt','Department','Team']);
        var p = payload.project;
        upsertRow(sheet, p, [p.id, p.title, p.description || '', p.owner || '', p.status || 'Not Started', p.priority || 'Medium', p.startDate || '', p.endDate || '', p.createdAt || '', p.department || '', p.team || '']);
    }

    if (action === 'UPSERT_PROJECT_TASK') {
        var sheet = getSheet(['ProjectTasks'], ['ID','ProjectID','Title','Description','Owner','Status','Priority','StartDate','EndDate','Order','CreatedAt','Department','Team']);
        var t = payload.projectTask;
        upsertRow(sheet, t, [t.id, t.projectId, t.title, t.description || '', t.owner || '', t.status || 'Not Started', t.priority || 'Medium', t.startDate || '', t.endDate || '', t.order != null ? t.order : '', t.createdAt || '', t.department || '', t.team || '']);
    }

    if (action === 'DELETE_PROJECT') {
        var sheet = ss.getSheetByName('Projects');
        if (sheet) deleteRowById(sheet, payload.id);
    }

    if (action === 'DELETE_PROJECT_TASK') {
        var sheet = ss.getSheetByName('ProjectTasks');
        if (sheet) deleteRowById(sheet, payload.id);
    }

    if (action === 'UPSERT_PROJECT_MILESTONE') {
        var m = payload.projectMilestone;
        if (!m || !m.id || !m.projectId) {
          Logger.log('UPSERT_PROJECT_MILESTONE missing payload.projectMilestone or id/projectId: ' + JSON.stringify(payload));
          return ContentService.createTextOutput(JSON.stringify({ error: 'UPSERT_PROJECT_MILESTONE requires payload.projectMilestone with id and projectId' })).setMimeType(ContentService.MimeType.TEXT);
        }
        var sheet = getSheet(['ProjectMilestones', 'Project Milestones'], ['ID','ProjectID','Title','DueDate','Completed','CompletedAt']);
        var row = [m.id, m.projectId, m.title || '', m.dueDate || '', m.completed === true, m.completedAt || ''];
        upsertRow(sheet, m, row);
        Logger.log('UPSERT_PROJECT_MILESTONE ok: ' + m.id);
    }

    if (action === 'DELETE_PROJECT_MILESTONE') {
        var sheet = ss.getSheetByName('ProjectMilestones') || ss.getSheetByName('Project Milestones');
        if (sheet) deleteRowById(sheet, payload.id);
    }

    if (action === 'UPSERT_TASK_MILESTONE') {
        var m = payload.taskMilestone;
        if (!m || !m.id || !m.taskId) {
          Logger.log('UPSERT_TASK_MILESTONE missing payload.taskMilestone or id/taskId: ' + JSON.stringify(payload));
          return ContentService.createTextOutput(JSON.stringify({ error: 'UPSERT_TASK_MILESTONE requires payload.taskMilestone with id and taskId' })).setMimeType(ContentService.MimeType.TEXT);
        }
        var sheet = getSheet(['TaskMilestones', 'Task Milestones'], ['ID','TaskID','Title','DueDate','Completed','CompletedAt']);
        var row = [m.id, m.taskId, m.title || '', m.dueDate || '', m.completed === true, m.completedAt || ''];
        upsertRow(sheet, m, row);
        Logger.log('UPSERT_TASK_MILESTONE ok: ' + m.id);
    }

    if (action === 'DELETE_TASK_MILESTONE') {
        var sheet = ss.getSheetByName('TaskMilestones') || ss.getSheetByName('Task Milestones');
        if (sheet) deleteRowById(sheet, payload.id);
    }

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

function upsertRow(sheet, dataObj, values) {
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var id = values[0]; 
  
  for (var i = 1; i < rows.length; i++) { if (rows[i][0] == id) { rowIndex = i + 1; break; } }
  
  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  else sheet.appendRow(values);
}

function deleteRowById(sheet, id) {
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function _authorize() {
  UrlFetchApp.fetch("https://www.google.com");
  SpreadsheetApp.getActiveSpreadsheet();
}
`;

  return (
    <div className="relative z-50" data-sync-handlers={[handleHiBobSync, handleWorkableSync, handleSalesforceSync] as unknown as string}>
      <div className="flex items-center gap-2 bg-white border border-slate-300 pl-3 pr-1.5 py-1 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-slate-300">
        <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${sheetsService.getScriptUrl() ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${sheetsService.getScriptUrl() ? 'text-emerald-600' : 'text-slate-500'}`}>
                {sheetsService.getScriptUrl() ? 'Synced' : 'Offline'}
            </span>
        </div>
        
        <div className="h-3 w-px bg-slate-200"></div>

        <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`p-1.5 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'}`}
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
      </div>

      {/* Settings Modal */}
      <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="Settings" maxWidth="max-w-lg">
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-300">
            {[
              { id: 'general', label: 'General', icon: '⚙️' },
              { id: 'integrations', label: 'Integrations', icon: '🔗' },
              { id: 'data', label: 'Data', icon: '📊' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  settingsTab === tab.id 
                    ? 'border-teal-500 text-teal-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* General Tab */}
          {settingsTab === 'general' && (
            <div className="space-y-6">
              {/* Global Period Setting */}
              {globalPeriod && onPeriodChange && (
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Active Period
                  </h4>
                  <p className="text-xs text-slate-600 mb-3">
                    This sets the default month/year across the app
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={globalPeriod.month}
                      onChange={e => onPeriodChange({ ...globalPeriod, month: e.target.value })}
                      className="flex-1 bg-white border border-teal-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none cursor-pointer"
                    >
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={globalPeriod.year}
                      onChange={e => onPeriodChange({ ...globalPeriod, year: Number(e.target.value) })}
                      className="w-24 bg-white border border-teal-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button
                      onClick={() => {
                        const now = new Date();
                        onPeriodChange({ month: MONTHS[now.getMonth()], year: now.getFullYear() });
                      }}
                      className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors"
                    >
                      Today
                    </button>
                  </div>
                </div>
              )}

              {/* Backend URL */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                  Backend Script URL
                </label>
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/..."
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-teal-100 focus:border-teal-300 outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your Google Apps Script deployment URL
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Save & Sync
                </button>
                <button 
                  onClick={() => setIsGuideOpen(true)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-300"
                >
                  Setup Guide
                </button>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {settingsTab === 'integrations' && (
            <div className="space-y-4">
              {/* HiBob */}
              <div 
                onClick={() => { setIsHiBobOpen(true); setIsMenuOpen(false); }}
                className="p-4 bg-white rounded-xl border border-slate-300 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">👥</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 group-hover:text-rose-600 transition-colors">HiBob</h4>
                      <p className="text-xs text-slate-500">HR & Goals Integration</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    hiBobConfig.serviceId && hiBobConfig.token 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {hiBobConfig.serviceId && hiBobConfig.token ? 'Connected' : 'Not configured'}
                  </div>
                </div>
              </div>

              {/* Workable (placeholder) */}
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">💼</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-600">Workable</h4>
                      <p className="text-xs text-slate-500">Recruiting Integration</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-slate-200 rounded-full text-[10px] font-bold text-slate-500">Coming soon</span>
                </div>
              </div>

              {/* Jira */}
              <div 
                onClick={() => { setIsMenuOpen(false); /* Jira modal will be triggered from App.tsx */ }}
                className="p-4 bg-white rounded-xl border border-slate-300 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84H11.53zM6.77 6.8a4.362 4.362 0 0 0 4.34 4.38h1.8v1.7c0 2.4 1.93 4.34 4.33 4.35V7.65a.85.85 0 0 0-.85-.85H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.38h1.78v1.7c.01 2.39 1.95 4.33 4.35 4.33v-9.57a.84.84 0 0 0-.85-.84H2z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">Jira</h4>
                      <p className="text-xs text-slate-500">Project Management</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">Ready</span>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {settingsTab === 'data' && (
            <div className="space-y-4">
              <div className="bg-slate-100 rounded-xl p-4 border border-slate-300">
                <h4 className="text-sm font-bold text-slate-800 mb-2">Data Source</h4>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${sheetsService.getScriptUrl() ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className={sheetsService.getScriptUrl() ? 'text-emerald-700' : 'text-slate-500'}>
                    {sheetsService.getScriptUrl() ? 'Google Sheets Connected' : 'Not Connected'}
                  </span>
                </div>
                {lastSync && (
                  <p className="text-xs text-slate-500 mt-2">
                    Last synced: {lastSync.toLocaleString()}
                  </p>
                )}
              </div>

              {sheetsService.getScriptUrl() && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => { handleDebugFetch(); setIsDebugOpen(true); setIsMenuOpen(false); }}
                    className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h4a2 2 0 002-2v-3.616a1 1 0 01.3-.7l2.122-2.122a6 6 0 00-4.242-10.242A6 6 0 008 10v.01" />
                    </svg>
                    Inspect Raw Data
                  </button>
                  <button 
                    onClick={() => { onSync(); setIsMenuOpen(false); }}
                    disabled={isSyncing}
                    className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSyncing ? (
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
                        Force Sync
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* HiBob Modal with TEST BENCH */}
      <Modal isOpen={isHiBobOpen} onClose={() => setIsHiBobOpen(false)} title="HiBob HR Integration" maxWidth="max-w-2xl">
         <div className="space-y-6">
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
               <h4 className="text-rose-700 font-bold text-sm mb-1">Integration Status</h4>
               <p className="text-xs text-rose-600">
                  {hiBobStatus || 'Ready to connect. Requires Service ID & Token.'}
               </p>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Service ID</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-rose-100 focus:border-rose-300 outline-none transition-all"
                    value={hiBobConfig.serviceId}
                    onChange={e => setHiBobConfig({...hiBobConfig, serviceId: e.target.value})}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Service Token</label>
                  <input 
                    type="password" 
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-rose-100 focus:border-rose-300 outline-none transition-all"
                    value={hiBobConfig.token}
                    onChange={e => setHiBobConfig({...hiBobConfig, token: e.target.value})}
                  />
               </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-4 border border-slate-300 mt-4">
                <h5 className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                    Test Bench (Debug Mode)
                </h5>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Target Employee Email</label>
                        <input type="email" className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono" placeholder="user@company.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Goal Type ID (Optional Override)</label>
                        <div className="flex gap-2">
                            <input type="text" className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono" placeholder="Use 'Read Goals API' to find ID" value={manualGoalType} onChange={e => handleManualGoalTypeChange(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleHiBobTest('READ')} disabled={testingHiBob} className="bg-white text-slate-700 border border-slate-300 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">{testingHiBob ? '...' : 'Read Profile'}</button>
                            <button onClick={() => handleHiBobTest('TEST_GOALS_MODULE')} disabled={testingHiBob} className="bg-white text-emerald-600 border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">{testingHiBob ? '...' : 'Read Goals API'}</button>
                            <button onClick={() => handleHiBobTest('TEST_PUSH')} disabled={testingHiBob} className="bg-white text-rose-600 border border-slate-300 hover:bg-rose-50 hover:border-rose-300 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">{testingHiBob ? '...' : 'Test Push Goal'}</button>
                            <button onClick={() => handleHiBobTest('SCAN_METADATA')} disabled={testingHiBob} className="bg-white text-cyan-600 border border-slate-300 hover:bg-cyan-50 hover:border-cyan-300 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">{testingHiBob ? '...' : 'Deep Profile Scan'}</button>
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">Goal ID (Optional - leave empty to fetch first goal)</label>
                            <input 
                                type="text" 
                                className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs font-mono mb-2" 
                                placeholder="e.g., 8095174" 
                                value={testGoalId} 
                                onChange={e => setTestGoalId(e.target.value)} 
                            />
                            <button onClick={() => handleHiBobTest('TEST_GET_GOAL', testGoalId || undefined)} disabled={testingHiBob} className="w-full bg-white text-amber-600 border border-slate-300 hover:bg-amber-50 hover:border-amber-300 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 mb-2">{testingHiBob ? '...' : 'Get Single Goal'}</button>
                            <button onClick={() => handleHiBobTest('TEST_CHECK_IN', testGoalId || undefined, 'GREEN')} disabled={testingHiBob || !testGoalId} className="w-full bg-white text-orange-600 border border-slate-300 hover:bg-orange-50 hover:border-orange-300 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50" title={!testGoalId ? "Enter a Goal ID first" : "Test creating a check-in for this goal"}>{testingHiBob ? '...' : 'Test Check-In'}</button>
                        </div>
                        <button onClick={() => handleHiBobTest('TEST_GET_TAGS')} disabled={testingHiBob} className="w-full bg-white text-purple-600 border border-slate-300 hover:bg-purple-50 hover:border-purple-300 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">{testingHiBob ? '...' : 'Get Tags'}</button>
                    </div>
                    {testResult && (
                        <div className="mt-2 bg-slate-100 p-3 rounded-lg border border-slate-300 max-h-64 overflow-y-auto">
                            <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
                        </div>
                    )}
               </div>
            </div>
         </div>
      </Modal>

      {/* Backend Setup Guide */}
      <Modal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} title="Backend Setup Guide">
        <div className="space-y-6">
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 max-h-[60vh] overflow-y-auto">
            <h5 className="text-[10px] font-bold text-slate-800 uppercase mb-4">1. Script Installation</h5>
            <ol className="text-[10px] font-medium text-slate-600 space-y-2 list-decimal list-inside mb-6">
              <li>Open your Google Sheet.</li>
              <li>Go to <strong className="text-slate-800">Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the script below (replacing everything).</li>
              <li>
                 <span className="text-teal-600 font-bold">IMPORTANT:</span> Select <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">_authorize</code> from the dropdown menu up top and click <strong className="text-slate-800">Run</strong>. Review and grant permissions (especially &apos;External Service&apos;).
              </li>
              <li>Click <strong className="text-slate-800">Deploy &gt; New Deployment</strong>.</li>
              <li>Select type &quot;Web app&quot;.</li>
              <li>Set &quot;Who has access&quot; to &quot;Anyone&quot;.</li>
              <li>Click &quot;Deploy&quot; and copy the <strong className="text-slate-800">Web App URL</strong>.</li>
            </ol>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                <p className="text-[10px] font-semibold text-amber-700">Important: You must re-deploy as &quot;New Version&quot; every time you update this script code!</p>
            </div>
          </div>
          <div className="bg-slate-100 p-4 rounded-xl relative border border-slate-300">
            <button onClick={() => navigator.clipboard.writeText(scriptCode)} className="absolute top-2 right-2 bg-teal-600 text-white text-[9px] font-bold px-2 py-1 rounded-lg hover:bg-teal-700 transition-all">Copy Script</button>
            <pre className="text-[10px] text-slate-700 font-mono overflow-x-auto h-40">{scriptCode}</pre>
          </div>
        </div>
      </Modal>

      {/* Data Inspector Modal */}
      <Modal isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} title="Data Inspector">
        <div className="space-y-4">
           <div className="flex justify-between items-center"><p className="text-xs text-slate-600">Verify data arriving from Google Sheets.</p><button onClick={handleDebugFetch} className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg font-bold uppercase hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors">Refresh Data</button></div>
           {loadingDebug ? <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div> : debugData ? <pre className="bg-slate-100 text-slate-700 p-4 rounded-xl text-[10px] font-mono overflow-auto h-40 border border-slate-300">{JSON.stringify(debugData, null, 2)}</pre> : <div className="text-center py-10 text-slate-500 font-semibold">No data fetched yet.</div>}
        </div>
      </Modal>
    </div>
  );
};

export default SyncPanel;
