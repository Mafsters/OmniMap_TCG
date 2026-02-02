import React, { useMemo, useState } from 'react';
import { Project, ProjectTask, ProjectMilestone, TaskMilestone, Employee, Status, Priority } from '../types';
import { FORM_CLASSES } from '../constants';
import Modal from './Modal';
import {
  EditProjectForm,
  EditTaskForm,
  AddTaskForm,
  EditProjectMilestoneForm,
  AddProjectMilestoneForm,
  AddTaskMilestoneForm,
} from './ProjectManagerForms';

interface ProjectManagerViewProps {
  currentUser: Employee;
  projects: Project[];
  projectTasks: ProjectTask[];
  projectMilestones: ProjectMilestone[];
  taskMilestones: TaskMilestone[];
  employees: Employee[];
  departments: string[];
  onNewProjectClick: () => void;
  onUpdateProject: (project: Partial<Project> & { id: string }) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onUpdateTask: (task: Partial<ProjectTask> & { id: string }) => Promise<void>;
  onAddTask: (projectId: string, task: Omit<ProjectTask, 'id' | 'projectId' | 'createdAt'>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddProjectMilestone: (projectId: string, milestone: Omit<ProjectMilestone, 'id' | 'projectId' | 'completed'>) => Promise<void>;
  onUpdateProjectMilestone: (milestone: Partial<ProjectMilestone> & { id: string }) => Promise<void>;
  onToggleProjectMilestone: (id: string, completed: boolean) => Promise<void>;
  onDeleteProjectMilestone: (milestoneId: string) => Promise<void>;
  onAddTaskMilestone: (taskId: string, milestone: Omit<TaskMilestone, 'id' | 'taskId' | 'completed'>) => Promise<void>;
  onUpdateTaskMilestone: (milestone: Partial<TaskMilestone> & { id: string }) => Promise<void>;
  onToggleTaskMilestone: (id: string, completed: boolean) => Promise<void>;
  onDeleteTaskMilestone: (milestoneId: string) => Promise<void>;
}

const ProjectManagerView: React.FC<ProjectManagerViewProps> = ({
  currentUser,
  projects,
  projectTasks,
  projectMilestones,
  taskMilestones,
  employees,
  departments,
  onNewProjectClick,
  onUpdateProject,
  onDeleteProject,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onAddProjectMilestone,
  onUpdateProjectMilestone,
  onToggleProjectMilestone,
  onDeleteProjectMilestone,
  onAddTaskMilestone,
  onUpdateTaskMilestone,
  onToggleTaskMilestone,
  onDeleteTaskMilestone,
}) => {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [addingTaskProjectId, setAddingTaskProjectId] = useState<string | null>(null);
  const [addingMilestoneProjectId, setAddingMilestoneProjectId] = useState<string | null>(null);
  const [editingProjectMilestone, setEditingProjectMilestone] = useState<ProjectMilestone | null>(null);
  const [addingMilestoneTaskId, setAddingMilestoneTaskId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));
  const [expandedTaskProgress, setExpandedTaskProgress] = useState<Set<string>>(new Set());

  const tasksByProject = useMemo(() => {
    const map: Record<string, ProjectTask[]> = {};
    projectTasks.forEach(t => {
      if (!map[t.projectId]) map[t.projectId] = [];
      map[t.projectId].push(t);
    });
    Object.keys(map).forEach(pid => map[pid].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return map;
  }, [projectTasks]);

  const milestonesByTask = useMemo(() => {
    const map: Record<string, TaskMilestone[]> = {};
    taskMilestones.forEach(m => {
      if (!map[m.taskId]) map[m.taskId] = [];
      map[m.taskId].push(m);
    });
    return map;
  }, [taskMilestones]);

  const milestonesByProject = useMemo(() => {
    const map: Record<string, ProjectMilestone[]> = {};
    projectMilestones.forEach(m => {
      if (!map[m.projectId]) map[m.projectId] = [];
      map[m.projectId].push(m);
    });
    return map;
  }, [projectMilestones]);

  const toggleTaskProgressExpanded = (taskId: string) => {
    setExpandedTaskProgress(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const getStatusStyle = (status: Status) => {
    switch (status) {
      case Status.DONE: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case Status.IN_PROGRESS: return 'bg-blue-50 text-blue-700 border-blue-200';
      case Status.BLOCKED: return 'bg-rose-50 text-rose-700 border-rose-200';
      case Status.PAUSED: return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'bg-red-50 text-red-700';
      case Priority.HIGH: return 'bg-orange-50 text-orange-700';
      case Priority.MEDIUM: return 'bg-blue-50 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const { labelClass, inputClass, selectClass } = FORM_CLASSES;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Project Manager</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-2xl">
          Create and manage projects, tasks, and milestones. Edit any field below; changes sync to your Google Sheets.
        </p>
        {currentUser.accessLevel === 'Admin' && (
          <button
            type="button"
            onClick={onNewProjectClick}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
          >
            <span>New project</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-base font-semibold text-slate-800">Projects</h3>
          {projects.map(project => {
            const tasks = tasksByProject[project.id] || [];
            const projectMilestoneList = milestonesByProject[project.id] || [];
            const ownerEmp = employees.find(e => e.name === project.owner || e.id === project.owner);
            const isExpanded = expandedProjects.has(project.id);

            return (
              <div key={project.id} className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getStatusStyle(project.status)}`}>
                      {project.status}
                    </span>
                    {project.priority && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${getPriorityStyle(project.priority)}`}>
                        {project.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-slate-900">{project.title}</h4>
                      {project.description && <p className="text-sm text-slate-600 mt-1">{project.description}</p>}
                      <p className="text-xs text-slate-500 mt-2">
                        Owner: {project.owner}{ownerEmp?.department ? ` · ${ownerEmp.department}` : ''}
                        {project.startDate && ` · ${project.startDate} → ${project.endDate || '—'}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingProject(project)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-600"
                        title="Edit project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete project "${project.title}" and all its tasks and milestones?`)) {
                            onDeleteProject(project.id);
                          }
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(project.id)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    {/* Tasks */}
                    <div className="px-5 py-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tasks</span>
                        <button
                          type="button"
                          onClick={() => setAddingTaskProjectId(project.id)}
                          className="text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                          + Add task
                        </button>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {tasks.map((task, idx) => {
                          const taskMilestoneList = milestonesByTask[task.id] || [];
                          const progressExpanded = expandedTaskProgress.has(task.id);
                          return (
                          <li key={task.id} className="border-b border-slate-100 last:border-0">
                            <div className="py-3 flex items-center gap-3 group">
                            <div className="flex flex-col gap-0 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  if (idx > 0) {
                                    const prev = tasks[idx - 1];
                                    const prevOrder = prev.order ?? idx - 1;
                                    const myOrder = task.order ?? idx;
                                    onUpdateTask({ ...prev, id: prev.id, order: myOrder });
                                    onUpdateTask({ ...task, id: task.id, order: prevOrder });
                                  }
                                }}
                                className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button
                                type="button"
                                disabled={idx === tasks.length - 1}
                                onClick={() => {
                                  if (idx < tasks.length - 1) {
                                    const next = tasks[idx + 1];
                                    const nextOrder = next.order ?? idx + 1;
                                    const myOrder = task.order ?? idx;
                                    onUpdateTask({ ...next, id: next.id, order: myOrder });
                                    onUpdateTask({ ...task, id: task.id, order: nextOrder });
                                  }
                                }}
                                className="p-0.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 ${getStatusStyle(task.status)}`}>{task.status}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${getPriorityStyle(task.priority)}`}>{task.priority}</span>
                            <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">{task.title}</span>
                            <span className="text-xs text-slate-500 shrink-0">{task.owner}</span>
                            <button type="button" onClick={() => toggleTaskProgressExpanded(task.id)} className="text-xs font-medium text-teal-600 hover:text-teal-700 shrink-0" title="Log progress">Progress ({taskMilestoneList.length})</button>
                            <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => setEditingTask(task)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-teal-600" title="Edit task">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete task "${task.title}"?`)) onDeleteTask(task.id);
                                }}
                                className="p-1.5 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Delete task"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                            </div>
                            {progressExpanded && (
                              <div className="pl-12 pr-5 pb-3 pt-1 bg-slate-50/70 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress checkpoints</span>
                                  <button type="button" onClick={() => setAddingMilestoneTaskId(task.id)} className="text-xs font-medium text-teal-600 hover:text-teal-700">+ Log progress</button>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">Log milestones every 2 weeks (or as needed) to track progress on this task.</p>
                                <ul className="space-y-2">
                                  {taskMilestoneList.map(m => (
                                    <li key={m.id} className="flex items-center gap-3 py-1.5 group">
                                      <input type="checkbox" checked={m.completed} onChange={() => onToggleTaskMilestone(m.id, !m.completed)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                                      <span className={`text-sm flex-1 ${m.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>{m.title}</span>
                                      <span className="text-xs text-slate-500">{m.dueDate}</span>
                                      <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => { const t = window.prompt('Checkpoint title', m.title); if (t != null && t.trim()) onUpdateTaskMilestone({ id: m.id, title: t.trim() }); }} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-teal-600" title="Edit"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                        <button type="button" onClick={() => { if (window.confirm(`Delete "${m.title}"?`)) onDeleteTaskMilestone(m.id); }} className="p-1.5 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                      </div>
                                    </li>
                                  ))}
                                  {taskMilestoneList.length === 0 && <li className="py-2 text-sm text-slate-400">No progress logged yet. Use &quot;+ Log progress&quot; (e.g. every 2 weeks).</li>}
                                </ul>
                              </div>
                            )}
                          </li>
                          );
                        })}
                        {tasks.length === 0 && (
                          <li className="py-2 text-sm text-slate-400">No tasks yet.</li>
                        )}
                      </ul>
                    </div>

                    {/* Project milestones (ProjectMilestones tab) */}
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Project milestones</span>
                        <button
                          type="button"
                          onClick={() => setAddingMilestoneProjectId(project.id)}
                          className="text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                          + Add milestone
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">Project-level checkpoints (saved to ProjectMilestones tab).</p>
                      <ul className="space-y-2">
                        {projectMilestoneList.map(m => (
                          <li key={m.id} className="flex items-center gap-3 py-1.5 group">
                            <input
                              type="checkbox"
                              checked={m.completed}
                              onChange={() => onToggleProjectMilestone(m.id, !m.completed)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className={`text-sm flex-1 ${m.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>{m.title}</span>
                            <span className="text-xs text-slate-500">{m.dueDate}</span>
                            <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingProjectMilestone(m)}
                                className="p-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-teal-600"
                                title="Edit"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete "${m.title}"?`)) onDeleteProjectMilestone(m.id);
                                }}
                                className="p-1.5 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                title="Delete"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </li>
                        ))}
                        {projectMilestoneList.length === 0 && (
                          <li className="py-2 text-sm text-slate-400">No project milestones yet. Use &quot;+ Add milestone&quot; (saved to ProjectMilestones tab).</li>
                        )}
                      </ul>
                    </div>

                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No projects yet. Create one with &quot;New project&quot; above.
        </div>
      )}

      {/* Edit Project Modal */}
      <Modal isOpen={!!editingProject} onClose={() => setEditingProject(null)} title="Edit project" maxWidth="max-w-lg">
        {editingProject && (
          <EditProjectForm
            project={editingProject}
            employees={employees}
            departments={departments}
            onSave={async (updates) => {
              await onUpdateProject({ ...editingProject, ...updates });
              setEditingProject(null);
            }}
            onCancel={() => setEditingProject(null)}
            inputClass={inputClass}
            selectClass={selectClass}
            labelClass={labelClass}
          />
        )}
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit task" maxWidth="max-w-lg">
        {editingTask && (
          <EditTaskForm
            task={editingTask}
            employees={employees}
            departments={departments}
            onSave={async (updates) => {
              await onUpdateTask({ ...editingTask, ...updates });
              setEditingTask(null);
            }}
            onCancel={() => setEditingTask(null)}
            inputClass={inputClass}
            selectClass={selectClass}
            labelClass={labelClass}
          />
        )}
      </Modal>

      {/* Add Task Modal */}
      <Modal isOpen={!!addingTaskProjectId} onClose={() => setAddingTaskProjectId(null)} title="Add task" maxWidth="max-w-lg">
        {addingTaskProjectId && (
          <AddTaskForm
            projectId={addingTaskProjectId}
            employees={employees}
            departments={departments}
            onSave={async (task) => {
              await onAddTask(addingTaskProjectId, task);
              setAddingTaskProjectId(null);
            }}
            onCancel={() => setAddingTaskProjectId(null)}
            inputClass={inputClass}
            selectClass={selectClass}
            labelClass={labelClass}
          />
        )}
      </Modal>

      {/* Add project milestone (ProjectMilestones tab) Modal */}
      <Modal isOpen={!!addingMilestoneProjectId} onClose={() => setAddingMilestoneProjectId(null)} title="Add project milestone" maxWidth="max-w-md">
        {addingMilestoneProjectId && (
          <AddProjectMilestoneForm
            projectId={addingMilestoneProjectId}
            onSave={async (m) => {
              await onAddProjectMilestone(addingMilestoneProjectId, m);
              setAddingMilestoneProjectId(null);
            }}
            onCancel={() => setAddingMilestoneProjectId(null)}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        )}
      </Modal>

      {/* Edit project milestone Modal */}
      <Modal isOpen={!!editingProjectMilestone} onClose={() => setEditingProjectMilestone(null)} title="Edit project milestone" maxWidth="max-w-md">
        {editingProjectMilestone && (
          <EditProjectMilestoneForm
            milestone={editingProjectMilestone}
            onSave={async (updates) => {
              await onUpdateProjectMilestone({ ...editingProjectMilestone, ...updates });
              setEditingProjectMilestone(null);
            }}
            onCancel={() => setEditingProjectMilestone(null)}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        )}
      </Modal>

      {/* Log progress (task milestone) Modal */}
      <Modal isOpen={!!addingMilestoneTaskId} onClose={() => setAddingMilestoneTaskId(null)} title="Log progress" maxWidth="max-w-md">
        {addingMilestoneTaskId && (
          <AddTaskMilestoneForm
            taskId={addingMilestoneTaskId}
            onSave={async (m) => {
              await onAddTaskMilestone(addingMilestoneTaskId, m);
              setAddingMilestoneTaskId(null);
            }}
            onCancel={() => setAddingMilestoneTaskId(null)}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        )}
      </Modal>
    </div>
  );
};

// --- Inline form components ---

export default ProjectManagerView;
