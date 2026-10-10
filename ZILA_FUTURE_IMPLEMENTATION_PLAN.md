# Zila & Lil-Zila: Detailed Future Implementation Plan & Technical Specifications

> **Scope:** Roadmap, Module Specifications, API Contracts & Implementation Architecture for Remaining Features.  
> **Target Release:** v2.5.0 – v3.0.0

---

## Table of Contents

1. [Milestone Overview & Strategic Roadmap](#1-milestone-overview--strategic-roadmap)
2. [Module 1: Pre-Flight Dependency Checker & Automated Package Resolver](#2-module-1-pre-flight-dependency-checker--automated-package-resolver)
   - 2.1 Specification (`zila init` / `zila-init`)
   - 2.2 Flags Specification (`--all`, `--node`, `--python`, `--git`)
   - 2.3 Cross-Platform Execution Architecture (Linux, macOS, Windows)
3. [Module 2: Multi-Provider AI Setup Wizard (`agent --setup`)](#3-module-2-multi-provider-ai-setup-wizard-agent---setup)
   - 3.1 Interactive Provider Selector Component
   - 3.2 Secure Credential Validation & Ping Handshake
   - 3.3 Unified Gateway Integration (OpenRouter / LangChain Provider Adapters)
4. [Module 3: Claude Code-Style Interactive Terminal Agent (`lil-agent`)](#4-module-3-claude-code-style-interactive-terminal-agent-lil-agent)
   - 4.1 UI Architecture & Full-Screen Terminal REPL
   - 4.2 Local Context Extraction & Workspace Indexing
   - 4.3 Streaming Inference with Token Telemetry
5. [Module 4: Automated Task Submission, Logbook Enrichment & Honest Truth Verification](#5-module-4-automated-task-submission-logbook-enrichment--honest-truth-verification)
   - 5.1 AST / Regex Supervisor Instruction Parser
   - 5.2 Git Diff Semantic Comparison & Ground Truth Validation
   - 5.3 Auto-Enriched Logbook Generator (`contributors/<user>/logbook.md`)
   - 5.4 Objective Evaluation Generation & Rubric Rating (0.0 – 1.0)
6. [Module 5: Monetization, 6-Task Quota & Penalty Distribution Engine](#6-module-5-monetization-6-task-quota--penalty-distribution-engine)
   - 6.1 Database Schema Additions for Tuition & Penalties
   - 6.2 The 6-Free-Task Enforcement Middleware
   - 6.3 Deadline Penalty Calculator & Financial Revenue Split (90% / 10%)
7. [Step-by-Step Task Breakdown & Effort Estimates](#7-step-by-step-task-breakdown--effort-estimates)

---

## 1. Milestone Overview & Strategic Roadmap

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ZILA STRATEGIC IMPLEMENTATION PHASES                            │
│                                                                                        │
│  [PHASE 1] Environment Health & Auto-Installer (`zila init --all`)                     │
│  ├── Multi-platform dependency inspector (Node, Python, Git)                           │
│  └── Unattended automated installer scripts                                            │
│                                                                                        │
│  [PHASE 2] AI Provider Setup & Interactive Shell (`agent --setup`, `lil-agent`)       │
│  ├── Arrow-driven provider wizard (Gemini, Groq, Claude, OpenAI, OpenRouter)           │
│  └── Retro Claude Code-style interactive chat shell                                    │
│                                                                                        │
│  [PHASE 3] Semantic Integrity & Contributor Logbook Engine                             │
│  ├── Code comment instruction extractor & semantic diff checker                       │
│  └── Automated contributor logbook generator & 0.0 - 1.0 honest grader                 │
│                                                                                        │
│  [PHASE 4] Business Model Enforcement & Penalty Split Backend                          │
│  ├── 6-task free evaluation quota guard                                                │
│  └── Deadline penalty fee logic (90% Zigex / 10% Host Company)                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module 1: Pre-Flight Dependency Checker & Automated Package Resolver

### 2.1 Specification (`zila init` / `zila-init`)
When invoked, `zila init` checks if the environment is ready for development:
- Execute `node -v` ➔ Parse semantic version (must be `>= 18.0.0`).
- Execute `python3 -v` or `python -v` ➔ Validate version `>= 3.10.0`.
- Execute `git --version` ➔ Check Git presence and email/username configs.

If all pass: Output success message prompting `agent --setup`.  
If any fail: Prompt user with automated flags.

### 2.2 Flags Specification (`--all`, `--node`, `--python`, `--git`)

```typescript
// Proposed CLI command signature:
// src/commands/init/dependencyResolver.ts

export interface DependencyStatus {
  node: { installed: boolean; version?: string };
  python: { installed: boolean; version?: string };
  git: { installed: boolean; version?: string; configured: boolean };
}

export async function checkDependencies(): Promise<DependencyStatus> {
  // Executes execSync with error catching
}

export async function installDependency(target: 'all' | 'node' | 'python' | 'git'): Promise<void> {
  const os = process.platform; // 'linux' | 'darwin' | 'win32'
  // Dispatches appropriate installer commands:
  // Linux: apt-get update && apt-get install -y python3 python3-pip git nodejs npm
  // macOS: brew install python git node
  // Windows: winget install Git.Git OpenJS.NodeJS Python.Python.3.11
}
```

---

## 3. Module 2: Multi-Provider AI Setup Wizard (`agent --setup`)

### 3.1 Interactive Provider Selector Component
Located at `src/screens/AgentSetupScreen.tsx`:
- Rendered using Ink's `useInput` and arrow navigation.
- Options:
  1. `Google Gemini` (Default / Recommended)
  2. `Groq LPU` (Fast inference for Llama 3)
  3. `Anthropic Claude` (Claude 3.5 Sonnet)
  4. `OpenAI` (GPT-4o)
  5. `OpenRouter` (Universal proxy endpoint)

### 3.2 Secure Credential Validation & Ping Handshake
Before saving:
```typescript
async function testApiKey(provider: string, apiKey: string): Promise<boolean> {
  // Makes an ultra-lightweight ping request to verify key authenticity:
  // e.g., for Gemini: GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}
  // for OpenAI: GET https://api.openai.com/v1/models with Bearer token
}
```
Upon verification:
Save to `~/.zila/agent_config.json`:
```json
{
  "provider": "gemini",
  "apiKeyEncrypted": "...",
  "model": "gemini-1.5-flash",
  "configuredAt": "2026-10-10T07:00:00Z"
}
```
Output:
```
[✔] Agent setup completed: 100%
Type 'lil-agent' to start paired development.
```

---

## 4. Module 3: Claude Code-Style Interactive Terminal Agent (`lil-agent`)

### 4.1 UI Architecture & Full-Screen Terminal REPL
- Command: `lil-agent`
- Key Visual Components:
  - Header: `lil-agent v1.0.0 · [SEED EMBEDDED] · Provider: Gemini 1.5 Pro`
  - History View: Scrolling chat stream with user queries in cyan and agent replies in retro-slate white.
  - Streaming Indicator: Token counter and latency stopwatch.
  - Input Box: Multiline input with cursor blinking.

### 4.2 Local Context Extraction & Workspace Indexing
The agent automatically reads:
- `~/.zila/active_cohort.json`: Active cohort, track, and module.
- Current exercise file: `contributors/<username>/<domain>/<module>/<day>/exercise.*`
- Recent Git commit logs: `git log -n 5 --oneline`

### 4.3 Streaming Inference with OpenRouter / LangChain
```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function* streamAgentResponse(prompt: string, context: WorkspaceContext) {
  // Streams tokens directly into the Ink Text container
}
```

---

## 5. Module 4: Automated Task Submission, Logbook Enrichment & Honest Truth Verification

### 5.1 AST / Regex Supervisor Instruction Parser
Extracts requirements from top-level comments:
```typescript
export interface ExtractedSupervisorPrompt {
  title: string;
  requirements: string[];
  maxWeight: number;
}

export function parseSupervisorHeader(fileContent: string): ExtractedSupervisorPrompt {
  // Matches comment blocks:
  // /* SUPERVISOR INSTRUCTIONS ... */
  // or triple quotes """ ... """
}
```

### 5.2 Git Diff Semantic Comparison & Ground Truth Validation
Compares the starter template vs student changes:
```typescript
export async function verifyWorkIntegrity(
  diffContent: string,
  requirements: string[],
  aiClient: BaseChatModel
): Promise<{ score: number; reviewFeedback: string; requirementBreakdown: any[] }> {
  // Prompts the LLM with strict grading instructions:
  // "You are an honest supervisor reviewing student code against stated requirements.
  // Do not inflate marks. Score between 0.0 and 1.0 based strictly on verified changes."
}
```

### 5.3 Auto-Enriched Logbook Generator
Appends verified progress to:
`contributors/<github_username>/logbook.md`
Format:
```markdown
### [Sprint Day 01] - Circular Buffer Implementation
- **PR URL:** https://github.com/iws3/sample_repo_zila/pull/12
- **Verified Work:** Implemented FixedSizeBuffer class with capacity of 64 bytes.
- **Logbook Notes:** Completed exercise and added automated test suite.
```

---

## 6. Module 5: Monetization, 6-Task Quota & Penalty Distribution Engine

### 6.1 Database Schema Additions (`zila-api/prisma/schema.prisma`)
Add fields to `CohortStudent`:
```prisma
model CohortStudent {
  // Existing fields...
  hasPaid         Boolean   @default(false)
  freeTasksUsed   Int       @default(0)
  feeStatus       String    @default("unpaid") // unpaid, paid_ontime, paid_late
  penaltyAmount   Float?    @default(0.0)
}

model TuitionPenaltySplit {
  id              String    @id @default(cuid())
  studentId       String
  cohortId        String
  totalPenalty    Float
  zigexShare      Float     // 90%
  companyShare    Float     // 10%
  hostCompanyId   String
  paidAt          DateTime  @default(now())
}
```

### 6.2 The 6-Free-Task Enforcement Middleware
In `zila-api/src/routes/tasks.routes.ts`:
```typescript
if (!enrollment.hasPaid) {
  const previousSubmissionsCount = await prisma.taskSubmission.count({
    where: { studentId: enrollment.id }
  });

  if (previousSubmissionsCount >= 6) {
    return res.status(402).json({
      error: "Free evaluation quota reached (6/6). Please complete payment to resume evaluations.",
      quotaReached: true,
      upgradeUrl: `https://zigex.com/payments?studentId=${enrollment.studentId}&cohortId=${enrollment.cohortId}`
    });
  }
}
```

### 6.3 Deadline Penalty Calculator & Financial Revenue Split (90% / 10%)
```typescript
export function calculatePenaltySplit(basePenalty: number, companyId: string) {
  return {
    total: basePenalty,
    zigexShare: basePenalty * 0.90,
    companyShare: basePenalty * 0.10,
    companyId
  };
}
```

---

## 7. Step-by-Step Task Breakdown & Effort Estimates

| Task ID | Task Description | Target File / Module | Est. Hours |
|---|---|---|---|
| **TSK-01** | Implement OS dependency checker for Node, Python, Git | `src/commands/init/preflight.ts` | 4 hrs |
| **TSK-02** | Implement automated installer scripts (`--all`, `--node`, etc.) | `src/commands/init/installers.ts` | 6 hrs |
| **TSK-03** | Build interactive `agent --setup` TUI wizard | `src/screens/AgentSetupScreen.tsx` | 5 hrs |
| **TSK-04** | Implement provider credential validation (Gemini, Groq, Claude) | `src/utils/aiProviders.ts` | 4 hrs |
| **TSK-05** | Build Claude Code-style terminal REPL (`lil-agent`) | `src/screens/LilAgentShellScreen.tsx` | 10 hrs |
| **TSK-06** | Build comment extractor & semantic diff truth-checker | `src/utils/instructionParser.ts` | 8 hrs |
| **TSK-07** | Auto-enrich contributor `logbook.md` on task submission | `src/utils/logbookEnricher.ts` | 4 hrs |
| **TSK-08** | Implement 6-free-task evaluation quota gate in `zila-api` | `zila-api/src/routes/tasks.routes.ts` | 4 hrs |
| **TSK-09** | Implement deadline penalty logic & 90/10 revenue split | `zila-api/src/services/billing.service.ts` | 6 hrs |
| **TSK-10** | End-to-end integration test suite | `tests/agent_lifecycle.test.ts` | 6 hrs |

**Total Estimated Implementation Effort:** 57 Engineering Hours
