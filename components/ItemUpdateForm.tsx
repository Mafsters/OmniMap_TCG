
import React, { useState } from 'react';
import { RoadmapItem, ItemUpdate, HealthStatus } from '../types';

interface ItemUpdateFormProps {
  item: RoadmapItem;
  existingUpdate?: ItemUpdate;
  onSave: (update: Partial<ItemUpdate>) => void;
  onCancel: () => void;
}

const ItemUpdateForm: React.FC<ItemUpdateFormProps> = ({ item, existingUpdate, onSave, onCancel }) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = months[new Date().getMonth()];
  
  const [formData, setFormData] = useState<Partial<ItemUpdate>>({
    itemId: item.id,
    month: currentMonth,
    year: new Date().getFullYear(),
    health: HealthStatus.GREEN,
    content: '',
    ...existingUpdate
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 mb-5">
        <h4 className="text-xs font-medium text-slate-500 mb-1">Updating Goal</h4>
        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1.5">Month</label>
          <select 
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 text-sm transition-colors"
            value={formData.month}
            onChange={e => setFormData({ ...formData, month: e.target.value })}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1.5">Year</label>
          <input 
            type="number" 
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 text-sm transition-colors"
            value={formData.year}
            onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-2">Execution Health</label>
        <div className="flex gap-2">
          {[
            { id: HealthStatus.GREEN, color: 'bg-emerald-500', borderColor: 'border-emerald-500', bgColor: 'bg-emerald-50', label: 'On Track' },
            { id: HealthStatus.AMBER, color: 'bg-amber-500', borderColor: 'border-amber-500', bgColor: 'bg-amber-50', label: 'At Risk' },
            { id: HealthStatus.RED, color: 'bg-red-500', borderColor: 'border-red-500', bgColor: 'bg-red-50', label: 'Blocked' }
          ].map(h => (
            <button
              key={h.id}
              type="button"
              onClick={() => setFormData({ ...formData, health: h.id })}
              className={`flex-1 py-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                formData.health === h.id 
                  ? `${h.borderColor} ${h.bgColor}` 
                  : 'border-slate-300 bg-white hover:bg-slate-100'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${h.color}`}></div>
              <span className={`text-[10px] font-medium ${formData.health === h.id ? 'text-slate-900' : 'text-slate-500'}`}>{h.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1.5">Update Details</label>
        <textarea
          required
          placeholder="Briefly describe progress, issues, or key achievements for this period..."
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 placeholder:text-slate-500 min-h-[120px] text-sm transition-colors"
          value={formData.content}
          onChange={e => setFormData({ ...formData, content: e.target.value })}
        />
      </div>

      <div className="flex gap-3 pt-3">
        <button
          type="submit"
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Save Update
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

export default ItemUpdateForm;
