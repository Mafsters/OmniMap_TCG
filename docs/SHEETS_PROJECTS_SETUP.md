# Google Sheets: Projects and ProjectTasks tabs

Goals (Big Rocks and AllGoals) stay for **goals only** (3–5 per person). Projects are stored in separate tabs so the goals part of the app stays clean.

## New tabs to add in your Google Sheet

Create these **two tabs** (or let the Apps Script create them on first write):

### 1. **Projects**

One row per project. Suggested header row (Row 1):

| ID | Title | Description | Owner | Status | Priority | StartDate | EndDate | CreatedAt | Department | Team |
|----|-------|-------------|-------|--------|----------|-----------|---------|-----------|------------|------|

- **ID**: unique id (e.g. `proj-abc12`)
- **Title**, **Description**: project name and summary
- **Owner**: owner name (matches Employees)
- **Status**: `Not Started`, `In Progress`, `Done`, `Blocked`, `Paused`
- **Priority**: `Low`, `Medium`, `High`, `Critical`
- **StartDate**, **EndDate**: `YYYY-MM-DD`
- **CreatedAt**: ISO date string (optional)
- **Department**, **Team**: optional

### 2. **ProjectTasks**

One row per task belonging to a project. Suggested header row (Row 1):

| ID | ProjectID | Title | Description | Owner | Status | Priority | StartDate | EndDate | Order | CreatedAt | Department | Team |
|----|-----------|-------|-------------|-------|--------|----------|-----------|---------|-------|-----------|------------|------|

- **ID**: unique id (e.g. `pt-xyz78`)
- **ProjectID**: id of the project (from **Projects** tab)
- **Title**, **Description**: task name and details
- **Owner**: task owner name
- **Status**, **Priority**: same as Projects
- **StartDate**, **EndDate**: `YYYY-MM-DD`
- **Order**: number for sort order (0, 1, 2…)
- **CreatedAt**: optional
- **Department**, **Team**: optional

### 3. **TaskMilestones** (progress checkpoints per task)

Used to **log progress on each task** (e.g. every 2 weeks for a long-running task). One row per checkpoint. The app creates this tab on first “Log progress”. The script looks for a tab named **TaskMilestones** or **Task Milestones**; if none exists, it creates **TaskMilestones** with the headers below. Suggested header row:

| ID | TaskID | Title | DueDate | Completed | CompletedAt |
|----|--------|-------|---------|-----------|-------------|

- **ID**: unique id (e.g. `tm-abc12`)
- **TaskID**: id of the task (from **ProjectTasks** tab)
- **Title**: checkpoint label (e.g. “Week 2 review”, “Design approved”)
- **DueDate**: `YYYY-MM-DD`
- **Completed**: TRUE/FALSE
- **CompletedAt**: ISO date when marked complete (optional)

### 4. **ProjectMilestones** (project-level milestones)

Project-level checkpoints (one row per milestone per project). Tab name: **ProjectMilestones** (or **Project Milestones**). Columns:

| ID | ProjectID | Title | DueDate | Completed | CompletedAt |
|----|-----------|-------|---------|-----------|-------------|

- **ID**: unique id (e.g. `pm-abc12`)
- **ProjectID**: id of the project (from **Projects** tab)
- **Title**, **DueDate**: milestone label and due date
- **Completed**: TRUE/FALSE; **CompletedAt**: optional

In the app, expand a project and use the **“Project milestones”** section and **“+ Add milestone”** to add rows to this tab.

---

## Apps Script behaviour

- **doGet**: reads **Projects**, **ProjectTasks**, **ProjectMilestones**, and **TaskMilestones** (if present) and returns `projects`, `projectTasks`, `projectMilestones`, `taskMilestones`. If a tab is missing, that array is empty.
- **doPost**:
  - **UPSERT_PROJECT**: appends or updates a row in **Projects** (creates the tab with headers if it doesn’t exist).
  - **UPSERT_PROJECT_TASK**: appends or updates a row in **ProjectTasks** (creates the tab if needed).
  - **UPSERT_TASK_MILESTONE** / **DELETE_TASK_MILESTONE**: progress checkpoints per task (TaskMilestones tab; created on first write).
  - **DELETE_PROJECT** / **DELETE_PROJECT_TASK**: deletes the row with the given ID.

So you can either:

1. **Create the tabs yourself**: Add **Projects** and **ProjectTasks** with the header rows above, then deploy the updated Apps Script; or  
2. **Let the script create them**: Deploy the script and use “New project” in the app; the first save will create the tabs with the right headers.

**If progress checkpoints (task milestones) don’t appear in the sheet:**  
1. Copy the **full** Apps Script from SyncPanel (including `UPSERT_TASK_MILESTONE` and `DELETE_TASK_MILESTONE`).  
2. Paste it into your Google Apps Script project, save, then **Deploy → Manage deployments → New deployment** (or edit and save a new version).  
3. In the app, set the Script URL to the **new** deployment URL.  
4. Ensure the sheet has a tab named **TaskMilestones** (or **Task Milestones**); the script creates it on first “Log progress” if missing.

---

## Summary: Goals vs Projects

| Purpose | Sheet(s) | App area |
|--------|----------|----------|
| **Goals** (3–5 per person, big ticket) | BigRocks, AllGoals, MonthlyGoalUpdates, etc. | Big Rocks, Goals & Team, Updates, Gantt |
| **Projects** (come and go, with tasks) | Projects, ProjectTasks (and optionally ProjectMilestones) | Project Manager tab |

Goals and projects are separate: project data is not written to AllGoals.
