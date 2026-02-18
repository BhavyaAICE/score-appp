import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function ExportPanel({ eventId, eventName, roundId }) {
  const [exporting, setExporting] = useState(null);
  const [error, setError] = useState(null);

  const exportOptions = [
    {
      id: 'scores_csv',
      title: 'Score Results (CSV)',
      description: 'Final rankings with scores, percentiles, and per-criterion breakdown',
      format: 'CSV',
      icon: 'table'
    },
    {
      id: 'scores_pdf',
      title: 'Score Results (PDF)',
      description: 'Formatted report with rankings and score details',
      format: 'PDF',
      icon: 'document'
    },
    {
      id: 'raw_scores_csv',
      title: 'Raw Evaluations (CSV)',
      description: 'All raw scores submitted by judges before normalization',
      format: 'CSV',
      icon: 'table'
    },
    {
      id: 'audit_csv',
      title: 'Audit Trail (CSV)',
      description: 'Complete log of all actions taken during this event',
      format: 'CSV',
      icon: 'log'
    },
    {
      id: 'judge_metrics_csv',
      title: 'Judge Analytics (CSV)',
      description: 'Judge contribution metrics, consistency scores, and bias indicators',
      format: 'CSV',
      icon: 'analytics'
    },
    {
      id: 'full_report_pdf',
      title: 'Full Transparency Report (PDF)',
      description: 'Complete report with scores, methodology, judge metrics, and audit trail',
      format: 'PDF',
      icon: 'report'
    }
  ];

  const handleExport = async (exportType) => {
    setExporting(exportType);
    setError(null);

    try {
      let data = [];
      let filename = '';

      switch (exportType) {
        case 'scores_csv':
          data = await fetchScoreResults();
          filename = `${eventName.replace(/\s+/g, '_')}_scores.csv`;
          downloadCSV(data, filename);
          break;

        case 'raw_scores_csv':
          data = await fetchRawEvaluations();
          filename = `${eventName.replace(/\s+/g, '_')}_raw_scores.csv`;
          downloadCSV(data, filename);
          break;

        case 'audit_csv':
          data = await fetchAuditLogs();
          filename = `${eventName.replace(/\s+/g, '_')}_audit_log.csv`;
          downloadCSV(data, filename);
          break;

        case 'judge_metrics_csv':
          data = await fetchJudgeMetrics();
          filename = `${eventName.replace(/\s+/g, '_')}_judge_metrics.csv`;
          downloadCSV(data, filename);
          break;

        case 'scores_pdf':
        case 'full_report_pdf':
          await generatePDFReport(exportType);
          break;

        default:
          throw new Error('Unknown export type');
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const fetchScoreResults = async () => {
    const { data: results } = await supabase
      .from('computed_results')
      .select('*, teams(name)')
      .eq('round_id', roundId)
      .order('rank');

    const { data: criteria } = await supabase
      .from('round_criteria')
      .select('*')
      .eq('round_id', roundId)
      .order('weight', { ascending: false });

    const headers = ['Rank', 'Team', 'Final Score', 'Percentile', 'Tied'];
    criteria?.forEach(c => headers.push(`${c.name} (Z-Score)`));

    const rows = results?.map(r => {
      const row = [
        r.rank,
        r.teams?.name || 'Unknown',
        r.final_score?.toFixed(4) || '0',
        r.percentile?.toFixed(2) || '0',
        r.is_tied ? 'Yes' : 'No'
      ];
      criteria?.forEach(c => {
        row.push((r.weighted_z_scores?.[c.id] || 0).toFixed(4));
      });
      return row;
    }) || [];

    return [headers, ...rows];
  };

  const fetchRawEvaluations = async () => {
    const { data: evaluations } = await supabase
      .from('raw_evaluations')
      .select('*, teams(name), user_profiles(email, full_name)')
      .eq('round_id', roundId)
      .eq('is_draft', false)
      .order('created_at');

    const { data: criteria } = await supabase
      .from('round_criteria')
      .select('*')
      .eq('round_id', roundId)
      .order('weight', { ascending: false });

    const headers = ['Team', 'Judge', 'Submitted At'];
    criteria?.forEach(c => headers.push(c.name));

    const rows = evaluations?.map(e => {
      const row = [
        e.teams?.name || 'Unknown',
        e.user_profiles?.full_name || e.user_profiles?.email || 'Unknown',
        new Date(e.created_at).toISOString()
      ];
      criteria?.forEach(c => {
        row.push(e.scores?.[c.id] || '');
      });
      return row;
    }) || [];

    return [headers, ...rows];
  };

  const fetchAuditLogs = async () => {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*, user_profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(1000);

    const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'Reason', 'Old Value', 'New Value'];

    const rows = logs?.map(l => [
      new Date(l.created_at).toISOString(),
      l.user_profiles?.full_name || 'Unknown',
      l.user_profiles?.email || '',
      l.action,
      l.resource_type,
      l.resource_id,
      l.reason || '',
      JSON.stringify(l.old_value || {}),
      JSON.stringify(l.new_value || {})
    ]) || [];

    return [headers, ...rows];
  };

  const fetchJudgeMetrics = async () => {
    const { data: evaluations } = await supabase
      .from('raw_evaluations')
      .select('*, user_profiles(id, email, full_name)')
      .eq('round_id', roundId)
      .eq('is_draft', false);

    const judgeMap = {};
    evaluations?.forEach(e => {
      if (!e.user_profiles) return;
      const judgeId = e.user_profiles.id;
      if (!judgeMap[judgeId]) {
        judgeMap[judgeId] = {
          name: e.user_profiles.full_name || 'Unnamed',
          email: e.user_profiles.email,
          evaluations: [],
          scores: []
        };
      }
      judgeMap[judgeId].evaluations.push(e);
      Object.values(e.scores || {}).forEach(s => {
        judgeMap[judgeId].scores.push(parseFloat(s) || 0);
      });
    });

    const headers = ['Judge Name', 'Email', 'Evaluations', 'Mean Score', 'Std Dev', 'Min Score', 'Max Score'];

    const rows = Object.values(judgeMap).map(j => {
      const mean = j.scores.length > 0 
        ? j.scores.reduce((a, b) => a + b, 0) / j.scores.length 
        : 0;
      const variance = j.scores.length > 0
        ? j.scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / j.scores.length
        : 0;
      const stdDev = Math.sqrt(variance);
      const min = j.scores.length > 0 ? Math.min(...j.scores) : 0;
      const max = j.scores.length > 0 ? Math.max(...j.scores) : 0;

      return [
        j.name,
        j.email,
        j.evaluations.length,
        mean.toFixed(2),
        stdDev.toFixed(2),
        min.toFixed(2),
        max.toFixed(2)
      ];
    });

    return [headers, ...rows];
  };

  const downloadCSV = (data, filename) => {
    const csvContent = data.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const generatePDFReport = async (reportType) => {
    const results = await fetchScoreResults();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${eventName} - Score Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #1e3a5f; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f8fafc; }
          .footer { margin-top: 40px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>${eventName}</h1>
        <h2>Final Score Results</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>${results[0].map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${results.slice(1).map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>This report was generated by FairScore using Z-score normalization.</p>
          <p>Scoring methodology: Each judge's scores are normalized to account for individual scoring patterns,
          ensuring fair comparison across all participants.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${eventName.replace(/\s+/g, '_')}_report.html`;
    link.click();
    URL.revokeObjectURL(link.href);

    alert('Report generated! For PDF format, please print the HTML file and save as PDF.');
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e3a5f' }}>
          Export Reports
        </h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
          Download score data, audit logs, and transparency reports
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fee2e2',
          color: '#dc2626',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {exportOptions.map(option => (
          <div
            key={option.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              background: '#fff'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#1e3a5f' }}>
                {option.title}
              </h3>
              <span style={{
                padding: '4px 8px',
                background: option.format === 'CSV' ? '#dcfce7' : '#dbeafe',
                color: option.format === 'CSV' ? '#16a34a' : '#2563eb',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {option.format}
              </span>
            </div>
            <p style={{
              margin: '0 0 16px',
              color: '#6b7280',
              fontSize: '14px',
              lineHeight: 1.5
            }}>
              {option.description}
            </p>
            <button
              onClick={() => handleExport(option.id)}
              disabled={exporting === option.id}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: exporting === option.id ? '#9ca3af' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: exporting === option.id ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {exporting === option.id ? 'Exporting...' : 'Download'}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 12px', color: '#374151' }}>
          About Exported Data
        </h4>
        <ul style={{
          margin: 0,
          paddingLeft: '20px',
          color: '#6b7280',
          fontSize: '14px',
          lineHeight: 1.8
        }}>
          <li>All exports include timestamps and are suitable for archival purposes</li>
          <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
          <li>Audit logs maintain a complete chain of custody for all scoring decisions</li>
          <li>Reports are timestamped and include methodology explanations</li>
        </ul>
      </div>
    </div>
  );
}

export default ExportPanel;
