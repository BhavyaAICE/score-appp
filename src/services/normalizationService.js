/**
 * Normalization Service
 * Implements z-score and robust MAD normalization for judge scoring
 *
 * Core Algorithm:
 * 1. Compute per-judge weighted total (0-100 scale)
 * 2. Standardize per-judge using z-score or MAD
 * 3. Aggregate z-scores across judges per team
 * 4. Convert to percentiles and ranks with tie-breaking
 */

export const NormalizationMethods = {
  Z_SCORE: 'Z_SCORE',
  ROBUST_MAD: 'ROBUST_MAD'
};

/**
 * Compute raw weighted total for a single evaluation
 * @param {Object} evaluation - {scores: {criterionId: value}, ...}
 * @param {Array} criteria - [{id, max_marks, weight}, ...]
 * @returns {number} - raw_total (0-100 scale)
 */
export function computeRawTotal(evaluation, criteria) {
  if (!evaluation.scores || Object.keys(evaluation.scores).length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  criteria.forEach(criterion => {
    const score = evaluation.scores[criterion.id];
    if (score !== undefined && score !== null) {
      const normalizedScore = score / criterion.max_marks;
      const weight = criterion.weight || 1.0;
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return 0;

  return (weightedSum / totalWeight) * 100;
}

/**
 * Compute population standard deviation
 * @param {Array<number>} values
 * @param {number} mean
 * @returns {number}
 */
function computeStdDev(values, mean) {
  if (values.length === 0) return 0;

  const sumSquaredDiffs = values.reduce((sum, val) => {
    const diff = val - mean;
    return sum + (diff * diff);
  }, 0);

  return Math.sqrt(sumSquaredDiffs / values.length);
}

/**
 * Compute median of array
 * @param {Array<number>} values
 * @returns {number}
 */
function computeMedian(values) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute Median Absolute Deviation (MAD)
 * @param {Array<number>} values
 * @param {number} median
 * @returns {number}
 */
function computeMAD(values, median) {
  if (values.length === 0) return 0;

  const absoluteDeviations = values.map(val => Math.abs(val - median));
  return computeMedian(absoluteDeviations);
}

/**
 * Compute z-score normalization for all evaluations
 * @param {Array} evaluations - [{judge_id, team_id, raw_total}, ...]
 * @param {string} method - Z_SCORE or ROBUST_MAD
 * @returns {Array} - [{judge_id, team_id, raw_total, judge_mean, judge_std, z_score}, ...]
 */
export function computePerJudgeNormalization(evaluations, method = NormalizationMethods.Z_SCORE) {
  const judgeGroups = {};

  evaluations.forEach(eval => {
    if (!judgeGroups[eval.judge_id]) {
      judgeGroups[eval.judge_id] = [];
    }
    judgeGroups[eval.judge_id].push(eval);
  });

  const results = [];

  Object.entries(judgeGroups).forEach(([judgeId, judgeEvals]) => {
    const rawTotals = judgeEvals.map(e => e.raw_total);

    if (rawTotals.length < 2) {
      judgeEvals.forEach(eval => {
        results.push({
          ...eval,
          judge_mean: rawTotals[0] || 0,
          judge_std: 0,
          z_score: 0
        });
      });
      return;
    }

    if (method === NormalizationMethods.ROBUST_MAD) {
      const median = computeMedian(rawTotals);
      const mad = computeMAD(rawTotals, median);

      if (mad === 0) {
        judgeEvals.forEach(eval => {
          results.push({
            ...eval,
            judge_mean: median,
            judge_std: 0,
            z_score: 0
          });
        });
      } else {
        const madScaleFactor = 1.4826;
        judgeEvals.forEach(eval => {
          const zScore = (eval.raw_total - median) / (madScaleFactor * mad);
          results.push({
            ...eval,
            judge_mean: median,
            judge_std: mad * madScaleFactor,
            z_score: zScore
          });
        });
      }
    } else {
      const mean = rawTotals.reduce((sum, val) => sum + val, 0) / rawTotals.length;
      const stdDev = computeStdDev(rawTotals, mean);

      if (stdDev === 0) {
        judgeEvals.forEach(eval => {
          results.push({
            ...eval,
            judge_mean: mean,
            judge_std: 0,
            z_score: 0
          });
        });
      } else {
        judgeEvals.forEach(eval => {
          const zScore = (eval.raw_total - mean) / stdDev;
          results.push({
            ...eval,
            judge_mean: mean,
            judge_std: stdDev,
            z_score: zScore
          });
        });
      }
    }
  });

  return results;
}

/**
 * Aggregate z-scores per team across judges
 * @param {Array} normalizedResults - results from computePerJudgeNormalization
 * @param {Object} judgeWeights - {judgeId: weight} (optional)
 * @returns {Array} - [{team_id, aggregated_z, judge_count, mean_raw_total, median_scores}, ...]
 */
export function aggregateAcrossJudges(normalizedResults, judgeWeights = {}) {
  const teamGroups = {};

  normalizedResults.forEach(result => {
    if (!teamGroups[result.team_id]) {
      teamGroups[result.team_id] = [];
    }
    teamGroups[result.team_id].push(result);
  });

  const aggregated = [];

  Object.entries(teamGroups).forEach(([teamId, teamResults]) => {
    let sumZ = 0;
    let sumWeights = 0;
    const rawTotals = [];

    teamResults.forEach(result => {
      const weight = judgeWeights[result.judge_id] || 1.0;
      sumZ += result.z_score * weight;
      sumWeights += weight;
      rawTotals.push(result.raw_total);
    });

    const aggregatedZ = sumWeights > 0 ? sumZ / sumWeights : 0;
    const meanRawTotal = rawTotals.reduce((sum, val) => sum + val, 0) / rawTotals.length;
    const medianRawTotal = computeMedian(rawTotals);

    aggregated.push({
      team_id: teamId,
      aggregated_z: aggregatedZ,
      judge_count: teamResults.length,
      mean_raw_total: meanRawTotal,
      median_raw_total: medianRawTotal,
      team_results: teamResults
    });
  });

  return aggregated;
}

/**
 * Convert aggregated z-scores to percentiles
 * @param {Array} aggregatedResults - from aggregateAcrossJudges
 * @returns {Array} - [{team_id, aggregated_z, percentile, rank}, ...]
 */
export function convertToPercentilesAndRanks(aggregatedResults) {
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

  return applyTieBreaking(withPercentiles);
}

/**
 * Apply deterministic tie-breaking rules
 * @param {Array} results - results with percentile and initial_rank
 * @returns {Array} - results with final rank
 */
function applyTieBreaking(results) {
  const groups = [];
  let currentGroup = [];
  let lastPercentile = null;

  results.forEach((result, index) => {
    if (lastPercentile === null || Math.abs(result.percentile - lastPercentile) < 0.0001) {
      currentGroup.push(result);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [result];
    }
    lastPercentile = result.percentile;
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const finalResults = [];
  let currentRank = 1;

  groups.forEach(group => {
    if (group.length === 1) {
      finalResults.push({
        ...group[0],
        rank: currentRank,
        tie_breaker_data: {}
      });
    } else {
      const sorted = [...group].sort((a, b) => {
        if (Math.abs(a.aggregated_z - b.aggregated_z) > 0.0001) {
          return b.aggregated_z - a.aggregated_z;
        }

        if (Math.abs(a.mean_raw_total - b.mean_raw_total) > 0.0001) {
          return b.mean_raw_total - a.mean_raw_total;
        }

        if (Math.abs(a.median_raw_total - b.median_raw_total) > 0.0001) {
          return b.median_raw_total - a.median_raw_total;
        }

        if (a.judge_count !== b.judge_count) {
          return b.judge_count - a.judge_count;
        }

        return 0;
      });

      sorted.forEach((result, idx) => {
        const isTied = idx > 0 && (
          Math.abs(result.aggregated_z - sorted[idx - 1].aggregated_z) < 0.0001 &&
          Math.abs(result.mean_raw_total - sorted[idx - 1].mean_raw_total) < 0.0001 &&
          Math.abs(result.median_raw_total - sorted[idx - 1].median_raw_total) < 0.0001 &&
          result.judge_count === sorted[idx - 1].judge_count
        );

        finalResults.push({
          ...result,
          rank: currentRank + idx,
          tie_breaker_data: {
            requires_manual_resolution: isTied,
            aggregated_z: result.aggregated_z,
            mean_raw_total: result.mean_raw_total,
            median_raw_total: result.median_raw_total,
            judge_count: result.judge_count
          }
        });
      });
    }

    currentRank += group.length;
  });

  return finalResults;
}

/**
 * Main computation function for a round
 * @param {Array} evaluations - [{id, round_id, judge_id, team_id, scores}, ...]
 * @param {Array} criteria - [{id, max_marks, weight}, ...]
 * @param {Object} options - {method: 'Z_SCORE'|'ROBUST_MAD', judgeWeights: {}}
 * @returns {Object} - {perJudgeResults, aggregatedResults, finalResults}
 */
export function computeRoundNormalization(evaluations, criteria, options = {}) {
  const method = options.method || NormalizationMethods.Z_SCORE;
  const judgeWeights = options.judgeWeights || {};

  const evaluationsWithRawTotals = evaluations.map(eval => ({
    ...eval,
    raw_total: computeRawTotal(eval, criteria)
  }));

  const perJudgeResults = computePerJudgeNormalization(evaluationsWithRawTotals, method);

  const aggregatedResults = aggregateAcrossJudges(perJudgeResults, judgeWeights);

  const finalResults = convertToPercentilesAndRanks(aggregatedResults);

  return {
    perJudgeResults,
    aggregatedResults,
    finalResults
  };
}
