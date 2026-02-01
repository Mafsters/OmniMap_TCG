
import React, { useState } from 'react';
import { RoadmapItem, Priority, Employee, Status } from '../types';
import { STATUS_COLORS, getDepartmentColor } from '../constants';

interface RoadmapCardProps {
  item: RoadmapItem;
  employees: Employee[];
  onClick?: (item: RoadmapItem) => void;
  onEdit?: (item: RoadmapItem) => void;
  onAddUpdate?: (item: RoadmapItem) => void;
  onPushToHiBob?: (item: RoadmapItem) => void;
  isPushing?: boolean;
}

const RoadmapCard: React.FC<RoadmapCardProps> = ({ item, employees, onClick, onEdit, onAddUpdate, onPushToHiBob, isPushing }) => {
  const [isHovered, setIsHovered] = useState(false);
  const owner = employees.find(e => e.id === item.owner || e.name === item.owner);

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'bg-red-50 text-red-700 border-red-200';
      case Priority.HIGH: return 'bg-orange-50 text-orange-700 border-orange-200';
      case Priority.MEDIUM: return 'bg-blue-50 text-blue-700 border-blue-200';
      case Priority.LOW: return 'bg-slate-100 text-slate-600 border-slate-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const getStatusStyle = (status: Status) => {
    switch (status) {
      case Status.NOT_STARTED: return 'bg-slate-100 text-slate-600 border-slate-300';
      case Status.IN_PROGRESS: return 'bg-teal-50 text-teal-700 border-teal-200';
      case Status.DONE: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case Status.BLOCKED: return 'bg-red-50 text-red-700 border-red-200';
      case Status.PAUSED: return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const isCritical = item.priority === Priority.CRITICAL || item.status === Status.BLOCKED;

  return (
    <div 
      className={`
        bg-white rounded-xl p-5 group flex flex-col transition-all duration-200 cursor-pointer
        border hover:shadow-card-hover
        ${isCritical 
          ? 'border-red-200' 
          : isHovered 
            ? 'border-teal-300' 
            : 'border-slate-300'
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(item)}
    >
      {/* Quick Actions - Always visible */}
      <div className="absolute top-3 right-3 flex gap-1.5 z-10">
        {onPushToHiBob && (
          <button 
            onClick={(e) => { e.stopPropagation(); if(!isPushing) onPushToHiBob(item); }}
            disabled={isPushing}
            className={`
              p-1.5 rounded-lg transition-all flex items-center gap-1
              ${isPushing 
                ? 'bg-slate-100 text-slate-500 cursor-wait' 
                : 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200 hover:border-teal-300'
              }
            `}
            title="Push to HiBob"
          >
            {isPushing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-[10px] font-medium hidden sm:inline">HiBob</span>
              </>
            )}
          </button>
        )}
        {item.jiraId && (
          <a 
            href={item.jiraUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            title="Open in Jira"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.5 2L4.5 4C2.5 6 2 11.5 2 11.5L11.5 21L21 11.5C21 11.5 21.5 6 19.5 4C17.5 2 12.5 2 11.5 2Z" />
            </svg>
          </a>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
          className={`
            p-1.5 rounded-lg transition-all border
            ${isHovered 
              ? 'bg-slate-100 text-slate-700 border-slate-300' 
              : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-100 hover:text-slate-600'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
      
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Department Color Bar */}
        <div className={`w-1 h-8 rounded-full ${getDepartmentColor(item.department)} shrink-0`} />
        
        <div className="flex-1 min-w-0">
          {/* Tags Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getPriorityStyle(item.priority)}`}>
              {item.priority}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusStyle(item.status)}`}>
              {item.status}
            </span>
            {item.team && (
              <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                {item.team}
              </span>
            )}
          </div>
          
          {/* Title */}
          <h3 className={`
            text-sm font-semibold text-slate-900 leading-snug transition-colors
            ${isHovered ? 'text-teal-600' : ''}
          `}>
            {item.title}
          </h3>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-3 flex-1">
        {item.description}
      </p>

      {/* Progress Bar */}
      {item.progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-medium text-teal-600">{item.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img 
            src={owner?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.owner)}&background=f1f5f9&color=475569`} 
            alt={owner?.name || 'Owner'} 
            className="w-6 h-6 rounded-full border border-slate-300 object-cover"
            title={owner?.name || item.owner}
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-700 leading-none">
              {owner?.name || item.owner}
            </span>
            <span className="text-[10px] text-slate-500 leading-none mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(item.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        
        {onAddUpdate && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAddUpdate(item);
            }}
            className={`
              text-xs font-medium px-2.5 py-1 rounded-lg transition-all
              ${isHovered 
                ? 'bg-teal-50 text-teal-600 opacity-100' 
                : 'opacity-0'
              }
            `}
          >
            + Update
          </button>
        )}
      </div>
    </div>
  );
};

export default RoadmapCard;
