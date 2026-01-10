# Student Attendance Calendar Feature

## Overview
Added a comprehensive attendance calendar view to the Student Profile section that shows:
- Monthly attendance calendar with status indicators
- Attendance statistics (Present, Absent, Late counts)
- Over-attendance warnings for students exceeding prescribed class frequency

## Features

### 1. **Interactive Calendar View**
- Month navigation (Previous/Next buttons)
- Calendar grid showing all days of the month
- Color-coded attendance status for each date

### 2. **Attendance Status Indicators**
- **✓ Present** (Green): Student attended class
- **✕ Absent** (Red): Student was absent
- **⧖ Late** (Yellow): Student arrived late
- **-** (Gray): No class scheduled that day

### 3. **Attendance Statistics**
Shows summary at bottom of calendar:
- **Present**: Number of classes attended
- **Absent**: Number of classes missed
- **Late**: Number of times student was late
- **Over Freq (Orange warning)**: Indicates if student is attending more than prescribed

### 4. **Over-Attendance Detection**
- Compares actual attendance with batch's prescribed class frequency
- Shows warning if student is coming more frequently than scheduled
- Example: If batch is scheduled for 3 days/week but student has attended more days
- Warning message explains the over-frequency situation

## UI Components

### Attendance Calendar Section
Located in Student Profile (after Quick Stats, before Fee History)
```
┌─────────────────────────────────────┐
│     Attendance Calendar             │
├─────────────────────────────────────┤
│  ← Prev | January 2026 | Next →     │
│                                     │
│  Sun Mon Tue Wed Thu Fri Sat        │
│   -   1✓  2✓  3✓  4✕  5✓  6✕      │
│   7✓  8✓  9✓  10✓ 11✓ 12✓ 13⧖     │
│   ...                               │
├─────────────────────────────────────┤
│ Present 18 | Absent 2 | Late 1     │
│       [⚠ Over Freq]                │
│                                     │
│ ⚠️ Warning Message (if applicable)  │
└─────────────────────────────────────┘
```

## Data Integration

### Data Source
- Reads from existing `attendance` records in the store
- Filters by: `studentId` and `batchId`
- Extracts attendance status from `records` array in each `AttendanceRecord`

### Batch Information
- Uses batch data to determine prescribed days/frequency
- Calculates expected monthly classes based on `batch.days` length
- Compares with actual attendance to detect over-frequency

## Color Coding

| Status | Color | Meaning |
|--------|-------|---------|
| Present | 🟢 Green | Attended class |
| Absent | 🔴 Red | Missed class |
| Late | 🟡 Yellow | Arrived after start time |
| No Class | ⚪ Gray | No class on that date |
| Over-Freq | 🟠 Orange | Attending more than prescribed |

## Workflow

1. **User Opens Student Profile**
   - Clicks on a student from the students list
   - Student detail panel opens

2. **Calendar Displays**
   - Current month shown by default
   - All attendance records loaded for that month
   - Status indicators shown for each date

3. **Navigation**
   - User can click "Prev" to go to previous month
   - User can click "Next" to go to next month
   - Calendar updates with attendance for new month

4. **Over-Frequency Detection**
   - System calculates expected monthly classes
   - If actual attendance exceeds expected, shows warning
   - Warning includes explanation of issue

## Technical Details

### Component: `AttendanceCalendar`
- Props: `studentId`, `batchId`, `attendance`, `batchData`
- Returns calendar grid with color-coded dates
- Handles month navigation via state

### State Management
- `currentDate`: Tracks current month being displayed
- Used to filter attendance records for display

### Calculations
- `totalClasses`: Count of all recorded attendance dates
- `presentCount`: Number of "present" records
- `absentCount`: Number of "absent" records
- `lateCount`: Number of "late" records
- `monthlyExpectedClasses`: Based on batch frequency
- `overAttending`: Boolean flag for over-frequency

## Example Scenarios

### Scenario 1: Regular Attendance
- Batch: 3 classes/week (Mon, Wed, Fri)
- Expected: ~12 classes/month
- Actual: 10 classes attended
- Display: ✓ Normal, no warning

### Scenario 2: Perfect Attendance
- Expected: ~12 classes/month
- Actual: 13 classes attended
- Display: ✓ Shows counter, no over-frequency warning (close to expected)

### Scenario 3: Over-Attendance
- Batch: 2 classes/week (Mon, Wed)
- Expected: ~8 classes/month
- Actual: 15 classes attended
- Display: ⚠️ Shows "Over Freq" warning + explanation message

### Scenario 4: Low Attendance
- Batch: 5 classes/week
- Expected: ~20 classes/month
- Actual: 5 classes attended
- Display: Shows very few green dates, high red count

## Future Enhancements

1. **Export Attendance Report**: Download as PDF/Excel
2. **Attendance Trends**: Graph showing attendance over time
3. **Alert System**: Notify when attendance drops below threshold
4. **Comparison View**: Compare with classmates
5. **Holiday Sync**: Exclude holidays from expected calculations
6. **Teacher Notes**: Add notes for absences/lates
7. **Parent Notification**: Auto-send alerts for low attendance

## How to Test

1. Navigate to Students section
2. Click on any student to open profile
3. Scroll down to "Attendance Calendar"
4. Month should display with color-coded dates
5. Click Prev/Next to navigate months
6. Check if attendance records load correctly
7. Look for over-frequency warning if applicable

## Notes

- Calendar shows current month by default
- Attendance data comes from Attendance records (marked by teachers)
- Colors update based on actual status in database
- Over-frequency calculation based on batch's scheduled days
- All data syncs with MongoDB in real-time
