
import React, { useState, useMemo, useEffect } from 'react';
import { RoadmapItem, StrategicGoal, Employee, Status, Priority, GoalType, GoalCategory } from '../types';

interface ItemFormProps {
  item?: Partial<RoadmapItem>;
  goals: StrategicGoal[];
  employees: Employee[];
  departments: string[];
  onSave: (item: Partial<RoadmapItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, goals, employees, departments, onSave, onDelete, onCancel }) => {
  const [formData, setFormData] = useState<Partial<RoadmapItem>>({
    title: '',
    description: '',
    goalId: goals[0]?.id || '',
    owner: '',
    department: departments[0] || 'Product',
    team: '',
    status: Status.NOT_STARTED,
    priority: Priority.MEDIUM,
    progress: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    tags: [],
    goalType: 'PERSONAL',
    goalCategory: 'PERFORMANCE',
    ...item
  });

  const teamsInCurrentDept = useMemo(() => {
    const teams = new Set<string>();
    employees
      .filter(e => e.department.toLowerCase() === formData.department?.toLowerCase() && e.team)
      .forEach(e => teams.add(e.team!));
    return Array.from(teams).sort();
  }, [employees, formData.department]);

  const filteredOwners = useMemo(() => {
    return employees
      .filter(e => e.department.toLowerCase() === formData.department?.toLowerCase())
      .sort((a, b) => {
        if (a.isHoD && !b.isHoD) return -1;
        if (!a.isHoD && b.isHoD) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [employees, formData.department]);

  useEffect(() => {
    if (filteredOwners.length > 0) {
      const currentOwnerExists = filteredOwners.some(e => e.name === formData.owner || e.id === formData.owner);
      if (!currentOwnerExists) {
        const defaultOwner = filteredOwners.find(e => e.isHoD) || filteredOwners[0];
        setFormData(prev => ({ ...prev, owner: defaultOwner.name }));
      }
    } else {
      setFormData(prev => ({ ...prev, owner: '' }));
    }
  }, [formData.department, filteredOwners]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const labelClass = "text-xs font-medium text-slate-600 block mb-1.5";
  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-900 text-sm transition-colors";
  const selectClass = "w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-900 text-sm transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={labelClass}>Goal Title</label>
          <input
            required
            type="text"
            placeholder="What is the high-level objective?"
            className={inputClass}
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Details & Context</label>
          <textarea
            required
            placeholder="Describe the scope and impact..."
            className={`${inputClass} min-h-[80px]`}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Lead Department</label>
          <select
            className={selectClass}
            value={formData.department}
            onChange={e => setFormData({ ...formData, department: e.target.value, team: '' })}
          >
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Sub-Team (Optional)</label>
          <select
            className={selectClass}
            value={formData.team}
            onChange={e => setFormData({ ...formData, team: e.target.value })}
          >
            <option value="">No specific team</option>
            {teamsInCurrentDept.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Responsible Owner</label>
          <select
            className={selectClass}
            value={formData.owner}
            onChange={e => setFormData({ ...formData, owner: e.target.value })}
          >
            {filteredOwners.length > 0 ? (
              filteredOwners.map(e => (
                <option key={e.id} value={e.name}>
                  {e.isHoD ? '⭐ ' : ''}{e.name}
                </option>
              ))
            ) : (
              <option value="">No employees in this department</option>
            )}
          </select>
        </div>

        <div>
          <label className={labelClass}>Big Rock Alignment</label>
          <select
            className={selectClass}
            value={formData.goalId}
            onChange={e => setFormData({ ...formData, goalId: e.target.value })}
          >
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            className={selectClass}
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
          >
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Priority</label>
          <select
            className={selectClass}
            value={formData.priority}
            onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
          >
            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Start Date</label>
          <input
            type="date"
            className={inputClass}
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>End Date</label>
          <input
            type="date"
            className={inputClass}
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Type <span className="text-red-500">*</span></label>
          <select
            className={selectClass}
            value={formData.goalType || 'PERSONAL'}
            onChange={e => setFormData({ ...formData, goalType: e.target.value as GoalType })}
          >
            <option value="PERSONAL">Personal</option>
            <option value="DEPARTMENT">Department</option>
            <option value="COMPANY">Company</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Category <span className="text-red-500">*</span></label>
          <select
            className={selectClass}
            value={formData.goalCategory || 'PERFORMANCE'}
            onChange={e => setFormData({ ...formData, goalCategory: e.target.value as GoalCategory })}
          >
            <option value="PERFORMANCE">Performance</option>
            <option value="DEVELOPMENT">Development</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          {item?.id ? 'Update Goal' : 'Confirm Goal'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ItemForm;
