
import React, { useState, useMemo } from 'react';
import { StrategicGoal, MonthlyUpdate } from '../types';
import { HEALTH_STYLES } from '../constants';

interface StatusMatrixProps {
  goals: StrategicGoal[];
  updates: MonthlyUpdate[];
  onAddUpdate: (goal: StrategicGoal, month: string, year: number) => void;
}

const StatusMatrix: React.FC<StatusMatrixProps> = ({ goals, updates, onAddUpdate }) => {
  const [selectedUpdate, setSelectedUpdate] = useState<MonthlyUpdate | null>(null);

  // Generate last 12 months for the matrix columns
  const timeframes = useMemo(() => {
    const frames = [];
    const today = new Date();
    // Go back 11 months + current
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      frames.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        label: `${d.toLocaleString('default', { month: 'short' })}`,
        key: `${d.getFullYear()}-${d.toLocaleString('default', { month: 'short' })}`
      });
    }
    return frames;
  }, []);

  const getUpdate = (goalId: string, month: string, year: number) => {
    return updates.find(u => u.goalId === goalId && u.month === month && u.year === year);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-slate-100 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Strategic Health Matrix</h2>
           <p className="text-sm text-slate-500 font-medium mt-1">12-Month rolling view of execution health across all Big Rocks.</p>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>On Track</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div>At Risk</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Blocked</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex border-b border-slate-100 bg-slate-100/50">
            <div className="w-80 p-4 shrink-0 sticky left-0 bg-slate-100 z-10 border-r border-slate-300/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Big Rock / Goal
            </div>
            {timeframes.map(tf => (
              <div key={tf.key} className="w-24 p-4 text-center border-r border-slate-100 last:border-r-0 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {tf.label} <span className="text-[8px] opacity-50 block">{tf.year}</span>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {goals.map(goal => (
            <div key={goal.id} className="flex border-b border-slate-100 last:border-b-0 hover:bg-slate-100/30 transition-colors group">
              <div className="w-80 p-4 shrink-0 sticky left-0 bg-white group-hover:bg-slate-100/30 transition-colors z-10 border-r border-slate-300/50 flex items-center gap-3">
                <div className="text-xl">{goal.icon}</div>
                <div className="text-xs font-bold text-slate-700 truncate">{goal.title}</div>
              </div>
              
              {timeframes.map(tf => {
                const update = getUpdate(goal.id, tf.month, tf.year);
                return (
                  <div key={`${goal.id}-${tf.key}`} className="w-24 p-2 border-r border-slate-100 last:border-r-0 flex items-center justify-center">
                    {update ? (
                      <button 
                        onClick={() => setSelectedUpdate(update)}
                        className={`w-full h-10 rounded-lg ${HEALTH_STYLES[update.status].color} shadow-sm hover:scale-105 hover:shadow-md transition-all flex items-center justify-center group/cell`}
                        title={`Click to read update for ${tf.month}`}
                      >
                         <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50 group-hover/cell:opacity-100 transition-opacity"></div>
                      </button>
                    ) : (
                      <button 
                        onClick={() => onAddUpdate(goal, tf.month, tf.year)}
                        className="w-full h-10 rounded-lg border-2 border-dashed border-slate-100 hover:border-slate-300 hover:bg-slate-100 transition-all flex items-center justify-center text-slate-200 hover:text-slate-500"
                        title="Add Update"
                      >
                        <span className="text-lg font-bold leading-none mb-0.5">+</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Quick View Modal for reading update content */}
      {selectedUpdate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedUpdate(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500`}>
                     {selectedUpdate.month} {selectedUpdate.year}
                   </span>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest text-white ${HEALTH_STYLES[selectedUpdate.status].color}`}>
                     {HEALTH_STYLES[selectedUpdate.status].label}
                   </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Monthly Update</h3>
              </div>
              <button onClick={() => setSelectedUpdate(null)} className="text-slate-500 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-slate-100 rounded-xl p-4 border border-slate-100 max-h-60 overflow-y-auto">
              <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                {selectedUpdate.content}
              </p>
            </div>
             <div className="mt-4 text-right text-[10px] text-slate-500 font-bold uppercase tracking-widest">
               Posted on {new Date(selectedUpdate.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusMatrix;
