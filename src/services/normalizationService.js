/**
 * Normalization Service
 * Implements per-criterion Z-score normalization
 * 
 * Core Algorithm:
 * 1. Calculate Mean per criterion per judge
 * 2. Calculate StdDev per criterion per judge
 * 3. Calculate Z-score per criterion per team: Zc = (Score - Mean) / StdDev
 * 4. Calculate Weighted Z-score: Zw = Zc * Weight
 * 5. Team Score per Judge = Sum(Zw) for all criteria
 * 6. Final Team Score = Sum(Team Score per Judge) for all judges
 */

export const NormalizationMethods = {
  Z_SCORE: 'Z_SCORE',
  ROBUST_MAD: 'ROBUST_MAD' // Kept for interface compatibility, but implementation focuses on Z-Score
};

/**
 * Compute statistics (mean, stdDev) for each criterion for a judge
 * @param {Array} evaluations - evaluations by a single judge
 * @param {Array} criteria - scoring criteria
 * @returns {Object} - { criterionId: { mean, stdDev } }
 */
function computeJudgeStatistics(evaluations, criteria) {
  const stats = {};

  criteria.forEach(criterion => {
    // Extract valid scores for this criterion
    const values = evaluations
      .map(e => e.scores[criterion.id])
      .filter(v => v !== undefined && v !== null && typeof v === 'number');

    if (values.length === 0) {
      stats[criterion.id] = { mean: 0, stdDev: 0 };
      return;
    }

    // Step 1: Calculate Mean (μc)
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    // Step 2: Calculate Standard Deviation (σc)
    // Formula: σc = √{Σ(Xc − μc)^2 / Nj}
    let sumSquaredDiffs = 0;
    values.forEach(val => {
      const diff = val - mean;
      sumSquaredDiffs += diff * diff;
    });

    // Using population standard deviation as per formula implies division by N
    const stdDev = values.length > 0 ? Math.sqrt(sumSquaredDiffs / values.length) : 0;

    stats[criterion.id] = {
      mean,
      stdDev
    };
  });

  return stats;
}

/**
 * Compute z-score normalization for all evaluations
 * @param {Array} evaluations - [{judge_id, team_id, scores: {...}}, ...]
 * @param {Array} criteria - [{id, max_marks, weight}, ...]
 * @param {string} method - Normalization method (default Z_SCORE)
 * @returns {Array} - Normalized results per evaluation
 */
export function computePerJudgeNormalization(evaluations, criteria, method = NormalizationMethods.Z_SCORE) {
  const judgeGroups = {};

  // Group by judge
  evaluations.forEach(evalItem => {
    if (!judgeGroups[evalItem.judge_id]) {
      judgeGroups[evalItem.judge_id] = [];
    }
    judgeGroups[evalItem.judge_id].push(evalItem);
  });

  const results = [];

  Object.entries(judgeGroups).forEach(([judgeId, judgeEvals]) => {
    // Calculate stats per criterion for this judge
    const criterionStats = computeJudgeStatistics(judgeEvals, criteria);

    judgeEvals.forEach(evalItem => {
      let totalWeightedZ = 0;
      const criterionZScores = {}; // To store individual Zw for tie-breaking

      criteria.forEach(criterion => {
        const score = evalItem.scores[criterion.id];
        const stats = criterionStats[criterion.id];
        const weight = criterion.weight || 1.0;

        let zScore = 0;
        let weightedZ = 0;

        if (score !== undefined && score !== null && typeof score === 'number' && stats.stdDev > 0) {
          // Step 3: Calculate Z-score (Zc)
          zScore = (score - stats.mean) / stats.stdDev;

          // Step 4: Calculate Weighted Z-score (Zw)
          weightedZ = zScore * weight;
        }

        criterionZScores[criterion.id] = weightedZ;
        totalWeightedZ += weightedZ;
      });

      results.push({
        ...evalItem,
        z_score: totalWeightedZ, // This is technically sum of Zw per judge
        raw_total: computeRawTotal(evalItem, criteria), // Kept for reference
        criterion_stats: criterionStats,
        criterion_z_scores: criterionZScores
      });
    });
  });

  return results;
}

/**
 * Helper to compute raw total (for reference/display only)
 */
export function computeRawTotal(evaluation, criteria) {
  if (!evaluation.scores) return 0;
  let sum = 0;
  criteria.forEach(c => {
    const val = evaluation.scores[c.id];
    if (typeof val === 'number') sum += val;
  });
  return sum;
}

/**
 * Aggregate scores across judges (SUMMATION)
 * @param {Array} normalizedResults 
 * @param {Array} criteria 
 * @returns {Array}
 */
export function aggregateAcrossJudges(normalizedResults, criteria) {
  const teamGroups = {};

  normalizedResults.forEach(result => {
    if (!teamGroups[result.team_id]) {
      teamGroups[result.team_id] = [];
    }
    teamGroups[result.team_id].push(result);
  });

  const aggregated = [];

  Object.entries(teamGroups).forEach(([teamId, teamResults]) => {
    let finalZ = 0;
    const aggregatedCriterionZ = {};

    // Initialize aggregated criteria scores
    criteria.forEach(c => aggregatedCriterionZ[c.id] = 0);

    teamResults.forEach(result => {
      // Step 5: Add weighted Z-score per judge
      finalZ += result.z_score;

      // Aggregate individual criterion weighted scores for tie-breaking
      if (result.criterion_z_scores) {
        Object.entries(result.criterion_z_scores).forEach(([cId, score]) => {
          if (aggregatedCriterionZ[cId] !== undefined) {
            aggregatedCriterionZ[cId] += score;
          }
        });
      }
    });

    // Calculate raw stats for reference
    const rawTotals = teamResults.map(r => r.raw_total);
    const meanRaw = rawTotals.reduce((a, b) => a + b, 0) / rawTotals.length;

    aggregated.push({
      team_id: teamId,
      aggregated_z: finalZ,
      judge_count: teamResults.length,
      mean_raw_total: meanRaw,
      aggregated_criterion_z: aggregatedCriterionZ,
      team_results: teamResults
    });
  });

  return aggregated;
}

/**
 * Convert to percentiles and apply tie-breaking
 */
export function convertToPercentilesAndRanks(aggregatedResults, criteria) {
  // Sort by Final Z-Score descending
  const sorted = [...aggregatedResults].sort((a, b) => b.aggregated_z - a.aggregated_z);

  const withPercentiles = sorted.map((result, index) => {
    const percentile = sorted.length > 1
      ? ((sorted.length - 1 - index) / (sorted.length - 1)) * 100
      : 100;

    return {
      ...result,
      percentile: percentile,
      initial_rank: index + 1
    };
  });

  return applyTieBreaking(withPercentiles, criteria);
}

/**
 * Apply Tie-Breaking Logic:
 * 1. Weighted Z-Score (already sorted)
 * 2. Highest Weighted Criterion Score
 * 3. Next Highest Weighted Criterion Score...
 */
function applyTieBreaking(results, criteria) {
  // precision for float comparison
  const EPSILON = 0.0001;

  // Sort criteria by weight descending (for tie-breaking)
  const sortedCriteria = [...criteria].sort((a, b) => b.weight - a.weight);

  const finalResults = [...results].sort((a, b) => {
    // 1. Primary: Final Z-Score
    if (Math.abs(a.aggregated_z - b.aggregated_z) > EPSILON) {
      return b.aggregated_z - a.aggregated_z;
    }

    // 2. Tie-Breaker: Compare by highest weighted criteria
    for (const criterion of sortedCriteria) {
      const scoreA = a.aggregated_criterion_z[criterion.id] || 0;
      const scoreB = b.aggregated_criterion_z[criterion.id] || 0;

      if (Math.abs(scoreA - scoreB) > EPSILON) {
        return scoreB - scoreA;
      }
    }

    // 3. Fallback: Mean Raw Total (optional, but good for perfect ties)
    if (Math.abs(a.mean_raw_total - b.mean_raw_total) > EPSILON) {
      return b.mean_raw_total - a.mean_raw_total;
    }

    return 0; // True tie
  });

  // Assign Ranks
  let currentRank = 1;
  return finalResults.map((result, index) => {
    // Check if tied with previous
    let isTied = false;
    if (index > 0) {
      const prev = finalResults[index - 1];

      const zScoreTied = Math.abs(result.aggregated_z - prev.aggregated_z) < EPSILON;

      // Determine if all tie-breakers were also tied
      let criteriaTied = true;
      for (const criterion of sortedCriteria) {
        const scoreA = result.aggregated_criterion_z[criterion.id] || 0;
        const scoreB = prev.aggregated_criterion_z[criterion.id] || 0;
        if (Math.abs(scoreA - scoreB) > EPSILON) {
          criteriaTied = false;
          break;
        }
      }

      const rawTied = Math.abs(result.mean_raw_total - prev.mean_raw_total) < EPSILON;

      isTied = zScoreTied && criteriaTied && rawTied;
    }

    if (isTied) {
      // Keep same rank as previous
      // Note: This implements "dense" ranking (1, 2, 2, 3) or "standard" (1, 2, 2, 4)?
      // Usually standard competition ranking is 1, 2, 2, 4. 
      // The previous code implied standard ranking logic but implemented linear.
      // Let's stick to the previous loop's logic approach but cleaner:
      // Actually simpler: if tied with previous, rank is same. 
      // BUT `currentRank` usually increments by 1 every step, unless we manually control it.
      // Let's use standard competition ranking logic.
      result.rank = finalResults[index - 1].rank;
    } else {
      result.rank = index + 1;
    }

    result.tie_breaker_data = {
      aggregated_z: result.aggregated_z,
      criteria_scores: result.aggregated_criterion_z,
      is_tied: isTied
    };

    return result;
  });
}

/**
 * Main computation function for a round
 */
export function computeRoundNormalization(evaluations, criteria, options = {}) {
  const method = options.method || NormalizationMethods.Z_SCORE;
  // judgeWeights option is currently ignored/deprecated as user specified direct summation 
  // but if needed we could multiply `totalWeightedZ` by judge weight. 
  // For now, assuming standard summation as per user formula Z1 = (Z1)j1 + (Z1)j2

  // 1. Per Judge Normalization
  const perJudgeResults = computePerJudgeNormalization(evaluations, criteria, method);

  // 2. Aggregation (Summation)
  const aggregatedResults = aggregateAcrossJudges(perJudgeResults, criteria);

  // 3. Ranking & Tie-Breaking
  const finalResults = convertToPercentilesAndRanks(aggregatedResults, criteria);

  return {
    perJudgeResults,
    aggregatedResults,
    finalResults
  };
}




