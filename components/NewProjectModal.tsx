import React, { useState } from 'react';
import { StrategicGoal, RoadmapItem, Employee, Status, Priority, GoalType, GoalCategory } from '../types';
import Modal from './Modal';
import { suggestGoalFromObjective, breakDownObjective, SuggestGoalResult, BreakDownResult } from '../services/geminiService';
import { getGoalStyle } from '../constants';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: StrategicGoal[];
  employees: Employee[];
  departments: string[];
  onSave: (newGoal: StrategicGoal | null, items: RoadmapItem[]) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  goals,
  employees,
  departments,
  onSave
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 → 2: suggested goal
  const [suggestedGoal, setSuggestedGoal] = useState<SuggestGoalResult | null>(null);
  const [useExistingGoalId, setUseExistingGoalId] = useState<string | ''>('');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');

  // Step 2 → 3: breakdown result
  const [breakdown, setBreakdown] = useState<BreakDownResult | null>(null);
  const [taskRows, setTaskRows] = useState<Partial<RoadmapItem>[]>([]);
  const [resolvedGoalId, setResolvedGoalId] = useState<string | null>(null);
  const [resolvedGoalStyle, setResolvedGoalStyle] = useState<{ color: string; icon: string } | null>(null);

  const reset = () => {
    setStep(1);
    setObjective('');
    setSuggestedGoal(null);
    setUseExistingGoalId('');
    setNewGoalTitle('');
    setNewGoalDescription('');
    setBreakdown(null);
    setTaskRows([]);
    setResolvedGoalId(null);
    setResolvedGoalStyle(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStep1Next = async () => {
    const trimmed = objective.trim();
    if (!trimmed) {
      setError('Enter an objective (e.g. "collectingcars wants to launch a merch store").');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await suggestGoalFromObjective(trimmed, goals);
      setSuggestedGoal(result);
      setNewGoalTitle(result.goalTitle);
      setNewGoalDescription(result.goalDescription);
      setUseExistingGoalId(result.matchedGoalId || '');
      setStep(2);
    } catch (e) {
      setError('Could not suggest a goal. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = async () => {
    let goalId: string;
    let goalTitle: string;
    let goalDescription: string;
    let style: { color: string; icon: string };

    if (useExistingGoalId) {
      const existing = goals.find(g => g.id === useExistingGoalId);
      if (!existing) {
        setError('Selected goal not found.');
        return;
      }
      goalId = existing.id;
      goalTitle = existing.title;
      goalDescription = existing.description;
      style = { color: existing.color, icon: existing.icon };
    } else {
      if (!newGoalTitle.trim()) {
        setError('Enter a goal title.');
        return;
      }
      goalId = `goal-${Math.random().toString(36).substr(2, 5)}`;
      goalTitle = newGoalTitle.trim();
      goalDescription = newGoalDescription.trim();
      style = getGoalStyle(goals.length, goalTitle);
    }

    setResolvedGoalId(goalId);
    setResolvedGoalStyle(style);
    setError(null);
    setLoading(true);
    try {
      const result = await breakDownObjective(objective.trim(), goals, employees);
      setBreakdown(result);
      const rows = (result.tasks && result.tasks.length > 0)
        ? result.tasks.map(t => ({
            ...t,
            goalId,
            title: t.title || '',
            description: t.description || '',
            department: t.department || departments[0] || 'Operations',
            owner: t.owner || 'Unassigned',
            priority: (t.priority as Priority) || Priority.MEDIUM
          }))
        : [{ goalId, title: '', description: '', department: departments[0] || 'Operations', owner: 'Unassigned', priority: Priority.MEDIUM }];
      setTaskRows(rows);
      setStep(3);
    } catch (e) {
      setError('Could not break down tasks. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskRow = (idx: number, field: keyof RoadmapItem, value: string | Priority) => {
    const next = [...taskRows];
    next[idx] = { ...next[idx], [field]: value };
    setTaskRows(next);
  };

  const addTaskRow = () => {
    setTaskRows([
      ...taskRows,
      {
        goalId: resolvedGoalId || '',
        title: '',
        description: '',
        department: departments[0] || 'Operations',
        owner: employees[0]?.name || 'Unassigned',
        priority: Priority.MEDIUM
      }
    ]);
  };

  const removeTaskRow = (idx: number) => {
    if (taskRows.length <= 1) return;
    setTaskRows(taskRows.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const valid = taskRows.filter(r => r.title && r.title.trim());
    if (valid.length === 0) {
      setError('Add at least one task with a title.');
      return;
    }
    if (!resolvedGoalId || !resolvedGoalStyle) return;

    const useExisting = goals.some(g => g.id === resolvedGoalId);
    const newGoal: StrategicGoal | null = useExisting
      ? null
      : {
          id: resolvedGoalId,
          title: newGoalTitle.trim(),
          description: newGoalDescription.trim(),
          color: resolvedGoalStyle.color,
          icon: resolvedGoalStyle.icon
        };

    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = '2026-12-31';
    const items: RoadmapItem[] = valid.map((t, i) => ({
      id: `proj-${Math.random().toString(36).substr(2, 6)}`,
      goalId: resolvedGoalId,
      title: (t.title || '').trim(),
      description: (t.description || '').trim() || 'Project task',
      department: t.department || 'Operations',
      team: t.team,
      owner: (t.owner || 'Unassigned').trim(),
      status: Status.NOT_STARTED,
      priority: (t.priority as Priority) || Priority.MEDIUM,
      startDate,
      endDate,
      tags: ['project-manager'],
      progress: 0,
      goalType: 'PERSONAL' as GoalType,
      goalCategory: 'PERFORMANCE' as GoalCategory
    }));

    onSave(newGoal, items);
    handleClose();
  };

  const labelClass = 'text-xs font-medium text-slate-600 block mb-1.5';
  const inputClass = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-900 text-sm';
  const selectClass = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-900 text-sm';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New project" maxWidth="max-w-3xl">
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Enter the high-level objective. This will become (or link to) a goal, then we&apos;ll break it into tasks and suggest owners.
          </p>
          <div>
            <label className={labelClass}>Objective</label>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              placeholder="e.g. collectingcars wants to launch a merch store"
              value={objective}
              onChange={e => setObjective(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStep1Next}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && suggestedGoal && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Confirm or edit the goal, then we&apos;ll break it into tasks.</p>
          <div>
            <label className={labelClass}>Link to existing goal (optional)</label>
            <select
              className={selectClass}
              value={useExistingGoalId}
              onChange={e => setUseExistingGoalId(e.target.value)}
            >
              <option value="">Create new goal</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>
          {!useExistingGoalId && (
            <>
              <div>
                <label className={labelClass}>Goal title</label>
                <input
                  className={inputClass}
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Launch merch store"
                />
              </div>
              <div>
                <label className={labelClass}>Goal description</label>
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={newGoalDescription}
                  onChange={e => setNewGoalDescription(e.target.value)}
                  placeholder="What success looks like..."
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
              Back
            </button>
            <button
              type="button"
              onClick={handleStep2Next}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Breaking down...' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && resolvedGoalId && resolvedGoalStyle && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Edit tasks and owners, then save. These will appear as goals under the same rock.</p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {taskRows.map((row, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">Task {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeTaskRow(idx)}
                    disabled={taskRows.length <= 1}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-40 text-xs"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <input
                      className={inputClass}
                      placeholder="Title"
                      value={row.title || ''}
                      onChange={e => updateTaskRow(idx, 'title', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <textarea
                      className={`${inputClass} min-h-[60px]`}
                      placeholder="Description"
                      value={row.description || ''}
                      onChange={e => updateTaskRow(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <select
                      className={selectClass}
                      value={row.department || ''}
                      onChange={e => updateTaskRow(idx, 'department', e.target.value)}
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      className={selectClass}
                      value={row.owner || ''}
                      onChange={e => updateTaskRow(idx, 'owner', e.target.value)}
                    >
                      <option value="Unassigned">Unassigned</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.name}>{e.name} {e.department ? `(${e.department})` : ''}</option>
                      ))}
                      {employees.length === 0 && <option value="Unassigned">No employees loaded</option>}
                    </select>
                  </div>
                  <div>
                    <select
                      className={selectClass}
                      value={row.priority || Priority.MEDIUM}
                      onChange={e => updateTaskRow(idx, 'priority', e.target.value as Priority)}
                    >
                      {Object.values(Priority).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTaskRow}
            className="w-full py-2.5 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
          >
            + Add task
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
              Back
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            >
              Save project
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default NewProjectModal;
