import {
  computeRawTotal,
  computePerJudgeNormalization,
  aggregateAcrossJudges,
  convertToPercentilesAndRanks,
  computeRoundNormalization,
  NormalizationMethods
} from './normalizationService';

describe('Normalization Service', () => {
  const criteria = [
    { id: 'c1', name: 'Innovation', max_marks: 10, weight: 1.0 },
    { id: 'c2', name: 'Implementation', max_marks: 20, weight: 2.0 },
    { id: 'c3', name: 'Presentation', max_marks: 10, weight: 1.0 }
  ];

  /*
   * Sample Data Construction for Manual Verification:
   * 
   * Judge 1:
   * Team 1: c1=8, c2=16, c3=8
   * Team 2: c1=6, c2=14, c3=6
   * Team 3: c1=10, c2=18, c3=10
   * 
   * Valid Scores Arrays per Criterion for J1:
   * C1: [8, 6, 10] -> Mean=8, StdDev=1.633 (sqrt((0+4+4)/3) = sqrt(2.66))
   * C2: [16, 14, 18] -> Mean=16, StdDev=1.633
   * C3: [8, 6, 10] -> Mean=8, StdDev=1.633
   */

  describe('computePerJudgeNormalization', () => {
    test('computes z-scores per criterion correctly', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', scores: { c1: 8, c2: 16, c3: 8 } },
        { judge_id: 'j1', team_id: 't2', scores: { c1: 6, c2: 14, c3: 6 } },
        { judge_id: 'j1', team_id: 't3', scores: { c1: 10, c2: 18, c3: 10 } }
      ];

      const results = computePerJudgeNormalization(evaluations, criteria);

      expect(results).toHaveLength(3);

      const t1 = results.find(r => r.team_id === 't1');
      // For T1, all scores are exactly the mean, so Z should be 0 for all criteria
      // Total Z = 0*1 + 0*2 + 0*1 = 0
      expect(t1.z_score).toBeCloseTo(0, 5);

      const t3 = results.find(r => r.team_id === 't3');
      // For T3 (High scores):
      // C1: (10-8)/1.633 = 1.225 * 1 = 1.225
      // C2: (18-16)/1.633 = 1.225 * 2 = 2.45
      // C3: (10-8)/1.633 = 1.225 * 1 = 1.225
      // Total Z = 4.90
      expect(t3.z_score).toBeGreaterThan(0);
      expect(t3.criterion_z_scores['c1']).toBeCloseTo(1.2247, 3);
      expect(t3.criterion_z_scores['c2']).toBeCloseTo(2.4494, 3);
    });

    test('handles zero standard deviation (all same scores)', () => {
      const evaluations = [
        { judge_id: 'j1', team_id: 't1', scores: { c1: 8 } },
        { judge_id: 'j1', team_id: 't2', scores: { c1: 8 } }
      ];
      const singleCriterion = [{ id: 'c1', weight: 1 }];

      const results = computePerJudgeNormalization(evaluations, singleCriterion);

      results.forEach(r => {
        expect(r.z_score).toBe(0);
      });
    });
  });

  describe('aggregateAcrossJudges', () => {
    test('sums z-scores across judges', () => {
      const normalizedResults = [
        {
          team_id: 't1', judge_id: 'j1', z_score: 1.5, raw_total: 80,
          criterion_z_scores: { c1: 0.5, c2: 1.0 }
        },
        {
          team_id: 't1', judge_id: 'j2', z_score: 2.0, raw_total: 85,
          criterion_z_scores: { c1: 1.0, c2: 1.0 }
        }
      ];

      const aggregated = aggregateAcrossJudges(normalizedResults, criteria);

      expect(aggregated).toHaveLength(1);

      const t1 = aggregated[0];
      // Sum: 1.5 + 2.0 = 3.5
      expect(t1.aggregated_z).toBeCloseTo(3.5, 5);
      expect(t1.judge_count).toBe(2);

      // Check criteria aggregation (sum)
      expect(t1.aggregated_criterion_z['c1']).toBeCloseTo(1.5, 5);
      expect(t1.aggregated_criterion_z['c2']).toBeCloseTo(2.0, 5);
    });
  });

  describe('Ranking and Tie-Breaking', () => {
    test('breaks tie using highest weighted criterion', () => {
      // Scenario:
      // Team A: Total Z = 10. Criteria C2 (w=2) score = 5.
      // Team B: Total Z = 10. Criteria C2 (w=2) score = 6.
      // Team B should win because it has higher score in highest weighted crit (C2).

      const aggregatedResults = [
        {
          team_id: 'A', aggregated_z: 10, mean_raw_total: 80,
          aggregated_criterion_z: { c1: 5, c2: 5, c3: 0 } // Total 10
        },
        {
          team_id: 'B', aggregated_z: 10, mean_raw_total: 80,
          aggregated_criterion_z: { c1: 4, c2: 6, c3: 0 } // Total 10
        }
      ];

      const results = convertToPercentilesAndRanks(aggregatedResults, criteria);

      const rankA = results.find(r => r.team_id === 'A').rank;
      const rankB = results.find(r => r.team_id === 'B').rank;

      expect(rankB).toBeLessThan(rankA); // Lower rank number is better (1 vs 2)
      expect(rankB).toBe(1);
      expect(rankA).toBe(2);
    });

    test('handles strict ties correctly', () => {
      const aggregatedResults = [
        {
          team_id: 'A', aggregated_z: 10, mean_raw_total: 80,
          aggregated_criterion_z: { c1: 5, c2: 5 }
        },
        {
          team_id: 'B', aggregated_z: 10, mean_raw_total: 80,
          aggregated_criterion_z: { c1: 5, c2: 5 }
        }
      ];

      const results = convertToPercentilesAndRanks(aggregatedResults, criteria);

      expect(results[0].rank).toBe(results[1].rank); // Should be tied
      expect(results[0].tie_breaker_data.is_tied).toBeDefined();
    });
  });

  describe('Full Round Computation Integration', () => {
    test('computes correct ranks for multi-judge setup', () => {
      const testCriteria = [
        { id: 'c1', weight: 1.0 }, // Low weight
        { id: 'c2', weight: 2.0 }  // High weight
      ];

      // J1 Evaluations
      // A: c1=10(Z=1), c2=10(Z=1) -> Zw1=1, Zw2=2 -> Total=3
      // B: c1=10(Z=1), c2=5 (Z=-1)-> Zw1=1, Zw2=-2 -> Total=-1
      // Evaluated ideally (mean=10, std=?) - simplified manual check difficult without raw calc
      // Let's rely on code consistency for finding specific winners

      const evaluations = [
        { judge_id: 'j1', team_id: 'A', scores: { c1: 10, c2: 20 } },
        { judge_id: 'j1', team_id: 'B', scores: { c1: 8, c2: 18 } },

        // J2 gives A slightly lower on C2 but higher on C1
        { judge_id: 'j2', team_id: 'A', scores: { c1: 9, c2: 19 } },
        { judge_id: 'j2', team_id: 'B', scores: { c1: 8, c2: 18 } }
      ];

      const result = computeRoundNormalization(evaluations, testCriteria);

      const teamA = result.finalResults.find(r => r.team_id === 'A');
      const teamB = result.finalResults.find(r => r.team_id === 'B');

      // Team A has consistently higher raw scores, should be Rank 1
      expect(teamA.rank).toBe(1);
      expect(teamB.rank).toBe(2);
    });
  });
});

