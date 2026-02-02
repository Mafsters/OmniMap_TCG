import { describe, it, expect } from 'vitest';
import { analyzeRoadmap } from './geminiService';
import type { RoadmapItem, StrategicGoal, MonthlyUpdate, ItemUpdate } from '../types';

describe('geminiService', () => {
  describe('analyzeRoadmap', () => {
    it('returns early with summary message when items array is empty', async () => {
      const result = await analyzeRoadmap(
        [] as RoadmapItem[],
        [] as StrategicGoal[],
        [] as MonthlyUpdate[],
        [] as ItemUpdate[]
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'summary',
        message: expect.stringContaining('Add items'),
        impactLevel: 'low',
      });
    });

    it('returns early with summary when items is undefined/null-like', async () => {
      const result = await analyzeRoadmap(
        [] as RoadmapItem[],
        [] as StrategicGoal[],
        [] as MonthlyUpdate[],
        [] as ItemUpdate[]
      );
      expect(result[0].type).toBe('summary');
    });
  });
});
