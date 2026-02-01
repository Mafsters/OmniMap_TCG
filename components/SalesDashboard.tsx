
import React, { useState, useMemo } from 'react';
import { Employee, SalesMetricData, SalesActionItem, HealthStatus } from '../types';
import Modal from './Modal';

interface SalesDashboardProps {
  employees: Employee[];
  salesData: SalesMetricData[];
  salesActions: SalesActionItem[];
  currentUser: Employee;
  onAddAction: (action: Partial<SalesActionItem>) => void;
  onToggleAction: (id: string, isCompleted: boolean) => void;
}

const METRIC_TYPES = ['Revenue', 'Calls', 'Listings', 'Sales Rate', 'Conversion'];

// Centralized formatting helper
const formatMetricValue = (val: number, type: string, isAxis: boolean = false) => {
  if (type.includes('Rate') || type === 'Conversion') {
    // Exception: Always show 1 decimal for percentages
    return `${(val * 100).toFixed(1)}%`;
  }
  if (type === 'Revenue') {
    // Truncate decimals for Revenue
    if (isAxis) return `£${(val/1000).toFixed(0)}k`;
    return `£${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  // Truncate decimals for Counts (Calls, Listings)
  return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// --- SUB-COMPONENT: SVG LINE CHART ---
const TrendChart: React.FC<{ 
  data: SalesMetricData[]; 
  metricType: string; 
  employeeName: string;
}> = ({ data, metricType, employeeName }) => {
  // 1. DEDUPLICATION & SORTING
  const cleanData = useMemo(() => {
     if (!data || data.length === 0) return [];
     
     const uniqueMap = new Map<string, SalesMetricData>();
     data.forEach(item => {
        const key = `${item.year}-${item.month}`;
        uniqueMap.set(key, item);
     });

     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
     return Array.from(uniqueMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return months.indexOf(a.month) - months.indexOf(b.month);
     });
  }, [data]);

  if (cleanData.length === 0) return <div className="p-10 text-center text-slate-500">No historical data available.</div>;

  // 2. Dimensions & Layout
  const height = 300; 
  const width = 650; 
  const margin = { top: 40, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Calculate Min/Max
  const allValues = cleanData.flatMap(d => [d.actual, d.target]);
  const rawMax = Math.max(...allValues);
  const rawMin = Math.min(...allValues);
  // Add 10% padding to top/bottom scale
  const maxVal = rawMax * 1.1; 
  const minVal = rawMin > 0 ? rawMin * 0.9 : 0; 
  const range = maxVal - minVal || 1;

  // Scales
  const getX = (index: number) => {
    if (cleanData.length <= 1) return margin.left + innerWidth / 2;
    return margin.left + (index / (cleanData.length - 1)) * innerWidth;
  };
  
  const getY = (val: number) => {
    return margin.top + innerHeight - ((val - minVal) / range) * innerHeight;
  };

  // Generate Y Axis Ticks (5 steps)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const val = minVal + range * pct;
      return { val, y: getY(val) };
  });

  // 3. Generate Paths
  const actualPath = cleanData.length > 1 ? "M" + cleanData.map((d, i) => `${getX(i)},${getY(d.actual)}`).join(" L") : "";
  const targetPath = cleanData.length > 1 ? "M" + cleanData.map((d, i) => `${getX(i)},${getY(d.target)}`).join(" L") : "";

  return (
    <div className="w-full">
      <div className="bg-slate-100 rounded-xl p-4 border border-slate-100 mb-6 flex justify-between items-end">
         <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{employeeName}</div>
            <div className="text-xl font-black text-slate-900">{metricType} History</div>
         </div>
         <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-white"></div>
                Actual
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-slate-100"></div>
                Target
            </div>
         </div>
      </div>

      <div className="relative w-full aspect-[2/1] bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
           {/* Grid Lines & Y-Axis Labels */}
           {yTicks.map((tick, i) => (
              <g key={i}>
                {/* Grid Line */}
                <line 
                    x1={margin.left} y1={tick.y} 
                    x2={width - margin.right} y2={tick.y} 
                    stroke="#f1f5f9" strokeWidth="1" 
                />
                {/* Y-Axis Label */}
                <text 
                    x={margin.left - 10} y={tick.y + 4} 
                    textAnchor="end" 
                    className="text-[10px] font-bold fill-slate-400"
                    style={{ fontSize: '10px' }}
                >
                    {formatMetricValue(tick.val, metricType, true)}
                </text>
              </g>
           ))}

           {/* X-Axis Labels */}
           {cleanData.map((d, i) => (
              <text 
                key={i}
                x={getX(i)} 
                y={height - margin.bottom + 15} 
                textAnchor="middle" 
                className="text-[10px] font-bold fill-slate-400 uppercase"
                style={{ fontSize: '10px' }}
              >
                {d.month}
              </text>
           ))}

           {/* Target Line (Dashed, Behind) */}
           {cleanData.length > 1 && (
             <path d={targetPath} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
           )}

           {/* Actual Line (Solid, Front) */}
           {cleanData.length > 1 && (
             <path d={actualPath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
           )}
           
           {/* Area Fill under Actual */}
            {cleanData.length > 1 && (
               <path d={`${actualPath} L ${getX(cleanData.length - 1)},${height - margin.bottom} L ${getX(0)},${height - margin.bottom} Z`} fill="url(#grad)" opacity="0.1" />
            )}
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>

           {/* Data Points & Interactive Elements */}
           {cleanData.map((d, i) => (
             <g key={i} className="group/point cursor-crosshair">
                {/* Vertical Hover Line Guide */}
                <line 
                    x1={getX(i)} y1={margin.top} 
                    x2={getX(i)} y2={height - margin.bottom} 
                    stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" 
                    className="opacity-0 group-hover/point:opacity-100 transition-opacity" 
                />

                {/* Target Dot */}
                <circle cx={getX(i)} cy={getY(d.target)} r="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
                
                {/* Actual Dot */}
                <circle cx={getX(i)} cy={getY(d.actual)} r="5" className="fill-white stroke-indigo-600 stroke-[3px] transition-all group-hover/point:r-7 group-hover/point:fill-indigo-50 z-10 relative" />
                
                {/* Persistent Value Label (Actual) - Always visible, small */}
                <text 
                    x={getX(i)} y={getY(d.actual) - 12} 
                    textAnchor="middle" 
                    className="text-[9px] font-bold fill-indigo-600 opacity-0 md:opacity-100" 
                    style={{ fontSize: '9px' }}
                >
                    {formatMetricValue(d.actual, metricType)}
                </text>

                {/* Detailed Tooltip Overlay (Hover) */}
                <g className="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none z-50">
                    <rect x={getX(i) - 45} y={margin.top} width="90" height="45" rx="6" fill="#1e293b" stroke="#ffffff" strokeWidth="2" className="shadow-xl" />
                    
                    <text x={getX(i)} y={margin.top + 18} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                        {d.month} {d.year}
                    </text>
                    <text x={getX(i)} y={margin.top + 32} textAnchor="middle" fill="white" fontSize="12" fontWeight="black">
                        {formatMetricValue(d.actual, metricType)}
                    </text>
                </g>
             </g>
           ))}
        </svg>
      </div>
      
      {/* Tabular Data Breakdown */}
      <div className="mt-6 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Detailed Breakdown</h4>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
             {cleanData.map((d, i) => (
                 <div key={i} className={`text-center p-2 rounded-lg border ${d.actual >= d.target ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="text-[9px] font-black text-slate-500 uppercase">{d.month}</div>
                    <div className={`text-xs font-bold my-0.5 ${d.actual >= d.target ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatMetricValue(d.actual, metricType)}
                    </div>
                    <div className="text-[8px] text-slate-500">Target: {formatMetricValue(d.target, metricType)}</div>
                 </div>
             ))}
          </div>
      </div>
    </div>
  );
};


const SalesDashboard: React.FC<SalesDashboardProps> = ({ 
  employees, salesData, salesActions, currentUser, onAddAction, onToggleAction 
}) => {
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  
  // State for Chart Modal
  const [historyModal, setHistoryModal] = useState<{
      isOpen: boolean;
      employeeId: string;
      employeeName: string;
      metricType: string;
  } | null>(null);

  // PERMISSION CHECK: Admin, Sales Manager, or Sales Ops
  const canManageActions = useMemo(() => {
    if (currentUser.accessLevel === 'Admin') return true;
    const dept = currentUser.department.toLowerCase();
    const team = (currentUser.team || '').toLowerCase();
    if (currentUser.accessLevel === 'Manager' && dept.includes('sales')) return true;
    if (dept.includes('sales ops') || dept.includes('sales operations')) return true;
    if (team.includes('sales ops') || team.includes('sales operations')) return true;
    return false;
  }, [currentUser]);

  // Determine people with sales data (ignoring department label)
  const salesTeam = useMemo(() => {
    const idsWithData = new Set(salesData.map(d => d.employeeId));
    // Filter employees who have data OR are explicitly in Sales dept
    return employees.filter(e => idsWithData.has(e.id) || e.department.toLowerCase().includes('sales'));
  }, [employees, salesData]);

  // Extract unique teams for filtering
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    salesTeam.forEach(e => {
      if (e.team) teams.add(e.team);
    });
    return Array.from(teams).sort();
  }, [salesTeam]);

  // Apply filter
  const filteredSalesTeam = useMemo(() => {
    if (selectedTeam === 'All') return salesTeam;
    return salesTeam.filter(e => e.team === selectedTeam);
  }, [salesTeam, selectedTeam]);

  // Determine the "Current" month based on the LATEST data available across the entire dataset.
  const latestDataDate = useMemo(() => {
    if (salesData.length === 0) return new Date();
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sorted = [...salesData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return months.indexOf(b.month) - months.indexOf(a.month);
    });
    
    const latest = sorted[0];
    const monthIdx = months.indexOf(latest.month);
    return new Date(latest.year, monthIdx, 1);
  }, [salesData]);

  // Logic: Calculate RAG status based on history RELATIVE to the latest data point
  const calculateMetricHealth = (employeeId: string, metric: string): HealthStatus => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const currentMonthIdx = latestDataDate.getMonth();
    const currentYear = latestDataDate.getFullYear();
    
    let consecutiveMisses = 0;

    for (let i = 0; i < 3; i++) {
      let checkIdx = currentMonthIdx - i;
      let yearOffset = 0;
      if (checkIdx < 0) {
        checkIdx += 12;
        yearOffset = 1;
      }
      
      const m = months[checkIdx];
      const y = currentYear - yearOffset;
      
      const dataPoint = salesData.find(d => 
        d.employeeId === employeeId && 
        d.metricType === metric && 
        d.month === m && 
        d.year === y
      );

      if (dataPoint) {
        if (dataPoint.actual < dataPoint.target) {
          consecutiveMisses++;
        } else {
          break; 
        }
      }
    }

    if (consecutiveMisses >= 3) return HealthStatus.RED;
    if (consecutiveMisses === 2) return HealthStatus.AMBER;
    return HealthStatus.GREEN;
  };

  const getMetricValue = (employeeId: string, metric: string) => {
    const data = salesData
      .filter(d => d.employeeId === employeeId && d.metricType === metric)
      .sort((a,b) => b.year - a.year ||  
        ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(b.month) - 
        ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(a.month)
      )[0];
    
    return data;
  };

  const getHistoricalData = (employeeId: string, metric: string) => {
    return salesData.filter(d => d.employeeId === employeeId && d.metricType === metric);
  };

  const [newAction, setNewAction] = useState<Partial<SalesActionItem>>({ description: '', dueDate: '', metricType: 'General' });
  // Unified modal state: If set, modal is open. Metric can be pre-filled or empty.
  const [actionModalConfig, setActionModalConfig] = useState<{empId: string, prefillMetric?: string} | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sales Performance Monitor</h2>
           <p className="text-sm text-slate-500 font-medium">
             Tracking compliance against core KPIs. 
             <span className="ml-2 text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
               Latest Data: {latestDataDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
             </span>
           </p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> On Track
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2 Mo. Miss
           </div>
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> 3+ Mo. Miss
           </div>
        </div>
      </div>

      {uniqueTeams.length > 0 && (
         <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-300 shadow-sm w-fit animate-in slide-in-from-left-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Filter View:</span>
            <div className="flex gap-1">
               <button
                 onClick={() => setSelectedTeam('All')}
                 className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedTeam === 'All' ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}
               >
                 All
               </button>
               {uniqueTeams.map(t => (
                 <button
                   key={t}
                   onClick={() => setSelectedTeam(t)}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${selectedTeam === t ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'}`}
                 >
                   {t}
                 </button>
               ))}
            </div>
         </div>
      )}

      <div className="grid gap-6">
        {filteredSalesTeam.length > 0 ? filteredSalesTeam.map(employee => {
          const empMetrics = METRIC_TYPES.map(m => ({
            name: m,
            health: calculateMetricHealth(employee.id, m),
            data: getMetricValue(employee.id, m)
          }));

          // Hide users with NO data at all if they aren't explicitly in Sales dept
          const hasAnyData = empMetrics.some(m => m.data !== undefined);
          if (!hasAnyData && !employee.department.toLowerCase().includes('sales')) return null;

          const hasCriticalIssues = empMetrics.some(m => m.health === HealthStatus.RED || m.health === HealthStatus.AMBER);
          const activeActions = salesActions.filter(a => a.employeeId === employee.id && !a.isCompleted);

          return (
            <div key={employee.id} className={`bg-white rounded-2xl border transition-all overflow-hidden ${hasCriticalIssues ? 'border-amber-200 shadow-amber-100' : 'border-slate-300 shadow-sm'}`}>
              <div 
                className="p-6 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                  {/* Profile */}
                  <div className="flex items-center gap-4 w-72 shrink-0">
                    <img src={employee.avatarUrl} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt={employee.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                         <h3 className="font-black text-slate-800 text-sm md:text-base leading-tight">{employee.name}</h3>
                         {/* General Add Action Button (Authorized Only) */}
                         {canManageActions && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNewAction({ description: '', dueDate: '', metricType: 'General' });
                                    setActionModalConfig({ empId: employee.id });
                                }}
                                className="ml-2 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition-colors shrink-0"
                                title="Add Action Plan"
                            >
                                + Action
                            </button>
                         )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{employee.role}</p>
                      {employee.team && <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mt-0.5">{employee.team}</p>}
                    </div>
                  </div>

                  {/* Metrics Matrix Summary */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
                    {empMetrics.map(metric => (
                      <div key={metric.name} className="relative group/metric">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{metric.name}</div>
                        
                        {/* Interactive Value Area */}
                        <div 
                            className="flex items-end gap-2 p-1 -ml-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setHistoryModal({
                                    isOpen: true,
                                    employeeId: employee.id,
                                    employeeName: employee.name,
                                    metricType: metric.name
                                });
                            }}
                            title="Click to view trends"
                        >
                           <span className="text-lg font-black text-slate-700 underline decoration-dotted decoration-slate-300 underline-offset-4 group-hover/metric:decoration-indigo-400 group-hover/metric:text-indigo-600">
                             {metric.data ? formatMetricValue(metric.data.actual, metric.name) : '-'}
                           </span>
                           {metric.data && (
                             <span className={`text-[9px] font-bold mb-1 ${metric.data.actual >= metric.data.target ? 'text-emerald-500' : 'text-rose-500'}`}>
                               / {formatMetricValue(metric.data.target, metric.name)}
                             </span>
                           )}
                           <svg className="w-3 h-3 text-slate-300 opacity-0 group-hover/metric:opacity-100 transition-opacity ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                        </div>

                        {/* Status Bar */}
                        <div className={`h-1 w-full rounded-full mt-2 ${
                          metric.health === HealthStatus.RED ? 'bg-rose-500' : 
                          metric.health === HealthStatus.AMBER ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></div>
                      </div>
                    ))}
                  </div>

                  {/* Action Summary */}
                  <div className="w-32 shrink-0 text-right">
                    {activeActions.length > 0 ? (
                       <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                         {activeActions.length} Actions Req.
                       </span>
                    ) : (
                       <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                         All Clear
                       </span>
                    )}
                    <div className="mt-2 text-indigo-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-end gap-1">
                       {expandedEmployee === employee.id ? 'Collapse' : 'Manage'}
                       <svg className={`w-3 h-3 transform transition-transform ${expandedEmployee === employee.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Action Section */}
              {expandedEmployee === employee.id && (
                <div className="bg-slate-100 border-t border-slate-300 p-6 animate-in slide-in-from-top-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Performance Action Plan</h4>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* List of Metrics needing attention */}
                    <div className="space-y-4">
                       {empMetrics.filter(m => m.health !== HealthStatus.GREEN).length > 0 ? (
                         empMetrics.filter(m => m.health !== HealthStatus.GREEN).map(m => (
                           <div key={m.name} className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${m.health === HealthStatus.RED ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{m.name} Alert</span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium">
                                  Below target for {m.health === HealthStatus.RED ? '3+' : '2'} consecutive months.
                                </p>
                              </div>
                              
                              {canManageActions && (
                                  <button 
                                    onClick={() => {
                                        setNewAction({ description: '', dueDate: '', metricType: m.name });
                                        setActionModalConfig({ empId: employee.id, prefillMetric: m.name });
                                    }}
                                    className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors"
                                  >
                                    Add Action
                                  </button>
                              )}
                           </div>
                         ))
                       ) : (
                         <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-xl">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No critical performance alerts.</p>
                         </div>
                       )}
                    </div>

                    {/* Action Items List */}
                    <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
                       <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                         Assigned Actions
                       </div>
                       <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
                          {salesActions.filter(a => a.employeeId === employee.id).length > 0 ? (
                            salesActions.filter(a => a.employeeId === employee.id).map(action => (
                              <div key={action.id} className="p-4 flex gap-3 hover:bg-slate-100 transition-colors">
                                <button 
                                  onClick={() => onToggleAction(action.id, !action.isCompleted)}
                                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${action.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}
                                >
                                  {action.isCompleted && <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                                </button>
                                <div className="flex-1">
                                  <p className={`text-xs font-medium ${action.isCompleted ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                    {action.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                     <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{action.metricType}</span>
                                     <span className="text-[9px] text-slate-500">Due: {action.dueDate}</span>
                                     <span className="text-[9px] text-slate-300 ml-auto">By {action.assignedBy}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-slate-500 text-[10px] italic">No actions logged.</div>
                          )}
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="py-20 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
             <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No sales members found in this view.</p>
          </div>
        )}
      </div>

      {/* Inline Modal for Adding Action */}
      {actionModalConfig && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActionModalConfig(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Remedial Action Plan</h3>
             <div className="space-y-4">
                {actionModalConfig.prefillMetric ? (
                    <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                       <p className="text-xs text-rose-700 font-bold">
                         Targeting Alert: {actionModalConfig.prefillMetric}
                       </p>
                    </div>
                ) : (
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Category</label>
                        <select 
                             className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 text-sm font-medium"
                             value={newAction.metricType}
                             onChange={e => setNewAction({...newAction, metricType: e.target.value})}
                        >
                            <option value="General">General Performance</option>
                            {METRIC_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                )}
                
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Required Action</label>
                  <textarea 
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 text-sm font-medium h-24"
                    placeholder="e.g., Make 50 outbound calls per day until..."
                    value={newAction.description}
                    onChange={e => setNewAction({...newAction, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Target Date</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 text-sm font-medium"
                    value={newAction.dueDate}
                    onChange={e => setNewAction({...newAction, dueDate: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                   <button 
                     onClick={() => {
                        onAddAction({
                           employeeId: actionModalConfig.empId,
                           metricType: actionModalConfig.prefillMetric || newAction.metricType,
                           description: newAction.description,
                           dueDate: newAction.dueDate,
                           assignedBy: currentUser.name,
                           isCompleted: false,
                           createdAt: new Date().toISOString()
                        });
                        setActionModalConfig(null);
                        setNewAction({ description: '', dueDate: '', metricType: 'General' });
                     }}
                     className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors"
                   >
                     Assign Action
                   </button>
                   <button 
                     onClick={() => setActionModalConfig(null)}
                     className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                   >
                     Cancel
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Historical Chart Modal */}
      {historyModal && (
          <Modal 
             isOpen={historyModal.isOpen} 
             onClose={() => setHistoryModal(null)} 
             title=""
             maxWidth="max-w-3xl"
          >
             <TrendChart 
                data={getHistoricalData(historyModal.employeeId, historyModal.metricType)} 
                metricType={historyModal.metricType} 
                employeeName={historyModal.employeeName}
             />
          </Modal>
      )}
    </div>
  );
};

export default SalesDashboard;
