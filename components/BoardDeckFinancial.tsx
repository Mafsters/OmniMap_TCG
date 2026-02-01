import React, { useState, useEffect } from 'react';
import { FinancialHighlights } from '../types';

interface BoardDeckFinancialProps {
  financial: FinancialHighlights;
  month: string;
  year: number;
  customText?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave?: (text: string) => void;
  onCancel?: () => void;
}

const BoardDeckFinancial: React.FC<BoardDeckFinancialProps> = ({ 
  financial, 
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
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-GB').format(value);
  };

  const formatMetric = (value: number, format: 'currency' | 'percentage' | 'number') => {
    if (format === 'currency') return formatCurrency(value);
    if (format === 'percentage') return formatPercentage(value);
    return formatNumber(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm relative">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Financial Highlights</h2>
            <p className="text-sm text-slate-500">{month} {year} Financial Performance</p>
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

      {/* Revenue Summary */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Revenue Performance</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Current Revenue</div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(financial.revenue.current)}</div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">Target Revenue</div>
            <div className="text-2xl font-bold text-slate-700">{formatCurrency(financial.revenue.target)}</div>
          </div>
          <div className={`border rounded-xl p-4 ${financial.revenue.variance >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
            <div className="text-xs text-slate-500 mb-1">Variance</div>
            <div className={`text-2xl font-bold ${financial.revenue.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(financial.revenue.variance)}
            </div>
          </div>
          <div className={`border rounded-xl p-4 ${financial.revenue.variancePercent >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
            <div className="text-xs text-slate-500 mb-1">Variance %</div>
            <div className={`text-2xl font-bold ${financial.revenue.variancePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPercentage(financial.revenue.variancePercent)}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trends */}
      {financial.trends.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">6-Month Revenue Trend</h3>
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="space-y-3">
              {financial.trends.map((trend, idx) => {
                const targetPercent = trend.target > 0 ? (trend.revenue / trend.target) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-20 text-xs text-slate-600 font-medium">{trend.period}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-slate-200 rounded-full h-4 relative">
                          <div 
                            className={`h-4 rounded-full ${targetPercent >= 100 ? 'bg-emerald-600' : targetPercent >= 80 ? 'bg-amber-600' : 'bg-rose-600'}`}
                            style={{ width: `${Math.min(targetPercent, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-semibold text-slate-700 w-24 text-right">
                          {formatCurrency(trend.revenue)}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">Target: {formatCurrency(trend.target)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {financial.keyMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Key Financial Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {financial.keyMetrics.map((metric, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">{metric.label}</span>
                  {metric.trend && (
                    <div className={`text-xs ${metric.trend === 'up' ? 'text-emerald-600' : metric.trend === 'down' ? 'text-rose-600' : 'text-slate-400'}`}>
                      {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatMetric(metric.value, metric.format)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for External Financial Data */}
      <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl border-dashed">
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">
            <strong>External Data Integration:</strong> Connect your accounting system or financial API to display additional metrics here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BoardDeckFinancial;
