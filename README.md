<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TutorMate: Student Website & Teacher App

This repo hosts a React (Vite) student website and guidance for a secure Android teacher app.

## Roles & Separation
- Student interface: website-only. Teacher login is hidden on the public web.
- Teacher interface: Android app using a secure WebView; it enables the teacher UI via `?teacherApp=1`.

## Run the Student Website (Dev)

Prerequisites: Node.js 18+

```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

In dev, visit the site without `?teacherApp=1` to see student-only login.

## Build for Production (Website)

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to a static host (Vercel/Netlify/S3+CDN).

## Teacher Android App

See [ANDROID_INSTRUCTIONS.md](ANDROID_INSTRUCTIONS.md) for a secure `MainActivity.kt` and setup. If you serve the website remotely, load:

```
https://your-domain.com/?teacherApp=1
```

## Privacy & Security
- No client-side API keys: AI features are stubbed unless `VITE_GEMINI_API_ENABLED` is set and a secure backend proxy exists.
- Basic CSP is set in `index.html`; prefer enforcing CSP and security headers (HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) at your hosting layer.
- The teacher app’s WebView blocks mixed content and restricts navigation to `https://` and local assets only.
- Do not store sensitive data in `localStorage`. Persist tokens via secure HTTP-only cookies from your backend.

## Enabling AI Features (Optional)
AI features require a backend service to call Gemini securely. On the client, set:

```bash
# .env (client)
VITE_GEMINI_API_ENABLED=false
```

Then implement a backend endpoint (e.g., `/api/ai`) that holds the API key server-side.

## Features

### 📚 Core Features
- **Student Management**: Create, edit, and track student information
- **Batch Management**: Organize students into batches with scheduling
- **Attendance Tracking**: Mark student attendance with status indicators (present/absent/late)
- **Fee Management**: Complete invoicing and payment tracking system

### 💰 Fee Management System
The Fees section includes professional-grade fee tracking:

#### 4 View Modes:
- **📄 Invoices**: Create and manage fee invoices, track payment history per student
- **💰 Payments**: View all payments across students with payment method tracking
- **⏰ To Pay**: List students with pending unpaid fees and quick WhatsApp contact
- **⚠️ Overdue**: Track past-due payments sorted by urgency, with automated days-overdue calculation

#### Payment Method Tracking:
- 💵 Cash
- 📱 PhonePe
- 🏦 Online / Bank Transfer
- 💳 UPI
- 🎫 Card
- 🏪 Bank
- ✓ Other

#### Smart Features:
- **WhatsApp Integration**: One-click parent contact for payment reminders
- **Excel Export**: Download 4-sheet reports with fee summary, payment log, method breakdown, and statistics
- **Payment Notes**: Add remarks to track installments, promises, and payment details
- **Color Coding**: Visual status indicators (pending=yellow, overdue=red, paid=green)
- **Overdue Detection**: Auto-calculate days overdue and sort by urgency

### 📊 Attendance Calendar
Students can view their attendance status in a monthly calendar with color-coded indicators:
- 🟢 Present
- 🔴 Absent
- 🟡 Late
- Attendance statistics and over-frequency detection

### 📱 Mobile App Support
All features work seamlessly on the Android app via Capacitor, including:
- Student attendance marking
- Fee invoice management
- Payment recording with method tracking
- WhatsApp parent communication
- Excel report downloads

## Documentation Files

- [FEE_LOGGING_FEATURES.md](FEE_LOGGING_FEATURES.md) - Comprehensive fee system documentation
- [FEES_QUICK_START.md](FEES_QUICK_START.md) - Quick reference guide
- [FEES_VISUAL_GUIDE.md](FEES_VISUAL_GUIDE.md) - Visual examples and workflows
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Complete feature checklist
- [ANDROID_INSTRUCTIONS.md](ANDROID_INSTRUCTIONS.md) - Android app setup guide
