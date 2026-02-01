
import React, { useMemo, useState, useEffect } from 'react';
import { StrategicGoal, RoadmapItem, Employee, Priority, Status } from '../types';
import RoadmapCard from './RoadmapCard';

interface IndividualViewProps {
  currentUser: Employee;
  items: RoadmapItem[];
  goals: StrategicGoal[];
  employees: Employee[];
  onEditItem?: (item: RoadmapItem) => void;
  onAddItem?: () => void;
  onViewHistory?: (item: RoadmapItem) => void;
  onPushToHiBob?: (item: RoadmapItem) => void;
  pushingItems?: Set<string>;
}

type StatFilter = 'all' | 'blocked' | 'active' | 'done';

// --- MISSION CONTROL HEADER ---
const MissionControl: React.FC<{ 
  employee: Employee; 
  items: RoadmapItem[];
  statFilter: StatFilter;
  onStatFilterChange: (filter: StatFilter) => void;
}> = ({ employee, items, statFilter, onStatFilterChange }) => {
  const [mission, setMission] = useState(localStorage.getItem(`omnimap_mission_${employee.id}`) || '');
  const [isEditing, setIsEditing] = useState(false);

  const activeCount = items.filter(i => i.status === Status.IN_PROGRESS).length;
  const completedCount = items.filter(i => i.status === Status.DONE).length;
  const blockedCount = items.filter(i => i.status === Status.BLOCKED).length;

  const handleSave = () => {
    localStorage.setItem(`omnimap_mission_${employee.id}`, mission);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-300 p-6 mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
        
        {/* Identity Section */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative">
            {employee.avatarUrl ? (
              <img 
                src={employee.avatarUrl} 
                alt={employee.name} 
                className="w-16 h-16 rounded-xl object-cover border border-slate-300" 
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-lg font-bold text-slate-600">
                {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">
              {employee.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                {employee.role}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                {employee.department}
              </span>
              <span className={`
                text-xs px-2.5 py-1 rounded-full font-medium
                ${employee.accessLevel === 'Admin' 
                  ? 'bg-purple-50 text-purple-700' 
                  : employee.accessLevel === 'Manager' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'bg-slate-100 text-slate-600'
                }
              `}>
                {employee.accessLevel}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:block w-px h-16 bg-slate-200" />

        {/* North Star Focus */}
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Focus</label>
          </div>
          
          {isEditing ? (
            <textarea 
              autoFocus
              className="w-full bg-slate-100 border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
              rows={2}
              placeholder="What is your primary objective right now?"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => { if(e.key === 'Enter') handleSave(); }}
            />
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="cursor-pointer p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <p className={`text-base leading-relaxed ${mission ? 'text-slate-700' : 'text-slate-500 italic'}`}>
                {mission ? `"${mission}"` : "Click to set your primary focus..."}
              </p>
            </div>
          )}
        </div>

        {/* Clickable Stats */}
        <div className="flex gap-2 shrink-0">
          {blockedCount > 0 && (
            <button
              onClick={() => onStatFilterChange(statFilter === 'blocked' ? 'all' : 'blocked')}
              className={`
                flex flex-col items-center justify-center rounded-xl p-4 min-w-[80px] transition-all cursor-pointer
                ${statFilter === 'blocked' 
                  ? 'bg-red-500 border-2 border-red-600 shadow-lg scale-105' 
                  : 'bg-red-50 border border-red-100 hover:border-red-300 hover:shadow-md'
                }
              `}
            >
              <span className={`text-2xl font-bold leading-none mb-1 ${statFilter === 'blocked' ? 'text-white' : 'text-red-600'}`}>
                {blockedCount}
              </span>
              <span className={`text-[10px] font-medium uppercase ${statFilter === 'blocked' ? 'text-red-100' : 'text-red-500'}`}>
                Blocked
              </span>
            </button>
          )}

          <button
            onClick={() => onStatFilterChange(statFilter === 'active' ? 'all' : 'active')}
            className={`
              flex flex-col items-center justify-center rounded-xl p-4 min-w-[80px] transition-all cursor-pointer
              ${statFilter === 'active' 
                ? 'bg-teal-500 border-2 border-teal-600 shadow-lg scale-105' 
                : 'bg-teal-50 border border-teal-100 hover:border-teal-300 hover:shadow-md'
              }
            `}
          >
            <span className={`text-2xl font-bold leading-none mb-1 ${statFilter === 'active' ? 'text-white' : 'text-teal-600'}`}>
              {activeCount}
            </span>
            <span className={`text-[10px] font-medium uppercase ${statFilter === 'active' ? 'text-teal-100' : 'text-teal-500'}`}>
              Active
            </span>
          </button>

          <button
            onClick={() => onStatFilterChange(statFilter === 'done' ? 'all' : 'done')}
            className={`
              flex flex-col items-center justify-center rounded-xl p-4 min-w-[80px] transition-all cursor-pointer
              ${statFilter === 'done' 
                ? 'bg-emerald-500 border-2 border-emerald-600 shadow-lg scale-105' 
                : 'bg-emerald-50 border border-emerald-100 hover:border-emerald-300 hover:shadow-md'
              }
            `}
          >
            <span className={`text-2xl font-bold leading-none mb-1 ${statFilter === 'done' ? 'text-white' : 'text-emerald-600'}`}>
              {completedCount}
            </span>
            <span className={`text-[10px] font-medium uppercase ${statFilter === 'done' ? 'text-emerald-100' : 'text-emerald-500'}`}>
              Done
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- HIERARCHICAL TEAM MEMBER ---
interface TeamMemberNodeProps {
  employee: Employee;
  items: RoadmapItem[];
  goals: StrategicGoal[];
  employees: Employee[];
  allItems: RoadmapItem[];
  isExpanded: boolean;
  onToggle: () => void;
  expandedSet: Set<string>;
  onToggleAny: (id: string) => void;
  onEditItem?: (item: RoadmapItem) => void;
  onViewHistory?: (item: RoadmapItem) => void;
  onPushToHiBob?: (item: RoadmapItem) => void;
  pushingItems?: Set<string>;
  depth?: number;
  getEmployeeItems: (e: Employee) => RoadmapItem[];
}

const TeamMemberNode: React.FC<TeamMemberNodeProps> = ({ 
  employee, items, goals, employees, allItems, isExpanded, onToggle, 
  expandedSet, onToggleAny, onEditItem, onViewHistory, onPushToHiBob, 
  pushingItems, depth = 0, getEmployeeItems 
}) => {
  const blockedCount = items.filter(i => i.status === Status.BLOCKED).length;
  const activeCount = items.filter(i => i.status === Status.IN_PROGRESS).length;
  const doneCount = items.filter(i => i.status === Status.DONE).length;

  // Find direct reports
  const directReports = employees.filter(e => 
    e.reportsTo === employee.id || 
    e.reportsTo === employee.name ||
    (e.reportsTo && e.reportsTo.toLowerCase() === employee.name.toLowerCase())
  );

  const hasDirectReports = directReports.length > 0;
  const isManager = employee.accessLevel === 'Manager' || hasDirectReports;

  // Calculate team totals (including all nested reports) with cycle protection
  const getTeamTotals = (emp: Employee, visited: Set<string> = new Set()): { blocked: number, active: number, done: number, total: number } => {
    // Prevent infinite loops from circular references
    if (visited.has(emp.id)) {
      return { blocked: 0, active: 0, done: 0, total: 0 };
    }
    visited.add(emp.id);
    
    const empItems = getEmployeeItems(emp);
    let totals = {
      blocked: empItems.filter(i => i.status === Status.BLOCKED).length,
      active: empItems.filter(i => i.status === Status.IN_PROGRESS).length,
      done: empItems.filter(i => i.status === Status.DONE).length,
      total: empItems.length
    };
    
    const reports = employees.filter(e => 
      e.reportsTo === emp.id || 
      e.reportsTo === emp.name ||
      (e.reportsTo && e.reportsTo.toLowerCase() === emp.name.toLowerCase())
    );
    
    reports.forEach(r => {
      const subTotals = getTeamTotals(r, visited);
      totals.blocked += subTotals.blocked;
      totals.active += subTotals.active;
      totals.done += subTotals.done;
      totals.total += subTotals.total;
    });
    
    return totals;
  };

  const teamTotals = isManager ? getTeamTotals(employee, new Set()) : null;

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-slate-100' : ''}>
      {/* Person Row */}
      <div 
        onClick={onToggle}
        className={`
          flex items-center gap-4 p-3 cursor-pointer transition-all
          ${depth > 0 ? 'pl-4' : ''}
          ${isExpanded ? 'bg-slate-100' : 'hover:bg-slate-100'}
          ${isManager ? 'border-l-2 border-l-blue-400' : ''}
        `}
      >
        {/* Expand/Collapse */}
        <button 
          className="p-1 hover:bg-slate-200 rounded transition-colors"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          <svg 
            className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Avatar */}
        {employee.avatarUrl ? (
          <img src={employee.avatarUrl} className="w-9 h-9 rounded-full object-cover border border-slate-300" alt="" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
            {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
        )}

        {/* Name & Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">{employee.name}</span>
            {isManager && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">MGR</span>
            )}
            {hasDirectReports && (
              <span className="text-[10px] text-slate-500">
                ({directReports.length} direct{directReports.length > 1 ? 's' : ''})
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">{employee.role}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          {/* Personal stats */}
          {blockedCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-red-600">{blockedCount}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-xs font-medium text-teal-600">{activeCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">{doneCount}</span>
          </div>
          
          {/* Team totals for managers */}
          {isManager && teamTotals && teamTotals.total > items.length && (
            <div className="ml-2 pl-2 border-l border-slate-300 flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase">Team:</span>
              {teamTotals.blocked > 0 && (
                <span className="text-xs font-medium text-red-600">{teamTotals.blocked}!</span>
              )}
              <span className="text-xs text-slate-500">{teamTotals.total} goals</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={`${depth > 0 ? 'pl-4' : ''} pb-2`}>
          {/* Person's Goals */}
          {items.length > 0 && (
            <div className="pl-10 pr-4 py-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {goals && goals.map(goal => {
                  if (!goal) return null;
                  const goalItems = items.filter(i => i.goalId === goal.id);
                  if (goalItems.length === 0) return null;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        {goal.icon && <span className="text-sm opacity-60">{goal.icon}</span>}
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{goal.title || 'Untitled'}</span>
                        <span className="text-xs text-slate-500 ml-auto">{goalItems.length}</span>
                      </div>
                      <div className="space-y-2">
                        {goalItems.map(item => (
                          <RoadmapCard 
                            key={item.id}
                            item={item}
                            employees={employees}
                            onEdit={onEditItem}
                            onClick={onViewHistory}
                            onPushToHiBob={onPushToHiBob}
                            isPushing={pushingItems?.has(item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Reports (nested) */}
          {hasDirectReports && (
            <div className="mt-2">
              {directReports.map(report => (
                <TeamMemberNode
                  key={report.id}
                  employee={report}
                  items={getEmployeeItems(report)}
                  goals={goals}
                  employees={employees}
                  allItems={allItems}
                  isExpanded={expandedSet.has(report.id)}
                  onToggle={() => onToggleAny(report.id)}
                  expandedSet={expandedSet}
                  onToggleAny={onToggleAny}
                  onEditItem={onEditItem}
                  onViewHistory={onViewHistory}
                  onPushToHiBob={onPushToHiBob}
                  pushingItems={pushingItems}
                  depth={depth + 1}
                  getEmployeeItems={getEmployeeItems}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN INDIVIDUAL VIEW ---
const IndividualView: React.FC<IndividualViewProps> = ({ currentUser, items, goals, employees, onEditItem, onAddItem, onViewHistory, onPushToHiBob, pushingItems }) => {
  const [filterDept, setFilterDept] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set([currentUser.id]));
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

  const isOwnerMatch = (itemOwner: string, targetName: string) => {
    const a = itemOwner.toLowerCase().trim();
    const b = targetName.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  };

  const getEmployeeItems = (employee: Employee) => {
    return items.filter(i => 
      i.owner === employee.id || isOwnerMatch(i.owner, employee.name)
    );
  };

  const myItems = useMemo(() => {
    let myGoals = items.filter(i => 
      i.owner === currentUser.id || 
      isOwnerMatch(i.owner, currentUser.name)
    );
    
    if (statFilter === 'blocked') myGoals = myGoals.filter(i => i.status === Status.BLOCKED);
    if (statFilter === 'active') myGoals = myGoals.filter(i => i.status === Status.IN_PROGRESS);
    if (statFilter === 'done') myGoals = myGoals.filter(i => i.status === Status.DONE);
    
    return myGoals;
  }, [items, currentUser, statFilter]);

  const myItemsUnfiltered = useMemo(() => {
    return items.filter(i => 
      i.owner === currentUser.id || 
      isOwnerMatch(i.owner, currentUser.name)
    );
  }, [items, currentUser]);

  const uniqueDepts = useMemo(() => Array.from(new Set(employees.map(e => e.department))).sort(), [employees]);

  const toggleEmployee = (id: string) => {
    const newSet = new Set(expandedEmployees);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedEmployees(newSet);
  };

  const toggleDept = (dept: string) => {
    const newSet = new Set(collapsedDepts);
    if (newSet.has(dept)) {
      newSet.delete(dept);
    } else {
      newSet.add(dept);
    }
    setCollapsedDepts(newSet);
  };

  // Build hierarchy: Find people who report to current user (directly or indirectly)
  const { myTeamMembers, myTeamManagers, othersByDept } = useMemo(() => {
    if (currentUser.accessLevel === 'IC') return { myTeamMembers: [], myTeamManagers: [], othersByDept: {} };
    
    // First, try to find actual direct reports via reportsTo field
    const directReportsViaField = employees.filter(e => 
      e.id !== currentUser.id &&
      (e.reportsTo === currentUser.id || 
       e.reportsTo === currentUser.name ||
       (e.reportsTo && e.reportsTo.toLowerCase() === currentUser.name.toLowerCase()))
    );

    // Helper to get reports recursively
    const getReportsRecursive = (manager: Employee): Employee[] => {
      const reports = employees.filter(e => 
        e.id !== manager.id &&
        (e.reportsTo === manager.id || 
         e.reportsTo === manager.name ||
         (e.reportsTo && e.reportsTo.toLowerCase() === manager.name.toLowerCase()))
      );
      let all = [...reports];
      reports.forEach(r => {
        all = [...all, ...getReportsRecursive(r)];
      });
      return all;
    };

    // If we have reportsTo data, use it
    if (directReportsViaField.length > 0) {
      const allMyReportIds = new Set<string>();
      directReportsViaField.forEach(dr => {
        allMyReportIds.add(dr.id);
        getReportsRecursive(dr).forEach(r => allMyReportIds.add(r.id));
      });

      let others = employees.filter(e => 
        e.id !== currentUser.id && 
        !allMyReportIds.has(e.id)
      );
      
      if (filterDept !== 'ALL') others = others.filter(e => e.department === filterDept);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        others = others.filter(e => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
      }
      
      const othersByDept: Record<string, Employee[]> = {};
      others.forEach(e => {
        if (!othersByDept[e.department]) othersByDept[e.department] = [];
        othersByDept[e.department].push(e);
      });
      
      // Filter direct reports by search
      let filteredDirectReports = directReportsViaField;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredDirectReports = directReportsViaField.filter(e => 
          e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
        );
      }
      
      // Separate managers from ICs
      const managers = filteredDirectReports.filter(e => e.accessLevel === 'Manager' || getReportsRecursive(e).length > 0);
      const nonManagers = filteredDirectReports.filter(e => e.accessLevel !== 'Manager' && getReportsRecursive(e).length === 0);
      
      return { myTeamMembers: nonManagers, myTeamManagers: managers, othersByDept };
    }
    
    // FALLBACK: If no reportsTo data, use department-based hierarchy
    // My team = same department as me (for Admins/Managers)
    let myDeptPeople = employees.filter(e => 
      e.id !== currentUser.id && 
      e.department === currentUser.department
    );
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      myDeptPeople = myDeptPeople.filter(e => 
        e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
      );
    }
    
    // Separate managers from ICs in my department
    const myTeamManagers = myDeptPeople.filter(e => e.accessLevel === 'Manager');
    const myTeamMembers = myDeptPeople.filter(e => e.accessLevel !== 'Manager');

    // Others = different departments
    let others = employees.filter(e => 
      e.id !== currentUser.id && 
      e.department !== currentUser.department
    );
    
    if (filterDept !== 'ALL') others = others.filter(e => e.department === filterDept);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      others = others.filter(e => e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
    }

    // Group others by department
    const othersByDept: Record<string, Employee[]> = {};
    others.forEach(e => {
      if (!othersByDept[e.department]) othersByDept[e.department] = [];
      othersByDept[e.department].push(e);
    });

    return { myTeamMembers, myTeamManagers, othersByDept };
  }, [employees, currentUser, filterDept, searchQuery]);

  // Team stats
  const teamStats = useMemo(() => {
    const allMyTeam = [...myTeamManagers, ...myTeamMembers];
    
    // Also count people under managers
    const getAllReportsFlat = (list: Employee[]): Employee[] => {
      let result: Employee[] = [];
      list.forEach(e => {
        result.push(e);
        const reports = employees.filter(emp => 
          emp.reportsTo === e.id || 
          emp.reportsTo === e.name ||
          (emp.reportsTo && emp.reportsTo.toLowerCase() === e.name.toLowerCase())
        );
        result = [...result, ...getAllReportsFlat(reports)];
      });
      return result;
    };
    
    const allPeople = getAllReportsFlat(allMyTeam);
    // Dedupe
    const uniquePeople = Array.from(new Map(allPeople.map(p => [p.id, p])).values());
    const teamItems = uniquePeople.flatMap(e => getEmployeeItems(e));
    
    return {
      people: uniquePeople.length,
      total: teamItems.length,
      blocked: teamItems.filter(i => i.status === Status.BLOCKED).length,
      active: teamItems.filter(i => i.status === Status.IN_PROGRESS).length,
      done: teamItems.filter(i => i.status === Status.DONE).length,
    };
  }, [myTeamManagers, myTeamMembers, employees, items]);

  return (
    <div className="pb-12">
      
      {/* Mission Control Header - Personal */}
      <MissionControl 
        employee={currentUser} 
        items={myItemsUnfiltered}
        statFilter={statFilter}
        onStatFilterChange={setStatFilter}
      />

      {/* My Goals Section - Always Visible */}
      {myItemsUnfiltered.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border border-slate-300 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">My Goals</h3>
                <p className="text-xs text-slate-500">{myItemsUnfiltered.length} goal{myItemsUnfiltered.length !== 1 ? 's' : ''} assigned to you</p>
              </div>
            </div>
            
            {/* Filter chips */}
            <div className="flex items-center gap-2">
              {statFilter !== 'all' && (
                <button 
                  onClick={() => setStatFilter('all')}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 mr-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </button>
              )}
              <span className="text-[10px] text-slate-500 uppercase tracking-wide mr-1">Show:</span>
              <button
                onClick={() => setStatFilter(statFilter === 'all' ? 'all' : 'all')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  statFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatFilter(statFilter === 'active' ? 'all' : 'active')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  statFilter === 'active' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatFilter(statFilter === 'blocked' ? 'all' : 'blocked')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  statFilter === 'blocked' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Blocked
              </button>
              <button
                onClick={() => setStatFilter(statFilter === 'done' ? 'all' : 'done')}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  statFilter === 'done' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Done
              </button>
            </div>
          </div>
          
          {/* Goals Grid */}
          <div className="p-5">
            {myItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myItems.map(item => {
                  const goal = goals.find(g => g.id === item.goalId);
                  return (
                    <div key={item.id} className="relative group">
                      {/* Goal context header */}
                      {goal && (
                        <div className="flex items-center gap-1.5 mb-2 px-1">
                          {goal.icon && <span className="text-sm opacity-60">{goal.icon}</span>}
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate">{goal.title}</span>
                        </div>
                      )}
                      <RoadmapCard 
                        item={item}
                        employees={employees}
                        onEdit={onEditItem}
                        onClick={onViewHistory}
                        onPushToHiBob={onPushToHiBob}
                        isPushing={pushingItems?.has(item.id)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">
                  No {statFilter === 'blocked' ? 'blocked' : statFilter === 'active' ? 'active' : statFilter === 'done' ? 'completed' : ''} goals
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Section (for Managers/Admins) */}
      {currentUser.accessLevel !== 'IC' && (
        <div className="space-y-4">
          {/* Team Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-300">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-3">
                Team Overview
                {teamStats.blocked > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    {teamStats.blocked} blocked
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {teamStats.people} people in your org • {teamStats.total} goals
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm w-48 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {onAddItem && (
                <button 
                  onClick={onAddItem}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <span className="text-base leading-none">+</span> New Goal
                </button>
              )}
            </div>
          </div>

          {/* Team Quick Stats */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>{teamStats.blocked} Blocked</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span>{teamStats.active} In Progress</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>{teamStats.done} Done</span>
            </div>
          </div>

          {/* My Team - Managers with their reports */}
          {myTeamManagers.length > 0 && (
            <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm mb-4">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-blue-900">
                    My Team — Managers
                  </h3>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {myTeamManagers.length} managers
                  </span>
                </div>
                <button
                  onClick={() => {
                    const allIds = myTeamManagers.map(e => e.id);
                    const allExpanded = allIds.every(id => expandedEmployees.has(id));
                    const newSet = new Set(expandedEmployees);
                    allIds.forEach(id => {
                      if (allExpanded) newSet.delete(id);
                      else newSet.add(id);
                    });
                    setExpandedEmployees(newSet);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {myTeamManagers.every(e => expandedEmployees.has(e.id)) ? 'Collapse all' : 'Expand all'}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {myTeamManagers.map(employee => (
                  <TeamMemberNode
                    key={employee.id}
                    employee={employee}
                    items={getEmployeeItems(employee)}
                    goals={goals}
                    employees={employees}
                    allItems={items}
                    isExpanded={expandedEmployees.has(employee.id)}
                    onToggle={() => toggleEmployee(employee.id)}
                    expandedSet={expandedEmployees}
                    onToggleAny={toggleEmployee}
                    onEditItem={onEditItem}
                    onViewHistory={onViewHistory}
                    onPushToHiBob={onPushToHiBob}
                    pushingItems={pushingItems}
                    getEmployeeItems={getEmployeeItems}
                  />
                ))}
              </div>
            </div>
          )}

          {/* My Team - Individual Contributors */}
          {myTeamMembers.length > 0 && (
            <div className="bg-white rounded-xl border border-teal-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <h3 className="text-sm font-semibold text-teal-900">
                    My Team — {currentUser.department}
                  </h3>
                  <span className="text-xs text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">
                    {myTeamMembers.length} people
                  </span>
                </div>
                <button
                  onClick={() => {
                    const allIds = myTeamMembers.map(e => e.id);
                    const allExpanded = allIds.every(id => expandedEmployees.has(id));
                    const newSet = new Set(expandedEmployees);
                    allIds.forEach(id => {
                      if (allExpanded) newSet.delete(id);
                      else newSet.add(id);
                    });
                    setExpandedEmployees(newSet);
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 hover:underline"
                >
                  {myTeamMembers.every(e => expandedEmployees.has(e.id)) ? 'Collapse all' : 'Expand all'}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {myTeamMembers.map(employee => (
                  <TeamMemberNode
                    key={employee.id}
                    employee={employee}
                    items={getEmployeeItems(employee)}
                    goals={goals}
                    employees={employees}
                    allItems={items}
                    isExpanded={expandedEmployees.has(employee.id)}
                    onToggle={() => toggleEmployee(employee.id)}
                    expandedSet={expandedEmployees}
                    onToggleAny={toggleEmployee}
                    onEditItem={onEditItem}
                    onViewHistory={onViewHistory}
                    onPushToHiBob={onPushToHiBob}
                    pushingItems={pushingItems}
                    getEmployeeItems={getEmployeeItems}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Departments */}
          {Object.keys(othersByDept).length > 0 && (
            <div className="space-y-3 mt-6">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Other Departments
                
                {/* Dept filter */}
                <select 
                  value={filterDept} 
                  onChange={e => setFilterDept(e.target.value)} 
                  className="ml-auto bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 outline-none focus:border-teal-500"
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </h3>
              
              {Object.entries(othersByDept).sort((a, b) => a[0].localeCompare(b[0])).map(([dept, deptMembers]) => {
                const isCollapsed = collapsedDepts.has(dept);
                const deptItems = deptMembers.flatMap(e => getEmployeeItems(e));
                const deptBlocked = deptItems.filter(i => i.status === Status.BLOCKED).length;
                
                return (
                  <div key={dept} className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-sm">
                    <div 
                      onClick={() => toggleDept(dept)}
                      className="px-4 py-3 bg-slate-100 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg 
                          className={`w-4 h-4 text-slate-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <h4 className="text-sm font-medium text-slate-700">{dept}</h4>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {deptMembers.length} people
                        </span>
                        {deptBlocked > 0 && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            {deptBlocked} blocked
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{deptItems.length} goals</span>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {deptMembers.map(employee => (
                          <TeamMemberNode
                            key={employee.id}
                            employee={employee}
                            items={getEmployeeItems(employee)}
                            goals={goals}
                            employees={employees}
                            allItems={items}
                            isExpanded={expandedEmployees.has(employee.id)}
                            onToggle={() => toggleEmployee(employee.id)}
                            expandedSet={expandedEmployees}
                            onToggleAny={toggleEmployee}
                            onEditItem={onEditItem}
                            onViewHistory={onViewHistory}
                            onPushToHiBob={onPushToHiBob}
                            pushingItems={pushingItems}
                            getEmployeeItems={getEmployeeItems}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {myTeamManagers.length === 0 && myTeamMembers.length === 0 && Object.keys(othersByDept).length === 0 && (
            <div className="bg-white rounded-xl border border-slate-300 p-8 text-center text-slate-500 shadow-sm">
              <p>No team members found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* IC View - Simple Personal Goals */}
      {currentUser.accessLevel === 'IC' && statFilter === 'all' && (
        <div className="bg-white rounded-xl border border-slate-300 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Your Goals</h3>
            {onAddItem && (
              <button 
                onClick={onAddItem}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <span>+</span> Add Goal
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals && goals.map(goal => {
              if (!goal) return null;
              const goalItems = myItemsUnfiltered.filter(i => i.goalId === goal.id);
              if (goalItems.length === 0) return null;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    {goal.icon && <span className="text-sm opacity-60">{goal.icon}</span>}
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{goal.title || 'Untitled'}</span>
                  </div>
                  <div className="space-y-2">
                    {goalItems.map(item => (
                      <RoadmapCard 
                        key={item.id}
                        item={item}
                        employees={employees}
                        onEdit={onEditItem}
                        onClick={onViewHistory}
                        onPushToHiBob={onPushToHiBob}
                        isPushing={pushingItems?.has(item.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualView;
