# 🎯 EvelutorApp — Fair & Transparent Judging Platform

> A modern web platform for managing multi-round evaluation events like hackathons, idea pitches, and innovation challenges — with built-in bias correction and real-time results.

---

## 🌟 Overview

**EvelutorApp** streamlines event evaluation from setup to final results.  
Admins can create events, assign judges, manage rounds, and automatically normalize scores to ensure fairness — eliminating judge bias using **Z-score normalization**.

This project aims to make competition scoring **transparent**, **data-driven**, and **simple**.

---

## 🧩 Core Features

### 👩‍💼 Admin Portal
- Create and configure events, rounds, venues, and categories  
- Define weighted scoring categories (e.g., *Innovation*, *Technical*, *Presentation*)  
- Manage teams, judges, and assignments  
- Trigger computations: **Top-N selection**, **Normalization**, **Final Rankings**  
- Export results (CSV/PDF)  
- View and override scores with full audit trail  

### 🧑‍⚖️ Judge Interface
- Simple, distraction-free scoring form  
- Enter category scores via secure tokenized links (no login hassle)  
- Auto-calculated totals and validation  

### 📊 Results & Fairness Engine
- Judge-wise **Z-score normalization** to remove leniency/harshness bias  
- Percentile-based ranking for final results  
- Multi-round progression (Round 1 → Round 2 finalists)  
- Supports manual edits, audit logging, and data exports  

---

## 🧠 How It Works

### 🧮 Scoring Pipeline

1. **Raw Totals** → judges rate teams across categories  
2. **Z-score Normalization** → adjusts for judge bias  
3. **Aggregation** → team mean Z computed across judges  
4. **Percentile Mapping** → converts to fair, intuitive scores  
5. **Ranking** → final team order is derived

This ensures results reflect *relative performance*, not judge variability.

---

## 🗃️ Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React + Material UI (MUI) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth (Email/Password + Magic Links) |
| **Hosting** | Vercel / Netlify |

---

## ⚙️ API Structure (Simplified)

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/api/events` | POST | Create new event |
| `/api/events/:id/categories` | POST | Add category |
| `/api/events/:id/judges` | POST | Add judge |
| `/api/rounds/:id/evaluations` | POST | Submit scores |
| `/api/rounds/:id/normalize` | POST | Run normalization |
| `/api/rounds/:id/results` | GET | View final results |
| `/api/events/:id/export` | GET | Export CSV/PDF |

---

## 💻 Frontend Modules

- **AdminDashboard** — manage events, judges, and rounds  
- **CategoryManager** — create/edit weighted categories  
- **AssignmentPage** — assign judges to teams/venues  
- **JudgeInterface** — intuitive scoring page (mobile-friendly)  
- **LiveResultsPage** — view normalized rankings  
- **RoundManagementPage** — compute results and advance rounds  

---

## 🧠 Normalization Logic (Z-Score)

The platform uses a robust **Per-Criterion Z-Score** algorithm to ensure fairness:

1.  **Calculate Z-Score per Criterion**:
    For each criterion $c$, judge $j$, and team $i$:
    $$Z_{i,j,c} = \frac{X_{i,j,c} - \mu_{j,c}}{\sigma_{j,c}}$$
    *(Where $X$ is the raw score, $\mu$ is the judge's mean for that criterion, and $\sigma$ is the standard deviation)*

2.  **Apply Weighting**:
    $$Z_{weighted} = Z_{i,j,c} \times Weight_c$$

3.  **Aggregation**:
    Team's final score is the **sum** of all weighted Z-scores from all judges.
    $$FinalScore_i = \sum_{j} \sum_{c} (Z_{i,j,c} \times Weight_c)$$

4.  **Ranking**:
    Teams are ranked by their final aggregated Z-Score. Ties are broken by:
    1. Score on highest weighted criterion.
    2. Score on next highest weighted criterion.
    3. Mean raw total.

---

## 🆕 Recent Updates
- **Criteria Sync**: Easily copy event-level criteria to rounds.
- **Import/Export**: Bulk import scores via CSV; export Raw and Normalized results.
- **Smart Auth**: 30-minute idle timeout for security.
- **Event Management**: Complete lifecycle management for events, rounds, and judges.
