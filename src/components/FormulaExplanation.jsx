import React, { useState } from 'react';

function FormulaExplanation() {
  const [expandedSection, setExpandedSection] = useState('overview');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', color: '#1e3a5f' }}>
          How FairScore Works
        </h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
          Our scoring system uses scientifically-proven statistical methods to ensure fair rankings
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AccordionSection
          title="Overview: Why Z-Score Normalization?"
          isExpanded={expandedSection === 'overview'}
          onToggle={() => toggleSection('overview')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              Different judges have different scoring tendencies. Some judges naturally score higher,
              while others are more conservative. Without normalization, teams assigned to "tough" judges
              would be unfairly disadvantaged.
            </p>
            <div style={{
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: '4px solid #10b981'
            }}>
              <h4 style={{ margin: '0 0 8px', color: '#166534' }}>The Solution</h4>
              <p style={{ margin: 0, color: '#166534', fontSize: '14px' }}>
                Z-score normalization converts each judge's scores to a common scale based on
                their own scoring patterns. This eliminates bias from different judging styles
                while preserving the relative rankings each judge intended.
              </p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Step 1: Collecting Raw Scores"
          isExpanded={expandedSection === 'step1'}
          onToggle={() => toggleSection('step1')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              Each judge evaluates teams on multiple criteria (e.g., Innovation, Execution, Presentation).
              Each criterion has an assigned weight reflecting its importance.
            </p>
            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px' }}>Example:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280' }}>Criterion</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#6b7280' }}>Weight</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#6b7280' }}>Score Range</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ padding: '8px' }}>Innovation</td><td style={{ padding: '8px', textAlign: 'right' }}>40%</td><td style={{ padding: '8px', textAlign: 'right' }}>0-10</td></tr>
                  <tr><td style={{ padding: '8px' }}>Execution</td><td style={{ padding: '8px', textAlign: 'right' }}>35%</td><td style={{ padding: '8px', textAlign: 'right' }}>0-10</td></tr>
                  <tr><td style={{ padding: '8px' }}>Presentation</td><td style={{ padding: '8px', textAlign: 'right' }}>25%</td><td style={{ padding: '8px', textAlign: 'right' }}>0-10</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Step 2: Computing Judge Statistics"
          isExpanded={expandedSection === 'step2'}
          onToggle={() => toggleSection('step2')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              For each judge, we calculate their personal scoring statistics:
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <FormulaCard
                title="Mean (Average)"
                formula="Mean = Sum of all scores / Number of scores"
                description="The judge's typical score level"
                example="If a judge gives scores 7, 8, 6, 9: Mean = 30/4 = 7.5"
              />
              <FormulaCard
                title="Standard Deviation"
                formula="SD = Square root of average squared differences from mean"
                description="How spread out the judge's scores are"
                example="Measures if judge uses full range or clusters scores together"
              />
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Step 3: Z-Score Normalization"
          isExpanded={expandedSection === 'step3'}
          onToggle={() => toggleSection('step3')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              Each raw score is converted to a Z-score using the judge's own statistics:
            </p>
            <div style={{
              background: '#eff6ff',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d4ed8', marginBottom: '8px' }}>
                Z = (Score - Judge Mean) / Judge SD
              </div>
              <p style={{ margin: 0, color: '#3b82f6', fontSize: '14px' }}>
                This converts the score to "standard deviations above/below this judge's average"
              </p>
            </div>
            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px' }}>What Z-Scores Mean:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', fontSize: '14px', lineHeight: 1.8 }}>
                <li><strong>Z = 0</strong>: Exactly average for this judge</li>
                <li><strong>Z = +1</strong>: One standard deviation above average (top ~16%)</li>
                <li><strong>Z = +2</strong>: Two standard deviations above (top ~2.5%)</li>
                <li><strong>Z = -1</strong>: One standard deviation below average</li>
              </ul>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Step 4: Applying Weights"
          isExpanded={expandedSection === 'step4'}
          onToggle={() => toggleSection('step4')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              Each criterion's Z-score is multiplied by its weight to reflect importance:
            </p>
            <div style={{
              background: '#f0fdf4',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>
                Weighted Z = Z-Score x (Weight / 100)
              </div>
              <p style={{ margin: 0, color: '#16a34a', fontSize: '14px' }}>
                Higher-weight criteria have more impact on the final score
              </p>
            </div>
            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px' }}>Example:</h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                If Innovation (40% weight) has Z = 1.5:<br />
                Weighted Z = 1.5 x 0.40 = 0.60
              </p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Step 5: Final Aggregation & Ranking"
          isExpanded={expandedSection === 'step5'}
          onToggle={() => toggleSection('step5')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              The final score is the sum of all weighted Z-scores across all criteria:
            </p>
            <div style={{
              background: '#fef3c7',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>
                Final Score = Sum of all Weighted Z-Scores
              </div>
              <p style={{ margin: 0, color: '#a16207', fontSize: '14px' }}>
                Teams are ranked by their final score (highest = best)
              </p>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Tie-Breaking Rules"
          isExpanded={expandedSection === 'tiebreak'}
          onToggle={() => toggleSection('tiebreak')}
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>
              When teams have identical final scores, we use these rules in order:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px', color: '#374151', fontSize: '14px', lineHeight: 2 }}>
              <li><strong>Highest-weight criterion:</strong> Compare Z-scores on the most important criterion</li>
              <li><strong>Average raw total:</strong> Compare the mean of all raw scores received</li>
              <li><strong>Median raw total:</strong> Compare the median of all raw scores received</li>
              <li><strong>Judge count:</strong> Team evaluated by more judges wins (more data = more reliable)</li>
            </ol>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Why This Method is Fair"
          isExpanded={expandedSection === 'fairness'}
          onToggle={() => toggleSection('fairness')}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 8px', color: '#166534', fontSize: '14px' }}>Eliminates Judge Bias</h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                Tough and lenient judges are normalized to the same scale
              </p>
            </div>
            <div style={{
              background: '#eff6ff',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 8px', color: '#1d4ed8', fontSize: '14px' }}>Preserves Rankings</h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                Each judge's intended order of teams is maintained
              </p>
            </div>
            <div style={{
              background: '#fef3c7',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 8px', color: '#92400e', fontSize: '14px' }}>Statistically Sound</h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                Z-score normalization is a well-established statistical technique
              </p>
            </div>
            <div style={{
              background: '#fce7f3',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 8px', color: '#9d174d', fontSize: '14px' }}>Fully Auditable</h4>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                Every calculation is logged and can be verified
              </p>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}

function AccordionSection({ title, isExpanded, onToggle, children }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: isExpanded ? '#f8fafc' : '#fff',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span style={{ fontWeight: '600', color: '#1e3a5f', fontSize: '15px' }}>
          {title}
        </span>
        <span style={{ 
          fontSize: '20px', 
          color: '#6b7280',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          v
        </span>
      </button>
      {isExpanded && (
        <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FormulaCard({ title, formula, description, example }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <h4 style={{ margin: '0 0 8px', color: '#1e3a5f', fontSize: '14px' }}>{title}</h4>
      <div style={{
        background: '#f8fafc',
        padding: '8px 12px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#2563eb',
        marginBottom: '8px'
      }}>
        {formula}
      </div>
      <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '13px' }}>{description}</p>
      {example && (
        <p style={{ margin: 0, color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>{example}</p>
      )}
    </div>
  );
}

export default FormulaExplanation;
