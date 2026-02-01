
import React, { useState, useEffect } from 'react';
import { StrategicGoal } from '../types';

interface GoalFormProps {
  goal?: StrategicGoal;
  onSave: (goal: Partial<StrategicGoal>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

const GoalForm: React.FC<GoalFormProps> = ({ goal, onSave, onDelete, onCancel }) => {
  const [formData, setFormData] = useState<Partial<StrategicGoal>>({
    title: '',
    description: '',
    ...goal
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1.5">Strategic Title</label>
          <input
            required
            type="text"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-900 placeholder:text-slate-500 text-sm transition-colors"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Global Market Expansion"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1.5">Success Definition / Goal Description</label>
          <textarea
            required
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-900 placeholder:text-slate-500 min-h-[100px] text-sm transition-colors"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Define what success looks like for this rock..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          {goal?.id ? 'Update Goal' : 'Establish Goal'}
        </button>
        {goal?.id && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            className="px-5 py-3 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        )}
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

export default GoalForm;
