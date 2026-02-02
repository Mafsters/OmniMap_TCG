import React, { useState } from 'react';
import { Project, ProjectTask, ProjectMilestone, TaskMilestone, Employee, Status, Priority } from '../types';

export interface FormClassProps {
  inputClass: string;
  selectClass: string;
  labelClass: string;
}

export interface FormClassPropsNoSelect {
  inputClass: string;
  labelClass: string;
}

export function EditProjectForm({
  project,
  employees,
  departments,
  onSave,
  onCancel,
  inputClass,
  selectClass,
  labelClass,
}: {
  project: Project;
  employees: Employee[];
  departments: string[];
  onSave: (updates: Partial<Project>) => Promise<void>;
  onCancel: () => void;
} & FormClassProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || '');
  const [owner, setOwner] = useState(project.owner);
  const [status, setStatus] = useState<Status>(project.status);
  const [priority, setPriority] = useState<Priority>(project.priority || Priority.MEDIUM);
  const [startDate, setStartDate] = useState(project.startDate || '');
  const [endDate, setEndDate] = useState(project.endDate || '');
  const [department, setDepartment] = useState(project.department || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), description: description.trim(), owner, status, priority, startDate, endDate, department: department || undefined });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={labelClass}>Title</label><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required /></div>
      <div><label className={labelClass}>Description</label><textarea className={`${inputClass} min-h-[80px]`} value={description} onChange={e => setDescription(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Owner</label>
          <select className={selectClass} value={owner} onChange={e => setOwner(e.target.value)}>
            {employees.map(e => <option key={e.id} value={e.name}>{e.name} {e.department ? `(${e.department})` : ''}</option>)}
            {employees.length === 0 && <option value="Unassigned">Unassigned</option>}
          </select>
        </div>
        <div><label className={labelClass}>Department</label>
          <select className={selectClass} value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">—</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Status</label>
          <select className={selectClass} value={status} onChange={e => setStatus(e.target.value as Status)}>
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label className={labelClass}>Priority</label>
          <select className={selectClass} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Start date</label><input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><label className={labelClass}>End date</label><input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export function EditTaskForm({
  task,
  employees,
  departments,
  onSave,
  onCancel,
  inputClass,
  selectClass,
  labelClass,
}: {
  task: ProjectTask;
  employees: Employee[];
  departments: string[];
  onSave: (updates: Partial<ProjectTask>) => Promise<void>;
  onCancel: () => void;
} & FormClassProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [owner, setOwner] = useState(task.owner);
  const [status, setStatus] = useState<Status>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [startDate, setStartDate] = useState(task.startDate || '');
  const [endDate, setEndDate] = useState(task.endDate || '');
  const [department, setDepartment] = useState(task.department || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), description: description.trim(), owner, status, priority, startDate, endDate, department: department || undefined });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={labelClass}>Title</label><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required /></div>
      <div><label className={labelClass}>Description</label><textarea className={`${inputClass} min-h-[60px]`} value={description} onChange={e => setDescription(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Owner</label>
          <select className={selectClass} value={owner} onChange={e => setOwner(e.target.value)}>
            <option value="Unassigned">Unassigned</option>
            {employees.map(e => <option key={e.id} value={e.name}>{e.name} {e.department ? `(${e.department})` : ''}</option>)}
          </select>
        </div>
        <div><label className={labelClass}>Department</label>
          <select className={selectClass} value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">—</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Status</label>
          <select className={selectClass} value={status} onChange={e => setStatus(e.target.value as Status)}>
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label className={labelClass}>Priority</label>
          <select className={selectClass} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Start date</label><input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><label className={labelClass}>End date</label><input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export function AddTaskForm({
  employees,
  departments,
  onSave,
  onCancel,
  inputClass,
  selectClass,
  labelClass,
}: {
  projectId: string;
  employees: Employee[];
  departments: string[];
  onSave: (task: Omit<ProjectTask, 'id' | 'projectId' | 'createdAt'>) => Promise<void>;
  onCancel: () => void;
} & FormClassProps) {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState(employees[0]?.name || 'Unassigned');
  const [status, setStatus] = useState<Status>(Status.NOT_STARTED);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('2026-12-31');
  const [department, setDepartment] = useState(departments[0] || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), description: description.trim(), owner, status, priority, startDate, endDate, department: department || undefined });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={labelClass}>Title</label><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" required /></div>
      <div><label className={labelClass}>Description</label><textarea className={`${inputClass} min-h-[60px]`} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Owner</label>
          <select className={selectClass} value={owner} onChange={e => setOwner(e.target.value)}>
            <option value="Unassigned">Unassigned</option>
            {employees.map(e => <option key={e.id} value={e.name}>{e.name} {e.department ? `(${e.department})` : ''}</option>)}
          </select>
        </div>
        <div><label className={labelClass}>Department</label>
          <select className={selectClass} value={department} onChange={e => setDepartment(e.target.value)}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Status</label>
          <select className={selectClass} value={status} onChange={e => setStatus(e.target.value as Status)}>
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div><label className={labelClass}>Priority</label>
          <select className={selectClass} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Start date</label><input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        <div><label className={labelClass}>End date</label><input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add task'}</button>
      </div>
    </form>
  );
}

export function EditProjectMilestoneForm({
  milestone,
  onSave,
  onCancel,
  inputClass,
  labelClass,
}: {
  milestone: ProjectMilestone;
  onSave: (updates: Partial<ProjectMilestone>) => Promise<void>;
  onCancel: () => void;
} & FormClassPropsNoSelect) {
  const [title, setTitle] = useState(milestone.title);
  const [dueDate, setDueDate] = useState(milestone.dueDate || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), dueDate });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={labelClass}>Milestone title</label><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Design approved" required /></div>
      <div><label className={labelClass}>Due date</label><input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export function AddProjectMilestoneForm({
  onSave,
  onCancel,
  inputClass,
  labelClass,
}: {
  projectId: string;
  onSave: (m: Omit<ProjectMilestone, 'id' | 'projectId' | 'completed'>) => Promise<void>;
  onCancel: () => void;
} & FormClassPropsNoSelect) {
  const defaultDue = new Date();
  defaultDue.setMonth(defaultDue.getMonth() + 1);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(defaultDue.toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), dueDate });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={labelClass}>Milestone title</label><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Design approved" required /></div>
      <div><label className={labelClass}>Due date</label><input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add milestone'}</button>
      </div>
    </form>
  );
}

export function AddTaskMilestoneForm({
  onSave,
  onCancel,
  inputClass,
  labelClass,
}: {
  taskId: string;
  onSave: (m: Omit<TaskMilestone, 'id' | 'taskId' | 'completed'>) => Promise<void>;
  onCancel: () => void;
} & FormClassPropsNoSelect) {
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(defaultDue.toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), dueDate });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={labelClass}>Checkpoint title</label><input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 2 review, Design approved" required /></div>
      <div><label className={labelClass}>Due date</label><input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? 'Adding...' : 'Log progress'}</button>
      </div>
    </form>
  );
}
