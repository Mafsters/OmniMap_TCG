
import React, { useState, useMemo } from 'react';
import { Employee, RoadmapItem, StrategicGoal, Status, Priority, HiBobConfig, GoalType, GoalCategory } from '../types';
import Modal from './Modal';

interface BulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  goals: StrategicGoal[];
  items: RoadmapItem[]; // Added existing items
  onSave: (items: RoadmapItem[], syncToHiBob: boolean) => void;
  onBulkPush: (items: RoadmapItem[]) => void; // New handler for existing items
}

const BulkCreateModal: React.FC<BulkCreateModalProps> = ({ isOpen, onClose, employees, goals, items, onSave, onBulkPush }) => {
  const [mode, setMode] = useState<'distribute' | 'rapid' | 'sync_existing'>('distribute');
  const [error, setError] = useState<string | null>(null);
  const [syncToHiBob, setSyncToHiBob] = useState(false);
  
  // HiBob Credentials State — initialize from localStorage (avoid setState in effect)
  const [hibobCreds, setHibobCreds] = useState<HiBobConfig>(() => {
    try {
      const saved = localStorage.getItem('omnimap_hibob_config');
      if (saved) return JSON.parse(saved) as HiBobConfig;
    } catch {
      // ignore
    }
    return { serviceId: '', token: '' };
  });
  const [showCreds, setShowCreds] = useState(() => {
    try {
      return !localStorage.getItem('omnimap_hibob_config');
    } catch {
      return true;
    }
  });

  const handleCredsChange = (field: keyof HiBobConfig, value: string) => {
      const newCreds = { ...hibobCreds, [field]: value };
      setHibobCreds(newCreds);
      localStorage.setItem('omnimap_hibob_config', JSON.stringify(newCreds));
  };

  // Determine if HiBob UI is relevant
  const isHiBobActive = (syncToHiBob && mode !== 'sync_existing') || mode === 'sync_existing';
  const hasCreds = !!(hibobCreds.serviceId && hibobCreds.token);

  // MODE 1: Distribute
  const [distributeData, setDistributeData] = useState({
    title: '',
    description: '',
    goalId: goals[0]?.id || '',
    priority: Priority.MEDIUM,
    endDate: '2026-12-31',
    goalType: 'PERSONAL' as GoalType,
    goalCategory: 'PERFORMANCE' as GoalCategory
  });
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());

  // MODE 2: Rapid Entry
  const [rapidRows, setRapidRows] = useState<Partial<RoadmapItem>[]>([
    { title: '', description: '', owner: '', goalId: goals[0]?.id || '', priority: Priority.MEDIUM, endDate: '', goalType: 'PERSONAL', goalCategory: 'PERFORMANCE' }
  ]);

  // MODE 3: Sync Existing
  const [existingSelection, setExistingSelection] = useState<Set<string>>(new Set());
  const [existingFilter, setExistingFilter] = useState('');

  // --- HELPERS ---

  const toggleEmp = (id: string) => {
    const next = new Set(selectedEmpIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmpIds(next);
  };

  const selectTeam = (teamName: string) => {
     const teamMembers = employees.filter(e => e.team === teamName).map(e => e.id);
     const next = new Set(selectedEmpIds);
     const allSelected = teamMembers.length > 0 && teamMembers.every(id => next.has(id));
     if (allSelected) teamMembers.forEach(id => next.delete(id));
     else teamMembers.forEach(id => next.add(id));
     setSelectedEmpIds(next);
  };

  const isTeamFullySelected = (teamName: string) => {
     const teamMembers = employees.filter(e => e.team === teamName);
     if (teamMembers.length === 0) return false;
     return teamMembers.every(e => selectedEmpIds.has(e.id));
  };

  // --- ACTIONS ---

  const validateCreds = () => {
      if (isHiBobActive && (!hibobCreds.serviceId || !hibobCreds.token)) {
          setError("Please enter your HiBob Service ID and Token below to proceed with Sync.");
          setShowCreds(true);
          return false;
      }
      // Note: manualGoalType is now optional - automatic mapping will use PERSONAL/DEPARTMENT/COMPANY selection
      return true;
  };

  const handleDistributeSave = () => {
    setError(null);
    if (!validateCreds()) return;

    if (!distributeData.title || selectedEmpIds.size === 0) {
      setError("Please provide a title and select at least one employee.");
      return;
    }
    const newItems: RoadmapItem[] = [];
    selectedEmpIds.forEach(empId => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;
      newItems.push({
        id: `bulk-${Math.random().toString(36).substr(2, 6)}`,
        ...distributeData,
        owner: emp.name, 
        department: emp.department,
        team: emp.team,
        status: Status.NOT_STARTED,
        startDate: new Date().toISOString().split('T')[0],
        tags: ['bulk-distribute'],
        progress: 0,
        goalType: distributeData.goalType || 'PERSONAL',
        goalCategory: distributeData.goalCategory || 'PERFORMANCE'
      } as RoadmapItem);
    });
    
    setDistributeData({ ...distributeData, title: '', description: '' });
    setSelectedEmpIds(new Set());
    onSave(newItems, syncToHiBob);
  };

  const handleRapidSave = () => {
    setError(null);
    if (!validateCreds()) return;

    const incompleteRows = rapidRows.filter(r => (r.title || r.owner) && (!r.title || !r.owner));
    if (incompleteRows.length > 0) {
      setError(`Cannot save: ${incompleteRows.length} row(s) are missing either a Title or an Owner.`);
      return;
    }

    const validRows = rapidRows.filter(r => r.title && r.owner);
    if (validRows.length === 0) {
        setError("Please enter at least one valid item with both Title and Owner.");
        return;
    }

    const newItems: RoadmapItem[] = validRows.map(r => {
      const emp = employees.find(e => e.name === r.owner || e.id === r.owner);
      return {
        id: `rapid-${Math.random().toString(36).substr(2, 6)}`,
        title: r.title,
        description: r.description || 'Rapid entry',
        goalId: r.goalId || goals[0].id,
        owner: r.owner,
        priority: r.priority || Priority.MEDIUM,
        endDate: r.endDate || '2026-12-31',
        department: emp?.department || 'Unassigned',
        team: emp?.team,
        status: Status.NOT_STARTED,
        startDate: new Date().toISOString().split('T')[0],
        tags: ['rapid-entry'],
        progress: 0,
        goalType: (r.goalType || 'PERSONAL') as GoalType,
        goalCategory: (r.goalCategory || 'PERFORMANCE') as GoalCategory
      } as RoadmapItem;
    });

    setRapidRows([{ title: '', owner: '', goalId: goals[0]?.id || '', priority: Priority.MEDIUM, endDate: '', goalType: 'PERSONAL', goalCategory: 'PERFORMANCE' }]);
    onSave(newItems, syncToHiBob);
  };

  const handleSyncExisting = () => {
      setError(null);
      if (!validateCreds()) return;
      if (existingSelection.size === 0) {
          setError("Select at least one item to push.");
          return;
      }
      const itemsToPush = items.filter(i => existingSelection.has(i.id));
      onBulkPush(itemsToPush);
  };

  // --- RAPID ROW HELPERS ---
  const updateRapidRow = (idx: number, field: keyof RoadmapItem, val: string) => {
    const newRows = [...rapidRows];
    newRows[idx] = { ...newRows[idx], [field]: val };
    setRapidRows(newRows);
    if (error) setError(null);
  };
  const addRapidRow = () => setRapidRows([...rapidRows, { title: '', description: '', owner: '', goalId: goals[0]?.id || '', priority: Priority.MEDIUM, endDate: '', goalType: 'PERSONAL', goalCategory: 'PERFORMANCE' }]);
  const removeRapidRow = (idx: number) => {
    if (rapidRows.length === 1) setRapidRows([{ title: '', description: '', owner: '', goalId: goals[0]?.id || '', priority: Priority.MEDIUM, endDate: '', goalType: 'PERSONAL', goalCategory: 'PERFORMANCE' }]);
    else setRapidRows(rapidRows.filter((_, i) => i !== idx));
  };
  const clearAllRapidRows = () => { if (window.confirm("Clear list?")) setRapidRows([{ title: '', description: '', owner: '', goalId: goals[0]?.id || '', priority: Priority.MEDIUM, endDate: '', goalType: 'PERSONAL', goalCategory: 'PERFORMANCE' }]); };

  // --- EXISTING SYNC HELPERS ---
  const filteredExistingItems = useMemo(() => {
      if (!existingFilter) return items;
      const lower = existingFilter.toLowerCase();
      return items.filter(i => i.title.toLowerCase().includes(lower) || i.owner.toLowerCase().includes(lower));
  }, [items, existingFilter]);

  const toggleExistingSelection = (id: string) => {
      const next = new Set(existingSelection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExistingSelection(next);
  };

  const toggleSelectAllExisting = () => {
      if (existingSelection.size === filteredExistingItems.length) {
          setExistingSelection(new Set());
      } else {
          setExistingSelection(new Set(filteredExistingItems.map(i => i.id)));
      }
  };

  const uniqueTeams = Array.from(new Set(employees.map(e => e.team).filter(Boolean))).sort();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Bulk Creator" maxWidth="max-w-6xl">
      <div className="flex flex-col h-[75vh]">
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl border border-slate-300 w-fit">
          <button onClick={() => { setMode('distribute'); setError(null); }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'distribute' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>Distribute Goal</button>
          <button onClick={() => { setMode('rapid'); setError(null); }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'rapid' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>Rapid List Entry</button>
          <button onClick={() => { setMode('sync_existing'); setError(null); }} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'sync_existing' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>Sync Existing</button>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {/* --- SYNC TO HIBOB TOGGLE (Visible in Create Modes) --- */}
        {mode !== 'sync_existing' && (
            <div className="absolute top-6 right-16">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-300">
                    <div className="relative inline-flex items-center">
                        <input type="checkbox" className="sr-only peer" checked={syncToHiBob} onChange={() => setSyncToHiBob(!syncToHiBob)} />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${syncToHiBob ? 'text-rose-600' : 'text-slate-500'}`}>{syncToHiBob ? 'Sync to HiBob' : 'Local Only'}</span>
                </label>
            </div>
        )}

        {/* --- HIBOB CONFIG PANEL (Always Visible if Active) --- */}
        {isHiBobActive && (
            <div className="bg-slate-100 border border-slate-300 p-4 rounded-xl mb-4 transition-all animate-in slide-in-from-top-1">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${hasCreds ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        HiBob Credentials
                    </h4>
                    {hasCreds && !showCreds && (
                        <button onClick={() => setShowCreds(true)} className="text-[9px] font-bold text-teal-600 hover:text-teal-700 underline">
                            Edit Credentials
                        </button>
                    )}
                </div>

                {!hasCreds || showCreds ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Service ID</label>
                                <input type="text" className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none font-medium text-slate-800 placeholder:text-slate-500" value={hibobCreds.serviceId} onChange={e => handleCredsChange('serviceId', e.target.value)} placeholder="Enter Service ID" />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Service Token</label>
                                <input type="password" className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none font-medium text-slate-800 placeholder:text-slate-500" value={hibobCreds.token} onChange={e => handleCredsChange('token', e.target.value)} placeholder="Enter Token" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                                Goal Type ID 
                                <span className="text-rose-500 ml-1">*</span>
                                <span className="text-[8px] text-slate-500 font-normal normal-case ml-1">(Use HiBob Test → &quot;Read Goals API&quot; to find)</span>
                            </label>
                            <input 
                                type="text" 
                                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-teal-100 focus:border-teal-400 outline-none font-medium text-slate-800 placeholder:text-slate-500" 
                                value={hibobCreds.manualGoalType || ''} 
                                onChange={e => handleCredsChange('manualGoalType', e.target.value)} 
                                placeholder="Enter Goal Type ID (optional - auto-mapped from Type selection)" 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-300">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-700 font-mono">ID: ••••••••{hibobCreds.serviceId.slice(-4)}</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">|</span>
                                <span className="text-xs text-slate-700 font-mono">Token: ••••••••••••</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Ready to Push</span>
                        </div>
                        {hibobCreds.manualGoalType ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                                <span className="text-[9px] font-bold text-emerald-600 uppercase">Goal Type ID: </span>
                                <span className="text-xs font-mono text-emerald-700">{hibobCreds.manualGoalType}</span>
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-300 p-2 rounded-lg">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">ℹ Auto-Mapping Enabled</span>
                                <span className="text-[8px] text-slate-500 block mt-1">Goal Type ID will be automatically mapped from your Type selection (PERSONAL/DEPARTMENT/COMPANY)</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* --- MODE 1: DISTRIBUTE --- */}
        {mode === 'distribute' && (
          <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
             <div className="md:w-1/3 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Goal Title</label>
                    <input type="text" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-800 placeholder:text-slate-500" value={distributeData.title} onChange={e => setDistributeData({...distributeData, title: e.target.value})} placeholder="e.g. Q1 Sales Training" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Details</label>
                    <textarea className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 min-h-[100px] text-slate-700 placeholder:text-slate-500" value={distributeData.description} onChange={e => setDistributeData({...distributeData, description: e.target.value})} placeholder="Description..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Big Rock</label>
                    <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={distributeData.goalId} onChange={e => setDistributeData({...distributeData, goalId: e.target.value})}>
                       {goals.map(g => <option key={g.id} value={g.id} className="bg-white">{g.title}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Priority</label>
                       <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={distributeData.priority} onChange={e => setDistributeData({...distributeData, priority: e.target.value as Priority})}>
                          {Object.values(Priority).map(p => <option key={p} value={p} className="bg-white">{p}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Due Date</label>
                       <input type="date" className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={distributeData.endDate} onChange={e => setDistributeData({...distributeData, endDate: e.target.value})} />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Type <span className="text-rose-500">*</span></label>
                       <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={distributeData.goalType} onChange={e => setDistributeData({...distributeData, goalType: e.target.value as GoalType})}>
                          <option value="PERSONAL" className="bg-white">Personal</option>
                          <option value="DEPARTMENT" className="bg-white">Department</option>
                          <option value="COMPANY" className="bg-white">Company</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Category <span className="text-rose-500">*</span></label>
                       <select className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={distributeData.goalCategory} onChange={e => setDistributeData({...distributeData, goalCategory: e.target.value as GoalCategory})}>
                          <option value="PERFORMANCE" className="bg-white">Performance</option>
                          <option value="DEVELOPMENT" className="bg-white">Development</option>
                       </select>
                     </div>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-300 md:pl-8 pt-4 md:pt-0 flex flex-col min-h-0">
                <div className="mb-2 flex flex-wrap gap-2">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pt-1 mr-2">Quick Select:</span>
                   {uniqueTeams.map(t => {
                      const isSelected = isTeamFullySelected(t as string);
                      return <button key={t} onClick={() => selectTeam(t as string)} className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{t}</button>;
                   })}
                   <button onClick={() => setSelectedEmpIds(new Set())} className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded text-[9px] font-bold uppercase ml-auto hover:bg-rose-100 transition-colors border border-rose-200">Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-100 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-3 gap-2 border border-slate-300 custom-scrollbar">
                   {employees.map(e => (
                     <label key={e.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedEmpIds.has(e.id) ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-300 hover:border-slate-300'}`}>
                        <input type="checkbox" checked={selectedEmpIds.has(e.id)} onChange={() => toggleEmp(e.id)} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-white border-slate-300" />
                        <div className="min-w-0">
                           <div className="text-xs font-bold text-slate-800 truncate">{e.name}</div>
                           <div className="text-[9px] text-slate-500 truncate">{e.team || e.department}</div>
                        </div>
                     </label>
                   ))}
                </div>
                <div className="pt-4">
                  <button onClick={handleDistributeSave} className={`w-full text-white py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg ${syncToHiBob ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-rose-200' : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-200'}`}>
                    {syncToHiBob ? `Create & Push ${selectedEmpIds.size} Goals` : `Create ${selectedEmpIds.size} Goals`}
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* --- MODE 2: RAPID ENTRY --- */}
        {mode === 'rapid' && (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex-1 overflow-y-auto border border-slate-300 rounded-xl custom-scrollbar relative bg-white">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                   <tr>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Goal Title <span className="text-rose-500">*</span></th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-52">Description</th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Owner <span className="text-rose-500">*</span></th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">Big Rock</th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28">Priority</th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28">Due Date</th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24">Type</th>
                     <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest w-28">Category</th>
                     <th className="p-3 w-10"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {rapidRows.map((row, idx) => (
                     <tr key={idx} className={`group ${!row.title && !row.owner ? 'opacity-50 hover:opacity-100' : ''}`}>
                       <td className="p-2 align-top"><input type="text" className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-800 placeholder:text-slate-500" placeholder="Goal Title..." value={row.title} onChange={e => updateRapidRow(idx, 'title', e.target.value)} /></td>
                       <td className="p-2 align-top"><input type="text" className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700 placeholder:text-slate-500" placeholder="Description..." value={row.description || ''} onChange={e => updateRapidRow(idx, 'description', e.target.value)} /></td>
                       <td className="p-2 align-top"><select className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={row.owner} onChange={e => updateRapidRow(idx, 'owner', e.target.value)}><option value="" className="bg-white">Select...</option>{employees.map(e => <option key={e.id} value={e.name} className="bg-white">{e.name}</option>)}</select></td>
                       <td className="p-2 align-top"><select className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={row.goalId} onChange={e => updateRapidRow(idx, 'goalId', e.target.value)}>{goals.map(g => <option key={g.id} value={g.id} className="bg-white">{g.title}</option>)}</select></td>
                       <td className="p-2 align-top"><select className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={row.priority} onChange={e => updateRapidRow(idx, 'priority', e.target.value)}>{Object.values(Priority).map(p => <option key={p} value={p} className="bg-white">{p}</option>)}</select></td>
                       <td className="p-2 align-top"><input type="date" className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={row.endDate || ''} onChange={e => updateRapidRow(idx, 'endDate', e.target.value)}/></td>
                       <td className="p-2 align-top"><select className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={row.goalType || 'PERSONAL'} onChange={e => updateRapidRow(idx, 'goalType', e.target.value)}><option value="PERSONAL" className="bg-white">Personal</option><option value="DEPARTMENT" className="bg-white">Dept</option><option value="COMPANY" className="bg-white">Company</option></select></td>
                       <td className="p-2 align-top"><select className="w-full bg-slate-100 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-700" value={row.goalCategory || 'PERFORMANCE'} onChange={e => updateRapidRow(idx, 'goalCategory', e.target.value)}><option value="PERFORMANCE" className="bg-white">Perf</option><option value="DEVELOPMENT" className="bg-white">Dev</option></select></td>
                       <td className="p-2 text-center align-top pt-3"><button onClick={() => removeRapidRow(idx)} className="text-slate-500 hover:text-rose-500 transition-colors" title="Delete Row">×</button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             <div className="pt-4 flex justify-between items-center border-t border-slate-300 mt-auto">
                <div className="flex gap-2">
                    <button onClick={addRapidRow} className="flex items-center gap-2 text-teal-600 text-xs font-black uppercase tracking-widest hover:text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors"><span>+</span> Add Row</button>
                    <button onClick={clearAllRapidRows} className="flex items-center gap-2 text-rose-500 text-xs font-black uppercase tracking-widest hover:text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors">Clear List</button>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{rapidRows.filter(r => r.title && r.owner).length} Valid Item(s)</span>
                    <button onClick={handleRapidSave} className={`text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg ${syncToHiBob ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-rose-200' : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-200'}`}>{syncToHiBob ? 'Create & Push' : 'Create Items'}</button>
                </div>
             </div>
          </div>
        )}

        {/* --- MODE 3: SYNC EXISTING --- */}
        {mode === 'sync_existing' && (
            <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-4 flex items-center justify-between">
                    <input 
                        type="text" 
                        placeholder="Filter by Goal or Owner..." 
                        className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 text-slate-800 placeholder:text-slate-500"
                        value={existingFilter}
                        onChange={e => setExistingFilter(e.target.value)}
                    />
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                        {existingSelection.size} Selected
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-300 rounded-xl custom-scrollbar bg-white">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox" checked={filteredExistingItems.length > 0 && existingSelection.size === filteredExistingItems.length} onChange={toggleSelectAllExisting} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer bg-white border-slate-300" />
                                </th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Goal Title</th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Owner</th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Dept</th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredExistingItems.map(item => (
                                <tr key={item.id} className={`hover:bg-slate-100 transition-colors cursor-pointer ${existingSelection.has(item.id) ? 'bg-teal-50' : ''}`} onClick={() => toggleExistingSelection(item.id)}>
                                    <td className="p-3"><input type="checkbox" checked={existingSelection.has(item.id)} onChange={() => toggleExistingSelection(item.id)} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer bg-white border-slate-300" /></td>
                                    <td className="p-3 text-sm font-bold text-slate-800">{item.title}</td>
                                    <td className="p-3 text-xs text-slate-500">{item.owner}</td>
                                    <td className="p-3 text-[10px] uppercase font-bold text-slate-500">{item.department}</td>
                                    <td className="p-3"><span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-300">{item.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="pt-4 flex justify-end border-t border-slate-300 mt-auto">
                    <button 
                        onClick={handleSyncExisting}
                        disabled={existingSelection.size === 0}
                        className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Push {existingSelection.size} Selected to HiBob
                    </button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkCreateModal;
