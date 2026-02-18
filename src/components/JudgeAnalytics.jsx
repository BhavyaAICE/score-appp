import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function JudgeAnalytics({ eventId, roundId }) {
  const [judges, setJudges] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJudge, setSelectedJudge] = useState(null);

  useEffect(() => {
    if (roundId) {
      fetchData();
    }
  }, [roundId, eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: assignmentsData } = await supabase
        .from('round_judge_assignments')
        .select('judge_id, user_profiles(id, email, full_name)')
        .eq('round_id', roundId);

      if (assignmentsData) {
        const uniqueJudges = assignmentsData
          .map(a => a.user_profiles)
          .filter((j, i, arr) => j && arr.findIndex(x => x?.id === j?.id) === i);
        setJudges(uniqueJudges);
      }

      const { data: evalsData } = await supabase
        .from('raw_evaluations')
        .select('*')
        .eq('round_id', roundId)
        .eq('is_draft', false);

      if (evalsData) {
        setEvaluations(evalsData);
      }
    } catch (err) {
      console.error('Failed to fetch judge data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateJudgeMetrics = (judgeId) => {
    const judgeEvals = evaluations.filter(e => e.judge_id === judgeId);
    
    if (judgeEvals.length === 0) {
      return null;
    }

    const allScores = judgeEvals.flatMap(e => {
      const scores = e.scores || {};
      return Object.values(scores).map(s => parseFloat(s) || 0);
    });

    const mean = allScores.length > 0 
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
      : 0;

    const variance = allScores.length > 0
      ? allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / allScores.length
      : 0;
    const stdDev = Math.sqrt(variance);

    const consistency = stdDev > 0 ? 1 / (1 + stdDev / mean) : 1;

    const avgMean = evaluations.length > 0
      ? evaluations.flatMap(e => Object.values(e.scores || {}).map(s => parseFloat(s) || 0))
          .reduce((a, b) => a + b, 0) / 
        evaluations.flatMap(e => Object.values(e.scores || {})).length
      : 0;

    const biasFactor = avgMean > 0 ? (mean - avgMean) / avgMean : 0;

    const uniqueTeamsJudged = new Set(judgeEvals.map(e => e.team_id)).size;
    const totalTeams = new Set(evaluations.map(e => e.team_id)).size;
    const coverage = totalTeams > 0 ? uniqueTeamsJudged / totalTeams : 0;

    return {
      evaluationCount: judgeEvals.length,
      teamsJudged: uniqueTeamsJudged,
      meanScore: mean,
      stdDev: stdDev,
      consistency: consistency * 100,
      biasFactor: biasFactor * 100,
      coverage: coverage * 100
    };
  };

  const getBiasLabel = (biasFactor) => {
    if (Math.abs(biasFactor) < 5) return { label: 'Neutral', color: '#10b981' };
    if (biasFactor > 15) return { label: 'Lenient', color: '#f59e0b' };
    if (biasFactor < -15) return { label: 'Strict', color: '#dc2626' };
    if (biasFactor > 0) return { label: 'Slightly Lenient', color: '#84cc16' };
    return { label: 'Slightly Strict', color: '#fb923c' };
  };

  const getConsistencyLabel = (consistency) => {
    if (consistency >= 80) return { label: 'Excellent', color: '#10b981' };
    if (consistency >= 60) return { label: 'Good', color: '#84cc16' };
    if (consistency >= 40) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Low', color: '#dc2626' };
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading judge analytics...
      </div>
    );
  }

  if (judges.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        <h3 style={{ margin: '0 0 12px', color: '#374151' }}>No Judge Data</h3>
        <p>No judges have been assigned to this round yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e3a5f' }}>
          Judge Analytics
        </h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
          Contribution metrics, consistency scores, and bias detection
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#374151' }}>
          Judge Overview
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Judge</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Teams Judged</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Avg Score</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Std Dev</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Consistency</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Bias Indicator</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {judges.map(judge => {
                const metrics = calculateJudgeMetrics(judge.id);
                if (!metrics) return null;

                const biasInfo = getBiasLabel(metrics.biasFactor);
                const consistencyInfo = getConsistencyLabel(metrics.consistency);

                return (
                  <tr 
                    key={judge.id} 
                    style={{ 
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: selectedJudge === judge.id ? '#eff6ff' : 'transparent'
                    }}
                    onClick={() => setSelectedJudge(selectedJudge === judge.id ? null : judge.id)}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{judge.full_name || 'Unnamed Judge'}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{judge.email}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {metrics.teamsJudged}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>
                      {metrics.meanScore.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                      {metrics.stdDev.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: `${consistencyInfo.color}20`,
                        color: consistencyInfo.color
                      }}>
                        {consistencyInfo.label} ({metrics.consistency.toFixed(0)}%)
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: `${biasInfo.color}20`,
                        color: biasInfo.color
                      }}>
                        {biasInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${metrics.coverage}%`,
                          height: '100%',
                          background: metrics.coverage >= 80 ? '#10b981' : metrics.coverage >= 50 ? '#f59e0b' : '#dc2626',
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>
                        {metrics.coverage.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <MetricExplanation
          title="Consistency Score"
          description="Measures how consistently a judge scores across all evaluations. Higher is better - it means the judge uses the scoring scale in a predictable way."
          interpretation="Excellent (80%+): Very predictable scoring. Good (60-80%): Reliable. Moderate (40-60%): Some variability. Low (<40%): Highly variable."
        />
        <MetricExplanation
          title="Bias Indicator"
          description="Compares a judge's average score to the overall average. Shows if a judge tends to score higher (lenient) or lower (strict) than others."
          interpretation="Neutral: Within 5% of average. Lenient/Strict: Significantly above/below average. This is compensated by Z-score normalization."
        />
        <MetricExplanation
          title="Coverage"
          description="Percentage of total teams this judge has evaluated. Higher coverage means more comprehensive judging from this person."
          interpretation="High coverage judges provide scores for more teams, giving more data points for accurate rankings."
        />
      </div>

      <div style={{
        background: '#f0fdf4',
        borderRadius: '8px',
        padding: '20px',
        borderLeft: '4px solid #10b981'
      }}>
        <h4 style={{ margin: '0 0 8px', color: '#166534' }}>
          Why Bias Detection Matters
        </h4>
        <p style={{ margin: 0, color: '#166534', fontSize: '14px', lineHeight: 1.6 }}>
          These metrics help event administrators understand judging patterns, but they don't affect rankings.
          FairScore's Z-score normalization automatically compensates for different judging styles,
          ensuring fair results regardless of whether a judge is naturally lenient or strict.
        </p>
      </div>
    </div>
  );
}

function MetricExplanation({ title, description, interpretation }) {
  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <h4 style={{ margin: '0 0 8px', color: '#1e3a5f', fontSize: '14px' }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '13px' }}>
        {description}
      </p>
      <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>
        {interpretation}
      </p>
    </div>
  );
}

export default JudgeAnalytics;
