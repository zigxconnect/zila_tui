# Zila — Project Documentation

> **Zila** is an agentic terminal tool that manages the internship lifecycle of a student — from environment setup and daily monitoring, to logbook generation and final evaluation.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [External Integrations](#4-external-integrations)
5. [Student-Facing Features](#5-student-facing-features)
   - 5.1 [Installation](#51-installation)
   - 5.2 [zila init](#52-zila-init)
   - 5.3 [Working Directory Structure](#53-working-directory-structure)
   - 5.4 [Monitoring Assistant](#54-monitoring-assistant)
   - 5.5 [Pull Requests & Task Submission](#55-pull-requests--task-submission)
   - 5.6 [Logbook Generation](#56-logbook-generation)
6. [Supervisor-Facing Features](#6-supervisor-facing-features)
   - 6.1 [View Students](#61-view-students)
   - 6.2 [Weekly Comments & Observations](#62-weekly-comments--observations)
   - 6.3 [End-of-Internship Evaluation](#63-end-of-internship-evaluation)
7. [Git Repository Structure (Learning Materials)](#7-git-repository-structure-learning-materials)
8. [Copy-Paste & Plagiarism Detection](#8-copy-paste--plagiarism-detection)
9. [Command Reference](#9-command-reference)
10. [Open Questions & Future Considerations](#10-open-questions--future-considerations)

---

## 1. Project Overview

Zila is a CLI tool built with **Node.js (TypeScript + Ink)** that automates and monitors the internship process for students at Zigex. It eliminates manual environment setup, ensures students follow a structured learning path based on their department and skill level, tracks their daily progress, and helps supervisors evaluate them fairly at the end of each internship period.

### Core Problems Zila Solves

| Problem | How Zila Handles It |
|---|---|
| Students waste time setting up environments | `zila init` clones the right repo and installs all dependencies automatically |
| No structured path per department/level | Working directories are pre-structured by department and level in a central Git repo |
| No visibility into what students actually do | The monitoring assistant tracks file changes and commit messages |
| Logbooks are written manually and often inaccurate | `zila logbook` auto-generates a weekly logbook from real commit history |
| Plagiarism / copy-paste is hard to catch | File change patterns and commit analysis flag suspicious activity |
| Supervisors evaluate subjectively | Structured weekly comments feed into a school-specific evaluation document |

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        ZILA CLI                          │
│  (Node.js + TypeScript + Ink)                            │
│                                                          │
│  ┌─────────────┐   ┌──────────────┐  ┌───────────────┐   │
│  │ zila init   │   │  Monitoring  │  │ zila logbook  │   │
│  │             │   │  Assistant   │  │               │   │
│  └──────┬──────┘   └──────┬───────┘  └───────┬───────┘   │
│         │                 │                  │           │
└─────────┼─────────────────┼──────────────────┼────────── ┘
          │                 │                  │
          ▼                 ▼                  ▼
   ┌─────────────┐   ┌────────────┐    ┌──────────────┐
   │  Zigex API  │   │ Local Git  │    │  Git Commits │
   │ (Auth, User │   │  Watcher   │    │   History    │
   │  Profile)   │   │            │    │              │
   └─────────────┘   └────────────┘    └──────────────┘
          │
          ▼
   ┌─────────────┐
   │ Central Git │
   │  Repo       │
   │ (Materials) │
   └─────────────┘
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| CLI Runtime | Node.js |
| Language | TypeScript |
| Terminal UI | Ink (React for CLIs) |
| Auth / User Data | Zigex API (external) |
| Version Control | Git |
| Monitoring | Node.js file watcher (e.g. `chokidar`) |
| Plagiarism Detection | AI-powered code analysis (see Section 8) |
| Logbook Output | Markdown (`.md`) |
| Evaluation Output | School-specific document (Markdown or PDF) |

---

## 4. External Integrations

### Zigex Platform

Zigex is an existing, separate platform that manages student registrations and internship records. Zila communicates with Zigex exclusively through its API.

Zila uses the Zigex API for:

- **Authentication** — Verifying the student's email and validating the OTP sent to them.
- **Internship Status** — Checking whether the student has registered for an active internship.
- **Student Profile** — Retrieving the student's department (e.g. web, ML, embedded) and level (beginner, intermediate, advanced) to determine which working directory to set up.
- **Supervisor Access** — Allowing supervisors to authenticate and retrieve their assigned students.

> **Note:** Zila holds no user database of its own. All identity and registration data lives in Zigex. Zila is a client of Zigex.

---

## 5. Student-Facing Features

### 5.1 Installation

Students install Zila globally via npm:

```bash
npm install -g zila
```

This global install sets up:

- The `zila` CLI command and all its sub-commands.
- The monitoring assistant binary (available as a separate command, e.g. `zila monitor`).
- All runtime dependencies Zila needs to operate (Git checks, API clients, file watchers, etc.).

> **Design Consideration:** Because the monitoring assistant is installed globally alongside Zila but started manually by the student, it is always available after a fresh install — no separate installation step needed. Students simply run `zila monitor start` when they begin working.

---

### 5.2 `zila init`

`zila init` is the setup command that bootstraps a student's entire working environment. It should be run once per internship. It performs the following steps in order:

#### Step 1 — Pre-flight Checks

Zila verifies that the machine is ready:

- **Internet connectivity** — Checks for an active internet connection. Fails fast with a clear message if offline.
- **Node.js** — Verifies Node is installed and meets the minimum required version.
- **Python** — Checks for a Python installation (required for ML/data departments and some packages).
- **Git** — Confirms Git is installed and configured.

If any check fails, Zila prints a friendly, actionable message telling the student exactly what to install and where to get it, then exits. It does not proceed until all checks pass.

#### Step 2 — Authentication

- Prompts the student for the **email address** they used when registering on Zigex.
- Calls the Zigex API to trigger an **OTP** sent to that email.
- Prompts the student to enter the OTP.
- Zigex API validates the OTP. On success, Zila receives and stores a session token locally (in a config file, e.g. `~/.zila/config.json`).

#### Step 3 — Internship Verification

- Calls the Zigex API with the authenticated token to check if the student has an **active internship registration**.
- If no internship is found, Zila prints a message directing them to register on the Zigex platform and exits.
- If an internship is found, Zila retrieves the student's **department** and **level** from Zigex.

#### Step 4 — Working Directory Setup

- Using the department and level, Zila identifies the correct branch or subdirectory from the **central learning materials Git repository**.
- Clones that directory into a named folder in the student's home directory (e.g. `~/zila-workspace/web-beginner/`).
- Detects and installs dependencies:
  - `package.json` → runs `npm install`
  - `requirements.txt` → runs `pip install -r requirements.txt`
  - Any other dependency manifest files relevant to the department.

#### Step 5 — Completion Message

Zila prints a clear, well-formatted success message to the terminal that includes:

- Where the working directory was created.
- How to navigate into it.
- A summary of helpful commands (e.g. `zila monitor start`, `zila logbook`, `zila submit`).
- A pointer to the `instructions.md` file inside the working directory.

---

### 5.3 Working Directory Structure

Each working directory is sourced from the central Git repository and structured like this:

```
zila-workspace/
└── {department}-{level}/          e.g. web-beginner/
    ├── instructions.md            How to work, commit, and submit
    ├── exercises/
    │   ├── 01-intro/
    │   │   ├── README.md          Task description and learning objectives
    │   │   └── starter/           Starter files for the exercise
    │   ├── 02-html-basics/
    │   └── ...
    └── resources/                 Reference materials and links
```

The `instructions.md` file is a critical guide that tells students:

- How to write commit messages (format, conventions).
- How to make a pull request for each exercise.
- What information to include in a PR description.
- How the monitoring assistant works and why they should start it.

---

### 5.4 Monitoring Assistant

The monitoring assistant is a process the student manually starts and stops. It watches the working directory while the student is active.

**Starting and stopping:**

```bash
zila monitor start    # Begin monitoring the working directory
zila monitor stop     # Stop monitoring
zila monitor status   # Check if it's running
```

**What it tracks:**

- **File changes** — Which files were created, modified, or deleted, and when.
- **Git commit messages** — Every commit made inside the working directory is logged with its timestamp, message, and diff summary.

**What it stores:**

All tracking data is stored locally in a `.zila/` hidden folder inside the working directory. This data feeds into logbook generation and plagiarism detection.

> **Why manual start/stop?** This respects student autonomy — they are not being silently surveilled. Starting the monitor is a conscious act, which also encourages intentional working habits.

---

### 5.5 Pull Requests & Task Submission

Each exercise is submitted via a **pull request** (PR) against the central learning repository. The detailed process is described in `instructions.md` inside the working directory, but Zila also provides a helper command:

```bash
zila submit           # Guides the student through creating a PR for the current exercise
```

#### What a PR Should Contain

Each pull request must include:

- A **commit message** following the prescribed format (defined in `instructions.md`).
- A **PR description** that includes:
  - The task name and exercise number.
  - A short explanation of what the student did and what they learned.
  - Any challenges encountered.

#### What Zila Extracts from a PR

When a PR is submitted, Zila (via a webhook or API poll to the Git platform) captures:

| Data Point | Source |
|---|---|
| Task name | Exercise folder name + PR title |
| Skill acquired | Mapped from task metadata in `README.md` |
| Submission timestamp | PR creation time |
| File contents | Diff of changed files in the PR |
| Potential plagiarism flags | Code analysis (see Section 8) |

This data is stored per-student and per-exercise, and feeds into the weekly logbook and supervisor evaluation.

---

### 5.6 Logbook Generation

At the end of each week, students can generate their logbook:

```bash
zila logbook          # Generates this week's logbook
zila logbook --week 3 # Generate logbook for a specific past week
```

The logbook is generated as a **Markdown (`.md`) file** and saved inside the working directory (e.g. `.zila/logbooks/week-3.md`).

#### Logbook Content

The logbook is automatically compiled from:

- All **git commits** made during the week (dates, messages, and exercise references).
- **File change records** from the monitoring assistant.
- **PR submissions** made during the week.

#### Logbook Structure

```markdown
# Internship Logbook — Week 3
**Student:** [Name from Zigex]
**Department:** Web Development
**Level:** Beginner
**Period:** 2025-10-13 to 2025-10-17

---

## Monday, October 13
- Completed Exercise 02: HTML Basics
  - Commit: `feat(ex02): add semantic HTML structure to landing page`
  - Time spent: ~2h (based on file change timestamps)

## Tuesday, October 14
...

## Summary
- Exercises completed this week: 3
- Skills acquired: Semantic HTML, CSS Flexbox, Basic Git workflow
- Total commits: 7
```

---

## 6. Supervisor-Facing Features

Supervisors authenticate with their Zigex credentials and access Zila via the terminal (web dashboard planned for a future phase).

```bash
zila supervisor login
```

---

### 6.1 View Students

```bash
zila supervisor students              # List all students in your department
zila supervisor students --level beginner   # Filter by level
```

Displays for each student:

- Name and email.
- Department and level.
- Internship start date and **session end date**.
- Last active date (last commit or monitor activity).
- Number of exercises completed.

---

### 6.2 Weekly Comments & Observations

Supervisors can add structured observations about a student each week. These comments are tied to the week number and feed into the final evaluation.

```bash
zila supervisor comment --student <email> --week 3
```

This opens an interactive prompt (built with Ink) where the supervisor fills in:

- **General observation** — Overall impression of the student's progress this week.
- **Strengths noted** — What the student did well.
- **Areas for improvement** — What needs work.
- **Numeric rating (1–5)** — Weekly performance score.

All comments are stored and associated with the student's record on the Zigex platform via API.

---

### 6.3 End-of-Internship Evaluation

At the end of the internship period, supervisors generate a final evaluation document:

```bash
zila supervisor evaluate --student <email>
```

Because every school has its own evaluation template and grading criteria, Zila supports **per-school templates**. Each template defines:

- The sections required (e.g. "Technical Skills", "Punctuality", "Teamwork").
- The grading scale (e.g. percentage, letter grades, numeric out of 20).
- Any custom fields the school requires.

Zila populates the template using:

- Weekly supervisor comments and ratings.
- Exercise completion data and skill tags.
- Commit history and consistency metrics.
- Plagiarism flags (if any).

The generated evaluation document is output as a formatted file (format determined by the school template — Markdown base, exportable to PDF).

> **School templates** are stored in the central Git repository under a `templates/schools/` directory, identified by school name or code retrieved from the student's Zigex profile.

---

## 7. Git Repository Structure (Learning Materials)

The central Zila learning repository is organized by department and level:

```
zila-learning-repo/
├── web/
│   ├── beginner/
│   ├── intermediate/
│   └── advanced/
├── ml/
│   ├── beginner/
│   ├── intermediate/
│   └── advanced/
├── embedded/
│   ├── beginner/
│   └── ...
├── templates/
│   └── schools/
│       ├── university-of-buea.md
│       ├── iut-ngaoundere.md
│       └── ...
└── README.md
```

Each department+level directory follows the working directory structure described in Section 5.3.

---

## 8. Copy-Paste & Plagiarism Detection

Zila uses an **AI-powered code analysis** approach to detect two forms of dishonesty:

### Between-student plagiarism

When a PR is submitted, Zila compares the submitted code against:

- All previously submitted PRs from other students at the same level.
- A hash/fingerprint of the submitted files stored per-exercise.

If structural or content similarity exceeds a threshold, the PR is flagged for supervisor review.

### AI / external copy-paste detection

Detecting whether a student pasted code from an AI tool or external source is harder but addressed through a combination of signals:

| Signal | What it suggests |
|---|---|
| File goes from empty to complete in a single save | Code was pasted, not typed incrementally |
| Commit message doesn't match the complexity of the diff | Student didn't understand what they committed |
| Code style radically differs from previous submissions | Possibly external source |
| No monitoring activity before a large commit | Student worked without the monitor running |
| AI analysis of code patterns | AI checks for stylistic inconsistencies and non-beginner patterns in beginner-level submissions |

Flagged submissions are not automatically rejected — they are surfaced to the supervisor with an explanation of why they were flagged, and the supervisor decides how to act on them.

---

## 9. Command Reference

### Student Commands

| Command | Description |
|---|---|
| `zila init` | Bootstrap the working environment |
| `zila monitor start` | Start the monitoring assistant |
| `zila monitor stop` | Stop the monitoring assistant |
| `zila monitor status` | Check monitor status |
| `zila submit` | Guide through submitting a PR for the current exercise |
| `zila logbook` | Generate this week's logbook |
| `zila logbook --week <n>` | Generate logbook for week N |
| `zila status` | Show current exercise, level, and recent activity |
| `zila help` | Show all available commands |

### Supervisor Commands

| Command | Description |
|---|---|
| `zila supervisor login` | Authenticate as a supervisor |
| `zila supervisor students` | List students in your department |
| `zila supervisor comment` | Add weekly comment for a student |
| `zila supervisor evaluate` | Generate end-of-internship evaluation |
| `zila supervisor help` | Show all supervisor commands |

---

## 10. Open Questions & Future Considerations

These are areas where decisions are still being made or where the design may evolve:

| Area | Question / Consideration |
|---|---|
| **School templates** | How are new school templates added? Who maintains them? Should supervisors be able to create/edit templates from the CLI? |
| **Monitor trust** | What happens if a student never runs the monitor? Should `zila submit` warn or block if monitor wasn't active during the exercise? |
| **PR platform** | Which Git platform hosts the student PRs — GitHub, GitLab, or a self-hosted instance? This determines the API Zila uses to read PR data and diffs. |
| **Offline work** | Can students work offline and sync later, or is an internet connection required throughout? |
| **Multiple internships** | Can a student do more than one internship (e.g. progress from beginner to intermediate)? How does `zila init` handle that? |
| **Supervisor web dashboard** | Planned for a future phase. The terminal commands designed now should map cleanly to dashboard equivalents. |
| **Logbook approval** | Should supervisors be able to review and approve/reject a student's weekly logbook before it is considered official? |
| **Notification system** | Should Zila send email notifications (via Zigex) when a PR is flagged, or when a supervisor adds a comment? |