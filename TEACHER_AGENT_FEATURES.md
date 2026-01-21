# Teacher Agent Feature Guide

## Overview
The Teacher Agent is an AI-powered planning and automation tool for teachers, designed to help manage multiple classes, automate weekly lesson planning, track academic risk, and streamline communication with students and parents.

---

## Key Features

### 1. Multi-Class Management
- Create and manage multiple "Class Agents" for different grades, subjects, and batches.
- Link each agent to a batch and curriculum (CBSE, ICSE, etc.).
- Configure terms/exams, syllabus, teaching frequency, and session duration.

### 2. AI-Driven Weekly Planning
- Automatically generate detailed weekly lesson plans for each class.
- Each week includes:
  - Objectives
  - Teaching flow (session breakdown)
  - Assignments
  - Assessment plan
  - Revision strategy
  - Risk analysis (if any)
  - Automated email content for parents/students
- Plans are generated using backend AI and can be triggered for each week.

### 3. Academic Progress & Risk Tracking
- Visual progress bar for syllabus completion.
- Academic risk level (Low/Medium/High) with color-coded indicators.
- Track number of weeks planned and current status.

### 4. Term/Exam Management
- Add multiple terms/exams with dates and syllabus coverage.
- Weekly plans are mapped to relevant terms.

### 5. Assignments & Assessments
- Each week includes assignment and assessment details.
- Rendered as lists or tables for clarity.

### 6. Automated Communication
- Preview and use AI-generated weekly email drafts for parents/students.
- Email content is tailored to the week's objectives and progress.

### 7. User Experience
- Sidebar lists all configured class agents.
- Main panel shows detailed plan, progress, and weekly breakdown for the selected class.
- Responsive, modern UI with clear action buttons.

### 8. Integration
- Linked to batches and users in the TutorMate system.
- Uses centralized API for data and AI plan generation.

---

## Typical Workflow
1. **Create a New Class Agent:**
   - Fill in class, subject, board, syllabus, terms, and batch link.
2. **Generate Weekly Plans:**
   - Click "Plan Week N" to let the AI generate the next week's plan.
3. **Track Progress:**
   - Monitor syllabus completion and risk level.
4. **Review Weekly Details:**
   - See objectives, teaching flow, assignments, assessments, and revision for each week.
5. **Communicate:**
   - Preview and send automated weekly emails to parents/students.

---

## Benefits
- Saves teacher time on planning and communication.
- Ensures consistent, structured academic delivery.
- Early warning for academic risk.
- Centralizes all class planning and reporting in one place.

---

## Notes
- All data is synced with the TutorMate backend.
- AI plan generation requires backend connectivity.
- Designed for both web and mobile use.

---

For more details, see the TeacherAgent component or contact your system administrator.
