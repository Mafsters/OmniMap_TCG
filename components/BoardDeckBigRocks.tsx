import React, { useState, useEffect } from 'react';
import { BigRockProgress } from '../types';

interface BoardDeckBigRocksProps {
  bigRocks: BigRockProgress[];
  month: string;
  year: number;
  customText?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (text: string) => void;
  onCancel?: () => void;
}

const BoardDeckBigRocks: React.FC<BoardDeckBigRocksProps> = ({ 
  bigRocks, 
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
  const getStatusColor = (status: string) => {
    if (status === 'red') return 'bg-rose-600';
    if (status === 'amber') return 'bg-amber-600';
    return 'bg-emerald-600';
  };

  const getStatusChangeIcon = (change?: string) => {
    if (change === 'improved') {
      return (
        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    if (change === 'declined') {
      return (
        <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Strategic Goals Progress</h2>
            <p className="text-sm text-slate-500">Big Rocks Status - {month} {year}</p>
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

      <div className="space-y-6">
        {bigRocks.map((rock) => (
          <div key={rock.goal.id} className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(rock.status)}`} />
                  <h3 className="text-lg font-bold text-slate-900">{rock.goal.title}</h3>
                  {rock.statusChange && (
                    <div className="flex items-center gap-1" title={rock.statusChange === 'improved' ? 'Status improved' : rock.statusChange === 'declined' ? 'Status declined' : 'Status stable'}>
                      {getStatusChangeIcon(rock.statusChange)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600">{rock.goal.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">{rock.progress}%</div>
                <div className="text-xs text-slate-500">Complete</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${getStatusColor(rock.status)}`}
                  style={{ width: `${rock.progress}%` }}
                />
              </div>
            </div>

            {/* Monthly Update */}
            {rock.update && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusColor(rock.status)} text-white`}>
                    {rock.update.status.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">{rock.update.month} {rock.update.year}</span>
                </div>
                <p className="text-sm text-slate-700">{rock.update.content}</p>
              </div>
            )}

            {/* Milestones */}
            {rock.milestones.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Milestones</h4>
                <div className="space-y-2">
                  {rock.milestones.slice(0, 3).map((milestone, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {milestone.completed ? (
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
                      )}
                      <span className={milestone.completed ? 'text-slate-500 line-through' : 'text-slate-700'}>
                        {milestone.title}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {new Date(milestone.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardDeckBigRocks;
