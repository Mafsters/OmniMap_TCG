import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectManagerView from './ProjectManagerView';
import type { Employee } from '../types';

const adminUser: Employee = {
  id: 'admin-1',
  name: 'Admin User',
  role: 'Admin',
  department: 'Product',
  accessLevel: 'Admin',
};

const noOp = () => Promise.resolve();

describe('ProjectManagerView', () => {
  it('renders "No projects yet" when projects list is empty', () => {
    render(
      <ProjectManagerView
        currentUser={adminUser}
        projects={[]}
        projectTasks={[]}
        projectMilestones={[]}
        taskMilestones={[]}
        employees={[]}
        departments={[]}
        onNewProjectClick={() => {}}
        onUpdateProject={noOp}
        onDeleteProject={noOp}
        onUpdateTask={noOp}
        onAddTask={noOp}
        onDeleteTask={noOp}
        onAddProjectMilestone={noOp}
        onUpdateProjectMilestone={noOp}
        onToggleProjectMilestone={noOp}
        onDeleteProjectMilestone={noOp}
        onAddTaskMilestone={noOp}
        onUpdateTaskMilestone={noOp}
        onToggleTaskMilestone={noOp}
        onDeleteTaskMilestone={noOp}
      />
    );
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  it('shows New project button for admin user', () => {
    render(
      <ProjectManagerView
        currentUser={adminUser}
        projects={[]}
        projectTasks={[]}
        projectMilestones={[]}
        taskMilestones={[]}
        employees={[]}
        departments={[]}
        onNewProjectClick={() => {}}
        onUpdateProject={noOp}
        onDeleteProject={noOp}
        onUpdateTask={noOp}
        onAddTask={noOp}
        onDeleteTask={noOp}
        onAddProjectMilestone={noOp}
        onUpdateProjectMilestone={noOp}
        onToggleProjectMilestone={noOp}
        onDeleteProjectMilestone={noOp}
        onAddTaskMilestone={noOp}
        onUpdateTaskMilestone={noOp}
        onToggleTaskMilestone={noOp}
        onDeleteTaskMilestone={noOp}
      />
    );
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
  });
});
