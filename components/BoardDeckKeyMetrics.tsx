import React, { useState, useEffect } from 'react';
import { KeyMetrics } from '../types';

interface BoardDeckKeyMetricsProps {
  metrics: KeyMetrics;
  month: string;
  year: number;
  customText?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (text: string) => void;
  onCancel?: () => void;
}

const BoardDeckKeyMetrics: React.FC<BoardDeckKeyMetricsProps> = ({ 
  metrics, 
  month, 
  year,
  customText = '',
  isEditing = false,
  onEdit,
  onSave,
  onCancel
}) => {
  const [editText, setEditText] = useState(customText);

  useEffect(() => {
    setEditText(customText);
  }, [customText]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    }
    if (trend === 'down') {
      return (
        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
      </svg>
    );
  };

  const getHealthColor = (health: string) => {
    if (health === 'red') return 'bg-rose-100 border-rose-300 text-rose-900';
    if (health === 'amber') return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-emerald-100 border-emerald-300 text-emerald-900';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Key Metrics</h2>
            <p className="text-sm text-slate-500">{month} {year} Performance Indicators</p>
          </div>
          {!isEditing && onEdit && (
            <button
              onClick={onEdit}
              className="no-print px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Text
            </button>
          )}
        </div>
      </div>

      {/* Custom Text Editor */}
      {isEditing ? (
        <div className="mb-6 p-4 bg-teal-50 border-2 border-teal-200 rounded-xl">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Custom Notes / Additional Context
          </label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Add custom notes, context, or additional information for this section..."
            className="w-full min-h-[200px] px-4 py-3 border border-teal-300 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => {
                if (onSave) onSave(editText);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditText(customText);
                if (onCancel) onCancel();
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : customText ? (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Custom Notes</span>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{customText}</p>
        </div>
      ) : null}

      {/* Sales Performance */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Sales Performance</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Revenue</span>
              {getTrendIcon(metrics.sales.revenue.trend)}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatCurrency(metrics.sales.revenue.actual)}
            </div>
            <div className="text-xs text-slate-500">
              Target: {formatCurrency(metrics.sales.revenue.target)}
            </div>
            <div className={`text-xs mt-1 ${metrics.sales.revenue.actual >= metrics.sales.revenue.target ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.sales.revenue.actual >= metrics.sales.revenue.target ? '✓' : '✗'} {Math.round(((metrics.sales.revenue.actual / metrics.sales.revenue.target) - 1) * 100)}% vs target
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Conversion Rate</span>
              {getTrendIcon(metrics.sales.conversion.trend)}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {formatPercentage(metrics.sales.conversion.actual * 100)}
            </div>
            <div className="text-xs text-slate-500">
              Target: {formatPercentage(metrics.sales.conversion.target * 100)}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Listings</span>
              {getTrendIcon(metrics.sales.listings.trend)}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">
              {Math.round(metrics.sales.listings.actual).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">
              Target: {Math.round(metrics.sales.listings.target).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Performance */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Goal Performance</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 mb-1">{metrics.goals.completionRate}%</div>
            <div className="text-xs text-slate-500">Completion Rate</div>
          </div>
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-700 mb-1">{metrics.goals.onTrack}</div>
            <div className="text-xs text-emerald-600">On Track</div>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-700 mb-1">{metrics.goals.atRisk}</div>
            <div className="text-xs text-amber-600">At Risk</div>
          </div>
          <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-rose-700 mb-1">{metrics.goals.blocked}</div>
            <div className="text-xs text-rose-600">Blocked</div>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      {metrics.departments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Department Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            {metrics.departments.map((dept) => (
              <div key={dept.name} className={`border rounded-xl p-4 ${getHealthColor(dept.health)}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{dept.name}</h4>
                  <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-white/50">
                    {dept.health}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-bold">{dept.goalsCompleted}</span> / <span>{dept.goalsTotal}</span> goals completed
                </div>
                {dept.goalsTotal > 0 && (
                  <div className="mt-2 w-full bg-white/50 rounded-full h-2">
                    <div 
                      className="bg-current h-2 rounded-full transition-all"
                      style={{ width: `${(dept.goalsCompleted / dept.goalsTotal) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardDeckKeyMetrics;
