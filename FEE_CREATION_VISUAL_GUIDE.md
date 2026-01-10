# Fee Creation - What You Should See

## ✅ CORRECT VIEW (When Logged in as Teacher)

```
┌─────────────────────────────────────────────────────────────┐
│ Fee Management                    [+ Create Invoice] ✅     │
│                                     (Green button with icon) │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Invoices] [💰 Payments] [⏰ To Pay] [⚠️ Overdue]           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Collected    │ Pending    │ Overdue    │ Outstanding        │
│ ₹2,000      │ ₹0         │ ₹0         │ ₹0                │
├─────────────────────────────────────────────────────────────┤
│ [All] [Pending] [Overdue] [Paid]    [📥 Download Report]   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Indicators:**
- ✅ **"+ Create Invoice"** button visible (blue button)
- ✅ **4 view tabs** visible (Invoices, Payments, To Pay, Overdue)
- ✅ **Filter buttons** visible (All, Pending, Overdue, Paid)
- ✅ **Download Report** button visible (green)

---

## ❌ INCORRECT VIEW (When Logged in as Student)

```
┌─────────────────────────────────────────────────────────────┐
│ Fee Management                  [NO BUTTON - You're student] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ⓘ Student view: Check your fee status below.               │
│   Contact your teacher for invoice details.                 │
│                                                               │
│  [Invoices] [💰 Payments] [⏰ To Pay] [⚠️ Overdue]           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Collected    │ Pending    │ Overdue    │ Outstanding        │
│ ₹0          │ ₹500       │ ₹0         │ ₹500              │
├─────────────────────────────────────────────────────────────┤
│ [All] [Pending] [Overdue] [Paid]    [NO DOWNLOAD BUTTON]   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Indicators You're in Student Mode:**
- ❌ NO "Create Invoice" button
- ❌ Blue info message: "Student view: Check your fee status..."
- ❌ NO download report button
- ✅ Can see fees assigned to you
- ✅ Can see payment history

---

## 🔘 LOGIN SCREEN - How to Select Teacher Role

```
┌─────────────────────────────────────────┐
│       TutorMate Login                    │
├─────────────────────────────────────────┤
│                                           │
│ Email: [_____________________]           │
│                                           │
│ Role:  [ ▼ Select Role ]                │
│        ├─ Teacher      ← CLICK THIS     │
│        ├─ Student                        │
│        └─ Admin                          │
│                                           │
│ [       LOGIN       ]                   │
│                                           │
└─────────────────────────────────────────┘
```

**Step by Step:**
1. Enter any email (e.g., teacher@example.com)
2. Click on "Select Role" dropdown
3. Choose **"Teacher"**
4. Click LOGIN
5. Go to Fees section
6. **"+ Create Invoice"** button should appear

---

## 🎯 CREATE INVOICE FORM

Once you click "**+ Create Invoice**", this modal appears:

```
┌─────────────────────────────────────────────────┐
│ Create New Invoice                          [✕] │
├─────────────────────────────────────────────────┤
│                                                   │
│ Select Student *                                │
│ [▼ Choose a student...          ]              │
│                                                   │
│ Fee Structure *                                 │
│ [▼ Monthly Fee      ]                          │
│                                                   │
│ Month (for Monthly)                             │
│ [▼ January         ]                           │
│                                                   │
│ Amount (₹) *         │ Due Date *               │
│ [2000      ]         │ [2024-01-31]            │
│                                                   │
│        [Generate Invoice]                      │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Form Fields:**
- **Select Student** - Dropdown of all students
- **Fee Structure** - Monthly, One-time, Package, Per-Class, Custom
- **Month** - Jan-Dec (for monthly fees only)
- **Description** - For other fee types
- **Amount** - The fee amount in rupees
- **Due Date** - When payment is due

---

## 📋 AFTER CREATION - What You'll See

After clicking "Generate Invoice":

```
┌─────────────────────────────────────────────────────┐
│ [Invoices] [Payments] [To Pay] [Overdue]            │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │ Ananya Kumar                        ₹2,000     │ │
│  │ January (Monthly)                   PENDING    │ │
│  │ ────────────────────────────────────────────── │ │
│  │ Due: 31-Jan-2024                              │ │
│  │                                               │ │
│  │ [Record Payment]  [Delete]                    │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  (More invoices below...)                            │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Invoice Card Shows:**
- Student name
- Fee amount
- Fee type and month
- Status (PENDING / OVERDUE / PAID)
- Due date
- Buttons to Record Payment or Delete

---

## 🚀 NEXT STEPS AFTER CREATING

Once invoice is created, you can:

1. **Record a Payment** - Click [Record Payment] button
2. **View Payment History** - Scroll down on invoice card
3. **Track Methods** - See if paid by Cash, PhonePe, Online, etc.
4. **Contact Parent** - Click WhatsApp button in "To Pay" tab
5. **Download Report** - Click [📥 Download Report] button

---

## 💡 QUICK CHECKLIST

Before clicking "Create Invoice", verify:

- ✅ You're logged in as **TEACHER** (not student)
- ✅ You have **at least 1 student** created
- ✅ You have entered a **valid amount**
- ✅ You have selected a **due date**
- ✅ You have selected a **student**

If all ✅, you're ready to create invoices!

---

## 📞 SUPPORT

**If button still doesn't appear:**

1. Log out completely
2. Log back in as Teacher (verify role dropdown)
3. Refresh page (F5)
4. Check backend is running (`npm run server`)
5. Check frontend is running (`npm run dev`)

**Still not working?**
- Clear browser cache (Ctrl+Shift+Del)
- Try incognito/private window
- Restart both npm commands

---

**That's it! You're now ready to use Fee Management!** 🎉

