
import { RoadmapItem, Status, Priority, StrategicGoal, HealthStatus } from './types';

export const GOAL_STYLES = [
  { color: 'bg-blue-900', icon: '🌍' },      // EU Growth - dark blue
  { color: 'bg-teal-600', icon: '🌱' },      // Organic Growth - green/teal
  { color: 'bg-orange-500', icon: '⚡' },    // Speed to Market - orange
  { color: 'bg-red-600', icon: '🛡️' },       // Trust - red
  { color: 'bg-slate-900', icon: '💰' },     // Revenue - black
  { color: 'bg-slate-600', icon: '📦' },     // Miscellaneous - dark grey
  { color: 'bg-purple-600', icon: '🚀' },    // Extra fallback
];

export const HEALTH_STYLES = {
  [HealthStatus.GREEN]: { color: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', label: 'On Track' },
  [HealthStatus.AMBER]: { color: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', label: 'At Risk' },
  [HealthStatus.RED]: { color: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-200', label: 'Blocked' },
};

export const getGoalStyle = (index: number, title: string): { color: string, icon: string } => {
  const t = title.toLowerCase();
  // Match goals to their specific colors
  if (t.includes('eu') && t.includes('growth')) return GOAL_STYLES[0];  // EU Growth - dark blue
  if (t.includes('organic')) return GOAL_STYLES[1];                      // Organic Growth - green/teal
  if (t.includes('speed') || t.includes('market')) return GOAL_STYLES[2]; // Speed to Market - orange
  if (t.includes('trust')) return GOAL_STYLES[3];                         // Trust - red
  if (t.includes('revenue')) return GOAL_STYLES[4];                       // Revenue - black
  if (t.includes('miscellaneous') || t.includes('misc')) return GOAL_STYLES[5]; // Miscellaneous - dark grey
  return GOAL_STYLES[index % GOAL_STYLES.length];
};

export const BIG_ROCKS: StrategicGoal[] = [
  {
    id: '1',
    title: 'EU Growth',
    description: 'European market expansion',
    color: 'bg-blue-900',
    icon: '🌍'
  },
  {
    id: '2',
    title: 'Organic Growth',
    description: 'Scaling through word-of-mouth and retention',
    color: 'bg-teal-600',
    icon: '🌱'
  }
];

export const INITIAL_ITEMS: RoadmapItem[] = [];

export const getDepartmentColor = (dept: string) => {
  const d = dept.toLowerCase();
  if (d.includes('tech') || d.includes('product')) return 'bg-blue-500';
  if (d.includes('marketing')) return 'bg-purple-500';
  if (d.includes('operations')) return 'bg-emerald-500';
  if (d.includes('sales')) return 'bg-orange-500';
  if (d.includes('executive')) return 'bg-slate-800';
  return 'bg-slate-400';
};

export const STATUS_COLORS = {
  [Status.NOT_STARTED]: 'bg-slate-100 text-slate-600 border-slate-200',
  [Status.IN_PROGRESS]: 'bg-blue-50 text-blue-700 border-blue-200',
  [Status.DONE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [Status.BLOCKED]: 'bg-rose-50 text-rose-700 border-rose-200',
  [Status.PAUSED]: 'bg-amber-50 text-amber-700 border-amber-200',
};
