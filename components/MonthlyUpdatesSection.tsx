
import React, { useState } from 'react';
import { MonthlyUpdate, HealthStatus, StrategicGoal, Employee } from '../types';

interface MonthlyUpdatesSectionProps {
  currentUser?: Employee;
  goal: StrategicGoal;
  updates: MonthlyUpdate[];
  onAddUpdate: () => void;
  onEditUpdate?: (update: MonthlyUpdate) => void;
}

const MonthlyUpdatesSection: React.FC<MonthlyUpdatesSectionProps> = ({ currentUser, goal: _goal, updates, onAddUpdate, onEditUpdate }) => {
  const [filter, setFilter] = useState<HealthStatus | 'all'>('all');

  const filteredUpdates = updates
    .filter(u => filter === 'all' || u.status === filter)
    .sort((a, b) => {
      // Very simple date sorting (Year then Month index)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (a.year !== b.year) return b.year - a.year;
      return months.indexOf(b.month) - months.indexOf(a.month);
    });

  const getStatusColor = (status: HealthStatus) => {
    switch(status) {
      case HealthStatus.GREEN: return 'bg-emerald-500';
      case HealthStatus.AMBER: return 'bg-amber-500';
      case HealthStatus.RED: return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusLabel = (status: HealthStatus) => {
    switch(status) {
      case HealthStatus.GREEN: return 'On Track';
      case HealthStatus.AMBER: return 'At Risk';
      case HealthStatus.RED: return 'Blocked';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-slate-100 rounded-b-3xl border-x border-b border-slate-300 p-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-300 pb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Strategy Log</h3>
          <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-sm">
            {[
              { id: 'all', label: 'All', color: 'bg-slate-400' },
              { id: HealthStatus.GREEN, label: 'Green', color: 'bg-emerald-500' },
              { id: HealthStatus.AMBER, label: 'Amber', color: 'bg-amber-500' },
              { id: HealthStatus.RED, label: 'Red', color: 'bg-rose-500' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  filter === f.id ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${f.color}`}></div>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          onClick={onAddUpdate}
          className="bg-white border border-slate-300 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-slate-700"
        >
          + Post Update
        </button>
      </div>

      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 no-scrollbar">
        {filteredUpdates.length > 0 ? filteredUpdates.map(update => (
          <div key={update.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex gap-6 relative group hover:border-indigo-100 transition-colors">
            {/* Edit Button - Visible to Admins or Author */}
            {currentUser && onEditUpdate && (currentUser.accessLevel === 'Admin' || currentUser.id === update.authorId) && (
              <button 
                onClick={() => onEditUpdate(update)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 rounded-lg text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50 hover:text-indigo-600"
                title="Edit Update"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}

            <div className="flex flex-col items-center">
              <div className="text-xs font-black text-slate-900 uppercase leading-none">{update.month}</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">{update.year}</div>
              <div className="flex-1 w-px bg-slate-100 my-4"></div>
              <div className={`w-4 h-4 rounded-full ring-4 ring-white shadow-md ${getStatusColor(update.status)}`}></div>
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start mb-3">
                <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white ${getStatusColor(update.status)}`}>
                  {getStatusLabel(update.status)}
                </div>
                <div className="text-[9px] font-bold text-slate-300 uppercase italic">
                  Posted {new Date(update.createdAt).toLocaleDateString()}
                </div>
              </div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                {update.content}
              </p>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm border border-slate-100">📋</div>
             <div>
               <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No strategic updates logged</p>
               <p className="text-slate-500 text-[10px] mt-2 max-w-sm mx-auto leading-relaxed">
                 The Strategy Feed allows leadership to post high-level monthly summaries, RAG status changes, and executive commentary directly to this Big Rock.
               </p>
             </div>
             {filter === 'all' && (
               <button 
                  onClick={onAddUpdate}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all mt-2"
               >
                  Log First Update
               </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyUpdatesSection;
