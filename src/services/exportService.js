/**
 * Export Service
 * Handles CSV and PDF export of round results
 */

import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate CSV from results data
 * @param {Array} results - normalized results with team and judge info
 * @param {Object} options - {includeRaw, includeNormalized}
 * @returns {string} - CSV string
 */
function generateCSV(results, options = {}) {
  const includeRaw = options.includeRaw !== false;
  const includeNormalized = options.includeNormalized !== false;

  const headers = ['Team ID', 'Team Name', 'Team Category', 'Judge ID', 'Judge Name', 'Judge Category'];

  if (includeRaw) {
    headers.push('Raw Total', 'Judge Mean (μ_j)', 'Judge Std (σ_j)');
  }

  if (includeNormalized) {
    headers.push('Z-Score (z_{i,j})', 'Aggregated Z (Z_i)', 'Percentile', 'Rank');
  }

  const rows = [headers];

  results.forEach(team => {
    team.judge_evaluations?.forEach(judgeEval => {
      const row = [
        team.team_id,
        team.team_name || '',
        team.team_category || '',
        judgeEval.judge_id,
        judgeEval.judge_name || '',
        judgeEval.judge_category || ''
      ];

      if (includeRaw) {
        row.push(
          judgeEval.raw_total?.toFixed(2) || '',
          judgeEval.judge_mean?.toFixed(2) || '',
          judgeEval.judge_std?.toFixed(2) || ''
        );
      }

      if (includeNormalized) {
        row.push(
          judgeEval.z_score?.toFixed(4) || '',
          team.aggregated_z?.toFixed(4) || '',
          team.percentile?.toFixed(2) || '',
          team.rank || ''
        );
      }

      rows.push(row);
    });
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate judge-specific CSV
 * @param {Array} results
 * @param {string} judgeId
 * @returns {string}
 */
function generateJudgeCSV(results, judgeId) {
  const headers = ['Rank', 'Team ID', 'Team Name', 'Raw Total', 'Z-Score', 'Selected'];

  const rows = [headers];

  const judgeResults = [];

  results.forEach(team => {
    const judgeEval = team.judge_evaluations?.find(je => je.judge_id === judgeId);
    if (judgeEval) {
      judgeResults.push({
        team_id: team.team_id,
        team_name: team.team_name,
        raw_total: judgeEval.raw_total,
        z_score: judgeEval.z_score,
        rank: team.rank
      });
    }
  });

  judgeResults.sort((a, b) => (b.raw_total || 0) - (a.raw_total || 0));

  judgeResults.forEach((result, index) => {
    rows.push([
      index + 1,
      result.team_id,
      result.team_name || '',
      result.raw_total?.toFixed(2) || '',
      result.z_score?.toFixed(4) || '',
      index < 5 ? 'Yes' : 'No'
    ]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate PDF from results
 * @param {Array} results
 * @param {Object} roundInfo - {name, event_name, computed_at}
 * @returns {jsPDF}
 */
function generatePDF(results, roundInfo) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`${roundInfo.event_name || 'Event'} - ${roundInfo.name || 'Round'} Results`, 14, 20);

  doc.setFontSize(10);
  doc.text(`Computed: ${new Date(roundInfo.computed_at).toLocaleString()}`, 14, 28);

  const summaryData = results.map(team => [
    team.rank || '',
    team.team_name || team.team_id.substring(0, 8),
    team.percentile?.toFixed(2) || '',
    team.aggregated_z?.toFixed(4) || '',
    team.judge_evaluations?.length || 0
  ]);

  doc.autoTable({
    startY: 35,
    head: [['Rank', 'Team', 'Percentile', 'Aggregated Z', 'Judges']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 9 }
  });

  let currentY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(14);
  doc.text('Detailed Breakdown', 14, currentY);
  currentY += 8;

  results.slice(0, 10).forEach(team => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${team.rank}. ${team.team_name || team.team_id}`, 14, currentY);
    currentY += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    const detailData = team.judge_evaluations?.map(je => [
      je.judge_name || je.judge_id.substring(0, 8),
      je.judge_category || '',
      je.raw_total?.toFixed(2) || '',
      je.z_score?.toFixed(4) || ''
    ]) || [];

    doc.autoTable({
      startY: currentY,
      head: [['Judge', 'Category', 'Raw Total', 'Z-Score']],
      body: detailData,
      theme: 'plain',
      styles: { fontSize: 8 },
      margin: { left: 20 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
  });

  return doc;
}

/**
 * Export round results as CSV
 * @param {string} roundId
 * @param {Object} options - {format: 'raw'|'normalized'|'both', judgeId}
 * @returns {Promise<Object>} - {success, csv, filename}
 */
export async function exportRoundCSV(roundId, options = {}) {
  try {
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select(`
        *,
        events (
          name
        )
      `)
      .eq('id', roundId)
      .maybeSingle();

    if (roundError) throw roundError;
    if (!round) throw new Error('Round not found');

    const { data: normResults, error: normError } = await supabase
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

    if (normError) throw normError;

    const teamMap = {};
    normResults?.forEach(result => {
      if (!teamMap[result.team_id]) {
        teamMap[result.team_id] = {
          team_id: result.team_id,
          team_name: result.teams?.name,
          team_category: result.teams?.category_id,
          rank: result.rank,
          percentile: result.percentile,
          aggregated_z: result.aggregated_z,
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

    const results = Object.values(teamMap).sort((a, b) => (a.rank || 999) - (b.rank || 999));

    let csv;
    let filename;

    if (options.judgeId) {
      csv = generateJudgeCSV(results, options.judgeId);
      filename = `${round.name.replace(/\s+/g, '_')}_judge_${options.judgeId.substring(0, 8)}.csv`;
    } else {
      const includeRaw = options.format !== 'normalized';
      const includeNormalized = options.format !== 'raw';

      csv = generateCSV(results, { includeRaw, includeNormalized });
      filename = `${round.name.replace(/\s+/g, '_')}_results_${options.format || 'both'}.csv`;
    }

    return {
      success: true,
      csv,
      filename
    };

  } catch (error) {
    console.error('Error exporting CSV:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Export round results as PDF
 * @param {string} roundId
 * @returns {Promise<Object>} - {success, pdf, filename}
 */
export async function exportRoundPDF(roundId) {
  try {
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select(`
        *,
        events (
          name
        )
      `)
      .eq('id', roundId)
      .maybeSingle();

    if (roundError) throw roundError;
    if (!round) throw new Error('Round not found');

    const { data: normResults, error: normError } = await supabase
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

    if (normError) throw normError;

    const teamMap = {};
    normResults?.forEach(result => {
      if (!teamMap[result.team_id]) {
        teamMap[result.team_id] = {
          team_id: result.team_id,
          team_name: result.teams?.name,
          team_category: result.teams?.category_id,
          rank: result.rank,
          percentile: result.percentile,
          aggregated_z: result.aggregated_z,
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

    const results = Object.values(teamMap).sort((a, b) => (a.rank || 999) - (b.rank || 999));

    const pdf = generatePDF(results, {
      name: round.name,
      event_name: round.events?.name,
      computed_at: round.computed_at
    });

    const filename = `${round.name.replace(/\s+/g, '_')}_results.pdf`;

    return {
      success: true,
      pdf,
      filename
    };

  } catch (error) {
    console.error('Error exporting PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download helper function
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Download PDF helper
 * @param {jsPDF} pdf
 * @param {string} filename
 */
export function downloadPDF(pdf, filename) {
  pdf.save(filename);
}
