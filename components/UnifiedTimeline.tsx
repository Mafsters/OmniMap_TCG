
import React, { useState, useMemo } from 'react';
import { RoadmapItem, Status, Priority } from '../types';
import { getDepartmentColor } from '../constants';

interface UnifiedTimelineProps {
  items: RoadmapItem[];
  onItemClick?: (item: RoadmapItem) => void;
}

type ViewMode = 'Month' | 'Quarter' | 'Year';

const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({ items, onItemClick }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('Quarter');
  const [baseDate, setBaseDate] = useState(new Date());
  const [ownerFilter, setOwnerFilter] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [showBlockedLate, setShowBlockedLate] = useState<boolean>(false);

  // Get unique owners and teams for filter dropdowns
  const { uniqueOwners, uniqueTeams } = useMemo(() => {
    const owners = new Set<string>();
    const teams = new Set<string>();
    items.forEach(i => {
      if (i.owner) owners.add(i.owner);
      if (i.team) teams.add(i.team);
    });
    return {
      uniqueOwners: Array.from(owners).sort(),
      uniqueTeams: Array.from(teams).sort()
    };
  }, [items]);

  // Helper to check if item is blocked or late
  const isBlockedOrLate = (item: RoadmapItem) => {
    const now = new Date();
    const end = new Date(item.endDate);
    const isOverdue = now > end && item.status !== Status.DONE;
    return item.status === Status.BLOCKED || isOverdue;
  };

  // Filter items based on all filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesOwner = !ownerFilter || item.owner === ownerFilter;
      const matchesTeam = !teamFilter || item.team === teamFilter;
      const matchesPriority = !priorityFilter || item.priority === priorityFilter;
      const matchesBlockedLate = !showBlockedLate || isBlockedOrLate(item);
      return matchesOwner && matchesTeam && matchesPriority && matchesBlockedLate;
    });
  }, [items, ownerFilter, teamFilter, priorityFilter, showBlockedLate]);

  // Group items by department and sub-team
  const departmentGroups = useMemo(() => {
    const groups: Record<string, { teams: Record<string, RoadmapItem[]>, noTeam: RoadmapItem[] }> = {};
    
    filteredItems.forEach(item => {
      if (!groups[item.department]) {
        groups[item.department] = { teams: {}, noTeam: [] };
      }
      if (item.team) {
        if (!groups[item.department].teams[item.team]) {
          groups[item.department].teams[item.team] = [];
        }
        groups[item.department].teams[item.team].push(item);
      } else {
        groups[item.department].noTeam.push(item);
      }
    });
    
    return groups;
  }, [filteredItems]);

  const departments = useMemo(() => {
    return Object.keys(departmentGroups).sort();
  }, [departmentGroups]);

  // Generate timeline columns based on View Mode
  const timelineColumns = useMemo(() => {
    const cols = [];
    
    // Simplified Logic: Always generate "slots"
    let slotCount = 0;
    let startDate = new Date(baseDate);

    if (viewMode === 'Year') {
      // Show 12 months starting from Jan of base year
      startDate = new Date(baseDate.getFullYear(), 0, 1);
      slotCount = 12;
      for(let i=0; i<slotCount; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        cols.push({
          label: d.toLocaleString('default', { month: 'short' }),
          subLabel: d.getFullYear().toString(),
          date: d,
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0)
        });
      }
    } else if (viewMode === 'Quarter') {
      // Show 6 months starting from current quarter start
      const currentMonth = baseDate.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      startDate = new Date(baseDate.getFullYear(), quarterStartMonth, 1);
      
      slotCount = 6;
      for(let i=0; i<slotCount; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        cols.push({
          label: d.toLocaleString('default', { month: 'long' }),
          subLabel: d.getFullYear().toString(),
          date: d,
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0)
        });
      }
    } else {
      // Month View: Show Days for 1 month
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      for(let i=1; i<=daysInMonth; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), i);
        // Show every day in month view
        cols.push({
          label: `${i}`,
          subLabel: d.toLocaleString('default', { weekday: 'narrow' }),
          date: d,
          end: new Date(d.getFullYear(), d.getMonth(), i, 23, 59, 59)
        });
      }
    }
    return cols;
  }, [viewMode, baseDate]);

  const timelineStart = timelineColumns[0]?.date || new Date();
  const timelineEnd = timelineColumns[timelineColumns.length - 1]?.end || new Date();
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

  // "Today" Indicator Position
  const today = new Date();
  const todayPos = useMemo(() => {
    if (today < timelineStart || today > timelineEnd) return null;
    return ((today.getTime() - timelineStart.getTime()) / totalDuration) * 100;
  }, [timelineStart, timelineEnd, totalDuration, today]);

  const calculatePosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Clamp
    const effectiveStart = start < timelineStart ? timelineStart : start;
    const effectiveEnd = end > timelineEnd ? timelineEnd : end;

    if (end < timelineStart || start > timelineEnd) return { visible: false, left: '0%', width: '0%' };
    
    const left = ((effectiveStart.getTime() - timelineStart.getTime()) / totalDuration) * 100;
    const width = ((effectiveEnd.getTime() - effectiveStart.getTime()) / totalDuration) * 100;

    return { 
      left: `${left}%`, 
      width: `${Math.max(0.5, width)}%`,
      visible: true,
      isCutLeft: start < timelineStart,
      isCutRight: end > timelineEnd
    };
  };

  const handleNav = (direction: -1 | 1) => {
    const newDate = new Date(baseDate);
    if (viewMode === 'Year') newDate.setFullYear(newDate.getFullYear() + direction);
    else if (viewMode === 'Quarter') newDate.setMonth(newDate.getMonth() + (direction * 3));
    else newDate.setMonth(newDate.getMonth() + direction);
    setBaseDate(newDate);
  };

  // Stack items to prevent overlaps
  const getStackedItems = (deptItems: RoadmapItem[]) => {
    // Sort by start date, then by longer duration
    const sorted = [...deptItems].sort((a, b) => {
        const startDiff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        if (startDiff !== 0) return startDiff;
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });

    const lanes: number[] = []; // Stores the end time (timestamp) of the last item in each lane
    
    return sorted.map(item => {
      const start = new Date(item.startDate).getTime();
      const end = new Date(item.endDate).getTime();
      let laneIndex = -1;
      
      // Try to fit into an existing lane
      for (let i = 0; i < lanes.length; i++) {
        // If the lane is free (last item end < current item start)
        if (lanes[i] < start) {
          laneIndex = i;
          lanes[i] = end;
          break;
        }
      }
      
      // If no lane found, create a new one
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push(end);
      }
      
      return { ...item, laneIndex };
    });
  };

  // Helper to determine styling based on Priority and Status
  const getItemStyles = (item: RoadmapItem) => {
    const now = new Date();
    const end = new Date(item.endDate);
    const isOverdue = now > end && item.status !== Status.DONE;
    const isBlocked = item.status === Status.BLOCKED;
    
    let classes = `${getDepartmentColor(item.department)} text-white`; // Base color
    let border = 'border border-white/20'; // Default subtle border
    let shadow = 'shadow-sm';
    let icon = '';

    // 1. Assign Priority Icons (Default State)
    switch (item.priority) {
        case Priority.CRITICAL: icon = '🔥'; break;
        case Priority.HIGH: icon = '3️⃣'; break;
        case Priority.MEDIUM: icon = '2️⃣'; break;
        case Priority.LOW: icon = '1️⃣'; break;
        default: icon = '2️⃣';
    }

    // 2. Override for Blocked or Late (The "At Risk" Alert)
    if (isBlocked || isOverdue) {
        border = 'border-2 border-rose-500';
        shadow = 'shadow-[0_2px_8px_rgba(244,63,94,0.4)]'; // Red glow
        icon = '⚠️'; // Alert overrides priority icon
    }

    // 3. Done items fade out
    if (item.status === Status.DONE) {
       classes += ' opacity-60 grayscale-[0.5]';
       border = 'border border-emerald-300';
       icon = '✅';
    }

    return { classes, border, shadow, icon };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden flex flex-col h-[700px]">
      {/* Header Controls */}
      <div className="px-6 py-3 border-b border-slate-300 flex flex-col gap-3 bg-slate-100">
        {/* Top Row: Title, View Mode, Legend, Date Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-4">
             <h3 className="font-display text-sm font-bold text-slate-800 uppercase tracking-widest">Roadmap Timeline</h3>
             <div className="flex bg-white p-0.5 rounded-lg border border-slate-300 shadow-sm">
                {(['Month', 'Quarter', 'Year'] as ViewMode[]).map(m => (
                   <button
                     key={m}
                     onClick={() => setViewMode(m)}
                     className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === m ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                   >
                     {m}
                   </button>
                ))}
             </div>
          </div>

          {/* Legend - Clickable Filters */}
          <div className="hidden lg:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest">
              <button 
                onClick={() => setPriorityFilter(priorityFilter === Priority.CRITICAL ? null : Priority.CRITICAL)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  priorityFilter === Priority.CRITICAL 
                    ? 'bg-red-100 text-red-700 ring-2 ring-red-300' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">🔥</span> Critical
              </button>
              <button 
                onClick={() => setPriorityFilter(priorityFilter === Priority.HIGH ? null : Priority.HIGH)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  priorityFilter === Priority.HIGH 
                    ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">3️⃣</span> High
              </button>
              <button 
                onClick={() => setPriorityFilter(priorityFilter === Priority.MEDIUM ? null : Priority.MEDIUM)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  priorityFilter === Priority.MEDIUM 
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">2️⃣</span> Normal
              </button>
              <button 
                onClick={() => setPriorityFilter(priorityFilter === Priority.LOW ? null : Priority.LOW)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  priorityFilter === Priority.LOW 
                    ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-400' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">1️⃣</span> Low
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button 
                onClick={() => setShowBlockedLate(!showBlockedLate)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  showBlockedLate 
                    ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div className="w-3 h-3 border-2 border-rose-500 rounded bg-rose-50 flex items-center justify-center text-[8px]">⚠️</div> Blocked/Late
              </button>
          </div>

          <div className="flex items-center gap-4">
             <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
               {viewMode === 'Year' && baseDate.getFullYear()}
               {viewMode === 'Quarter' && `Q${Math.floor(baseDate.getMonth()/3)+1} ${baseDate.getFullYear()}`}
               {viewMode === 'Month' && baseDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
             </span>
             <div className="flex gap-1">
               <button onClick={() => handleNav(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
               </button>
               <button onClick={() => setBaseDate(new Date())} className="text-[10px] font-bold uppercase text-teal-600 px-2 hover:bg-teal-50 rounded transition-colors">Today</button>
               <button onClick={() => handleNav(1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
               </button>
             </div>
          </div>
        </div>

        {/* Bottom Row: Quick Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Filters:</span>
          
          {/* Owner Filter */}
          <div className="relative">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-100 outline-none cursor-pointer"
            >
              <option value="">All Owners</option>
              {uniqueOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Team Filter */}
          <div className="relative">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 focus:border-teal-400 focus:ring-1 focus:ring-teal-100 outline-none cursor-pointer"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Clear Filters */}
          {(ownerFilter || teamFilter || priorityFilter || showBlockedLate) && (
            <button
              onClick={() => { 
                setOwnerFilter(''); 
                setTeamFilter(''); 
                setPriorityFilter(null);
                setShowBlockedLate(false);
              }}
              className="text-[10px] font-bold text-slate-500 hover:text-red-600 uppercase tracking-wider px-2 py-1 hover:bg-red-50 rounded transition-colors"
            >
              Clear All
            </button>
          )}

          {/* Filter count */}
          <span className="text-[10px] text-slate-500 ml-auto">
            {filteredItems.length !== items.length ? (
              <span className="text-teal-600 font-semibold">Filtered: {filteredItems.length}</span>
            ) : (
              `Showing ${filteredItems.length}`
            )} of {items.length} items
          </span>
        </div>
      </div>
      
      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <div className="min-w-[1000px] h-full flex flex-col">
           {/* Date Headers */}
           <div className="flex border-b border-slate-300 bg-slate-100 sticky top-0 z-20">
              <div className="w-48 shrink-0 p-3 border-r border-slate-300 bg-white font-bold text-[10px] text-slate-500 uppercase tracking-widest sticky left-0 z-30 shadow-sm">
                Department / Initiative
              </div>
              <div className="flex-1 flex relative">
                {timelineColumns.map((col, i) => (
                   <div key={i} className="flex-1 border-r border-slate-100 p-2 text-center min-w-[40px]">
                      <div className="text-[10px] font-bold text-slate-700 uppercase">{col.label}</div>
                      <div className="text-[9px] font-medium text-slate-500">{col.subLabel}</div>
                   </div>
                ))}
                {/* Today Line Indicator */}
                {todayPos && (
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-rose-500 z-10" 
                    style={{ left: `${todayPos}%` }}
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-rose-500"></div>
                  </div>
                )}
              </div>
           </div>

           {/* Rows */}
           <div className="flex-1 relative bg-white">
             {/* Today Line Body */}
             {todayPos && (
                <div className="absolute inset-0 pl-48 pointer-events-none z-10">
                   <div className="absolute top-0 bottom-0 w-px bg-rose-500/30 border-l border-dashed border-rose-500" style={{ left: `${todayPos}%` }}></div>
                </div>
             )}

             {departments.map(dept => {
               const deptGroup = departmentGroups[dept];
               if (!deptGroup) return null;
               
               const hasTeams = Object.keys(deptGroup.teams).length > 0;
               const teamNames = Object.keys(deptGroup.teams).sort();
               const deptItemCount = Object.values(deptGroup.teams).flat().length + deptGroup.noTeam.length;

               // Render helper for a row of items
               const renderItemsRow = (rowItems: RoadmapItem[], label: string, isSubTeam: boolean = false) => {
                 if (rowItems.length === 0) return null;
                 
                 const stackedItems = getStackedItems(rowItems);
                 const laneCount = Math.max(...stackedItems.map(i => i.laneIndex)) + 1;
                 const rowHeight = Math.max(laneCount * 36 + 24, 80);

                 return (
                   <div key={label} className={`flex border-b border-slate-100 group ${isSubTeam ? 'bg-slate-25' : ''}`}>
                      {/* Row Header */}
                      <div className={`w-48 shrink-0 p-3 border-r border-slate-300 bg-white sticky left-0 z-10 group-hover:bg-slate-100 transition-colors flex flex-col justify-center ${isSubTeam ? 'pl-6' : ''}`}>
                         <div className="flex items-center gap-2">
                            {!isSubTeam && <div className={`w-2 h-2 rounded-full ${getDepartmentColor(dept)}`}></div>}
                            {isSubTeam && <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>}
                            <span className={`text-xs font-semibold truncate ${isSubTeam ? 'text-slate-500' : 'text-slate-700'}`}>{label}</span>
                         </div>
                         <div className={`text-[9px] text-slate-500 mt-0.5 ${isSubTeam ? 'pl-3.5' : 'pl-4'}`}>{rowItems.length} items</div>
                      </div>

                      {/* Bars Container */}
                      <div className="flex-1 relative" style={{ height: `${rowHeight}px` }}>
                         {/* Background Grid Lines inside row */}
                         <div className="absolute inset-0 flex pointer-events-none">
                            {timelineColumns.map((_, i) => (
                              <div key={i} className="flex-1 border-r border-slate-50 h-full"></div>
                            ))}
                         </div>

                         {stackedItems.map(item => {
                           const pos = calculatePosition(item.startDate, item.endDate);
                           if (!pos.visible) return null;

                           const { classes, border, shadow, icon } = getItemStyles(item);
                           // Get first name for compact display
                           const ownerFirstName = item.owner ? item.owner.split(' ')[0] : '';
                           
                           return (
                             <div
                               key={item.id}
                               onClick={() => onItemClick?.(item)}
                               className={`absolute h-7 rounded-md text-[10px] font-bold px-2 flex items-center overflow-hidden cursor-pointer hover:brightness-110 hover:z-20 transition-all ${classes} ${border} ${shadow}`}
                               style={{
                                 left: pos.left,
                                 width: pos.width,
                                 top: `${12 + (item.laneIndex * 36)}px`, // Stacking offset
                                 borderRadius: `${pos.isCutLeft ? '0' : '6px'} ${pos.isCutRight ? '0' : '6px'} ${pos.isCutRight ? '0' : '6px'} ${pos.isCutLeft ? '0' : '6px'}`
                               }}
                               title={`${item.owner}: ${item.title} (${item.startDate} - ${item.endDate})`}
                             >
                               <div className="flex items-center gap-1.5 truncate sticky left-0 w-full">
                                  {icon && <span className="shrink-0 text-sm filter drop-shadow-sm">{icon}</span>}
                                  {ownerFirstName && (
                                    <span className="shrink-0 text-[9px] font-bold opacity-80 bg-white/20 px-1 rounded">{ownerFirstName}</span>
                                  )}
                                  <span className="truncate">{item.title}</span>
                               </div>
                             </div>
                           );
                         })}
                      </div>
                   </div>
                 );
               };

               return (
                 <React.Fragment key={dept}>
                   {/* If no sub-teams, render all items under department */}
                   {!hasTeams && renderItemsRow([...deptGroup.noTeam], dept)}
                   
                   {/* If has sub-teams, render department header + sub-team rows */}
                   {hasTeams && (
                     <>
                       {/* Department header row (if there are items without team) */}
                       {deptGroup.noTeam.length > 0 && renderItemsRow(deptGroup.noTeam, dept)}
                       
                       {/* If all items have teams, show department label */}
                       {deptGroup.noTeam.length === 0 && (
                         <div className="flex border-b border-slate-100">
                           <div className="w-48 shrink-0 p-2 border-r border-slate-300 bg-slate-100 sticky left-0 z-10 flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${getDepartmentColor(dept)}`}></div>
                             <span className="text-xs font-semibold text-slate-700">{dept}</span>
                             <span className="text-[9px] text-slate-500 ml-auto">{deptItemCount} items</span>
                           </div>
                           <div className="flex-1 bg-slate-100"></div>
                         </div>
                       )}
                       
                       {/* Sub-team rows */}
                       {teamNames.map(team => renderItemsRow(deptGroup.teams[team], team, true))}
                     </>
                   )}
                 </React.Fragment>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedTimeline;
