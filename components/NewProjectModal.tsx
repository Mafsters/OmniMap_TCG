import React, { useState } from 'react';
import { StrategicGoal, Employee, Status, Priority, Project, ProjectTask } from '../types';
import { FORM_CLASSES } from '../constants';
import Modal from './Modal';
import { suggestGoalFromObjective, breakDownObjective, SuggestGoalResult, BreakDownResult } from '../services/geminiService';
import { getAiEnabled } from '../utils/aiPrefs';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: StrategicGoal[]; // for AI suggestion only (projects stay separate from goals)
  employees: Employee[];
  departments: string[];
  onSave: (project: Project, tasks: ProjectTask[]) => void;
}

interface TaskRow {
  title?: string;
  description?: string;
  department?: string;
  owner?: string;
  priority?: Priority;
}

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
  const [suggestedGoal, setSuggestedGoal] = useState<SuggestGoalResult | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [_breakdown, setBreakdown] = useState<BreakDownResult | null>(null);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setObjective('');
    setSuggestedGoal(null);
    setProjectTitle('');
    setProjectDescription('');
    setBreakdown(null);
    setTaskRows([]);
    setResolvedProjectId(null);
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleStep1Next = async () => {
    const trimmed = objective.trim();
    if (!trimmed) { setError('Enter an objective (e.g. "collectingcars wants to launch a merch store").'); return; }
    if (!getAiEnabled()) {
      setError('AI features are disabled. Enable them on the login page to use Suggest with AI.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await suggestGoalFromObjective(trimmed, goals);
      setSuggestedGoal(result);
      setProjectTitle(result.goalTitle);
      setProjectDescription(result.goalDescription);
      setStep(2);
    } catch (e) { setError('Could not suggest a project. Try again.'); } finally { setLoading(false); }
  };

  const handleStep2Next = async () => {
    if (!projectTitle.trim()) { setError('Enter a project title.'); return; }
    if (!getAiEnabled()) {
      setError('AI features are disabled. Enable them on the login page to use Break down with AI.');
      return;
    }
    const projectId = `proj-${Math.random().toString(36).substr(2, 6)}`;
    setResolvedProjectId(projectId);
    setError(null);
    setLoading(true);
    try {
      const result = await breakDownObjective(projectTitle.trim(), projectDescription.trim(), goals, employees);
      setBreakdown(result);
      const rows = (result.tasks && result.tasks.length > 0)
        ? result.tasks.map(t => ({
            title: t.title || '',
            description: t.description || '',
            department: t.department || departments[0] || 'Operations',
            owner: t.owner || 'Unassigned',
            priority: (t.priority as Priority) || Priority.MEDIUM
          }))
        : [{ title: '', description: '', department: departments[0] || 'Operations', owner: 'Unassigned', priority: Priority.MEDIUM }];
      setTaskRows(rows);
      setStep(3);
    } catch (e) { setError('Could not break down tasks. Try again.'); } finally { setLoading(false); }
  };

  const handleStep2Manual = () => {
    if (!projectTitle.trim()) { setError('Enter a project title.'); return; }
    setError(null);
    const projectId = `proj-${Math.random().toString(36).substr(2, 6)}`;
    setResolvedProjectId(projectId);
    setTaskRows([{ title: '', description: '', department: departments[0] || 'Operations', owner: employees[0]?.name || 'Unassigned', priority: Priority.MEDIUM }]);
    setStep(3);
  };

  const updateTaskRow = (idx: number, field: keyof TaskRow, value: string | Priority) => {
    const next = [...taskRows];
    next[idx] = { ...next[idx], [field]: value };
    setTaskRows(next);
  };

  const addTaskRow = () => {
    setTaskRows([...taskRows, { title: '', description: '', department: departments[0] || 'Operations', owner: employees[0]?.name || 'Unassigned', priority: Priority.MEDIUM }]);
  };

  const removeTaskRow = (idx: number) => {
    if (taskRows.length <= 1) return;
    setTaskRows(taskRows.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const valid = taskRows.filter(r => r.title && r.title.trim());
    if (valid.length === 0) { setError('Add at least one task with a title.'); return; }
    if (!resolvedProjectId) return;
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = '2026-12-31';
    const createdAt = now.toISOString();
    const firstOwner = valid[0]?.owner?.trim() || 'Unassigned';
    const project: Project = {
      id: resolvedProjectId,
      title: projectTitle.trim(),
      description: projectDescription.trim(),
      owner: firstOwner,
      status: Status.NOT_STARTED,
      startDate,
      endDate,
      createdAt
    };
    const tasks: ProjectTask[] = valid.map((t, i) => ({
      id: `pt-${Math.random().toString(36).substr(2, 6)}`,
      projectId: resolvedProjectId,
      title: (t.title || '').trim(),
      description: (t.description || '').trim() || '',
      owner: (t.owner || 'Unassigned').trim(),
      status: Status.NOT_STARTED,
      priority: (t.priority as Priority) || Priority.MEDIUM,
      startDate,
      endDate,
      order: i,
      createdAt,
      department: t.department,
      team: undefined
    }));
    onSave(project, tasks);
    handleClose();
  };

  const { labelClass, inputClass, selectClass } = FORM_CLASSES;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New project" maxWidth="max-w-3xl">
      {step === 1 && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Enter the high-level objective. We&apos;ll suggest a project title and break it into tasks (separate from your goals).</p>
          <div>
            <label className={labelClass}>Objective</label>
            <textarea className={`${inputClass} min-h-[100px]`} placeholder="e.g. collectingcars wants to launch a merch store" value={objective} onChange={e => setObjective(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={handleClose} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={handleStep1Next} disabled={loading} className="px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{loading ? '...' : 'Next'}</button>
          </div>
        </div>
      )}
      {step === 2 && suggestedGoal && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Confirm or edit the project title and description, then we&apos;ll break it into tasks.</p>
          <div>
            <label className={labelClass}>Project title</label>
            <input className={inputClass} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="e.g. Launch merch store" />
          </div>
          <div>
            <label className={labelClass}>Project description</label>
            <textarea className={`${inputClass} min-h-[80px]`} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="What success looks like..." />
          </div>
          <div>
            <span className={labelClass}>How do you want to add tasks?</span>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                type="button"
                onClick={handleStep2Next}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-teal-500 bg-teal-50 text-teal-800 hover:bg-teal-100 disabled:opacity-50 text-left"
              >
                <span className="font-medium block">Use AI to generate tasks</span>
                <span className="text-xs text-slate-600">We&apos;ll break the project into tasks and suggest owners from your team.</span>
              </button>
              <button
                type="button"
                onClick={handleStep2Manual}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-left"
              >
                <span className="font-medium block">Add tasks manually</span>
                <span className="text-xs text-slate-600">You add and assign each task yourself.</span>
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Back</button>
          </div>
        </div>
      )}
      {step === 3 && resolvedProjectId && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Edit tasks and owners, then save. These are stored in the Projects and ProjectTasks sheets (not in Goals).</p>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {taskRows.map((row, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">Task {idx + 1}</span>
                  <button type="button" onClick={() => removeTaskRow(idx)} disabled={taskRows.length <= 1} className="text-slate-400 hover:text-red-600 disabled:opacity-40 text-xs">Remove</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <input className={inputClass} placeholder="Title" value={row.title || ''} onChange={e => updateTaskRow(idx, 'title', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <textarea className={`${inputClass} min-h-[60px]`} placeholder="Description" value={row.description || ''} onChange={e => updateTaskRow(idx, 'description', e.target.value)} />
                  </div>
                  <div>
                    <select className={selectClass} value={row.department || ''} onChange={e => updateTaskRow(idx, 'department', e.target.value)}>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <select className={selectClass} value={row.owner || ''} onChange={e => updateTaskRow(idx, 'owner', e.target.value)}>
                      <option value="Unassigned">Unassigned</option>
                      {employees.map(e => <option key={e.id} value={e.name}>{e.name} {e.department ? `(${e.department})` : ''}</option>)}
                      {employees.length === 0 && <option value="Unassigned">No employees loaded</option>}
                    </select>
                  </div>
                  <div>
                    <select className={selectClass} value={row.priority || Priority.MEDIUM} onChange={e => updateTaskRow(idx, 'priority', e.target.value as Priority)}>
                      {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addTaskRow} className="w-full py-2.5 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 text-sm">+ Add task</button>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Back</button>
            <button type="button" onClick={handleSave} className="px-4 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700">Save project</button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default NewProjectModal;
