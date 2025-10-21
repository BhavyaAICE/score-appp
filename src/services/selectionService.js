/**
 * Selection Service
 * Implements team selection logic for advancing to next round
 * - Per-judge top N selection
 * - Global top K selection
 */

import { supabase } from '../supabaseClient';

export const SelectionModes = {
  PER_JUDGE_TOP_N: 'PER_JUDGE_TOP_N',
  GLOBAL_TOP_K: 'GLOBAL_TOP_K'
};

/**
 * Select top N teams per judge based on their raw_total rankings
 * @param {string} roundId
 * @param {number} topN - 2, 5, or 10
 * @param {Object} options - {judgeTypes: ['HARDWARE', 'SOFTWARE', 'BOTH']}
 * @returns {Promise<Object>} - {success, selected, breakdown}
 */
export async function selectPerJudgeTopN(roundId, topN, options = {}) {
  try {
    if (![2, 5, 10].includes(topN)) {
      throw new Error('topN must be 2, 5, or 10');
    }

    const judgeTypes = options.judgeTypes || ['HARDWARE', 'SOFTWARE', 'BOTH'];

    const { data: judges, error: judgesError } = await supabase
      .from('round_judge_assignments')
      .select('judge_id, judge_type')
      .eq('round_id', roundId)
      .in('judge_type', judgeTypes);

    if (judgesError) throw judgesError;
    if (!judges || judges.length === 0) {
      throw new Error('No judges found matching criteria');
    }

    const { data: normResults, error: normError } = await supabase
      .from('round_normalization_results')
      .select(`
        team_id,
        judge_id,
        raw_total,
        z_score,
        teams (
          id,
          name
        )
      `)
      .eq('round_id', roundId);

    if (normError) throw normError;
    if (!normResults || normResults.length === 0) {
      throw new Error('No normalized results found. Please compute round first.');
    }

    const judgeSelections = {};
    const selectedTeamsSet = new Set();
    const breakdown = [];

    judges.forEach(judge => {
      const judgeEvals = normResults.filter(r => r.judge_id === judge.judge_id);

      const sorted = [...judgeEvals].sort((a, b) => b.raw_total - a.raw_total);

      const topTeams = sorted.slice(0, topN);

      judgeSelections[judge.judge_id] = {
        judge_id: judge.judge_id,
        judge_type: judge.judge_type,
        selected_teams: topTeams.map(t => ({
          team_id: t.team_id,
          team_name: t.teams?.name,
          raw_total: t.raw_total,
          z_score: t.z_score
        })),
        total_evaluated: judgeEvals.length
      };

      topTeams.forEach(t => selectedTeamsSet.add(t.team_id));

      breakdown.push({
        judge_id: judge.judge_id,
        judge_type: judge.judge_type,
        teams_evaluated: judgeEvals.length,
        teams_selected: topTeams.length,
        selected_team_ids: topTeams.map(t => t.team_id)
      });
    });

    const selectedTeams = Array.from(selectedTeamsSet);

    return {
      success: true,
      selected: selectedTeams,
      breakdown,
      stats: {
        total_judges: judges.length,
        total_selected: selectedTeams.length,
        top_n: topN
      }
    };

  } catch (error) {
    console.error('Error in selectPerJudgeTopN:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Select top K teams globally based on aggregated percentile/rank
 * @param {string} roundId
 * @param {number} topK - number of teams to select
 * @returns {Promise<Object>} - {success, selected, teams}
 */
export async function selectGlobalTopK(roundId, topK) {
  try {
    const { data: normResults, error: normError } = await supabase
      .from('round_normalization_results')
      .select(`
        team_id,
        percentile,
        rank,
        aggregated_z,
        teams (
          id,
          name
        )
      `)
      .eq('round_id', roundId)
      .not('rank', 'is', null)
      .order('rank', { ascending: true });

    if (normError) throw normError;
    if (!normResults || normResults.length === 0) {
      throw new Error('No normalized results found. Please compute round first.');
    }

    const teamMap = {};
    normResults.forEach(result => {
      if (!teamMap[result.team_id]) {
        teamMap[result.team_id] = {
          team_id: result.team_id,
          team_name: result.teams?.name,
          rank: result.rank,
          percentile: result.percentile,
          aggregated_z: result.aggregated_z
        };
      }
    });

    const uniqueTeams = Object.values(teamMap).sort((a, b) => a.rank - b.rank);

    const topTeams = uniqueTeams.slice(0, topK);

    return {
      success: true,
      selected: topTeams.map(t => t.team_id),
      teams: topTeams,
      stats: {
        total_teams: uniqueTeams.length,
        teams_selected: topTeams.length,
        top_k: topK
      }
    };

  } catch (error) {
    console.error('Error in selectGlobalTopK:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save selection and promote teams to next round
 * @param {string} fromRoundId
 * @param {string} toRoundId
 * @param {Array<string>} teamIds
 * @param {string} selectionMode
 * @param {Object} selectionCriteria
 * @returns {Promise<Object>}
 */
export async function saveAndPromoteTeams(fromRoundId, toRoundId, teamIds, selectionMode, selectionCriteria = {}) {
  try {
    const { error: deleteError } = await supabase
      .from('round_team_selections')
      .delete()
      .eq('from_round_id', fromRoundId);

    if (deleteError) throw deleteError;

    const selections = teamIds.map(teamId => ({
      from_round_id: fromRoundId,
      to_round_id: toRoundId,
      team_id: teamId,
      selection_mode: selectionMode,
      selection_criteria: selectionCriteria,
      selected_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('round_team_selections')
      .insert(selections);

    if (insertError) throw insertError;

    return {
      success: true,
      promoted_count: teamIds.length
    };

  } catch (error) {
    console.error('Error saving and promoting teams:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get teams selected for a round
 * @param {string} toRoundId
 * @returns {Promise<Array>}
 */
export async function getSelectedTeamsForRound(toRoundId) {
  try {
    const { data, error } = await supabase
      .from('round_team_selections')
      .select(`
        *,
        teams (
          id,
          name,
          category_id
        )
      `)
      .eq('to_round_id', toRoundId);

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error('Error getting selected teams:', error);
    return [];
  }
}

/**
 * Check if only one judge participated (stop condition)
 * @param {string} roundId
 * @returns {Promise<boolean>}
 */
export async function shouldStopAfterRound(roundId) {
  try {
    const { data: judges, error } = await supabase
      .from('round_judge_assignments')
      .select('judge_id')
      .eq('round_id', roundId);

    if (error) throw error;

    return judges && judges.length === 1;

  } catch (error) {
    console.error('Error checking stop condition:', error);
    return false;
  }
}

/**
 * Main selection orchestrator
 * @param {string} roundId
 * @param {Object} config - {mode, topN, topK, judgeTypes, createNextRound}
 * @returns {Promise<Object>}
 */
export async function executeSelection(roundId, config) {
  try {
    const shouldStop = await shouldStopAfterRound(roundId);
    if (shouldStop) {
      return {
        success: true,
        stop: true,
        message: 'Only one judge in round. No next round needed.'
      };
    }

    let selectionResult;

    if (config.mode === SelectionModes.PER_JUDGE_TOP_N) {
      selectionResult = await selectPerJudgeTopN(
        roundId,
        config.topN || 5,
        { judgeTypes: config.judgeTypes }
      );
    } else if (config.mode === SelectionModes.GLOBAL_TOP_K) {
      selectionResult = await selectGlobalTopK(roundId, config.topK || 10);
    } else {
      throw new Error('Invalid selection mode');
    }

    if (!selectionResult.success) {
      return selectionResult;
    }

    if (selectionResult.selected.length === 0) {
      return {
        success: false,
        error: 'No teams selected'
      };
    }

    let toRoundId = config.toRoundId;

    if (config.createNextRound) {
      const { data: currentRound } = await supabase
        .from('rounds')
        .select('event_id, round_number')
        .eq('id', roundId)
        .maybeSingle();

      if (currentRound) {
        const { data: nextRound, error: createError } = await supabase
          .from('rounds')
          .insert({
            event_id: currentRound.event_id,
            name: `Round ${currentRound.round_number + 1}`,
            round_number: currentRound.round_number + 1,
            status: 'draft',
            max_criteria: 5
          })
          .select()
          .maybeSingle();

        if (createError) throw createError;
        toRoundId = nextRound.id;
      }
    }

    if (toRoundId) {
      const saveResult = await saveAndPromoteTeams(
        roundId,
        toRoundId,
        selectionResult.selected,
        config.mode,
        { topN: config.topN, topK: config.topK, judgeTypes: config.judgeTypes }
      );

      if (!saveResult.success) {
        return saveResult;
      }
    }

    return {
      success: true,
      selected: selectionResult.selected,
      to_round_id: toRoundId,
      stats: selectionResult.stats,
      breakdown: selectionResult.breakdown
    };

  } catch (error) {
    console.error('Error executing selection:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
