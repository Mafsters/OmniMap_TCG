import React, { useState, useEffect } from 'react';
import { ExecutiveSummary } from '../types';

interface BoardDeckExecutiveSummaryProps {
  summary: ExecutiveSummary;
  month: string;
  year: number;
  customText?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (text: string) => void;
  onCancel?: () => void;
}

const BoardDeckExecutiveSummary: React.FC<BoardDeckExecutiveSummaryProps> = ({ 
  summary, 
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
  const total = summary.overallHealth.total;
  const greenPercent = total > 0 ? Math.round((summary.overallHealth.green / total) * 100) : 0;
  const amberPercent = total > 0 ? Math.round((summary.overallHealth.amber / total) * 100) : 0;
  const redPercent = total > 0 ? Math.round((summary.overallHealth.red / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Executive Summary</h2>
            <p className="text-sm text-slate-500">{month} {year} Board Report</p>
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

      {/* Overall Health */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Overall Health Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-900">On Track</span>
              <span className="text-2xl font-bold text-emerald-700">{summary.overallHealth.green}</span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: `${greenPercent}%` }}
              />
            </div>
            <p className="text-xs text-emerald-700 mt-1">{greenPercent}% of goals</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-900">At Risk</span>
              <span className="text-2xl font-bold text-amber-700">{summary.overallHealth.amber}</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div 
                className="bg-amber-600 h-2 rounded-full transition-all"
                style={{ width: `${amberPercent}%` }}
              />
            </div>
            <p className="text-xs text-amber-700 mt-1">{amberPercent}% of goals</p>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-rose-900">Critical</span>
              <span className="text-2xl font-bold text-rose-700">{summary.overallHealth.red}</span>
            </div>
            <div className="w-full bg-rose-200 rounded-full h-2">
              <div 
                className="bg-rose-600 h-2 rounded-full transition-all"
                style={{ width: `${redPercent}%` }}
              />
            </div>
            <p className="text-xs text-rose-700 mt-1">{redPercent}% of goals</p>
          </div>
        </div>
      </div>

      {/* Key Achievements */}
      {summary.keyAchievements.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Key Achievements</h3>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <ul className="space-y-2">
              {summary.keyAchievements.map((achievement, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-slate-700">{achievement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top Priorities */}
      {summary.topPriorities.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Top Priorities (Next Month)</h3>
          <div className="space-y-2">
            {summary.topPriorities.map((priority, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-slate-700 flex-1">{priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Blockers */}
      {summary.criticalBlockers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Critical Blockers Requiring Attention</h3>
          <div className="space-y-3">
            {summary.criticalBlockers.map((blocker, idx) => (
              <div key={idx} className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">{blocker.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    blocker.status === 'red' ? 'bg-rose-600 text-white' :
                    blocker.status === 'amber' ? 'bg-amber-600 text-white' :
                    'bg-emerald-600 text-white'
                  }`}>
                    {blocker.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{blocker.description}</p>
                <p className="text-xs text-slate-500">Owner: {blocker.owner}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardDeckExecutiveSummary;
