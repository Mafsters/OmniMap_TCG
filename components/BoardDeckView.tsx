import React, { useState, useMemo } from 'react';
import { 
  RoadmapItem, 
  StrategicGoal, 
  MonthlyUpdate, 
  ItemUpdate, 
  Employee, 
  SalesMetricData,
  BoardDeckConfig,
  BoardDeckSection
} from '../types';
import { boardDeckService } from '../services/boardDeckService';
import BoardDeckExecutiveSummary from './BoardDeckExecutiveSummary';
import BoardDeckBigRocks from './BoardDeckBigRocks';
import BoardDeckKeyMetrics from './BoardDeckKeyMetrics';
import BoardDeckRisksIssues from './BoardDeckRisksIssues';
import BoardDeckFinancial from './BoardDeckFinancial';
import BoardDeckCustomSection from './BoardDeckCustomSection';

interface BoardDeckViewProps {
  items: RoadmapItem[];
  goals: StrategicGoal[];
  monthlyUpdates: MonthlyUpdate[];
  itemUpdates: ItemUpdate[];
  employees: Employee[];
  salesData: SalesMetricData[];
  currentUser: Employee;
}

const BoardDeckView: React.FC<BoardDeckViewProps> = ({
  items,
  goals,
  monthlyUpdates,
  itemUpdates,
  employees,
  salesData,
  currentUser
}) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const currentMonth = months[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [config, setConfig] = useState<BoardDeckConfig>(() => {
    const saved = localStorage.getItem(`omnimap_boarddeck_config_${selectedMonth}_${selectedYear}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall through to default
      }
    }
    return {
      month: selectedMonth,
      year: selectedYear,
      sections: [
        { id: 'executive_summary', type: 'executive_summary', enabled: true, order: 1, title: 'Executive Summary' },
        { id: 'big_rocks', type: 'big_rocks', enabled: true, order: 2, title: 'Strategic Goals' },
        { id: 'key_metrics', type: 'key_metrics', enabled: true, order: 3, title: 'Key Metrics' },
        { id: 'risks_issues', type: 'risks_issues', enabled: true, order: 4, title: 'Risks & Issues' },
        { id: 'financial', type: 'financial', enabled: true, order: 5, title: 'Financial Highlights' }
      ],
      customNotes: {}
    };
  });
  const [showConfig, setShowConfig] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>(config.customNotes || {});

  // Generate deck data
  const deckData = useMemo(() => {
    const summary = boardDeckService.generateExecutiveSummary(items, itemUpdates, monthlyUpdates, selectedMonth, selectedYear);
    const bigRocks = boardDeckService.generateBigRocksProgress(goals, items, monthlyUpdates, itemUpdates, selectedMonth, selectedYear);
    const metrics = boardDeckService.generateKeyMetrics(salesData, items, itemUpdates, employees, selectedMonth, selectedYear);
    const risks = boardDeckService.generateRisksIssues(items, itemUpdates, monthlyUpdates, employees, selectedMonth, selectedYear);
    const financial = boardDeckService.generateFinancialHighlights(salesData, selectedMonth, selectedYear);

    return { summary, bigRocks, metrics, risks, financial };
  }, [items, goals, monthlyUpdates, itemUpdates, employees, salesData, selectedMonth, selectedYear]);

  // Update config when period changes
  React.useEffect(() => {
    const saved = localStorage.getItem(`omnimap_boarddeck_config_${selectedMonth}_${selectedYear}`);
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        setConfig(savedConfig);
        setCustomTexts(savedConfig.customNotes || {});
      } catch (e) {
        // Keep current config
      }
    } else {
      setConfig(prev => ({ ...prev, month: selectedMonth, year: selectedYear }));
      setCustomTexts({});
    }
  }, [selectedMonth, selectedYear]);

  // Save config to localStorage
  const saveConfig = (newConfig: BoardDeckConfig) => {
    setConfig(newConfig);
    localStorage.setItem(`omnimap_boarddeck_config_${selectedMonth}_${selectedYear}`, JSON.stringify(newConfig));
  };

  // Save custom text
  const saveCustomText = (sectionId: string, text: string) => {
    const newCustomTexts = { ...customTexts, [sectionId]: text };
    setCustomTexts(newCustomTexts);
    const newConfig = { ...config, customNotes: newCustomTexts };
    saveConfig(newConfig);
  };

  // Get enabled sections in order
  const enabledSections = config.sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  const handleExportPDF = () => {
    window.print();
  };

  const toggleSection = (sectionId: string) => {
    const newConfig = {
      ...config,
      sections: config.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    };
    saveConfig(newConfig);
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sections = [...config.sections];
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections.forEach((s, i) => { s.order = i + 1; });

    const newConfig = { ...config, sections };
    saveConfig(newConfig);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm no-print">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {months.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-white w-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Customize
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Deck Configuration</h3>
            <div className="space-y-2">
              {config.sections.map((section) => (
                <div key={section.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                  />
                  <span className="flex-1 text-sm font-medium text-slate-700">{section.title}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={section.order === 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={section.order === config.sections.length}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deck Content */}
      <div className="space-y-6 print:space-y-8 print-break">
        {enabledSections.map((section, idx) => {
          const isLast = idx === enabledSections.length - 1;
          const isEditing = editingSection === section.id;
          const customText = customTexts[section.id] || '';

          const sectionComponent = (() => {
            switch (section.type) {
              case 'executive_summary':
                return (
                  <BoardDeckExecutiveSummary
                    key={section.id}
                    summary={deckData.summary}
                    month={selectedMonth}
                    year={selectedYear}
                    customText={customText}
                    isEditing={isEditing}
                    onEdit={() => setEditingSection(section.id)}
                    onSave={(text) => {
                      saveCustomText(section.id, text);
                      setEditingSection(null);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                );
              case 'big_rocks':
                return (
                  <BoardDeckBigRocks
                    key={section.id}
                    bigRocks={deckData.bigRocks}
                    month={selectedMonth}
                    year={selectedYear}
                    customText={customText}
                    isEditing={isEditing}
                    onEdit={() => setEditingSection(section.id)}
                    onSave={(text) => {
                      saveCustomText(section.id, text);
                      setEditingSection(null);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                );
              case 'key_metrics':
                return (
                  <BoardDeckKeyMetrics
                    key={section.id}
                    metrics={deckData.metrics}
                    month={selectedMonth}
                    year={selectedYear}
                    customText={customText}
                    isEditing={isEditing}
                    onEdit={() => setEditingSection(section.id)}
                    onSave={(text) => {
                      saveCustomText(section.id, text);
                      setEditingSection(null);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                );
              case 'risks_issues':
                return (
                  <BoardDeckRisksIssues
                    key={section.id}
                    risks={deckData.risks}
                    month={selectedMonth}
                    year={selectedYear}
                    customText={customText}
                    isEditing={isEditing}
                    onEdit={() => setEditingSection(section.id)}
                    onSave={(text) => {
                      saveCustomText(section.id, text);
                      setEditingSection(null);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                );
              case 'financial':
                return (
                  <BoardDeckFinancial
                    key={section.id}
                    financial={deckData.financial}
                    month={selectedMonth}
                    year={selectedYear}
                    customText={customText}
                    isEditing={isEditing}
                    onEdit={() => setEditingSection(section.id)}
                    onSave={(text) => {
                      saveCustomText(section.id, text);
                      setEditingSection(null);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                );
              case 'custom':
                return (
                  <BoardDeckCustomSection
                    key={section.id}
                    title={section.title}
                    month={selectedMonth}
                    year={selectedYear}
                    customText={customText}
                    isEditing={isEditing}
                    onEdit={() => setEditingSection(section.id)}
                    onSave={(text) => {
                      saveCustomText(section.id, text);
                      setEditingSection(null);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                );
              default:
                return null;
            }
          })();

          return (
            <div key={section.id} className={!isLast ? 'print-break print-avoid-break' : 'print-avoid-break'}>
              {sectionComponent}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BoardDeckView;
