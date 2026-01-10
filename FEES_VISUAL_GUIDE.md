# Fee Section - Visual Guide

## Tab Navigation

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Invoices  │  💰 Payments  │  ⏰ To Pay  │  ⚠️ Overdue  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 INVOICES TAB

Shows all fee invoices with payment status.

### Example Invoice Card:
```
┌──────────────────────────────────────────────────┐
│ 📧 Ananya Kumar                        ₹10,000   │
│ Class: 10-B                            Status    │
├──────────────────────────────────────────────────┤
│ Monthly Fee January                               │
│ Due Date: 31-Jan-2024     Status: Pending        │
│                                                   │
│ Payment Progress: [████░░░░░] 40%               │
│ Paid: ₹4,000 / ₹10,000                          │
├──────────────────────────────────────────────────┤
│ PAYMENT HISTORY                                   │
│ ├─ 15-Jan-2024 • 📱 PHONEPE ............... ₹2,000
│ ├─ 20-Jan-2024 • 💵 CASH ................. ₹2,000
│ └─ Fully paid on N/A (pending)                   │
├──────────────────────────────────────────────────┤
│  [Record Payment]  [Delete]                      │
└──────────────────────────────────────────────────┘
```

**What You See:**
- Student name and fee amount
- Payment progress bar
- Payment history with methods
- Quick action buttons

---

## 💰 PAYMENTS TAB

Shows all payments across all students.

### Example Payment Cards:
```
┌─────────────────────────────────┐
│ Ananya Kumar         ₹2,000      │
│ 15-Jan-2024         📱 PHONEPE  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Ananya Kumar         ₹2,000      │
│ 20-Jan-2024         💵 CASH     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Ravi Patel          ₹5,000       │
│ 18-Jan-2024         🏦 ONLINE   │
│ Note: Bank Transfer             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Priya Singh         ₹3,500       │
│ 10-Jan-2024         💳 UPI      │
└─────────────────────────────────┘
```

**What You See:**
- All payments sorted by date (newest first)
- Payment method with color badge
- Student name and amount
- Payment notes if any

**Color Key:**
- 💵 Cash = Green
- 📱 PhonePe = Purple
- 🏦 Online = Blue
- 💳 UPI = Orange
- 🎫 Card = Indigo
- 🏪 Bank = Cyan
- ✓ Other = Gray

---

## ⏰ TO PAY TAB

Students with unpaid fees - contact them!

### Example Pending Students:
```
┌──────────────────────────────────────────────────┐
│ Ananya Kumar                 ₹6,000              │
│ Class: 10-B                  Pending             │
├──────────────────────────────────────────────────┤
│ Contact Info                                      │
│ [WhatsApp Parent]     [Log Payment]              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Vikram Singh                 ₹10,000             │
│ Class: 9-A                   Pending             │
├──────────────────────────────────────────────────┤
│ Contact Info                                      │
│ [WhatsApp Parent]     [Log Payment]              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Neha Sharma                  ₹7,500              │
│ Class: 11-C                  Pending             │
├──────────────────────────────────────────────────┤
│ Contact Info                                      │
│ [WhatsApp Parent]     [Log Payment]              │
└──────────────────────────────────────────────────┘
```

**Features:**
- Shows total pending per student
- Yellow border = needs attention
- WhatsApp button opens parent chat
- Log Payment button for recording payment

---

## ⚠️ OVERDUE TAB

Urgent follow-ups for past-due payments!

### Example Overdue Students (sorted by urgency):
```
┌──────────────────────────────────────────────────┐  ← Most urgent
│ Vikram Singh                 ₹10,000             │
│ Class: 9-A                   35+ DAYS OVERDUE   │
├──────────────────────────────────────────────────┤
│ ⚠️ Urgent Follow-up Required                     │
│ [📱 WhatsApp Now]     [Log Payment]              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Ananya Kumar                 ₹6,000              │
│ Class: 10-B                  8+ DAYS OVERDUE    │
├──────────────────────────────────────────────────┤
│ ⚠️ Urgent Follow-up Required                     │
│ [📱 WhatsApp Now]     [Log Payment]              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Neha Sharma                  ₹7,500              │
│ Class: 11-C                  2+ DAYS OVERDUE    │
├──────────────────────────────────────────────────┤
│ ⚠️ Urgent Follow-up Required                     │
│ [📱 WhatsApp Now]     [Log Payment]              │
└──────────────────────────────────────────────────┘
```

**Features:**
- Red border = Overdue (urgent!)
- Sorted by days overdue (most urgent first)
- "📱 WhatsApp Now" = prominent green button
- Days overdue calculated and displayed
- Quick payment logging

---

## 📋 RECORD PAYMENT MODAL

Appears when you click "Record Payment"

### Modal Layout:
```
┌─────────────────────────────────────────────────┐
│ Record Payment — Ananya Kumar           [✕]     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Date: [15-Jan-2024        ]                    │
│                                                  │
│  Amount (₹): [2000         ]                    │
│                                                  │
│  Method:                                         │
│  [▼ 💵 Cash                                     │
│     📱 PhonePe                                  │
│     🏦 Online / Bank Transfer                   │
│     💳 UPI                                      │
│     🎫 Card                                     │
│     🏪 Bank                                     │
│     ✓ Other                    ]               │
│                                                  │
│  Note: [Part payment  ................]         │
│                                                  │
│            [Record Payment]                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Steps:**
1. Select payment date
2. Enter payment amount
3. Choose payment method
4. (Optional) Add notes
5. Click "Record Payment"

---

## 📥 EXCEL EXPORT

Click "Download Excel Report" to get 4 sheets:

### Sheet 1: Fee Summary
```
Student Name    | Fee Type  | Amount | Paid   | Balance | Status   | Due Date
─────────────────────────────────────────────────────────────────────────
Ananya Kumar    | Monthly   | 10000  | 4000   | 6000    | Pending  | 31-Jan
Vikram Singh    | Monthly   | 10000  | 0      | 10000   | Overdue  | 31-Jan
Ravi Patel      | Package   | 15000  | 15000  | 0       | Paid     | 15-Jan
```

### Sheet 2: Payment Log
```
Date       | Student      | Fee Type | Amount | Method   | Status
──────────────────────────────────────────────────────────────────
15-Jan     | Ananya Kumar | Monthly  | 2000   | PHONEPE  | Pending
20-Jan     | Ananya Kumar | Monthly  | 2000   | CASH     | Pending
18-Jan     | Vikram Singh | Monthly  | 5000   | ONLINE   | Overdue
```

### Sheet 3: Payment Methods (for reconciliation)
```
Method      | Count | Total
─────────────────────────────
CASH        | 5     | 12000
PHONEPE     | 8     | 18500
ONLINE      | 3     | 15000
UPI         | 2     | 5000
CARD        | 1     | 3000
BANK        | 4     | 22000
```

### Sheet 4: Summary Statistics
```
Metric              | Value
─────────────────────────────
Total Billed        | 75000
Total Collected     | 45000
Outstanding         | 30000
Overdue Count       | 5
Total Students      | 12
Total Invoices      | 18
```

---

## 🔄 Day-to-Day Workflow

### MORNING CHECKLIST
1. Open Fees section
2. Click **⚠️ Overdue** tab
3. See urgent follow-ups (sorted by days overdue)
4. Click **"📱 WhatsApp Now"** on top 3 students
5. Send friendly reminder messages

### WHEN PAYMENT RECEIVED
1. Click **"Log Payment"** button
2. Verify amount and date
3. Select correct payment method (Cash, PhonePe, Online, etc.)
4. Add note if needed (e.g., "Partial payment")
5. Click **"Record Payment"**

### WEEKLY RECONCILIATION
1. Go to **💰 Payments** tab
2. Verify all payments show correct methods
3. Download **Excel Report**
4. Check **"Payment Methods"** sheet:
   - Add up total Cash
   - Verify PhonePe matches bank deposit
   - Check Online transfer totals
   - Cross-reference with bank statements

### MONTHLY REPORTING
1. Download **Excel Report**
2. Send **Fee Summary** sheet to parents
3. Keep **Payment Log** for records
4. Analyze **Payment Methods** for business insights
5. Review **Summary Statistics**

---

## 🎯 Tips & Tricks

**Tip 1: Color Coding**
- Green tabs = Good (payments recorded)
- Yellow tabs = Attention (pending)
- Red tabs = Urgent (overdue)
- Use colors to prioritize work

**Tip 2: WhatsApp Integration**
- Always check parent phone in student profile first
- Click WhatsApp button instead of manually copying
- Send friendly reminder, not demand
- Once paid, immediately log payment

**Tip 3: Payment Methods**
- Always select the CORRECT method
- Use for bank reconciliation
- PhonePe payments → check app for deposits
- Cash → count at end of day
- Online → verify bank statements

**Tip 4: Excel Reports**
- Download weekly for reconciliation
- Keep copies for accounting
- Use Payment Methods sheet for bank matching
- Share Fee Summary with parents for transparency

**Tip 4: Note Taking**
- Add notes when recording payments
- "Part payment of 5000" → shows installment
- "Promised by 25th" → tracks promises
- "Late fee applied" → explains extra charges

---

## 📞 Parent Communication Examples

### Via WhatsApp (To Pay tab):
```
Hi, I hope you're doing well!
Just a friendly reminder that Ananya's fee 
for January (₹10,000) is pending. 
Could you please make the payment by 31st?
Thank you!
```

### Via WhatsApp (Overdue tab):
```
Hello,
I wanted to follow up regarding Ananya's 
overdue fee of ₹10,000 (Due: 31-Jan).
It's been 35 days now. 
Could you please arrange payment at your earliest?
Thank you!
```

---

## ✨ Key Features at a Glance

| Feature | Location | Purpose |
|---------|----------|---------|
| Create Invoice | Invoices tab (+) | Generate fee invoices |
| Record Payment | All tabs | Log payment received |
| View History | Invoices tab | See all payments for fee |
| Contact Parent | To Pay & Overdue | WhatsApp integration |
| Track Methods | Payments tab | See how students paid |
| Download Report | Top right | Excel with 4 sheets |
| Overdue Priority | Overdue tab | Sort by urgency |
| Payment Notes | Payment modal | Track payment details |

---

**Everything is organized, visual, and mobile-friendly!** 🚀

