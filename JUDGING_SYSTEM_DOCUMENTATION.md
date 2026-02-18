# Multi-Round Judging & Scoring System Documentation

## Overview

This is a complete implementation of an Evalutor-style multi-round judging system with advanced normalization, team selection, and comprehensive export capabilities.

## Core Features

### 1. Multi-Round Support
- Unlimited rounds per event
- Each round can have different criteria (max 5 per round)
- Each round can have different judges
- Seamless team progression between rounds

### 2. Judge Management
- **Judge Types**: HARDWARE, SOFTWARE, BOTH
- Flexible judge assignments per round
- Optional judge weighting for aggregation
- Token-based authentication for judges

### 3. Scoring & Evaluation
- **Max 5 criteria per round** (database enforced)
- Configurable criteria with:
  - Name and description
  - Max marks (any positive number)
  - Weight (for weighted aggregation)
  - Display order
- Draft and final submission modes
- **Immutable evaluations** once submitted (database enforced)
- Audit trail for all changes

### 4. Normalization Algorithms

#### A. Z-Score Normalization (Primary)
```
For each judge j:
  μ_j = mean(raw_total for all teams judged by j)
  σ_j = population_std_dev(raw_total for all teams judged by j)

  For each team i judged by j:
    z_{i,j} = (raw_total_{i,j} - μ_j) / σ_j

For each team i:
  Z_i = mean(z_{i,j} across all judges who scored team i)

Convert Z_i to percentiles and ranks
```

#### B. Robust MAD Normalization (Alternate)
```
For each judge j:
  median_j = median(raw_total for all teams judged by j)
  MAD_j = median(|raw_total - median_j|)

  For each team i judged by j:
    z_{i,j} = (raw_total_{i,j} - median_j) / (1.4826 * MAD_j)

Aggregate and convert to percentiles as above
```

**Key Properties**:
- Handles zero variance (sets z-scores to 0)
- Handles single evaluation per judge
- Handles unequal judge counts per team
- Robust to outliers (MAD method)

### 5. Team Selection Modes

#### Per-Judge Top N
- Select top N teams from each judge's ranking
- N ∈ {2, 5, 10} (admin configurable)
- Uses judge-specific raw_total rankings
- Returns union of all selections (deduplicated)
- Optional: filter by judge type

#### Global Top K
- Select top K teams based on aggregated percentile
- K is any positive integer
- Uses final normalized rankings

**Stop Condition**: If only one judge in round, no next round created.

### 6. Tie-Breaking Rules (Deterministic)

Applied in order:
1. Compare aggregated Z-scores (higher wins)
2. Compare mean raw total across judges (higher wins)
3. Compare median raw total (higher wins)
4. Compare judge count (more judges wins)
5. Flag for manual resolution if still tied

### 7. Export Capabilities

#### CSV Export
- **Full**: All columns (raw + normalized)
- **Raw**: Raw scores, judge stats
- **Normalized**: Z-scores, percentiles, ranks
- **Judge View**: Per-judge breakdown with top N flagged

Columns include:
- Team ID, Name, Category
- Judge ID, Name, Category
- Raw Total, Judge Mean (μ_j), Judge Std (σ_j)
- Z-Score (z_{i,j}), Aggregated Z (Z_i)
- Percentile, Rank

#### PDF Export
- Summary table with ranks and percentiles
- Detailed breakdown per team
- Top 10 teams with judge evaluations
- Professional formatting with auto-tables

### 8. Data Constraints & Validation

**Database Level**:
- Max 5 criteria per round (trigger enforced)
- Unique judge assignments per round
- Immutable submitted evaluations (trigger enforced)
- Judge types enum validation
- Positive max_marks and weights

**Application Level**:
- Missing score validation
- Score range validation (0 to max_marks)
- Round readiness checks before computation
- Weight sum warnings (should normalize to 1.0)

### 9. UI Components

#### Admin Interface (`RoundManager.js`)
- Create and manage rounds
- Add/remove criteria (max 5)
- Assign/unassign judges with types
- View round readiness status
- Compute round results
- Configure and execute team selection
- Export results (CSV/PDF)

#### Judge Interface (`JudgeEvaluation.js`)
- View assigned teams
- Score teams on all criteria
- Save drafts
- Submit final evaluations
- Progress tracking
- Validation and error handling

#### Results Display (`RoundResults.js`)
- Summary table view
- Detailed per-team breakdown
- Tie indicators
- Judge evaluation details
- Tie-breaker data visualization
- Modal team details

## Database Schema

### Core Tables

#### `rounds`
- Round metadata and configuration
- Links to event
- Selection mode and parameters
- Normalization method
- Computation status

#### `round_criteria`
- Up to 5 criteria per round
- Max marks, weight, display order
- Trigger prevents >5 criteria

#### `round_judge_assignments`
- Judge-to-round mappings
- Judge type and weight
- Unique constraint on (round_id, judge_id)

#### `round_evaluations`
- Raw judge scores per team
- Scores stored as JSONB
- Draft/submitted status
- Versioned for audit trail
- Trigger prevents editing submitted evaluations

#### `round_normalization_results`
- Per-judge z-scores
- Aggregated z-scores
- Percentiles and ranks
- Tie-breaker data

#### `round_team_selections`
- Team promotions between rounds
- Selection mode and criteria
- Selected-by judge (for per-judge mode)

#### `round_compute_logs`
- Audit trail for computations
- Method, parameters, stats

#### `round_manual_adjustments`
- Manual score/rank overrides
- Reason and audit trail

### Row Level Security

All tables have RLS enabled:
- Admins: Full access
- Judges: Own evaluations only
- Public: Published results only

## API / Service Layer

### `normalizationService.js`
- `computeRawTotal()` - Weighted total calculation
- `computePerJudgeNormalization()` - Z-score or MAD
- `aggregateAcrossJudges()` - Mean z-score aggregation
- `convertToPercentilesAndRanks()` - Final ranking with tie-breaking
- `computeRoundNormalization()` - Complete pipeline

### `computeRoundService.js`
- `computeRound()` - Orchestrates computation and DB storage
- `getRoundResults()` - Fetch computed results with team info
- `checkRoundReadiness()` - Validation before computation

### `selectionService.js`
- `selectPerJudgeTopN()` - Per-judge selection
- `selectGlobalTopK()` - Global selection
- `saveAndPromoteTeams()` - Persist selections
- `executeSelection()` - Orchestrator with auto next-round creation

### `exportService.js`
- `exportRoundCSV()` - Generate CSV with options
- `exportRoundPDF()` - Generate PDF with jsPDF
- `downloadFile()` / `downloadPDF()` - Browser download helpers

## Testing

### Unit Tests (`normalizationService.test.js`)
- Raw total computation
- Z-score normalization
- Robust MAD normalization
- Aggregation with weights
- Percentile conversion
- Tie-breaking logic
- Edge cases (zero variance, single eval, outliers)

### Acceptance Tests (`acceptanceTests.js`)
- Z-score example: J1=[80,60,70], J2=[85,65,80] → A>C>B ✓
- Per-judge top N union logic
- Zero variance handling
- Criteria weighting
- Tie-breaking determinism

### Example Dataset (`exampleDataset.js`)
- 6 teams (3 software, 3 hardware)
- 3 judges (2 specialized, 1 both)
- 5 criteria with varying weights
- 12 complete evaluations
- Ready-to-compute round

## Usage Flow

### Round 1 Setup
1. Admin creates Round 1
2. Admin adds criteria (up to 5)
3. Admin assigns judges with types
4. Judges submit evaluations
5. Admin clicks "Compute Round"

### Results & Selection
6. System computes normalized results
7. Admin reviews results, exports if needed
8. Admin selects teams for Round 2:
   - Choose mode (per-judge top N or global top K)
   - Configure parameters
   - Click "Select Teams"
9. System creates Round 2 with selected teams

### Round 2 Configuration
10. Admin can change criteria for Round 2
11. Admin can change judges for Round 2
12. Judges submit new evaluations
13. Repeat compute & selection process

### Final Results
14. After final round, publish results
15. Export final rankings (CSV/PDF)
16. Manual adjustments if needed (logged)

## Key Algorithms

### Raw Total Calculation
```
raw_total = (Σ (score_c / max_marks_c) * weight_c) / (Σ weight_c) * 100
```
Maps all scores to 0-100 scale using category-specific max marks and weights.

### Population Standard Deviation
```
σ = sqrt(Σ(x_i - μ)² / N)
```
Uses N (not N-1) for population std dev.

### Percentile Conversion
```
percentile = (N - 1 - rank_index) / (N - 1) * 100
```
Highest Z-score → 100%, lowest → 0%

## Error Handling

### Computation Errors
- No criteria defined → error
- No judges assigned → error
- No submitted evaluations → error
- Single judge → stop condition (no next round)

### Evaluation Errors
- Missing scores → blocked submission (draft allowed)
- Out-of-range scores → validation error
- Editing submitted eval → database error

### Selection Errors
- Round not computed → error
- No teams match criteria → error
- Invalid N or K values → error

## Configuration Options

### Admin Configurable
- Number of rounds
- Criteria per round (1-5)
- Max marks per criterion
- Weights per criterion
- Judge assignments and types
- Judge weights (for aggregation)
- Selection mode and parameters
- Normalization method (Z-score or MAD)

### System Constants
- Max criteria: 5 (hard limit)
- Top N values: 2, 5, or 10
- Normalization methods: Z_SCORE, ROBUST_MAD
- Judge types: HARDWARE, SOFTWARE, BOTH

## Performance Considerations

- Indexes on all foreign keys
- Batch inserts for normalization results
- Delete old results before recomputation
- Efficient RLS policies
- CSV generation in memory (streaming for very large datasets)

## Security

- RLS enabled on all tables
- Immutable evaluations (trigger enforced)
- Audit logging for all manual changes
- Token-based judge authentication
- Admin-only computation and selection

## Future Enhancements

Potential improvements:
- Real-time computation progress
- Email notifications
- Team self-service portal
- Advanced analytics dashboard
- Custom export templates
- Batch judge operations
- Round templates
- Criteria library
