import React, { useState, useEffect } from 'react';
import { RiskIssue } from '../types';

interface BoardDeckRisksIssuesProps {
  risks: RiskIssue[];
  month: string;
  year: number;
  customText?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (text: string) => void;
  onCancel?: () => void;
}

const BoardDeckRisksIssues: React.FC<BoardDeckRisksIssuesProps> = ({ 
  risks, 
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
  const redRisks = risks.filter(r => r.status === 'red');
  const amberRisks = risks.filter(r => r.status === 'amber');
  const escalatedRisks = risks.filter(r => r.escalated);

  const getStatusColor = (status: string) => {
    if (status === 'red') return 'bg-rose-600 text-white';
    return 'bg-amber-600 text-white';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Risks & Issues</h2>
            <p className="text-sm text-slate-500">{month} {year} Risk Register</p>
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
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-600">{redRisks.length}</div>
              <div className="text-xs text-slate-500">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{amberRisks.length}</div>
              <div className="text-xs text-slate-500">At Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{escalatedRisks.length}</div>
              <div className="text-xs text-slate-500">Escalated</div>
            </div>
          </div>
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

      {risks.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-600 font-medium">No risks or issues identified</p>
          <p className="text-sm text-slate-500 mt-1">All goals are on track</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Escalated Risks First */}
          {escalatedRisks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-rose-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Escalated Issues (Requiring Board Attention)
              </h3>
              <div className="space-y-3">
                {escalatedRisks.map((risk) => (
                  <div key={risk.id} className="border-2 border-rose-300 bg-rose-50 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-slate-900 text-lg">{risk.title}</h4>
                      <div className="flex items-center gap-2">
                        {risk.escalated && (
                          <span className="px-2 py-1 bg-rose-600 text-white text-xs font-bold rounded uppercase">
                            Escalated
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(risk.status)}`}>
                          {risk.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-3">{risk.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span><strong>Owner:</strong> {risk.owner}</span>
                      <span><strong>Department:</strong> {risk.department}</span>
                    </div>
                    {risk.mitigation && (
                      <div className="mt-3 pt-3 border-t border-rose-200">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Mitigation Plan:</p>
                        <p className="text-sm text-slate-600">{risk.mitigation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical (RED) Risks */}
          {redRisks.filter(r => !r.escalated).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-rose-700 mb-3 uppercase tracking-wide">Critical Issues</h3>
              <div className="space-y-3">
                {redRisks.filter(r => !r.escalated).map((risk) => (
                  <div key={risk.id} className="border border-rose-200 bg-rose-50/50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{risk.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(risk.status)}`}>
                        {risk.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{risk.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span><strong>Owner:</strong> {risk.owner}</span>
                      <span><strong>Department:</strong> {risk.department}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* At Risk (AMBER) Items */}
          {amberRisks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-3 uppercase tracking-wide">Items Requiring Attention</h3>
              <div className="space-y-2">
                {amberRisks.map((risk) => (
                  <div key={risk.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900">{risk.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(risk.status)}`}>
                        {risk.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{risk.description}</p>
                    <div className="text-xs text-slate-500">
                      <span><strong>Owner:</strong> {risk.owner}</span>
                      <span className="ml-4"><strong>Department:</strong> {risk.department}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardDeckRisksIssues;
