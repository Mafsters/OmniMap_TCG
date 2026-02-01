
import React, { useState } from 'react';
import { Employee, RoadmapItem, StrategicGoal, Status, Priority } from '../types';
import { STATUS_COLORS } from '../constants';
import Modal from './Modal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  items: RoadmapItem[];
  goals: StrategicGoal[];
  onSaveItem: (item: Partial<RoadmapItem>) => void;
  onEditItem: (item: RoadmapItem) => void;
  onSignOut: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, onClose, currentUser, items, goals, onSaveItem, onEditItem, onSignOut 
}) => {
  const userItems = items.filter(i => i.owner === currentUser.id || i.owner === currentUser.name);
  
  // Quick Add State
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<RoadmapItem>>({
    title: '',
    status: Status.NOT_STARTED,
    priority: Priority.MEDIUM,
    goalId: goals[0]?.id || ''
  });

  const handleQuickAdd = () => {
    if (!newItem.title) return;
    onSaveItem({
      ...newItem,
      owner: currentUser.name,
      department: currentUser.department,
      team: currentUser.team,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      description: 'Quickly added via profile.'
    });
    setNewItem({ title: '', status: Status.NOT_STARTED, priority: Priority.MEDIUM, goalId: goals[0]?.id || '' });
    setIsAdding(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Workspace">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar: Profile Info */}
        <div className="md:w-1/3 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
           <div className="relative mb-4">
             <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-sm" />
             <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm border border-slate-100">
               <span className="text-xl">👋</span>
             </div>
           </div>
           <h3 className="text-xl font-black text-slate-900">{currentUser.name}</h3>
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{currentUser.role}</p>
           <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-6">
             {currentUser.department} {currentUser.team ? `• ${currentUser.team}` : ''}
           </span>

           <div className="w-full bg-slate-100 rounded-xl p-4 mb-auto">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-black text-slate-500 uppercase">My Load</span>
                 <span className="text-[10px] font-bold text-slate-800">{userItems.length} Active Items</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                 <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, (userItems.length / 10) * 100)}%` }}></div>
              </div>
           </div>

           <button 
             onClick={onSignOut}
             className="w-full mt-6 border border-rose-100 text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
           >
             Sign Out
           </button>
        </div>

        {/* Main: Task List */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">My Active Goals</h4>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors"
            >
              {isAdding ? 'Cancel' : '+ Quick Add'}
            </button>
          </div>

          {/* Quick Add Form */}
          {isAdding && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl mb-4 animate-in slide-in-from-top-2">
               <div className="flex flex-col gap-3">
                 <input 
                   type="text" 
                   placeholder="Goal Title..."
                   autoFocus
                   className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                   value={newItem.title}
                   onChange={e => setNewItem({...newItem, title: e.target.value})}
                 />
                 <div className="flex gap-2">
                    <select 
                      className="bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-medium outline-none"
                      value={newItem.goalId}
                      onChange={e => setNewItem({...newItem, goalId: e.target.value})}
                    >
                      {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                    <select 
                      className="bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs font-medium outline-none"
                      value={newItem.priority}
                      onChange={e => setNewItem({...newItem, priority: e.target.value as Priority})}
                    >
                      {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button 
                      onClick={handleQuickAdd}
                      className="bg-indigo-600 text-white px-4 rounded-lg text-xs font-black uppercase tracking-widest ml-auto shadow-sm"
                    >
                      Add
                    </button>
                 </div>
               </div>
            </div>
          )}

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {userItems.length > 0 ? userItems.map(item => (
              <div key={item.id} className="group bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-indigo-200 transition-all flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className={`w-1.5 h-1.5 rounded-full ${
                       item.priority === Priority.CRITICAL ? 'bg-rose-500' :
                       item.priority === Priority.HIGH ? 'bg-orange-500' : 'bg-blue-400'
                     }`}></span>
                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate">{goals.find(g => g.id === item.goalId)?.title || 'General'}</span>
                   </div>
                   <h5 className="text-sm font-bold text-slate-800 truncate">{item.title}</h5>
                </div>
                
                <div className="flex items-center gap-3">
                   <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[item.status]}`}>
                     {item.status}
                   </span>
                   <button 
                     onClick={() => { onClose(); onEditItem(item); }}
                     className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                   </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-500 text-xs font-medium italic bg-slate-100 rounded-xl border border-dashed border-slate-300">
                No goals assigned yet. Use Quick Add above!
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UserProfileModal;
