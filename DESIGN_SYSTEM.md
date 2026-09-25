# 🎨 Zila Terminal Design System

## Overview

The Zila terminal interface is designed to be **intuitive, beautiful, and delightful** - inspired by Claude Code's elegant simplicity while adding playful gamification elements for the internship experience.

---

## 🎯 Design Principles

### 1. **Clarity First**
- Information hierarchy through typography and color
- Clear visual feedback for all actions
- Consistent iconography throughout

### 2. **Delightful Interactions**
- Smooth animations and transitions
- Playful gamification elements
- Rewarding visual feedback

### 3. **Progressive Disclosure**
- Show what's needed, when it's needed
- Layer information with expandable sections
- Context-aware hints and suggestions

### 4. **Personality with Purpose**
- Emojis as functional icons, not decoration
- Friendly language that stays professional
- Celebratory moments for achievements

---

## 🎨 Color Palette

### Primary Colors
```
Primary:       #9b87f5  (Soft purple - main brand)
Primary Bright: #b8a7ff  (Highlights, headings)
Primary Dim:    #7c6bbd  (Hover states)

Accent:        #06b6d4  (Cyan - interactive elements)
Accent Bright:  #22d3ee  (Active states)
```

### Semantic Colors
```
Success:       #10b981  (Emerald - completed, approved)
Success Bright: #34d399  (Celebrations)
Warning:       #f59e0b  (Amber - attention needed)
Error:         #ef4444  (Red - errors, critical)
Info:          #3b82f6  (Blue - informational)
```

### Text Colors
```
Text:          #e5e7eb  (Primary text)
Text Bright:   #f9fafb  (Headings, emphasis)
Muted:         #9ca3af  (Secondary text)
Dim:           #6b7280  (Tertiary, timestamps)
Dimmer:        #4b5563  (Subtle hints)
```

### UI Colors
```
Border:        #374151  (Default borders)
Border Active: #9b87f5  (Active/focused)
Background:    #111827  (App background)
Panel:         #0f172a  (Card backgrounds)
```

---

## 🔤 Typography

### Headings
```
H1: ▸ Title (Primary Bright, Bold)
H2: › Subtitle (Primary, Bold)
```

### Code/Commands
```
$ command      (Dim, monospace)
zila ›         (Primary + Accent)
```

### Body Text
```
Regular: Text color
Label:   Muted color
Hint:    Dimmer color
```

---

## 🎭 Components

### 1. Cards
Rounded borders with padding, used for grouping related content.

```
╭─────────────────────╮
│  Card Title         │
│                     │
│  Card content here  │
╰─────────────────────╯
```

**Usage:**
- Group related stats
- Display cohort/task information
- Contain forms and inputs

### 2. Progress Bars
Visual representation of progress or scores.

```
████████████░░░░░░░░ 60%
```

**Variants:**
- Horizontal bar (default)
- With percentage label
- Color-coded by status

### 3. Badges
Small labels for categories and statuses.

```
┌─────────┐
│ Primary │
└─────────┘
```

**Types:**
- Primary, Success, Warning, Error, Info
- Used for tags, status indicators, tabs

### 4. Stats Items
Key-value pairs with icons.

```
🎯 Tasks Completed        12
⭐ Total Points          850
```

### 5. Dividers
Visual separation between sections.

```
──────────────────────────────
── Section Title ──────────────
```

### 6. Info Boxes
Highlighted messages for important information.

```
╭───────────────────────────╮
│ ℹ INFO                     │
│                           │
│ Important message here    │
╰───────────────────────────╯
```

**Types:**
- Info (blue)
- Success (green)
- Warning (amber)
- Error (red)

### 7. List Items
Selectable items in menus.

```
› Selected Item
  Regular Item
  Another Item
```

### 8. Empty States
Friendly messages when no data.

```
       📭
   No tasks yet
Keep working to see
  your assignments
```

---

## ✨ Animations

### Splash Screen
- Line-by-line reveal (40ms stagger)
- Color gradient through logo
- Pulse spinner for loading

### Transitions
```
Fade In:     200ms
Fade Out:    300ms
Slide In:    150ms
```

### Spinners
```
Dots:   ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏  (80ms)
Pulse:  ◐◓◑◒            (120ms)
Arc:    ◜◠◝◞◡◟          (100ms)
```

---

## 🎮 Icons & Symbols

### Navigation
```
›  Pointer (primary)
▸  Pointer fancy (headings)
•  Bullet point
○  Hollow bullet
```

### Status Indicators
```
✓  Success
✗  Error
⚠  Warning
ℹ  Info
```

### Gamification
```
🏆 Trophy / Achievement
🎯 Target / Goal
⭐ Star / Points
🔥 Fire / Streak
🥇 Gold medal (rank 1)
🥈 Silver medal (rank 2)
🥉 Bronze medal (rank 3)
```

### Content Types
```
📁 Folder / Category
📄 Document / File
💻 Code / Programming
📚 Book / Learning
🔗 Link / External
```

### Actions
```
📊 Stats / Analytics
📝 Tasks / Writing
👥 Group / People
🚀 Launch / Start
✨ Sparkles / New
```

---

## 🎨 Layout Patterns

### Full-Width Header
```
╔════════════════════════════════════╗
║  🚀 Page Title                     ║
║  Subtitle or description           ║
╚════════════════════════════════════╝
```

### Two-Column Layout
```
┌──────────────┬──────────────┐
│  Left Card   │  Right Card  │
│              │              │
└──────────────┴──────────────┘
```

### Stats Dashboard
```
╔══════════════════════════════╗
║  ✨ Total Points: 1250       ║
╚══════════════════════════════╝

📊 Breakdown
─────────────────────────────
✅ Task Completion    750 pts
⚡ Early Submission   200 pts
```

### List with Details
```
› Item 1
     Details about item 1
     Additional info

  Item 2
     Details about item 2
```

---

## 🎯 Screen Designs

### 1. Splash Screen
**Purpose:** Brand introduction and loading
**Duration:** 2-3 seconds
**Elements:**
- ASCII art logo with gradient
- Animated reveal
- Loading spinner
- Version info

### 2. Help Screen
**Purpose:** Command reference
**Navigation:** Tab-based categories
**Features:**
- Keyboard shortcuts visible
- Search functionality (future)
- Interactive examples

### 3. Stats Dashboard
**Purpose:** Show progress and achievements
**Tabs:** Overview, Achievements, Activity
**Key Metrics:**
- Total points (prominent)
- Rank with visual indicator
- Weekly trends
- Points breakdown

### 4. Group/Peers View
**Purpose:** See colleagues
**Features:**
- Ranked list with medals
- Points and join date
- Cohort context header

### 5. Tasks List
**Purpose:** View and manage tasks
**Sections:**
- Summary stats (box)
- Overdue (if any)
- Pending tasks
- In review
**Details:** Difficulty, points, due date

---

## 🎨 Interactive States

### Hover (Selection)
```
Before: Text (muted)
After:  › Text (primary, bright)
```

### Active/Focus
```
Border: border → borderActive
Text: muted → primary
```

### Loading
```
⋯ Processing...
◐ Loading...
```

### Success
```
✓ Action completed successfully
```

### Error
```
✗ Something went wrong
   Error details here
```

---

## 📱 Responsive Behavior

### Terminal Width
- Minimum: 60 characters
- Optimal: 80-100 characters
- Maximum: Fluid with max content width

### Content Overflow
- Truncate with ellipsis (…)
- Word wrap for long text
- Horizontal scroll for code

---

## 🎯 Accessibility

### Color Contrast
- Text on background: 7:1 minimum
- Interactive elements clearly visible
- Status communicated with icons + color

### Keyboard Navigation
- All features accessible via keyboard
- Clear focus indicators
- Escape key always exits

### Screen Readers
- Semantic structure
- Descriptive labels
- Status announcements

---

## 🚀 Performance

### Rendering
- Smooth 60fps animations
- Debounced user input
- Efficient list virtualization (future)

### Memory
- History limited to 500 lines
- Lazy load large datasets
- Cache API responses

---

## 🎨 Future Enhancements

### Phase 2
- [ ] Themes (dark/light)
- [ ] Custom color schemes
- [ ] More animation options
- [ ] Rich media support (images)

### Phase 3
- [ ] Split panes
- [ ] Tabs/windows
- [ ] Mouse support
- [ ] Custom widgets

---

## 📚 Usage Guidelines

### DO ✓
- Use consistent spacing
- Group related information
- Provide visual feedback
- Use icons functionally
- Keep text concise
- Celebrate wins

### DON'T ✗
- Overuse animations
- Clutter the interface
- Hide important info
- Use emojis randomly
- Write long paragraphs
- Over-explain obvious things

---

## 🎯 Brand Voice

### Tone
- **Encouraging** - "Great work! Keep it up 🚀"
- **Friendly** - "Let's check your stats..."
- **Professional** - Clear, concise information
- **Motivating** - Gamification elements

### Language
- Use "you/your" (not "the user")
- Active voice ("View your tasks")
- Action-oriented ("Let's go!")
- Positive framing

---

**Built with ❤️ by the Zigex Team**
