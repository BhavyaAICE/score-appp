import {
  computeRawTotal,
  computePerJudgeNormalization,
  aggregateAcrossJudges,
  convertToPercentilesAndRanks,
  computeRoundNormalization,
  NormalizationMethods
} from './normalizationService';

describe('Normalization Service', () => {
  describe('computeRawTotal', () => {
    const criteria = [
      { id: 'c1', max_marks: 10, weight: 1.0 },
      { id: 'c2', max_marks: 20, weight: 2.0 },
      { id: 'c3', max_marks: 10, weight: 1.0 }
    ];

    test('computes correct weighted total', () => {
      const evaluation = {
        scores: { c1: 8, c2: 16, c3: 9 }
      };

      const total = computeRawTotal(evaluation, criteria);

      const expected = ((8/10) * 1.0 + (16/20) * 2.0 + (9/10) * 1.0) / (1.0 + 2.0 + 1.0) * 100;

      expect(total).toBeCloseTo(expected, 2);
    });

    test('handles empty scores', () => {
      const evaluation = { scores: {} };
      expect(computeRawTotal(evaluation, criteria)).toBe(0);
    });

    test('handles partial scores', () => {
      const evaluation = { scores: { c1: 10 } };
      const total = computeRawTotal(evaluation, criteria);
      expect(total).toBeGreaterThan(0);
    });

    test('normalizes to 0-100 scale', () => {
      const evaluation = { scores: { c1: 10, c2: 20, c3: 10 } };
      const total = computeRawTotal(evaluation, criteria);
      expect(total).toBe(100);
    });
  });

  describe('computePerJudgeNormalization - Z-Score', () => {
    test('computes z-scores correctly for multiple judges', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', raw_total: 80 },
        { judge_id: 'j1', team_id: 't2', raw_total: 60 },
        { judge_id: 'j1', team_id: 't3', raw_total: 70 },
        { judge_id: 'j2', team_id: 't1', raw_total: 85 },
        { judge_id: 'j2', team_id: 't2', raw_total: 65 },
        { judge_id: 'j2', team_id: 't3', raw_total: 80 }
      ];

      const results = computePerJudgeNormalization(evaluations, NormalizationMethods.Z_SCORE);

      expect(results).toHaveLength(6);

      const j1Results = results.filter(r => r.judge_id === 'j1');
      expect(j1Results[0].judge_mean).toBeCloseTo(70, 1);

      const j1t1 = j1Results.find(r => r.team_id === 't1');
      expect(j1t1.z_score).toBeGreaterThan(0);
    });

    test('handles single evaluation per judge (sets z-score to 0)', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', raw_total: 80 }
      ];

      const results = computePerJudgeNormalization(evaluations);

      expect(results[0].z_score).toBe(0);
      expect(results[0].judge_std).toBe(0);
    });

    test('handles zero variance (all same scores)', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', raw_total: 70 },
        { judge_id: 'j1', team_id: 't2', raw_total: 70 },
        { judge_id: 'j1', team_id: 't3', raw_total: 70 }
      ];

      const results = computePerJudgeNormalization(evaluations);

      results.forEach(result => {
        expect(result.z_score).toBe(0);
        expect(result.judge_std).toBe(0);
      });
    });
  });

  describe('computePerJudgeNormalization - Robust MAD', () => {
    test('computes MAD-based normalization', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', raw_total: 80 },
        { judge_id: 'j1', team_id: 't2', raw_total: 60 },
        { judge_id: 'j1', team_id: 't3', raw_total: 70 }
      ];

      const results = computePerJudgeNormalization(evaluations, NormalizationMethods.ROBUST_MAD);

      expect(results).toHaveLength(3);
      expect(results[0].judge_mean).toBeCloseTo(70, 1);
      expect(results[0].z_score).toBeDefined();
    });

    test('handles outliers better than z-score', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', raw_total: 70 },
        { judge_id: 'j1', team_id: 't2', raw_total: 72 },
        { judge_id: 'j1', team_id: 't3', raw_total: 100 }
      ];

      const resultsZScore = computePerJudgeNormalization(evaluations, NormalizationMethods.Z_SCORE);
      const resultsMAD = computePerJudgeNormalization(evaluations, NormalizationMethods.ROBUST_MAD);

      const outlierZScore = resultsZScore.find(r => r.team_id === 't3').z_score;
      const outlierMAD = resultsMAD.find(r => r.team_id === 't3').z_score;

      expect(Math.abs(outlierMAD)).toBeLessThan(Math.abs(outlierZScore));
    });
  });

  describe('aggregateAcrossJudges', () => {
    test('aggregates z-scores with equal weights', () => {
      const normalizedResults = [
        { team_id: 't1', judge_id: 'j1', z_score: 1.0, raw_total: 80 },
        { team_id: 't1', judge_id: 'j2', z_score: 0.5, raw_total: 85 },
        { team_id: 't2', judge_id: 'j1', z_score: -1.0, raw_total: 60 },
        { team_id: 't2', judge_id: 'j2', z_score: -0.5, raw_total: 65 }
      ];

      const aggregated = aggregateAcrossJudges(normalizedResults);

      expect(aggregated).toHaveLength(2);

      const t1 = aggregated.find(a => a.team_id === 't1');
      expect(t1.aggregated_z).toBeCloseTo(0.75, 2);
      expect(t1.judge_count).toBe(2);
    });

    test('applies judge weights correctly', () => {
      const normalizedResults = [
        { team_id: 't1', judge_id: 'j1', z_score: 1.0, raw_total: 80 },
        { team_id: 't1', judge_id: 'j2', z_score: 0.0, raw_total: 70 }
      ];

      const judgeWeights = { j1: 2.0, j2: 1.0 };
      const aggregated = aggregateAcrossJudges(normalizedResults, judgeWeights);

      const t1 = aggregated.find(a => a.team_id === 't1');
      const expected = (1.0 * 2.0 + 0.0 * 1.0) / (2.0 + 1.0);
      expect(t1.aggregated_z).toBeCloseTo(expected, 4);
    });

    test('handles unequal judge counts per team', () => {
      const normalizedResults = [
        { team_id: 't1', judge_id: 'j1', z_score: 1.0, raw_total: 80 },
        { team_id: 't1', judge_id: 'j2', z_score: 0.5, raw_total: 85 },
        { team_id: 't2', judge_id: 'j1', z_score: -1.0, raw_total: 60 }
      ];

      const aggregated = aggregateAcrossJudges(normalizedResults);

      const t1 = aggregated.find(a => a.team_id === 't1');
      const t2 = aggregated.find(a => a.team_id === 't2');

      expect(t1.judge_count).toBe(2);
      expect(t2.judge_count).toBe(1);
    });
  });

  describe('convertToPercentilesAndRanks', () => {
    test('converts aggregated results to percentiles', () => {
      const aggregatedResults = [
        { team_id: 't1', aggregated_z: 1.5, judge_count: 2, mean_raw_total: 85, median_raw_total: 85 },
        { team_id: 't2', aggregated_z: 0.5, judge_count: 2, mean_raw_total: 75, median_raw_total: 75 },
        { team_id: 't3', aggregated_z: -0.5, judge_count: 2, mean_raw_total: 65, median_raw_total: 65 }
      ];

      const results = convertToPercentilesAndRanks(aggregatedResults);

      expect(results).toHaveLength(3);

      const t1 = results.find(r => r.team_id === 't1');
      expect(t1.rank).toBe(1);
      expect(t1.percentile).toBeCloseTo(100, 1);

      const t3 = results.find(r => r.team_id === 't3');
      expect(t3.rank).toBe(3);
      expect(t3.percentile).toBeCloseTo(0, 1);
    });

    test('applies tie-breaking rules correctly', () => {
      const aggregatedResults = [
        { team_id: 't1', aggregated_z: 1.0, judge_count: 2, mean_raw_total: 85, median_raw_total: 85 },
        { team_id: 't2', aggregated_z: 1.0, judge_count: 2, mean_raw_total: 80, median_raw_total: 80 }
      ];

      const results = convertToPercentilesAndRanks(aggregatedResults);

      const t1 = results.find(r => r.team_id === 't1');
      const t2 = results.find(r => r.team_id === 't2');

      expect(t1.rank).toBeLessThan(t2.rank);
    });

    test('flags unresolved ties', () => {
      const aggregatedResults = [
        { team_id: 't1', aggregated_z: 1.0, judge_count: 2, mean_raw_total: 85, median_raw_total: 85 },
        { team_id: 't2', aggregated_z: 1.0, judge_count: 2, mean_raw_total: 85, median_raw_total: 85 }
      ];

      const results = convertToPercentilesAndRanks(aggregatedResults);

      const t2 = results.find(r => r.team_id === 't2');
      expect(t2.tie_breaker_data.requires_manual_resolution).toBe(true);
    });
  });

  describe('computeRoundNormalization - Integration', () => {
    const criteria = [
      { id: 'c1', name: 'Innovation', max_marks: 10, weight: 1.0 },
      { id: 'c2', name: 'Implementation', max_marks: 10, weight: 1.0 }
    ];

    const evaluations = [
      { id: 'e1', judge_id: 'j1', team_id: 't1', scores: { c1: 8, c2: 9 } },
      { id: 'e2', judge_id: 'j1', team_id: 't2', scores: { c1: 6, c2: 7 } },
      { id: 'e3', judge_id: 'j1', team_id: 't3', scores: { c1: 7, c2: 8 } },
      { id: 'e4', judge_id: 'j2', team_id: 't1', scores: { c1: 8.5, c2: 9 } },
      { id: 'e5', judge_id: 'j2', team_id: 't2', scores: { c1: 6.5, c2: 8 } },
      { id: 'e6', judge_id: 'j2', team_id: 't3', scores: { c1: 8, c2: 8.5 } }
    ];

    test('complete round computation produces correct ranking', () => {
      const result = computeRoundNormalization(evaluations, criteria);

      expect(result.perJudgeResults).toBeDefined();
      expect(result.aggregatedResults).toBeDefined();
      expect(result.finalResults).toBeDefined();

      expect(result.finalResults).toHaveLength(3);

      const rankedResults = result.finalResults.sort((a, b) => a.rank - b.rank);
      expect(rankedResults[0].team_id).toBe('t1');
      expect(rankedResults[2].team_id).toBe('t2');
    });

    test('acceptance test: J1=[80,60,70], J2=[85,65,80] ranks A>C>B', () => {
      const testCriteria = [
        { id: 'c1', max_marks: 100, weight: 1.0 }
      ];

      const testEvaluations = [
        { judge_id: 'j1', team_id: 'A', scores: { c1: 80 } },
        { judge_id: 'j1', team_id: 'B', scores: { c1: 60 } },
        { judge_id: 'j1', team_id: 'C', scores: { c1: 70 } },
        { judge_id: 'j2', team_id: 'A', scores: { c1: 85 } },
        { judge_id: 'j2', team_id: 'B', scores: { c1: 65 } },
        { judge_id: 'j2', team_id: 'C', scores: { c1: 80 } }
      ];

      const result = computeRoundNormalization(testEvaluations, testCriteria);

      const rankedResults = result.finalResults.sort((a, b) => a.rank - b.rank);

      expect(rankedResults[0].team_id).toBe('A');
      expect(rankedResults[1].team_id).toBe('C');
      expect(rankedResults[2].team_id).toBe('B');
    });
  });
});
