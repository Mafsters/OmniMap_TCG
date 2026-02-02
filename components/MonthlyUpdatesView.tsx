
import React, { useState, useMemo } from 'react';
import { RoadmapItem, ItemUpdate, Employee, HealthStatus, StrategicGoal } from '../types';
import { HEALTH_STYLES } from '../constants';

interface MonthlyUpdatesViewProps {
  items: RoadmapItem[];
  updates: ItemUpdate[];
  employees: Employee[];
  goals: StrategicGoal[];
  currentUser?: Employee;
  onAddUpdate: (item: RoadmapItem) => void;
  onViewHistory?: (item: RoadmapItem) => void;
  initialMonth?: string;
  initialYear?: number;
}

// Helper to get month/year for filtering
const getCurrentPeriod = () => {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { month: months[now.getMonth()], year: now.getFullYear() };
};

const MonthlyUpdatesView: React.FC<MonthlyUpdatesViewProps> = ({ 
  items, updates, employees, goals, currentUser, onAddUpdate, onViewHistory, initialMonth, initialYear 
}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentPeriod = getCurrentPeriod();
  
  // Use initial values from props (global settings) or fall back to current period
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || currentPeriod.month);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || currentPeriod.year);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'updates' | 'people'>('updates');
  const [healthFilter, setHealthFilter] = useState<'all' | HealthStatus>('all');
  const [compareMode, setCompareMode] = useState<boolean>(false);
  
  // Calculate previous month for comparison
  const getPreviousMonth = (month: string, year: number) => {
    const idx = months.indexOf(month);
    if (idx === 0) {
      return { month: 'Dec', year: year - 1 };
    }
    return { month: months[idx - 1], year };
  };
  
  const previousPeriod = getPreviousMonth(selectedMonth, selectedYear);

  const toggleEmployee = (id: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get update for a specific item in the selected period
  const getItemUpdate = (itemId: string, month?: string, year?: number) => {
    return updates.find(u => 
      u.itemId === itemId && 
      u.month === (month || selectedMonth) && 
      u.year === (year || selectedYear)
    );
  };
  
  // Get update for previous month (for comparison)
  const getPrevItemUpdate = (itemId: string) => {
    return updates.find(u => 
      u.itemId === itemId && 
      u.month === previousPeriod.month && 
      u.year === previousPeriod.year
    );
  };

  // Calculate stats
  const stats = useMemo(() => {
    let total = 0, withUpdate = 0, green = 0, amber = 0, red = 0, missing = 0;
    
    items.forEach(item => {
      total++;
      const update = getItemUpdate(item.id);
      if (update) {
        withUpdate++;
        if (update.health === HealthStatus.GREEN) green++;
        else if (update.health === HealthStatus.AMBER) amber++;
        else if (update.health === HealthStatus.RED) red++;
      } else {
        missing++;
      }
    });
    
    return { total, withUpdate, green, amber, red, missing };
  }, [items, updates, selectedMonth, selectedYear]);

  // My items (current user's goals) - flexible matching for name variations
  const myItems = useMemo(() => {
    if (!currentUser) return [];
    const currentName = currentUser.name.toLowerCase();
    return items.filter(i => {
      const ownerName = (i.owner || '').toLowerCase();
      return ownerName === currentName || 
             ownerName.includes(currentName) || 
             currentName.includes(ownerName);
    });
  }, [items, currentUser]);

  const myStats = useMemo(() => {
    let withUpdate = 0, missing = 0, green = 0, amber = 0, red = 0;
    myItems.forEach(item => {
      const update = getItemUpdate(item.id);
      if (update) {
        withUpdate++;
        if (update.health === HealthStatus.GREEN) green++;
        else if (update.health === HealthStatus.AMBER) amber++;
        else if (update.health === HealthStatus.RED) red++;
      } else {
        missing++;
      }
    });
    return { total: myItems.length, withUpdate, missing, green, amber, red };
  }, [myItems, updates, selectedMonth, selectedYear]);

  // Group items by owner for team view
  const itemsByOwner = useMemo(() => {
    const groups: Record<string, RoadmapItem[]> = {};
    
    items.forEach(item => {
      const owner = item.owner || 'Unassigned';
      if (!groups[owner]) {
        groups[owner] = [];
      }
      groups[owner].push(item);
    });

    return groups;
  }, [items]);

  // Timeline view - recent updates sorted by date
  const recentUpdates = useMemo(() => {
    return updates
      .filter(u => u.month === selectedMonth && u.year === selectedYear)
      .filter(u => healthFilter === 'all' || u.health === healthFilter)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [updates, selectedMonth, selectedYear, healthFilter]);

  const getHealthStyle = (health?: HealthStatus): { color: string; text: string; border: string; label: string } => {
    if (!health) return { color: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', label: 'Pending' };
    const style = HEALTH_STYLES[health];
    const fallback = { color: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300', label: 'Unknown' };
    return style ? { ...style, color: style.color } : fallback;
  };

  // Item card component for update status
  const UpdateItemCard = ({ item }: { item: RoadmapItem }) => {
    const update = getItemUpdate(item.id);
    const healthStyle = getHealthStyle(update?.health);
    const goal = goals.find(g => g.id === item.goalId);
    
    return (
      <div 
        onClick={() => onViewHistory?.(item)}
        className={`
          p-4 rounded-xl border cursor-pointer transition-all group
          ${update 
            ? 'bg-white border-slate-300 hover:border-teal-300 hover:shadow-md' 
            : 'bg-amber-50/50 border-amber-200 border-dashed hover:border-amber-300'
          }
        `}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            {goal && (
              <div className="flex items-center gap-1.5 mb-1">
                {goal.icon && <span className="text-xs opacity-60">{goal.icon}</span>}
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate">{goal.title}</span>
              </div>
            )}
            <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
              {item.title}
            </h4>
          </div>
          <div className={`
            shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide
            ${update ? `${healthStyle.color} text-white` : 'bg-amber-100 text-amber-600'}
          `}>
            {update ? healthStyle.label : 'Missing'}
          </div>
        </div>
        
        {update ? (
          <p className="text-xs text-slate-600 line-clamp-2 mt-2">{update.content}</p>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onAddUpdate(item); }}
            className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add update for {selectedMonth}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Compact Header Bar */}
      <div className="bg-white rounded-xl border border-slate-300 px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Title + Period */}
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-900">Updates</h2>
            
            {/* Inline period selector */}
            <div className="flex items-center bg-slate-100 rounded-lg">
              <button
                onClick={() => {
                  const idx = months.indexOf(selectedMonth);
                  if (idx === 0) {
                    setSelectedMonth('Dec');
                    setSelectedYear(selectedYear - 1);
                  } else {
                    setSelectedMonth(months[idx - 1]);
                  }
                }}
                className="p-1.5 hover:bg-slate-200 rounded-l-lg transition-colors"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <select 
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer px-1"
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select 
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-1"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={() => {
                  const idx = months.indexOf(selectedMonth);
                  if (idx === 11) {
                    setSelectedMonth('Jan');
                    setSelectedYear(selectedYear + 1);
                  } else {
                    setSelectedMonth(months[idx + 1]);
                  }
                }}
                className="p-1.5 hover:bg-slate-200 rounded-r-lg transition-colors"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Center: Inline stats */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500"><strong className="text-slate-700">{stats.total}</strong> goals</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <strong className="text-emerald-600">{stats.green}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <strong className="text-amber-600">{stats.amber}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <strong className="text-red-600">{stats.red}</strong>
            </span>
            {stats.missing > 0 && (
              <span className="text-slate-500"><strong className="text-slate-500">{stats.missing}</strong> pending</span>
            )}
          </div>
          
          {/* Right: View toggles */}
          <div className="flex items-center gap-2">
            {/* Compare mode toggle */}
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border
                ${compareMode 
                  ? 'bg-teal-50 border-teal-300 text-teal-700' 
                  : 'bg-white border-slate-300 text-slate-600 hover:border-slate-300'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare
            </button>
            
            {/* View mode toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('updates')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'updates' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setViewMode('people')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'people' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                People
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'updates' ? (
        /* Updates Feed View - Grouped by owner with 2-column goal/update layout */
        <div className="space-y-4">
          {/* Compact filter row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All', color: 'bg-slate-400' },
              { id: HealthStatus.GREEN, label: 'On Track', color: 'bg-emerald-500' },
              { id: HealthStatus.AMBER, label: 'At Risk', color: 'bg-amber-500' },
              { id: HealthStatus.RED, label: 'Blocked', color: 'bg-red-500' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setHealthFilter(f.id as any)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                  ${healthFilter === f.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'}
                `}
              >
                <div className={`w-2 h-2 rounded-full ${f.color}`} />
                {f.label}
              </button>
            ))}
            
            {/* Compare mode indicator */}
            {compareMode && (
              <span className="ml-auto text-xs text-slate-500 flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Comparing <strong className="text-teal-700">{previousPeriod.month} {previousPeriod.year}</strong> → <strong className="text-teal-700">{selectedMonth} {selectedYear}</strong>
              </span>
            )}
          </div>

          {/* Updates view - either single month or comparison */}
          {compareMode ? (
            /* COMPARE MODE: Side-by-side view */
            <div className="space-y-4">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr] gap-4">
                <div className="bg-slate-100 rounded-lg px-4 py-2 text-center">
                  <span className="text-sm font-semibold text-slate-600">{previousPeriod.month} {previousPeriod.year}</span>
                  <span className="text-xs text-slate-500 ml-2">(Previous)</span>
                </div>
                <div className="bg-teal-50 rounded-lg px-4 py-2 text-center border border-teal-200">
                  <span className="text-sm font-semibold text-teal-700">{selectedMonth} {selectedYear}</span>
                  <span className="text-xs text-teal-500 ml-2">(Current)</span>
                </div>
              </div>
              
              {/* Items grouped by owner - compare view */}
              {(() => {
                // Get all unique owners who have updates in either month
                const allOwners = new Set<string>();
                items.forEach(item => {
                  if (item.owner) allOwners.add(item.owner);
                });
                
                const ownersList = Array.from(allOwners).sort();
                
                if (ownersList.length === 0) {
                  return (
                    <div className="bg-white rounded-xl border border-slate-300 p-12 text-center">
                      <h3 className="font-semibold text-slate-800 mb-1">No goals to compare</h3>
                      <p className="text-sm text-slate-500">Add goals to see comparison</p>
                    </div>
                  );
                }
                
                return ownersList.map(owner => {
                  const ownerItems = items.filter(i => i.owner === owner);
                  const employee = employees.find(e => e.name === owner);
                  
                  // Filter by health if needed
                  const filteredItems = ownerItems.filter(item => {
                    if (healthFilter === 'all') return true;
                    const currUpdate = getItemUpdate(item.id);
                    const prevUpdate = getPrevItemUpdate(item.id);
                    return currUpdate?.health === healthFilter || prevUpdate?.health === healthFilter;
                  });
                  
                  if (filteredItems.length === 0) return null;
                  
                  return (
                    <div key={owner} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                      {/* Owner header */}
                      <div className="px-4 py-3 bg-slate-100 border-b border-slate-100 flex items-center gap-3">
                        <img 
                          src={employee?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner)}&background=0d9488&color=fff&size=32`}
                          className="w-7 h-7 rounded-lg object-cover"
                          alt=""
                        />
                        <span className="font-semibold text-slate-800">{owner}</span>
                        <span className="text-xs text-slate-500">{filteredItems.length} goal{filteredItems.length !== 1 ? 's' : ''}</span>
                      </div>
                      
                      {/* Goals with side-by-side updates */}
                      <div className="divide-y divide-slate-100">
                        {filteredItems.map(item => {
                          const prevUpdate = getPrevItemUpdate(item.id);
                          const currUpdate = getItemUpdate(item.id);
                          const goal = goals.find(g => g.id === item.goalId);
                          const prevHealth = getHealthStyle(prevUpdate?.health);
                          const currHealth = getHealthStyle(currUpdate?.health);
                          
                          // Determine change indicator
                          const healthOrder = { [HealthStatus.GREEN]: 3, [HealthStatus.AMBER]: 2, [HealthStatus.RED]: 1 };
                          const prevScore = prevUpdate?.health ? healthOrder[prevUpdate.health] : 0;
                          const currScore = currUpdate?.health ? healthOrder[currUpdate.health] : 0;
                          const change = currScore - prevScore;
                          
                          return (
                            <div 
                              key={item.id}
                              onClick={() => onViewHistory?.(item)}
                              className="hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              {/* Goal title row */}
                              <div className="px-4 py-2 bg-slate-100/50 flex items-center gap-2 border-b border-slate-50">
                                {goal?.icon && <span className="text-sm">{goal.icon}</span>}
                                <span className="text-xs font-medium text-slate-500 truncate flex-1">{item.title}</span>
                                {/* Change indicator */}
                                {prevUpdate && currUpdate && change !== 0 && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    change > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {change > 0 ? '↑ Improved' : '↓ Declined'}
                                  </span>
                                )}
                                {!prevUpdate && currUpdate && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">New</span>
                                )}
                              </div>
                              
                              {/* Side-by-side updates */}
                              <div className="grid grid-cols-[1fr_1fr] divide-x divide-slate-100">
                                {/* Previous month */}
                                <div className="p-4">
                                  {prevUpdate ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${prevHealth.color}`} />
                                        <span className={`text-xs font-semibold ${prevHealth.text}`}>{prevHealth.label}</span>
                                      </div>
                                      <p className="text-sm text-slate-600 leading-relaxed">{prevUpdate.content}</p>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500 italic">No update</div>
                                  )}
                                </div>
                                
                                {/* Current month */}
                                <div className="p-4 bg-teal-50/30">
                                  {currUpdate ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${currHealth.color}`} />
                                        <span className={`text-xs font-semibold ${currHealth.text}`}>{currHealth.label}</span>
                                      </div>
                                      <p className="text-sm text-slate-700 leading-relaxed">{currUpdate.content}</p>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onAddUpdate(item); }}
                                      className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      Add update
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            /* SINGLE MONTH MODE: Original view */
            (() => {
              // Group updates by owner
              const updatesByOwner: Record<string, { employee?: Employee; updates: Array<{ update: ItemUpdate; item: RoadmapItem; goal?: StrategicGoal }> }> = {};
              
              recentUpdates.forEach(update => {
                const item = items.find(i => i.id === update.itemId);
                if (!item) return;
                
                const owner = item.owner || 'Unknown';
                if (!updatesByOwner[owner]) {
                  updatesByOwner[owner] = {
                    employee: employees.find(e => e.name === owner),
                    updates: []
                  };
                }
                updatesByOwner[owner].updates.push({
                  update,
                  item,
                  goal: goals.find(g => g.id === item.goalId)
                });
              });

              const ownerEntries = Object.entries(updatesByOwner).sort(([a], [b]) => a.localeCompare(b));

              if (ownerEntries.length === 0) {
                return (
                  <div className="bg-white rounded-xl border border-slate-300 p-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">No updates for {selectedMonth} {selectedYear}</h3>
                    <p className="text-sm text-slate-500">Updates will appear here once submitted</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {ownerEntries.map(([owner, { employee, updates: ownerUpdates }]) => (
                    <div key={owner} className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                      {/* Owner header */}
                      <div className="px-4 py-3 bg-slate-100 border-b border-slate-100 flex items-center gap-3">
                        <img 
                          src={employee?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner)}&background=0d9488&color=fff&size=32`}
                          className="w-7 h-7 rounded-lg object-cover"
                          alt=""
                        />
                        <span className="font-semibold text-slate-800">{owner}</span>
                        <span className="text-xs text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-full">
                          {ownerUpdates.length} update{ownerUpdates.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* 2-column table: Goal | Update */}
                      <div className="divide-y divide-slate-100">
                        {/* Header row */}
                        <div className="grid grid-cols-[minmax(200px,1fr)_minmax(300px,2fr)_80px] gap-4 px-4 py-2 bg-slate-100/50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          <div>Goal</div>
                          <div>Update</div>
                          <div className="text-right">Date</div>
                        </div>
                        
                        {/* Data rows */}
                        {ownerUpdates.map(({ update, item, goal }) => {
                          const healthStyle = getHealthStyle(update.health);
                          return (
                            <div 
                              key={update.id}
                              onClick={() => onViewHistory?.(item)}
                              className="grid grid-cols-[minmax(200px,1fr)_minmax(300px,2fr)_80px] gap-4 px-4 py-3 hover:bg-slate-100 cursor-pointer transition-colors items-start"
                            >
                              {/* Goal column */}
                              <div className="flex items-start gap-2 min-w-0">
                                {goal?.icon && <span className="text-base shrink-0">{goal.icon}</span>}
                                <div className="min-w-0">
                                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate">
                                    {goal?.title || 'Unassigned'}
                                  </div>
                                  <div className="text-sm font-medium text-slate-700 line-clamp-2 leading-snug">
                                    {item.title}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Update column */}
                              <div className="flex items-start gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${healthStyle.color}`} />
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {update.content}
                                </p>
                              </div>
                              
                              {/* Date column */}
                              <div className="text-xs text-slate-500 text-right whitespace-nowrap">
                                {new Date(update.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      ) : (
        /* By Person View - Shows who has/hasn't updated */
        <>
          {/* My Updates Section */}
          {currentUser && myItems.length > 0 && (
            <div className="bg-teal-50/50 rounded-2xl border border-teal-200 overflow-hidden">
              <div className="p-6 border-b border-teal-200 bg-teal-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random&color=fff`}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                      alt={currentUser.name}
                    />
                    <div>
                      <h3 className="font-bold text-slate-900">My Updates for {selectedMonth} {selectedYear}</h3>
                      <p className="text-sm text-slate-600">{myStats.withUpdate} of {myStats.total} goals updated</p>
                    </div>
                  </div>
                  
                  {/* Quick stats */}
                  <div className="flex items-center gap-2">
                    {myStats.missing > 0 && (
                      <span className="px-3 py-1.5 bg-amber-100 rounded-lg text-xs font-semibold text-amber-700">
                        {myStats.missing} pending
                      </span>
                    )}
                    {myStats.withUpdate === myStats.total && myStats.total > 0 && (
                      <span className="px-3 py-1.5 bg-emerald-100 rounded-lg text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        All updated
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myItems.map(item => (
                    <UpdateItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Team Updates by Owner */}
          <div className="space-y-4">
            {Object.entries(itemsByOwner)
              .filter(([owner]) => {
                // Exclude current user since they're shown above - flexible matching
                if (!currentUser) return true;
                const currentName = currentUser.name.toLowerCase();
                const ownerLower = owner.toLowerCase();
                return !(ownerLower === currentName || 
                         ownerLower.includes(currentName) || 
                         currentName.includes(ownerLower));
              })
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([owner, ownerItems]) => {
                if (ownerItems.length === 0) return null;
                
                // Calculate owner stats
                const ownerUpdates = ownerItems.map(item => getItemUpdate(item.id)).filter(Boolean);
                const ownerMissing = ownerItems.length - ownerUpdates.length;
                const ownerRed = ownerUpdates.filter(u => u?.health === HealthStatus.RED).length;
                const ownerAmber = ownerUpdates.filter(u => u?.health === HealthStatus.AMBER).length;
                const employee = employees.find(e => e.name === owner);
                const dept = ownerItems[0]?.department || 'Unassigned';
                
                return (
                  <div key={owner} className="bg-white rounded-2xl border border-slate-300 overflow-hidden">
                    <div 
                      className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleEmployee(owner)}
                    >
                      <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                        <svg className={`w-4 h-4 text-slate-500 transition-transform ${expandedEmployees.has(owner) ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      <img 
                        src={employee?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner)}&background=random&color=fff`}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-300"
                        alt={owner}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800">{owner}</div>
                        <div className="text-xs text-slate-500">{dept} • {ownerItems.length} goals</div>
                      </div>
                      
                      {/* Status indicators */}
                      <div className="flex items-center gap-2">
                        {ownerRed > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs font-medium text-red-600">{ownerRed}</span>
                          </span>
                        )}
                        {ownerAmber > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-xs font-medium text-amber-600">{ownerAmber}</span>
                          </span>
                        )}
                        {ownerMissing > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg">
                            <span className="text-xs font-medium text-slate-500">{ownerMissing} missing</span>
                          </span>
                        )}
                        {ownerUpdates.length === ownerItems.length && ownerItems.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {expandedEmployees.has(owner) && (
                      <div className="px-4 pb-4 pl-16 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                          {ownerItems.map(item => (
                            <UpdateItemCard key={item.id} item={item} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyUpdatesView;
