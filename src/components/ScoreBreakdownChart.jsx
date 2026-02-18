/**
 * Score Breakdown Chart Component
 * Transparency dashboard showing per-category scores
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function ScoreBreakdownChart({ 
  teamResults, 
  criteria, 
  chartType = 'bar',
  showRaw = true,
  showNormalized = true 
}) {
  if (!teamResults || teamResults.length === 0 || !criteria || criteria.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        No data available for chart
      </div>
    );
  }

  const teamNames = teamResults.slice(0, 10).map(t => t.team_name || `Team ${t.team_id.slice(0, 6)}`);
  const criteriaNames = criteria.map(c => c.name);

  const colors = [
    'rgba(59, 130, 246, 0.7)',
    'rgba(16, 185, 129, 0.7)',
    'rgba(249, 115, 22, 0.7)',
    'rgba(139, 92, 246, 0.7)',
    'rgba(236, 72, 153, 0.7)'
  ];

  const borderColors = [
    'rgba(59, 130, 246, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(249, 115, 22, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(236, 72, 153, 1)'
  ];

  if (chartType === 'radar') {
    const datasets = teamResults.slice(0, 5).map((team, idx) => ({
      label: team.team_name || `Team ${idx + 1}`,
      data: criteria.map(c => team.avg_z_scores?.[c.id] || 0),
      backgroundColor: colors[idx % colors.length].replace('0.7', '0.2'),
      borderColor: borderColors[idx % borderColors.length],
      borderWidth: 2,
      pointBackgroundColor: borderColors[idx % borderColors.length]
    }));

    const data = {
      labels: criteriaNames,
      datasets
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        title: {
          display: true,
          text: 'Normalized Z-Scores by Category (Radar)'
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            stepSize: 0.5
          }
        }
      }
    };

    return (
      <div style={{ height: '400px' }}>
        <Radar data={data} options={options} />
      </div>
    );
  }

  const datasets = [];
  
  if (showNormalized) {
    datasets.push({
      label: 'Aggregated Z-Score',
      data: teamResults.slice(0, 10).map(t => t.aggregated_z || 0),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    });
  }

  if (showRaw) {
    datasets.push({
      label: 'Avg Raw Total',
      data: teamResults.slice(0, 10).map(t => t.avg_raw_total || 0),
      backgroundColor: 'rgba(16, 185, 129, 0.7)',
      borderColor: 'rgba(16, 185, 129, 1)',
      borderWidth: 1
    });
  }

  const data = {
    labels: teamNames,
    datasets
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Team Scores Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div style={{ height: '400px' }}>
      <Bar data={data} options={options} />
    </div>
  );
}

export function FormulaExplanation({ method = 'Z_SCORE' }) {
  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      marginTop: '16px'
    }}>
      <h4 style={{ 
        margin: '0 0 16px', 
        fontSize: '16px', 
        fontWeight: '600',
        color: '#1e3a5f'
      }}>
        How Scores Are Calculated
      </h4>
      
      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px' }}>
          1. Mean Per Judge
        </h5>
        <p style={{ margin: '0', color: '#64748b', fontSize: '13px' }}>
          For each judge, we calculate the average score they gave across all teams.
          This becomes the reference point for that judge.
        </p>
        <code style={codeStyle}>μ = Sum of all scores / Number of teams</code>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px' }}>
          2. Standard Deviation
        </h5>
        <p style={{ margin: '0', color: '#64748b', fontSize: '13px' }}>
          We measure how spread out each judge's scores are from their average.
        </p>
        <code style={codeStyle}>σ = √(Sum of (score - mean)² / N)</code>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px' }}>
          3. Z-Score Normalization
        </h5>
        <p style={{ margin: '0', color: '#64748b', fontSize: '13px' }}>
          Each score is converted to show how many standard deviations it is from the judge's mean.
          This removes judge bias.
        </p>
        <code style={codeStyle}>Z = (Raw Score - Mean) / Standard Deviation</code>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px' }}>
          4. Weighted Z-Score
        </h5>
        <p style={{ margin: '0', color: '#64748b', fontSize: '13px' }}>
          Each criterion's Z-score is multiplied by its weight to reflect importance.
        </p>
        <code style={codeStyle}>Zw = Weight × Z-Score</code>
      </div>

      <div>
        <h5 style={{ margin: '0 0 8px', color: '#475569', fontSize: '14px' }}>
          5. Final Score
        </h5>
        <p style={{ margin: '0', color: '#64748b', fontSize: '13px' }}>
          The sum of weighted Z-scores across all criteria gives the final score.
        </p>
        <code style={codeStyle}>Final = Sum of all Weighted Z-Scores</code>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#dbeafe',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1e40af'
      }}>
        <strong>Why This Matters:</strong> Teams evaluated by strict judges aren't penalized, 
        and teams evaluated by lenient judges don't get unfair advantages. Everyone is compared fairly.
      </div>
    </div>
  );
}

const codeStyle = {
  display: 'block',
  background: '#1e293b',
  color: '#10b981',
  padding: '10px 14px',
  borderRadius: '6px',
  fontFamily: 'monospace',
  fontSize: '13px',
  marginTop: '8px'
};

export default ScoreBreakdownChart;
