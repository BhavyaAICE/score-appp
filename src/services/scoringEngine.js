/**
 * Scoring Engine Client
 * 
 * This is a THIN CLIENT that only calls backend RPC functions.
 * ALL computation happens server-side via Supabase PostgreSQL functions.
 * 
 * The frontend can ONLY:
 * - Submit raw judge scores
 * - Request score computation (if authorized)
 * - Read computed results
 * 
 * The frontend CANNOT:
 * - Perform any calculations
 * - Submit pre-calculated values
 * - Modify computed results
 */

import { supabase } from '../supabaseClient';

export const ScoringMethods = {
  Z_SCORE: 'Z_SCORE',
  ROBUST_MAD: 'ROBUST_MAD'
};

export const scoringEngine = {
  /**
   * Submit raw scores for a team evaluation
   * All validation and storage happens server-side
   * 
   * @param {UUID} roundId - The round being evaluated
   * @param {UUID} teamId - The team being scored
   * @param {Object} scores - Object mapping criterion ID to raw score value
   * @param {boolean} isDraft - Whether this is a draft submission
   * @returns {Object} Result from backend
   */
  async submitRawScores(roundId, teamId, scores, isDraft = false) {
    if (this.containsComputedFields(scores)) {
      throw new Error('Pre-calculated values not allowed. Submit raw scores only.');
    }

    const { data, error } = await supabase
      .rpc('submit_raw_scores', {
        p_round_id: roundId,
        p_team_id: teamId,
        p_scores: scores,
        p_is_draft: isDraft
      });

    if (error) {
      console.error('Score submission error:', error);
      throw new Error(error.message || 'Failed to submit scores');
    }

    if (!data.success) {
      throw new Error(data.error || 'Score submission failed');
    }

    return data;
  },

  /**
   * Check if scores object contains forbidden computed fields
   * Rejects any attempt to submit pre-calculated values
   */
  containsComputedFields(scores) {
    const forbiddenFields = [
      'z_score', 'normalized', 'weighted', 'final', 
      'rank', 'percentile', 'aggregated', 'mean', 
      'std', 'variance', 'computed'
    ];

    const keys = Object.keys(scores || {});
    return keys.some(key => 
      forbiddenFields.some(forbidden => 
        key.toLowerCase().includes(forbidden)
      )
    );
  },

  /**
   * Request backend to compute scores for a round
   * Only authorized users (event_admin, super_admin) can trigger this
   * All computation happens server-side using USP formulas
   * 
   * @param {UUID} roundId - The round to compute
   * @returns {Object} Computation result from backend
   */
  async computeRoundScores(roundId) {
    const { data, error } = await supabase
      .rpc('compute_round_scores', {
        p_round_id: roundId
      });

    if (error) {
      console.error('Computation error:', error);
      throw new Error(error.message || 'Failed to compute scores');
    }

    if (!data.success) {
      throw new Error(data.error || 'Score computation failed');
    }

    return data;
  },

  /**
   * Get computed results for a round
   * Results are computed server-side and only retrieved here
   * 
   * @param {UUID} roundId - The round to get results for
   * @returns {Object} Results from backend
   */
  async getRoundResults(roundId) {
    const { data, error } = await supabase
      .rpc('get_round_results', {
        p_round_id: roundId
      });

    if (error) {
      console.error('Get results error:', error);
      throw new Error(error.message || 'Failed to get results');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to retrieve results');
    }

    return data.results;
  },

  /**
   * Get judge's own submitted evaluations for a round
   * Does not include any computed values
   */
  async getMyEvaluations(roundId) {
    const { data, error } = await supabase
      .from('raw_evaluations')
      .select('id, team_id, scores, is_draft, submitted_at')
      .eq('round_id', roundId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Get evaluations error:', error);
      throw new Error(error.message || 'Failed to get evaluations');
    }

    return data || [];
  },

  /**
   * Get evaluation progress for a judge
   * Returns count of completed and pending evaluations
   */
  async getEvaluationProgress(roundId) {
    const { data: assignments, error: assignError } = await supabase
      .from('judge_assignments')
      .select('team_id')
      .eq('round_id', roundId);

    if (assignError) {
      console.warn('Assignment check error:', assignError);
      return { total: 0, completed: 0, pending: 0 };
    }

    const { data: submitted, error: submitError } = await supabase
      .from('raw_evaluations')
      .select('team_id')
      .eq('round_id', roundId)
      .eq('is_draft', false);

    if (submitError) {
      console.warn('Submission check error:', submitError);
      return { total: assignments?.length || 0, completed: 0, pending: assignments?.length || 0 };
    }

    const submittedTeams = new Set((submitted || []).map(s => s.team_id));
    const total = assignments?.length || 0;
    const completed = (assignments || []).filter(a => submittedTeams.has(a.team_id)).length;

    return {
      total,
      completed,
      pending: total - completed,
      progress: total > 0 ? (completed / total) * 100 : 0
    };
  },

  /**
   * Get scoring criteria for a round
   * Returns criteria definitions only - no computed values
   */
  async getRoundCriteria(roundId) {
    const { data, error } = await supabase
      .from('round_criteria')
      .select('id, name, description, max_marks, min_marks, weight, display_order')
      .eq('round_id', roundId)
      .order('display_order');

    if (error) {
      console.error('Get criteria error:', error);
      throw new Error(error.message || 'Failed to get criteria');
    }

    return data || [];
  },

  /**
   * Validate scores locally before submission
   * This is a convenience check - server does full validation
   */
  validateScoresLocally(scores, criteria) {
    const errors = [];

    if (!scores || typeof scores !== 'object') {
      errors.push('Scores must be an object');
      return errors;
    }

    if (this.containsComputedFields(scores)) {
      errors.push('Cannot submit pre-calculated values');
      return errors;
    }

    for (const criterion of criteria) {
      const score = scores[criterion.id];

      if (score === undefined || score === null) {
        errors.push(`Missing score for ${criterion.name}`);
        continue;
      }

      if (typeof score !== 'number' || isNaN(score)) {
        errors.push(`Invalid score for ${criterion.name}`);
        continue;
      }

      const minScore = criterion.min_marks || 0;
      if (score < minScore || score > criterion.max_marks) {
        errors.push(`${criterion.name}: Score must be between ${minScore} and ${criterion.max_marks}`);
      }
    }

    return errors;
  }
};

export default scoringEngine;
