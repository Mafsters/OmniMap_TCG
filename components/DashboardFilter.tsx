
import React from 'react';
import { Priority, Status } from '../types';

interface DashboardFilterProps {
  selectedPriorities: Priority[];
  setSelectedPriorities: (p: Priority[]) => void;
  selectedStatuses: Status[];
  setSelectedStatuses: (s: Status[]) => void;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
}

const DashboardFilter: React.FC<DashboardFilterProps> = ({
  selectedPriorities,
  setSelectedPriorities,
  selectedStatuses,
  setSelectedStatuses,
  isFocusMode,
  toggleFocusMode
}) => {

  const togglePriority = (p: Priority) => {
    if (selectedPriorities.includes(p)) {
      setSelectedPriorities(selectedPriorities.filter(item => item !== p));
    } else {
      setSelectedPriorities([...selectedPriorities, p]);
    }
  };

  const toggleStatus = (s: Status) => {
    if (selectedStatuses.includes(s)) {
      setSelectedStatuses(selectedStatuses.filter(item => item !== s));
    } else {
      setSelectedStatuses([...selectedStatuses, s]);
    }
  };

  const getPriorityStyle = (p: Priority, isSelected: boolean) => {
    const base = "border transition-all";
    
    if (!isSelected) {
      return `${base} bg-white border-slate-300 text-slate-500 hover:border-slate-300 hover:text-slate-500`;
    }

    switch (p) {
      case Priority.CRITICAL: return `${base} bg-red-50 border-red-200 text-red-700`;
      case Priority.HIGH: return `${base} bg-orange-50 border-orange-200 text-orange-700`;
      case Priority.MEDIUM: return `${base} bg-blue-50 border-blue-200 text-blue-700`;
      case Priority.LOW: return `${base} bg-slate-100 border-slate-300 text-slate-600`;
      default: return '';
    }
  };

  const getStatusStyle = (s: Status, isSelected: boolean) => {
    const base = "border transition-all";

    if (!isSelected) {
      return `${base} bg-white border-slate-300 text-slate-500 hover:border-slate-300 hover:text-slate-500`;
    }

    switch (s) {
      case Status.NOT_STARTED: return `${base} bg-slate-100 border-slate-300 text-slate-600`;
      case Status.IN_PROGRESS: return `${base} bg-teal-50 border-teal-200 text-teal-700`;
      case Status.DONE: return `${base} bg-emerald-50 border-emerald-200 text-emerald-700`;
      case Status.BLOCKED: return `${base} bg-red-50 border-red-200 text-red-700`;
      case Status.PAUSED: return `${base} bg-amber-50 border-amber-200 text-amber-700`;
      default: return '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-lg border border-slate-300 w-fit">
      
      {/* Focus Mode Toggle */}
      <button
        onClick={toggleFocusMode}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
          ${isFocusMode 
            ? 'bg-teal-600 text-white' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }
        `}
      >
        <span className={`w-2 h-2 rounded-full ${isFocusMode ? 'bg-white' : 'bg-slate-400'}`} />
        Focus
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

      {/* Priority Filters */}
      <div className="flex items-center gap-1">
        {Object.values(Priority).map(p => (
          <button
            key={p}
            onClick={() => !isFocusMode && togglePriority(p)}
            disabled={isFocusMode}
            className={`
              px-2.5 py-1 rounded-md text-[10px] font-medium
              ${getPriorityStyle(p, selectedPriorities.includes(p))}
              ${isFocusMode ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

      {/* Status Filters */}
      <div className="flex items-center gap-1">
        {Object.values(Status).map(s => (
          <button
            key={s}
            onClick={() => !isFocusMode && toggleStatus(s)}
            disabled={isFocusMode}
            className={`
              px-2.5 py-1 rounded-md text-[10px] font-medium
              ${getStatusStyle(s, selectedStatuses.includes(s))}
              ${isFocusMode ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardFilter;
