import { 
  RoadmapItem, 
  StrategicGoal, 
  MonthlyUpdate, 
  ItemUpdate, 
  Employee, 
  SalesMetricData,
  HealthStatus,
  ExecutiveSummary,
  BigRockProgress,
  KeyMetrics,
  RiskIssue,
  FinancialHighlights
} from '../types';

export class BoardDeckService {
  /**
   * Generate Executive Summary
   */
  generateExecutiveSummary(
    items: RoadmapItem[],
    updates: ItemUpdate[],
    monthlyUpdates: MonthlyUpdate[],
    month: string,
    year: number
  ): ExecutiveSummary {
    // Calculate overall health
    const periodUpdates = updates.filter(u => u.month === month && u.year === year);
    const healthCounts = {
      green: 0,
      amber: 0,
      red: 0,
      total: periodUpdates.length
    };

    periodUpdates.forEach(u => {
      if (u.health === 'green') healthCounts.green++;
      else if (u.health === 'amber') healthCounts.amber++;
      else if (u.health === 'red') healthCounts.red++;
    });

    // Extract key achievements (GREEN items with progress > 80%)
    const achievements = items
      .filter(item => {
        const update = periodUpdates.find(u => u.itemId === item.id);
        return update?.health === 'green' && item.progress >= 80;
      })
      .slice(0, 5)
      .map(item => item.title);

    // Top priorities (HIGH/CRITICAL priority items)
    const priorities = items
      .filter(item => item.priority === 'HIGH' || item.priority === 'CRITICAL')
      .filter(item => item.status !== 'Done')
      .slice(0, 3)
      .map(item => item.title);

    // Critical blockers (RED status or BLOCKED)
    const blockers = items
      .filter(item => item.status === 'Blocked' || periodUpdates.find(u => u.itemId === item.id && u.health === 'red'))
      .slice(0, 5)
      .map(item => ({
        title: item.title,
        description: item.description || 'No description',
        owner: item.owner,
        status: periodUpdates.find(u => u.itemId === item.id)?.health || 'red' as HealthStatus
      }));

    return {
      overallHealth: healthCounts,
      keyAchievements: achievements,
      topPriorities: priorities,
      criticalBlockers: blockers
    };
  }

  /**
   * Generate Big Rocks Progress
   */
  generateBigRocksProgress(
    goals: StrategicGoal[],
    items: RoadmapItem[],
    monthlyUpdates: MonthlyUpdate[],
    itemUpdates: ItemUpdate[],
    month: string,
    year: number
  ): BigRockProgress[] {
    const previousMonth = this.getPreviousMonth(month, year);

    return goals.map(goal => {
      const goalItems = items.filter(item => item.goalId === goal.id);
      const goalUpdate = monthlyUpdates.find(u => u.goalId === goal.id && u.month === month && u.year === year);
      const prevUpdate = monthlyUpdates.find(u => u.goalId === goal.id && u.month === previousMonth.month && u.year === previousMonth.year);

      // Calculate average progress
      const avgProgress = goalItems.length > 0
        ? goalItems.reduce((sum, item) => sum + item.progress, 0) / goalItems.length
        : 0;

      // Determine status
      let status: HealthStatus = 'green';
      if (goalUpdate) {
        status = goalUpdate.status;
      } else {
        // Infer from items
        const redItems = goalItems.filter(item => {
          const update = itemUpdates.find(u => u.itemId === item.id && u.month === month && u.year === year);
          return update?.health === 'red' || item.status === 'Blocked';
        });
        if (redItems.length > goalItems.length * 0.3) status = 'red';
        else if (redItems.length > 0 || goalItems.some(i => i.status === 'Blocked')) status = 'amber';
      }

      // Status change
      let statusChange: 'improved' | 'declined' | 'stable' = 'stable';
      if (prevUpdate && goalUpdate) {
        const prevStatus = prevUpdate.status;
        const currStatus = goalUpdate.status;
        if (prevStatus === 'red' && currStatus !== 'red') statusChange = 'improved';
        else if (prevStatus !== 'red' && currStatus === 'red') statusChange = 'declined';
        else if (prevStatus === 'green' && currStatus === 'amber') statusChange = 'declined';
        else if (prevStatus === 'amber' && currStatus === 'green') statusChange = 'improved';
      }

      // Extract milestones from items
      const milestones = goalItems
        .filter(item => item.endDate)
        .map(item => ({
          title: item.title,
          date: item.endDate,
          completed: item.status === 'Done' || item.progress === 100
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      return {
        goal,
        progress: Math.round(avgProgress),
        status,
        update: goalUpdate,
        statusChange,
        milestones
      };
    });
  }

  /**
   * Generate Key Metrics
   */
  generateKeyMetrics(
    salesData: SalesMetricData[],
    items: RoadmapItem[],
    itemUpdates: ItemUpdate[],
    employees: Employee[],
    month: string,
    year: number
  ): KeyMetrics {
    const periodSales = salesData.filter(s => s.month === month && s.year === year);
    const previousMonth = this.getPreviousMonth(month, year);
    const prevSales = salesData.filter(s => s.month === previousMonth.month && s.year === previousMonth.year);

    // Sales metrics
    const revenue = periodSales.filter(s => s.metricType === 'Revenue');
    const conversion = periodSales.filter(s => s.metricType === 'Conversion');
    const listings = periodSales.filter(s => s.metricType === 'Listings');

    const getSalesMetric = (current: SalesMetricData[], previous: SalesMetricData[], type: string) => {
      const curr = current.find(s => s.metricType === type);
      const prev = previous.find(s => s.metricType === type);
      const target = curr?.target || 0;
      const actual = curr?.actual || 0;
      const prevActual = prev?.actual || 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (prevActual > 0) {
        if (actual > prevActual * 1.05) trend = 'up';
        else if (actual < prevActual * 0.95) trend = 'down';
      }

      return { target, actual, trend };
    };

    // Goal metrics
    const periodUpdates = itemUpdates.filter(u => u.month === month && u.year === year);
    const onTrack = periodUpdates.filter(u => u.health === 'green').length;
    const atRisk = periodUpdates.filter(u => u.health === 'amber').length;
    const blocked = items.filter(i => i.status === 'Blocked').length;
    const completed = items.filter(i => i.status === 'Done').length;
    const completionRate = items.length > 0 ? (completed / items.length) * 100 : 0;

    // Department metrics
    const departments = Array.from(new Set(employees.map(e => e.department)))
      .map(dept => {
        const deptEmployees = employees.filter(e => e.department === dept);
        const deptItems = items.filter(i => 
          deptEmployees.some(e => e.name === i.owner || e.id === i.owner)
        );
        const deptUpdates = periodUpdates.filter(u => 
          deptItems.some(i => i.id === u.itemId)
        );
        
        const redCount = deptUpdates.filter(u => u.health === 'red').length;
        const amberCount = deptUpdates.filter(u => u.health === 'amber').length;
        
        let health: HealthStatus = 'green';
        if (redCount > deptUpdates.length * 0.3) health = 'red';
        else if (redCount > 0 || amberCount > deptUpdates.length * 0.4) health = 'amber';

        return {
          name: dept,
          health,
          goalsCompleted: deptItems.filter(i => i.status === 'Done').length,
          goalsTotal: deptItems.length
        };
      });

    return {
      sales: {
        revenue: getSalesMetric(revenue, prevSales.filter(s => s.metricType === 'Revenue'), 'Revenue'),
        conversion: getSalesMetric(conversion, prevSales.filter(s => s.metricType === 'Conversion'), 'Conversion'),
        listings: getSalesMetric(listings, prevSales.filter(s => s.metricType === 'Listings'), 'Listings')
      },
      goals: {
        completionRate: Math.round(completionRate),
        onTrack,
        atRisk,
        blocked
      },
      departments
    };
  }

  /**
   * Generate Risks & Issues
   */
  generateRisksIssues(
    items: RoadmapItem[],
    itemUpdates: ItemUpdate[],
    monthlyUpdates: MonthlyUpdate[],
    employees: Employee[],
    month: string,
    year: number
  ): RiskIssue[] {
    const periodUpdates = itemUpdates.filter(u => u.month === month && u.year === year);
    const risks: RiskIssue[] = [];

    // RED status items
    periodUpdates
      .filter(u => u.health === 'red')
      .forEach(update => {
        const item = items.find(i => i.id === update.itemId);
        if (item) {
          risks.push({
            id: `risk-${item.id}`,
            title: item.title,
            description: update.content || item.description || 'No description',
            status: 'red',
            owner: item.owner,
            department: item.department,
            escalated: item.priority === 'CRITICAL' || item.status === 'Blocked',
            item,
            update
          });
        }
      });

    // AMBER items requiring attention
    periodUpdates
      .filter(u => u.health === 'amber')
      .forEach(update => {
        const item = items.find(i => i.id === update.itemId);
        if (item && (item.priority === 'HIGH' || item.priority === 'CRITICAL')) {
          risks.push({
            id: `risk-${item.id}`,
            title: item.title,
            description: update.content || item.description || 'No description',
            status: 'amber',
            owner: item.owner,
            department: item.department,
            escalated: false,
            item,
            update
          });
        }
      });

    // Blocked items
    items
      .filter(item => item.status === 'Blocked')
      .forEach(item => {
        if (!risks.find(r => r.item?.id === item.id)) {
          const update = periodUpdates.find(u => u.itemId === item.id);
          risks.push({
            id: `blocked-${item.id}`,
            title: item.title,
            description: item.description || 'Item is blocked',
            status: 'red',
            owner: item.owner,
            department: item.department,
            escalated: true,
            item,
            update
          });
        }
      });

    // Big Rocks with RED status
    monthlyUpdates
      .filter(u => u.month === month && u.year === year && u.status === 'red')
      .forEach(update => {
        risks.push({
          id: `rock-${update.goalId}`,
          title: `Strategic Goal: ${update.goalId}`,
          description: update.content || 'Strategic goal at risk',
          status: 'red',
          owner: 'Leadership',
          department: 'Strategic',
          escalated: true,
          update
        });
      });

    return risks.sort((a, b) => {
      // Sort by: escalated first, then by status (red > amber)
      if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
      if (a.status !== b.status) return a.status === 'red' ? -1 : 1;
      return 0;
    });
  }

  /**
   * Generate Financial Highlights
   */
  generateFinancialHighlights(
    salesData: SalesMetricData[],
    month: string,
    year: number
  ): FinancialHighlights {
    const periodSales = salesData.filter(s => s.month === month && s.year === year);
    const revenueData = periodSales.filter(s => s.metricType === 'Revenue');
    
    // Calculate total revenue
    const current = revenueData.reduce((sum, s) => sum + s.actual, 0);
    const target = revenueData.reduce((sum, s) => sum + s.target, 0);
    const variance = current - target;
    const variancePercent = target > 0 ? (variance / target) * 100 : 0;

    // Get trends (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends: Array<{ period: string; revenue: number; target: number }> = [];
    
    for (let i = 5; i >= 0; i--) {
      const trendMonth = this.getPreviousMonth(month, year, i);
      const trendSales = salesData.filter(s => 
        s.month === trendMonth.month && s.year === trendMonth.year && s.metricType === 'Revenue'
      );
      const trendRevenue = trendSales.reduce((sum, s) => sum + s.actual, 0);
      const trendTarget = trendSales.reduce((sum, s) => sum + s.target, 0);
      trends.push({
        period: `${trendMonth.month} ${trendMonth.year}`,
        revenue: trendRevenue,
        target: trendTarget
      });
    }

    // Key metrics
    const conversionData = periodSales.find(s => s.metricType === 'Conversion');
    const listingsData = periodSales.find(s => s.metricType === 'Listings');
    const salesRateData = periodSales.find(s => s.metricType === 'Sales Rate');

    const keyMetrics = [
      {
        label: 'Revenue',
        value: current,
        format: 'currency' as const,
        trend: variancePercent > 5 ? 'up' : variancePercent < -5 ? 'down' : 'stable' as const
      },
      {
        label: 'Conversion Rate',
        value: conversionData ? conversionData.actual * 100 : 0,
        format: 'percentage' as const
      },
      {
        label: 'Listings',
        value: listingsData ? listingsData.actual : 0,
        format: 'number' as const
      },
      {
        label: 'Sales Rate',
        value: salesRateData ? salesRateData.actual * 100 : 0,
        format: 'percentage' as const
      }
    ];

    return {
      revenue: {
        current,
        target,
        variance,
        variancePercent: Math.round(variancePercent * 10) / 10
      },
      trends,
      keyMetrics
    };
  }

  /**
   * Helper: Get previous month
   */
  private getPreviousMonth(month: string, year: number, offset: number = 1): { month: string; year: number } {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = months.indexOf(month);
    let newIdx = idx - offset;
    let newYear = year;
    
    while (newIdx < 0) {
      newIdx += 12;
      newYear--;
    }
    
    return { month: months[newIdx], year: newYear };
  }
}

export const boardDeckService = new BoardDeckService();
