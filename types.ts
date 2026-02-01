
export enum Status {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  BLOCKED = 'Blocked',
  PAUSED = 'Paused'
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum HealthStatus {
  GREEN = 'green',
  AMBER = 'amber',
  RED = 'red'
}

export type AccessLevel = 'Admin' | 'Manager' | 'IC';

export interface Employee {
  id: string;
  name: string;
  email?: string; // Email for Google SSO matching
  role: string;
  department: string; 
  team?: string;
  avatarUrl?: string;
  bio?: string;
  mission?: string; // New: "What does success look like?"
  isHoD?: boolean;
  accessLevel: AccessLevel;
  reportsTo?: string;
  salesPerformanceAccess?: string[]; 
  /** Slack user ID for follow-up DMs (optional; n8n can lookup by email if missing) */
  slackUserId?: string;
}

// Google Authentication Types
export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  hd?: string; // Hosted domain (for workspace accounts)
}

export interface AuthState {
  isAuthenticated: boolean;
  googleUser: GoogleUser | null;
  employee: Employee | null;
}

export interface StrategicGoal {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
}

// Updates for Strategic Big Rocks
export interface MonthlyUpdate {
  id: string;
  goalId: string;
  month: string;
  year: number;
  status: HealthStatus;
  content: string;
  authorId: string;
  createdAt: string;
}

// New: Updates for individual Roadmap Items
export interface ItemUpdate {
  id: string;
  itemId: string;
  month: string;
  year: number;
  health: HealthStatus;
  content: string;
  updatedAt: string;
  /** Where the update came from (app form, Slack reply, n8n, etc.) */
  source?: 'app' | 'slack' | 'n8n';
  /** When a follow-up was sent (e.g. by n8n) before this reply */
  requestedAt?: string;
}

export type GoalType = 'PERSONAL' | 'DEPARTMENT' | 'COMPANY';
export type GoalCategory = 'PERFORMANCE' | 'DEVELOPMENT';

export interface RoadmapItem {
  id: string;
  goalId: string;
  owner: string; 
  title: string;
  description: string;
  department: string; 
  team?: string; // New: Sub-team alignment
  status: Status;
  priority: Priority;
  startDate: string; 
  endDate: string;   
  tags: string[];
  progress: number;
  contribution?: string;
  jiraId?: string; // New: Link to Jira issue
  jiraUrl?: string; // New: Direct URL to issue
  goalType?: GoalType; // HiBob: PERSONAL, DEPARTMENT, or COMPANY (default: PERSONAL)
  goalCategory?: GoalCategory; // HiBob: PERFORMANCE or DEVELOPMENT (default: PERFORMANCE)
  hibobGoalId?: string; // HiBob goal ID for check-ins and updates
}

// --- SALES MODULE TYPES ---

export interface SalesMetricData {
  id: string;
  employeeId: string;
  month: string;
  year: number;
  metricType: 'Revenue' | 'Calls' | 'Listings' | 'Sales Rate' | 'Conversion';
  target: number;
  actual: number;
}

export interface SalesActionItem {
  id: string;
  employeeId: string;
  metricType: string;
  description: string;
  assignedBy: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
}

// --- END SALES MODULE TYPES ---

export interface AIInsight {
  type: 'conflict' | 'suggestion' | 'summary' | 'alignment_gap' | 'hidden_risk';
  message: string;
  impactLevel: 'high' | 'medium' | 'low';
}

export interface HiBobConfig {
  serviceId: string;
  token: string;
  manualGoalType?: string; // Optional override for Goal Type ID
}

export interface WorkableConfig {
  subdomain: string;
  token: string;
}

export interface SalesforceConfig {
  instanceUrl: string; // e.g., https://mycompany.my.salesforce.com
  clientId: string;    // Consumer Key
  clientSecret: string;// Consumer Secret
  refreshToken: string;// Long-lived refresh token
}

export type ActionType = 
  | 'UPSERT_ITEM' 
  | 'DELETE_ITEM' 
  | 'UPSERT_GOAL' 
  | 'DELETE_GOAL'
  | 'UPSERT_UPDATE' // For Big Rocks
  | 'DELETE_UPDATE'
  | 'UPSERT_ITEM_UPDATE' // For Roadmap Items
  | 'UPSERT_SALES_ACTION'
  | 'TOGGLE_SALES_ACTION'
  | 'SYNC_HIBOB_PEOPLE'
  | 'SYNC_HIBOB_GOALS'   // New: Pull Goals Action
  | 'TEST_HIBOB'         // New: Isolated Test Action
  | 'PUSH_GOALS_HIBOB'   
  | 'SYNC_WORKABLE_JOBS'
  | 'SYNC_SALESFORCE'
  | 'RECORD_UPDATE_FROM_EXTERNAL'; // For n8n/Slack follow-up: write ItemUpdate from external source

export interface ActionPayload {
  action: ActionType;
  item?: Partial<RoadmapItem>;
  goal?: Partial<StrategicGoal>;
  update?: Partial<MonthlyUpdate>;
  itemUpdate?: Partial<ItemUpdate>;
  salesAction?: Partial<SalesActionItem>;
  hibobConfig?: HiBobConfig; 
  targetEmail?: string; // For testing
  targetItemId?: string; // For single item push
  subAction?: 'READ' | 'WRITE'; // For testing
  workableConfig?: WorkableConfig; 
  salesforceConfig?: SalesforceConfig; 
  id?: string;
}

// --- BOARD DECK TYPES ---

export interface BoardDeckConfig {
  month: string;
  year: number;
  sections: BoardDeckSection[];
  customNotes?: Record<string, string>; // Section ID -> custom notes
}

export interface BoardDeckSection {
  id: string;
  type: 'executive_summary' | 'big_rocks' | 'key_metrics' | 'risks_issues' | 'financial' | 'custom';
  enabled: boolean;
  order: number;
  title: string;
}

export interface ExecutiveSummary {
  overallHealth: {
    green: number;
    amber: number;
    red: number;
    total: number;
  };
  keyAchievements: string[];
  topPriorities: string[];
  criticalBlockers: Array<{
    title: string;
    description: string;
    owner: string;
    status: HealthStatus;
  }>;
}

export interface BigRockProgress {
  goal: StrategicGoal;
  progress: number;
  status: HealthStatus;
  update?: MonthlyUpdate;
  statusChange?: 'improved' | 'declined' | 'stable';
  milestones: Array<{
    title: string;
    date: string;
    completed: boolean;
  }>;
}

export interface KeyMetrics {
  sales: {
    revenue: { target: number; actual: number; trend: 'up' | 'down' | 'stable' };
    conversion: { target: number; actual: number; trend: 'up' | 'down' | 'stable' };
    listings: { target: number; actual: number; trend: 'up' | 'down' | 'stable' };
  };
  goals: {
    completionRate: number;
    onTrack: number;
    atRisk: number;
    blocked: number;
  };
  departments: Array<{
    name: string;
    health: HealthStatus;
    goalsCompleted: number;
    goalsTotal: number;
  }>;
}

export interface RiskIssue {
  id: string;
  title: string;
  description: string;
  status: HealthStatus;
  owner: string;
  department: string;
  mitigation?: string;
  escalated: boolean;
  item?: RoadmapItem;
  update?: ItemUpdate | MonthlyUpdate;
}

export interface FinancialHighlights {
  revenue: {
    current: number;
    target: number;
    variance: number;
    variancePercent: number;
  };
  trends: Array<{
    period: string;
    revenue: number;
    target: number;
  }>;
  keyMetrics: Array<{
    label: string;
    value: number;
    format: 'currency' | 'percentage' | 'number';
    trend?: 'up' | 'down' | 'stable';
  }>;
}
