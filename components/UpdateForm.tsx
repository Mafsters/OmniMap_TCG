
import React, { useState } from 'react';
import { MonthlyUpdate, HealthStatus, StrategicGoal } from '../types';

interface UpdateFormProps {
  goal: StrategicGoal;
  existingUpdate?: MonthlyUpdate;
  onSave: (update: Partial<MonthlyUpdate>) => void;
  onCancel: () => void;
}

const UpdateForm: React.FC<UpdateFormProps> = ({ goal, existingUpdate, onSave, onCancel }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<Partial<MonthlyUpdate>>({
    goalId: goal.id,
    month: currentMonth,
    year: currentYear,
    status: HealthStatus.GREEN,
    content: '',
    ...existingUpdate
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Month</label>
          <select 
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
            value={formData.month}
            onChange={e => setFormData({ ...formData, month: e.target.value })}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Year</label>
          <input 
            type="number" 
            className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
            value={formData.year}
            onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Current Health</label>
        <div className="flex gap-4">
          {[
            { id: HealthStatus.GREEN, color: 'bg-emerald-500', label: 'On Track' },
            { id: HealthStatus.AMBER, color: 'bg-amber-500', label: 'At Risk' },
            { id: HealthStatus.RED, color: 'bg-rose-500', label: 'Blocked' }
          ].map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => setFormData({ ...formData, status: h.id })}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                formData.status === h.id ? `border-slate-900 ${h.color} text-white` : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${formData.status === h.id ? 'bg-white' : h.color}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{h.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Progress Update</label>
        <textarea
          required
          placeholder="What's happened this month? Key wins, blockers, and next steps..."
          className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 min-h-[150px]"
          value={formData.content}
          onChange={e => setFormData({ ...formData, content: e.target.value })}
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          className="flex-1 bg-teal-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
        >
          {existingUpdate ? 'Save Changes' : 'Publish Update'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default UpdateForm;
