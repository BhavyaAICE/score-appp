/**
 * Round Service
 * Handles all round-related operations including judge assignments and evaluations
 */

import { supabase } from '../supabaseClient';

export const roundService = {
  // ==================== ROUND MANAGEMENT ====================
  
  async getRoundsByEvent(eventId) {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('event_id', eventId)
      .order('round_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getRound(roundId) {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateRoundStatus(roundId, status) {
    const { data, error } = await supabase
      .from('rounds')
      .update({ status })
      .eq('id', roundId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== ROUND JUDGE ASSIGNMENTS ====================
  
  async getRoundJudgeAssignments(roundId) {
    const { data, error } = await supabase
      .from('round_judge_assignments')
      .select(`
        *,
        judge:judges(id, name, email, category)
      `)
      .eq('round_id', roundId);

    if (error) throw error;
    return data || [];
  },

  async getJudgeRoundAssignments(judgeId) {
    const { data, error } = await supabase
      .from('round_judge_assignments')
      .select(`
        *,
        round:rounds(*)
      `)
      .eq('judge_id', judgeId)
      .order('round_id');

    if (error) throw error;
    return data || [];
  },

  async assignJudgeToRound(roundId, judgeId, judgeType = 'BOTH', judgeWeight = 1.0) {
    const { data, error } = await supabase
      .from('round_judge_assignments')
      .upsert([{
        round_id: roundId,
        judge_id: judgeId,
        judge_type: judgeType,
        judge_weight: judgeWeight
      }], { onConflict: 'round_id,judge_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeJudgeFromRound(roundId, judgeId) {
    const { error } = await supabase
      .from('round_judge_assignments')
      .delete()
      .eq('round_id', roundId)
      .eq('judge_id', judgeId);

    if (error) throw error;
  },

  async setRoundJudges(roundId, judgeIds, judgeType = 'BOTH') {
    // First remove all existing assignments for this round
    const { error: deleteError } = await supabase
      .from('round_judge_assignments')
      .delete()
      .eq('round_id', roundId);

    if (deleteError) throw deleteError;

    // Then insert new assignments
    if (judgeIds && judgeIds.length > 0) {
      const assignments = judgeIds.map(judgeId => ({
        round_id: roundId,
        judge_id: judgeId,
        judge_type: judgeType,
        judge_weight: 1.0
      }));

      const { error: insertError } = await supabase
        .from('round_judge_assignments')
        .insert(assignments);

      if (insertError) throw insertError;
    }
  },

  // ==================== JUDGE TEAM ASSIGNMENTS (per round) ====================

  async getJudgeTeamAssignmentsForRound(roundId) {
    const { data, error } = await supabase
      .from('judge_assignments')
      .select(`
        *,
        judge:judges(id, name, email, category),
        team:teams(id, name, project_title, category_id)
      `)
      .eq('round_id', roundId);

    if (error) throw error;
    return data || [];
  },

  async assignTeamsToJudgeForRound(roundId, judgeId, teamIds) {
    // Remove existing team assignments for this judge in this round
    const { error: deleteError } = await supabase
      .from('judge_assignments')
      .delete()
      .eq('round_id', roundId)
      .eq('judge_id', judgeId);

    if (deleteError) throw deleteError;

    // Insert new assignments
    if (teamIds && teamIds.length > 0) {
      const assignments = teamIds.map(teamId => ({
        round_id: roundId,
        judge_id: judgeId,
        team_id: teamId
      }));

      const { error: insertError } = await supabase
        .from('judge_assignments')
        .insert(assignments);

      if (insertError) throw insertError;
    }
  },

  async getTeamsAssignedToJudgeForRound(roundId, judgeId) {
    const { data, error } = await supabase
      .from('judge_assignments')
      .select('team_id, team:teams(*)')
      .eq('round_id', roundId)
      .eq('judge_id', judgeId);

    if (error) throw error;
    return (data || []).map(a => a.team);
  },

  // ==================== ROUND CRITERIA ====================

  async getRoundCriteria(roundId) {
    const { data, error } = await supabase
      .from('round_criteria')
      .select('*')
      .eq('round_id', roundId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createRoundCriterion(roundId, criterionData) {
    const { data, error } = await supabase
      .from('round_criteria')
      .insert([{
        round_id: roundId,
        ...criterionData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRoundCriterion(criterionId, criterionData) {
    const { data, error } = await supabase
      .from('round_criteria')
      .update(criterionData)
      .eq('id', criterionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteRoundCriterion(criterionId) {
    const { error } = await supabase
      .from('round_criteria')
      .delete()
      .eq('id', criterionId);

    if (error) throw error;
  },

  // ==================== ROUND EVALUATIONS ====================

  async getRoundEvaluations(roundId) {
    const { data, error } = await supabase
      .from('round_evaluations')
      .select(`
        *,
        judge:judges(id, name, email),
        team:teams(id, name, project_title)
      `)
      .eq('round_id', roundId);

    if (error) throw error;
    return data || [];
  },

  async getJudgeEvaluationsForRound(roundId, judgeId) {
    const { data, error } = await supabase
      .from('round_evaluations')
      .select('*')
      .eq('round_id', roundId)
      .eq('judge_id', judgeId);

    if (error) throw error;
    return data || [];
  },

  async upsertRoundEvaluation(evaluationData) {
    const { data, error } = await supabase
      .from('round_evaluations')
      .upsert([evaluationData], {
        onConflict: 'round_id,judge_id,team_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async submitRoundEvaluation(roundId, judgeId, teamId, scores, note = '') {
    // Calculate raw total from scores
    const rawTotal = Object.values(scores).reduce((sum, score) => sum + (parseFloat(score) || 0), 0);

    const { data, error } = await supabase
      .from('round_evaluations')
      .upsert([{
        round_id: roundId,
        judge_id: judgeId,
        team_id: teamId,
        scores,
        raw_total: rawTotal,
        note,
        is_draft: false,
        submitted_at: new Date().toISOString()
      }], { onConflict: 'round_id,judge_id,team_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveDraftEvaluation(roundId, judgeId, teamId, scores, note = '') {
    const rawTotal = Object.values(scores).reduce((sum, score) => sum + (parseFloat(score) || 0), 0);

    const { data, error } = await supabase
      .from('round_evaluations')
      .upsert([{
        round_id: roundId,
        judge_id: judgeId,
        team_id: teamId,
        scores,
        raw_total: rawTotal,
        note,
        is_draft: true
      }], { onConflict: 'round_id,judge_id,team_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==================== ROUND PROGRESS & STATUS ====================

  async getJudgeRoundProgress(roundId, judgeId) {
    // Get all teams assigned to this judge for this round
    const { data: assignments, error: assignError } = await supabase
      .from('judge_assignments')
      .select('team_id')
      .eq('round_id', roundId)
      .eq('judge_id', judgeId);

    if (assignError) throw assignError;

    // Get submitted evaluations
    const { data: evaluations, error: evalError } = await supabase
      .from('round_evaluations')
      .select('team_id, is_draft')
      .eq('round_id', roundId)
      .eq('judge_id', judgeId)
      .eq('is_draft', false);

    if (evalError) throw evalError;

    const assignedCount = (assignments || []).length;
    const submittedCount = (evaluations || []).length;

    return {
      total: assignedCount,
      submitted: submittedCount,
      pending: assignedCount - submittedCount,
      progress: assignedCount > 0 ? (submittedCount / assignedCount) * 100 : 0,
      isComplete: assignedCount > 0 && submittedCount >= assignedCount
    };
  },

  async isRoundCompleteForJudge(roundId, judgeId) {
    const progress = await this.getJudgeRoundProgress(roundId, judgeId);
    return progress.isComplete;
  },

  async getActiveRoundForJudge(judgeId) {
    // Get all rounds this judge is assigned to
    const { data: assignments, error: assignError } = await supabase
      .from('round_judge_assignments')
      .select(`
        round_id,
        round:rounds(*)
      `)
      .eq('judge_id', judgeId);

    if (assignError) throw assignError;

    if (!assignments || assignments.length === 0) {
      return null;
    }

    // Sort rounds by round_number
    const sortedRounds = assignments
      .map(a => a.round)
      .filter(Boolean)
      .sort((a, b) => a.round_number - b.round_number);

    // Find the first incomplete round (sequential flow)
    for (const round of sortedRounds) {
      // Check if round is active
      if (round.status === 'closed' || round.status === 'completed') {
        continue;
      }

      const progress = await this.getJudgeRoundProgress(round.id, judgeId);
      if (!progress.isComplete) {
        return round;
      }
    }

    // All rounds complete - return the last one
    return sortedRounds[sortedRounds.length - 1] || null;
  },

  async getJudgeRoundsWithProgress(judgeId) {
    const { data: assignments, error } = await supabase
      .from('round_judge_assignments')
      .select(`
        round_id,
        judge_type,
        round:rounds(*)
      `)
      .eq('judge_id', judgeId);

    if (error) throw error;

    const roundsWithProgress = await Promise.all(
      (assignments || []).map(async (assignment) => {
        const progress = await this.getJudgeRoundProgress(assignment.round_id, judgeId);
        return {
          ...assignment.round,
          judgeType: assignment.judge_type,
          progress
        };
      })
    );

    // Sort by round_number
    return roundsWithProgress.sort((a, b) => a.round_number - b.round_number);
  },

  // ==================== AUTO-ASSIGN HELPERS ====================

  async autoAssignJudgesToRound(roundId, judges, teams) {
    // Clear existing assignments
    const { error: deleteError } = await supabase
      .from('judge_assignments')
      .delete()
      .eq('round_id', roundId);

    if (deleteError) throw deleteError;

    // Group teams by category
    const softwareTeams = teams.filter(t => 
      (t.category_id || '').toLowerCase() === 'software'
    );
    const hardwareTeams = teams.filter(t => 
      (t.category_id || '').toLowerCase() === 'hardware'
    );

    // Group judges by category
    const softwareJudges = judges.filter(j => 
      (j.category || '').toLowerCase() === 'software'
    );
    const hardwareJudges = judges.filter(j => 
      (j.category || '').toLowerCase() === 'hardware'
    );

    const assignments = [];

    // Assign software teams
    if (softwareJudges.length > 0 && softwareTeams.length > 0) {
      const teamsPerJudge = Math.ceil(softwareTeams.length / softwareJudges.length);
      softwareJudges.forEach((judge, i) => {
        const start = i * teamsPerJudge;
        const end = Math.min(start + teamsPerJudge, softwareTeams.length);
        for (let j = start; j < end; j++) {
          assignments.push({
            round_id: roundId,
            judge_id: judge.id,
            team_id: softwareTeams[j].id
          });
        }
      });
    }

    // Assign hardware teams
    if (hardwareJudges.length > 0 && hardwareTeams.length > 0) {
      const teamsPerJudge = Math.ceil(hardwareTeams.length / hardwareJudges.length);
      hardwareJudges.forEach((judge, i) => {
        const start = i * teamsPerJudge;
        const end = Math.min(start + teamsPerJudge, hardwareTeams.length);
        for (let j = start; j < end; j++) {
          assignments.push({
            round_id: roundId,
            judge_id: judge.id,
            team_id: hardwareTeams[j].id
          });
        }
      });
    }

    if (assignments.length > 0) {
      const { error: insertError } = await supabase
        .from('judge_assignments')
        .insert(assignments);

      if (insertError) throw insertError;
    }

    return assignments;
  }
};

export default roundService;
