
import React from 'react';
import { RoadmapItem, ItemUpdate } from '../types';
import { HEALTH_STYLES } from '../constants';
import Modal from './Modal';

interface ItemHistoryModalProps {
  item: RoadmapItem;
  updates: ItemUpdate[];
  isOpen: boolean;
  onClose: () => void;
  onAddUpdate?: (item: RoadmapItem) => void;
  onEdit?: (item: RoadmapItem) => void;
  onEditUpdate?: (update: ItemUpdate) => void;
}

const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({ item, updates, isOpen, onClose, onAddUpdate, onEdit, onEditUpdate }) => {
  const sortedUpdates = [...updates].sort((a, b) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (a.year !== b.year) return b.year - a.year;
    return months.indexOf(b.month) - months.indexOf(a.month);
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'GREEN': return 'bg-emerald-500';
      case 'AMBER': return 'bg-amber-500';
      case 'RED': return 'bg-red-500';
      default: return 'bg-teal-500';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Goal Update History">
      <div className="space-y-6">
        {/* Goal Summary Card */}
        <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 relative">
          {onEdit && (
            <button 
              onClick={() => onEdit(item)}
              className="absolute top-4 right-4 bg-white border border-slate-300 hover:border-teal-300 text-slate-500 hover:text-teal-600 p-2 rounded-lg transition-colors"
              title="Edit Goal Details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.department}</span>
            {item.team && <span className="text-slate-500">•</span>}
            {item.team && <span className="text-xs text-slate-500">{item.team}</span>}
          </div>
          
          <h3 className="text-lg font-semibold text-slate-900 pr-10">{item.title}</h3>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="text-xs font-medium bg-white border border-slate-300 text-slate-600 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {item.owner}
            </div>
            <div className="text-xs font-medium bg-white border border-slate-300 text-slate-600 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Due {item.endDate}
            </div>
          </div>
        </div>

        {/* Updates Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-900">Timeline</h4>
            {onAddUpdate && (
              <button 
                onClick={() => onAddUpdate(item)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <span className="text-base leading-none">+</span> Add Update
              </button>
            )}
          </div>
          
          {/* Timeline */}
          <div className="relative ml-3 space-y-5 pl-6 py-2">
            {/* Timeline Line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
            
            {sortedUpdates.length > 0 ? sortedUpdates.map((u) => (
              <div key={u.id} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full ${getHealthColor(u.health)} border-2 border-white shadow`} />
                
                {/* Content */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {u.month} {u.year}
                    </span>
                    <span className={`
                      text-[10px] font-medium px-2 py-0.5 rounded-full
                      ${u.health === 'GREEN' ? 'bg-emerald-50 text-emerald-700' :
                        u.health === 'AMBER' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'}
                    `}>
                      {HEALTH_STYLES[u.health]?.label || 'Unknown'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 sm:ml-auto">
                    {new Date(u.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-slate-300 group-hover:border-teal-200 transition-colors relative">
                  {onEditUpdate && (
                    <button 
                      onClick={() => onEditUpdate(u)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-100 text-slate-500 hover:text-teal-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit this update"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pr-6">
                    {u.content}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">No updates yet</p>
                <p className="text-sm text-slate-500 mt-1">Add your first monthly update to track progress</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ItemHistoryModal;
