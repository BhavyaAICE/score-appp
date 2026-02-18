# FairScore - Enterprise Event Judging Platform

## Overview
FairScore is a production-grade enterprise SaaS platform for event judging. It provides fair, accurate, and professional scoring for hackathons, competitions, and institutional events using scientifically-proven Z-score normalization.

## Current State
- **Version**: MVP to Enterprise transformation in progress
- **Last Updated**: January 8, 2026
- **Status**: Core enterprise features implemented, database migration ready

## Recent Changes
- Complete rebranding from "Score App" to "FairScore"
- Implemented RBAC with 4 roles (super_admin, event_admin, judge, viewer)
- Added event lifecycle management (Draft → Live Judging → Locked → Published)
- **BACKEND-ONLY SCORING**: All computation moved to PostgreSQL functions
  - Frontend can only submit raw scores
  - Pre-calculated values are rejected
  - Full audit trail for all computations
- Built audit logging system with full trail
- Added legal compliance pages (Privacy, Terms, Data Retention)
- Created UI components for status badges, role badges, and charts

## Project Architecture

### Directory Structure
```
Score App/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── EventStatusBadge.js
│   │   ├── RoleBadge.js
│   │   ├── AuditLogViewer.js
│   │   ├── ScoreBreakdownChart.js
│   │   ├── EventLifecycleControls.js
│   │   └── PrivateRoute.js
│   ├── context/
│   │   ├── AppContext.js    # Global app state with RBAC
│   │   └── ThemeContext.js
│   ├── pages/               # Page components
│   │   ├── LandingPage.js
│   │   ├── AdminDashboard.js
│   │   ├── EventList.js
│   │   ├── ManageEvent.js
│   │   ├── JudgeDashboard.js
│   │   ├── UserManagement.js
│   │   ├── PrivacyPolicy.js
│   │   ├── TermsOfUse.js
│   │   └── DataRetention.js
│   ├── services/            # Business logic services
│   │   ├── rbacService.js   # Role-based access control
│   │   ├── authService.js   # Authentication with security
│   │   ├── scoringEngine.js # Thin client - calls backend RPC only
│   │   ├── eventLifecycleService.js
│   │   ├── auditService.js  # Comprehensive logging
│   │   ├── emailService.js  # Notification templates
│   │   └── brandingService.js
│   └── styles/
├── supabase/
│   └── migrations/
│       ├── 20260108000001_rbac_and_enterprise.sql
│       └── 20260108000002_backend_scoring_engine.sql
└── public/
```

### Key Technologies
- **Frontend**: React 18, React Router, Chart.js
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State Management**: React Context API
- **Styling**: CSS with CSS Variables for theming

### RBAC Roles
1. **super_admin**: Full system control, user management
2. **event_admin**: Manages assigned events, can lock/publish
3. **judge**: Submits evaluations for assigned events
4. **viewer**: Read-only access to published results

### Event Lifecycle States
1. **Draft**: Event setup, modifications allowed
2. **Live Judging**: Judges can submit evaluations
3. **Locked**: No more evaluations, scores computed
4. **Published**: Results publicly visible

### Scoring Algorithm (USP Z-Score) - BACKEND ONLY
All scoring computations are performed server-side via PostgreSQL functions:

1. Calculate mean per judge: μ = Σscores / N
2. Calculate standard deviation: σ = √(Σ(x - μ)² / N)
3. Normalize each score: Z = (score - μ) / σ
4. Apply weights: Zw = weight × Z
5. Aggregate: Final = Σ(Zw)
6. Tie-breaking order:
   - Highest-weight criterion Z-score
   - Average raw total
   - Median raw total
   - Judge count

**Security**: Frontend cannot submit pre-calculated values.
All computations logged for audit purposes.

## User Preferences
- Professional, enterprise-grade UI
- No emojis unless requested
- Clean, modern design with FairScore branding

## Environment Variables
- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY

## Database Migrations
Run migrations in order:

### Migration 1: RBAC & Enterprise (20260108000001)
- user_profiles table with RBAC
- permissions matrix
- event_admin_assignments
- audit_logs
- organizations and branding_settings
- RLS policies

### Migration 2: Backend Scoring Engine (20260108000002)
- raw_evaluations table for judge submissions
- computed_results table for final scores
- scoring_audit_log for computation tracking
- PostgreSQL functions:
  - `submit_raw_scores()` - Validates and stores raw scores
  - `compute_round_scores()` - Executes USP formulas
  - `get_round_results()` - Retrieves computed results
- RLS policies for data security

### Migration 3: Event Lifecycle Constraints (20260108000003)
- event_state_transitions table for state history
- score_overrides table for admin override logging
- event_notifications table for automatic notifications
- evaluation_scores table for one-score-per-criterion enforcement
- Database triggers:
  - `validate_event_transition()` - Enforces valid state transitions
  - `prevent_locked_event_data_modification()` - Blocks changes after lock
  - `notify_event_state_change()` - Triggers notifications
- PostgreSQL functions:
  - `get_event_state()` - Returns current state with permissions
  - `transition_event_status()` - Safely changes event state
  - `log_score_override()` - Logs admin overrides with full audit trail

## New Components
- **RealTimeEventIndicator**: Live-updating status display with permission indicators
- **AdminOverrideModal**: Form for admin score corrections with required reason
- **ScoreOverrideHistory**: Audit trail viewer for all overrides
- **TransparencyDashboard**: Full event analysis at `/admin/event/:eventId/transparency`
  - **ScoreBreakdownPanel**: Per-category breakdowns, raw vs normalized comparisons
  - **FormulaExplanation**: User-friendly methodology explanation
  - **JudgeAnalytics**: Contribution metrics, consistency scoring, bias detection
  - **AuditTrailViewer**: Filterable action history with pagination
  - **ExportPanel**: CSV/PDF report generation

## Accessibility & UI Features
- **WCAG Compliance**: Focus management, keyboard navigation, ARIA labels
- **High Contrast Mode**: Toggle via accessibility settings panel
- **Reduced Motion**: Respects user preferences and system settings
- **Screen Reader Support**: Semantic HTML, ARIA labels, skip links
- **Responsive Design**: Mobile-first layouts using CSS Grid and MUI breakpoints
- **Touch Targets**: Minimum 44px touch targets on all interactive elements
- **Text Scaling**: Adjustable text size (87.5% to 125%)

### Accessibility Settings Component
Available via the accessibility icon in the navigation bar:
- High contrast mode toggle
- Reduced motion toggle
- Text size selector (small, normal, large, extra large)
- Keyboard shortcut reference

## Next Steps
1. Apply all three database migrations to Supabase
2. Integrate email service for notifications
3. Performance testing
