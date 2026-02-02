
import React, { useState } from 'react';
import { AIInsight } from '../types';

interface AIInsightsPanelProps {
  insights: AIInsight[];
  loading: boolean;
  onRefresh: () => void;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, loading, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-card">
      {/* Header */}
      <div 
        className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <svg className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              AI Intelligence
              {loading && (
                <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full animate-pulse">
                  Processing
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-500">
              {loading ? 'Analyzing roadmap data...' : 'AI-powered analysis & risk detection'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Insight Indicators */}
          {!isExpanded && insights.length > 0 && !loading && (
            <div className="flex items-center gap-2">
              {insights.filter(i => i.impactLevel === 'high').length > 0 && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-600">
                    {insights.filter(i => i.impactLevel === 'high').length} Alert{insights.filter(i => i.impactLevel === 'high').length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!isExpanded) setIsExpanded(true);
              else onRefresh();
            }}
            disabled={loading}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
              ${isExpanded 
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                : 'bg-teal-600 text-white hover:bg-teal-700'
              }
            `}
          >
            {loading ? 'Analyzing...' : isExpanded ? 'Refresh' : 'View Insights'}
          </button>
          
          <svg 
            className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <div className="grid gap-4 lg:grid-cols-3 mt-5">
            {loading ? (
              [1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className="h-32 bg-slate-100 animate-pulse rounded-xl"
                />
              ))
            ) : insights.length > 0 ? (
              insights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`
                    bg-slate-100 p-5 rounded-xl border transition-all hover:shadow-card-hover
                    ${insight.impactLevel === 'high' 
                      ? 'border-red-200' 
                      : insight.impactLevel === 'medium' 
                        ? 'border-amber-200' 
                        : 'border-slate-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`
                      text-xs font-medium px-2 py-0.5 rounded-full
                      ${insight.impactLevel === 'high' 
                        ? 'bg-red-100 text-red-700' 
                        : insight.impactLevel === 'medium' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-teal-100 text-teal-700'
                      }
                    `}>
                      {insight.impactLevel}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">
                      {insight.type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {insight.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">No critical insights detected</p>
                <p className="text-sm text-slate-500 mt-1">Your roadmap is looking healthy!</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Powered by Gemini AI
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
