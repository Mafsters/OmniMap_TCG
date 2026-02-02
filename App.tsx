
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RoadmapItem, AIInsight, StrategicGoal, Employee, MonthlyUpdate, ItemUpdate, SalesMetricData, SalesActionItem, Project, ProjectTask, ProjectMilestone, TaskMilestone } from './types';
import { INITIAL_ITEMS, BIG_ROCKS, getGoalStyle } from './constants';
import UnifiedTimeline from './components/UnifiedTimeline';
import AlignmentView from './components/AlignmentView';
import IndividualView from './components/IndividualView';
import MonthlyUpdatesView from './components/MonthlyUpdatesView';
import AIInsightsPanel from './components/AIInsightsPanel';
import SyncPanel from './components/SyncPanel';
import Modal from './components/Modal';
import GoalForm from './components/GoalForm';
import ItemForm from './components/ItemForm';
import UpdateForm from './components/UpdateForm';
import ItemUpdateForm from './components/ItemUpdateForm';
import ItemHistoryModal from './components/ItemHistoryModal';
import JiraSyncModal from './components/JiraSyncModal';
import LoginScreen from './components/LoginScreen';
import SalesDashboard from './components/SalesDashboard';
import UserProfileModal from './components/UserProfileModal';
import BulkCreateModal from './components/BulkCreateModal';
import NewProjectModal from './components/NewProjectModal';
import ProjectManagerView from './components/ProjectManagerView';
import { analyzeRoadmap } from './services/geminiService';
import { getAiEnabled } from './utils/aiPrefs';
import { sheetsService } from './services/googleSheetsService';
import { JiraConfig, fetchJiraIssues, mapJiraToRoadmap } from './services/jiraService';
import { authService } from './services/authService';

// Helper to get current month/year
const getCurrentPeriod = () => {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { month: months[now.getMonth()], year: now.getFullYear() };
};

// Load saved period from localStorage or use current
const loadSavedPeriod = () => {
  try {
    const saved = localStorage.getItem('omnimap_global_period');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.month && parsed.year) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return getCurrentPeriod();
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [items, setItems] = useState<RoadmapItem[]>(INITIAL_ITEMS);
  const [rocks, setRocks] = useState<StrategicGoal[]>(BIG_ROCKS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [updates, setUpdates] = useState<MonthlyUpdate[]>([]); 
  const [itemUpdates, setItemUpdates] = useState<ItemUpdate[]>([]);
  const [salesData, setSalesData] = useState<SalesMetricData[]>([]);
  const [salesActions, setSalesActions] = useState<SalesActionItem[]>([]); 
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>([]);
  const [taskMilestones, setTaskMilestones] = useState<TaskMilestone[]>([]);
  
  const [view, setView] = useState<'alignment' | 'individual' | 'updates' | 'timeline' | 'sales' | 'projectmanager'>('alignment');
  
  // Global period setting (master month/year filter)
  const [globalPeriod, setGlobalPeriod] = useState<{ month: string; year: number }>(loadSavedPeriod);
  
  // Save global period to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('omnimap_global_period', JSON.stringify(globalPeriod));
  }, [globalPeriod]);
  
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [_syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pushingItems, setPushingItems] = useState<Set<string>>(new Set());

  // Modal states
  const [activeModal, setActiveModal] = useState<'goal' | 'item' | 'update' | 'itemUpdate' | 'jira' | 'history' | null>(null);
  const [editingGoal, setEditingGoal] = useState<StrategicGoal | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<RoadmapItem | undefined>(undefined);
  const [targetGoal, setTargetGoal] = useState<StrategicGoal | undefined>(undefined);
  const [targetUpdate, setTargetUpdate] = useState<MonthlyUpdate | undefined>(undefined);
  const [targetItemForUpdate, setTargetItemForUpdate] = useState<RoadmapItem | undefined>(undefined);
  const [editingItemUpdate, setEditingItemUpdate] = useState<ItemUpdate | undefined>(undefined);
  const [historyItem, setHistoryItem] = useState<RoadmapItem | undefined>(undefined);
  
  // New Modal States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  
  // DEBUG: Sync Result State
  const [syncResults, setSyncResults] = useState<{title: string, success: boolean, message: string}[] | null>(null);

  // --- HIERARCHY & PERMISSION LOGIC ---

  const getReportingSubtreeIds = useCallback((managerIdOrName: string, allEmployees: Employee[]): string[] => {
    const directReports = allEmployees.filter(e => 
      e.reportsTo && (e.reportsTo.toLowerCase() === managerIdOrName.toLowerCase())
    );
    
    let subtree: string[] = [];
    directReports.forEach(r => {
      subtree.push(r.name);
      subtree.push(r.id);
      subtree = [...subtree, ...getReportingSubtreeIds(r.name, allEmployees)];
    });
    
    return subtree;
  }, []);

  const allowedOwners = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.accessLevel === 'Admin') return []; 

    const accessible = [currentUser.id, currentUser.name];
    
    if (currentUser.accessLevel === 'Manager') {
      const reports = getReportingSubtreeIds(currentUser.name, employees);
      return [...accessible, ...reports];
    }

    return accessible;
  }, [currentUser, employees, getReportingSubtreeIds]);

  const rbacFilteredItems = useMemo(() => {
    if (!currentUser || currentUser.accessLevel === 'Admin') return items;
    // Fuzzy matching: If allowed owner is "Federico Rossi", they should see items for "Federico"
    return items.filter((i: RoadmapItem) => {
       const owner = i.owner.toLowerCase().trim();
       return allowedOwners.some((allowed: string) => {
          const a = allowed.toLowerCase().trim();
          return a === owner || a.includes(owner) || owner.includes(a);
       });
    });
  }, [items, allowedOwners, currentUser]);

  const rbacFilteredEmployees = useMemo(() => {
    if (!currentUser || currentUser.accessLevel === 'Admin') return employees;
    return employees.filter((e: Employee) =>
        allowedOwners.some((allowed: string) => {
            const a = allowed.toLowerCase().trim();
            const name = e.name.toLowerCase().trim();
            return a === e.id || a === name || a.includes(name) || name.includes(a);
        })
    );
  }, [employees, allowedOwners, currentUser]);

  const salesViewEmployees = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.accessLevel === 'Admin') return employees;
    
    if (currentUser.salesPerformanceAccess && currentUser.salesPerformanceAccess.length > 0) {
      if (currentUser.salesPerformanceAccess.some((a: string) => a.toLowerCase() === 'all')) {
         return employees.filter((e: Employee) => e.department.toLowerCase().includes('sales'));
      }
      return employees.filter((e: Employee) => {
         if (!e.team) return false;
         return currentUser.salesPerformanceAccess?.some((region: string) =>
           e.team?.toLowerCase().includes(region.toLowerCase())
         );
      });
    }

    if (currentUser.accessLevel === 'Manager' && currentUser.department.toLowerCase().includes('sales')) {
       return employees;
    }

    return rbacFilteredEmployees;
  }, [currentUser, employees, rbacFilteredEmployees]);

  const canViewSalesDashboard = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.accessLevel === 'Admin') return true;
    if (currentUser.salesPerformanceAccess && currentUser.salesPerformanceAccess.length > 0) return true;
    return currentUser.department.toLowerCase().includes('sales');
  }, [currentUser]);

  // --- END PERMISSION LOGIC ---

  const uniqueDepts = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e: Employee) => depts.add(e.department));
    if (depts.size === 0) ['Product', 'Marketing', 'Operations', 'Sales', 'Tech'].forEach(d => depts.add(d));
    return Array.from(depts).sort();
  }, [employees]);

  const handleSync = useCallback(async () => {
    if (!sheetsService.getScriptUrl()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const data = await sheetsService.fetchData();
      if (data) {
        if (data.items && Array.isArray(data.items)) setItems(data.items);
        
        if (data.updates) {
           const normalizedUpdates = data.updates.map((u: MonthlyUpdate) => ({
              ...u,
              id: String(u.id),
              goalId: String(u.goalId),
              authorId: String(u.authorId)
           }));
           setUpdates(normalizedUpdates);
        }

        if (data.itemUpdates) setItemUpdates(data.itemUpdates);
        if (data.salesData) {
          console.log('[SalesData] Received', data.salesData.length, 'records');
          console.log('[SalesData] Sample:', data.salesData.slice(0, 5));
          setSalesData(data.salesData);
        }
        if (data.salesActions) setSalesActions(data.salesActions);
        
        // Debug: Log sales sheet structure
        if (data._salesDebug) {
          console.log('[SalesDebug] Sheet structure:', data._salesDebug);
        }
        
        if (data.rocks && data.rocks.length > 0) {
          const stylizedRocks = data.rocks.map((rock, index) => {
            const style = getGoalStyle(index, rock.title);
            return { 
                ...rock, 
                id: String(rock.id), 
                color: style.color, 
                icon: style.icon 
            };
          });
          setRocks(stylizedRocks);
        } else if (data.items && data.items.length > 0) {
           const distinctGoalIds = Array.from(new Set(data.items.map((i: RoadmapItem) => i.goalId)));
           const tempRocks = distinctGoalIds.map((gid, idx) => ({
             id: String(gid),
             title: `Goal ${gid}`,
             description: 'Imported from Roadmap Items',
             ...getGoalStyle(idx, 'Generic')
           }));
           setRocks(tempRocks);
        }

        if (data.employees) {
          // Debug: Log employees with emails to verify they're being loaded
          const employeesWithEmails = data.employees.filter(e => e.email);
          console.log('[App] Loaded', data.employees.length, 'employees');
          console.log('[App] Employees with emails:', employeesWithEmails.length);
          if (employeesWithEmails.length > 0) {
            console.log('[App] Sample employees with emails:', employeesWithEmails.slice(0, 5).map(e => ({ name: e.name, email: e.email, id: e.id })));
          }
          setEmployees(data.employees);
        }
        if (data.projects && Array.isArray(data.projects)) setProjects(data.projects);
        if (data.projectTasks && Array.isArray(data.projectTasks)) setProjectTasks(data.projectTasks);
        if (data.projectMilestones && Array.isArray(data.projectMilestones)) setProjectMilestones(data.projectMilestones);
        if (data.taskMilestones && Array.isArray(data.taskMilestones)) setTaskMilestones(data.taskMilestones);
        setLastSync(new Date());
      }
    } catch (err: any) {
      console.error("Sync Error", err);
      setSyncError(err.message || "Failed to fetch from Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleJiraSync = async (config: JiraConfig) => {
    setIsSyncing(true);
    setActiveModal(null);
    try {
      const jiraIssues = await fetchJiraIssues(config);
      const mappedItems = await mapJiraToRoadmap(jiraIssues, rocks);
      setItems((prev: RoadmapItem[]) => {
        const nonJira = prev.filter((i: RoadmapItem) => !i.jiraId);
        return [...nonJira, ...mappedItems];
      });
      setLastSync(new Date());
    } catch (err: unknown) {
      alert(`Jira Sync Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushSingleGoal = async (item: RoadmapItem) => {
    const savedConfig = localStorage.getItem('omnimap_hibob_config');
    if (!savedConfig) {
      alert("Please configure HiBob settings in the sync menu first.");
      return;
    }
    
    // Get existing updates for this goal
    const existingUpdates = itemUpdates.filter(u => u.itemId === item.id);
    const updateCount = existingUpdates.length;
    
    // Optimistic alert with update info
    const confirmMsg = updateCount > 0 
      ? `Push '${item.title}' to HiBob?\n\nThis will also sync ${updateCount} monthly update${updateCount > 1 ? 's' : ''} as check-ins.`
      : `Push '${item.title}' to HiBob now?`;
    const confirm = window.confirm(confirmMsg);
    if (!confirm) return;

    // Track loading state per item
    setPushingItems(prev => new Set(prev).add(item.id));

    try {
        const config = JSON.parse(savedConfig);
        // Uses the new GET method which returns explicit JSON response
        const result = await sheetsService.pushSingleGoalToHiBob(item, config);
        
        if (result.success) {
            let successMsg = `✅ Goal pushed successfully!`;
            
            // Save HiBob goal ID if returned
            if (result.hibobGoalId) {
                const updatedItem = { ...item, hibobGoalId: result.hibobGoalId };
                console.log('[HiBob] Saving hibobGoalId:', result.hibobGoalId, 'for item:', item.id);
                setItems((prev: RoadmapItem[]) => prev.map((i: RoadmapItem) => i.id === item.id ? updatedItem : i));
                // Also save to sheet
                sheetsService.upsertItem(updatedItem).catch(err => console.error('[HiBob] Failed to save hibobGoalId:', err));
                
                // Push existing check-ins for this goal
                if (existingUpdates.length > 0) {
                    console.log(`[HiBob] Pushing ${existingUpdates.length} existing check-ins for: ${item.title}`);
                    let checkInsPushed = 0;
                    let checkInsFailed = 0;
                    
                    for (const update of existingUpdates) {
                        try {
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const monthIndex = months.indexOf(update.month || 'Jan');
                            const checkInDate = `${update.year || new Date().getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                            
                            const checkInResult = await sheetsService.pushCheckInToHiBob(
                                result.hibobGoalId,
                                config,
                                checkInDate,
                                update.content || '',
                                (String(update.health ?? 'green').toUpperCase() as 'GREEN' | 'AMBER' | 'RED')
                            );
                            
                            if (checkInResult.success || checkInResult.fallbackUsed) {
                                checkInsPushed++;
                                console.log(`[HiBob] Check-in pushed: ${update.month} ${update.year}`);
                            } else {
                                checkInsFailed++;
                                console.error(`[HiBob] Check-in failed: ${update.month} ${update.year}`, checkInResult.message);
                            }
                            
                            // Small delay between check-ins
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } catch (err) {
                            checkInsFailed++;
                            console.error(`[HiBob] Check-in exception for ${update.month} ${update.year}:`, err);
                        }
                    }
                    
                    if (checkInsPushed > 0) {
                        successMsg += `\n\n📊 ${checkInsPushed} check-in${checkInsPushed > 1 ? 's' : ''} synced to HiBob.`;
                    }
                    if (checkInsFailed > 0) {
                        successMsg += `\n⚠️ ${checkInsFailed} check-in${checkInsFailed > 1 ? 's' : ''} failed (check console).`;
                    }
                }
            }
            
            alert(successMsg);
        } else {
            alert(`❌ Failed: ${result.message}`);
        }
    } catch (e: unknown) {
      alert("Error pushing goal: " + (e instanceof Error ? e.message : String(e)));
    } finally {
        setPushingItems(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
        });
    }
  };

  const fetchInsights = useCallback(async () => {
    if (rbacFilteredItems.length === 0) return;
    setLoadingInsights(true);
    try {
      if (!getAiEnabled()) {
        setInsights([{ type: 'summary', message: 'AI insights are disabled. Enable AI features on the login page to use.', impactLevel: 'low' }]);
        return;
      }
      const result = await analyzeRoadmap(rbacFilteredItems, rocks, updates, itemUpdates);
      setInsights(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  }, [rbacFilteredItems, rocks, updates, itemUpdates]);

  // Restore authentication session on mount
  useEffect(() => {
    const restoreSession = () => {
      if (authService.hasActiveSession()) {
        const googleUser = authService.getStoredUser();
        if (googleUser && employees.length > 0) {
          const employee = authService.matchEmployeeByEmail(googleUser, employees);
          if (employee) {
            setCurrentUser(employee);
          }
        }
      }
    };

    // Wait for employees to load before trying to restore session
    if (employees.length > 0) {
      restoreSession();
    }
  }, [employees]);

  // Listen for sign-out events
  useEffect(() => {
    const handleSignOut = () => {
      setCurrentUser(null);
    };

    window.addEventListener('google-signout', handleSignOut);
    return () => {
      window.removeEventListener('google-signout', handleSignOut);
    };
  }, []);

  useEffect(() => { 
    if (sheetsService.getScriptUrl()) {
      handleSync();
    }
  }, [handleSync]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const saveItem = async (item: Partial<RoadmapItem>) => {
    const newItem = { ...item, id: item.id || `item-${Math.random().toString(36).substr(2, 5)}` };
    setItems((prev: RoadmapItem[]) => {
      const exists = prev.find((i: RoadmapItem) => i.id === newItem.id);
      if (exists) return prev.map((i: RoadmapItem) => i.id === newItem.id ? { ...i, ...newItem } : i);
      return [...prev, newItem as RoadmapItem];
    });
    setActiveModal(null);
    sheetsService.upsertItem(newItem).catch(err => console.error("Bg Sync failed", err));
  };

  // Reusable push logic with detailed error capture
  const executePushSequence = async (itemsToPush: RoadmapItem[]) => {
      const savedConfig = localStorage.getItem('omnimap_hibob_config');
      if (!savedConfig) {
          alert("HiBob config missing. Please configure HiBob credentials in the Bulk Creator modal first.");
          return;
      }
      
      let config;
      try {
        config = JSON.parse(savedConfig);
      } catch (e) {
        alert("Invalid HiBob config format. Please reconfigure in the Bulk Creator modal.");
        return;
      }

      if (!config.serviceId || !config.token) {
        alert("HiBob credentials incomplete. Please enter Service ID and Token in the Bulk Creator modal.");
        return;
      }

      if (itemsToPush.length === 0) {
        alert("No items selected to push.");
        return;
      }

      const results: {title: string, success: boolean, message: string}[] = [];

      // Initial Feedback
      console.log(`[HiBob Push] Starting push sequence for ${itemsToPush.length} goals`);
      console.log(`[HiBob Push] Config serviceId: ${config.serviceId.substring(0, 4)}...`);

      // Show loading state
      setPushingItems(new Set(itemsToPush.map(i => i.id)));

      try {
        for (let i = 0; i < itemsToPush.length; i++) {
          const item = itemsToPush[i];
          console.log(`[HiBob Push] Processing ${i + 1}/${itemsToPush.length}: ${item.title}`);
          
          // Validate item has required fields
          if (!item.title || !item.owner) {
            results.push({ 
              title: item.title || 'Untitled', 
              success: false, 
              message: `Missing required fields: ${!item.title ? 'title' : ''} ${!item.owner ? 'owner' : ''}`.trim()
            });
            continue;
          }

          // Try to find owner's email from employees if available
          // Note: Employee type doesn't include email, but we can try to find it
          // The backend will also try to extract it from the sheet
          let ownerEmail: string | undefined;
          employees.find((e: Employee) =>
            e.name === item.owner ||
            e.id === item.owner ||
            e.name.toLowerCase().includes(item.owner.toLowerCase()) ||
            item.owner.toLowerCase().includes(e.name.toLowerCase())
          );
          // If we had email in Employee type, we'd use it here
          // For now, backend will extract it from the sheet
          
          try {
              const res = await sheetsService.pushSingleGoalToHiBob(item, config, ownerEmail);
              console.log(`[HiBob Push] Result for ${item.title}:`, res);
              
              // Store HiBob goal ID if returned
              if (res.success && res.hibobGoalId) {
                  const updatedItem = { ...item, hibobGoalId: res.hibobGoalId };
                  console.log('[HiBob] Saving hibobGoalId to sheet:', res.hibobGoalId, 'for item:', item.id);
                  setItems((prev: RoadmapItem[]) => prev.map((i: RoadmapItem) => i.id === item.id ? updatedItem : i));
                  // Also save to sheet
                  sheetsService.upsertItem(updatedItem)
                    .then(success => console.log('[HiBob] Sheet upsert result:', success ? '✅ SUCCESS' : '❌ FAILED'))
                    .catch(err => console.error('[HiBob] Failed to save hibobGoalId:', err));
                  
                  // Push existing check-ins for this goal
                  const existingUpdates = itemUpdates.filter(u => u.itemId === item.id);
                  if (existingUpdates.length > 0) {
                      console.log(`[HiBob] Pushing ${existingUpdates.length} existing check-ins for goal: ${item.title}`);
                      for (const update of existingUpdates) {
                          try {
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const monthIndex = months.indexOf(update.month || 'Jan');
                              const checkInDate = `${update.year || new Date().getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                              
                              try {
                                  const checkInResult = await sheetsService.pushCheckInToHiBob(
                                      res.hibobGoalId,
                                      config,
                                      checkInDate,
                                      update.content || '',
                                      (String(update.health ?? 'green').toUpperCase() as 'GREEN' | 'AMBER' | 'RED')
                                  );
                                  if (checkInResult.fallbackUsed) {
                                      console.log(`[HiBob] Check-in failed for "${item.title}", but goal update succeeded (appears as OmniMap activity)`);
                                  } else if (checkInResult.success) {
                                      console.log(`[HiBob] Check-in pushed successfully for "${item.title}"`);
                                  } else {
                                      console.error(`[HiBob] Failed to push check-in for "${item.title}":`, checkInResult.message);
                                  }
                              } catch (checkInErr) {
                                  console.error(`[HiBob] Exception pushing check-in for "${item.title}":`, checkInErr);
                              }
                              // Small delay between check-ins
                              await new Promise(resolve => setTimeout(resolve, 300));
                          } catch (err) {
                              console.error(`[HiBob] Failed to push check-in for ${update.month} ${update.year}:`, err);
                          }
                      }
                  }
              }
              
              results.push({ 
                  title: item.title, 
                  success: res.success, 
                  message: res.message || (res.success ? 'Success' : 'Unknown error')
              });
          } catch (e: unknown) {
              console.error(`[HiBob Push] Exception for ${item.title}:`, e);
              results.push({
                  title: item.title,
                  success: false,
                  message: e instanceof Error ? e.message : 'Unknown network error'
              });
          }

          // Small delay to avoid rate limiting
          if (i < itemsToPush.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } finally {
        setPushingItems(new Set());
      }

      console.log(`[HiBob Push] Completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
      
      // Log all failures with full details
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.error('[HiBob Push] FAILURES:', failures);
        failures.forEach(f => {
          console.error(`[HiBob Push] Failed: "${f.title}" - ${f.message}`);
        });
      }
      
      setSyncResults(results);
  };

  const handleBulkSave = async (newItems: RoadmapItem[], syncToHiBob: boolean) => {
    setItems((prev: RoadmapItem[]) => [...prev, ...newItems]);
    setIsBulkOpen(false); 
    sheetsService.upsertItems(newItems).catch(err => console.error("Batch Sync failed", err));

    if (syncToHiBob) {
        executePushSequence(newItems);
    }
  };

  const handleNewProjectSave = async (project: Project, tasks: ProjectTask[]) => {
    setProjects((prev: Project[]) => [...prev, project]);
    setProjectTasks((prev: ProjectTask[]) => [...prev, ...tasks]);
    setIsNewProjectOpen(false);
    sheetsService.upsertProject(project).catch(err => console.error("Project sync failed", err));
    sheetsService.upsertProjectTasks(tasks).catch(err => console.error("Project tasks sync failed", err));
  };

  const handleUpdateProject = async (project: Partial<Project> & { id: string }) => {
    setProjects((prev: Project[]) => prev.map((p: Project) => p.id === project.id ? { ...p, ...project } : p));
    await sheetsService.upsertProject(project).catch(err => console.error("Project update sync failed", err));
  };

  const handleDeleteProject = async (projectId: string) => {
    const taskIds = projectTasks.filter((t: ProjectTask) => t.projectId === projectId).map((t: ProjectTask) => t.id);
    const projectMilestoneIds = projectMilestones.filter(m => m.projectId === projectId).map(m => m.id);
    const taskMilestoneIds = taskMilestones.filter(m => taskIds.includes(m.taskId)).map(m => m.id);
    for (const id of taskMilestoneIds) await sheetsService.deleteTaskMilestone(id).catch(() => {});
    for (const id of taskIds) await sheetsService.deleteProjectTask(id).catch(() => {});
    for (const id of projectMilestoneIds) await sheetsService.deleteProjectMilestone(id).catch(() => {});
    await sheetsService.deleteProject(projectId).catch(err => console.error("Project delete sync failed", err));
    setTaskMilestones((prev: TaskMilestone[]) => prev.filter((m: TaskMilestone) => !taskIds.includes(m.taskId)));
    setProjectTasks((prev: ProjectTask[]) => prev.filter((t: ProjectTask) => t.projectId !== projectId));
    setProjectMilestones((prev: ProjectMilestone[]) => prev.filter((m: ProjectMilestone) => m.projectId !== projectId));
    setProjects((prev: Project[]) => prev.filter((p: Project) => p.id !== projectId));
  };

  const handleUpdateProjectTask = async (task: Partial<ProjectTask> & { id: string }) => {
    setProjectTasks((prev: ProjectTask[]) => prev.map((t: ProjectTask) => t.id === task.id ? { ...t, ...task } : t));
    await sheetsService.upsertProjectTasks([task]).catch(err => console.error("Task update sync failed", err));
  };

  const handleAddProjectTask = async (projectId: string, task: Omit<ProjectTask, 'id' | 'projectId' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const existingOrders = projectTasks.filter(t => t.projectId === projectId).map(t => t.order ?? 0);
    const nextOrder = existingOrders.length ? Math.max(...existingOrders) + 1 : 0;
    const newTask: ProjectTask = {
      ...task,
      id: `pt-${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      createdAt: now,
      startDate: task.startDate || now.split('T')[0],
      endDate: task.endDate || '2026-12-31',
      order: nextOrder,
    };
    setProjectTasks((prev: ProjectTask[]) => [...prev, newTask]);
    await sheetsService.upsertProjectTasks([newTask]).catch(err => console.error("Task add sync failed", err));
  };

  const handleDeleteProjectTask = async (taskId: string) => {
    const tmIds = taskMilestones.filter((m: TaskMilestone) => m.taskId === taskId).map((m: TaskMilestone) => m.id);
    for (const id of tmIds) await sheetsService.deleteTaskMilestone(id).catch(() => {});
    setTaskMilestones((prev: TaskMilestone[]) => prev.filter((m: TaskMilestone) => m.taskId !== taskId));
    setProjectTasks((prev: ProjectTask[]) => prev.filter((t: ProjectTask) => t.id !== taskId));
    await sheetsService.deleteProjectTask(taskId).catch(err => console.error("Task delete sync failed", err));
  };

  const handleAddProjectMilestone = async (projectId: string, milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'completed'>) => {
    const newMilestone: ProjectMilestone = {
      ...milestone,
      id: `pm-${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      completed: false,
    };
    setProjectMilestones((prev: ProjectMilestone[]) => [...prev, newMilestone]);
    await sheetsService.upsertProjectMilestone(newMilestone).catch(err => console.error("Milestone add sync failed", err));
  };

  const handleUpdateProjectMilestone = async (milestone: Partial<ProjectMilestone> & { id: string }) => {
    setProjectMilestones((prev: ProjectMilestone[]) => prev.map((m: ProjectMilestone) => m.id === milestone.id ? { ...m, ...milestone } : m));
    await sheetsService.upsertProjectMilestone(milestone).catch(err => console.error("Milestone update sync failed", err));
  };

  const handleToggleProjectMilestone = async (id: string, completed: boolean) => {
    const m = projectMilestones.find((x: ProjectMilestone) => x.id === id);
    if (!m) return;
    const updated = { ...m, completed, completedAt: completed ? new Date().toISOString() : undefined };
    setProjectMilestones((prev: ProjectMilestone[]) => prev.map((x: ProjectMilestone) => x.id === id ? updated : x));
    await sheetsService.upsertProjectMilestone(updated).catch(err => console.error("Milestone toggle sync failed", err));
  };

  const handleDeleteProjectMilestone = async (milestoneId: string) => {
    setProjectMilestones((prev: ProjectMilestone[]) => prev.filter((m: ProjectMilestone) => m.id !== milestoneId));
    await sheetsService.deleteProjectMilestone(milestoneId).catch(err => console.error("Milestone delete sync failed", err));
  };

  const handleAddTaskMilestone = async (taskId: string, milestone: Omit<TaskMilestone, 'id' | 'taskId' | 'completed'>) => {
    const newMilestone: TaskMilestone = {
      ...milestone,
      id: `tm-${Math.random().toString(36).substr(2, 6)}`,
      taskId,
      completed: false,
    };
    setTaskMilestones((prev: TaskMilestone[]) => [...prev, newMilestone]);
    await sheetsService.upsertTaskMilestone(newMilestone).catch(err => console.error("Task milestone add sync failed", err));
  };

  const handleUpdateTaskMilestone = async (milestone: Partial<TaskMilestone> & { id: string }) => {
    setTaskMilestones((prev: TaskMilestone[]) => prev.map((m: TaskMilestone) => m.id === milestone.id ? { ...m, ...milestone } : m));
    await sheetsService.upsertTaskMilestone(milestone).catch(err => console.error("Task milestone update sync failed", err));
  };

  const handleToggleTaskMilestone = async (id: string, completed: boolean) => {
    const m = taskMilestones.find((x: TaskMilestone) => x.id === id);
    if (!m) return;
    const updated = { ...m, completed, completedAt: completed ? new Date().toISOString() : undefined };
    setTaskMilestones((prev: TaskMilestone[]) => prev.map((x: TaskMilestone) => x.id === id ? updated : x));
    await sheetsService.upsertTaskMilestone(updated).catch(err => console.error("Task milestone toggle sync failed", err));
  };

  const handleDeleteTaskMilestone = async (milestoneId: string) => {
    setTaskMilestones((prev: TaskMilestone[]) => prev.filter((m: TaskMilestone) => m.id !== milestoneId));
    await sheetsService.deleteTaskMilestone(milestoneId).catch(err => console.error("Task milestone delete sync failed", err));
  };

  const handleBulkPush = async (existingItems: RoadmapItem[]) => {
      setIsBulkOpen(false);
      executePushSequence(existingItems);
  };

  const handleAddSalesAction = async (action: Partial<SalesActionItem>) => {
    const newAction = { ...action, id: `action-${Math.random().toString(36).substr(2, 5)}` } as SalesActionItem;
    setSalesActions((prev: SalesActionItem[]) => [...prev, newAction]);
    sheetsService.upsertSalesAction(newAction).catch(err => console.error("Bg Sync failed", err));
  };

  const handleToggleSalesAction = async (id: string, isCompleted: boolean) => {
    setSalesActions((prev: SalesActionItem[]) => prev.map((a: SalesActionItem) => a.id === id ? { ...a, isCompleted } : a));
    sheetsService.toggleSalesAction(id, isCompleted).catch(err => console.error("Bg Sync failed", err));
  };

  const handleEditItem = (i: RoadmapItem) => {
    setEditingItem(i);
    setActiveModal('item');
  };

  const handleAddItemUpdate = (item: RoadmapItem) => {
    // Always use the latest version from items state to get hibobGoalId
    const latestItem = items.find(i => i.id === item.id) || item;
    setTargetItemForUpdate(latestItem);
    setEditingItemUpdate(undefined); 
    setActiveModal('itemUpdate');
  };

  const handleEditHistoryUpdate = (update: ItemUpdate) => {
    if (historyItem) {
      // Always use the latest version from items state to get hibobGoalId
      const latestItem = items.find(i => i.id === historyItem.id) || historyItem;
      setTargetItemForUpdate(latestItem);
      setEditingItemUpdate(update);
      setActiveModal('itemUpdate');
    }
  };

  const handleViewHistory = (item: RoadmapItem) => {
    setHistoryItem(item);
    setActiveModal('history');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="absolute top-4 right-4 z-50">
           <SyncPanel 
             onSync={handleSync} 
             onJiraSync={() => setActiveModal('jira')} 
             isSyncing={isSyncing} 
             lastSync={lastSync}
             globalPeriod={globalPeriod}
             onPeriodChange={setGlobalPeriod}
           />
        </div>
        <LoginScreen 
          employees={employees} 
          onLogin={setCurrentUser}
          onAuthError={(error: string) => {
            console.error('Authentication error:', error);
            setSyncError(error);
          }}
        />
        <Modal isOpen={activeModal === 'jira'} onClose={() => setActiveModal(null)} title="Connect to Jira Backlog">
          <JiraSyncModal onSync={handleJiraSync} isSyncing={isSyncing} onCancel={() => setActiveModal(null)} />
        </Modal>
      </div>
    );
  }

  const tabs = [
    { id: 'alignment', label: 'Big Rocks' },
    { id: 'individual', label: currentUser.accessLevel === 'IC' ? 'My Goals' : 'Goals & Team' },
    { id: 'updates', label: 'Updates' },
    { id: 'timeline', label: 'Gantt' },
  ];
  
  if (canViewSalesDashboard) {
    tabs.push({ id: 'sales', label: 'Sales Perf' });
  }

  if (currentUser.accessLevel === 'Admin') {
    tabs.push({ id: 'projectmanager', label: 'Project Manager' });
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">
                OmniMap
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser.accessLevel === 'IC' ? 'Personal Dashboard' : currentUser.accessLevel === 'Manager' ? 'Team Overview' : 'Admin Console'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex bg-slate-100 p-1 rounded-lg">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                onClick={() => setView(tab.id as 'alignment' | 'individual' | 'updates' | 'timeline' | 'sales' | 'projectmanager')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${view === tab.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {currentUser.accessLevel === 'Admin' && (
              <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setIsBulkOpen(true)} 
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors"
                 >
                    Bulk Creator
                 </button>
                 <SyncPanel 
                   onSync={handleSync} 
                   onJiraSync={() => setActiveModal('jira')} 
                   isSyncing={isSyncing} 
                   lastSync={lastSync}
                   globalPeriod={globalPeriod}
                   onPeriodChange={setGlobalPeriod}
                 />
              </div>
            )}
            
            <div className="h-8 w-px bg-slate-200 hidden md:block" />
            
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 hover:bg-slate-100 transition-colors rounded-lg py-1.5 px-2"
            >
               <div className="text-right hidden md:block">
                 <div className="text-sm font-semibold text-slate-900 leading-none">{currentUser.name}</div>
                 <span className="text-xs text-slate-500">Profile</span>
               </div>
               <img src={currentUser.avatarUrl} className="w-9 h-9 rounded-full border border-slate-300 object-cover" alt="Profile" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        {view !== 'sales' && view !== 'projectmanager' && <AIInsightsPanel insights={insights} loading={loadingInsights} onRefresh={fetchInsights} />}

        <div className="pb-20">
          {view === 'alignment' ? (
            <AlignmentView 
              currentUser={currentUser}
              goals={rocks} items={rbacFilteredItems} employees={employees} updates={updates}
              onEditGoal={currentUser.accessLevel === 'Admin' ? (g) => { setEditingGoal(g); setActiveModal('goal'); } : undefined}
              onAddGoal={currentUser.accessLevel === 'Admin' ? () => { setEditingGoal(undefined); setActiveModal('goal'); } : undefined}
              onEditItem={handleEditItem}
              onAddUpdate={(g) => { setTargetGoal(g); setTargetUpdate(undefined); setActiveModal('update'); }}
              onEditUpdate={(u) => { setTargetUpdate(u); setTargetGoal(rocks.find(r => r.id === u.goalId)); setActiveModal('update'); }}
              onViewHistory={handleViewHistory}
              onPushToHiBob={handlePushSingleGoal}
              pushingItems={pushingItems}
            />
          ) : view === 'individual' ? (
            <IndividualView 
              currentUser={currentUser} 
              items={rbacFilteredItems} 
              goals={rocks} 
              employees={rbacFilteredEmployees} 
              onEditItem={handleEditItem}
              onAddItem={() => { setEditingItem(undefined); setActiveModal('item'); }}
              onViewHistory={handleViewHistory}
              onPushToHiBob={handlePushSingleGoal}
              pushingItems={pushingItems}
            />
          ) : view === 'updates' ? (
            <MonthlyUpdatesView 
              items={rbacFilteredItems} 
              updates={itemUpdates} 
              employees={rbacFilteredEmployees}
              goals={rocks}
              currentUser={currentUser}
              onAddUpdate={handleAddItemUpdate} 
              onViewHistory={handleViewHistory}
              initialMonth={globalPeriod.month}
              initialYear={globalPeriod.year}
            />
          ) : view === 'sales' && canViewSalesDashboard ? (
             <SalesDashboard 
                employees={salesViewEmployees} 
                salesData={salesData} 
                salesActions={salesActions} 
                currentUser={currentUser}
                onAddAction={handleAddSalesAction}
                onToggleAction={handleToggleSalesAction}
             />
          ) : view === 'sales' ? (
            <div className="text-center py-20 text-slate-500">
              Access Restricted
            </div>
          ) : view === 'projectmanager' && currentUser.accessLevel === 'Admin' ? (
            <ProjectManagerView
              currentUser={currentUser}
              projects={projects}
              projectTasks={projectTasks}
              projectMilestones={projectMilestones}
              taskMilestones={taskMilestones}
              employees={rbacFilteredEmployees}
              departments={uniqueDepts}
              onNewProjectClick={() => setIsNewProjectOpen(true)}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onUpdateTask={handleUpdateProjectTask}
              onAddTask={handleAddProjectTask}
              onDeleteTask={handleDeleteProjectTask}
              onAddProjectMilestone={handleAddProjectMilestone}
              onUpdateProjectMilestone={handleUpdateProjectMilestone}
              onToggleProjectMilestone={handleToggleProjectMilestone}
              onDeleteProjectMilestone={handleDeleteProjectMilestone}
              onAddTaskMilestone={handleAddTaskMilestone}
              onUpdateTaskMilestone={handleUpdateTaskMilestone}
              onToggleTaskMilestone={handleToggleTaskMilestone}
              onDeleteTaskMilestone={handleDeleteTaskMilestone}
            />
          ) : (
            <UnifiedTimeline items={rbacFilteredItems} onItemClick={handleViewHistory} />
          )}
        </div>
      </main>

      {/* MODALS */}
      
      {/* User Profile Modal */}
      {currentUser && (
        <UserProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          items={items}
          goals={rocks}
          onSaveItem={saveItem}
          onEditItem={handleEditItem}
          onSignOut={() => { 
            setIsProfileOpen(false); 
            authService.signOut();
            setCurrentUser(null); 
          }}
        />
      )}

      {/* New Project Modal (project manager) */}
      {currentUser && currentUser.accessLevel === 'Admin' && (
        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          goals={rocks}
          employees={employees}
          departments={uniqueDepts}
          onSave={handleNewProjectSave}
        />
      )}

      {/* Admin Bulk Creator Modal */}
      {currentUser && currentUser.accessLevel === 'Admin' && (
        <BulkCreateModal 
           isOpen={isBulkOpen}
           onClose={() => setIsBulkOpen(false)}
           employees={employees}
           goals={rocks}
           items={items} // Pass all items for existing sync
           onSave={handleBulkSave}
           onBulkPush={handleBulkPush} // Pass existing sync handler
        />
      )}

      {/* SYNC RESULTS MODAL (Debugger) */}
      <Modal isOpen={!!syncResults} onClose={() => setSyncResults(null)} title="HiBob Sync Report" maxWidth="max-w-4xl">
         <div className="space-y-4">
            <div className="flex gap-4">
               <div className="flex-1 bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-emerald-700 font-bold text-xs uppercase tracking-widest">Success</span>
                  <span className="text-xl font-black text-emerald-600">{syncResults?.filter(r => r.success).length}</span>
               </div>
               <div className="flex-1 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-rose-700 font-bold text-xs uppercase tracking-widest">Failed</span>
                  <span className="text-xl font-black text-rose-600">{syncResults?.filter(r => !r.success).length}</span>
               </div>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0">
                     <tr>
                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Goal Title</th>
                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Status</th>
                        <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-1/2">Details / Error Message</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                     {syncResults?.map((res, idx) => (
                        <tr key={idx} className={res.success ? 'bg-white' : 'bg-rose-50/30'}>
                           <td className="p-3 text-xs font-bold text-slate-700 truncate max-w-[200px]" title={res.title}>{res.title}</td>
                           <td className="p-3">
                              {res.success ? (
                                 <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Synced
                                 </span>
                              ) : (
                                 <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    Failed
                                 </span>
                              )}
                           </td>
                           <td className="p-3 text-xs font-mono text-slate-500 break-all">{res.message}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            
            <div className="flex justify-end pt-2">
               <button onClick={() => setSyncResults(null)} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">Close Report</button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={activeModal === 'jira'} onClose={() => setActiveModal(null)} title="Connect to Jira Backlog">
        <JiraSyncModal onSync={handleJiraSync} isSyncing={isSyncing} onCancel={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal === 'goal'} onClose={() => setActiveModal(null)} title={editingGoal ? "Edit Big Rock" : "New Big Rock"}>
        <GoalForm goal={editingGoal} onSave={async (g) => { 
          const id = g.id || `goal-${Math.random().toString(36).substr(2, 5)}`;
          setRocks((prev: StrategicGoal[]) => editingGoal ? prev.map((old: StrategicGoal) => old.id === id ? {...old, ...g} : old) : [...prev, { ...g, id } as StrategicGoal]);
          setActiveModal(null);
          sheetsService.upsertGoal({...g, id}).catch(err => console.error(err));
        }} onCancel={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal === 'item'} onClose={() => setActiveModal(null)} title={editingItem ? "Edit Goal" : "New Goal"}>
        <ItemForm item={editingItem} goals={rocks} employees={employees} departments={uniqueDepts} onSave={saveItem} onCancel={() => setActiveModal(null)} />
      </Modal>

      <Modal isOpen={activeModal === 'update'} onClose={() => setActiveModal(null)} title={targetGoal ? `Update: ${targetGoal.title}` : "Strategy Update"}>
        {targetGoal && <UpdateForm 
          goal={targetGoal} 
          existingUpdate={targetUpdate}
          onSave={async (u) => {
            const isEdit = !!targetUpdate;
            const newUpdate = { 
              ...u, 
              id: isEdit ? u.id! : `upd-${Math.random().toString(36).substr(2, 5)}`, 
              createdAt: isEdit ? u.createdAt! : new Date().toISOString(),
              authorId: isEdit ? u.authorId! : currentUser.id 
            };
            
            setUpdates((prev: MonthlyUpdate[]) => {
               if (isEdit) return prev.map((old: MonthlyUpdate) => old.id === newUpdate.id ? { ...old, ...newUpdate } as MonthlyUpdate : old);
               return [...prev, newUpdate as MonthlyUpdate];
            });
            setActiveModal(null);
            sheetsService.upsertUpdate(newUpdate).catch(err => console.error(err));
        }} onCancel={() => setActiveModal(null)} />}
      </Modal>

      <Modal isOpen={activeModal === 'itemUpdate'} onClose={() => setActiveModal(null)} title={editingItemUpdate ? "Edit Progress Update" : "Log Progress Update"}>
        {targetItemForUpdate && (
          <ItemUpdateForm 
            item={targetItemForUpdate} 
            existingUpdate={editingItemUpdate}
            onSave={async (u) => {
               const newUpdate = { ...u, id: u.id || `i-upd-${Math.random().toString(36).substr(2, 5)}`, updatedAt: new Date().toISOString() };
               setItemUpdates((prev: ItemUpdate[]) => {
                 const others = prev.filter((pu: ItemUpdate) => pu.id !== newUpdate.id);
                 return [...others, newUpdate as ItemUpdate];
               });
               setActiveModal(null);
               sheetsService.upsertItemUpdate(newUpdate).catch(err => console.error(err));
               
               // Push check-in to HiBob if goal has hibobGoalId
               console.log('[HiBob Debug] Item for update:', targetItemForUpdate.title, 'HiBob Goal ID:', targetItemForUpdate.hibobGoalId || 'NOT SET');
               if (targetItemForUpdate.hibobGoalId) {
                   const savedConfig = localStorage.getItem('omnimap_hibob_config');
                   if (savedConfig) {
                       try {
                           const config = JSON.parse(savedConfig);
                           if (config.serviceId && config.token) {
                               // Convert month name to date (first day of month)
                               const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                               const monthIndex = months.indexOf(newUpdate.month || 'Jan');
                               const checkInDate = `${newUpdate.year || new Date().getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-01`;
                               
                               const checkInResult = await sheetsService.pushCheckInToHiBob(
                                   targetItemForUpdate.hibobGoalId,
                                   config,
                                   checkInDate,
                                   newUpdate.content || '',
                                   (String(newUpdate.health ?? 'green').toUpperCase() as 'GREEN' | 'AMBER' | 'RED')
                               );
                               if (checkInResult.fallbackUsed) {
                                   console.log('[HiBob] Check-in failed, but goal update succeeded (appears as OmniMap activity)');
                               } else if (checkInResult.success) {
                                   console.log('[HiBob] Check-in pushed successfully');
                               } else {
                                   console.error('[HiBob] Failed to push check-in:', checkInResult.message);
                               }
                           }
                       } catch (err) {
                           console.error('[HiBob] Failed to push check-in:', err);
                       }
                   }
               } else {
                   console.warn('[HiBob] No HiBob Goal ID found for this item. Push it to HiBob first.');
               }
            }}
            onCancel={() => setActiveModal(null)}
          />
        )}
      </Modal>

      {historyItem && (
        <ItemHistoryModal 
          item={items.find(i => i.id === historyItem.id) || historyItem} 
          updates={itemUpdates.filter(u => u.itemId === historyItem.id)} 
          isOpen={activeModal === 'history'} 
          onClose={() => setActiveModal(null)} 
          onAddUpdate={(item) => {
            // Always use the latest version from items state to get hibobGoalId
            const latestItem = items.find(i => i.id === item.id) || item;
            handleAddItemUpdate(latestItem);
          }}
          onEdit={handleEditItem}
          onEditUpdate={handleEditHistoryUpdate}
        />
      )}
    </div>
  );
};

export default App;
