
import React, { useMemo, useState } from 'react';
import { StrategicGoal, RoadmapItem, Employee, MonthlyUpdate, HealthStatus, Priority, Status } from '../types';
import RoadmapCard from './RoadmapCard';
import MonthlyUpdatesSection from './MonthlyUpdatesSection';
import DashboardFilter from './DashboardFilter';
import { getDepartmentColor, HEALTH_STYLES } from '../constants';

interface AlignmentViewProps {
  currentUser: Employee;
  goals: StrategicGoal[];
  items: RoadmapItem[];
  employees: Employee[];
  updates: MonthlyUpdate[];
  onEditGoal?: (goal: StrategicGoal) => void;
  onAddGoal?: () => void;
  onEditItem?: (item: RoadmapItem) => void;
  onAddUpdate?: (goal: StrategicGoal) => void;
  onEditUpdate?: (update: MonthlyUpdate) => void;
  onViewHistory?: (item: RoadmapItem) => void;
  onPushToHiBob?: (item: RoadmapItem) => void;
  pushingItems?: Set<string>;
}

const AlignmentView: React.FC<AlignmentViewProps> = ({ 
  currentUser, goals, items, employees, updates, onEditGoal, onAddGoal, onEditItem, onAddUpdate, onEditUpdate, onViewHistory, onPushToHiBob, pushingItems
}) => {
  const [activeTab, setActiveTab] = useState<Record<string, 'initiatives' | 'updates'>>({});
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>(Object.values(Priority));
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>(Object.values(Status));

  const toggleFocusMode = () => {
    if (!isFocusMode) {
      setSelectedPriorities([Priority.CRITICAL, Priority.HIGH]);
      setSelectedStatuses([Status.BLOCKED, Status.IN_PROGRESS]);
      setIsFocusMode(true);
    } else {
      setSelectedPriorities(Object.values(Priority));
      setSelectedStatuses(Object.values(Status));
      setIsFocusMode(false);
    }
  };

  // Toggle expand/collapse - goals are collapsed by default
  // expandedGoals[id] === true means expanded, undefined/false means collapsed
  const toggleCollapse = (goalId: string) => {
    setExpandedGoals(prev => ({ ...prev, [goalId]: prev[goalId] !== true }));
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (isFocusMode) {
         const isUrgent = item.priority === Priority.CRITICAL || item.priority === Priority.HIGH;
         const isBlocked = item.status === Status.BLOCKED;
         return isUrgent || isBlocked;
      }
      if (!selectedPriorities.includes(item.priority)) return false;
      if (!selectedStatuses.includes(item.status)) return false;
      return true;
    });
  }, [items, isFocusMode, selectedPriorities, selectedStatuses]);

  const representedDepts = useMemo(() => {
    const depts = new Set<string>();
    filteredItems.forEach(i => depts.add(i.department));
    return Array.from(depts).sort();
  }, [filteredItems]);

  const toggleTab = (goalId: string, tab: 'initiatives' | 'updates') => {
    setActiveTab(prev => ({ ...prev, [goalId]: tab }));
  };

  const getLatestHealth = (goalId: string): HealthStatus | null => {
    const goalUpdates = updates.filter(u => u.goalId === goalId);
    if (goalUpdates.length === 0) return null;
    return goalUpdates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].status;
  };

  const getGoalColor = (index: number, title: string) => {
    const t = title.toLowerCase();
    // Match goals to their specific colors
    if (t.includes('eu') && t.includes('growth')) return 'bg-blue-900';     // EU Growth - dark blue
    if (t.includes('organic')) return 'bg-teal-600';                         // Organic Growth - green/teal
    if (t.includes('speed') || t.includes('market')) return 'bg-orange-500'; // Speed to Market - orange
    if (t.includes('trust')) return 'bg-red-600';                            // Trust - red
    if (t.includes('revenue')) return 'bg-slate-900';                        // Revenue - black
    if (t.includes('miscellaneous') || t.includes('misc')) return 'bg-slate-600'; // Miscellaneous - dark grey
    // Fallback colors
    const colors = ['bg-blue-900', 'bg-teal-600', 'bg-orange-500', 'bg-red-600', 'bg-slate-900', 'bg-slate-600'];
    return colors[index % colors.length];
  };

  const getGoalIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('eu') && t.includes('growth')) return '🌍';
    if (t.includes('organic')) return '🌱';
    if (t.includes('speed') || t.includes('market')) return '⚡';
    if (t.includes('trust')) return '🛡️';
    if (t.includes('revenue')) return '💰';
    if (t.includes('miscellaneous') || t.includes('misc')) return '📦';
    return '🎯';
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col-reverse md:flex-row justify-between items-start md:items-center gap-4">
        <DashboardFilter 
           selectedPriorities={selectedPriorities}
           setSelectedPriorities={setSelectedPriorities}
           selectedStatuses={selectedStatuses}
           setSelectedStatuses={setSelectedStatuses}
           isFocusMode={isFocusMode}
           toggleFocusMode={toggleFocusMode}
        />
        
        {onAddGoal && (
          <button 
            onClick={onAddGoal}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> New Big Rock
          </button>
        )}
      </div>

      {/* Goals */}
      <div className="space-y-6">
        {goals.length > 0 ? goals.map((goal, goalIndex) => {
          const goalItems = filteredItems.filter(i => i.goalId === goal.id);
          const totalGoalItems = items.filter(i => i.goalId === goal.id).length;
          const goalUpdates = updates.filter(u => u.goalId === goal.id);
          const currentTab = activeTab[goal.id] || 'initiatives';
          const health = getLatestHealth(goal.id);
          // Goals are collapsed by default (when expandedGoals[id] is undefined/false)
          // Only expanded when explicitly set to true
          const isCollapsed = expandedGoals[goal.id] !== true;
          
          return (
            <div key={goal.id} className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-card">
              {/* Goal Header */}
              <div 
                className={`${getGoalColor(goalIndex, goal.title)} p-5 cursor-pointer relative overflow-hidden`}
                onClick={() => toggleCollapse(goal.id)}
              >
                {/* Decorative Background Icon */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[80px] opacity-10 pointer-events-none select-none">
                  {getGoalIcon(goal.title)}
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(goal.id); }} 
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <svg 
                        className={`w-4 h-4 text-white transition-transform ${isCollapsed ? '-rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                     
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-semibold text-white">
                          {goal.title}
                        </h2>
                        {health && (
                          <div className={`w-2.5 h-2.5 rounded-full ${HEALTH_STYLES[health].color} border border-white/50`} />
                        )}
                      </div>
                      {!isCollapsed && (
                        <p className="text-white/80 text-sm max-w-2xl">
                          {goal.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {onEditGoal && !isCollapsed && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEditGoal(goal); }} 
                        className="text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-white transition-colors"
                      >
                        Edit
                      </button>
                    )}

                    {!isCollapsed && (
                      <div 
                        className="flex bg-white/20 p-1 rounded-lg" 
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => toggleTab(goal.id, 'initiatives')}
                          className={`
                            px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5
                            ${currentTab === 'initiatives' 
                              ? 'bg-white text-slate-900' 
                              : 'text-white/80 hover:text-white'
                            }
                          `}
                        >
                          Initiatives
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${currentTab === 'initiatives' ? 'bg-slate-100' : 'bg-white/20'}`}>
                            {isFocusMode ? goalItems.length : totalGoalItems}
                          </span>
                        </button>
                        <button
                          onClick={() => toggleTab(goal.id, 'updates')}
                          className={`
                            px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5
                            ${currentTab === 'updates' 
                              ? 'bg-white text-slate-900' 
                              : 'text-white/80 hover:text-white'
                            }
                          `}
                        >
                          Updates
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${currentTab === 'updates' ? 'bg-slate-100' : 'bg-white/20'}`}>
                            {goalUpdates.length}
                          </span>
                        </button>
                      </div>
                    )}

                    {isCollapsed && (
                      <span className="text-xs bg-white/20 px-2.5 py-1 rounded-lg text-white">
                        {totalGoalItems} Items
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body Content */}
              {!isCollapsed && (
                <div className="bg-slate-100 border-t border-slate-300">
                  {currentTab === 'initiatives' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 divide-x divide-slate-200">
                      {representedDepts.length > 0 ? representedDepts.map((dept) => {
                        const deptItems = goalItems.filter(i => i.department === dept);
                        if (deptItems.length === 0) return null;
                        return (
                          <div key={dept} className="p-5 min-h-[180px]">
                            <div className="flex items-center gap-2 mb-4">
                              <div className={`w-2.5 h-2.5 rounded-full ${getDepartmentColor(dept)}`} />
                              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {dept}
                              </h3>
                              <span className="ml-auto text-xs text-slate-500">
                                {deptItems.length}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {deptItems.map((item) => (
                                <RoadmapCard 
                                  key={item.id}
                                  item={item} 
                                  employees={employees} 
                                  onEdit={onEditItem} 
                                  onClick={onViewHistory} 
                                  onAddUpdate={onAddUpdate ? () => onViewHistory?.(item) : undefined} 
                                  onPushToHiBob={onPushToHiBob}
                                  isPushing={pushingItems?.has(item.id)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="col-span-full p-12 text-center">
                          <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <p className="text-slate-500">No initiatives linked yet</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <MonthlyUpdatesSection 
                      currentUser={currentUser} 
                      goal={goal} 
                      updates={goalUpdates} 
                      onAddUpdate={() => onAddUpdate?.(goal)} 
                      onEditUpdate={onEditUpdate} 
                    />
                  )}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-lg text-slate-700 font-semibold mb-1">No Big Rocks Found</p>
            <p className="text-slate-500 mb-4">Create your first strategic goal to get started</p>
            {onAddGoal && (
              <button 
                onClick={onAddGoal} 
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Create First Rock
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlignmentView;
