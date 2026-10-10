# Zila & Lil-Zila: Comprehensive System Developer Manual & Architecture Blueprint

> **Status:** Production / Active Development  
> **Target Audience:** Core Engineers, Open Source Contributors, System Architects, Integration Engineers  
> **Version:** v2.4.0 (Autonomous Agent & Gamified Internship Lifecycle)

---

## Table of Contents

1. [Executive Summary & High-Level System Vision](#1-executive-summary--high-level-system-vision)
2. [End-to-End Architecture: The Ecosystem Triad](#2-end-to-end-architecture-the-ecosystem-triad)
   - 2.1 The Zigex Web Platform & Admin Dashboard
   - 2.2 Zila-API (Backend Core, Neon PostgreSQL & Supabase)
   - 2.3 Lil-Zila TUI Agent (`@zigex/zila`)
3. [Component Status: What Is Built vs. What Is Left](#3-component-status-what-is-built-vs-what-is-left)
   - 3.1 Fully Implemented & Shipped Subsystems
   - 3.2 In-Progress & Refined Modules
   - 3.3 What Is Left to Build (Target Milestone Roadmap)
4. [Student Onboarding & Environment Initialization Workflow](#4-student-onboarding--environment-initialization-workflow)
   - 4.1 Dependency Health Checks (`zila init` / `zila-init`)
   - 4.2 Automated Package Resolution (`--all`, `--node`, `--python`, `--git`)
   - 4.3 Agent AI Setup Wizard (`agent --setup`)
   - 4.4 Provider Selection & Key Storage (Gemini, Groq, Claude, OpenAI via OpenRouter / LangChain)
5. [Lil-Agent Interactive Shell: Claude Code-Style Experience](#5-lil-agent-interactive-shell-claude-code-style-experience)
   - 5.1 Architecture of `lil-agent` Interactive TUI
   - 5.2 Context Gathering & Workspace Awareness
   - 5.3 Streaming Multi-Turn Conversations
6. [Autonomous Task Submission, Logbook Enrichment & Honest Evaluation](#6-autonomous-task-submission-logbook-enrichment--honest-evaluation)
   - 6.1 Submitting Tasks via Terminal (`zila submit-task`)
   - 6.2 Supervisor Instruction Parsing from Code Comments
   - 6.3 Semantic Git Diff & Truth Verification (Ground Truth vs. Actual Work)
   - 6.4 Auto-Generated Contributor Logbook Enrichment
   - 6.5 Supervisor Executive Summary & Objective Rubric Scoring (0.0 – 1.0)
7. [The Business Model, Quotas, Billing & Penalty Distribution](#7-the-business-model-quotas-billing--penalty-distribution)
   - 7.1 Admin Payment Toggle Integration on Zigex-App
   - 7.2 The 6-Free-Task Tier Policy
   - 7.3 Enforcement & Evaluation Freezing
   - 7.4 Deadline Grace Periods & The Penalty Revenue Split (90% Zigex / 10% Host Company)
8. [Data Models, Database Schema & State Serialization](#8-data-models-database-schema--state-serialization)
9. [Developer Setup, Testing & Contribution Guidelines](#9-developer-setup-testing--contribution-guidelines)

---

## 1. Executive Summary & High-Level System Vision

**Zila** is an agentic, terminal-native workspace platform designed to transform traditional software engineering internships and training bootcamps. Rather than relying on subjective manual reviews, unstructured submissions, and fragmented communication, Zila provides a deterministic, automated feedback loop between students, educational supervisors, host companies, and administrators.

The project revolves around three guiding tenets:
1. **Zero-Friction Terminal Native Experience:** Interns interact directly through a terminal user interface (TUI) called **Lil-Zila**, reducing distractions and cultivating professional CLI habits.
2. **Deterministic & Honest Automated Evaluation:** Submissions are validated against actual Git commits, GitHub Pull Requests, and supervisor instructions embedded directly in code comments. An AI agent acts as a fair, objective reviewer that enriches logbooks and provides honest 0.0 – 1.0 rubric marks.
3. **Sustainable Monetization & Fair Governance:** Bootcamps and companies hosting internships can enforce payment compliance, offer a 6-task trial sandbox, and distribute post-deadline penalty fees transparently (90% to platform infrastructure, 10% to host companies).

---

## 2. End-to-End Architecture: The Ecosystem Triad

The system operates across three tightly integrated tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ZIGEX WEB PLATFORM                            │
│  - Student Registration & Cohort Placements                            │
│  - Admin Section -> Student Records -> Payment Status Toggle           │
│  - Supervisor Reviews & Company Partner Portals                        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / REST / Supabase JWT
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ZILA-API (Express + Prisma)                     │
│  - Neon Serverless PostgreSQL & Supabase Auth Integration              │
│  - Cohort Isolation & Gamification Engine                              │
│  - Resend Email Dispatcher (Merge & Notification Alerts)               │
│  - GitHub PR Sync Service (State Machine, Quotas & Scoring)            │
│  - Payment Compliance & Evaluation Guard Middleware                    │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │
                                   │ JSON API (Bearer Token)
                                   │
┌──────────────────────────────────┴─────────────────────────────────────┐
│                       LIL-ZILA TUI AGENT (@zigex/zila)                 │
│  - Interactive Shell (Ink, React, TypeScript)                          │
│  - Pre-flight Dependency Checker & Auto-installer (Node, Python, Git) │
│  - Multi-Provider Agent Configuration (`agent --setup`)                │
│  - Claude Code-Inspired Interactive Chat Shell (`lil-agent`)           │
│  - Automated PR Dispatcher & Blue Horizontal Pipeline Loader           │
│  - Local Git Watcher, Logbook Generator & Truth Verification Engine    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Zigex Web Platform & Admin Dashboard
The web application serves as the single source of truth for user identities, supervisor profiles, cohort rosters, and billing compliance.
- **Admin Section -> Students -> Records Tab:** Administrators can inspect enrollment records and toggle a student's payment status (`paid: true | false`).
- **Partner Company Portal:** Host companies monitor candidate progress, view submissions, and track platform revenue allocations.

### 2.2 Zila-API (Backend Core)
Built on Node.js/TypeScript with Express and Prisma ORM, deployed over Neon PostgreSQL:
- **Strict Cohort Isolation:** Students enrolled in multiple cohorts have isolated points and leaderboards. Points earned in one cohort never spill over into another.
- **GitHub PR Sync Service:** Periodically pulls or receives webhooks from GitHub, resolves PR merges, detects branches, awards gamification points (Day 1: 1pt, Day 2: 1pt, Day 3: 2pts, Day 4: 4pts), and prevents duplicate awards.
- **Transactional Email Dispatch:** Dispatches automated HTML emails via Resend when PRs are accepted or rejected by supervisors.

### 2.3 Lil-Zila TUI Agent (`@zigex/zila`)
The globally installed terminal agent that lives on the student's local machine:
- Manages local configuration in `~/.zila/`.
- Renders retro-styled, highly responsive terminal components using Ink.
- Automates Git branching, local commits, GitHub push events, and API dispatching.

---

## 3. Component Status: What Is Built vs. What Is Left

To provide complete transparency to new engineers joining the codebase, here is the granular breakdown of existing components versus target deliverables:

```
┌──────────────────────────────────────────────┬──────────────────────────┬─────────────────────────────┐
│ Feature Subsystem                            │ Current State            │ Implementation Details      │
├──────────────────────────────────────────────┼──────────────────────────┼─────────────────────────────┤
│ Cohort Selection & Switching (`zila cohorts`)│ DONE (Shipped)           │ Cached in ~/.zila/          │
│ Leaderboard with PR Status & Isolation       │ DONE (Shipped)           │ Per-cohort points & icons   │
│ Daily PR Quota Tracker (Max 2 PRs / day)     │ DONE (Shipped)           │ UTC midnight reset          │
│ Animated Blue Horizontal Pipeline Loader     │ DONE (Shipped)           │ Ink 40ms sliding animation  │
│ GitHub PR Sync Service & Duplicate Guard     │ DONE (Shipped)           │ PR-specific match & sync    │
│ Resend Automated Transactional Emails        │ DONE (Shipped)           │ Accepted / Rejected alerts  │
│ Database Network Resiliency (`withDbRetry`)  │ DONE (Shipped)           │ Exponential backoff         │
├──────────────────────────────────────────────┼──────────────────────────┼─────────────────────────────┤
│ Dependency Pre-flight Checker (`zila init`)  │ PARTIAL / IN-PROGRESS    │ Detects node/git; needs CLI │
│ Multi-Tool Auto-installer (`--all`, etc.)    │ SPECIFIED (What Is Left) │ Shell auto-install scripts  │
│ LLM Provider Setup (`agent --setup`)         │ SPECIFIED (What Is Left) │ Provider selection + keys   │
│ Claude Code-Style Shell (`lil-agent`)        │ SPECIFIED (What Is Left) │ Interactive chat REPL       │
│ Exercise Comment Instruction Extractor       │ SPECIFIED (What Is Left) │ AST / Regex code parser     │
│ Automated Contributor Logbook Enrichment     │ SPECIFIED (What Is Left) │ Auto-push to repo folder    │
│ Honest 0.0 - 1.0 Semantic Evaluation Model   │ SPECIFIED (What Is Left) │ OpenRouter / LangChain      │
│ 6-Task Free Trial & Payment Guard Enforcement│ SPECIFIED (What Is Left) │ API & TUI billing gate      │
│ Late Penalty Fee Split (90% Zigex / 10% Co.) │ SPECIFIED (What Is Left) │ Stripe / Mobile Money logic │
└──────────────────────────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

---

## 4. Student Onboarding & Environment Initialization Workflow

### 4.1 Dependency Health Checks (`zila init` or `zila-init`)
When a student enrolls, the first command they execute is:

```bash
zila init
# or alias:
zila-init
```

The system conducts deterministic checks against the host operating system:
1. **Node.js Check:** Ensures `node -v` is installed and version is `>= 18.0.0`.
2. **Python Check:** Ensures `python3 --version` (or `python --version`) is installed and `>= 3.10`.
3. **Git Check:** Validates `git --version` and verifies `git config user.name` and `git config user.email` exist.

If any tool is missing, the CLI displays a diagnostic report:

```
lil-zila › environment dependency check
────────────────────────────────────────────────────────────────────────
[✔] Node.js Runtime     v20.12.2          Ready
[✖] Python Runtime      NOT FOUND         Required for ML / Data tracks
[✔] Git Version Control v2.43.0           Ready
────────────────────────────────────────────────────────────────────────
! Missing required environment dependencies detected.
Run 'zila init --python' or 'zila init --all' to automatically configure your environment.
```

### 4.2 Automated Package Resolution (`--all`, `--node`, `--python`, `--git`)
Students can resolve dependencies automatically by passing CLI flags:

- `zila init --all`: Detects OS package manager (`apt-get`, `brew`, `choco`, `winget`, or direct curl installers) and installs Node.js, Python, and Git unattended.
- `zila init --node`: Downloads and installs the active Node.js LTS via official package scripts or NVM.
- `zila init --python`: Installs Python 3 with `pip` and basic build tools.
- `zila init --git`: Installs Git and prompts for name and email configuration if unconfigured.

### 4.3 Agent AI Setup Wizard (`agent --setup`)
Once the environment passes all health checks, the terminal guides the intern:

```
All dependencies verified! Type 'agent --setup' to configure your autonomous AI pair programmer.
```

Executing `agent --setup` triggers an interactive TUI screen:

```
lil-zila › configure autonomous ai agent
Select your preferred intelligence provider (use ↑ / ↓ arrows, Enter to select):

  › [1] Google Gemini (Recommended - Free Tier & Fast)
    [2] Groq LPU (Ultra-Low Latency Inference - Llama 3)
    [3] Anthropic Claude (Claude 3.5 Sonnet - Top Coding Precision)
    [4] OpenAI (GPT-4o / GPT-4o-mini)
    [5] OpenRouter (Multi-Model Unified Gateway)
```

### 4.4 Provider Selection & Key Storage
1. The student navigates with keyboard arrows and presses `Enter`.
2. The agent securely prompts for the API key:
   ```
   Paste your API Key for [Google Gemini]:
   ❯ ****************************************
   ```
3. Zila validates the key with a lightweight 1-token ping (`models.list` or simple completion).
4. Upon successful validation, the key is encrypted and stored in `~/.zila/agent_config.json`:
   ```
   [✔] Testing API Key connection... OK
   [✔] Provider calibrated: Gemini 1.5 Flash / Pro
   Agent Setup Completed: 100%
   Type 'lil-agent' to start pairing with your AI coding assistant!
   ```

---

## 5. Lil-Agent Interactive Shell: Claude Code-Style Experience

When students type:

```bash
lil-agent
```

The terminal opens a full-screen or persistent REPL interface styled identically to **Claude Code**, but customized with the retro-blue aesthetic of Lil-Zila.

### 5.1 Architecture of `lil-agent`
- **Shell Layout:**
  - Header: Active cohort, track (e.g., `[EMBEDED] INTERMEDIATE`), sprint day, active LLM model.
  - Chat Stream: Markdown-rendered streaming text, syntax-highlighted code blocks, and tool invocation widgets.
  - Status Line: Token usage, latency, and current working directory path.
  - Input Prompt: Multiline editable prompt supporting keyboard shortcuts (Esc, Enter, Ctrl+C).
- **Core Capabilities:**
  - **Context-Aware Assistance:** Understands the daily exercise file, directory structure, and cohort curriculum.
  - **Socratic Mentoring:** Never provides copy-paste cheat solutions; guides the student with hints and explanations.
  - **Local File Inspection:** Reads student code, detects syntax errors, and suggests debugging steps.

---

## 6. Autonomous Task Submission, Logbook Enrichment & Honest Evaluation

This is the cornerstone of Zila's automated academic integrity engine.

### 6.1 The Submission Trigger (`zila submit-task`)
When a student completes their daily exercise, they launch the submission pipeline:

```bash
zila submit-task
```

This launches the full TUI with the animated horizontal blue loader:
`[PIPELINE] Connecting to GitHub repository...`
`[───────━━━━━━━━━━────────────────────────────────────────────────]`

### 6.2 Supervisor Instruction Parsing from Code Comments
Supervisor instructions are authored at the top of the assigned template file as structured comments. For example, in `contributors/<username>/<domain>/<module>/day_1/exercise.py`:

```python
"""
========================================================================
SUPERVISOR INSTRUCTIONS & GRADING CRITERIA:
Task: Implement a non-blocking circular buffer for UART packets.
Requirements:
  1. Define a FixedSizeBuffer class with capacity of 64 bytes.
  2. Implement write() and read() methods handling overflow gracefully.
  3. Write unit tests covering head/tail wraparound conditions.
Weight: 1.0 (Day 01)
========================================================================
"""
```

The agent's parsing engine:
1. Reads the top comment block of the exercise file.
2. Extracts specific rubric requirements and validation criteria.

### 6.3 Semantic Git Diff & Truth Verification
The agent performs a truth-checking comparison:
- **Baseline:** The template starter code.
- **Student Work:** The staged Git diff and commit logs created by the student.
- **Analysis:**
  - Did the student actually write the implementation, or did they simply commit empty boilerplate?
  - Did they hardcode return values to fool static assertions?
  - Does the implementation satisfy all 3 supervisor requirements?

### 6.4 Auto-Generated Contributor Logbook Enrichment
Zila automatically enriches the student's logbook under their dedicated repository folder:
`contributors/<github_username>/logbook.md`

The agent appends a structured entry:
```markdown
## Sprint Week 01 — Day 01: Circular Buffer Implementation
- **Date & Timestamp:** 2026-10-10 14:32:10 UTC
- **Pull Request:** https://github.com/iws3/sample_repo_zila/pull/12
- **Objective:** Build a non-blocking 64-byte circular buffer for embedded UART telemetry.
- **Work Performed:** 
  - Implemented `FixedSizeBuffer` with pointer wraparound logic.
  - Added unit test suite in `tests/test_buffer.py` passing 100% assertions.
- **Challenges Encountered:** Managed race conditions when buffer reached capacity during burst transmissions.
```

This logbook is committed directly to the student's branch and pushed with the pull request.

### 6.5 Supervisor Executive Summary & Objective Rubric Scoring (0.0 – 1.0)
Before opening the PR, the agent appends an **Honest Evaluation Summary** to the bottom of `exercise.md` (or into the PR body) for the supervisor:

```markdown
---
### 🤖 ZILA AUTOMATED EVALUATION & INTEGRITY REPORT
- **Student Claim:** "Completed all buffer tasks and tested wraparound."
- **Ground Truth Verification:** 
  - Requirement 1 (Capacity 64): PASS
  - Requirement 2 (read/write non-blocking): PASS
  - Requirement 3 (Wraparound tests): PARTIAL (Only tested head, omitted tail wraparound).
- **Integrity Score:** 0.85 / 1.0
- **Supervisor Recommendation:** Merge approved. Award 0.85 normalized mark.
---
```

When the supervisor merges the PR on GitHub, the webhook/sync engine registers the mark and updates the leaderboard.

---

## 7. The Business Model, Quotas, Billing & Penalty Distribution

### 7.1 Admin Payment Toggle Integration on Zigex-App
Within `zigex-app`:
1. Administrators navigate to **Admin Panel ➔ Students ➔ Records Tab**.
2. Each student record contains a payment status flag:
   ```json
   {
     "studentId": "26969aea-c9bd-420b-98ce-49c623de208f",
     "cohortId": "cmui76qdg002yau8k1upvjx06",
     "hasPaid": false,
     "feeStatus": "unpaid",
     "submissionsCount": 5
   }
   ```

### 7.2 The 6-Free-Task Tier Policy
Every intern is entitled to a free trial tier:
- **Free Quota:** Exactly **6 task submissions** per program/cohort.
- This allows students to experience the curriculum, submit PRs, and see their initial rankings on the leaderboard without paying upfront.

### 7.3 Enforcement & Evaluation Freezing
Upon attempting submission #7:
1. `zila-api` checks `hasPaid` and `submissionsCount`:
   ```typescript
   if (!student.hasPaid && student.submissionsCount >= 6) {
     return res.status(402).json({
       error: "Payment Required: Free evaluation quota exceeded (6/6 completed).",
       quotaExceeded: true,
       checkoutUrl: `https://zigex.com/checkout?studentId=${student.id}&cohort=${cohortId}`
     });
   }
   ```
2. The Lil-Zila TUI catches the 402 code and renders an alert banner:
   ```
   lil-zila › evaluation access paused
   ────────────────────────────────────────────────────────────────────────
   You have completed your 6 free curriculum submissions.
   To continue receiving automated evaluation, supervisor PR merges,
   and leaderboard accreditation, please complete your internship tuition.
   
   Secure Checkout URL: https://zigex.com/checkout?id=cmui76...
   ────────────────────────────────────────────────────────────────────────
   ```

### 7.4 Deadline Grace Periods & The Penalty Revenue Split (90% / 10%)
Internships operate under strict modular deadlines:
- **On-Time Payment:** Standard tuition fee.
- **Late Payment (After Cohort Deadline):** A late penalty fee is applied.
- **Automated Split Breakdown:**
  - **90%** allocated to **Zigex Platform** (cloud infrastructure, AI token inference, maintenance).
  - **10%** allocated to the **Host Company / Partner Organization** owning that internship.

The payout is calculated and queued automatically in the financial ledger when the payment webhook fires:
```typescript
interface PenaltyDistribution {
  totalFee: number;
  zigexShare: number;   // 0.90 * totalFee
  companyShare: number; // 0.10 * totalFee
  companyId: string;
}
```

---

## 8. Data Models, Database Schema & State Serialization

### Prisma Schema Entities (Key Relations)

```prisma
model CohortStudent {
  id              String   @id @default(cuid())
  cohortId        String
  studentId       String   // Supabase UUID
  studentEmail    String
  studentName     String
  status          String   @default("active")
  
  // Billing fields
  hasPaid         Boolean  @default(false)
  freeTasksUsed   Int      @default(0)
  penaltyPaid     Boolean  @default(false)

  // Relations
  cohort          Cohort   @relation(fields: [cohortId], references: [id])
  tasksSubmitted  TaskSubmission[]
  gamificationPoints GamificationPoint[]
}

model TaskSubmission {
  id              String   @id @default(cuid())
  taskId          String
  studentId       String
  githubPrUrl     String?
  githubBranch    String?
  commitHash      String?
  status          String   @default("submitted") // submitted, approved, rejected
  pointsEarned    Int?
  feedback        String?
  submittedAt     DateTime @default(now())
  reviewedAt      DateTime?

  task            Task     @relation(fields: [taskId], references: [id])
  student         CohortStudent @relation(fields: [studentId], references: [id])
}

model GamificationPoint {
  id              String   @id @default(cuid())
  studentId       String
  pointType       String   // task_completion_merge
  points          Int
  reason          String
  relatedTaskId   String?
  awardedAt       DateTime @default(now())

  student         CohortStudent @relation(fields: [studentId], references: [id])
}
```

---

## 9. Developer Setup, Testing & Contribution Guidelines

### Running the Ecosystem Locally

1. **Clone Repositories:**
   ```bash
   git clone https://github.com/zigxconnect/zila-api.git
   git clone https://github.com/zigxconnect/zila_tui.git
   ```

2. **Setup Zila-API:**
   ```bash
   cd zila-api
   npm install
   npx prisma generate
   npm run build
   npm start
   # Server runs on http://localhost:5000
   ```

3. **Setup Lil-Zila TUI:**
   ```bash
   cd ../zila-agent
   npm install
   npm run build
   npm test
   npm install -g .
   ```

4. **Testing Suite Validation:**
   - Always run unit tests before proposing PRs:
     - `zila-api`: `npm test` (30 test suites passing)
     - `zila-agent`: `npm test` (53 test suites passing)
