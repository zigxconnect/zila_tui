# lil-zila Automated Task PR Submission Guide

## 1. Overview
The `lil-zila` terminal agent integrates an automated background GitHub Pull Request pipeline. Interns can submit their daily curriculum exercises directly through the TUI by typing `submit-task` (or `zila-submit`).

---

## 2. Quick Usage
### Interactive TUI Form
```bash
submit-task
# or
zila-submit
```
Use `tab`, `↑`, `↓`, `←`, `→` to navigate fields, toggle curriculum tracks and day numbers, enter your exercise summary and practical report, and press `Enter` to dispatch the automated PR.

### CLI Direct Mode
```bash
submit-task --level beginner --module 1_python --day 1 --summary "Built data parser and unit tests"
```

---

## 3. Automated Contributor Repository Layout
All contributions are automatically committed to the cohort open-source repository:
- **Sample Repository:** `https://github.com/iws3/sample_repo_zila.git`
- **Contributor Path:**
  ```
  contributors/<github-username>/<level>/<module_name>/day-<day>/exercise.md
  ```
- **Automated Branch Name:**
  ```
  <module_name>/<github-username>/day-<day>
  ```
  *Example:* `1_python/iws3/day-1`

---

## 4. Daily Submission Policy & Quota
- **Target Pace:** 1 Pull Request per day.
- **Maximum Quota:** 2 Pull Requests per calendar day.
- Submissions after reaching the quota will be blocked until the next day to encourage deep, thorough daily work rather than rushing.

---

## 5. Normalized Evaluation Scale (100% Total)
Each weekly sprint comprises 4 daily milestones weighted and normalized to 100%:

| Day | Raw Weight | Normalized Share | Focus |
| :---: | :---: | :---: | :--- |
| **Day 01** | 1 pt | **12.5%** | Foundations & problem analysis |
| **Day 02** | 1 pt | **12.5%** | Core algorithms & implementation |
| **Day 03** | 2 pts | **25.0%** | Optimization & edge cases |
| **Day 04** | 4 pts | **50.0%** | Production deployment & comprehensive report |
