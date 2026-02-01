import React, { useMemo } from 'react';
import { RoadmapItem, Employee } from '../types';
import RoadmapCard from './RoadmapCard';

interface ProjectManagerViewProps {
  currentUser: Employee;
  items: RoadmapItem[];
  employees: Employee[];
  onNewProjectClick: () => void;
  onEditItem?: (item: RoadmapItem) => void;
  onViewHistory?: (item: RoadmapItem) => void;
}

const ProjectManagerView: React.FC<ProjectManagerViewProps> = ({
  currentUser,
  items,
  employees,
  onNewProjectClick,
  onEditItem,
  onViewHistory
}) => {
  const projectItems = useMemo(() => {
    return items.filter(i => i.tags?.includes('project-manager'));
  }, [items]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-slate-300 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Project Manager</h2>
        <p className="text-sm text-slate-600 mb-6 max-w-2xl">
          Enter a high-level objective (e.g. &quot;launch a merch store&quot;). We&apos;ll suggest a goal, break it into tasks, and suggest owners from your team. You can then track progress and use follow-ups via Slack (n8n) to capture updates from owners.
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

      {projectItems.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-4">Projects</h3>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {projectItems.map(item => (
              <RoadmapCard
                key={item.id}
                item={item}
                employees={employees}
                onEdit={onEditItem}
                onClick={onViewHistory}
              />
            ))}
          </div>
        </div>
      )}

      {projectItems.length === 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No projects yet. Create one with &quot;New project&quot; above.
        </div>
      )}
    </div>
  );
};

export default ProjectManagerView;
