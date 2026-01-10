/**
 * Compute Round Service
 * Orchestrates the computation of normalized results for a round
 * Saves results to database with full audit trail
 */

import { supabase } from '../supabaseClient';
import { computeRoundNormalization, NormalizationMethods } from './normalizationService';

/**
 * Compute and store normalized results for a round
 * @param {string} roundId - UUID of the round
 * @param {Object} options - {method: 'Z_SCORE'|'ROBUST_MAD', computedBy: userId}
 * @returns {Promise<Object>} - {success, results, error}
 */
export async function computeRound(roundId, options = {}) {
  try {
    const method = options.method || NormalizationMethods.Z_SCORE;
    const computedBy = options.computedBy;

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .maybeSingle();

    if (roundError) throw roundError;
    if (!round) throw new Error('Round not found');

    const { data: criteria, error: criteriaError } = await supabase
      .from('round_criteria')
      .select('*')
      .eq('round_id', roundId)
      .order('display_order');

    if (criteriaError) throw criteriaError;
    if (!criteria || criteria.length === 0) {
      throw new Error('No criteria defined for this round');
    }

    const { data: evaluations, error: evalsError } = await supabase
      .from('round_evaluations')
      .select('*')
      .eq('round_id', roundId)
      .eq('is_draft', false);

    if (evalsError) throw evalsError;
    if (!evaluations || evaluations.length === 0) {
      throw new Error('No submitted evaluations found');
    }

    const { data: judgeAssignments, error: judgesError } = await supabase
      .from('round_judge_assignments')
      .select('*')
      .eq('round_id', roundId);

    if (judgesError) throw judgesError;

    const judgeWeights = {};
    judgeAssignments?.forEach(assignment => {
      judgeWeights[assignment.judge_id] = assignment.judge_weight || 1.0;
    });

    const { perJudgeResults, finalResults } = computeRoundNormalization(
      evaluations,
      criteria,
      { method, judgeWeights }
    );

    const { error: deleteError } = await supabase
      .from('round_normalization_results')
      .delete()
      .eq('round_id', roundId);

    if (deleteError) throw deleteError;

    const normalizationRecords = [];

    perJudgeResults.forEach(result => {
      normalizationRecords.push({
        round_id: roundId,
        team_id: result.team_id,
        judge_id: result.judge_id,
        raw_total: result.raw_total,
        judge_mean: result.judge_mean,
        judge_std: result.judge_std,
        z_score: result.z_score,
        aggregated_z: null,
        percentile: null,
        rank: null,
        tie_breaker_data: {},
        computed_at: new Date().toISOString()
      });
    });

    finalResults.forEach(result => {
      result.team_results.forEach(teamResult => {
        const existingIndex = normalizationRecords.findIndex(
          r => r.team_id === result.team_id && r.judge_id === teamResult.judge_id
        );

        if (existingIndex >= 0) {
          normalizationRecords[existingIndex].aggregated_z = result.aggregated_z;
          normalizationRecords[existingIndex].percentile = result.percentile;
          normalizationRecords[existingIndex].rank = result.rank;
          normalizationRecords[existingIndex].tie_breaker_data = result.tie_breaker_data;
        }
      });
    });

    const { error: insertError } = await supabase
      .from('round_normalization_results')
      .insert(normalizationRecords);

    if (insertError) throw insertError;

    const uniqueJudges = new Set(evaluations.map(e => e.judge_id)).size;
    const uniqueTeams = new Set(evaluations.map(e => e.team_id)).size;

    const { error: logError } = await supabase
      .from('round_compute_logs')
      .insert({
        round_id: roundId,
        normalization_method: method,
        computation_params: { judgeWeights },
        teams_evaluated: uniqueTeams,
        judges_count: uniqueJudges,
        computed_by: computedBy,
        computed_at: new Date().toISOString()
      });

    if (logError) throw logError;

    const { error: updateError } = await supabase
      .from('rounds')
      .update({
        is_computed: true,
        computed_at: new Date().toISOString(),
        normalization_method: method
      })
      .eq('id', roundId);

    if (updateError) throw updateError;

    return {
      success: true,
      results: finalResults,
      stats: {
        teams_evaluated: uniqueTeams,
        judges_count: uniqueJudges,
        method
      }
    };

  } catch (error) {
    console.error('Error computing round:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get computed results for a round
 * @param {string} roundId
 * @returns {Promise<Array>} - normalized results with team info
 */
export async function getRoundResults(roundId) {
  try {
    const { data, error } = await supabase
      .from('round_normalization_results')
      .select(`
        *,
        teams (
          id,
          name,
          category_id
        ),
        judges (
          id,
          name,
          category
        )
      `)
      .eq('round_id', roundId)
      .order('rank', { ascending: true, nullsFirst: false });

    if (error) throw error;

    const teamMap = {};
    data?.forEach(result => {
      if (!teamMap[result.team_id]) {
        teamMap[result.team_id] = {
          team_id: result.team_id,
          team_name: result.teams?.name,
          team_category: result.teams?.category_id,
          rank: result.rank,
          percentile: result.percentile,
          aggregated_z: result.aggregated_z,
          tie_breaker_data: result.tie_breaker_data,
          judge_evaluations: []
        };
      }

      teamMap[result.team_id].judge_evaluations.push({
        judge_id: result.judge_id,
        judge_name: result.judges?.name,
        judge_category: result.judges?.category,
        raw_total: result.raw_total,
        judge_mean: result.judge_mean,
        judge_std: result.judge_std,
        z_score: result.z_score
      });
    });

    return Object.values(teamMap).sort((a, b) => (a.rank || 999) - (b.rank || 999));

  } catch (error) {
    console.error('Error getting round results:', error);
    return [];
  }
}

/**
 * Check if a round is ready to compute
 * @param {string} roundId
 * @returns {Promise<Object>} - {ready, missing, stats}
 */
export async function checkRoundReadiness(roundId) {
  try {
    const { data: criteria } = await supabase
      .from('round_criteria')
      .select('id')
      .eq('round_id', roundId);

    const { data: judges } = await supabase
      .from('round_judge_assignments')
      .select('judge_id')
      .eq('round_id', roundId);

    const { data: evaluations } = await supabase
      .from('round_evaluations')
      .select('judge_id, team_id, is_draft')
      .eq('round_id', roundId);

    const missing = [];
    if (!criteria || criteria.length === 0) {
      missing.push('No criteria defined');
    }
    if (!judges || judges.length === 0) {
      missing.push('No judges assigned');
    }

    const submittedEvals = evaluations?.filter(e => !e.is_draft) || [];
    if (submittedEvals.length === 0) {
      missing.push('No submitted evaluations');
    }

    const draftEvals = evaluations?.filter(e => e.is_draft) || [];

    return {
      ready: missing.length === 0,
      missing,
      stats: {
        criteria_count: criteria?.length || 0,
        judges_count: judges?.length || 0,
        submitted_evaluations: submittedEvals.length,
        draft_evaluations: draftEvals.length
      }
    };

  } catch (error) {
    console.error('Error checking round readiness:', error);
    return {
      ready: false,
      missing: [error.message],
      stats: {}
    };
  }
}
